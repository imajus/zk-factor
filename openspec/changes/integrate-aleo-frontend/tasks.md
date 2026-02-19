## 1. Install Adapter Dependencies

- [ ] 1.1 Add `@provablehq/aleo-wallet-adaptor-react` to `client/package.json`
- [ ] 1.2 Add `@provablehq/aleo-wallet-adaptor-react-ui` to `client/package.json`
- [ ] 1.3 Add `@provablehq/aleo-wallet-adaptor-core` to `client/package.json`
- [ ] 1.4 Add `@provablehq/aleo-wallet-standard` to `client/package.json`
- [ ] 1.5 Add `@provablehq/aleo-wallet-adaptor-shield` to `client/package.json`
- [ ] 1.6 Add `@provablehq/aleo-types` to `client/package.json`
- [ ] 1.7 Run `npm install` in `client/` and verify no peer dependency errors

## 2. Wire AleoWalletProvider in main.tsx

- [ ] 2.1 Import `AleoWalletProvider`, `WalletAdapterNetwork` from `@provablehq/aleo-wallet-adaptor-react`
- [ ] 2.2 Import `ShieldWalletAdapter` from `@provablehq/aleo-wallet-adaptor-shield`
- [ ] 2.3 Instantiate `ShieldWalletAdapter` and pass to `AleoWalletProvider wallets` prop
- [ ] 2.4 Set `network={WalletAdapterNetwork.Testnet}` on the provider
- [ ] 2.5 Set `decryptPermission` to `AutoDecrypt` so `requestRecords` returns plaintext
- [ ] 2.6 Remove the existing `<WalletProvider>` wrapper from `main.tsx`

## 3. Rewrite WalletContext Facade

- [ ] 3.1 Rewrite `client/src/contexts/WalletContext.tsx` to call `useWallet()` from `@provablehq/aleo-wallet-adaptor-react` internally
- [ ] 3.2 Map adapter fields: `connected → isConnected`, `address`, `network`, `connecting`
- [ ] 3.3 Keep `activeRole` (business | factor | null) in local `useState` within the context
- [ ] 3.4 Implement `setActiveRole` to update local role state; reset to `null` on disconnect
- [ ] 3.5 Implement `formatAddress(address, chars?)` helper (first 10 + `…` + last `chars` chars)
- [ ] 3.6 Expose `connect()` and `disconnect()` delegating to adapter methods
- [ ] 3.7 Remove all mock state, `MOCK_ADDRESS`, `syncWallet`, `syncProgress`, `lastSyncTime`, `roles`, `balance` from context

## 4. Replace WalletConnect Component

- [ ] 4.1 Rewrite `client/src/components/wallet/WalletConnect.tsx` to use `useWallet()` from `@/contexts/WalletContext`
- [ ] 4.2 Call `selectWallet(shieldAdapter)` then `connect()` on button click
- [ ] 4.3 Show "Install Shield Wallet" link when `wallets.length === 0` (no adapter detected)
- [ ] 4.4 Show connected address (truncated) and disconnect button when `connected` is true
- [ ] 4.5 Update `Header.tsx` if it renders wallet state separately to use the new context shape

## 5. Wire CreateInvoice → mint_invoice

- [ ] 5.1 Import `useWallet` from `@/contexts/WalletContext` in `CreateInvoice.tsx`
- [ ] 5.2 Disable submit button and label "Connect Wallet" when `connected` is false
- [ ] 5.3 On submit, convert amount from ALEO decimal to microcredits: `Math.round(parseFloat(amount) * 1_000_000)` as `u64`
- [ ] 5.4 On submit, convert due date `Date` to Unix seconds: `Math.floor(dueDate.getTime() / 1000)` as `u64`
- [ ] 5.5 Compute `invoice_hash` field using Aleo SDK Poseidon2 hash over canonical invoice data
- [ ] 5.6 Encode `metadata` as `u128` from `invoiceNumber` string (e.g. first 16 bytes as hex)
- [ ] 5.7 Call `executeTransaction` with program `zk_factor_11765.aleo`, function `mint_invoice`, inputs array
- [ ] 5.8 Store returned `txId` and start polling `transactionStatus(txId)` every 3 seconds
- [ ] 5.9 Show toast phases: "Generating proof…" → "Broadcasting…" → "Confirmed" / error
- [ ] 5.10 On confirmed, navigate to `/invoices`; on error, show error toast and keep form enabled

