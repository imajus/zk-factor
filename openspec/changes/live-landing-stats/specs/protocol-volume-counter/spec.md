## ADDED Requirements

### Requirement: Track total USDCx factored volume on-chain
The smart contract SHALL maintain a cumulative total of all USDCx invoice amounts factored, stored in `protocol_stats[3u8]` as a `u64` value in micro-units. Only the stablecoin factoring path (`execute_factoring_token`) SHALL increment this counter. The credits-based factoring path and pool factoring path SHALL NOT affect this counter.

#### Scenario: USDCx factoring increments volume counter
- **WHEN** a factor executes `execute_factoring_token` with an offer of amount `100000u64`
- **THEN** `protocol_stats[3u8]` SHALL increase by `100000u64`

#### Scenario: Credits factoring does not affect volume counter
- **WHEN** a factor executes `execute_factoring` (native credits path) with any amount
- **THEN** `protocol_stats[3u8]` SHALL remain unchanged

#### Scenario: Volume counter starts at zero
- **WHEN** `protocol_stats[3u8]` has never been written (fresh deployment)
- **THEN** the finalize function SHALL use `Mapping::get_or_use` with default `0u64`

#### Scenario: Volume accumulates across multiple transactions
- **WHEN** two USDCx factoring transactions complete with amounts `50000u64` and `30000u64`
- **THEN** `protocol_stats[3u8]` SHALL equal the sum of both amounts plus any prior value
