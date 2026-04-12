## 1. Leo Contract — Add CreditorReceipt

- [ ] 1.1 Add `CreditorReceipt` record definition to `aleo/src/main.leo` (fields: owner, factor, debtor, amount, advance_rate, due_date, invoice_hash, use_token, recourse)
- [ ] 1.2 Update `authorize_factoring` return type to `(FactoringOffer, CreditorReceipt, Final)` and mint the receipt to `self.caller`
- [ ] 1.3 Update `authorize_partial_factoring` return type to `(FactoringOffer, Invoice, CreditorReceipt, Final)` and mint the receipt with `factoring_amount` as the amount
- [ ] 1.4 Run `leo build` from `aleo/` and confirm no errors

## 2. Contract Deployment

- [ ] 2.1 Deploy updated contract to testnet (`leo deploy` from `aleo/`)
- [ ] 2.2 Note the new program ID and derive the new program address
- [ ] 2.3 Update `VITE_PROGRAM_ID` and `VITE_PROGRAM_ADDRESS` in `client/.env`

## 3. Frontend — BusinessDashboard

- [ ] 3.1 In `BusinessDashboard.tsx`, add filter for `CreditorReceipt` unspent records from `records`
- [ ] 3.2 Compute `visibleCreditorReceipts` by filtering out hashes present in `factoredInvoiceHashes` and `settledHashes`
- [ ] 3.3 Update `renderPendingCards()` to map over `visibleCreditorReceipts` using `getField` (extract factor, debtor, amount, advance_rate, due_date, invoice_hash, use_token)
- [ ] 3.4 Update the Pending Offers stat card count and tab badge to use `visibleCreditorReceipts.length + submittedPoolOffers.length`
- [ ] 3.5 Remove the import and usage of `listPendingFactoringRequests` from `BusinessDashboard.tsx`

## 4. Frontend — Marketplace

- [ ] 4.1 Remove `upsertPendingFactoringRequest` call (and its surrounding `if (address)` block) from `Marketplace.tsx`
- [ ] 4.2 Remove `removePendingFactoringRequest` call from the transaction failure handler in `Marketplace.tsx`
- [ ] 4.3 Remove `pendingFactoringHashRef` ref and its usages from `Marketplace.tsx`

## 5. Cleanup

- [ ] 5.1 Delete `client/src/lib/pending-factoring.ts`
- [ ] 5.2 Remove any remaining imports of `pending-factoring` across the codebase

## 6. Verification

- [ ] 6.1 Connect wallet as Business, create an invoice, factor it via Marketplace — confirm `CreditorReceipt` appears in Pending Offers tab
- [ ] 6.2 Clear browser localStorage, reload — confirm Pending Offers tab still shows the offer
- [ ] 6.3 Accept the offer as Factor — confirm the receipt disappears from Business's Pending Offers tab (filtered by factoredInvoiceHashes)
- [ ] 6.4 Run `npm run build` from `client/` with no TypeScript errors