## 6. Wire Invoices Page — Record Discovery + Settle

- [ ] 6.1 Remove import of `mockInvoices`, `formatAleo`, `formatDate`, `getDaysUntilDue` from `mock-data.ts` in `Invoices.tsx`
- [ ] 6.2 Add `useQuery` (React Query) calling `requestRecords('zk_factor_11765.aleo', true)` with 60-second stale time
- [ ] 6.3 Filter returned records to type `Invoice` owned by connected address
- [ ] 6.4 Map `Invoice` record fields: `amount` (microcredits → ALEO), `due_date` (unix → Date), `debtor`
- [ ] 6.5 Show skeleton rows while query is loading
- [ ] 6.6 Show error state with "Retry" button on query failure
- [ ] 6.7 Show "Connect your wallet to view invoices" prompt when `connected` is false
- [ ] 6.8 Add "Settle" dropdown action for `FactoredInvoice` records owned by address
- [ ] 6.9 On "Settle" click, call `executeTransaction` for `settle_invoice` with selected `FactoredInvoice` record and credits record
- [ ] 6.10 Poll `transactionStatus` after settle call; show progress toast; invalidate records query on confirmed

## 7. Wire Marketplace — Active Factors + factor_invoice

- [ ] 7.1 Remove import of `mockFactors` from `mock-data.ts` in `Marketplace.tsx`
- [ ] 7.2 Fetch `active_factors` entries from Aleo explorer REST API using `useQuery` (endpoint: `GET /program/zk_factor_11765.aleo/mapping/active_factors`)
- [ ] 7.3 Filter to entries where `is_active = true`
- [ ] 7.4 Map `FactorInfo` fields: display `min_advance_rate` and `max_advance_rate` as percentages (value / 100)
- [ ] 7.5 Show loading skeleton and error state for factors query
- [ ] 7.6 Wire "Factor Invoice" action: show dialog to select an Invoice record and input advance rate
- [ ] 7.7 Validate advance rate is between 5000–9900 basis points; disable button otherwise
- [ ] 7.8 On confirm, call `executeTransaction` for `factor_invoice` with inputs: `[invoice_record, factor_address, advance_rate_u16, credits_record]`
- [ ] 7.9 Poll `transactionStatus`; show progress toast; invalidate records query on confirmed

## 8. Wire Settings — Register / Deregister Factor

- [ ] 8.1 Add "Factor Registration" section to `Settings.tsx`
- [ ] 8.2 Add min and max advance rate inputs (validated: 5000–9900, min ≤ max)
- [ ] 8.3 Wire "Register as Factor" button to `executeTransaction` for `register_factor` with `[min_u16, max_u16]`
- [ ] 8.4 Wire "Deregister" button to `executeTransaction` for `deregister_factor` with no inputs
- [ ] 8.5 Show current registration status by querying `active_factors[address]` from the mapping
- [ ] 8.6 Show error toast "Already registered as factor" on duplicate registration failure

## 9. Wire Transactions Page

- [ ] 9.1 Remove mock transaction data import from `Transactions.tsx`
- [ ] 9.2 Call `requestTransactionHistory()` via `useQuery` with 60-second stale time
- [ ] 9.3 Display each transaction: truncated ID, function name, timestamp, status
- [ ] 9.4 Show "No transactions yet" empty state
- [ ] 9.5 Show loading skeleton and error state

## 10. Remove Mock Data

- [ ] 10.1 Verify no remaining imports of `@/lib/mock-data` across all files using grep
- [ ] 10.2 Delete `client/src/lib/mock-data.ts`
- [ ] 10.3 Run `npm run build` in `client/` and confirm no TypeScript errors
