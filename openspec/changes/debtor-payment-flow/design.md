# Design

## The Core Problem (EVM analogy)

In EVM you can do:

```solidity
IERC20(token).transferFrom(business, factor, amount); // works fine
```

In Aleo, all record inputs must be owned by self.caller.
The business can't hand over the factor's payment — they don't own it.
So a single atomic swap is impossible.

## Solution: Two-Step Handshake

```
Step 1 — authorize_factoring (business calls)
  Business owns: Invoice record
  Output: FactoringOffer owned by factor
  Effect: Invoice consumed (double-spend impossible)

Step 2 — execute_factoring (factor calls)
  Factor owns: FactoringOffer + credits record
  Output: FactoredInvoice owned by factor + payment to business
  Effect: Factor pays business correctly ✓
```

## Payment Request Pattern

The debtor can't see the FactoredInvoice (private record).
So the factor "publishes" payment info to a public mapping:

```
payment_requests[invoice_hash] = {
  factor: address,   // who to pay
  amount: u64,       // how much
  due_date: u64,     // when
  debtor: address,   // who should pay
}
```

The debtor queries this by invoice_hash (which they know from
their original invoice document).

## Why Two Frontend Transactions for Payment

Shield Wallet cannot generate ZK proofs for cross-program calls
(calling credits.aleo from inside zk_factor_9591.aleo) in a single tx.

Solution — split into two independent transactions:

```
TX 1: credits.aleo/transfer_public(factor, amount)
  → debtor's public balance debited, factor's public balance credited

TX 2: zk_factor_9591.aleo/pay_invoice(hash, amount, factor)
  → verifies debtor, amount, factor match on-chain
  → marks invoice as settled
```

## Data Flow Diagram

```
BUSINESS                    FACTOR                      DEBTOR
────────                    ──────                      ──────
mint_invoice()
  → Invoice record

authorize_factoring()
  Invoice consumed ──────→ FactoringOffer record

                           execute_factoring()
                             credits → business ✓
                             FactoredInvoice record

                           create_payment_request()
                             payment_requests mapping ──→ /pay?hash=...
                             (public on-chain)              lookupInvoice()
                                                            sees amount+factor

                                                           transfer_public()
                                                            credits → factor ✓

                                                           pay_invoice()
                                                            settled_invoices ✓

                           settle_invoice()
                             FactoredInvoice consumed
```

## Record Lifecycle

```
Invoice          → consumed in authorize_factoring (spent = true)
FactoringOffer   → consumed in execute_factoring (spent = true)
FactoredInvoice  → consumed in settle_invoice (spent = true)
                   (survives create_payment_request — returned unchanged)
```

## Public vs Private Data

| Data                    | Visibility | When                         |
| ----------------------- | ---------- | ---------------------------- |
| Invoice amount          | Private    | Always                       |
| Invoice debtor          | Private    | Always                       |
| That factoring happened | Public     | After execute_factoring      |
| Payment amount          | Public     | After create_payment_request |
| Debtor address          | Public     | After create_payment_request |
| Factor address          | Public     | After create_payment_request |
| Settlement status       | Public     | After pay_invoice            |
