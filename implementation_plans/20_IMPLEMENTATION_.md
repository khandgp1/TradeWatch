# Implementation Plan: Add Timezone Toggle to Footer

## Objective
Add a clickable toggle to the bottom footer that switches the chart's displayed timezone between UTC and Local Time (EDT). The toggle should be strategically placed next to the existing "Next Hourly Fetch" countdown (Relative Placement) to intuitively group all time-related metrics together.

## Requirements
- **Aesthetic:** The toggle must look like a native status bar element with minimal and clean styling, avoiding heavy button appearances.
- **Content:** It should display a subtle icon (e.g., globe 🌍) followed by the active timezone text (e.g., "UTC" or "EDT") and a visual cue like a chevron (`⌃`) to indicate clickability.
- **Interaction:** 
  - Provide a hover state (brightening the text or adding a subtle background highlight) to reinforce interactivity.
  - Clicking it must seamlessly toggle the state between UTC and EDT, smoothly updating the chart's x-axis time labels.
- **Data Integrity:** This is strictly a presentation-layer feature. It must only affect the formatting of the time axis, not the underlying timestamp data used for signals or candlestick rendering.

## Implementation Steps
- [x] **Step 1: State Management**
  - Create a new state variable in `App.tsx` for tracking the active timezone.
  - Example: `const [timezone, setTimezone] = useState<'UTC' | 'EDT'>('UTC');`

- [x] **Step 2: Footer UI Updates (`App.tsx`)**
  - Locate the `div` containing the `countdown` text in the footer.
  - Append a new clickable `span` or `div` right beside the countdown element.
  - Add inline styles for the hover effect and cursor pointer.
  - Bind an `onClick` handler to toggle the `timezone` state.
  - Render the current timezone text and icon.

- [x] **Step 3: Prop Drilling / Context**
  - Pass the `timezone` state down to the `CandlestickChart` component as a new prop.

- [x] **Step 4: Chart Formatting (`CandlestickChart.tsx`)**
  - Locate the Lightweight Charts configuration.
  - Update the `timeScale` options to use custom `tickMarkFormatter` and `timeFormatter` based on the `timezone` prop.
  - Implement the logic to apply the EDT offset (UTC-4) when 'EDT' is selected, ensuring both the x-axis labels and crosshair tooltips correctly reflect the localized time.

## Considerations
- **Lightweight Charts Re-rendering:** Changing the `timeScale` formatters typically requires calling `chart.timeScale().applyOptions(...)` dynamically, rather than destroying and recreating the whole chart.
- **Performance:** Ensure the toggle action is swift and does not trigger an expensive re-render of the entire chart data or the signal panel.
