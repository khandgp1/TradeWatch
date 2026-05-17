# Bug Fix: Chart Overlays

> **Scope:** Fix the three critical rendering bugs preventing Signal Panel toggles from rendering overlays on the Lightweight Chart.

---

## Context & Root Causes

During Phase 6 testing, we discovered that toggling signals in the Signal Panel did not render the expected overlays on the chart. Investigation revealed three distinct issues:

1. **Fatal Canvas Error (`TrendShadingPrimitive.ts`)**: The custom primitive attempted to access the chart's time scale using an invalid method chain (`this._series.priceScale().chart()`), which does not exist in Lightweight Charts v4. This threw a `TypeError` during the rendering phase, corrupting the canvas context and breaking *all* overlays (including native markers and price lines) on that pane.
2. **Invalid Date Parsing (`CandlestickChart.tsx`)**: The signal start and end times (`YYYY-MM-DD HH:MM`) were parsed by appending `:00Z` but retaining the space separator. Strict JS environments (like Safari on macOS) require the ISO 8601 `T` separator, causing `new Date()` to return `Invalid Date`. This resulted in `NaN` being passed to `series.setMarkers()`, which throws a fatal LWC assertion error.
3. **Stale References via React Dependencies (`CandlestickChart.tsx`)**: The chart initialization `useEffect` incorrectly had `[data]` in its dependency array. When the initial data loaded, the entire chart instance was destroyed and rebuilt. However, our `priceLinesRef.current` Map was never cleared, leaving stale references to `IPriceLine` objects from the destroyed chart instance.

### Files to Modify

```
client/src/
├── components/
│   ├── chart-plugins/
│   │   └── TrendShadingPrimitive.ts ← [MODIFY] Store `chart` reference in `attached()`
│   └── CandlestickChart.tsx         ← [MODIFY] Fix date parsing and `useEffect` dependency split
```

---

## Implementation Checklist

### 1. Fix Trend Shading Primitive
- [x] Update `client/src/components/chart-plugins/TrendShadingPrimitive.ts`:
  - [x] Add a private `_chart: any = null;` property.
  - [x] In `attached()`, store `param.chart` as `this._chart`.
  - [x] Pass `this._chart` to the `TrendShadingPaneView` and down to `TrendShadingRenderer`.
  - [x] In `draw()`, retrieve the time scale correctly using `this._chart.timeScale()` instead of the invalid method chain.

### 2. Fix Date Parsing
- [x] Update `client/src/components/CandlestickChart.tsx` inside the overlays `useEffect`:
  - [x] Replace `new Date(sig.start_time + ':00Z')` with `new Date(sig.start_time.replace(' ', 'T') + ':00Z')`.
  - [x] Apply the same `.replace(' ', 'T')` fix for `sig.end_time` parsing.

### 3. Fix Chart React Lifecycle (Idiomatic LWC)
- [x] Update `client/src/components/CandlestickChart.tsx` chart initialization:
  - [x] Remove `data` from the dependency array of the chart initialization `useEffect` (make it `[]`).
  - [x] Create a new, separate `useEffect` that listens solely to `[data]`.
  - [x] In this new `useEffect`, if `seriesRef.current` exists and `data.length > 0`, call `seriesRef.current.setData(data)` and `chartRef.current?.timeScale().fitContent()`.
  
### 4. Verification
- [x] Ensure frontend and backend are running.
- [x] Navigate to `http://localhost:5173`.
- [x] Toggle a signal from the Signal Panel.
- [x] Verify the corresponding Marker, Price Line, and Shading Primitive successfully render on the chart.
