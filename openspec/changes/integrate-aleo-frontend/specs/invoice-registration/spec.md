## ADDED Requirements

### Requirement: CreateInvoice form executes mint_invoice transition
On submit, `CreateInvoice.tsx` SHALL call `executeTransaction()` from the adapter with a transaction object targeting `zk_factor_11765.aleo/mint_invoice`. The call SHALL be gated on wallet connection; if not connected, the submit button SHALL be disabled with label "Connect Wallet".

#### Scenario: Valid form submitted while connected
- **WHEN** a connected user fills all required fields (debtor address, amount > 0, future due date) and submits
- **THEN** `executeTransaction` is called with inputs `[debtor, amount_microcredits, due_date_unix, invoice_hash_field, metadata_u128]`
- **THEN** a toast shows "Generating proof…" while the transaction is pending

#### Scenario: Wallet not connected on submit attempt
- **WHEN** `connected` is `false`
- **THEN** the submit button is disabled and labelled "Connect Wallet"

### Requirement: Amount converted to microcredits
The amount field accepts ALEO as a decimal. Before passing to the transition, it SHALL be converted to microcredits using `Math.round(aleo * 1_000_000)` and represented as `u64`.

#### Scenario: User enters 1.5 ALEO
- **WHEN** the user types `1.5` in the amount field
- **THEN** the transaction input for amount is `1500000u64`

### Requirement: Due date converted to Unix timestamp
The due date picker returns a JavaScript `Date`. Before passing to the transition, it SHALL be converted to a Unix timestamp in seconds using `Math.floor(date.getTime() / 1000)` and represented as `u64`.

#### Scenario: User selects a date 30 days in the future
- **WHEN** the user selects a date 30 days from now
- **THEN** the transaction input for due_date is the Unix epoch seconds of that date as `u64`

### Requirement: Invoice hash computed client-side
The `invoice_hash` parameter SHALL be computed as the Poseidon2 hash of a canonical string derived from `invoiceNumber + debtorAddress + amountMicrocredits`, encoded as a `field` type using the Aleo SDK.

#### Scenario: Hash computed before submission
- **WHEN** the form is submitted
- **THEN** `invoice_hash` is a valid `field` value derived from invoice data
- **THEN** the same inputs always produce the same hash

### Requirement: Proof generation progress shown
After `executeTransaction` is called, the UI SHALL poll `transactionStatus(txId)` every 3 seconds and display status in a persistent toast: "Generating proof…" → "Broadcasting…" → "Confirmed". On confirmation, navigate to `/invoices`.

#### Scenario: Transaction confirmed
- **WHEN** `transactionStatus` returns confirmed
- **THEN** a success toast shows "Invoice created successfully!"
- **THEN** the user is navigated to `/invoices`

#### Scenario: Transaction fails
- **WHEN** `transactionStatus` returns failed or an error is thrown
- **THEN** an error toast shows the failure reason
- **THEN** the form remains editable for retry
