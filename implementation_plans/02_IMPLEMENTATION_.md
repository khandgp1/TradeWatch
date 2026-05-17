# Phase 3 — Signal Detection Engine (Core)

> **Scope:** Build the incremental signal detection engine that evaluates Rules 1, 2, and 3 against each new candle, manages ongoing signal invalidation, applies post-processing filters (dedup, cooldown, same-hour), and update the backfill script to pipe historical candles through the engine one-by-one.

> **Reference:** [strategy.md](../strategy.md) — full algorithm definition | [KICKSTART_IMPLEMENTATION_PLAN.md](../KICKSTART_IMPLEMENTATION_PLAN.md) — Incremental Engine (lines 337–390) + Per-Candle Processing (lines 351–381) | [decision_tree.md](../decision_tree.md) — visual flowchart

---

## Context

Phase 2 established the database, Drizzle schema, and candle fetcher (backfill mode). The `candles`, `signals`, and `engine_state` tables exist but only `candles` is populated. Phase 3 builds the most critical component: the incremental signal detection engine that processes one candle at a time, maintaining state in the `engine_state` table so it never needs to re-scan history.

### Key Design Decisions (confirmed with user)

| Decision | Choice |
|---|---|
| Same-hour filter | When a signal breaks and `start_time === end_time`, **delete** the signal row from DB entirely (not a "Discarded" status) |
| Backfill integration | Backfill script will pipe each historical candle through the signal engine one-by-one, populating both `candles` and `signals` |
| Rule evaluation order | Invalidation → Rule 1 → Rule 2 → Rule 3 → Post-processing (per the kickstart plan pseudocode) |

### Core Processing Flow (Per Candle)

```
processNewCandle(candleOpenTime):
  1. LOAD engine_state (create singleton if first run)
  2. LOAD current candle + last 3 candles from DB (4 total for Rule 2/3 lookback)
  3. INVALIDATE ongoing signals:
     - For each signal with status = "Ongoing":
       - If candle.low <= signal.indicator:
         → Mark "Broken", end_time = previous candle time
         → If start_time === end_time → DELETE signal (same-hour filter)
       - Else:
         → Update end_time = current candle time (trend extends)
  4. EVALUATE Rule 1 (green streak counter)
  5. EVALUATE Rule 2 (close above prev high + confirmation gate)
  6. EVALUATE Rule 3 (only if Rule 2 criteria met but gate failed)
  7. For each candidate signal:
     - DEDUP: reject if same indicator value already in signals table
     - COOLDOWN: reject unless a red candle closed after the last accepted signal's end
     - If accepted: INSERT signal (status="Ongoing", start_time=end_time=current candle)
  8. UPDATE engine_state
```

### Files to Create/Modify

```
server/src/
├── services/
│   ├── signalEngine.ts        ← [NEW] incremental detection engine
│   └── candleFetcher.ts       ← [MODIFY] update backfill to pipe through engine
└── scripts/
    └── backfill.ts            ← [MODIFY] update logging for signals
```

---

## Implementation Checklist

### 1. Signal Engine — Core Structure
- [x] Create `server/src/services/signalEngine.ts`
- [x] Implement `processNewCandle(candleOpenTime: string)` — the main entry point:
  - [x] Load or initialize `engine_state` singleton (id=1, insert if not exists)
  - [x] Load current candle and previous 3 candles from DB by `open_time`
  - [x] Guard: skip if fewer than 1 candle loaded, or if `candleOpenTime <= last_processed_time`

### 2. Signal Engine — Ongoing Signal Invalidation
- [x] Implement invalidation step (runs before rule evaluation):
  - [x] Query all signals with `status = 'Ongoing'`
  - [x] For each: if `candle.low <= signal.indicator`:
    - [x] Determine `previousCandleTime` (the candle immediately before the current one)
    - [x] Update signal: `status = 'Broken'`, `end_time = previousCandleTime`, `updated_at = now`
    - [x] If `start_time === end_time` after update → DELETE the signal row (same-hour filter applied retroactively)
  - [x] For each surviving ongoing signal: update `end_time = currentCandleTime` (trend extends)

### 3. Signal Engine — Rule 1 (Three Consecutive Green Candles)
- [x] Implement Rule 1 evaluation:
  - [x] Check if current candle is green (`close > open`)
  - [x] If green: increment `rule1_green_streak`, and if streak was 0, set `rule1_streak_start_index = current candle open_time`
  - [x] If not green: reset `rule1_green_streak = 0`, clear `rule1_streak_start_index`
  - [x] If `rule1_green_streak === 3`:
    - [x] Load the streak-start candle from DB using `rule1_streak_start_index`
    - [x] Set `indicator = streak-start candle's close`
    - [x] Check confirmation: `current candle's low > indicator`
    - [x] If confirmed: create signal candidate with `rule = 'Three Green Candles'`, `indicator_candle_time = streak-start candle's open_time`, `start_time = current candle's open_time`
  - [x] If `rule1_green_streak > 3`: do nothing (dedup — wait for streak to break)

