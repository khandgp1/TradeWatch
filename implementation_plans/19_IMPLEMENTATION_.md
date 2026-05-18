# Implementation Plan: Global Continuation Filter (One Signal Per Wave)

## Goal
Elevate the "Continuation Filter" (the requirement for a red candle) from a Rule 3 specific prerequisite to a **Global Prerequisite**. This shifts the engine to a strict "One Signal Per Wave" model, completely preventing overlapping or secondary confirmation signals within an uninterrupted streak of green candles.

## Context
Previously, we required a red candle to print between the last signal and the current candle before Rule 3 could fire. The user has decided this logic is superior for the entire system. Now, if any signal (Rule 1, 2, or 3) fires, the engine will stop generating new signals until the momentum breaks (a red candle prints). This eliminates chart clutter and ensures each signal represents the start of a distinct, fresh push.

---

## Step-by-Step Implementation

### 1. Update Strategy Documentation
- **File:** `strategy.md`
- **Action:** Move the "Continuation Filter" from the Rule 3 section to a new "Global Prerequisites" section at the top of the rules.
- **Details:** 
  - Define that for *any* new signal to be generated, there must be at least one red candle (`close < open`) strictly after the `start_time` of the most recent prior confirmed trend.
  - Remove the now-redundant Continuation Filter text from the Rule 3 specific section.

### 2. Refactor Signal Detection Engine
- **File:** `server/src/services/signalEngine.ts`
- **Action:** Implement a global `blockNewSignals` flag.
- **Details:**
  - Before evaluating Rule 1, query the `signals` table for the most recent prior signal.
  - If a prior signal exists, query the `candles` table for any red candle in the window `(priorSignal.start_time, currentCandle.open_time)`.
  - If no red candle exists, set `blockNewSignals = true`.
  - Wrap the evaluation of `candidate1`, `candidate2`, and `candidate3` so they are only processed if `!blockNewSignals`. (Note: The `rule1Streak` state must still be maintained regardless, so just prevent the generation of `candidate1`).
  - Clean up the old, redundant Rule 3 specific red-candle check that we added in Plan 18.

### 3. Verification & Validation
- **Action:** Run a full reset and backfill using `npm run backfill -w server`.
- **Details:** Verify that the total number of signals decreases (eliminating the overlapping Rule 1 and Rule 2 triggers).

---

## Progress Checklist

- [x] Update `strategy.md` to define the Continuation Filter as a global prerequisite.
- [x] Refactor `server/src/services/signalEngine.ts` to implement the global block flag and clean up the old Rule 3 check.
- [x] Run `npm run backfill -w server` to rebuild the signals database and verify the "One Signal Per Wave" behavior.
