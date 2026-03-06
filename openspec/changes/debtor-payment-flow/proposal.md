# Proposal: On-Chain Debtor Payment Flow

## Why

The original `factor_invoice` had a self-payment bug — the business was caller
and paid themselves instead of the factor. Separately, there was no way for
debtors to pay on-chain at all.

This change fixes both problems and adds a complete end-to-end payment loop.

## What Changed

### Smart Contract (zk_factor_9591.aleo)

- Replaced `factor_invoice` with two-step handshake:
  - `authorize_factoring` — business calls, Invoice consumed, FactoringOffer sent to factor
  - `execute_factoring` — factor calls, factor pays business with their own credits
- Added `FactoringOffer` record type (bridge between step 1 and step 2)
- Added `create_payment_request` — factor publishes payment details publicly
- Added `pay_invoice` — records settlement on-chain (payment handled separately)
- Added `payment_requests` public mapping (keyed by invoice_hash)
- Added `PaymentRequest` struct

### Frontend

- New `/pay` page — debtor-facing, no login required
- New "Pending Offers" tab in Invoices page (factor view)
- New "Request Payment" button on FactoredInvoice (factor action)
- New "Copy Payment Link" button on Invoice (business action) and FactoredInvoice (factor action)
- Header: "Pay an Invoice" link shown to non-connected users
- Two-step payment in frontend: `credits.aleo/transfer_public` then `pay_invoice`

## What Information Is Exposed When Copying the Payment Link

The link format is:

```
https://yourapp.com/pay?hash=<invoice_hash>
```

The invoice_hash is a public field element. Once the factor calls
`create_payment_request`, the following data becomes **publicly visible
on-chain** to anyone who queries the `payment_requests` mapping:

| Field        | Value                        | Who can see                     |
| ------------ | ---------------------------- | ------------------------------- |
| invoice_hash | e.g. 97440390...field        | Everyone (it's the mapping key) |
| amount       | e.g. 10000000 (microcredits) | Everyone                        |
| due_date     | Unix timestamp               | Everyone                        |
| factor       | Factor's wallet address      | Everyone                        |
| debtor       | Debtor's wallet address      | Everyone                        |

**Privacy implication:** Once the factor calls `create_payment_request`,
the debtor's address and the invoice amount are public. This is intentional —
the debtor needs to know the amount, and the contract needs to verify the
correct debtor is paying.

The business should be aware of this before copying the link. The link
itself is harmless — it only becomes meaningful after `create_payment_request`
is called.
