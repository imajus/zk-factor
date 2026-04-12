## ADDED Requirements

### Requirement: Pool contribution uses private credits record

The `pool_contribute` transition SHALL accept a `payment: credits.aleo::credits` record parameter and consume it via `credits.aleo::transfer_private_to_public` rather than debiting the caller's public credits balance. The contributor's source of funds SHALL NOT be publicly visible on-chain.

#### Scenario: Factor contributes to pool using private record

- **WHEN** an active factor calls `pool_contribute` with a valid unspent `credits.aleo::credits` record of sufficient value
- **THEN** the record is consumed, the program's public escrow balance increases by `contribution`, and a `PoolShare` record is issued to the contributor

#### Scenario: Factor without credits record cannot contribute via public balance

- **WHEN** a factor attempts to call `pool_contribute` without supplying a credits record
- **THEN** the transaction fails at the input validation stage (missing required record input)

### Requirement: Individual invoice payment by debtor is fully private

The `pay_invoice` transition SHALL accept a `payment: credits.aleo::credits` record parameter. It SHALL use `credits.aleo::transfer_private` to transfer `notice.amount` to the factor, returning a private credits record to the factor and a change record to the debtor. Neither the debtor's identity nor the payment amount SHALL be publicly visible on-chain.

#### Scenario: Debtor pays invoice with private credits record

- **WHEN** the debtor calls `pay_invoice` supplying their `PaymentNotice` record and a credits record with at least `notice.amount` microcredits
- **THEN** the factor receives a private credits record for `notice.amount`, the debtor receives a change record, and the invoice is marked settled on-chain

#### Scenario: Debtor with insufficient credits record cannot pay

- **WHEN** the debtor calls `pay_invoice` with a credits record whose value is less than `notice.amount`
- **THEN** the transition fails (assertion on record value)

### Requirement: Pool invoice payment by debtor uses private credits record

The `pay_pool_invoice` transition SHALL accept a `payment: credits.aleo::credits` record parameter and consume it via `credits.aleo::transfer_private_to_public`. The debtor's source of funds SHALL NOT be publicly visible. The pool escrow balance increase remains publicly visible (structural constraint of program-owned escrow).

#### Scenario: Debtor pays pool invoice with private credits record

- **WHEN** the debtor calls `pay_pool_invoice` supplying their `PoolPaymentNotice` record and a credits record for the full `notice.amount`
- **THEN** the credits record is consumed, the program's public escrow increases by `notice.amount`, and the invoice is marked settled on-chain

#### Scenario: Pool invoice payment with wrong amount is rejected

- **WHEN** the debtor calls `pay_pool_invoice` with a credits record whose value does not match `notice.amount`
- **THEN** the transition fails the on-chain amount assertion

### Requirement: USDCx factoring advance is delivered as a private Token record

The `execute_factoring_token` transition SHALL use `test_usdcx_stablecoin.aleo::transfer_from_public_to_private` so the business receives a private `Token` record rather than a public USDCx balance credit. The transition SHALL return `ComplianceRecord` and `Token` outputs in addition to `FactoredInvoice`. The factor's USDCx public balance deduction remains visible (MerkleProof constraint prevents full privacy).

#### Scenario: Factor executes USDCx factoring; business receives private Token record

- **WHEN** a factor calls `execute_factoring_token` with a valid `FactoringOffer` and sufficient approved USDCx public balance
- **THEN** the business's address receives a private `Token` record for `advance_amount`, the factor's public USDCx balance is debited, and the business's public USDCx balance is NOT credited

#### Scenario: Business public USDCx balance is not increased

- **WHEN** `execute_factoring_token` completes successfully
- **THEN** querying the business's public USDCx balance shows no change (funds arrived as a private record)
