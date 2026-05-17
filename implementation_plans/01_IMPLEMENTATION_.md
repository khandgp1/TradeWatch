# Phase 2 — Database + Candle Fetcher

> **Scope:** Define the Drizzle ORM schema for all three database tables, set up the SQLite connection, push the schema to create tables, build the hardcoded config file, and implement the candle fetcher with backfill mode (historical fetch from Binance).

> **Reference:** [KICKSTART_IMPLEMENTATION_PLAN.md](../KICKSTART_IMPLEMENTATION_PLAN.md) — Phase 2 (lines 402–407) + Database Schema (lines 184–227) + Configuration File (lines 158–180) + Candle Fetcher design (lines 232–236)

---

## Context

Phase 1 established the monorepo structure with `shared/`, `server/`, and `client/` packages. Phase 2 builds the data layer: the SQLite database (via Drizzle ORM + better-sqlite3), the hardcoded configuration file, and the candle fetcher service that can backfill historical BTC candles from Binance.

### Key Design Decisions (confirmed with user)

| Decision | Choice |
|---|---|
| Config storage | Hardcoded TypeScript file (`config.ts`), no DB table |
| Backfill start date | `2026-05-13 09:00` (UTC) |
| Timestamp storage | **UTC** — convert to EDT for display only |
| Migration approach | `drizzle-kit push` (no migration files) |

### Timestamp Convention

> [!IMPORTANT]
> All timestamps stored in the database use **UTC** in `YYYY-MM-DD HH:MM` format. The `config.ts` `startTime` is interpreted as UTC. Conversion to EDT happens only at the display/API layer (Phase 4+). Binance returns timestamps in milliseconds (Unix epoch), which we convert to UTC strings on insert.

### Files to Create/Modify

```
server/
├── src/
│   ├── config.ts                ← [NEW] hardcoded app config
│   ├── db/
│   │   ├── schema.ts           ← [NEW] Drizzle table definitions
│   │   └── connection.ts       ← [NEW] better-sqlite3 + Drizzle setup
│   └── services/
│       └── candleFetcher.ts    ← [NEW] Binance API client + backfill logic
├── drizzle.config.ts            ← [NEW] Drizzle Kit config for push
└── data/                        ← [NEW] directory for alerting.db (gitignored)
```

---

## Implementation Checklist

### 1. Configuration File
- [x] Create `server/src/config.ts` with `startTime`, `symbol`, `interval`, `port`, `dbPath`
- [x] Update `server/src/index.ts` to import `port` from config instead of hardcoding `3001`

### 2. Drizzle Schema Definition
- [x] Create `server/src/db/schema.ts` with Drizzle table definitions:
  - [x] `candles` table — id (auto-increment PK), open_time (text, unique), open (real), high (real), low (real), close (real), volume (real), created_at (text)
  - [x] `signals` table — id (auto-increment PK), start_time (text), end_time (text), rule (text), indicator (real), indicator_candle_time (text), status (text), created_at (text), updated_at (text)
  - [x] `engine_state` table — id (integer PK), last_processed_time (text), rule1_green_streak (integer), rule1_streak_start_index (text), last_accepted_end (text), state_json (text)

### 3. Database Connection
- [x] Create `server/src/db/connection.ts`:
  - [x] Initialize `better-sqlite3` with path from `config.dbPath`
  - [x] Enable WAL mode for better concurrent read performance
  - [x] Create and export the Drizzle ORM instance wrapping the SQLite connection
  - [x] Ensure the `data/` directory is auto-created if it doesn't exist

### 4. Drizzle Kit Push Setup
- [x] Create `server/drizzle.config.ts` (Drizzle Kit config pointing to schema and DB path)
- [x] Add `drizzle-kit` as a dev dependency in `server/package.json`
- [x] Add `db:push` script to `server/package.json`: `drizzle-kit push`
- [x] Verify: run `npm run db:push -w server` → tables created in `alerting.db`

### 5. Candle Fetcher Service
- [x] Create `server/src/services/candleFetcher.ts`:
  - [x] `fetchCandlesFromBinance(startMs, endMs)` — calls Binance `/api/v3/klines` with `symbol`, `interval`, `startTime`, `endTime`, `limit=1000`. Returns parsed candle array. Handles pagination (loop until `endMs` reached or no more data).
  - [x] `backfill()` — reads `startTime` from config, determines the last candle in DB (if any) to avoid re-fetching, fetches all candles from start to now, inserts each into DB (skip duplicates via `ON CONFLICT DO NOTHING`).
  - [x] Timestamp conversion: Binance returns `openTime` as Unix ms → convert to `YYYY-MM-DD HH:MM` UTC string.
  - [x] Insert uses Drizzle's `insert().values().onConflictDoNothing()` for idempotent writes.

### 6. Backfill Runner Script
- [x] Add a `backfill` script to `server/package.json`: `tsx src/scripts/backfill.ts`
- [x] Create `server/src/scripts/backfill.ts` — imports `backfill()` from candleFetcher, runs it, logs summary (total fetched, total inserted, time range)
- [x] Ensure the script exits cleanly after completion

### 7. Verification
- [x] Run `npm run db:push -w server` — tables created without errors
- [ ] Run `npm run backfill -w server` — candles fetched from `2026-05-13 09:00 UTC` to now
- [ ] Verify candle count: approximately `(now - startTime) / 1 hour` candles in DB
- [ ] Verify data correctness: spot-check a few candle open_times and OHLCV values against Binance
- [ ] Verify idempotency: run backfill again, confirm no duplicate inserts
- [x] Add `.gitignore` entry for `server/data/` to keep the DB out of version control

---

## Acceptance Criteria

1. `npm run db:push -w server` creates `candles`, `signals`, and `engine_state` tables in `server/data/alerting.db`
2. `npm run backfill -w server` fetches all hourly BTC candles from `2026-05-13 09:00 UTC` to present and inserts them into the `candles` table
3. All timestamps in the database are stored as UTC strings in `YYYY-MM-DD HH:MM` format
4. Running backfill a second time produces no duplicate rows (idempotent via `ON CONFLICT DO NOTHING`)
5. The `server/src/index.ts` uses the port from `config.ts`
6. `server/data/` is gitignored

---

## Notes

- **No signal engine processing during backfill** in this phase. Phase 3 will add the signal engine, and at that point the backfill script will be updated to pipe each candle through the engine sequentially. For now, backfill is candle-only.
- The `signals` and `engine_state` tables are created now but remain empty until Phase 3.
- The candle fetcher's **real-time mode** (hourly cron) is not built here — that's Phase 4. This phase only covers the backfill/initialization path.
- Binance's `/klines` endpoint returns max 1000 results per request. For ~92 hourly candles from `2026-05-13 09:00` to now, a single request suffices. The pagination logic is still implemented for robustness.
