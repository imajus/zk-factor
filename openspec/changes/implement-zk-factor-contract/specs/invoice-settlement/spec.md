## ADDED Requirements

### Requirement: Settle factored invoice

The system SHALL allow the factor to settle a FactoredInvoice by consuming it and recording the settlement in the `settled_invoices` mapping.

#### Scenario: Valid settlement

- **WHEN** a factor calls `settle_invoice()` with a FactoredInvoice they own and full payment
- **THEN** the FactoredInvoice record is consumed
- **AND** the invoice_hash is recorded in `settled_invoices` mapping with is_settled = true
- **AND** the settlement_date is recorded as current block timestamp
- **AND** the factor address is recorded in the settlement info
- **AND** payment credits are released to the factor

#### Scenario: Settlement completes lifecycle

- **WHEN** settlement succeeds
- **THEN** the invoice lifecycle is complete (created → factored → settled)
- **AND** no further operations are possible on this invoice
- **AND** the settlement record is permanently on-chain

### Requirement: Validate FactoredInvoice ownership

The system SHALL only allow the FactoredInvoice owner (the factor) to settle it.

#### Scenario: Owner settlement succeeds

- **WHEN** the factor who owns the FactoredInvoice calls `settle_invoice()`
- **THEN** the transaction succeeds if other validations pass

#### Scenario: Non-owner settlement rejected

- **WHEN** an address other than the FactoredInvoice owner attempts settlement
- **THEN** the transaction fails with ownership error
- **AND** the FactoredInvoice remains unconsumed
- **AND** no settlement is recorded

### Requirement: Validate payment amount

The system SHALL verify that the payment amount is at least equal to the original invoice amount.

#### Scenario: Full payment acceptance

- **WHEN** payment amount >= factored.amount (original invoice amount)
- **THEN** the transaction succeeds if other validations pass
- **AND** the factor receives the payment

#### Scenario: Partial payment rejection

- **WHEN** payment amount < factored.amount
- **THEN** the transaction fails with assertion error
- **AND** no settlement occurs

#### Scenario: Overpayment handling

- **WHEN** payment amount > factored.amount
- **THEN** the transaction succeeds
- **AND** the factor receives the full payment amount
- **AND** the invoice is marked as settled

### Requirement: Prevent double settlement

The system SHALL prevent a FactoredInvoice from being settled more than once by checking the `settled_invoices` mapping.

#### Scenario: First settlement succeeds

- **WHEN** an invoice_hash is not present in `settled_invoices` mapping
- **THEN** settlement succeeds
- **AND** the invoice_hash is added to the mapping

#### Scenario: Second settlement attempt rejected

- **WHEN** an invoice_hash already exists in `settled_invoices` mapping with is_settled = true
- **THEN** the transaction fails in the finalize block
- **AND** no duplicate settlement is recorded

#### Scenario: Cryptographic guarantee via mapping

- **WHEN** the finalize block checks `settled_invoices.contains(invoice_hash)`
- **THEN** the check is atomic and guaranteed by Aleo's state machine
- **AND** race conditions are prevented by consensus protocol

### Requirement: Record settlement metadata

The system SHALL record settlement date and factor address when an invoice is settled.

#### Scenario: Settlement info storage

- **WHEN** settlement succeeds
- **THEN** `settled_invoices[invoice_hash]` contains is_settled = true
- **AND** settlement_date = current block.timestamp
- **AND** factor = caller address
- **AND** the data is permanently stored on-chain

#### Scenario: Settlement info immutability

- **WHEN** settlement data is written to the mapping
- **THEN** it cannot be modified or deleted
- **AND** it remains queryable indefinitely
- **AND** it serves as audit trail for the invoice lifecycle

### Requirement: Update protocol statistics

The system SHALL increment the total_settled counter in `protocol_stats` mapping when settlement succeeds.

#### Scenario: Stats increment on settlement

- **WHEN** a settlement transaction completes successfully
- **THEN** the value at protocol_stats[2u8] is incremented by 1
- **AND** the increment is atomic with the settlement transaction
- **AND** the counter accurately reflects total settled invoices

### Requirement: Consume FactoredInvoice record

The system SHALL consume the FactoredInvoice record during settlement, publishing its serial number.

#### Scenario: Record consumption

- **WHEN** settlement succeeds
- **THEN** the FactoredInvoice serial number is published on-chain
- **AND** the record cannot be used again
- **AND** attempting to settle the same record fails with serial number spent error

#### Scenario: Settlement finality

- **WHEN** a FactoredInvoice is consumed
- **THEN** the settlement is final and irreversible
- **AND** no rollback is possible after consensus
- **AND** the factor must have received payment before consuming the record
