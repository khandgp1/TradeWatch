# Implementation Plan - Timezone Toggle Sync for Signal Panel

The TradeWatch client UI has a toggle to switch the timezone display on the Candlestick Chart between UTC and EDT. However, the Signal Panel on the right side continues to display signal timestamps (Start/End times) in UTC only.

This plan details the steps required to synchronize the timezone toggle with the Signal Panel so that signal times reflect the selected timezone visually, while remaining unchanged in the backend.

## User Review Required
No major architectural decisions are required. The changes are local to the client UI.

## Proposed Changes

### Client (React)

#### 1. `client/src/App.tsx`
- Pass the `timezone` state (`'UTC' | 'EDT'`) to the `<SignalPanel>` component.

```tsx
<SignalPanel 
  signals={signals}
  visibleSignalIds={visibleSignalIds}
  onToggleVisibility={toggleSignal}
  onSelectFocus={selectFocusSignal}
  timezone={timezone} // New prop
/>
```

#### 2. `client/src/components/SignalPanel.tsx`
- Update `SignalPanelProps` interface to include `timezone: 'UTC' | 'EDT'`.
- Implement a helper function `formatSignalTime(timeStr: string, timezone: 'UTC' | 'EDT'): string` inside `SignalPanel.tsx` (similar to `formatTime` in `CandlestickChart.tsx`):
  - Parse the UTC timestamp string (which is formatted as `YYYY-MM-DD HH:mm` in the database).
  - Use `Intl.DateTimeFormat` with the appropriate timezone (`UTC` or `America/New_York`).
  - Format it back into `YYYY-MM-DD HH:mm` or a similar readable format.
- Update the rendered Start and End timestamps in the signal list items using `formatSignalTime`.

## Verification Plan

### Automated Tests
- No automated tests exist for local time rendering, but we can verify formatting logic in isolation.

### Manual Verification
1. Run the application (`npm run dev -w client` / `npm run dev -w server`).
2. Open the browser and locate the timezone toggle in the footer (bottom right).
3. Toggle the timezone from **UTC** to **EDT**.
4. Observe the Signal Panel on the right:
   - The **Start** and **End** timestamps for all signals should shift by 4 hours (e.g., UTC `12:00` becomes EDT `08:00`).
   - The timezone change should only affect the UI representation and not trigger any backend API requests.
5. Toggle back from **EDT** to **UTC** and confirm the timestamps return to UTC.

## Progress Checklist

- [x] Update `client/src/App.tsx` to pass the `timezone` prop to `SignalPanel`.
- [x] Update `client/src/components/SignalPanel.tsx` prop types.
- [x] Add date parsing & timezone formatting utility in `SignalPanel.tsx`.
- [x] Apply timezone formatting to Start and End times in the signal card renderer.
- [ ] Manually verify that toggling between UTC and EDT updates both the chart and the Signal Panel correctly.
