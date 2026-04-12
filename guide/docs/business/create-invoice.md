# Create an Invoice

Minting an invoice creates a private record on the Aleo blockchain. Only you can see its details.

## Steps

1. From your dashboard, click **Create Invoice**
2. Fill in the invoice details:
   - **Invoice Number** — click the generate button or type your own
   - **Description** — brief summary of goods or services
   - **Debtor Address** — the Aleo address of whoever owes you
   - **Amount** — how much is owed
   - **Currency** — ALEO or USDCx (see [USDCx Payments](../features/usdcx.md))
   - **Due Date** — when payment is expected
3. Optionally [attach a supporting document](../features/documents.md) (PDF, image, contract)
4. Review the summary on the right, then click **Create Invoice**

## Privacy Badges

Each field label shows a small badge indicating who can see that data and via which on-chain record:

| Badge | Audience | Mechanism |
|---|---|---|
| **Private** | Only you (the creditor) | Encrypted in the Invoice record; never shared |
| **Factor** | You + the factor you choose | Shared via the FactoringOffer record |
| **Debtor** | You + your debtor | Shared via the PaymentNotice record at payment time |

Fields visible to multiple parties (Debtor Address, Invoice Amount) show side-by-side badges. Hover any badge for a plain-language explanation. Expand the **Data visibility guide** in the sidebar for a full legend.

![Invoice creation form](/img/create-invoice/create-invoice-form.png)

## Proof Generation

After clicking **Create Invoice**, your Shield Wallet will ask you to approve the transaction. You must sign this request before the proof generation process starts.

Once approved, the app generates a zero-knowledge proof. This takes **30-60 seconds** (or up to 5-7 minutes if it's your first transaction ever). A progress indicator shows the status.


![Proof generation](/img/create-invoice/proof-generating.png)

## What Happens On-Chain

- A private **Invoice** record is created, encrypted with your key
- Nobody else can see the amount, debtor, or any details
- The invoice appears on your dashboard once the transaction confirms

## Next Step

Ready to get cash for this invoice? [Factor it](factor-invoice.md).
