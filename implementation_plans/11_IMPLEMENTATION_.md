# Feature: Remove Cooldown Filter (Allow Nested Trends)

> **Scope:** Update the strategy definition, database schema, and signal engine to remove the Cooldown Filter, allowing overlapping "trends within trends" to be detected and alerted on.

---

## Context

The user has decided to remove the Cooldown Filter to allow the system to alert on overlapping signals (e.g., scaling in opportunities or raising the trailing stop floor during a strong trend). 

This requires cleaning up the strategy documentation, removing the tracking column from the SQLite schema, and simplifying the candidate evaluation loop in the signal engine.

### Files to Modify

```
strategy.md                         ← [MODIFY] Remove Step 2 (Cooldown Filter)
server/src/
├── db/
│   └── schema.ts                   ← [MODIFY] Remove `last_accepted_end` from `engineState`
└── services/
    └── signalEngine.ts             ← [MODIFY] Remove cooldown evaluation logic
```

---

## Implementation Checklist

### 1. Update Strategy Documentation
- [x] Open `strategy.md`.
- [x] Remove the section `### Step 2 — Cooldown Filter` entirely.
- [x] Rename `Step 3 — Exclude Same-Hour Trends` to `Step 2`.

### 2. Update Database Schema
- [x] Open `server/src/db/schema.ts`.
- [x] Remove `last_accepted_end: text('last_accepted_end'),` from the `engineState` table definition.

### 3. Update Signal Engine Logic
- [x] Open `server/src/services/signalEngine.ts`.
- [x] In `processNewCandle`, remove the initialization `let newAcceptedEnd = state.last_accepted_end;`.
- [x] Simplify the candidate loop: After checking for duplicates (`existingInd.length > 0`), **directly insert the new signal** without checking for red candles or overlapping dates.
- [x] Remove the `last_accepted_end` assignment from the `db.update(engineState)` call at the end of the file.

### 4. Verification
- [x] Delete the existing database, push the new schema, and run the backfill:
  ```bash
  rm -f server/data/alerting.db && npm run db:push -w server && npm run backfill -w server
  ```
- [x] Confirm that the backfill successfully generates overlapping signals (you should see multiple signals starting while others are `Ongoing`).
- [x] Specifically verify that the `2026-05-17 19:00` signal now successfully triggers.
