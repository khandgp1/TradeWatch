# Implementation Plan: Clear Focus on Focused Signal Deselection

## Objective
Update the `SignalPanel` component so that the focus goes away upon deselecting the signal that has the focus.

## Checklist
- [x] **Locate Click Handler**: Open `client/src/components/SignalPanel.tsx` and find the `onClick` handler for the signal cards.
- [x] **Update Logic**: Update the click handler so that if the user clicks the signal card that is currently focused, it deselects the signal and clears the focus.
- [x] **Verification**:
  - [x] Click a hidden signal: It becomes visible and gains focus.
  - [x] Click the focused, visible signal: It becomes hidden and loses focus.
