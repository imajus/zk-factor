## ADDED Requirements

### Requirement: Execute atomic invoice factoring

The system SHALL execute an atomic swap where the Invoice record is consumed, a FactoredInvoice record is created for the factor, and payment is transferred to the business.

#### Scenario: Successful factoring transaction

- **WHEN** a business calls `factor_invoice()` with a valid Invoice, registered factor address, valid advance rate, and sufficient payment
- **THEN** the Invoice record is consumed and its serial number is published on-chain
- **AND** a FactoredInvoice record is created with owner = factor address
- **AND** payment credits are transferred to the business caller
- **AND** all three operations succeed or all fail together (atomicity)

#### Scenario: Atomic rollback on failure

- **WHEN** a factoring transaction fails any validation check
- **THEN** the Invoice record is not consumed
- **AND** no FactoredInvoice is created
- **AND** no payment is transferred
- **AND** the transaction rolls back completely

### Requirement: Prevent double-factoring via serial number

The system SHALL prevent an invoice from being factored more than once by rejecting transactions that attempt to consume an already-spent Invoice serial number.

#### Scenario: Second factoring attempt rejected

- **WHEN** a business attempts to factor an Invoice that has already been consumed
- **THEN** the transaction fails because the serial number is already published
- **AND** no new FactoredInvoice is created
- **AND** no payment is transferred

#### Scenario: Cryptographic enforcement

- **WHEN** an Invoice serial number is published during factoring
- **THEN** Aleo's protocol automatically prevents reuse of that serial number
- **AND** no centralized registry or trust is required
- **AND** the prevention is cryptographically guaranteed

### Requirement: Validate invoice ownership

The system SHALL only allow the Invoice owner to factor it.

#### Scenario: Owner factoring succeeds

- **WHEN** the Invoice owner calls `factor_invoice()` with their owned Invoice
- **THEN** the transaction succeeds if other validations pass

#### Scenario: Non-owner factoring rejected

- **WHEN** an address other than the Invoice owner attempts to factor it
- **THEN** the transaction fails with ownership error
- **AND** the Invoice remains unconsumed

### Requirement: Validate advance rate bounds

The system SHALL only accept advance rates between 5000 and 9900 basis points (50% to 99%).

#### Scenario: Valid advance rate acceptance

- **WHEN** `factor_invoice()` is called with advance_rate between 5000u16 and 9900u16 inclusive
- **THEN** the transaction succeeds if other validations pass
- **AND** the FactoredInvoice records the advance_rate value

#### Scenario: Too low advance rate rejection

- **WHEN** `factor_invoice()` is called with advance_rate < 5000u16
- **THEN** the transaction fails with assertion error
- **AND** no factoring occurs

#### Scenario: Too high advance rate rejection

- **WHEN** `factor_invoice()` is called with advance_rate > 9900u16
- **THEN** the transaction fails with assertion error
- **AND** no factoring occurs

### Requirement: Validate payment sufficiency

The system SHALL verify that the payment amount is at least equal to the calculated advance amount (invoice amount × advance rate / 10000).

#### Scenario: Sufficient payment acceptance

- **WHEN** payment amount >= (invoice.amount × advance_rate / 10000)
- **THEN** the transaction succeeds if other validations pass
- **AND** the business receives the advance amount

#### Scenario: Insufficient payment rejection

- **WHEN** payment amount < (invoice.amount × advance_rate / 10000)
- **THEN** the transaction fails with assertion error
- **AND** no factoring occurs

#### Scenario: Overpayment handling

- **WHEN** payment amount > calculated advance amount
- **THEN** the transaction succeeds
- **AND** the business receives exactly the advance amount
- **AND** the excess remains with the factor

### Requirement: Verify factor registration

The system SHALL only allow registered factors (present in `active_factors` mapping) to receive FactoredInvoice records.

#### Scenario: Registered factor acceptance

- **WHEN** the factor address exists in the `active_factors` mapping with is_active = true
- **THEN** the transaction succeeds if other validations pass
- **AND** the FactoredInvoice is created for the factor

#### Scenario: Unregistered factor rejection

- **WHEN** the factor address does not exist in the `active_factors` mapping
- **THEN** the transaction fails in the finalize block
- **AND** no factoring occurs

#### Scenario: Inactive factor rejection

- **WHEN** the factor address exists but is_active = false
- **THEN** the transaction fails in the finalize block
- **AND** no factoring occurs

### Requirement: Create FactoredInvoice with complete data

The system SHALL create a FactoredInvoice record containing all original invoice data plus factoring terms.

#### Scenario: FactoredInvoice field population

- **WHEN** factoring succeeds
- **THEN** the FactoredInvoice contains owner = factor address
- **AND** original_creditor = business address
- **AND** debtor = original Invoice debtor
- **AND** amount = original Invoice amount
- **AND** advance_amount = calculated advance amount
- **AND** due_date = original Invoice due_date
- **AND** factoring_date = current block timestamp
- **AND** advance_rate = provided advance_rate
- **AND** invoice_hash = original Invoice invoice_hash
- **AND** recourse = false (MVP default)

### Requirement: Update protocol statistics

The system SHALL increment the total_factored counter in `protocol_stats` mapping when factoring succeeds.

#### Scenario: Stats increment on factoring

- **WHEN** a factoring transaction completes successfully
- **THEN** the value at protocol_stats[1u8] is incremented by 1
- **AND** the increment is atomic with the factoring transaction
