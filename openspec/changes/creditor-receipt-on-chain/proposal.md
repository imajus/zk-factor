## Why

After a Business calls `authorize_factoring()`, the Invoice record they owned is consumed and a `FactoringOffer` record is created in the **Factor's** wallet — leaving the Business with no on-chain record to query. The frontend works around this by saving offer metadata to `localStorage` before submitting the transaction, which is fragile: data is lost on browser/device change, stale entries persist on transaction failure, and there is no way to detect when the Factor has accepted.

## What Changes

- **New Leo record `CreditorReceipt`**: emitted to the original creditor (Business) as a second output of `authorize_factoring` and `authorize_partial_factoring`, giving them a private, wallet-queryable proof of their pending offer.
- **`authorize_factoring` signature change** (**BREAKING**): return type changes from `(FactoringOffer, Final)` to `(FactoringOffer, CreditorReceipt, Final)` — requires contract redeployment with a new program ID.
- **`authorize_partial_factoring` signature change** (**BREAKING**): return type changes from `(FactoringOffer, Invoice, Final)` to `(FactoringOffer, Invoice, CreditorReceipt, Final)`.
- **Frontend "Pending Offers" tab**: reads `CreditorReceipt` records from the wallet instead of `localStorage`.
- **Remove localStorage pending-offers tracking**: `upsertPendingFactoringRequest` / `removePendingFactoringRequest` calls removed from `Marketplace.tsx`; `pending-factoring.ts` deleted.

## Capabilities

### New Capabilities
- `creditor-receipt`: Private on-chain receipt minted to the Business when they authorize factoring; enables wallet-native pending offer discovery without localStorage.

### Modified Capabilities

(none — no existing spec files in this repo)

## Impact

- **`aleo/src/main.leo`**: add `CreditorReceipt` record definition; modify `authorize_factoring` and `authorize_partial_factoring` transitions.
- **Contract redeployment required**: new program ID must be set in `client/.env` (`VITE_PROGRAM_ID`).
- **`client/src/components/dashboard/BusinessDashboard.tsx`**: replace `listPendingFactoringRequests` with `CreditorReceipt` record queries.
- **`client/src/pages/Marketplace.tsx`**: remove localStorage save/remove calls around `authorize_factoring`.
- **`client/src/lib/pending-factoring.ts`**: deleted.
