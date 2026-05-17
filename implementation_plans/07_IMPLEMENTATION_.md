# Phase 7 — Real-Time Integration + Polish

> **Scope:** Introduce WebSockets (`socket.io-client`) to securely stream live market data into the frontend. The `CandlestickChart`, `SignalPanel`, and application state must fluidly respond to new candles and signals in real-time without losing user context (e.g., pan/zoom position).

> **Reference:** [KICKSTART_IMPLEMENTATION_PLAN.md](../KICKSTART_IMPLEMENTATION_PLAN.md) — Real-Time Data Flow

---

## Context & Key Design Decisions

The application currently fetches data once via REST on load. In Phase 4, we configured the Node.js backend to emit `new-candle`, `new-signal`, and `signal-updated` events. 

To achieve a true "live" terminal feel:
1. **Socket Hook:** A custom `useSocket.ts` hook will establish and maintain the WebSocket connection.
2. **State Appending:** `useCandles` and `useSignals` must expose their state setters (`setCandles`, `setSignals`). `App.tsx` will listen to socket events and append/update the React state incrementally.
3. **Chart `update()` API**: `CandlestickChart.tsx` must be refactored so that the initial data array triggers `series.setData()` (replacing everything), but any subsequent additions trigger `series.update()`. This is absolutely critical to avoid resetting the user's pan/zoom position when a new candle ticks in.
4. **Auto-Overlay:** When a `new-signal` event arrives, the system should automatically add its ID to `visibleSignalIds` so the overlay appears instantly on the chart.
5. **Safari Date Fix:** Ensure `useCandles.ts` incorporates the `.replace(' ', 'T')` fix for strict ISO 8601 parsing so live timestamps don't crash the UI.

### Files to Modify

```
client/src/
├── hooks/
│   ├── useSocket.ts                 ← [NEW] Hook for Socket.IO connection
│   ├── useCandles.ts                ← [MODIFY] Expose `setCandles`, fix date parsing
│   └── useSignals.ts                ← [MODIFY] Expose `setSignals`
├── components/
│   └── CandlestickChart.tsx         ← [MODIFY] Use `series.update()` for incremental data
└── App.tsx                          ← [MODIFY] Wire socket events, add StatusBar countdown
```

---

## Implementation Checklist

### 1. State Hook Refactoring
- [x] Update `client/src/hooks/useCandles.ts`:
  - [x] Add `.replace(' ', 'T')` to the date parsing to prevent Safari `NaN` errors.
  - [x] Expose `setCandles` in the return object.
- [x] Update `client/src/hooks/useSignals.ts`:
  - [x] Expose `setSignals` in the return object.

### 2. Socket Connection Hook
- [x] Create `client/src/hooks/useSocket.ts`:
  - [x] Initialize `socket.io-client` with `{ path: '/socket.io' }`.
  - [x] Track connection status (`isConnected` state).
  - [x] Return `{ socket, isConnected }` and handle cleanup on unmount.

### 3. Real-Time Chart Synchronization
- [x] Update `client/src/components/CandlestickChart.tsx`:
  - [x] Modify the data `useEffect`: Use a `useRef` to track `previousDataLength`.
  - [x] If `previousDataLength === 0`, call `series.setData()` and `fitContent()` (initial load).
  - [x] If `previousDataLength > 0`, call `series.update(data[data.length - 1])` to smoothly insert the new candle without resetting zoom.
  - [x] Update `previousDataLength` accordingly.

### 4. Event Wiring & UI Polish (`App.tsx`)
- [x] Integrate `useSocket()` into `App.tsx`.
- [x] Add a `useEffect` to listen to socket events:
  - [x] `new-candle`: Format the timestamp to Unix seconds and intelligently update the `candles` state (replace if same hour, append if new hour).
  - [x] `new-signal`: Append to `signals` array and auto-add to `visibleSignalIds`.
  - [x] `signal-updated`: Map over `signals` array to update the matched signal (e.g., status changes to "Broken").
- [x] Update the Header to use the `isConnected` state for the "System Online" indicator.
- [x] Implement the Status Bar in the Footer:
  - [x] Display connection status visually.
  - [x] Add a visual countdown to the next hour (e.g., "Next update in 45m 12s") using a `setInterval` timer.

### 5. Verification
- [x] Start backend and frontend. Check that the UI connects (`System Online`).
- [x] Open a secondary terminal, trigger a manual DB insert or emit a test socket event.
- [x] Confirm the chart updates seamlessly (without losing zoom).
- [x] Confirm the new signal appears in the panel and is automatically toggled on.
- [x] Confirm the footer countdown ticks down to the next hour accurately.
