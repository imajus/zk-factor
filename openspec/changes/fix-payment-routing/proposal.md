# Fix Payment Routing in factor_invoice

## Problem

The original `factor_invoice` transition had a self-payment bug.
In Aleo, all record inputs must be owned by `self.caller`. Since the
business was the caller and provided both the Invoice AND credits,
the payment transferred back to themselves — the factor never paid.

## Solution

Replace `factor_invoice` with a two-step handshake:

1. `authorize_factoring` — Business calls this, Invoice consumed, InvoiceOffer sent to factor
2. `execute_factoring` — Factor calls this, factor owns both inputs, pays business correctly

## Impact

- Fixes judge feedback: "currently self-paying credits"
- Double-spend prevention still works (Invoice consumed in Step 1)
- Requires frontend update: replace `factor_invoice` calls with two new transitions
