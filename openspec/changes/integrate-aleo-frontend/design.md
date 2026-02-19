## Context

The frontend (`client/`) has a fully-built UI with mock data and a fake `WalletContext`. The Aleo smart contract (`zk_factor_11765.aleo`) is deployed with five transitions: `mint_invoice`, `register_factor`, `deregister_factor`, `factor_invoice`, and `settle_invoice`. The Aleo Wallet Adapter (`@provablehq/aleo-wallet-adaptor-react`) provides a React provider + `useWallet` hook abstracting Shield Wallet connection, record access, and transaction execution.

Current state issues:
- `WalletContext.tsx` simulates wallet with hardcoded address and `setTimeout` delays
- All pages (`Invoices`, `Marketplace`, `Transactions`) import from `mock-data.ts`
- `CreateInvoice.tsx` fakes proof generation with `setTimeout`
- `WalletConnect.tsx` calls mock `connect()`

## Goals / Non-Goals

**Goals:**
- Wire Shield Wallet via Aleo Wallet Adapter provider into `main.tsx`
- Replace `WalletContext` with a thin facade over the adapter's `useWallet` hook, preserving app-level concepts (`activeRole`, `formatAddress`)
- Implement `mint_invoice` execution from `CreateInvoice.tsx`
- Implement `factor_invoice` execution from `Marketplace.tsx`
- Implement `settle_invoice` execution from `Invoices.tsx`
- Implement `register_factor` / `deregister_factor` from `Settings.tsx`
- Replace mock record lists with `requestRecords()` calls for `Invoice` and `FactoredInvoice`
- Wire `Transactions.tsx` to `requestTransactionHistory()`
- Remove `mock-data.ts` entirely

**Non-Goals:**
- Building a custom wallet adapter (use Shield adapter package as-is)
- Multi-wallet support (Shield only for MVP)
- Off-chain indexer or backend API
- Partial factoring, recourse tracking, or multi-factor syndication
- Changing the smart contract

## Decisions

### 1. Thin WalletContext facade over adapter hook

**Decision:** Keep `WalletContext.tsx` as a React Context but implement it by calling `useWallet()` from `@provablehq/aleo-wallet-adaptor-react` internally. The context adds only app-specific state: `activeRole` (business/factor) and `formatAddress` helper.

**Rationale:** Pages already import `useWallet` from `@/contexts/WalletContext`. Preserving this import path means zero changes in consuming components for wallet state. The adapter's `useWallet` fields (`connected`, `address`, `network`) map cleanly to the existing interface.

**Alternative considered:** Delete `WalletContext` and import adapter's `useWallet` directly in every component. Rejected because it scatters the `activeRole` logic and requires touching every page.

### 2. AleoWalletProvider wraps the entire app in main.tsx

**Decision:** In `main.tsx`, wrap `<App />` with `<AleoWalletProvider wallets={[new ShieldWalletAdapter()]} network={WalletAdapterNetwork.Testnet}>`.

**Rationale:** The adapter provider must be an ancestor of any component using `useWallet`. Placing it at the root ensures availability everywhere without prop drilling. The existing `<WalletProvider>` wrapper is removed.

**Alternative considered:** Wrapping only pages that need wallet access. Rejected because `Header` and layout components also need connection state.

### 3. Transaction parameters encode amounts as microcredits (u64)

**Decision:** All ALEO amounts in the UI (displayed as decimal ALEO) are converted to microcredits (`Math.round(aleo * 1_000_000)`) before passing to `executeTransaction`. Due dates are converted to Unix timestamps as `u64`. Invoice hash is computed client-side as a Poseidon2 hash of `(invoiceNumber + debtor + amount)` represented as a `field` element.

**Rationale:** The contract operates in microcredits (`u64`) and uses `u64` Unix timestamps for `due_date`. The hash must be a `field` type matching the contract's `invoice_hash` parameter.

