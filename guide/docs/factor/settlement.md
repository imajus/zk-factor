# Settle an Invoice

Settlement is the final step after the debtor has paid.

## When to Settle

After you've sent a payment request and the debtor has [paid the invoice](../debtor/pay-invoice.md), you can settle to close out the deal.

You can check whether an invoice has been paid by looking at the settlement status on your dashboard.

## Steps

1. Find the factored invoice on your dashboard
2. Verify the debtor's payment has arrived (the status will show "Paid")
3. Click **Settle Invoice**
4. Confirm the action


## What Happens

- Your **Factored Invoice** record is consumed (closed out)
- The settlement is recorded on-chain
- The deal is complete

## If the Debtor Doesn't Pay

If the invoice had **recourse enabled** and the due date has passed:

1. Click **Initiate Recourse** on the overdue invoice
2. A **Recourse Notice** is sent to the business
3. The business must [repay your advance]() <!-- (../business/recourse.md) -->

If recourse was **not enabled**, the loss is yours. This is the tradeoff — non-recourse deals typically have lower advance rates to compensate for the risk.

<!-- screenshot: initiate-recourse.png — the initiate recourse button on an overdue invoice -->