### 4. Signal Engine — Rule 2 (Close Above Previous High)
- [x] Implement Rule 2 evaluation (requires candles `[i-3, i-1, i]`):
  - [x] Guard: skip if fewer than 4 candles available for lookback
  - [x] Check signal criteria: `candle[i] is green` AND `close[i] > high[i-1]`
  - [x] If signal criteria met, check confirmation gate: `open[i-1] < open[i-3]`
  - [x] If gate passes:
    - [x] Set indicator: `close[i-1]` if candle `i-1` is green, `open[i-1]` if red
    - [x] Create signal candidate with `rule = 'Close Above Prev High'`, `indicator_candle_time = candle[i-1] open_time`, `start_time = current candle's open_time`
  - [x] If gate fails: flag for Rule 3 evaluation

### 5. Signal Engine — Rule 3 (Close Above Post-Signal Peak)
- [x] Implement Rule 3 evaluation (only if Rule 2 signal criteria passed but gate failed):
  - [x] Query DB for the most recent signal (by `start_time` desc) whose `start_time < current candle's open_time`
  - [x] If no prior signal exists: skip
  - [x] Get prior signal's `indicator_candle_time`
  - [x] Query DB for all green candles (`close > open`) with `open_time > indicator_candle_time` AND `open_time < current candle's open_time`
  - [x] Find the peak candle: the one with the highest `close` value
  - [x] If no green candles in window: skip
  - [x] Set `indicator = peak candle's close`
  - [x] Check confirmation: `close[current candle] > indicator`
  - [x] If confirmed: create signal candidate with `rule = 'Close Above Post-Signal Peak'`, `indicator_candle_time = peak candle's open_time`, `start_time = current candle's open_time`

### 6. Signal Engine — Post-Processing Filters
- [x] Implement per-candidate post-processing (applied to each signal candidate before insertion):
  - [x] **Dedup by indicator**: query `signals` table for any existing signal with the same `indicator` value → reject if found
  - [x] **Cooldown filter**:
    - [x] Query the most recent signal from `signals` table (by `start_time` desc) — call its `end_time` → `lastEnd`
    - [x] If no prior signal: accept (first trend is always accepted)
    - [x] If `candidate.start_time <= lastEnd`: reject (still inside previous trend window)
    - [x] If `candidate.start_time > lastEnd`: query `candles` for a red candle (`close < open`) with `open_time >= lastEnd` AND `open_time <= candidate.start_time`
    - [x] If red candle found: accept. Else: reject
  - [x] If candidate passes both filters: INSERT into `signals` table with `status = 'Ongoing'`, `start_time = end_time = candidate.start_time`

### 7. Signal Engine — State Update
- [x] After all rule evaluations and candidate processing:
  - [x] Update `engine_state` row: `last_processed_time = current candle's open_time`, current `rule1_green_streak`, `rule1_streak_start_index`
  - [x] Update `last_accepted_end` if a new signal was accepted in this cycle

### 8. Backfill Integration
- [x] Modify `candleFetcher.ts` `backfill()`:
  - [x] After inserting candles, iterate over all candles in chronological order (by `open_time` asc)
  - [x] For each candle, call `processNewCandle(candle.open_time)`
  - [x] Only process candles that haven't been processed yet (check `engine_state.last_processed_time`)
- [x] Update `backfill.ts` script to log signal detection results (total signals detected, by rule type)

### 9. Verification
- [x] Run `npm run db:push -w server` to ensure schema is up to date
- [x] Delete existing `server/data/alerting.db`, push schema, and re-run backfill: `rm -f server/data/alerting.db && npm run db:push -w server && npm run backfill -w server`
- [x] Verify `candles` table is populated (~100 rows)
- [x] Verify `signals` table has detected signals with correct rule types, indicator values, and statuses
- [x] Verify `engine_state` table has correct state (last_processed_time matches last candle, streak counters reset/current)
- [x] Verify idempotency: running backfill again produces no new signals (engine skips already-processed candles)
- [x] Spot-check a few signals against the strategy.md rules to confirm correctness

---

## Acceptance Criteria

1. `processNewCandle()` correctly evaluates Rules 1, 2, and 3 incrementally against each new candle
2. Ongoing signals are invalidated when `candle.low <= indicator`, with `end_time` set to the previous candle
3. Same-hour signals (`start === end` after breaking) are deleted from the DB entirely
4. Dedup filter prevents duplicate signals with the same indicator value
5. Cooldown filter blocks new signals until a red candle closes after the previous accepted signal's end
6. Running backfill on a fresh DB populates both `candles` and `signals` tables
7. The `engine_state` singleton correctly tracks Rule 1 streak and last processed time
8. Running backfill a second time is idempotent (no duplicate signals, engine skips processed candles)

---

## Notes

- **Rule evaluation order matters**: Invalidation runs first (so broken signals don't interfere with cooldown checks), then Rules 1→2→3 (Rule 3 depends on prior signals from Rules 1 and 2, but only from *previous* candles, which are already in the DB).
- **Rule 3 depends on prior signals**: In batch mode, Rule 3 runs in a separate loop after Rules 1 and 2. In incremental mode, this naturally works because Rule 3 queries the `signals` table, which contains signals from prior candle processing.
- **`end_time` for ongoing signals**: When a signal is first created, `end_time = start_time`. Each subsequent candle that doesn't break the signal updates `end_time` to the current candle's `open_time`. When it breaks, `end_time` remains as the previous candle's `open_time`.
- **Socket.IO events are NOT emitted in this phase** — that wiring happens in Phase 4. The engine returns results but doesn't push events.
- **No REST API in this phase** — the signal engine is a service module consumed by backfill now and by the API layer in Phase 4.
