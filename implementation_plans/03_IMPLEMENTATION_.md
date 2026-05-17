# Phase 4 — REST API + Socket.IO

> **Scope:** Build the REST endpoints to serve historical data to the frontend, wire up Socket.IO for real-time streaming, decouple service events using Node's EventEmitter, and set up the hourly cron job for live data fetching.

> **Reference:** [KICKSTART_IMPLEMENTATION_PLAN.md](../KICKSTART_IMPLEMENTATION_PLAN.md) — API Routes & Socket.IO Events

---

## Context

Phase 3 successfully built the incremental signal detection engine. All data currently resides in the SQLite database. Phase 4 exposes this data to the outside world via an Express REST API (for initial frontend load) and a Socket.IO server (for real-time live updates). It also introduces a `node-cron` job to fetch the latest candle every hour and pipe it through our engine automatically.

### Key Design Decisions

| Decision | Choice |
|---|---|
| Service Decoupling | Use Node's built-in `EventEmitter` to broadcast events from `candleFetcher` and `signalEngine`. The Express server (`index.ts`) will listen to these and forward them via Socket.IO. This keeps DB services ignorant of network transport. |
| Cron Schedule | Run the fetcher at minute `1` of every hour (`1 * * * *`) to ensure Binance has fully closed the previous hour's candle. |
| Latest Fetch Strategy | Create a new function `fetchLatestCandles()` that fetches the last 2 candles from Binance to ensure we capture the most recently closed candle without needing exact timestamp math. |

### Core Processing Flow (Live Mode)

```
Cron triggers at HH:01:
  1. fetchLatestCandles(limit=2) calls Binance
  2. For each candle:
     - Attempt to INSERT into candles (ON CONFLICT DO NOTHING)
     - If inserted successfully:
       → EventEmit('new-candle', candle)
       → signalEngine.processNewCandle(candle.open_time)
         ↳ In engine: if signal breaks → EventEmit('signal-updated', ...)
         ↳ In engine: if new signal accepted → EventEmit('new-signal', ...)
```

### Files to Create/Modify

```
server/src/
├── index.ts                   ← [MODIFY] Add REST routes, Socket.IO forwarding, and cron initialization
├── services/
│   ├── events.ts              ← [NEW] Export a singleton EventEmitter
│   ├── candleFetcher.ts       ← [MODIFY] Add fetchLatestCandles(), emit 'new-candle'
│   └── signalEngine.ts        ← [MODIFY] Emit 'new-signal' and 'signal-updated'
└── scripts/
    └── [No changes needed]
```

---

## Implementation Checklist

### 1. Event Emitter Setup
- [x] Create `server/src/services/events.ts`
  - [x] Export a shared `EventEmitter` instance (`appEvents`).
  - [x] Define strong TS types for event payloads: `new-candle`, `new-signal`, `signal-updated`.

### 2. REST API Routes
- [x] Update `server/src/index.ts` to add REST endpoints:
  - [x] `GET /api/candles`: Query all candles, order chronologically. Support optional `?from=YYYY-MM-DD HH:MM&to=YYYY-MM-DD HH:MM` filters.
  - [x] `GET /api/candles/latest`: Query candles, order chronologically. Support optional `?limit=N` (default 100).
  - [x] `GET /api/signals`: Query all signals. Support optional `?status=Ongoing` filter.

### 3. Socket.IO Wiring
- [x] Update `server/src/index.ts` to bridge `appEvents` to `io`:
  - [x] `appEvents.on('new-candle', (payload) => io.emit('new-candle', payload))`
  - [x] `appEvents.on('new-signal', (payload) => io.emit('new-signal', payload))`
  - [x] `appEvents.on('signal-updated', (payload) => io.emit('signal-updated', payload))`
- [x] Add an interval to emit `engine-status` heartbeat (e.g., every 30 seconds) showing last processed time.

### 4. Engine Event Emitting
- [x] Update `server/src/services/signalEngine.ts`:
  - [x] Import `appEvents`.
  - [x] When a signal breaks: `appEvents.emit('signal-updated', { id, status: 'Broken', end_time })`.
  - [x] When a new signal is accepted/inserted: fetch the full inserted row and `appEvents.emit('new-signal', { signal })`.

### 5. Live Fetcher & Cron Job
- [x] Update `server/src/services/candleFetcher.ts`:
  - [x] Import `appEvents`.
  - [x] Implement `fetchLatestCandles()`: fetch Binance `/klines` with `limit=2` (no start/end time).
  - [x] For each fetched candle, try to insert into DB.
  - [x] If `insertedCount > 0`, `appEvents.emit('new-candle', { candle })` and call `processNewCandle()`.
- [x] Update `server/src/index.ts` to initialize `node-cron`:
  - [x] Schedule `'1 * * * *'` (minute 1 of every hour).
  - [x] Inside cron callback, call `fetchLatestCandles()`.

### 6. Verification
- [ ] Start the server: `npm run dev -w server`.
- [ ] Verify `GET /api/candles/latest` returns JSON data.
- [ ] Verify `GET /api/signals?status=Ongoing` returns JSON data.
- [ ] Test real-time flow: manually insert a mock row into the DB or trigger `fetchLatestCandles` and observe console logs indicating Socket.IO events were fired.

---

## Acceptance Criteria

1. REST API successfully serves historical data from SQLite.
2. `signalEngine` and `candleFetcher` use `EventEmitter` instead of direct Socket references.
3. Socket.IO server correctly broadcasts events to connected clients.
4. Cron job is scheduled to keep the database up-to-date automatically every hour.
