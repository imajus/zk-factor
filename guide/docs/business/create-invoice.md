# Create an Invoice

Minting an invoice creates a private record on the Aleo blockchain. Only you can see its details.

## Steps

1. From your dashboard, click **Create Invoice**
2. Fill in the invoice details:
   - **Invoice Number** — click the generate button or type your own
   - **Debtor Address** — the Aleo address of whoever owes you
   - **Amount** — how much is owed
   - **Currency** — ALEO or USDCx (see [USDCx Payments](../features/usdcx.md))
   - **Due Date** — when payment is expected
3. Optionally add line items for a breakdown
4. Optionally [attach a supporting document](../features/documents.md) (PDF, image, contract)
5. Review the summary on the right, then click **Create Invoice**

<!-- screenshot: create-invoice-form.png — the invoice creation form filled out -->

## Proof Generation

After clicking Create, the app generates a zero-knowledge proof. This takes **30-60 seconds** (or up to 5-7 minutes if it's your first transaction ever). A progress indicator shows the status.

<!-- screenshot: proof-generating.png — the proof generation progress bar -->

## What Happens On-Chain

- A private **Invoice** record is created, encrypted with your key
- Nobody else can see the amount, debtor, or any details
- The invoice appears on your dashboard once the transaction confirms

## Next Step

Ready to get cash for this invoice? [Factor it](factor-invoice.md).
