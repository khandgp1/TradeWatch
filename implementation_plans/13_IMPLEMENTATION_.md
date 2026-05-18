# Implementation Plan: "Next" Signal Traversal Feature

## Objective
Replace the "Toggle All Overlays" functionality with a "Next" traversal button that allows the user to step through detected signals forward in time (from oldest to latest) in the UI side panel.

## Checklist
- [x] **State Management**:
  - [x] Add a `focusedSignalId` state (`number | null`) to track the actively focused signal, or pass a callback down to manage it.
  - [x] Ensure `focusedSignalId` resets to `null` when the filter tab changes.
- [x] **Next Button Logic**:
  - [x] Replace the "Toggle All Overlays" checkbox and label with a "Next" button in `SignalPanel.tsx`.
  - [x] Implement the `handleNext` logic:
    - [x] If no signal is focused, focus the oldest signal in the currently filtered list (last item in the array).
    - [x] If a signal is focused, move focus to the next signal forward in time (index - 1).
    - [x] Automatically toggle *off* the previous focus from `visibleSignalIds` and toggle *on* the new focus.
  - [x] Disable the "Next" button if the currently focused signal is the most recent one (index 0).
- [x] **Signal Card Interactions**:
  - [x] Update the signal card's `onClick` to set it as the new `focusedSignalId` in addition to toggling visibility.
  - [x] Add a subtle visual cue (e.g., a soft background highlight) to the card if its ID matches `focusedSignalId`.
- [x] **Verification**:
  - [x] Test that "Next" traverses from bottom to top.
  - [x] Test that "Next" is disabled at the top.
  - [x] Test that changing the filter tab resets focus.
  - [x] Test that manually clicking a card sets it as the focused starting point.
