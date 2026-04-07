## REMOVED Requirements

### Requirement: Factor can create an owned pool
A registered factor SHALL be able to create a `FactorPool` record by calling `create_pool(invoice_hash, target_amount)`, becoming the sole owner who controls execution.

**Reason**: Owned pools rely on private UTXO records that are not discoverable by other users. The ownerless pool system replaces this with a public on-chain mapping visible to all.
**Migration**: Use `create_ownerless_pool` instead.

#### Scenario: Pool creation
- **WHEN** a factor calls `create_pool`
- **THEN** a `FactorPool` record is minted to the caller

### Requirement: Factor can contribute to an owned pool
Factors SHALL be able to contribute credits to an existing `FactorPool` record via `contribute_to_pool`, receiving a `PoolShare` record.

**Reason**: Owned pool contributions depended on the creator sharing pool details out-of-band and a localStorage directory. The ownerless system replaces this with on-chain state.
**Migration**: Use `contribute_to_pool` on ownerless pools via `pool-chain.ts`.

#### Scenario: Pool contribution
- **WHEN** a factor calls `contribute_to_pool` with a valid `FactorPool` record
- **THEN** credits are transferred and a `PoolShare` record is issued

### Requirement: Pool owner can execute owned pool factoring
The `FactorPool` owner SHALL be able to call `execute_pool_factoring` once contributions reach the target, atomically swapping the pool for factoring proceeds.

**Reason**: Superseded by ownerless pool execution flow.
**Migration**: Use the ownerless pool voting and execution transitions.

#### Scenario: Pool execution
- **WHEN** the pool owner calls `execute_pool_factoring` with a funded pool
- **THEN** the pool is closed and proceeds are distributed

### Requirement: Pool owner can recover a closed owned pool
The `FactorPool` owner SHALL be able to call `recover_pool_close` to close a pool when the factoring offer was consumed outside the pool flow.

**Reason**: Edge-case recovery transition with no ownerless equivalent needed; ownerless pools handle this via governance voting.
**Migration**: None required.

#### Scenario: Pool recovery
- **WHEN** the pool owner calls `recover_pool_close`
- **THEN** the pool is marked closed on-chain

### Requirement: Pools page shows legacy owned pool cards
The Pools UI SHALL render `FactorPool` wallet records and localStorage directory entries as pool cards in the Discover tab alongside ownerless pools.

**Reason**: Renders duplicate empty states; owned pools are not discoverable by other users, making the section misleading.
**Migration**: None — the Discover tab will show only ownerless pools.

#### Scenario: Empty discover tab
- **WHEN** a user with no `FactorPool` records and no localStorage entries opens the Discover tab
- **THEN** only the ownerless pools empty state is shown (not a second "No pools yet" card)

## MODIFIED Requirements

### Requirement: Pools Discover tab shows all available pools
The Discover tab SHALL display only ownerless pools fetched from the on-chain public mapping. It SHALL NOT render a separate legacy pool section or a second empty state.

#### Scenario: No ownerless pools exist
- **WHEN** `visibleOwnerlessPools` is empty
- **THEN** only one empty state card is shown: "No ownerless pools on-chain yet"

#### Scenario: Ownerless pools exist
- **WHEN** `visibleOwnerlessPools` is non-empty
- **THEN** pool cards are rendered for each ownerless pool
