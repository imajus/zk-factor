# ZK-Factor Smart Contract

Leo smart contract for confidential invoice factoring on Aleo. Prevents double-factoring fraud cryptographically — once an invoice is factored, its serial number is spent on-chain and reuse is impossible.

**Program ID:** `zk_factor_11765.aleo` · **Network:** testnet

## Prerequisites

- [Leo CLI](https://developer.aleo.org/leo/installation) 3.4.0+
- A funded Aleo testnet account

## Setup

```bash
cd aleo
cp .env.example .env
# Edit .env: set PRIVATE_KEY to your account's private key
```

## Build

```bash
leo build
```

## Test

```bash
leo test
```

All tests are local — no network connection needed, no gas spent.

## Deploy

```bash
leo deploy --network testnet
```

First deployment takes 5–10 minutes for key synthesis. Costs ~1.9 ALEO.

The deploying account must match the `@admin` address in `src/main.leo`. To use a different account, update that address before deploying.

## Execute on Testnet

Run individual transitions against the live program:

```bash
# Register as a factor (advance rates in basis points: 9000 = 90%)
leo execute register_factor 8000u16 9500u16 --network testnet --broadcast

# Create an invoice
leo execute mint_invoice <debtor_address> <amount>u64 <due_date>u64 <hash>field <metadata>u128 \
  --network testnet --broadcast

# Factor an invoice (consume Invoice record, receive payment)
leo execute factor_invoice <invoice_record> <factor_address> <rate>u16 <credits_record> \
  --network testnet --broadcast

# Settle a factored invoice
leo execute settle_invoice <factored_invoice_record> <credits_record> \
  --network testnet --broadcast
```

Records returned by transitions are encrypted. Decrypt with:

```bash
leo account decrypt --ciphertext <ciphertext> --view-key <your_view_key>
```

## End-to-End Test Script

Runs the full lifecycle on testnet automatically:

```bash
bash scripts/test_e2e.sh
```

Set `SKIP_SETTLE=1` to run only steps 1–4 (register → mint → factor), skipping settlement.

## Key Transitions

| Transition | What it does |
|---|---|
| `register_factor` | Register as an active factoring company |
| `deregister_factor` | Deactivate your factor registration |
| `mint_invoice` | Create a private Invoice record |
| `factor_invoice` | Atomic swap: Invoice + payment → FactoredInvoice |
| `settle_invoice` | Pay a factored invoice, mark it settled on-chain |

## Deployed Transactions (Testnet)

| Step | Transaction |
|---|---|
| Deployment | `at1ske79h4mmyjg963rc3gu3wkgft8h6zd80m7auk6d4zpr4gnrwuxq6y3sr9` |
| mint_invoice | `at18rllhldgfftyc0n7kr6ffafaxsjm4fcp3weksael97kpy0vj4uysn9fen3` |
| register_factor | `at1xt40g2flcp6gguqa9m6hxfqx4y8we8yw6zlyzgvjspjmphz60u9ql75jan` |
| factor_invoice | `at1j5fn4nhr50que77yva7e8ndaa74vnw6yc5y0g5e89ywquehnavqswx33fe` |
