## ADDED Requirements

### Requirement: Fetch protocol statistics from on-chain mappings
The frontend SHALL fetch landing page statistics from the Aleo explorer REST API using raw `fetch()` calls without importing `@provablehq/sdk`. The following metrics SHALL be fetched in parallel:
- `protocol_stats[1u8]` — total invoices factored
- `protocol_stats[2u8]` — total invoices settled
- `protocol_stats[3u8]` — total USDCx volume factored
- `factor_addresses__len__[false]` — registered factors count

#### Scenario: Successful stats fetch
- **WHEN** the landing page mounts and the Aleo explorer API is reachable
- **THEN** all 4 mapping values SHALL be fetched in parallel and displayed in stat cards

#### Scenario: API returns mapping value with Leo suffix
- **WHEN** the explorer API returns `"42u64"` for a mapping value
- **THEN** the value SHALL be parsed as integer `42` (using `parseInt` which handles Leo suffixes)

#### Scenario: Mapping key does not exist (fresh deployment)
- **WHEN** the explorer API returns 404 or error for a mapping key
- **THEN** the value SHALL default to `0`

### Requirement: Display 4 stat cards with real data
The landing page SHALL display exactly 4 stat cards:
1. **Invoices Factored** — from `protocol_stats[1u8]`, formatted with locale separators
2. **Total Volume** — from `protocol_stats[3u8]`, converted from micro-units and formatted as `$XM` or `$XK`
3. **Active Factors** — from `factor_addresses__len__`, displayed as integer
4. **Avg Settlement Time** — hardcoded value `4.2h`

#### Scenario: Stats display with count-up animation
- **WHEN** the stats section scrolls into the viewport and data is loaded
- **THEN** each numeric stat SHALL animate from 0 to its target value

#### Scenario: Loading state
- **WHEN** stats are being fetched
- **THEN** skeleton placeholders SHALL be displayed in place of stat values

#### Scenario: Error state
- **WHEN** the stats fetch fails after retries
- **THEN** each stat SHALL display "---" instead of a number

### Requirement: Auto-refresh statistics
The protocol stats query SHALL use React Query with `staleTime` and `refetchInterval` of 120 seconds to keep data reasonably fresh without excessive API calls.

#### Scenario: Stats refresh periodically
- **WHEN** 120 seconds have elapsed since the last fetch
- **THEN** the stats SHALL be re-fetched in the background without showing a loading state

### Requirement: No WASM dependency on landing page
The landing page data fetching layer SHALL NOT import from `@provablehq/sdk` or any module that transitively imports it. All API calls SHALL use the browser `fetch()` API directly.

#### Scenario: Landing page loads without WASM
- **WHEN** a user navigates to the landing page
- **THEN** no WASM modules SHALL be loaded or initialized
