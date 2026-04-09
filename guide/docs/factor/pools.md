# Factor Pools

Pools let multiple factors combine funds to finance a single large invoice. All pools are **ownerless** — they are stored in a public on-chain mapping visible to every user, and governed by factor voting rather than a single owner.

## How Ownerless Pools Work

1. Any registered factor **creates** a pool, setting a name, advance rate range, and minimum contribution
2. Other factors **discover** the pool on the Pools page and **contribute** credits to it
3. When a business submits a factoring offer that matches the pool, factors **vote** to approve it
4. Once the vote threshold is reached, any factor **executes** the approved pool factoring
5. After the debtor settles, **distribution is opened** and contributors **claim** their proportional share of proceeds

## Discovering Pools

Go to the **Pools → Discover** tab to see all ownerless pools on-chain. Each card shows the pool name, advance rate range, and total amount raised so far.

Click a pool card to open the detail panel and see pending offers, vote status, and pool parameters.

## Creating a Pool

1. Go to the **Pools** page
2. Click **Create Pool**
3. Enter a pool name, invoice hash (optional), advance rate range, and minimum contribution
4. Click **Create**

![Create pool form](/img/factor-pools/create-pool.png)

You must be a registered factor to create a pool.

## Contributing to a Pool

1. On the Discover tab, find an open pool
2. Click **Contribute**
3. Enter the amount (must meet the pool's minimum contribution)
4. Click **Contribute** — credits are sent to the program escrow and you receive a **Pool Share** record

![Contribute to a pool](/img/factor-pools/contribute-pool.png)


## Voting on a Factoring Offer

When a business submits a factoring offer to a pool, it appears in the **Voting** tab:

1. Review the offer details (creditor, debtor, advance rate)
2. Click **Vote** to approve the offer
3. Once the threshold is reached (majority of active factors), any factor can execute

![Contribute to a pool](/img/factor-pools/voting-pool.png)

## Executing an Approved Pool

Once votes reach the threshold, click **Execute** in the Voting tab. The factoring offer is accepted atomically and the advance is sent to the business.

![Execute pool offer](/img/factor-pools/execute-offer.png)


## Claiming Proceeds

After the debtor pays the invoice:

1. Go to **Pools → Claims**
2. Click **Claim** on your pool share
3. You receive your proportional share of the settlement proceeds

Your share is calculated as: `contributed / total_pool_contributions × settlement_amount`.

<!-- screenshot: pool-shares.png — list of pool share records with claim buttons -->
