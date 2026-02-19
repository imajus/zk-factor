## ADDED Requirements

### Requirement: Factor can settle a FactoredInvoice
`Invoices.tsx` (or a dedicated portfolio view for factors) SHALL display `FactoredInvoice` records owned by the connected address. For each unsettled record, a "Settle" action SHALL be available that calls `executeTransaction` for `zk_factor_11765.aleo/settle_invoice` with inputs `[factored_invoice_record, credits_record]`.

#### Scenario: Factor settles a FactoredInvoice
- **WHEN** a connected factor selects a FactoredInvoice and clicks "Settle"
- **THEN** `executeTransaction` is called with the FactoredInvoice record and a credits record with `microcredits >= factored.amount`
- **THEN** a proof generation toast is shown
- **THEN** on confirmation, the settled invoice is removed from the active list

#### Scenario: Insufficient credits for settlement
- **WHEN** the connected address has fewer microcredits than `factored.amount`
- **THEN** the Settle button is disabled with label "Insufficient balance"

### Requirement: Settlement prevents double-settlement
The smart contract enforces that `settle_invoice` can only be called once per `invoice_hash` (via the `settled_invoices` mapping). The UI SHALL reflect this by:
- Not showing a "Settle" action for invoices where `settled_invoices[invoice_hash].is_settled = true`
- Showing a "Settled" badge instead

#### Scenario: Already settled invoice displayed
- **WHEN** a FactoredInvoice's `invoice_hash` exists in `settled_invoices` with `is_settled = true`
- **THEN** the invoice row shows a "Settled" status badge
- **THEN** no Settle action is available

#### Scenario: Double settlement attempt rejected on-chain
- **WHEN** the user somehow triggers a second `settle_invoice` for the same hash
- **THEN** the transaction fails and an error toast shows "Invoice already settled"

### Requirement: Settlement transaction progress shown
After calling `settle_invoice`, the UI SHALL poll `transactionStatus(txId)` every 3 seconds and show progress: "Settling invoice…" → "Confirmed". On confirmation, invalidate the `FactoredInvoice` record cache.

#### Scenario: Successful settlement flow
- **WHEN** the settlement transaction is confirmed
- **THEN** the success toast shows "Invoice settled successfully!"
- **THEN** the record list refreshes to reflect the settled state
