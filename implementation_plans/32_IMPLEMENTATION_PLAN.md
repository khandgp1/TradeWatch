# Implementation Plan: Update "Next Hourly Fetch" Countdown Delay

## Objective
Update the `Next Hourly Fetch in` UI timer in the React client to accurately reflect the 5-second delay present in the backend cron job. The timer currently counts down exactly to the top of the hour (`H:00:00`), but the server processes candle fetching at 5 seconds past the hour (`H:00:05`).

## Proposed Changes
1. **Update Timer Logic in `client/src/App.tsx`**:
   - The current `updateCountdown` calculates `nextHour` strictly using `nextHour.setHours(now.getHours() + 1, 0, 0, 0)`.
   - Modify the logic to target the 5th second of the hour.
   - Introduce a check to ensure that if the current time is between `H:00:00` and `H:00:05`, the timer targets the current hour's fetch (e.g., if it's `16:00:02`, the target is `16:00:05`, not `17:00:05`). Once the 5th second passes, it correctly targets `H+1:00:05`.

**Updated Logic Snippet for Reference:**
```javascript
const now = new Date();
const nextFetch = new Date(now);
nextFetch.setHours(now.getHours(), 0, 5, 0);

if (now.getTime() >= nextFetch.getTime()) {
  nextFetch.setHours(now.getHours() + 1, 0, 5, 0);
}

const diffMs = nextFetch.getTime() - now.getTime();
```

## Progress Checklist
- [x] Open `client/src/App.tsx`.
- [x] Locate the `updateCountdown` function inside the `useEffect` block.
- [x] Replace the top-of-the-hour calculation with the updated logic that factors in the 5-second delay.
- [x] Verify the countdown calculation correctly updates and displays without errors in the UI.
