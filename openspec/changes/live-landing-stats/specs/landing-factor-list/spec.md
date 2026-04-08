## ADDED Requirements

### Requirement: Fetch recently registered factors from on-chain data
The frontend SHALL enumerate the most recent factor registrations by reading the `factor_addresses` storage vector (last N entries) and their corresponding `active_factors` mapping entries. Only active factors (`is_active: true`) SHALL be included.

#### Scenario: Fetch recent factors
- **WHEN** the landing page mounts and the API is reachable
- **THEN** the system SHALL read `factor_addresses__len__[false]` to get total count, read the last N addresses from `factor_addresses__[<index>u32]`, fetch each factor's `active_factors` mapping entry, filter to active factors, and return up to 5 results sorted by registration date descending

#### Scenario: No factors registered
- **WHEN** `factor_addresses__len__` returns 0 or is not found
- **THEN** the factor list SHALL display an empty state message

#### Scenario: Factor fetch error
- **WHEN** the API call fails
- **THEN** the factor list section SHALL display a graceful error state

### Requirement: Display recent factors on landing page
The landing page SHALL replace the "Recent Activity" section with a "Recent Factors" section displaying a list of recently registered factors. Each factor entry SHALL show:
- Truncated wallet address (e.g., `aleo1x9r...3kcu`)
- Advance rate range (e.g., `85% – 95%`) derived from `min_advance_rate` and `max_advance_rate` basis points
- Total invoices factored count from `total_factored`
- Registration time from `registration_date` formatted as relative time (e.g., "2h ago") or date

#### Scenario: Factor list renders with data
- **WHEN** factor data is loaded
- **THEN** each factor row SHALL display address, rate range, factored count, and registration time in a card with divider rows

#### Scenario: Factor list loading state
- **WHEN** factor data is being fetched
- **THEN** skeleton placeholder rows SHALL be displayed

### Requirement: Factor list auto-refresh
The recent factors query SHALL use React Query with `staleTime` and `refetchInterval` of 120 seconds.

#### Scenario: Factor list refreshes periodically
- **WHEN** 120 seconds have elapsed since the last fetch
- **THEN** the factor list SHALL be re-fetched in the background
