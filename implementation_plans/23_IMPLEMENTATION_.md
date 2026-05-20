# Implementation Plan - Telegram Alert Service Integration

This plan details the steps to implement the Telegram alert broadcasting system into the TradeWatch application. The broadcast logic will trigger asynchronously when a new signal is generated, and its execution will be gated by a developer configuration toggle.

## Objectives
- Integrate `dotenv` to securely load the Telegram credentials from the `.env` file into the server application.
- Add a manual toggle `enableTelegramAlerts` to `server/src/config.ts` so developers can turn the service on/off easily.
- Create a dedicated `telegram.ts` service that formats the signal data into a Markdown string and sends a POST request to the Telegram API.
- Wire the new service to listen for the existing `new-signal` event broadcasted by the `signalEngine.ts`, executing as a non-blocking (fire-and-forget) background task.

## Proposed Changes

### 1. Dependencies
- Run `npm install dotenv` within the `server` workspace.

### 2. Configuration (`server/src/config.ts`)
- Add a new boolean property: `enableTelegramAlerts: false`.

### 3. Telegram Service (`server/src/services/telegram.ts`)
- Create this new file.
- Implement `broadcastSignal(signal: any)` function.
- Add an early return if `config.enableTelegramAlerts` is `false`.
- Use `dotenv` to parse `server/.env` and extract the token and Chat ID.
- Map the signal properties (asset, time, price, rule) to a formatted Markdown string:
  ```
  🟢 *TradeWatch LONG Alert* 🟢

  📈 *Asset:* BTCUSDT
  ⏰ *Time:* {signal.start_time} (UTC)
  💰 *Price:* ${signal.indicator}
  📋 *Rule:* {signal.rule}
  ```
- Send the HTTP POST request to Telegram using native `fetch`.

### 4. Event Hookup (`server/src/index.ts` or similar entrypoint)
- Import `appEvents` and the `telegram` service.
- Add an event listener: `appEvents.on('new-signal', ({ signal }) => { broadcastSignal(signal); });`
- Ensure this call does not use `await` to maintain a non-blocking fire-and-forget flow.

---

## Checklist

- [x] Use Node's native `process.loadEnvFile()` for loading env variables (no dependencies required).
- [x] Add `enableTelegramAlerts: false` to `server/src/config.ts`.
- [x] Create `server/src/services/telegram.ts` and implement `broadcastSignal`.
- [x] Wire `appEvents.on('new-signal')` to the broadcast function in the server entrypoint.
- [x] Verify the system builds successfully without errors.
- [ ] Turn on the `enableTelegramAlerts` flag to `true` and test the alert delivery via a backfill or dummy signal.
