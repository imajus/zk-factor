## ADDED Requirements

### Requirement: Pool detail route exists at /pools/:hash
The system SHALL render a dedicated page at `/pools/:hash` protected by the same RequireAuth and RequireFactor guards as `/pools`.

#### Scenario: Authenticated factor navigates to pool detail
- **WHEN** an authenticated factor visits `/pools/<valid-hash>`
- **THEN** the pool detail page renders with the pool's name, stats, timeline, and actions

#### Scenario: Unauthenticated user visits pool detail URL
- **WHEN** an unauthenticated user visits `/pools/<hash>`
- **THEN** they are redirected to `/connect`

#### Scenario: Non-factor role visits pool detail URL
- **WHEN** a business role user visits `/pools/<hash>`
- **THEN** they are redirected to `/dashboard`

#### Scenario: Unknown hash in URL
- **WHEN** a factor visits `/pools/<hash>` for a hash that does not match any on-chain pool
- **THEN** a "Pool not found" message is shown with a back link to `/pools`

### Requirement: Pool detail page displays pool information
The page SHALL display the pool name, full hash, status badge, stats grid (current funds, percent text, addresses involved), pool configuration (advance range, minimum contribution), and the PoolTimeline component.

#### Scenario: Open pool with contributions
- **WHEN** the pool is open and has contributions
- **THEN** stats grid shows current funds in ALEO and "X ALEO raised" percent text

#### Scenario: Executed pool with proceeds
- **WHEN** the pool is closed, executed, and has proceeds open
- **THEN** percent text shows "X% claimed"

#### Scenario: Pool has a pending offer
- **WHEN** pool.pendingOffer is non-null
- **THEN** a pending offer block is shown with creditor address, debtor address, advance rate, advance amount, and vote count vs threshold

### Requirement: Contribute form on detail page
The page SHALL show an inline contribute form when the pool is open (`!pool.isClosed`), allowing the user to enter an amount and submit a `pool_contribute` transaction.

#### Scenario: User submits a valid contribution
- **WHEN** the user enters an amount ≥ minContribution and clicks Contribute
- **THEN** a `pool_contribute` transaction is executed and a success toast is shown

#### Scenario: User submits below minimum contribution
- **WHEN** the user enters an amount below the pool's minContribution
- **THEN** an error toast is shown and no transaction is submitted

#### Scenario: Insufficient public balance
- **WHEN** the entered amount exceeds the user's public credits balance
- **THEN** an error toast is shown and no transaction is submitted

#### Scenario: Pool is closed
- **WHEN** pool.isClosed is true
- **THEN** the contribute form is not rendered

### Requirement: Open Distribution action on detail page
The page SHALL show an Open Distribution button when the pool is settled, closed, and proceeds have not yet been opened (`pool.isSettled && pool.isClosed && pool.proceeds === null`).

#### Scenario: Distribution not yet opened
- **WHEN** pool.isSettled is true, pool.isClosed is true, and pool.proceeds is null
- **THEN** an "Open Distribution" button is shown with a permissionless note

#### Scenario: User clicks Open Distribution
- **WHEN** the user clicks Open Distribution
- **THEN** a `pool_open_distribution` transaction is submitted

#### Scenario: Distribution already opened
- **WHEN** pool.proceeds is non-null
- **THEN** the Open Distribution button is not shown

### Requirement: Back navigation from pool detail
The page SHALL provide a back link to `/pools`.

#### Scenario: User clicks back link
- **WHEN** the user clicks the back link on the detail page
- **THEN** they are navigated to `/pools`

### Requirement: Pool cards are navigation-only
On the `/pools` list page, pool cards SHALL NOT contain Contribute or Open Distribution buttons. Clicking a card navigates to `/pools/:hash`.

#### Scenario: User clicks a pool card
- **WHEN** the user clicks anywhere on a pool card in the Discover tab
- **THEN** the browser navigates to `/pools/<pool.meta.invoiceHash>`

#### Scenario: Pool cards have no action buttons
- **WHEN** the Discover tab is rendered
- **THEN** no Contribute or Open Distribution buttons are present on the cards
