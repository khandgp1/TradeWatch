# Reduce Indicator Line and Arrow Opacity to 25%

## Objective
Update the `CandlestickChart.tsx` so that the indicator price line and the marker arrow display with a 25% opacity to make them less visually intrusive on the chart.

## Files to Modify
- `client/src/components/CandlestickChart.tsx`

## Steps
1. Locate the `getRuleColor` helper function inside the `useEffect` hook in `CandlestickChart.tsx`.
2. Modify the returned colors to use a 25% opacity (alpha channel). For example, by converting the hex colors to `rgba(R, G, B, 0.25)` format.
    - `#64b5f6` -> `rgba(100, 181, 246, 0.25)`
    - `#ffb74d` -> `rgba(255, 183, 77, 0.25)`
    - `#ba68c8` -> `rgba(186, 104, 200, 0.25)`
    - `#ffffff` -> `rgba(255, 255, 255, 0.25)`
3. Ensure the `getShadingColor` helper remains untouched as it already handles its own opacity logic.

## Checklist
- [x] Update `getRuleColor` in `client/src/components/CandlestickChart.tsx`.
- [x] Verify the arrow marker and price line render correctly at 25% opacity without affecting other elements.
