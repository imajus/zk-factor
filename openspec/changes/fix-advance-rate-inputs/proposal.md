## Why

Advance rate inputs use two different units across the UI — basis points on some forms and percentages on others — with no visual cue to distinguish them. A user entering `70` expecting 70% silently submits `0.70%` on basis-point forms, and a factor whose card shows `70.00%` must re-enter `7000` in the adjacent dialog. The inconsistency directly undermines usability and correctness of on-chain submissions.

## What Changes

- Change Factor Registration form inputs from basis points (5000–9900) to percentage (50–99)
- Change Marketplace individual-factor dialog input from basis points to percentage
- Update all labels, placeholders, and validation messages to reflect percentage units
- Standardize advance rate display precision to `.toFixed(2)%` everywhere it appears read-only

## Capabilities

### New Capabilities

_(none — this is a UI consistency fix, no new user-facing capabilities)_

### Modified Capabilities

- `advance-rate-input`: All advance rate input fields must accept percentage values (50–99). Internally, values are converted to basis points (`percent × 100`) before on-chain submission, matching the existing behaviour of pool creation and pool submission dialogs.

## Impact

- `client/src/pages/RegisterFactor.tsx` — input format, validation, labels, preview text
- `client/src/pages/Marketplace.tsx` — individual factoring dialog input format, labels, range hints
- No changes to on-chain transition inputs (BPS values are still passed; conversion logic moves to the form layer)
- No changes to pool creation or pool submission dialogs (already use percentage)
- No changes to display-only components in dashboards or Pool detail page (already `.toFixed(2)%`)
