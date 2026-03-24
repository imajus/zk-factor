# Factor Pools

Pools let multiple factors combine funds to finance a single large invoice.

## How Pools Work

1. One factor **creates** a pool for a specific invoice, setting a target amount
2. Other factors **contribute** credits to the pool
3. Once the target is met, the pool creator **executes** the factoring
4. After settlement, contributors **claim** their proportional share of proceeds

## Creating a Pool

1. Go to the **Pools** page
2. Click **Create Pool**
3. Enter the invoice hash and target amount
4. Click **Create**

<!-- screenshot: create-pool.png — the create pool form -->

You must be a registered factor to create a pool.

## Contributing to a Pool

1. On the Pools page, find an open pool
2. Enter the amount you want to contribute
3. Click **Contribute**
4. Your credits are transferred to the pool creator, and you receive a **Pool Share** record as proof

<!-- screenshot: contribute-pool.png — a pool card showing progress bar and contribute form -->

The progress bar shows how close the pool is to its target.

## Executing Pool Factoring

Only the pool creator can execute. Once contributions meet the target:

1. Click **Execute** on the pool
2. The factoring offer is accepted, and the advance is sent to the business
3. The pool is closed — no more contributions accepted

## Claiming Proceeds

After the invoice is settled:

1. Go to the Pools page
2. Click **Claim** on your pool share
3. You receive your proportional share of the settlement

Your share is calculated based on how much you contributed relative to the total pool.

<!-- screenshot: pool-shares.png — list of pool share records with claim buttons -->
