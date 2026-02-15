## Context

**Current State:**
- Placeholder Leo program (`main.leo`) with a simple addition function
- Program ID `zk_factor_11765.aleo` reserved and admin constructor configured
- Complete product and technical specifications exist in `docs/PRD.md` and `docs/SPEC.md`
- React frontend exists with mock data, ready for integration
- No production smart contract capabilities deployed

**Aleo Platform Constraints:**
- UTXO-based record model: records are consumed when spent, serial numbers published on-chain
- Circuit constraints: ~2M per transition, limits computational complexity
- Proving times: 30-60 seconds for subsequent proofs, 5-7 minutes for first synthesis
- No read-only record access: verification requires consuming and recreating records
- Function names are public (privacy limitation)
- Max transaction size: 128 KB

**Key Insight:**
Aleo's UTXO model provides cryptographic double-factoring prevention "for free" - once an invoice record is consumed during factoring, its serial number is published, making re-use impossible without any centralized registry.

## Goals / Non-Goals

**Goals:**
- Implement MVP Wave 1-2 features: invoice registration, factoring, settlement, factor management
- Cryptographic double-spend prevention via Aleo's serial number registry
- Atomic swap guarantee for factoring transactions (all-or-nothing execution)
- Privacy-preserving: invoice amounts, debtor identity, and terms remain encrypted in records
- Gas-efficient transitions (minimize circuit complexity)
- Comprehensive validation to prevent invalid state
- Full test coverage including double-factoring prevention scenarios

**Non-Goals:**
- Partial factoring (splitting invoice ownership) - deferred to Wave 3-4
- Multi-factor syndication - deferred to Wave 3-4
- USDCx stablecoin integration - deferred to Wave 3-4
- Credit scoring system - deferred to Wave 5+
- Automated settlement triggers - deferred to future
- Recourse tracking logic - simplified for MVP (boolean flag only)

## Decisions

### Decision 1: Record Structure Design

**Choice:** Two primary record types: `Invoice` and `FactoredInvoice`

**Rationale:**
- `Invoice`: Owned by business, consumed during factoring. Contains debtor, amount, due date, hash, nonce, metadata.
- `FactoredInvoice`: Owned by factor after purchase. Contains all original invoice data plus factoring terms (advance rate, advance amount, factoring date).
- Separation provides clear state transitions and enables atomic swaps.
- Metadata field uses bit-packing (u128) to store invoice number and flags efficiently.

**Alternatives Considered:**
- Single record type with state enum → Rejected: doesn't align with UTXO model where records are consumed, not mutated
- Separate records for each state (created, factored, settled) → Rejected: adds unnecessary complexity

### Decision 2: Public Mapping Design

**Choice:** Three mappings: `active_factors`, `settled_invoices`, `protocol_stats`

**Rationale:**
- `active_factors: address => FactorInfo` - Tracks registered factors with advance rate bounds and statistics. Enables validation during factoring.
- `settled_invoices: field => SettlementInfo` - Prevents double settlement by recording invoice_hash when settled. Check happens in finalize block.
- `protocol_stats: u8 => u64` - Aggregates total invoices, factored count, settled count, volume. Keys 0-3 for different counters.

**Alternatives Considered:**
- No factor registry, allow anyone to be a factor → Rejected: need minimum quality controls for MVP
- Store settlement status in record → Rejected: records are private, can't query for double-settlement check
- Separate counter mappings → Rejected: single mapping with numeric keys is more gas-efficient

### Decision 3: Validation Strategy

**Choice:** Layered validation - inline assertions in transitions + finalize block checks

**Inline Assertions (transition scope):**
- Amount bounds: `assert(amount > 0u64)`
- Date validation: `assert(due_date > block.timestamp)`
- Address validation: `assert(debtor != self.caller)`
- Rate bounds: `assert(advance_rate >= 5000u16 && advance_rate <= 9900u16)` (50-99%)
- Payment sufficiency: `assert(payment.amount >= advance_amount)`

**Finalize Block Checks (mapping scope):**
- Factor registration: `assert(active_factors.contains(factor))`
- Settlement deduplication: `assert(!settled_invoices.contains(invoice_hash))`
- Stats updates: increment counters atomically

**Rationale:**
- Fail fast with inline assertions before expensive finalize operations
- Finalize blocks have access to mappings for registry/deduplication checks
- Clear separation: transition validates inputs, finalize validates state

**Alternatives Considered:**
- All validation in finalize → Rejected: wastes gas on invalid inputs
- No finalize validation → Rejected: can't check mappings without finalize

### Decision 4: Leo Language Patterns

**Choice:** Follow Leo best practices from coding guide

**Patterns:**
- Prefer ternary expressions in transitions over if-else (cheaper circuit construction)
- Use inline async blocks rather than separately declared async functions
- Semicolons on all statements including returns
- 4-space indentation, snake_case for transitions/variables

**Rationale:**
- Ternary avoids duplicated computations in branching logic (circuit optimization)
- Inline async is more concise for simple finalize logic
- Consistency with Leo ecosystem conventions

### Decision 5: Testing Approach

