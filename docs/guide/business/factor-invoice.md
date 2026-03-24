# Factor an Invoice

Factoring sells your invoice to a factor at a discount. You get cash now; the factor collects the full amount from your debtor later.

## How It Works

Factoring is a two-step handshake:

1. **You authorize** — pick a factor and agree on terms
2. **Factor executes** — they send you the advance payment

Once you authorize, your invoice is consumed on-chain. It can never be double-factored — this is the core anti-fraud guarantee.

## Steps

### 1. Choose a Factor

From your dashboard, find the invoice you want to factor and click **Factor**. You'll see a list of registered factors with their advance rates.

<!-- screenshot: factor-selection.png — list of available factors with rates -->

### 2. Set Terms

- **Advance Rate** — the percentage you'll receive upfront (e.g., 95% means you get 95,000 on a 100,000 invoice)
- **Currency** — ALEO or USDCx
- **Recourse** — if enabled, the factor can ask for the advance back if the debtor never pays (see [Handle Recourse](recourse.md))

### 3. Authorize

Click **Authorize Factoring**. This consumes your Invoice record and sends a **Factoring Offer** to the factor. You cannot undo this step.

<!-- screenshot: authorize-factoring.png — the authorize confirmation dialog -->

### 4. Wait for Execution

The factor reviews the offer and executes the deal. When they do, the advance payment lands in your wallet automatically.

You'll see the status update on your dashboard, and receive an [email notification](../features/notifications.md) if you've linked your email.

<!-- screenshot: factoring-complete.png — dashboard showing completed factoring with advance received -->
