## 1. RegisterFactor.tsx — Input format and labels

- [x] 1.1 Change `minRateBps`/`maxRateBps` derivation from raw state to `Math.round(Number(minRate) * 100)`
- [x] 1.2 Update validation: `minRateBps >= 5000` → `Number(minRate) >= 50`, `maxRateBps <= 9900` → `Number(maxRate) <= 99`
- [x] 1.3 Change `<Input>` attributes: `min="5000"` → `min="50"`, `max="9900"` → `max="99"`, add `step="1"`
- [x] 1.4 Change Min label from "Min Advance Rate (basis points)" → "Min Advance Rate (%)"
- [x] 1.5 Change Max label from "Max Advance Rate (basis points)" → "Max Advance Rate (%)"
- [x] 1.6 Change Min placeholder from "e.g. 7000 for 70%" → "e.g. 70"
- [x] 1.7 Change Max placeholder from "e.g. 9500 for 95%" → "e.g. 95"
- [x] 1.8 Update validation error text to reference "50–99%" instead of "5000–9900 basis points"

## 2. RegisterFactor.tsx — Display precision

- [x] 2.1 Change already-registered alert: `.toFixed(0)` → `.toFixed(2)` for both min and max rates
- [x] 2.2 Change inline preview text: update to read directly from percentage state (e.g. `Number(minRate).toFixed(2)%`) instead of dividing bps

## 3. Marketplace.tsx — Individual-factor dialog input

- [x] 3.1 Change `advanceRateBps` derivation: `parseInt(advanceRateInput, 10)` → `Math.round(Number(advanceRateInput) * 100)`
- [x] 3.2 Update `advanceRateValid` bounds check to compare percentage: `Number(advanceRateInput) >= factorMinRate/100 && Number(advanceRateInput) <= factorMaxRate/100`
- [x] 3.3 Change `<Input>` `min`/`max` to percentage values: `min={factorMinRate/100}` `max={factorMaxRate/100}` `step="1"`
- [x] 3.4 Change label from `"Advance Rate (bps, {min}–{max})"` → `"Advance Rate (%, {min/100}–{max/100})"`
- [x] 3.5 Change placeholder from `e.g. ${max_advance_rate}` → `e.g. ${max_advance_rate / 100}`
- [x] 3.6 Update validation hint from "Must be between X and Y bps" → "Must be between X% and Y%"
- [x] 3.7 Update inline confirmation from `(advanceRateBps / 100).toFixed(2)% advance` → `Number(advanceRateInput).toFixed(2)% advance`

## 4. Marketplace.tsx — Pool submission display precision

- [x] 4.1 Change pool range hint displays: raw `/100` → `(/ 100).toFixed(2)` for min and max rates in the submit-to-pool dialog

## 5. Pools.tsx — Pool card display precision

- [x] 5.1 Change pool card rate range display: raw `/100` → `(/ 100).toFixed(2)` for both min and max rates
