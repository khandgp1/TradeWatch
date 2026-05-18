import { db } from '../db/connection';
import { candles, signals, engineState } from '../db/schema';
import { eq, lt, gt, lte, gte, and, desc } from 'drizzle-orm';
import { appEvents } from './events';

export async function processNewCandle(candleOpenTime: string): Promise<void> {
  // 1. Load or initialize engine_state singleton (id=1)
  let stateRes = await db.select().from(engineState).where(eq(engineState.id, 1));
  if (stateRes.length === 0) {
    await db.insert(engineState).values({
      id: 1,
      last_processed_time: null,
      rule1_green_streak: 0,
      rule1_streak_start_index: null,
      last_accepted_end: null,
      state_json: null,
    });
    stateRes = await db.select().from(engineState).where(eq(engineState.id, 1));
  }
  const state = stateRes[0];

  // Guard: check if already processed
  if (state.last_processed_time && candleOpenTime <= state.last_processed_time) {
    return;
  }

  // 2. Load current candle + previous 3 candles (4 total for lookback)
  const loadedCandlesRes = await db.select().from(candles)
    .where(lte(candles.open_time, candleOpenTime))
    .orderBy(desc(candles.open_time))
    .limit(4);

  if (loadedCandlesRes.length === 0) {
    return;
  }

  // Reverse to get chronological order: [c0, c1, c2, c3]
  const loadedCandles = loadedCandlesRes.reverse();
  const currentCandle = loadedCandles[loadedCandles.length - 1];

  // 3. Invalidate ongoing signals
  const ongoingSignals = await db.select().from(signals).where(eq(signals.status, 'Ongoing'));

  for (const sig of ongoingSignals) {
    if (currentCandle.low <= sig.indicator) {
      // It broke!
      const finalEndTime = sig.end_time;
      if (sig.start_time === finalEndTime) {
        // Same-hour filter: delete entirely
        await db.delete(signals).where(eq(signals.id, sig.id));
      } else {
        // Mark broken
        await db.update(signals)
          .set({ status: 'Broken', updated_at: new Date().toISOString() })
          .where(eq(signals.id, sig.id));
        appEvents.emit('signal-updated', { id: sig.id, status: 'Broken', end_time: finalEndTime });
      }
    } else {
      // Trend extends! Update end_time
      await db.update(signals)
        .set({ end_time: currentCandle.open_time, updated_at: new Date().toISOString() })
        .where(eq(signals.id, sig.id));
    }
  }

  // 4. Evaluate Rule 1 (Three Consecutive Green Candles)
  let rule1Streak = state.rule1_green_streak;
  let rule1StartIndex = state.rule1_streak_start_index;

  if (currentCandle.close > currentCandle.open) {
    if (rule1Streak === 0) {
      rule1StartIndex = currentCandle.open_time;
    }
    rule1Streak += 1;
  } else {
    rule1Streak = 0;
    rule1StartIndex = null;
  }

  // 4. Global Continuation Filter check (One Signal Per Wave)
  let blockNewSignals = false;
  const globalPriorSignalRes = await db.select().from(signals)
    .where(lt(signals.start_time, currentCandle.open_time))
    .orderBy(desc(signals.start_time))
    .limit(1);

  if (globalPriorSignalRes.length > 0) {
    const priorSig = globalPriorSignalRes[0];
    const rangeCandles = await db.select().from(candles)
      .where(
        and(
          gt(candles.open_time, priorSig.start_time),
          lt(candles.open_time, currentCandle.open_time)
        )
      );
    const hasRedCandle = rangeCandles.some(c => c.close < c.open);
    if (!hasRedCandle) {
      blockNewSignals = true;
    }
  }

  // 5. Evaluate Candidates (Rules 1, 2, and 3)
  let candidate1: any = null;
  let candidate2: any = null;
  let candidate3: any = null;
  let rule2GateFailed = false;

  if (!blockNewSignals) {
    // Evaluate Rule 1 (Three Consecutive Green Candles)
    if (rule1Streak === 3 && rule1StartIndex) {
      const startCandleRes = await db.select().from(candles).where(eq(candles.open_time, rule1StartIndex)).limit(1);
      if (startCandleRes.length > 0) {
        const startCandle = startCandleRes[0];
        const indicator = startCandle.close;
        if (currentCandle.low > indicator) {
          candidate1 = {
            rule: 'Three Green Candles',
            indicator,
            indicator_candle_time: startCandle.open_time,
            start_time: currentCandle.open_time,
          };
        }
      }
    }

    // Evaluate Rule 2 (Close Above Previous High)
    if (loadedCandles.length >= 4) {
      const n = loadedCandles[loadedCandles.length - 1]; // current
      const n_1 = loadedCandles[loadedCandles.length - 2];
      const n_3 = loadedCandles[loadedCandles.length - 4];

      if (n.close > n.open && n.close > n_1.high) {
        if (n_1.open < n_3.open) {
          // Gate passes
          const indicator = n_1.close > n_1.open ? n_1.close : n_1.open;
          candidate2 = {
            rule: 'Close Above Prev High',
            indicator,
            indicator_candle_time: n_1.open_time,
            start_time: n.open_time,
          };
        } else {
          // Gate fails -> flag for Rule 3
          rule2GateFailed = true;
        }
      }
    }

    // Evaluate Rule 3 (Close Above Post-Signal Peak)
    if (rule2GateFailed) {
      const n = currentCandle;
      const priorSignalRes = await db.select().from(signals)
        .where(lt(signals.start_time, n.open_time))
        .orderBy(desc(signals.start_time))
        .limit(1);

      if (priorSignalRes.length > 0) {
        const priorSignal = priorSignalRes[0];
        const indTime = priorSignal.indicator_candle_time;

        const greenCandles = await db.select().from(candles)
          .where(
            and(
              gt(candles.open_time, indTime),
              lt(candles.open_time, n.open_time)
            )
          );

        let peakCandle: any = null;
        for (const c of greenCandles) {
          if (c.close > c.open) {
            if (!peakCandle || c.close > peakCandle.close) {
              peakCandle = c;
            }
          }
        }

        if (peakCandle) {
          const indicator = peakCandle.close;
          if (n.close > indicator) {
            candidate3 = {
              rule: 'Close Above Post-Signal Peak',
              indicator,
              indicator_candle_time: peakCandle.open_time,
              start_time: n.open_time,
            };
          }
        }
      }
    }
  }

  // 6. Post-Processing Filters (Dedup)
  const candidates = [candidate1, candidate2, candidate3].filter(Boolean);

  for (const cand of candidates) {
    // Dedup by indicator
    const existingInd = await db.select().from(signals).where(eq(signals.indicator, cand.indicator)).limit(1);
    if (existingInd.length > 0) {
      continue;
    }

    const nowStr = new Date().toISOString();
    const insertedRes = await db.insert(signals).values({
      start_time: cand.start_time,
      end_time: cand.start_time,
      rule: cand.rule,
      indicator: cand.indicator,
      indicator_candle_time: cand.indicator_candle_time,
      status: 'Ongoing',
      created_at: nowStr,
      updated_at: nowStr,
    }).returning();

    if (insertedRes.length > 0) {
      appEvents.emit('new-signal', { signal: insertedRes[0] as any });
    }
  }

  // 8. Update engine_state
  await db.update(engineState)
    .set({
      last_processed_time: currentCandle.open_time,
      rule1_green_streak: rule1Streak,
      rule1_streak_start_index: rule1StartIndex,
    })
    .where(eq(engineState.id, 1));
}
