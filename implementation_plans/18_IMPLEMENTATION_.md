# Implementation Plan: Rule 3 Continuation Filter (Option 2)

## Goal
Adjust the "Close Above Post-Signal Peak" (Rule 3) logic to act as a momentum trigger while preventing it from firing repeatedly during a continuous upward streak of green candles.

## Context
Currently, Rule 3 incorrectly triggers on successive green candles (e.g., at 15:00 and 16:00 following a signal at 14:00) because the price is continuously rising without pulling back. We are implementing **Option 2**, which requires at least one red candle to have printed since the last signal before Rule 3 is allowed to evaluate again. This elegantly suppresses immediate continuations while arming the system for the next leg up after any pullback.

---

## Step-by-Step Implementation

### 1. Update Strategy Documentation
- **File:** `strategy.md`
- **Action:** Update the "Rule 3 — Close Above Post-Signal Peak" section.
- **Details:** Add a "Continuation Filter" rule stating that Rule 3 requires at least one red candle (`close < open`) to have occurred since the `start_time` of the most recent prior signal. If no red candle has occurred, Rule 3 is skipped.

### 2. Update Signal Detection Engine
- **File:** `server/src/services/signalEngine.ts`
- **Action:** Add the red candle check to the Rule 3 evaluation logic.
- **Details:** 
  - Locate the `Rule 3` block (around line 123).
  - After fetching `priorSignalRes`, query the `candles` table for any candle where `close < open` and `open_time > priorSignal.start_time` and `open_time < n.open_time`.
  - If the query returns 0 results, skip evaluating Rule 3 for the current candle.

### 3. Verification & Validation
- **Action:** Run the engine against the `2026-05-14` data window.
- **Details:** Confirm that the Rule 3 signal triggers at 14:00, but correctly suppresses at 15:00 and 16:00.

---

## Progress Checklist

- [ ] Update `strategy.md` with the new Rule 3 continuation filter prerequisite.
- [ ] Implement the red candle continuation check in `server/src/services/signalEngine.ts`.
- [ ] Verify functionality over the 2026-05-14 14:00 - 16:00 timeframe.
