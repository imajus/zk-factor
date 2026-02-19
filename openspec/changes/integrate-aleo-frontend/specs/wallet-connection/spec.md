## ADDED Requirements

### Requirement: Provider wraps application root
The app SHALL mount `AleoWalletProvider` from `@provablehq/aleo-wallet-adaptor-react` at the root in `main.tsx`, configured with `ShieldWalletAdapter` and `WalletAdapterNetwork.Testnet`. The existing `WalletProvider` SHALL be removed.

#### Scenario: App initialises with Shield adapter
- **WHEN** the application is loaded in a browser
- **THEN** `AleoWalletProvider` is the outermost React provider wrapping `App`
- **THEN** the Shield wallet adapter is the only entry in the `wallets` array

### Requirement: WalletContext facades adapter hook
`WalletContext.tsx` SHALL re-export a `useWallet` hook that combines the adapter's `useWallet` with app-level state (`activeRole`, `formatAddress`). The signature exposed to the rest of the app SHALL include: `connected`, `address`, `network`, `connecting`, `connect`, `disconnect`, `activeRole`, `setActiveRole`, `formatAddress`.

#### Scenario: Component reads wallet state
- **WHEN** a component calls `useWallet()` from `@/contexts/WalletContext`
- **THEN** it receives `connected`, `address`, and `network` sourced from the adapter
- **THEN** it receives `activeRole` from local context state

#### Scenario: Component calls disconnect
- **WHEN** `disconnect()` is called from `useWallet()`
- **THEN** the adapter's `disconnect()` is invoked
- **THEN** `activeRole` is reset to `null`

### Requirement: Shield Wallet connect button
`WalletConnect.tsx` SHALL render a button that calls the adapter's `connect()` after `selectWallet(shieldAdapter)`. When no wallet extension is detected (`wallets.length === 0`), it SHALL display a link to install Shield Wallet instead.

#### Scenario: User clicks connect with Shield installed
- **WHEN** the user clicks the connect button
- **THEN** the Shield Wallet extension's approval prompt appears
- **THEN** on approval, `connected` becomes `true` and `address` is populated

#### Scenario: Shield Wallet not installed
- **WHEN** the page loads and no wallet adapter is detected
- **THEN** the button is replaced with an "Install Shield Wallet" link

### Requirement: Connection state shown in header
The `Header` component SHALL display the connected address (truncated to first 10 + last 6 characters) and a disconnect option when `connected` is `true`. It SHALL show the connect button when `connected` is `false`.

#### Scenario: Wallet connected
- **WHEN** `connected` is `true`
- **THEN** the header shows the truncated address
- **THEN** a disconnect action is available

#### Scenario: Wallet not connected
- **WHEN** `connected` is `false`
- **THEN** the header renders the `WalletConnect` button
