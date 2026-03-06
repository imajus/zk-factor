# Requirements

## Contract

### authorize_factoring (replaces factor_invoice)

- Business calls with: Invoice record, factor address, advance_rate (u16, 5000–9900)
- Invoice record is consumed (double-spend prevention)
- FactoringOffer record created and owned by factor
- Factor must be registered and active (checked in finalize)
- Business does NOT provide payment — no credits input at this step

### execute_factoring

- Factor calls with: FactoringOffer record, credits record
- Factor must be offer.owner
- Advance amount calculated: (amount \* advance_rate) / 10000
- Factor's credits transferred to business via credits.aleo/transfer_private
- FactoredInvoice record created and owned by factor
- Factor still active check in finalize

### create_payment_request

- Factor calls with: FactoredInvoice record
- Record returned unchanged (not consumed)
- Publishes { factor, amount, due_date, debtor } to payment_requests mapping
- Fails if invoice already settled
- Fails if payment request already exists (no overwrite)

### pay_invoice

- Debtor calls with: invoice_hash, amount, factor address
- No internal credits.aleo call (wallet compatibility)
- Finalize verifies: debtor matches, amount sufficient, factor matches, not settled
- Marks invoice as settled in settled_invoices mapping
- Updates protocol_stats key 2 (total settled)

## Frontend

### /pay page

- Accessible without wallet connection (lookup only)
- Auto-fills hash from ?hash= URL param and triggers lookup
- Reads payment_requests mapping via AleoNetworkClient
- Shows: amount, due date, pay-to address (truncated), payment method
- Warns if connected wallet is not the expected debtor
- Two-step payment: credits.aleo/transfer_public → pay_invoice
- Success screen with option to pay another invoice
- Error message distinguishes "not found" from "payment not ready yet"

### Invoices page — Pending Offers tab

- Filters records where recordName === "FactoringOffer" && !spent
- Shows: invoice hash, business address, amount, advance rate
- "Accept Offer" triggers execute_factoring
- Auto-converts public credits to private if no private record found

### Invoices page — Factored tab additions

- "Request Payment" button → calls create_payment_request
- Shows friendly error if already requested
- "Copy Payment Link" button → copies /pay?hash=<invoice_hash> to clipboard

### Invoices page — Invoice tab additions

- "Copy Debtor Payment Link" button → copies /pay?hash=<invoice_hash>
- Link works only after factor calls create_payment_request

### Header

- Non-connected users see "Pay an Invoice" ghost button linking to /pay
- "Pay Invoice" removed from main nav (debtor doesn't use the app)

## Privacy / Data Exposure Rules

- Payment link URL contains invoice_hash only — safe to share anytime
- Link is inert until factor calls create_payment_request
- After create_payment_request: amount, debtor address, factor address are PUBLIC
- Business must understand this before sharing the link
- UI should warn: "Sharing this link after payment is requested will expose the invoice amount and your debtor's address publicly on-chain"
