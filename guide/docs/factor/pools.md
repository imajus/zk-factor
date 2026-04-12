# Factor Pools

Pools let multiple factors combine funds to finance a single large invoice. All pools are **ownerless** — they are stored in public on-chain mappings visible to every user, and governed by factor voting rather than a single owner.

## How Ownerless Pools Work

1. Any registered factor **creates** a pool, setting a name, advance rate range, minimum contribution, and currency (ALEO or USDCx)
2. Other factors **discover** the pool on the Pools page and **contribute** credits to it
3. When a business submits a factoring offer that matches the pool, factors **vote** to approve or reject it
4. Once all votes are cast and the offer is approved, any factor **executes** the pool factoring
5. After the debtor settles, any user can **open distribution** and contributors **claim** their proportional share of proceeds

## Discovering Pools

Go to **Pools** in the navigation to see all ownerless pools on-chain. Each card shows the pool name, truncated pool ID, rate range, amount raised, minimum contribution, and a status badge.

![Pools list](/img/factor-pools/discover.png)

**Pool status badges:**

| Status | Meaning |
|--------|---------|
| Open | Accepting contributions and offers |
| Rejected | The pending offer was rejected by voters |
| Executed | Offer accepted, advance sent to business |
| Awaiting Distribution | Invoice settled, proceeds not yet opened |
| Paying Out | Distribution open, contributors can claim |
| Closed | Fully distributed |

Click any pool card to open the pool detail page.

## Creating a Pool

1. Go to the **Pools** page
2. Click **Create Pool** (requires factor registration)
3. Fill in:
   - **Pool Name** — up to 16 ASCII characters
   - **Pool ID** — leave empty to auto-generate, or enter a specific field value
   - **Min / Max Advance Rate** — the range of advance rates this pool will accept (50–99%)
   - **Pool Currency** — ALEO or USDCx; used for contributions, advances, and payouts
   - **Minimum Contribution** — minimum amount each factor must contribute
4. Click **Create Pool**

![Create pool form](/img/factor-pools/create-pool.png)

## Contributing to a Pool

1. Open any **Open** pool from the Pools page
2. Click **Contribute** in the top-right of the pool detail page
3. Review the pool summary (total raised, minimum contribution, your public balance)
4. Enter your contribution amount — must meet the pool minimum
5. Click **Contribute** — credits are transferred to program escrow and you receive a **PoolShare** record

![Contribute to a pool](/img/factor-pools/contribute-pool.png)

Your PoolShare record appears in the **Pool Shares** tab of the Factor Dashboard.

## Voting on a Factoring Offer

When a business submits a factoring offer to a pool, it appears on the pool detail page under **Pending Offer**. A progress bar shows current votes vs. required votes.

You can also see pools awaiting your vote in the **Pool Voting** tab of the Factor Dashboard — click any card to go directly to the pool detail page.

To vote:

1. Open the pool detail page
2. Review the offer (creditor, debtor, invoice amount, advance rate)
3. Click **Approve** or **Reject**
4. Once all active factors have voted, the result is determined by majority

![Voting on a pool offer](/img/factor-pools/voting-pool.png)

## Executing an Approved Pool

Once all votes are cast and the offer is approved:

1. On the pool detail page, the **Execute Approved Pool** button appears
2. Click it — the factoring offer is accepted atomically and the advance is sent to the business

If the offer is rejected, the **Finalize Rejected Offer** button appears instead, which reopens the pool for new offers.

![Execute pool offer](/img/factor-pools/execute-offer.png)

## Opening Distribution and Claiming Proceeds

After the debtor pays the invoice and the invoice is marked settled on-chain:

1. Open the pool detail page
2. Click **Open Distribution** — this is permissionless; any user can call it once the invoice is settled
3. Once distribution is open, your estimated payout appears on the **Claim Proceeds** button
4. Click **Claim Proceeds** to receive your proportional share

Your share is calculated as: `contributed / total_pool_contributions × settlement_amount`

You can also track your pool shares from the **Pool Shares** tab in the Factor Dashboard.
