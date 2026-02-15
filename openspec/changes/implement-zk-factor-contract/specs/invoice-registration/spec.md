## ADDED Requirements

### Requirement: Create invoice record

The system SHALL allow businesses to create Invoice records containing debtor address, amount, due date, invoice hash, and metadata.

#### Scenario: Valid invoice creation

- **WHEN** a business calls `mint_invoice()` with valid debtor address, positive amount, future due date, invoice hash, and metadata
- **THEN** the system creates an Invoice record owned by the caller
- **AND** the Invoice contains all provided field values
- **AND** the system generates a unique nonce from invoice hash, timestamp, and caller address
- **AND** the Invoice serial number is not published until consumed

#### Scenario: Invoice creation with multiple invoices

- **WHEN** a business creates multiple invoices with different parameters
- **THEN** each Invoice record has a unique nonce
- **AND** each Invoice has its own serial number
- **AND** all invoices remain private to the owner

### Requirement: Validate invoice amount

The system SHALL reject invoice creation if the amount is zero or negative.

#### Scenario: Zero amount rejection

- **WHEN** a business attempts to create an invoice with amount = 0u64
- **THEN** the transaction fails with assertion error
- **AND** no Invoice record is created

#### Scenario: Valid positive amount

- **WHEN** a business creates an invoice with amount > 0u64
- **THEN** the transaction succeeds
- **AND** the Invoice record contains the specified amount

### Requirement: Validate due date

The system SHALL reject invoice creation if the due date is not in the future relative to the current block timestamp.

#### Scenario: Past due date rejection

- **WHEN** a business attempts to create an invoice with due_date <= block.timestamp
- **THEN** the transaction fails with assertion error
- **AND** no Invoice record is created

#### Scenario: Future due date acceptance

- **WHEN** a business creates an invoice with due_date > block.timestamp
- **THEN** the transaction succeeds
- **AND** the Invoice record contains the specified due date

### Requirement: Validate debtor address

The system SHALL reject invoice creation if the debtor address is the same as the caller address.

#### Scenario: Self-debtor rejection

- **WHEN** a business attempts to create an invoice where debtor == self.caller
- **THEN** the transaction fails with assertion error
- **AND** no Invoice record is created

#### Scenario: Different debtor acceptance

- **WHEN** a business creates an invoice with debtor != self.caller
- **THEN** the transaction succeeds
- **AND** the Invoice record contains the specified debtor address

### Requirement: Generate unique invoice nonce

The system SHALL generate a unique nonce for each invoice using Poseidon hash of invoice hash, block timestamp, and caller address.

#### Scenario: Nonce uniqueness across invoices

- **WHEN** a business creates two invoices with the same invoice_hash but at different timestamps
- **THEN** each Invoice has a different nonce value
- **AND** the nonces are deterministically generated from inputs

#### Scenario: Nonce determinism

- **WHEN** the same inputs (invoice_hash, timestamp, caller) are provided
- **THEN** the system generates the same nonce value
- **AND** the nonce is verifiable without revealing inputs

### Requirement: Store invoice metadata

The system SHALL store invoice metadata in a packed u128 field containing invoice number and flags.

#### Scenario: Metadata packing

- **WHEN** a business creates an invoice with metadata value
- **THEN** the Invoice record stores the metadata as u128
- **AND** bits 0-31 can contain invoice number
- **AND** bits 32-47 can contain invoice type flags
- **AND** bits 48-127 are reserved for future use
