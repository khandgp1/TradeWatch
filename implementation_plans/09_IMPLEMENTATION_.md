# Refine Real-Time Data Ingestion (Cron & Completed Candles)

> **Scope:** Replace any assumptions about Binance WebSocket with a precise Cron Job that runs at exactly 5 seconds past the hour (`XX:00:05`). Ensure that only fully closed (completed) candles are inserted into the database and processed by the signal engine.

---

## Context & Root Causes

During the planning and implementation of Phase 7, the system was originally envisioned to handle real-time data ingestion via Binance WebSockets. However, since the system's logic (and UI) only requires data updates at the hourly close, maintaining a constant WebSocket connection to Binance is unnecessary overhead.

We will explicitly rely on a `node-cron` scheduled task. The current cron job runs at `minute 1` of every hour (`1 * * * *`). We will update this to run exactly at 5 seconds past the hour (`5 0 * * * *`) to fetch the most recently closed candle promptly.

Additionally, the Binance REST API for `/klines` can return the currently forming (incomplete) candle. We must add a validation check in `fetchLatestCandles` to ensure we only process candles where the current time is strictly greater than the candle's `closeTime` (which Binance provides in `row[6]`).

### Files to Modify

```
server/src/
├── index.ts                     ← [MODIFY] Update cron schedule to XX:00:05
└── services/
    └── candleFetcher.ts         ← [MODIFY] Filter out incomplete candles based on closeTime
```

---

## Implementation Checklist

### 1. Update Cron Schedule
- [x] Open `server/src/index.ts`.
- [x] Locate the `cron.schedule` initialization at the bottom of the file.
- [x] Change the cron expression from `'1 * * * *'` to `'5 0 * * * *'` (runs at second 5, minute 0, every hour).
- [x] Update the `setInterval` heartbeat calculating `nextFetchDate` to reflect the exact new time (`XX:00:05`).

### 2. Filter Incomplete Candles
- [x] Open `server/src/services/candleFetcher.ts`.
- [x] Locate the `fetchLatestCandles` function.
- [x] Inside the data processing loop (`for (const row of data)`), extract the `closeTimeMs` from `row[6]`.
- [x] Add a condition: `if (Date.now() <= closeTimeMs) continue;` to skip inserting any candle that hasn't fully closed.
- [x] Ensure that `appEvents.emit('new-candle')` and `processNewCandle()` only run for these completed candles.

### 3. Verification
- [x] Save all files.
- [x] Review the server console logs to ensure no syntax errors.
- [x] Ensure that manually triggering `fetchLatestCandles` (or waiting for the cron) does not insert the currently forming candle into the database.
- [x] Confirm the UI still receives the `new-candle` and `engine-status` socket events correctly.
