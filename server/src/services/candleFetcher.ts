import { db } from '../db/connection';
import { candles, signals, engineState } from '../db/schema';
import { config } from '../config';
import { desc, asc, eq } from 'drizzle-orm';
import { processNewCandle } from './signalEngine';
import { appEvents } from './events';

export interface BinanceCandle {
  open_time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function fetchCandlesFromBinance(startMs: number, endMs: number): Promise<BinanceCandle[]> {
  const results: BinanceCandle[] = [];
  let currentStart = startMs;
  const limit = 1000;

  while (currentStart < endMs) {
    const url = `https://api.binance.us/api/v3/klines?symbol=${config.symbol}&interval=${config.interval}&startTime=${currentStart}&endTime=${endMs}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Binance API error (${res.status}): ${text}`);
    }

    const data = (await res.json()) as any[][];
    if (data.length === 0) {
      break;
    }

    for (const row of data) {
      const openTimeMs = row[0] as number;
      // Skip if beyond endMs
      if (openTimeMs > endMs) continue;

      results.push({
        open_time: msToUtcString(openTimeMs),
        open: parseFloat(row[1]),
        high: parseFloat(row[2]),
        low: parseFloat(row[3]),
        close: parseFloat(row[4]),
        volume: parseFloat(row[5]),
      });
    }

    const lastCandleMs = data[data.length - 1][0] as number;
    // Advance currentStart to next interval (1 hour = 3600000 ms)
    currentStart = lastCandleMs + 3600000;
  }

  return results;
}

export async function backfill(): Promise<{ fetched: number; inserted: number; processed: number; signalsCount: number; rule1Count: number; rule2Count: number; rule3Count: number; range: string }> {
  // Determine start time in ms
  let startMs = new Date(config.startTime + 'Z').getTime();

  // Check last candle in DB to avoid re-fetching
  const lastCandle = await db.select().from(candles).orderBy(desc(candles.open_time)).limit(1);
  if (lastCandle.length > 0) {
    const lastOpenTimeMs = new Date(lastCandle[0].open_time + 'Z').getTime();
    if (lastOpenTimeMs >= startMs) {
      startMs = lastOpenTimeMs + 3600000; // start from next hour
    }
  }

  const endMs = Date.now();
  let fetchedCount = 0;
  let insertedCount = 0;
  let rangeStr = 'Already up to date';

  if (startMs <= endMs) {
    console.log(`Fetching Binance candles from ${msToUtcString(startMs)} to ${msToUtcString(endMs)}...`);
    const binanceCandles = await fetchCandlesFromBinance(startMs, endMs);

    if (binanceCandles.length > 0) {
      fetchedCount = binanceCandles.length;
      rangeStr = `${binanceCandles[0].open_time} to ${binanceCandles[binanceCandles.length - 1].open_time}`;
      const createdAt = new Date().toISOString();

      const valuesToInsert = binanceCandles.map((c) => ({
        open_time: c.open_time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        created_at: createdAt,
      }));

      if (valuesToInsert.length > 0) {
        const res = await db.insert(candles).values(valuesToInsert).onConflictDoNothing().returning({ id: candles.id });
        insertedCount = res.length;
      }
    } else {
      rangeStr = 'No new candles found';
    }
  }

  console.log('Processing candles through signal detection engine...');
  const allCandles = await db.select().from(candles).orderBy(asc(candles.open_time));

  let stateRes = await db.select().from(engineState).where(eq(engineState.id, 1));
  const lastProcessed = stateRes.length > 0 ? stateRes[0].last_processed_time : null;

  let processedCount = 0;
  for (const c of allCandles) {
    if (!lastProcessed || c.open_time > lastProcessed) {
      await processNewCandle(c.open_time);
      processedCount++;
    }
  }

  const allSignals = await db.select().from(signals);
  const signalsCount = allSignals.length;
  const rule1Count = allSignals.filter(s => s.rule === 'Three Green Candles').length;
  const rule2Count = allSignals.filter(s => s.rule === 'Close Above Prev High').length;
  const rule3Count = allSignals.filter(s => s.rule === 'Close Above Post-Signal Peak').length;

  return {
    fetched: fetchedCount,
    inserted: insertedCount,
    processed: processedCount,
    signalsCount,
    rule1Count,
    rule2Count,
    rule3Count,
    range: rangeStr,
  };
}

export async function fetchLatestCandles(): Promise<void> {
  console.log('Fetching latest candles from Binance...');
  const limit = 2;
  const url = `https://api.binance.us/api/v3/klines?symbol=${config.symbol}&interval=${config.interval}&limit=${limit}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error(`Binance API error (${res.status}): ${text}`);
      return;
    }

    const data = (await res.json()) as any[][];
    if (data.length === 0) {
      return;
    }

    const createdAt = new Date().toISOString();
    for (const row of data) {
      const openTimeMs = row[0] as number;
      const c = {
        open_time: msToUtcString(openTimeMs),
        open: parseFloat(row[1]),
        high: parseFloat(row[2]),
        low: parseFloat(row[3]),
        close: parseFloat(row[4]),
        volume: parseFloat(row[5]),
      };

      const insertRes = await db.insert(candles).values({
        ...c,
        created_at: createdAt,
      }).onConflictDoNothing().returning();

      if (insertRes.length > 0) {
        const insertedCandle = insertRes[0];
        console.log(`New candle inserted: ${insertedCandle.open_time}`);
        appEvents.emit('new-candle', { candle: insertedCandle as any });
        await processNewCandle(insertedCandle.open_time);
      }
    }
  } catch (err) {
    console.error('Error fetching latest candles:', err);
  }
}

function msToUtcString(ms: number): string {
  const d = new Date(ms);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
