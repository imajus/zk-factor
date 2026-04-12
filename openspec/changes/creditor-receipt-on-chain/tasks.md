## 1. Leo Contract — Add CreditorReceipt

> **Note:** Tasks 1.1–1.3 were superseded by an alternative implementation: instead of a private `CreditorReceipt` record, a public `pending_offers: field => PendingOfferInfo` mapping was added. `authorize_factoring` and `authorize_partial_factoring` write entries (is_executed=false) in their finalize blocks; `execute_factoring`/`execute_factoring_token` flip is_executed=true. This achieves cross-device visibility without requiring record scanning.

- [x] ~~1.1 Add `CreditorReceipt` record definition to `aleo/src/main.leo`~~ — replaced by `PendingOfferInfo` struct + `pending_offers` mapping
- [x] ~~1.2 Update `authorize_factoring` return type to emit receipt~~ — finalize block writes to `pending_offers` mapping instead
- [x] ~~1.3 Update `authorize_partial_factoring` return type to emit receipt~~ — finalize block writes to `pending_offers` mapping instead
- [x] 1.4 Run `leo build` from `aleo/` and confirm no errors — build artifacts updated in commit f876e4c

## 2. Contract Deployment

- [x] 2.1 Deploy updated contract to testnet — deployed as `zk_factor_22098.aleo`
- [x] 2.2 Note the new program ID and derive the new program address
- [x] 2.3 Update `VITE_PROGRAM_ID` and `VITE_PROGRAM_ADDRESS` in `client/.env`

## 3. Frontend — BusinessDashboard

> **Note:** 3.1–3.2 were replaced by the mapping approach: `fetchPendingOffer(invoiceHash)` queries `pending_offers` on-chain; spent Invoice records supply private display fields; localStorage fills in while tx is in-flight.

- [x] ~~3.1 Filter for `CreditorReceipt` unspent records~~ — on-chain `pending_offers` mapping used instead via `fetchPendingOffer`
- [x] ~~3.2 Compute `visibleCreditorReceipts`~~ — replaced by on-chain query results filtered by is_executed
- [x] 3.3 Update `renderPendingCards()` to display pending offer data from on-chain source
- [x] 3.4 Update the Pending Offers stat card count and tab badge
- [x] 3.5 Remove `listPendingFactoringRequests` import and localStorage cache fallback from `BusinessDashboard.tsx`

## 4. Frontend — Marketplace

- [x] 4.1 Remove `upsertPendingFactoringRequest` call (and its surrounding `if (address)` block) from `Marketplace.tsx`
- [x] 4.2 Remove `removePendingFactoringRequest` call from the transaction failure handler in `Marketplace.tsx`
- [x] 4.3 Remove `pendingFactoringHashRef` ref and its usages from `Marketplace.tsx`

## 5. Cleanup

- [x] 5.1 Delete `client/src/lib/pending-factoring.ts`
- [x] 5.2 Remove all imports of `pending-factoring` across the codebase

## 6. Verification

- [x] 6.1 Connect wallet as Business, create an invoice, factor it via Marketplace — confirm pending offer appears in Pending Offers tab
- [x] 6.2 Clear browser localStorage, reload — confirm Pending Offers tab still shows the offer
- [x] 6.3 Accept the offer as Factor — confirm the offer disappears from Business's Pending Offers tab
- [x] 6.4 Run `npm run build` from `client/` with no TypeScript errors