**Alternative considered:** Using a backend to compute the field hash. Rejected — the adapter and Aleo SDK provide field arithmetic client-side.

### 4. Record discovery via requestRecords, displayed as-is

**Decision:** `requestRecords('zk_factor_11765.aleo', true)` returns plaintext records when `decryptPermission` is set to `AutoDecrypt`. Records are displayed directly; no local caching layer is added.

**Rationale:** For MVP the blockchain is the source of truth. React Query is already in the stack — wrap `requestRecords` in a `useQuery` with a 60-second stale time to avoid hammering the wallet on every render.

**Alternative considered:** Polling an Aleo explorer API for records. Rejected — requires no additional dependency; wallet has the user's view key and can decrypt inline.

### 5. Proof generation progress via polling transactionStatus

**Decision:** After calling `executeTransaction()`, poll `transactionStatus(txId)` every 3 seconds, showing a toast with the current phase ("Generating proof…", "Broadcasting…", "Confirmed"). On confirmed, invalidate the `useQuery` cache for records.

**Rationale:** The adapter returns a transaction ID synchronously; the proof is generated async in the wallet extension. Polling is the only mechanism available.

**Alternative considered:** Callback-based subscription. Not available in current adapter API.

### 6. role determination stays client-side

**Decision:** `activeRole` is stored in local component state within the `WalletContext` facade. Users toggle roles via `Settings.tsx` or a role switcher in the header. The contract's `active_factors` mapping is queried (via `requestRecords` or explorer API) to validate if a connected address is a registered factor.

**Rationale:** The contract has no concept of user roles in records — it's inferred from which records the address holds (Invoice = business; FactoredInvoice owner = factor). Keeping role state client-side is consistent with the existing UX.

## Risks / Trade-offs

- **Wallet sync latency** → Records may not appear immediately after a transaction. Mitigation: show a "Records syncing…" state with a refresh button; use optimistic UI to add the new record locally before confirmation.
- **Proving time UX** → First proof synthesis is 5-7 minutes. Mitigation: warn users with an inline alert on first transaction; subsequent proofs show a 30-60s progress indicator.
- **Field hash client-side computation** → If the hash algorithm or encoding differs from what the contract expects, `mint_invoice` will fail. Mitigation: test against deployed contract on testnet before shipping.
- **Shield Wallet availability** → Users without Shield Wallet installed see no wallet. Mitigation: show install link if no wallet detected via `wallets.length === 0`.
- **mock-data.ts removal** → Any component importing from `mock-data.ts` breaks at compile time. Mitigation: grep for all imports, replace all before deleting the file.

## Migration Plan

1. Install adapter packages (`npm install` in `client/`)
2. Update `main.tsx` — add `AleoWalletProvider` + `ShieldWalletAdapter`
3. Rewrite `WalletContext.tsx` facade
4. Replace `WalletConnect.tsx` button
5. Wire `CreateInvoice.tsx` → `mint_invoice`
6. Wire `Invoices.tsx` — replace mock list with `requestRecords`, add settle action
7. Wire `Marketplace.tsx` — replace mock factors with `active_factors` query; add `factor_invoice` flow
8. Wire `Settings.tsx` — add register/deregister factor buttons
9. Wire `Transactions.tsx` → `requestTransactionHistory`
10. Delete `mock-data.ts`
11. Smoke test on Aleo testnet with Shield Wallet

**Rollback:** Revert to mock WalletContext by reverting `main.tsx` and `WalletContext.tsx`; no contract changes required.

## Open Questions

- Does `@provablehq/aleo-wallet-adaptor-shield` need the Shield Wallet browser extension installed at build time, or only at runtime?
- What is the correct field encoding for the Poseidon2 invoice hash on the client side — does the SDK expose `Poseidon2.hash`?
- Does `requestRecords` return both spent and unspent records, or only unspent? Settlement depends on distinguishing consumed `FactoredInvoice` records.
