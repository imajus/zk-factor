# Browse & Accept Invoices

The marketplace shows factoring offers that businesses have authorized to you.

## Viewing Offers

When a business authorizes factoring with you, a **Factoring Offer** record appears on your dashboard. It contains:

- Invoice amount
- Due date
- Agreed advance rate
- Whether recourse is enabled
- Currency (ALEO or USDCx)

<!-- screenshot: factoring-offers.png — list of pending factoring offers on the factor dashboard -->

## Accepting an Offer

1. Review the offer details
2. Click **Execute Factoring**
3. Confirm the advance amount that will be sent to the business
4. The proof generates (30-60 seconds)

<!-- screenshot: execute-factoring.png — the execute factoring confirmation -->

## What Happens

- Your credits (or USDCx) are sent to the business as the advance
- You receive a **Factored Invoice** record — proof of your purchase
- The deal is recorded in protocol statistics

## After Acceptance

You now hold the factored invoice. Your next steps:

1. Send a payment request to the debtor — this creates a private **Payment Notice** that only the debtor can see
2. Wait for the debtor to [pay](../debtor/pay-invoice.md)
3. [Settle the invoice](settlement.md) once payment arrives

<!-- screenshot: factored-invoice-actions.png — a factored invoice with Send Payment Request and Settle buttons -->

## Too Large for One Factor?

Consider creating a [Factor Pool](pools.md) to split the deal with other factors.
