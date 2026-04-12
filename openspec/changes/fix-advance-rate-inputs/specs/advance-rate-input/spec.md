## ADDED Requirements

### Requirement: Advance rate inputs accept percentage values
All advance rate input fields in the UI SHALL accept whole-number percentage values in the range 50–99 (inclusive). The system SHALL convert the entered percentage to basis points (`percent × 100`) internally before constructing on-chain transaction inputs.

#### Scenario: Factor registration with valid percentage
- **WHEN** a user enters `70` in the Min Advance Rate field and `95` in the Max Advance Rate field on the Factor Registration form
- **THEN** the form preview shows "You will advance 70.00%–95.00% of invoice value upfront"
- **THEN** the transaction is submitted with inputs `7000u16` and `9500u16`

#### Scenario: Factor registration rejects basis-point values
- **WHEN** a user enters `7000` in the Min Advance Rate field
- **THEN** the field treats the value as out of range (> 99) and shows a validation error
- **THEN** the Register button remains disabled

#### Scenario: Marketplace individual-factor dialog with valid percentage
- **WHEN** a user enters an advance rate percentage within the factor's displayed min–max range
- **THEN** the input shows a confirmation hint `X.XX% advance`
- **THEN** the Authorize button becomes enabled

#### Scenario: Marketplace dialog rejects out-of-range percentage
- **WHEN** a user enters a percentage outside the factor's min–max range (converted from bps)
- **THEN** the input shows an error: "Must be between X% and Y%"
- **THEN** the Authorize button remains disabled

### Requirement: Advance rate input labels use percentage units
All labels, placeholders, and validation messages for advance rate inputs SHALL reference "%" units, not "basis points" or "bps".

#### Scenario: Factor registration labels
- **WHEN** the Factor Registration form is displayed
- **THEN** the Min field label reads "Min Advance Rate (%)"
- **THEN** the Max field label reads "Max Advance Rate (%)"
- **THEN** the placeholder for min reads "e.g. 70" (not "e.g. 7000 for 70%")

#### Scenario: Marketplace dialog label
- **WHEN** the individual-factor factoring dialog is open
- **THEN** the advance rate field label reads "Advance Rate (%, X–Y)" where X and Y are the factor's min/max as whole percentages
- **THEN** the placeholder shows the factor's max rate as a whole percentage (e.g. `e.g. 95`)

### Requirement: Advance rate displays use two decimal places
All read-only advance rate displays in the files `RegisterFactor.tsx` and `Marketplace.tsx` SHALL format values as `X.XX%` (two decimal places).

#### Scenario: Already-registered alert on Factor Registration
- **WHEN** a factor who is already registered views the Factor Registration page
- **THEN** their existing rates are shown as e.g. "70.00%–95.00%" (two decimal places)

#### Scenario: Pool submission range hint in Marketplace
- **WHEN** a business is submitting an invoice to a pool and the range hint is shown
- **THEN** the pool's min and max rates are displayed as e.g. "70.00%–80.00%"
