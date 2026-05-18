# Backfill Fix: Filter Incomplete Candles

> **Scope:** Update the historical candle fetching logic used during the initial backfill to ensure it also filters out incomplete (currently forming) candles, matching the behavior of the real-time cron job.

---

## Context & Root Causes

During our previous update, we added a filter to `fetchLatestCandles()` (the cron job) to ensure it only processes fully closed candles. However, the `backfill()` function uses a different helper method: `fetchCandlesFromBinance()`. 

Currently, `fetchCandlesFromBinance()` filters candles based solely on `openTimeMs <= endMs`. Since the currently forming candle has an open time in the past, it passes this check and gets inserted into the database before it has finished forming. 

To maintain strict data integrity and ensure the signal engine only evaluates finalized hourly data, we must apply the same `closeTimeMs` verification within the historical fetching logic.

### Files to Modify

```
server/src/
└── services/
    └── candleFetcher.ts         ← [MODIFY] Add closeTime filter to fetchCandlesFromBinance
```

---

## Implementation Checklist

### 1. Filter Incomplete Candles in Backfill
- [x] Open `server/src/services/candleFetcher.ts`.
- [x] Locate the `fetchCandlesFromBinance` function.
- [x] Inside the data processing loop (`for (const row of data)`), extract the `closeTimeMs` from `row[6]`.
- [x] Add the condition `if (Date.now() <= closeTimeMs) continue;` to skip any candle that hasn't fully closed.

### 2. Verification
- [x] Save the file.
- [x] The user can run `npm run backfill -w server` (with an empty or outdated DB) to verify that the latest fetched candle is the most recently *completed* hour, not the currently forming one.
