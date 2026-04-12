## ADDED Requirements

### Requirement: CreditorReceipt record structure
The Leo contract SHALL define a `CreditorReceipt` record with the following private fields: `owner` (address, the original creditor), `factor` (address), `debtor` (address), `amount` (u64), `advance_rate` (u16), `due_date` (u64), `invoice_hash` (field), `use_token` (bool), `recourse` (bool).

#### Scenario: Fields match the submitted offer
- **WHEN** `authorize_factoring` completes successfully
- **THEN** the emitted `CreditorReceipt` SHALL contain values identical to the corresponding fields on the emitted `FactoringOffer`, and `owner` SHALL equal the original creditor's address

### Requirement: authorize_factoring emits CreditorReceipt
`authorize_factoring` SHALL return a `CreditorReceipt` record owned by `self.caller` (the Business) as a second output alongside the existing `FactoringOffer`.

#### Scenario: Business receives receipt after authorizing factoring
- **WHEN** a Business calls `authorize_factoring` with a valid Invoice and registered Factor
- **THEN** the Business's wallet SHALL contain a new unspent `CreditorReceipt` record discoverable via `requestRecords(PROGRAM_ID)`

#### Scenario: Factor still receives FactoringOffer
- **WHEN** a Business calls `authorize_factoring`
- **THEN** the Factor's wallet SHALL still receive the `FactoringOffer` record as before, unaffected by the addition of the receipt

### Requirement: authorize_partial_factoring emits CreditorReceipt
`authorize_partial_factoring` SHALL also emit a `CreditorReceipt` for the factored portion, as a third output alongside `FactoringOffer` and the remainder `Invoice`.

#### Scenario: Business receives receipt for the factored portion only
- **WHEN** a Business calls `authorize_partial_factoring` with `factoring_amount` less than the full invoice amount
- **THEN** the emitted `CreditorReceipt.amount` SHALL equal `factoring_amount`, not the full invoice amount

### Requirement: Frontend displays CreditorReceipt records in Pending Offers tab
The Business Dashboard Pending Offers tab SHALL query `CreditorReceipt` records from the wallet (via `requestRecords`) instead of reading from `localStorage`.

#### Scenario: Pending offer visible after browser refresh
- **WHEN** a Business authorized factoring on device A and opens the dashboard on device B (same wallet)
- **THEN** the Pending Offers tab SHALL display the pending offer (sourced from the on-chain receipt)

#### Scenario: Stale receipt filtered out after factoring accepted
- **WHEN** a Factor has accepted an offer (FactoredInvoice exists for that invoice_hash)
- **THEN** the corresponding `CreditorReceipt` SHALL NOT appear in the Pending Offers tab (filtered via `factoredInvoiceHashes`)

#### Scenario: Stale receipt filtered out after settlement
- **WHEN** an invoice has been settled (`settled_invoices` mapping contains the invoice_hash)
- **THEN** the corresponding `CreditorReceipt` SHALL NOT appear in the Pending Offers tab (filtered via `settledHashes`)

### Requirement: localStorage pending-factoring tracking removed
The frontend SHALL NOT write pending factoring offers to `localStorage`. The `upsertPendingFactoringRequest` and `removePendingFactoringRequest` calls in `Marketplace.tsx` SHALL be removed. The `pending-factoring.ts` module SHALL be deleted.

#### Scenario: No localStorage entry created on authorize_factoring
- **WHEN** a Business submits `authorize_factoring` via the Marketplace page
- **THEN** no entry is written to `localStorage` under the `zkfactor.pending_factoring.v1` key
