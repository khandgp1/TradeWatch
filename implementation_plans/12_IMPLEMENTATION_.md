# Implementation Plan: Reorder Detected Signals in UI

## Objective
Reorder the trends in the UI side panel (Detected Signals) from latest to oldest by start time.

## Checklist
- [x] Locate the React component or logic that renders the Detected Signals side panel (`client/src/components/SignalPanel.tsx`).
- [ ] Implement a sorting mechanism to order the `filteredSignals` array by `start_time` in descending order (latest to oldest).
- [ ] Verify the UI reflects the sorted list of signals.
