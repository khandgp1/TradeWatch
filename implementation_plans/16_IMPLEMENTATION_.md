# Implementation Plan: Fix WebSocket Payload Mismatches

## Overview
This plan addresses the UI crash ("black screen and reset") caused by a mismatch between the data structure emitted by the backend via WebSockets and the expected data structure in the frontend's socket listeners.

## Problem Description
The backend emits WebSocket events using the payload types defined in `shared/types.ts` (`NewCandleEvent`, `NewSignalEvent`, `SignalUpdatedEvent`), which wrap the data (e.g., `{ candle: ... }`, `{ signal: ... }`, `{ id, status, end_time }`).
However, `client/src/App.tsx` expects flat objects (`Candle`, `Signal`). This leads to `undefined` values being processed or stored in state, causing `TypeError`s during rendering in components like `SignalPanel` and crashing the React application tree.

## Checklist

### 1. Update Frontend Socket Handlers (`client/src/App.tsx`)
- [x] Import the correct event types from `@tradewatch/shared`: `NewCandleEvent`, `NewSignalEvent`, `SignalUpdatedEvent`.
- [x] Refactor `handleNewCandle` to accept `event: NewCandleEvent` and extract `event.candle` before processing.
- [x] Refactor `handleNewSignal` to accept `event: NewSignalEvent` and extract `event.signal` before adding it to state.
- [x] Refactor `handleSignalUpdated` to accept `event: SignalUpdatedEvent` and properly merge the partial update (`status`, `end_time`) into the existing signal object in state using the spread operator (`{ ...s, status: event.status, end_time: event.end_time }`), rather than completely overwriting the existing signal.

### 2. Verification
- [x] Ensure the TypeScript compiler does not report any type errors in `App.tsx` after the changes.
- [x] Ensure the application continues to build correctly.
