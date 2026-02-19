## ADDED Requirements

### Requirement: Marketplace shows registered factors from chain
`Marketplace.tsx` SHALL query the `active_factors` public mapping on `zk_factor_11765.aleo` via the Aleo explorer REST API to list active factors (where `is_active = true`). Mock factor data SHALL be removed.

#### Scenario: Factors loaded on page mount
- **WHEN** a user navigates to `/marketplace`
- **THEN** the page fetches `active_factors` entries from the chain
- **THEN** only entries with `is_active = true` are shown
- **THEN** each card shows the factor's address, `min_advance_rate`, and `max_advance_rate` (displayed as percentages: value / 100)

#### Scenario: No active factors found
- **WHEN** `active_factors` mapping has no active entries
- **THEN** the marketplace shows an empty state: "No active factors registered"

### Requirement: Business can request factoring via factor_invoice
When a business selects a factor and an invoice, clicking "Factor Invoice" SHALL call `executeTransaction` for `zk_factor_11765.aleo/factor_invoice` with inputs: `[invoice_record, factor_address, advance_rate_u16, credits_record]`.

#### Scenario: Business submits a factoring request
- **WHEN** a connected business selects an Invoice record and a factor, sets an advance rate, and confirms
- **THEN** `executeTransaction` is called with the Invoice record, factor address, advance rate as `u16` (e.g. 90% → `9000u16`), and a credits record
- **THEN** a progress toast is shown during proof generation

#### Scenario: Advance rate out of bounds
- **WHEN** the selected advance rate is outside 50%–99% (5000–9900 basis points)
- **THEN** the Factor Invoice button is disabled with a tooltip explaining the valid range

### Requirement: Factor can register and deregister
`Settings.tsx` SHALL include a "Factor Registration" section where a connected address can register as a factor by calling `register_factor(min_rate, max_rate)` or deregister by calling `deregister_factor()`.

#### Scenario: Address registers as factor
- **WHEN** a connected user provides valid min and max advance rates and clicks "Register as Factor"
- **THEN** `executeTransaction` is called for `zk_factor_11765.aleo/register_factor` with `[min_advance_rate_u16, max_advance_rate_u16]`
- **THEN** a success toast confirms registration after the transaction is confirmed

#### Scenario: Duplicate registration rejected
- **WHEN** a connected address that is already `is_active` attempts to register again
- **THEN** the transaction fails on-chain and an error toast shows "Already registered as factor"

#### Scenario: Address deregisters
- **WHEN** a registered factor clicks "Deregister"
- **THEN** `executeTransaction` is called for `zk_factor_11765.aleo/deregister_factor` with no inputs
- **THEN** a success toast confirms deregistration
