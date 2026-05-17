# Phase 5 — Frontend: Chart + Data Loading

> **Scope:** Build the initial frontend React application that loads historical candle and signal data from our REST API and renders a beautiful, interactive candlestick chart using TradingView Lightweight Charts.

> **Reference:** [KICKSTART_IMPLEMENTATION_PLAN.md](../KICKSTART_IMPLEMENTATION_PLAN.md) — Frontend Design

---

## Context

We have a working backend serving historical BTC hourly candles and detected signal data via REST. In this phase, we establish the frontend data layer (React hooks) and the core visualization component (`CandlestickChart`). 

### Key Design Decisions

| Decision | Choice |
|---|---|
| Chart Library | `lightweight-charts` — incredibly performant for time-series data with built-in pan/zoom on both axes. |
| Time Format | Lightweight Charts requires intraday time values to be provided as **Unix timestamps in SECONDS**. Our API returns `YYYY-MM-DD HH:MM` UTC strings. The frontend will parse these strings into UTC Unix timestamps (seconds) before feeding them to the chart. |
| Dark Theme | Native dark theme will be applied to the chart configuration to match a modern trading UI aesthetic. |
| Responsiveness | We will use a `ResizeObserver` in the chart component to dynamically resize the chart canvas when the window or container size changes. |

### Files to Create/Modify

```
client/src/
├── hooks/
│   ├── useCandles.ts          ← [NEW] Fetch /api/candles and format for chart
│   └── useSignals.ts          ← [NEW] Fetch /api/signals
├── components/
│   └── CandlestickChart.tsx   ← [NEW] React wrapper for lightweight-charts
├── App.tsx                    ← [MODIFY] Assemble layout, fetch data, render chart
└── index.css                  ← [MODIFY] Base dark theme styling
```

---

## Implementation Checklist

### 1. Data Fetching Hooks
- [x] Create `client/src/hooks/useCandles.ts`:
  - [x] Fetch from `/api/candles` using `fetch`.
  - [x] Transform the `open_time` (e.g. `2026-05-13 09:00`) into a Unix timestamp (seconds) for `lightweight-charts`.
  - [x] Return an object: `{ candles, loading, error }`.
- [x] Create `client/src/hooks/useSignals.ts`:
  - [x] Fetch from `/api/signals`.
  - [x] Return `{ signals, loading, error }`.

### 2. Base Styling
- [x] Update `client/src/index.css`:
  - [x] Set a dark background (e.g., `#131722`) and light text (e.g., `#d1d4dc`) for the `body`.
  - [x] Ensure `#root` fills the viewport (`height: 100vh; display: flex; flex-direction: column`).

### 3. Chart Component
- [x] Create `client/src/components/CandlestickChart.tsx`:
  - [x] Accept `data` (formatted candle data) as a prop.
  - [x] Use `useRef` to mount the chart instance.
  - [x] Configure `createChart` with dark theme options (background, grid colors, crosshair styling).
  - [x] Add candlestick series with standard green/red colors (`#26a69a`, `#ef5350`).
  - [x] Set `series.setData(data)`.
  - [x] Add a `ResizeObserver` to auto-resize the chart when the container bounds change.
  - [x] Clean up the chart instance and observer on unmount.

### 4. App Layout Assembly
- [x] Update `client/src/App.tsx`:
  - [x] Create a basic flex layout (Header, Main Content area for the chart, Footer).
  - [x] Use `useCandles()` and `useSignals()` hooks.
  - [x] Handle `loading` and `error` states gracefully.
  - [x] Render `<CandlestickChart data={candles} />` in the main content area, filling the available space.

### 5. Verification
- [ ] Run `npm run dev` in both `server` and `client`.
- [ ] Open the browser to `http://localhost:5173`.
- [ ] Verify the chart renders.
- [ ] Verify mouse-wheel zoom and click-drag pan work.
- [ ] Verify the candle colors match standard green/red and the layout is dark themed.

---

## Acceptance Criteria

1. Data fetches successfully via Vite's `/api` proxy.
2. CandlestickChart renders seamlessly and fills its container without overflow.
3. Chart time scale correctly maps to the exact UTC hour represented by the candles.
4. Resizing the browser window cleanly resizes the canvas.
5. Pan and Zoom interactions function optimally.
