# Bug Fix: Chart Initialization (Strict Mode)

> **Scope:** Fix a blank canvas rendering issue caused by React 18's Strict Mode interfering with our incremental data update logic in the Lightweight Charts component.

---

## Context & Root Causes

During Phase 7 testing, the chart stopped displaying historical candles. This is due to an edge case created by how React 18's Strict Mode operates in development environments combined with our `useRef` tracking:

1. React mounts the `<CandlestickChart>`, triggering the initialization `useEffect`.
2. The data synchronization `useEffect` runs, populates the chart with full historical data, and updates our `previousDataLengthRef` (e.g., to 500).
3. As a stress test, React Strict Mode instantly unmounts the component and destroys the chart instance via our cleanup function.
4. React instantly remounts the component and creates a brand new chart.
5. **The Bug:** `useRef` values persist through this Strict Mode remount cycle. When the data synchronization effect fires on the new chart, it sees that `previousDataLengthRef` is still 500. Instead of providing the full data history to the new empty chart, it erroneously assumes this is an incremental update and only provides the single newest candle. The chart remains functionally empty.

### Files to Modify

```
client/src/
└── components/
    └── CandlestickChart.tsx ← [MODIFY] Reset the tracking ref upon chart creation
```

---

## Implementation Checklist

### 1. Fix React Lifecycle Persistence
- [x] Update `client/src/components/CandlestickChart.tsx`:
  - [x] Locate the chart initialization `useEffect` hook (the one with an empty dependency array `[]`).
  - [x] Add `previousDataLengthRef.current = 0;` inside this hook (immediately after the `seriesRef.current = series;` assignment).
  - [x] This ensures that whenever a new chart instance is spawned, the synchronization logic is forced to perform a full `setData()` operation instead of an incremental `update()`.

### 2. Verification
- [x] Save the file. Vite will hot-reload.
- [x] Open the browser at `http://localhost:5173`.
- [x] Verify the full historical candlestick chart renders immediately.
- [x] Verify you can zoom and pan normally.