**Choice:** Comprehensive unit tests using Leo's `@test` annotation

**Test Coverage:**
- Valid invoice creation with various amounts/dates
- Invalid inputs: zero amount, past due date, self-debtor
- Valid factoring with correct advance rate and payment
- Double-factoring attempt (should fail with serial number spent)
- Invalid factoring: unregistered factor, insufficient payment, out-of-range advance rate
- Valid settlement
- Double settlement attempt (should fail in finalize)
- Factor registration and deregistration

**Test Structure:**
```leo
@test
script test_case_name() {
    let result: RecordType = program.aleo/transition_name(args);
    assert_eq(result.field, expected_value);
}

@test
@should_fail
transition test_expected_failure() {
    // Test invalid scenarios
}
```

**Rationale:**
- Leo's test framework provides clear pass/fail semantics
- `@should_fail` annotation tests negative cases cleanly
- Unit tests catch issues before expensive testnet deployment

### Decision 6: Field Encoding

**Choice:**
- Amount: u64 microcredits (1M microcredits = 1 ALEO)
- Dates: u64 Unix timestamp (seconds)
- Advance rate: u16 basis points (9500 = 95%)
- Invoice hash: field (Poseidon hash)
- Nonce: field (generated from hash + timestamp + caller)

**Rationale:**
- u64 for amounts: max ~18.4 quintillion microcredits, sufficient for all realistic invoices
- u64 timestamps: standard Unix epoch, works until year 2262
- u16 basis points: 0.01% precision, range 0-655.35%, efficient storage
- Poseidon hash: Aleo's native hash function, circuit-friendly
- Nonce generation prevents collisions across invoices

**Alternatives Considered:**
- u128 for amounts → Rejected: unnecessary precision, wastes circuit constraints
- Floating point for rates → Not available in Leo
- SHA-256 for hashing → Not available in Leo (requires Poseidon)

## Risks / Trade-offs

**Risk: Proving times impact UX**
- First-time users face 5-7 minute key synthesis on first transition
- Subsequent proofs take 30-60 seconds
→ **Mitigation**: Frontend shows clear progress indicators, warns users before first transaction, implements async proof generation with status updates

**Risk: Record discovery latency**
- New wallets must scan entire blockchain to find owned records
- Initial sync can take 2-5 minutes
→ **Mitigation**: Display sync progress bar, cache records locally, incremental sync on reconnect

**Risk: Circuit constraint overflow**
- Complex transitions could exceed ~2M constraint limit
- Particularly `factor_invoice()` with validation + atomic swap
→ **Mitigation**: Keep transition logic minimal, profile constraints during testing, split complex operations if needed

**Risk: Gas cost uncertainty**
- Leo proving costs vary based on circuit complexity
- Factoring transaction likely most expensive (consumes + creates records + finalize)
→ **Mitigation**: Measure gas costs on testnet, document expected costs in frontend, optimize hot paths

**Risk: No record read-only access**
- Verifying invoice details requires consuming and recreating it
- Every verification costs gas
→ **Mitigation**: Off-chain storage of invoice metadata, only verify on-chain for critical operations (factoring, settlement)

**Trade-off: Public function names**
- Transaction graph reveals which functions are called (mint_invoice, factor_invoice, settle_invoice)
- Privacy limitation of Aleo platform
→ **Accepted**: Function-level privacy not available, focus on data privacy (amounts, identities remain encrypted)

**Trade-off: Admin-controlled upgrades**
- Single admin address can deploy upgrades immediately
- Centralization risk for MVP
→ **Accepted**: Simplifies early iteration, document plan to upgrade to multi-sig governance post-launch

## Migration Plan

**Phase 1: Testnet Deployment**
1. Complete implementation and unit tests in `aleo/src/main.leo`
2. Build: `cd aleo && leo build`
3. Test locally: `leo test`
4. Deploy to testnet: `leo deploy --network testnet`
5. Note program ID and deployment transaction

**Phase 2: Integration Testing**
1. Update frontend with testnet program ID
2. Test all transitions via frontend UI
3. Verify record discovery and wallet sync
4. Measure actual gas costs
5. Test double-factoring prevention with multiple accounts

**Phase 3: Mainnet Deployment**
1. Security audit of smart contract code (recommended)
2. Update admin address to production secure wallet
3. Deploy to mainnet: `leo deploy --network mainnet`
4. Update frontend to mainnet program ID
5. Monitor initial transactions for issues

**Rollback Strategy:**
- If critical bug found post-deployment: deploy patched version via admin upgrade
- If upgrade fails: Aleo's immutable record model means existing records remain valid
- Emergency: can deploy entirely new program with migration transitions
- No "rollback" possible once transactions confirmed - only forward upgrades

**Deployment Checklist:**
- [ ] All unit tests passing
- [ ] Testnet deployment successful
- [ ] Frontend integration tested
- [ ] Gas costs documented
- [ ] Admin key secured (hardware wallet)
- [ ] Mainnet deployment transaction confirmed
- [ ] Program ID published in docs

## Open Questions

None - specifications are complete and design decisions are clear. Ready to proceed to implementation.
