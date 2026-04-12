## Why

Several finance flows in `zk_factor.aleo` use public credit/token transfers that expose amounts and participant addresses on-chain, undermining the platform's core privacy promise. Specifically, pool contributions, debtor invoice payments, and USDCx factoring advances are all publicly visible.

## What Changes

- **BREAKING** `pool_contribute`: adds `payment: credits.aleo::credits` record parameter; removes reliance on public balance via `transfer_public_as_signer`
- **BREAKING** `pay_invoice`: adds `payment: credits.aleo::credits` record parameter; replaces `transfer_public_as_signer` with `transfer_private`
- **BREAKING** `pay_pool_invoice`: adds `payment: credits.aleo::credits` record parameter; replaces `transfer_public_as_signer` with `transfer_private_to_public`
- **BREAKING** `execute_factoring_token`: replaces `transfer_from_public` with `transfer_from_public_to_private`; adds `ComplianceRecord` and `Token` to return signature
- No changes to USDCx pool flows (`pool_contribute_token`, `pay_pool_invoice_token`) — USDCx private-record paths require `[MerkleProof; 2u32]` compliance proofs, which cannot be passed in cross-program calls

## Capabilities

### New Capabilities

- `private-payment-inputs`: Transitions that accept credits payments now consume private `credits.aleo::credits` records instead of debiting public balances, hiding the payer's source of funds

### Modified Capabilities

<!-- No existing spec files found — no delta specs needed -->

## Impact

- `aleo/src/main.leo`: four transitions modified (signatures change, breaking for callers)
- `client/src/pages/Pay.tsx`: `pay_invoice` call must supply a credits record input
- `client/src/pages/Pool.tsx`: `pool_contribute` and `pay_pool_invoice` calls must supply credits record inputs
- `client/src/pages/Marketplace.tsx`: `execute_factoring_token` call must handle two additional record outputs (`ComplianceRecord`, `Token`)
- `client/src/lib/pool-chain.ts`: input builders updated to include record placeholders
- Shield Wallet record retrieval: callers must hold unspent `credits.aleo::credits` records (not just public balance) before calling affected transitions
