# Phase 6 — Frontend: Signal Panel + Overlays

> **Scope:** Build the `SignalPanel` to list all detected trends and control their visibility. Update the `CandlestickChart` to natively render indicator price lines, start-point markers, and a custom `ISeriesPrimitive` for trend shading rectangles, color-coded by rule type.

> **Reference:** [KICKSTART_IMPLEMENTATION_PLAN.md](../KICKSTART_IMPLEMENTATION_PLAN.md) — Frontend Design

---

## Context

Phase 5 successfully established the chart and data flow. Now we must visualize the algorithmic output (the signals). 
A `SignalPanel` will act as the control center, allowing the user to filter signals and toggle their visibility on the chart. The chart will react to these toggles by drawing or removing Lightweight Charts overlays.

### Key Design Decisions

| Decision | Choice |
|---|---|
| State Management | State for `visibleSignalIds` (a `Set<number>`) will live in `App.tsx` and be passed down to both the `SignalPanel` (to render checkboxes) and `CandlestickChart` (to render overlays). |
| Signal Markers | We will use `series.setMarkers()` to place arrow markers directly above/below the signal's starting candle. |
| Price Lines | We will use `series.createPriceLine()` for the horizontal indicator levels. We must track the returned `IPriceLine` instances so we can selectively `series.removePriceLine()` when a signal is toggled off. |
| Trend Shading | Lightweight Charts v4 does not have built-in shaded background ranges. We will create a custom `TrendShadingPrimitive` implementing `ISeriesPrimitive` to draw semi-transparent rectangles directly onto the canvas pane based on the start and end times of visible signals. |

### Color Palette Mapping
Based on CSS variables established in Phase 5:
- Rule 1 (Three Green Candles): `var(--color-rule1)` / `hsl(210, 70%, 60%)`
- Rule 2 (Close Above Prev High): `var(--color-rule2)` / `hsl(35, 80%, 55%)`
- Rule 3 (Close Above Post-Signal Peak): `var(--color-rule3)` / `hsl(280, 60%, 60%)`

### Files to Create/Modify

```
client/src/
├── components/
│   ├── chart-plugins/
│   │   └── TrendShadingPrimitive.ts ← [NEW] Custom LWC v4 primitive for shading
│   ├── CandlestickChart.tsx         ← [MODIFY] Add markers, price lines, and primitives
│   └── SignalPanel.tsx              ← [NEW] UI for listing and toggling signals
└── App.tsx                          ← [MODIFY] Add layout grid, state, and render SignalPanel
```

---

## Implementation Checklist

### 1. Trend Shading Primitive
- [x] Create `client/src/components/chart-plugins/TrendShadingPrimitive.ts`:
  - [x] Implement `ISeriesPrimitivePaneRenderer` to draw `ctx.fillRect` with semi-transparent colors.
  - [x] Implement `ISeriesPrimitivePaneView` to calculate X coordinates using `series.timeScale().timeToCoordinate(time)`.
  - [x] Implement `ISeriesPrimitive` to manage the state of active shadings and call `requestUpdate()` when changed.

### 2. Signal Panel Component
- [x] Create `client/src/components/SignalPanel.tsx`:
  - [x] Accept props: `signals`, `visibleSignalIds`, `onToggleVisibility(id)`, `onToggleAll(boolean)`.
  - [x] Implement local state for filtering (`'All' | 'Ongoing' | 'Broken'`).
  - [x] Render a scrollable list of signal cards.
  - [x] Each card displays: Rule Name (colored), Indicator Price, Status Badge, Start/End times, and a checkbox.
  - [x] Add a header with filter buttons and a "Toggle All" checkbox.

### 3. Chart Overlays Integration
- [x] Update `client/src/components/CandlestickChart.tsx`:
  - [x] Accept new props: `signals: Signal[]` and `visibleSignalIds: Set<number>`.
  - [x] Initialize and attach the `TrendShadingPrimitive` to the candlestick series once on mount.
  - [x] Add a `useEffect` that listens to `signals` and `visibleSignalIds` changes:
    - [x] Calculate and apply `series.setMarkers()` for all visible signals (using `arrowUp` or `arrowDown` based on rule).
    - [x] Diff the visible signals against a `Map<number, IPriceLine>` to dynamically `createPriceLine()` or `removePriceLine()` for indicator levels.
    - [x] Update the data array inside `TrendShadingPrimitive` and trigger a redraw.

### 4. App State & Layout Integration
- [x] Update `client/src/App.tsx`:
  - [x] Add `visibleSignalIds` state (`useState<Set<number>>(new Set())`).
  - [x] Create `toggleSignal` and `toggleAllSignals` handler functions.
  - [x] Modify the main layout: Use CSS Grid or Flexbox to place `CandlestickChart` on the left (e.g., `flex: 1`) and `SignalPanel` on the right (e.g., `width: 350px`).
  - [x] Pass the appropriate props to both components.

### 5. Verification
- [x] Open the frontend at `http://localhost:5173`.
- [x] Verify the `SignalPanel` renders the list of detected signals with correct rule colors.
- [x] Check a signal's box and verify:
  - [x] A dashed horizontal price line appears at the indicator level.
  - [x] A marker appears on the start candle.
  - [x] A semi-transparent shaded rectangle covers the trend window from start to end.
- [x] Uncheck the box and verify all overlays disappear seamlessly.

---

## Acceptance Criteria

1. Users can toggle individual or all signals via the `SignalPanel`.
2. The `SignalPanel` correctly filters by `Ongoing` or `Broken` status.
3. Chart overlays (price lines, markers, custom shaded primitives) map flawlessly to the signal data and synchronize with the toggle state.
4. The custom `TrendShadingPrimitive` strictly follows the LWC v4 `ISeriesPrimitive` specification without breaking chart performance or panning interactions.
