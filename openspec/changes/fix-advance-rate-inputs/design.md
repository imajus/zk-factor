## Context

Advance rate is stored and transmitted on-chain as basis points (u16, e.g. 9500 = 95%). The UI display layer already converts uniformly: `bps / 100` formatted as `X.XX%`. However, two input forms — Factor Registration and the Marketplace individual-factoring dialog — accept raw basis points from the user, while the Pool creation and Pool submission dialogs accept plain percentages. This split exists because the pool forms were added later and adopted the more natural percentage UX without updating the older forms to match.

## Goals / Non-Goals

**Goals:**
- All advance rate input fields accept plain percentages (50–99)
- On-chain submissions remain correct (bps values via `percent × 100`)
- Labels, placeholders, validation messages, and inline previews all use `%` terminology
- Display precision normalized to `.toFixed(2)%` on the two affected form files

**Non-Goals:**
- Changing any on-chain data format or Leo transition signatures
- Modifying pool creation / pool submission dialogs (already correct)
- Updating dashboards or Pool detail page displays (already `.toFixed(2)%`)
- Adding any new UI features or flows

## Decisions

**Percentage as canonical input unit**
Pool forms already use percentage inputs and are the more recently written, better-UX pattern. Converting the two legacy forms to match avoids introducing a new convention. The conversion (`percent × 100 → bps`) is trivial and identical to what pool forms already do.

**Convert at form submission boundary, not in state**
State variables (`minRate`, `maxRate`, `advanceRateInput`) will hold the raw percentage string the user typed. BPS is derived at the point of building transaction inputs (`Math.round(Number(pct) * 100)`). This keeps state predictable and mirrors how pool forms work.

**Validation against percentage bounds directly**
Factor registration: validate `pct >= 50 && pct <= 99`. Marketplace dialog: validate `pct >= factorMinRate/100 && pct <= factorMaxRate/100`. No intermediate BPS comparison needed.

## Risks / Trade-offs

[State reset] Existing users who had partially filled a form with BPS values will see their entry cleared or invalid when the change deploys → Mitigation: inputs are ephemeral session state; no persistence, so no migration needed.

[Floating-point precision] `Math.round(75.5 * 100)` = 7550 (correct). Percentage inputs are integers 50–99, so rounding is safe → no mitigation needed.
