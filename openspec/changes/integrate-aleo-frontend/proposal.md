## Why

The frontend uses a mock `WalletContext` with hardcoded state and no real blockchain interaction. The Aleo smart contract (`zk_factor_11765.aleo`) is implemented and ready; the frontend must now connect to it via Shield Wallet using the `@provablehq/aleo-wallet-adaptor-react` library to enable real invoice factoring flows.

## What Changes

- **BREAKING**: Replace `src/contexts/WalletContext.tsx` mock implementation with Aleo Wallet Adapter provider wrapping Shield Wallet
- Add `@provablehq/aleo-wallet-adaptor-react`, `@provablehq/aleo-wallet-adaptor-react-ui`, `@provablehq/aleo-wallet-adaptor-core`, `@provablehq/aleo-wallet-standard`, `@provablehq/aleo-wallet-adaptor-shield`, and `@provablehq/aleo-types` dependencies
- Implement `mint_invoice()` transaction execution from the Create Invoice form
- Implement `factor_invoice()` transaction execution from the Marketplace page
- Implement `settle_invoice()` transaction execution from the Invoices page
- Implement `requestRecords()` to fetch Invoice and FactoredInvoice records from the blockchain
- Remove `src/lib/mock-data.ts` and all mock data usage in pages
- Add transaction status polling and proof generation progress indicators throughout the UI

## Capabilities

### New Capabilities

- `wallet-connection`: Shield Wallet connection and disconnection via Aleo Wallet Adapter, exposing address, network, and connection state to the app
- `invoice-registration`: UI flow for creating an invoice record on-chain via `mint_invoice()`, including form submission, proof generation progress, and record confirmation
- `invoice-factoring`: UI flow for a business to sell an invoice to a factor via `factor_invoice()`, and for a factor to browse available invoices in the marketplace
- `invoice-settlement`: UI flow for settling a factored invoice via `settle_invoice()`, consuming the FactoredInvoice record
- `record-discovery`: Fetching and displaying the user's Invoice and FactoredInvoice records from the blockchain using `requestRecords()`

### Modified Capabilities

## Impact

- `client/package.json`: Add six `@provablehq/*` adapter packages
- `client/src/main.tsx`: Wrap app in `AleoWalletProvider` with Shield wallet adapter
- `client/src/contexts/WalletContext.tsx`: **Replace** with thin wrapper re-exporting `useWallet` from adapter; remove all mock state
- `client/src/lib/mock-data.ts`: **Delete**
- `client/src/pages/CreateInvoice.tsx`: Wire form submit to `executeTransaction()` calling `mint_invoice`
- `client/src/pages/Marketplace.tsx`: Replace mock listings with `requestRecords()` for FactoredInvoice; wire factor action to `factor_invoice`
- `client/src/pages/Invoices.tsx`: Replace mock list with `requestRecords()` for Invoice; wire settle action to `settle_invoice`
- `client/src/pages/Transactions.tsx`: Wire to `requestTransactionHistory()`
- `client/src/components/wallet/WalletConnect.tsx`: Replace mock button with `WalletMultiButton` from adapter UI or custom Shield-only connect flow
