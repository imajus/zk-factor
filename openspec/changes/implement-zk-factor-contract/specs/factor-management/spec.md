## ADDED Requirements

### Requirement: Register factoring company

The system SHALL allow factors to register by adding their address to the `active_factors` mapping with configuration parameters.

#### Scenario: Successful factor registration

- **WHEN** an address calls `register_factor()` with valid min_advance_rate and max_advance_rate
- **THEN** an entry is created in `active_factors[caller_address]`
- **AND** is_active = true
- **AND** min_advance_rate is stored
- **AND** max_advance_rate is stored
- **AND** total_factored = 0u64
- **AND** registration_date = current block.timestamp

#### Scenario: Registration enables factoring

- **WHEN** a factor is registered with is_active = true
- **THEN** they can receive FactoredInvoice records from `factor_invoice()` transactions
- **AND** their address passes the finalize block registration check

### Requirement: Validate advance rate configuration

The system SHALL validate that min_advance_rate <= max_advance_rate and both are within valid bounds (5000-9900 basis points).

#### Scenario: Valid rate range acceptance

- **WHEN** min_advance_rate <= max_advance_rate
- **AND** both values are between 5000u16 and 9900u16 inclusive
- **THEN** registration succeeds

#### Scenario: Invalid rate range rejection

- **WHEN** min_advance_rate > max_advance_rate
- **THEN** the transaction fails with assertion error
- **AND** no registration occurs

#### Scenario: Out of bounds min rate rejection

- **WHEN** min_advance_rate < 5000u16 or min_advance_rate > 9900u16
- **THEN** the transaction fails with assertion error
- **AND** no registration occurs

#### Scenario: Out of bounds max rate rejection

- **WHEN** max_advance_rate < 5000u16 or max_advance_rate > 9900u16
- **THEN** the transaction fails with assertion error
- **AND** no registration occurs

### Requirement: Prevent duplicate registration

The system SHALL prevent an address from registering as a factor if they are already registered with is_active = true.

#### Scenario: New address registration succeeds

- **WHEN** an address that is not in `active_factors` mapping calls `register_factor()`
- **THEN** registration succeeds if validations pass

#### Scenario: Already active factor registration rejected

- **WHEN** an address already in `active_factors` with is_active = true attempts to register again
- **THEN** the transaction fails in the finalize block
- **AND** the existing registration is not modified

#### Scenario: Reactivation after deregistration

- **WHEN** an address in `active_factors` with is_active = false calls `register_factor()`
- **THEN** the registration succeeds
- **AND** is_active is set to true
- **AND** the new rate parameters replace the old ones

### Requirement: Deregister factoring company

The system SHALL allow factors to deregister by setting their `is_active` flag to false in the `active_factors` mapping.

#### Scenario: Successful deregistration

- **WHEN** a registered factor calls `deregister_factor()`
- **THEN** their entry in `active_factors[caller_address]` is updated
- **AND** is_active = false
- **AND** other fields (rates, total_factored, registration_date) remain unchanged

#### Scenario: Deregistration prevents new factoring

- **WHEN** a factor is deregistered (is_active = false)
- **THEN** they cannot receive new FactoredInvoice records
- **AND** `factor_invoice()` transactions specifying their address fail in finalize

#### Scenario: Deregistration does not affect existing invoices

- **WHEN** a factor deregisters
- **THEN** FactoredInvoice records they already own remain valid
- **AND** they can still call `settle_invoice()` on their existing invoices
- **AND** only new factoring operations are blocked

### Requirement: Validate caller is registered before deregistration

The system SHALL only allow factors who are currently registered to deregister.

#### Scenario: Registered factor deregistration succeeds

- **WHEN** an address in `active_factors` mapping calls `deregister_factor()`
- **THEN** deregistration succeeds

#### Scenario: Unregistered address deregistration rejected

- **WHEN** an address not in `active_factors` mapping calls `deregister_factor()`
- **THEN** the transaction fails in the finalize block
- **AND** no changes are made to the mapping

### Requirement: Track factor statistics

The system SHALL track total_factored count for each factor, incrementing it whenever they receive a FactoredInvoice.

#### Scenario: Counter initialization on registration

- **WHEN** a factor registers for the first time
- **THEN** total_factored is initialized to 0u64

#### Scenario: Counter increment on factoring

- **WHEN** a `factor_invoice()` transaction succeeds for a registered factor
- **THEN** `active_factors[factor_address].total_factored` is incremented by 1
- **AND** the increment is atomic with the factoring transaction

#### Scenario: Counter persists through deactivation

- **WHEN** a factor deregisters and then re-registers
- **THEN** their total_factored count is reset to 0u64 on re-registration
- **AND** the historical count is overwritten

### Requirement: Store registration timestamp

The system SHALL record the block timestamp when a factor registers.

#### Scenario: Timestamp recording on registration

- **WHEN** a factor successfully registers
- **THEN** registration_date is set to block.timestamp
- **AND** the timestamp is stored in the `active_factors` mapping

#### Scenario: Timestamp update on re-registration

- **WHEN** a deregistered factor re-registers
- **THEN** registration_date is updated to the new block.timestamp
- **AND** the original registration date is overwritten
