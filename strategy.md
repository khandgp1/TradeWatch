# Confirmed Uptrend — Full Algorithm Definition

This document is the single source of truth for what constitutes a **confirmed uptrend** in the alerting system.
A new implementation should be able to reproduce `detect_confirmed_uptrends.js` using only this file.

---

## Core Concepts

| Term | Definition |
|---|---|
| **Green candle** | A candle where `close > open` |
| **Red candle** | A candle where `close < open` |
| **Indicator** | A price level specific to each rule (see below). Once set, it acts as the invalidation floor. |
| **Confirmed uptrend** | Active from the signal candle onward as long as every subsequent candle's `low > indicator` |
| **Invalidation** | The trend ends at the last candle whose `low > indicator`, immediately before the first candle that violates it |

---

## Candle Notation

For any candle at index `i`, the window looks like:

```
candles[i-3]  candles[i-2]  candles[i-1]  candles[i]
   n-3            n-2            n-1            n        ← signal candle
```

---

## Global Prerequisites

Before evaluating any specific rule for candle `n`, the following global conditions must be met:

1. **Continuation Filter (One Signal Per Wave):** If any prior signal exists in the database (from Rule 1, 2, or 3), there must be at least one red candle (`close < open`) strictly after the `start_time` of the most recent prior signal and strictly before or at candle `n`'s open time. If no red candle has occurred, candle `n` is considered part of an ongoing momentum wave; no new signals will be evaluated.

---

## Rule 1 — Three Consecutive Green Candles

### Signal
Three candles at indices `[i, i+1, i+2]` are all green:
```
close[i]   > open[i]
close[i+1] > open[i+1]
close[i+2] > open[i+2]
```

### Indicator
`indicator = close[i]` ← closing price of the **first** green candle

### Confirmation
The uptrend is confirmed **starting at candle `i+2`** (the 3rd green candle), provided:
```
low[i+2] > indicator
```

### Duration
The trend remains active for every subsequent candle `j` (where `j > i+2`) such that:
```
low[j] > indicator   (for all j in the streak)
```
The first candle where `low[j] <= indicator` ends the trend. The trend's `end` timestamp is the last valid `j`.

### Loop Advance (deduplication)
After detecting a 3-candle signal at `i`, the outer loop advances past the **entire initial consecutive green streak** (not just to `i+2`). This prevents candles 4, 5, 6, etc. of the same streak from triggering new signals.

A new Rule 1 signal can only form after the green streak breaks (one or more non-green candles) and a fresh set of 3 consecutive green candles begins — even if this new pattern starts while an older trend's indicator is still valid.

---

## Rule 2 — Close Above Previous High

### Signal
Candle `n` (at index `i`) is green **and** closes strictly above the high of candle `n-1`:
```
close[n] > open[n]
close[n] > high[n-1]
```

### Confirmation Gate
The signal is only confirmed if the open of `n-1` is lower than the open of `n-3`:
```
open[n-1] < open[n-3]
```
If this gate fails, Rule 2 does **not** fire (Rule 3 may apply instead — see below).

### Indicator
The indicator is placed at candle `n-1`:
```
indicator = close[n-1]   if candle n-1 is green (close > open)
indicator = open[n-1]    if candle n-1 is red   (close < open)
```

### Confirmation & Duration
The uptrend is confirmed **at candle `n`** (the signal candle itself). It remains valid for every subsequent candle `j` (where `j > i`) such that:
```
low[j] > indicator
```
The first violation ends the trend.

### Loop Advance
**Do not advance `i`** after a Rule 2 match. Every candle is independently evaluated so that overlapping or immediately sequential signals are each captured.

---

## Rule 3 — Close Above Post-Signal Peak

This rule is a fallback that fires when a candle meets the Rule 2 signal criteria but **fails** the Rule 2 confirmation gate.

### Trigger Condition
Candle `n` (at index `i`) satisfies:
```
close[n] > open[n]           ← green candle
close[n] > high[n-1]         ← closes above prev candle's high
open[n-1] >= open[n-3]       ← Rule 2 gate FAILS
```

### Prerequisite
There must be at least one confirmed trend (from Rule 1, Rule 2, or Rule 3) whose `start` timestamp is before `n`'s open time. (In addition, the Global Continuation Filter must be satisfied). If no prior range exists, skip this candle.

### Peak Candle Search
1. Take the **most recent** prior confirmed trend (by `start` time).
2. Note its `indicatorCandleIndex` — the index of the candle where that trend's indicator was originally set.
3. Scan the window `[indicatorCandleIndex + 1, i - 1]` (exclusive of `i`) for all **green** candles.
4. The **peak candle** is the green candle in that window with the **highest closing price**.

If no green candle exists in the window, skip (no Rule 3 signal).

### Indicator
```
indicator = close[peak candle]
```

### Confirmation & Duration
The uptrend is confirmed **at candle `n`** if:
```
close[n] > indicator
```
The trend then remains valid for every subsequent candle `j` (where `j > i`) such that:
```
low[j] > indicator
```

---

## Post-Processing Pipeline

After all three rules are evaluated, the following filters are applied **in order**:

### Step 1 — Deduplicate by Indicator Value
Sort all detected ranges by `start` time (ascending). Keep only the **first** range per unique `indicator` price. If two rules fire with the same indicator level, only the earliest one is retained.

### Step 2 — Exclude Same-Hour Trends
Discard any trend where `start === end` (the trend began and ended within the same candle).

---

## Output Format

The final result is a markdown table with one row per accepted trend:

| Start (EST) | End (EST) | Rule | Indicator | Status |
|---|---|---|---|---|
| `YYYY-MM-DD HH:MM` | `YYYY-MM-DD HH:MM` | `Three Green Candles` \| `Close Above Prev High` \| `Close Above Post-Signal Peak` | `price` | `Ongoing` \| `Broken` |

- **Status = `Ongoing`** if the last valid candle is the final candle in the dataset.
- **Status = `Broken`** otherwise.

---

## Key Implementation Notes

1. Rules 1, 2, and 3 run as **three separate loops** over the same candle array. Rule 3 references `ranges` that may have been populated by Rules 1 and 2, so Rule 3 must run last.
2. The `indicatorCandleIndex` (the array index of the candle where the indicator was set) must be stored on each range object — Rule 3 depends on it.
3. All timestamp comparisons use `YYYY-MM-DD HH:MM` string format (first 16 characters of the candle's open time).
4. Prices are stored and compared as floats; the indicator is displayed rounded to 2 decimal places.

---

> **Decision Tree:** See [`decision_tree.md`](./decision_tree.md) for a visual Mermaid flowchart of this algorithm.
