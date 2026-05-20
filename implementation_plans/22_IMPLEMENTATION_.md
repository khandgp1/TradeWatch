# Implementation Plan - Telegram Alert Sandbox Script

This plan details the steps to set up and run a sandbox script that reads Telegram credentials from the `server/.env` file and sends a test message to the user.

## Objectives
- Create a test script in the `sandbox/` directory.
- Read and parse `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from the `server/.env` file without external dependency overhead.
- Send a test message to the Telegram bot using the native `fetch` API.
- Execute the script using `tsx` to verify end-to-end delivery of the notification.

## Proposed Changes

### 1. New File: `sandbox/test-telegram.ts`
- Read the content of `server/.env` using standard `fs` (Node.js file system API).
- Parse the environment variables manually (splitting by line and finding key-value pairs).
- Construct a POST request to `https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/sendMessage`.
- Send a JSON payload with `chat_id` and `text`.
- Log the success or error of the API call.

## Checklist

- [x] Parse `server/.env` to read `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`.
- [x] Create `sandbox/test-telegram.ts` with HTTP POST logic using native `fetch`.
- [ ] Verify execution by running the script via `npx tsx sandbox/test-telegram.ts`.
- [ ] Confirm receipt of the Telegram message on the user's client.
