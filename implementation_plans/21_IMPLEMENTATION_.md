# Implementation Plan: Rule 1 Sliding Window Modification

## Objective
Modify Rule 1 (Three Consecutive Green Candles) to use a "sliding window" approach. Instead of exclusively evaluating the exact 3rd candle of a green streak, the algorithm will evaluate any rolling 3-candle window within an ongoing green streak (e.g., 3rd, 4th, 5th candle) until a signal is successfully generated and the streak is consumed. The invalidation check (`low > indicator`) remains unchanged.

## Required Changes

### 1. Documentation Updates
*   **`strategy.md`**: 
    *   Update the Rule 1 section to describe the sliding window logic. 
    *   Clarify that if a streak is >= 3 candles, the algorithm checks the *most recent 3 candles* (`n-2`, `n-1`, `n`). 
    *   The `indicator` is set to the close of the `n-2` candle. 
    *   The confirmation remains `low[n] > indicator`.
    *   Once a signal is confirmed, the entire current streak is "consumed" and no further Rule 1 signals will evaluate until the streak breaks with a red candle.
*   **`decision_tree.md`**:
    *   Review and update the Rule 1 flowchart pathways to reflect the sliding window logic (`streak >= 3` instead of exactly 3) and the consumption of the streak.

### 2. Code Updates (`server/src/services/signalEngine.ts`)
*   **Update Rule 1 Condition**: Change `if (rule1Streak === 3 && rule1StartIndex)` to `if (rule1Streak >= 3 && rule1StartIndex)`.
*   **Update Indicator Calculation**: Instead of querying the database for the candle at `rule1StartIndex`, simply use the `n-2` candle from the already loaded window: `const n_2 = loadedCandles[loadedCandles.length - 3];`. The indicator will be `n_2.close`.
*   **Consume the Streak**: Inside the success block (when `currentCandle.low > indicator`), set `rule1StartIndex = null;` before the state is saved. This effectively "consumes" the streak, preventing candles 4, 5, etc., from triggering additional signals if the 3rd candle succeeds. If the 3rd candle fails, `rule1StartIndex` remains intact, allowing the 4th candle to be evaluated.

### 3. Verification & Testing
*   **Backfill Data**: Run `npm run script server/src/scripts/backfill.ts` (or equivalent) to reset the database and re-evaluate all historical signals.
*   **Verify 2026-05-15 17:00**: Confirm that a Rule 1 signal is now successfully generated for the 4th green candle in the sequence at 17:00.

## Checklist
- [ ] Update `strategy.md` to document the sliding window logic for Rule 1.
- [ ] Update `decision_tree.md` to align with the new Rule 1 logic.
- [ ] Modify `server/src/services/signalEngine.ts` to implement `streak >= 3` evaluation.
- [ ] Modify `server/src/services/signalEngine.ts` to calculate the indicator using the `n-2` candle.
- [ ] Modify `server/src/services/signalEngine.ts` to set `rule1StartIndex = null` upon successful signal confirmation.
- [ ] Run the backfill script to rebuild the database and verify the new logic.
- [ ] Confirm a signal triggers correctly at `2026-05-15 17:00`.
