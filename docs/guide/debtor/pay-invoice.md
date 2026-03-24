# Pay an Invoice

As a debtor, you pay invoices that factors have sent you payment requests for.

## How You Know You Owe

When a factor sends a payment request, a **Payment Notice** record appears in your wallet. This is a private record — nobody else can see it.

1. Connect your wallet on the [Pay page](/pay)
2. Your payment notices appear automatically after sync

<!-- screenshot: payment-notices.png — the debtor's view showing pending payment notices -->

## Paying

1. Find the payment notice for the invoice you want to pay
2. Review the amount and factor address
3. Click **Pay**
4. Two transactions happen in sequence:
   - First: the payment is transferred to the factor
   - Second: the payment notice is consumed, marking the invoice as settled on-chain

<!-- screenshot: pay-invoice-confirm.png — the payment confirmation dialog -->

## Why Two Transactions?

This is a wallet limitation. The payment and the settlement marker must be submitted as separate transactions. The app handles this automatically — just confirm both prompts from your wallet.

## After Payment

- The factor can now [settle the invoice](../factor/settlement.md)
- Your payment notice is consumed (removed from your wallet)
- The settlement status is recorded on-chain

## Privacy

Nothing about your payment is publicly visible except that a settlement occurred. The amount, your identity, and the factor's identity remain private.
