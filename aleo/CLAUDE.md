# Aleo Smart Contract

This file provides guidance for working with the Leo smart contract in this directory.

## Program Information

**Program ID:** `zk_factor_11765.aleo`
**Leo Version:** 3.4.0
**Constructor:** Admin-controlled upgradable constructor (simple governance for MVP)

## Upgradability Model

**Status:** Fully upgradable via admin address
**Governance:** Single admin address (can be upgraded to multi-sig later)
**What Can Change:** Function logic, gas optimizations, add new features
**What Cannot Change:** Record structures, transition signatures, constructor logic
**See:** @docs/SPEC.md for complete upgradability details

## Development Commands

All commands should be run from the `aleo/` directory.

**Build:**
```bash
leo build
```

**Run tests:**
```bash
leo test
```

**Run specific test:**
```bash
leo test <test_name>
```

**Deploy to network:**
```bash
leo deploy
```

**Execute transition:**
```bash
leo run <transition_name> <inputs>
```

## Privacy Model

**Private (encrypted in records):**
- Invoice amounts
- Debtor identity
- Factoring discount rates
- Business-debtor relationships

**Public (visible on-chain):**
- Transaction occurrence
- Serial numbers of spent invoices
- Function names called
- Transaction fees

## Aleo Platform Constraints

**Record Discovery:** Wallets scan blockchain to find records; initial sync may take minutes. UI must handle async record availability.

**Proving Times:** First synthesis 5-7 minutes, subsequent proofs 30-60 seconds. Not suitable for real-time interactions.

**No Read-Only Access:** Verifying record contents requires consuming and recreating it. Every verification costs gas.

**Transaction Limits:**
- Max size: 128 KB
- Circuit constraints: ~2M per transition
- Max records per program: 310

**Missing Cryptographic Primitives:** No SHA-256, RSA, or ECDSA (workaround: off-chain verification with on-chain attestation)

## Testing Requirements

Tests must validate:
- Invoice creation with proper field validation
- Double-factoring attempts are rejected at protocol level
- Atomic swap execution (invoice consumed, payment transferred, FactoredInvoice created)
- Settlement consumes FactoredInvoice record
- Serial number uniqueness enforcement

## Testing Constraints

**Always use `@test script`, never `@test transition`:**
The `@admin` constructor blocks local ledger deployment, which `@test transition` requires. All tests must be `@test script`.

**`fut.await()` required to test finalize logic:**
Without it, `async function` bodies (e.g. the timestamp check in `finalize_mint_invoice`) are silently skipped.

**`self.caller` in cross-program script tests = test program address, not user address:**
- `Mapping::get(..., self.caller)` queries the wrong key; verify mapping state behaviorally instead
- `assert(debtor != self.caller)` cannot be triggered via cross-program calls

**Leo identifier limit:** 31 bytes — keep test function names short.

**Placeholder transition required:** If all tests are `@test script`, add `transition noop() -> bool { return true; }` — Leo requires at least one transition per program.

**End-to-end script:** `bash scripts/test_e2e.sh` (from `aleo/`). Set `SKIP_SETTLE=1` to stop after `factor_invoice`.

## Configuration

**.env variables:**
- `ENDPOINT`: Aleo network API endpoint
- `NETWORK`: Target network (testnet/mainnet)
- `PRIVATE_KEY`: Deployment account private key

## Module-Specific Guides

**When working with `*.leo` files:** Refer to @docs/coding.md for Leo language conventions, best practices, and patterns.

**When deploying smart contracts:** Refer to @docs/deployment.md for deployment instructions.