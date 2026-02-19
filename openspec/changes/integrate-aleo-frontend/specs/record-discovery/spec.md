## ADDED Requirements

### Requirement: Invoice records fetched via requestRecords
`Invoices.tsx` SHALL call `requestRecords('zk_factor_11765.aleo', true)` to retrieve the connected user's `Invoice` records. The call SHALL be wrapped in a `useQuery` with a 60-second stale time. Mock data from `mock-data.ts` SHALL be removed.

#### Scenario: Connected user has Invoice records
- **WHEN** a connected user navigates to `/invoices`
- **THEN** the page calls `requestRecords` for `zk_factor_11765.aleo`
- **THEN** returned records of type `Invoice` are displayed in the table with fields: `amount` (converted from microcredits to ALEO), `due_date` (converted to human-readable date), `debtor` (truncated address)

#### Scenario: No records found
- **WHEN** `requestRecords` returns an empty array
- **THEN** the invoices table shows "No invoices found"

#### Scenario: Wallet not connected
- **WHEN** `connected` is `false`
- **THEN** the page shows a "Connect your wallet to view invoices" prompt instead of the table

### Requirement: FactoredInvoice records fetched for factor portfolio
The factor portfolio view SHALL call `requestRecords('zk_factor_11765.aleo', true)` and filter records of type `FactoredInvoice` owned by the connected address. Settlement status SHALL be cross-referenced against the `settled_invoices` public mapping.

#### Scenario: Factor has FactoredInvoice records
- **WHEN** a connected factor views their portfolio
- **THEN** `FactoredInvoice` records are listed with fields: `amount`, `advance_amount`, `advance_rate` (value / 100 as percentage), `original_creditor`, `due_date`, settlement status

#### Scenario: Settlement status lookup
- **WHEN** a FactoredInvoice is displayed
- **THEN** the UI queries `settled_invoices[invoice_hash]` from the public mapping
- **THEN** if `is_settled = true`, the record shows "Settled"; otherwise shows "Pending Settlement"

### Requirement: Transaction history fetched via requestTransactionHistory
`Transactions.tsx` SHALL call `requestTransactionHistory()` from the adapter and display the returned transaction records. Mock transaction data SHALL be removed.

#### Scenario: Connected user views transactions
- **WHEN** a connected user navigates to `/transactions`
- **THEN** `requestTransactionHistory()` is called
- **THEN** each transaction is shown with: transaction ID (truncated), function name, timestamp, status

#### Scenario: Empty transaction history
- **WHEN** `requestTransactionHistory()` returns an empty array
- **THEN** the page shows "No transactions yet"

### Requirement: Record loading states shown
All pages that fetch records SHALL display a loading skeleton while the `useQuery` is in a loading state, and an error state with a retry button if the query fails.

#### Scenario: Records loading
- **WHEN** `requestRecords` is in flight
- **THEN** the page displays skeleton rows in place of the table content

#### Scenario: Record fetch error
- **WHEN** `requestRecords` throws or returns an error
- **THEN** an error message is shown with a "Retry" button that calls `refetch()`
