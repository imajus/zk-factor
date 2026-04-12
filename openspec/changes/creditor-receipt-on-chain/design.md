## Context

The ZK-Factor Leo contract uses a UTXO/record model: records are private, encrypted, and owned by a single address. When a Business calls `authorize_factoring()`, the `Invoice` record is consumed and a `FactoringOffer` record is minted to the Factor. The Business ends up with no on-chain record after this step, so the frontend tracks pending offers in `localStorage` instead. This approach is fragile and non-portable.

The Leo contract is upgradable (admin-controlled `@admin` constructor), so we can add new record types and modify transition signatures via redeployment.

## Goals / Non-Goals

**Goals:**
- Business can see pending offers from any browser/device by querying their wallet
- Remove the localStorage dependency for pending offer tracking
- Maintain full privacy: the CreditorReceipt is private, encrypted with the Business's view key

**Non-Goals:**
- Detecting Factor acceptance/rejection on-chain (the FactoringOffer is private to the Factor; no public signal exists without adding a public mapping)
- Consuming the CreditorReceipt automatically once an offer is accepted (requires additional transition and UX)

## Decisions

### 1. Emit CreditorReceipt as a second output from `authorize_factoring`

**Decision**: Add `CreditorReceipt` to the return tuple of `authorize_factoring` and `authorize_partial_factoring`.

**Rationale**: This is the minimal change — no new transitions, no new mappings. The receipt is private (only the Business's wallet decrypts it), matches the existing record model, and is discoverable via `requestRecords(PROGRAM_ID)`.

**Alternative considered**: A public mapping `pending_offer_by_creditor: field => address` tracking invoice_hash → factor. Rejected because it reveals on-chain that a specific business submitted an offer to a specific factor — a privacy leak.

### 2. Never consume the CreditorReceipt

**Decision**: The receipt is a read-only proof; there is no `consume_creditor_receipt` transition.

**Rationale**: The only signal that an offer is no longer pending is that the invoice appears in `factoredInvoiceHashes` (Factor accepted) or `settledHashes` (invoice settled). The frontend filters stale receipts against these sets. Adding a consume transition adds UX friction (Business would need to manually "clear" receipts) with little benefit.

**Trade-off**: Receipts accumulate in the wallet forever. Acceptable for an MVP — the filter keeps the UI clean and the wallet record count stays low in practice.

### 3. Frontend staleness filter

**Decision**: A CreditorReceipt is considered stale (hidden from Pending Offers) if its `invoice_hash` appears in `factoredInvoiceHashes` (from `FactoredInvoice` records) or `settledHashes` (from `settled_invoices` on-chain mapping check).

**Rationale**: These sets are already computed in `BusinessDashboard` for other tabs. Reusing them avoids new queries.

**Note**: A receipt also becomes stale if the offer was ignored by the Factor indefinitely. There is no on-chain signal for this case; it appears as a permanently pending offer (same behaviour as the current localStorage approach).

### 4. Contract redeployment with a new program ID

**Decision**: Deploy as a new program (new numeric suffix in the ID), update `VITE_PROGRAM_ID` in `client/.env`.

**Rationale**: Leo record structures are immutable once deployed; changing a transition's output tuple requires a fresh deployment. Existing testnet records from the old program ID become unreachable but do not conflict.

## Risks / Trade-offs

- **Forever-accumulating receipts** → Mitigated by UI staleness filter; low practical impact for MVP usage.
- **No rejection signal** → Factor ignoring an offer is indistinguishable from a pending offer. This is a fundamental Leo/UTXO limitation without a public mapping. Documented as known limitation.
- **Redeployment breaks existing testnet state** → Existing Invoice / FactoringOffer / FactoredInvoice records on the old program ID become orphaned. Acceptable for buildathon/testnet. Document in migration steps.
- **Shield Wallet record sync latency** → CreditorReceipt won't appear until the wallet syncs after the transaction confirms (~30–60 seconds). Mitigated by keeping the optimistic UI state via `isLoading` and `refetchOnMount`.

## Migration Plan

1. Add `CreditorReceipt` record and update `authorize_factoring` / `authorize_partial_factoring` in `aleo/src/main.leo`.
2. Build and deploy the updated contract (`leo build && leo deploy`); note the new program ID.
3. Update `VITE_PROGRAM_ID` and `VITE_PROGRAM_ADDRESS` in `client/.env`.
4. Update frontend to filter on `CreditorReceipt` records and remove localStorage calls.
5. Delete `client/src/lib/pending-factoring.ts`.
6. Rollback: revert `VITE_PROGRAM_ID` to the old value; old localStorage data still present for users who hadn't cleared it.

## Open Questions

- Should we add a `requested_at` field (block timestamp) to `CreditorReceipt` for display sorting? (`block.timestamp` is available in Leo but only in finalize context — would need a mapping to persist it, or omit and sort by wallet discovery order.)
