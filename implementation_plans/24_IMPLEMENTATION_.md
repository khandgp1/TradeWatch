# Implementation Plan - Convert Telegram Alerts to EDT Timezone

This plan details the steps to convert the timestamp in the Telegram alert messages from UTC to EDT (Eastern Daylight Time, `America/New_York` timezone).

## Objectives
- Parse the UTC timestamp of the signal correctly in the backend.
- Format the parsed timestamp in the `America/New_York` timezone using standard `Intl.DateTimeFormat`.
- Update the Telegram broadcast template to display the date-time as `YYYY-MM-DD HH:MM (EDT)` instead of UTC.
- Verify the timezone adjustment using the sandbox test script.

## Proposed Changes

### 1. Telegram Service (`server/src/services/telegram.ts`)
- Parse `signal.start_time` cleanly into a JavaScript Date object, ensuring it is parsed as a UTC date-time (by replacing spaces with `T` and appending `Z`).
- Add an `Intl.DateTimeFormat` formatter configured with the `America/New_York` timezone.
- Format the time into the exact `YYYY-MM-DD HH:MM` structure.
- Update the Markdown message template to display:
  `⏰ *Time:* {formattedEDT} (EDT)`

---

## Checklist

- [ ] Modify `server/src/services/telegram.ts` to parse the UTC signal time and convert it to `America/New_York` (EDT).
- [ ] Update the Telegram message template in `server/src/services/telegram.ts` to label the time as `(EDT)`.
