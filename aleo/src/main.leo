// ZK-Factor: Confidential invoice factoring platform on Aleo blockchain
// Cryptographically prevents double-factoring fraud while maintaining complete privacy
// Leo 4.0 — all finalization logic uses inline `final { }` blocks per the 3.5→4.0 migration guide.
import credits.aleo;
import test_usdcx_stablecoin.aleo;

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL STRUCTS
// Plain structs (no owner field) live outside program {} in Leo 4.0.
// Records (with owner field) stay inside the program block.
// ─────────────────────────────────────────────────────────────────────────────

struct FactorInfo {
    is_active: bool,
    min_advance_rate: u16,
    max_advance_rate: u16,
    total_factored: u64,
    registration_date: u64,
}

// BREAKING CHANGE: amount field added in a prior version. Fresh deployment required.
struct SettlementInfo {
    is_settled: bool,
    settlement_date: u64,
    factor: address,
    amount: u64,
}

// On-chain metadata for an ownerless pool. Stored in pool_meta mapping.
struct PoolMeta {
    name_u128: u128,         // ASCII pool name encoded as u128 (max 16 chars)
    min_advance_rate: u16,   // pool-accepted minimum advance rate (bps)
    max_advance_rate: u16,   // pool-accepted maximum advance rate (bps)
    min_contribution: u64,   // enforced >= 5_000_000 (5 ALEO in microcredits)
    created_at: u64,
}

// Submitted by business once pool is fully funded. Awaits factor multisig votes.
struct PendingPoolOffer {
    original_creditor: address,
    debtor: address,
    amount: u64,
    advance_rate: u16,
    advance_amount: u64,
    due_date: u64,
    nonce: field,
    is_executed: bool,
}

// Composite key used to prevent a factor from voting twice on the same pool.
// Hashed via Poseidon2 and stored in pool_voter_cast mapping.
struct VoteId {
    invoice_hash: field,
    voter: address,
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED FINAL FN HELPERS
//
// `final fn` bodies are inlined at compile time into the caller's `final { }`
// block. Use these to deduplicate finalization logic shared across entry points.
// All `final fn` definitions live outside `program {}`.
// ─────────────────────────────────────────────────────────────────────────────

// Assert the address is a currently-active registered factor.
// Called from any final { } block that gate-checks factor status.
final fn verify_factor_active(factor: address) {
    let factor_info: FactorInfo = Mapping::get(active_factors, factor);
    assert(factor_info.is_active);
}

// Increment protocol_stats[1] and this factor's total_factored count.
// Asserts factor is active — safe to call as the sole active-check.
final fn update_factor_stats(factor: address) {
    let factor_info: FactorInfo = Mapping::get(active_factors, factor);
    assert(factor_info.is_active);
    let total_factored: u64 = Mapping::get_or_use(protocol_stats, 1u8, 0u64);
    Mapping::set(protocol_stats, 1u8, total_factored + 1u64);
    Mapping::set(active_factors, factor, FactorInfo {
        is_active:         factor_info.is_active,
        min_advance_rate:  factor_info.min_advance_rate,
        max_advance_rate:  factor_info.max_advance_rate,
        total_factored:    factor_info.total_factored + 1u64,
        registration_date: factor_info.registration_date,
    });
}

// Write a SettlementInfo entry and bump protocol_stats[2].
// Asserts the invoice has not already been settled.
final fn record_settlement(invoice_hash: field, factor: address, amount: u64) {
    assert(!Mapping::contains(settled_invoices, invoice_hash));
    Mapping::set(settled_invoices, invoice_hash, SettlementInfo {
        is_settled:       true,
        settlement_date:  (block.timestamp as u64),
        factor:           factor,
        amount:           amount,
    });
    let total_settled: u64 = Mapping::get_or_use(protocol_stats, 2u8, 0u64);
    Mapping::set(protocol_stats, 2u8, total_settled + 1u64);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRAM
// ─────────────────────────────────────────────────────────────────────────────

program zk_factor_12255.aleo {
    // IMPORTANT: Replace with actual admin address before deployment.
    // See aleo/docs/deployment.md for admin key management.
    @admin(address="aleo19rn544c49da9z2vz52q5f7lm7nsjhp890ahmre6cz94qawdscgps6kq3cu")
    constructor() {}

    // ── Core protocol mappings ───────────────────────────────────────────────
    mapping active_factors:    address => FactorInfo;
    mapping settled_invoices:  field   => SettlementInfo;
    mapping protocol_stats:    u8      => u64;

    // ── Recourse ─────────────────────────────────────────────────────────────
    // invoice_hash => claimed (true = recourse active, false = settled/cleared)
    mapping recourse_claims: field => bool;

    // ── Legacy pool mappings (owner-based) ───────────────────────────────────
    mapping pool_contributions: field   => u64;      // total contributed to this pool
    mapping pool_closed:        field   => bool;     // true after pool is executed/closed
    mapping pool_proceeds:      field   => u64;      // settlement.amount (set by open_pool_distribution)
    mapping pool_distributed:   field   => u64;      // running total of proceeds already paid out

    // ── Ownerless pool mappings ──────────────────────────────────────────────
    mapping pool_meta:          field   => PoolMeta;         // on-chain pool metadata
    mapping pool_use_token:     field   => bool;             // false = ALEO, true = USDCx
    mapping pool_pending_offer: field   => PendingPoolOffer; // business-submitted offer awaiting votes
    mapping pool_vote_count:    field   => u8;               // total approvals so far
    mapping pool_voter_cast:    field   => bool;             // Poseidon2(VoteId) => voted?
    mapping pool_executor:      field   => address;          // recorded after execute_approved_pool
    // Running count of active factors — used to compute majority threshold.
    // Key: false => count.
    mapping active_factor_count: bool => u32;

    // ── Storage arrays ───────────────────────────────────────────────────────
    // All registered factor addresses (includes deregistered).
    storage factor_addresses: [address];
    // All ownerless pool hashes — readable by anyone on-chain.
    storage pool_registry: [field];

    // ── Records ──────────────────────────────────────────────────────────────

    // Owned by business; consumed on factoring to prevent double-factoring.
    record Invoice {
        owner: address,
        debtor: address,
        amount: u64,
        due_date: u64,
        invoice_hash: field,
        nonce: field,
        metadata: u128,
        // IPFS CID encoded as a field element. 0field = no document.
        // Non-zero = cidToField(cid) from src/lib/ipfs.ts
        // Full CID string stored off-chain; this field proves existence + integrity.
        document_cid: field,
    }

    // Owned by factor after purchasing an invoice.
    record FactoredInvoice {
        owner: address,
        original_creditor: address,
        debtor: address,
        amount: u64,
        advance_amount: u64,
        due_date: u64,
        factoring_date: u64,
        advance_rate: u16,
        invoice_hash: field,
        recourse: bool,
    }

    // Owned by factor; accepted to execute the two-step factoring handshake.
    record FactoringOffer {
        owner: address,
        original_creditor: address,
        debtor: address,
        amount: u64,
        due_date: u64,
        advance_rate: u16,
        invoice_hash: field,
        nonce: field,
        metadata: u128,
        use_token: bool,
        recourse: bool,
    }

    // Private record sent to debtor — only their wallet can read it.
    record PaymentNotice {
        owner: address,
        factor: address,
        amount: u64,
        due_date: u64,
        invoice_hash: field,
    }

    // Sent to business when factor initiates recourse.
    // Business calls settle_recourse to repay the advance.
    record RecourseNotice {
        owner: address,
        factor: address,
        advance_amount: u64,
        invoice_hash: field,
    }

    // Proof of contribution to a pool; consumed when calling claim_pool_proceeds.
    // total_pool is a snapshot at contribution time — display only.
    // Payout math uses pool_contributions[invoice_hash] (authoritative on-chain total).
    record PoolShare {
        owner: address,
        pool_id: field,
        invoice_hash: field,
        contributed: u64,
        total_pool: u64,
    }

    // Sent to debtor when execute_approved_pool succeeds (ownerless pool path).
    record PoolPaymentNotice {
        owner: address,
        invoice_hash: field,
        amount: u64,
        due_date: u64,
    }

    // ─────────────────────────────────────────────────────────────
    // INVOICE
    // ─────────────────────────────────────────────────────────────

    // Create an invoice record with validation.
    // document_cid: pass 0field if no document, or cidToField(cid) from src/lib/ipfs.ts
    fn mint_invoice(
        debtor: address,
        amount: u64,
        due_date: u64,
        invoice_hash: field,
        metadata: u128,
        document_cid: field,
    ) -> (Invoice, Final) {
        assert(amount > 0u64);
        assert(debtor != self.caller);
        let nonce: field = Poseidon2::hash_to_field(invoice_hash);
        let invoice: Invoice = Invoice {
            owner:        self.caller,
            debtor:       debtor,
            amount:       amount,
            due_date:     due_date,
            invoice_hash: invoice_hash,
            nonce:        nonce,
            metadata:     metadata,
            document_cid: document_cid,
        };
        return (invoice, final {
            assert(due_date > (block.timestamp as u64));
        });
    }

    // ─────────────────────────────────────────────────────────────
    // FACTOR REGISTRY
    // ─────────────────────────────────────────────────────────────

    // Register the caller as a factoring company.
    fn register_factor(
        min_advance_rate: u16,
        max_advance_rate: u16,
    ) -> Final {
        assert(min_advance_rate <= max_advance_rate);
        assert(min_advance_rate >= 5000u16 && min_advance_rate <= 9900u16);
        assert(max_advance_rate >= 5000u16 && max_advance_rate <= 9900u16);
        let caller: address = self.caller;
        return final {
            let existing: FactorInfo = Mapping::get_or_use(active_factors, caller, FactorInfo {
                is_active:         false,
                min_advance_rate:  0u16,
                max_advance_rate:  0u16,
                total_factored:    0u64,
                registration_date: 0u64,
            });
            assert(!existing.is_active);
            factor_addresses.push(caller);
            Mapping::set(active_factors, caller, FactorInfo {
                is_active:         true,
                min_advance_rate:  min_advance_rate,
                max_advance_rate:  max_advance_rate,
                total_factored:    0u64,
                registration_date: (block.timestamp as u64),
            });
            // Track active count for multisig threshold computation.
            let active_count: u32 = Mapping::get_or_use(active_factor_count, false, 0u32);
            Mapping::set(active_factor_count, false, active_count + 1u32);
        };
    }

    // Deregister the caller as a factoring company.
    fn deregister_factor() -> Final {
        let caller: address = self.caller;
        return final {
            let factor_info: FactorInfo = Mapping::get(active_factors, caller);
            Mapping::set(active_factors, caller, FactorInfo {
                is_active:         false,
                min_advance_rate:  factor_info.min_advance_rate,
                max_advance_rate:  factor_info.max_advance_rate,
                total_factored:    factor_info.total_factored,
                registration_date: factor_info.registration_date,
            });
            let active_count: u32 = Mapping::get_or_use(active_factor_count, false, 0u32);
            if active_count > 0u32 {
                Mapping::set(active_factor_count, false, active_count - 1u32);
            }
        };
    }

    // ─────────────────────────────────────────────────────────────
    // TWO-STEP FACTORING HANDSHAKE
    // ─────────────────────────────────────────────────────────────

    // Step 1 — Called by: Business
    // Consumes the Invoice (preventing double-factoring) and issues a
    // FactoringOffer to the specified factor. The business cannot back out.
    fn authorize_factoring(
        invoice: Invoice,
        factor: address,
        advance_rate: u16,
        use_token: bool,
        recourse: bool,
    ) -> (FactoringOffer, Final) {
        assert(invoice.owner == self.caller);
        assert(advance_rate >= 5000u16 && advance_rate <= 9900u16);

        let offer: FactoringOffer = FactoringOffer {
            owner:              factor,
            original_creditor:  self.caller,
            debtor:             invoice.debtor,
            amount:             invoice.amount,
            due_date:           invoice.due_date,
            advance_rate:       advance_rate,
            invoice_hash:       invoice.invoice_hash,
            nonce:              invoice.nonce,
            metadata:           invoice.metadata,
            use_token:          use_token,
            recourse:           recourse,
        };

        return (offer, final {
            verify_factor_active(factor);
        });
    }

    // Step 1 (partial) — Called by: Business
    // Factors a portion of the invoice. Returns a FactoringOffer for the sold
    // portion and a new Invoice record for the unfactored remainder.
    fn authorize_partial_factoring(
        invoice: Invoice,
        factor: address,
        factoring_amount: u64,
        advance_rate: u16,
        use_token: bool,
        recourse: bool,
    ) -> (FactoringOffer, Invoice, Final) {
        assert(invoice.owner == self.caller);
        assert(factoring_amount > 0u64);
        assert(factoring_amount < invoice.amount);
        assert(advance_rate >= 5000u16 && advance_rate <= 9900u16);

        let remaining_amount: u64 = invoice.amount - factoring_amount;

        // Deterministic child hash so the remainder can be independently managed.
        let remaining_invoice_hash: field = Poseidon2::hash_to_field(
            invoice.invoice_hash + (factoring_amount as field)
        );
        let remaining_nonce: field = Poseidon2::hash_to_field(remaining_invoice_hash);

        let offer: FactoringOffer = FactoringOffer {
            owner:              factor,
            original_creditor:  self.caller,
            debtor:             invoice.debtor,
            amount:             factoring_amount,
            due_date:           invoice.due_date,
            advance_rate:       advance_rate,
            invoice_hash:       invoice.invoice_hash,
            nonce:              invoice.nonce,
            metadata:           invoice.metadata,
            use_token:          use_token,
            recourse:           recourse,
        };

        let remaining: Invoice = Invoice {
            owner:        self.caller,
            debtor:       invoice.debtor,
            amount:       remaining_amount,
            due_date:     invoice.due_date,
            invoice_hash: remaining_invoice_hash,
            nonce:        remaining_nonce,
            metadata:     invoice.metadata,
            document_cid: invoice.document_cid,
        };

        return (offer, remaining, final {
            verify_factor_active(factor);
        });
    }

    // Step 2 — Called by: Factor (native credits path)
    // Transfers the advance to the business and mints a FactoredInvoice.
    // Factor must own both the FactoringOffer and a sufficient credits record.
    // For USDCx path use execute_factoring_token instead.
    fn execute_factoring(
        offer: FactoringOffer,
        payment: credits.aleo::credits,
    ) -> (FactoredInvoice, credits.aleo::credits, credits.aleo::credits, Final) {
        // Only the factor named in the offer can execute.
        assert(offer.owner == self.caller);
        assert(!offer.use_token);

        let product: u128 = (offer.amount as u128) * (offer.advance_rate as u128);
        let advance_amount: u64 = (product / 10000u128) as u64;
        assert(payment.microcredits >= advance_amount);

        let factored: FactoredInvoice = FactoredInvoice {
            owner:              self.caller,
            original_creditor:  offer.original_creditor,
            debtor:             offer.debtor,
            amount:             offer.amount,
            advance_amount:     advance_amount,
            due_date:           offer.due_date,
            factoring_date:     0u64,   // block.timestamp unavailable in proof context
            advance_rate:       offer.advance_rate,
            invoice_hash:       offer.invoice_hash,
            recourse:           offer.recourse,
        };

        // Factor's credits → business. Remainder returned as change.
        let (business_payment, change): (credits.aleo::credits, credits.aleo::credits) =
            credits.aleo::transfer_private(payment, offer.original_creditor, advance_amount);

        let factor: address = self.caller;
        return (factored, business_payment, change, final {
            update_factor_stats(factor);
        });
    }

    // Step 2 — Called by: Factor (USDCx stablecoin path)
    // PREREQUISITE: Factor must first call test_usdcx_stablecoin.aleo::approve_public
    //   to approve this program as spender for at least advance_amount.
    // USDCx and credits.aleo both use 6 decimal places (1:1 scale for advance_amount).
    fn execute_factoring_token(
        offer: FactoringOffer,
    ) -> (FactoredInvoice, Final) {
        assert(offer.owner == self.caller);
        assert(offer.use_token);

        let product: u128 = (offer.amount as u128) * (offer.advance_rate as u128);
        let advance_amount: u64 = (product / 10000u128) as u64;

        let factored: FactoredInvoice = FactoredInvoice {
            owner:              self.caller,
            original_creditor:  offer.original_creditor,
            debtor:             offer.debtor,
            amount:             offer.amount,
            advance_amount:     advance_amount,
            due_date:           offer.due_date,
            factoring_date:     0u64,
            advance_rate:       offer.advance_rate,
            invoice_hash:       offer.invoice_hash,
            recourse:           offer.recourse,
        };

        // Cross-program call returns a Final — composed into this entry point's final block.
        let transfer_final: Final = test_usdcx_stablecoin.aleo::transfer_from_public(
            self.caller, offer.original_creditor, advance_amount as u128
        );

        let factor: address = self.caller;
        return (factored, final {
            transfer_final.run();
            update_factor_stats(factor);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // SETTLEMENT
    // ─────────────────────────────────────────────────────────────

    // Called by factor to manually mark invoice settled (e.g. debtor paid off-chain).
    // Records factored.amount as the settlement amount for downstream pool payouts.
    fn settle_invoice(
        factored: FactoredInvoice,
    ) -> Final {
        assert(factored.owner == self.caller);
        let invoice_hash: field = factored.invoice_hash;
        let factor: address = self.caller;
        let amount: u64 = factored.amount;
        return final {
            record_settlement(invoice_hash, factor, amount);
        };
    }

    // Re-issue payment notice to debtor. Factor retains their FactoredInvoice.
    // Pure proof-context transition — no on-chain state change.
    fn create_payment_request(
        factored: FactoredInvoice,
    ) -> (FactoredInvoice, PaymentNotice) {
        assert(factored.owner == self.caller);

        let same: FactoredInvoice = FactoredInvoice {
            owner:              factored.owner,
            original_creditor:  factored.original_creditor,
            debtor:             factored.debtor,
            amount:             factored.amount,
            advance_amount:     factored.advance_amount,
            due_date:           factored.due_date,
            factoring_date:     factored.factoring_date,
            advance_rate:       factored.advance_rate,
            invoice_hash:       factored.invoice_hash,
            recourse:           factored.recourse,
        };

        let notice: PaymentNotice = PaymentNotice {
            owner:        factored.debtor,
            factor:       self.caller,
            amount:       factored.amount,
            due_date:     factored.due_date,
            invoice_hash: factored.invoice_hash,
        };

        return (same, notice);
    }

    // Atomically transfers payment from debtor's public balance to factor AND marks settled.
    // Uses transfer_public_as_signer so the debit comes from the signer (debtor),
    // not from the program's escrow. Eliminates the prior racy two-tx pattern.
    fn pay_invoice(
        notice: PaymentNotice,
        factor: address,
    ) -> Final {
        assert(notice.owner == self.caller);
        assert(notice.factor == factor);

        let f_pay: Final = credits.aleo::transfer_public_as_signer(factor, notice.amount);

        let invoice_hash: field = notice.invoice_hash;
        let amount: u64 = notice.amount;
        return final {
            record_settlement(invoice_hash, factor, amount);
            f_pay.run();
        };
    }

    // ─────────────────────────────────────────────────────────────
    // RECOURSE TRACKING
    // ─────────────────────────────────────────────────────────────

    // Called by: Factor
    // When: Debtor has not paid past due_date and FactoredInvoice.recourse == true.
    // Effect: Burns FactoredInvoice, emits RecourseNotice to business,
    //         sets recourse_claims[invoice_hash] = true.
    fn initiate_recourse(
        factored: FactoredInvoice,
    ) -> (RecourseNotice, Final) {
        assert(factored.owner == self.caller);
        assert(factored.recourse);

        let notice: RecourseNotice = RecourseNotice {
            owner:          factored.original_creditor,
            factor:         self.caller,
            advance_amount: factored.advance_amount,
            invoice_hash:   factored.invoice_hash,
        };

        let invoice_hash: field = factored.invoice_hash;
        let due_date: u64 = factored.due_date;
        return (notice, final {
            assert((block.timestamp as u64) > due_date);
            assert(!Mapping::contains(settled_invoices, invoice_hash));
            let already_claimed: bool = Mapping::get_or_use(recourse_claims, invoice_hash, false);
            assert(!already_claimed);
            Mapping::set(recourse_claims, invoice_hash, true);
        });
    }

    // Called by: Business (RecourseNotice.owner)
    // Repays the advance to the factor and clears the recourse claim.
    fn settle_recourse(
        notice: RecourseNotice,
        payment: credits.aleo::credits,
    ) -> (credits.aleo::credits, credits.aleo::credits, Final) {
        assert(notice.owner == self.caller);
        assert(payment.microcredits >= notice.advance_amount);

        let (factor_payment, change): (credits.aleo::credits, credits.aleo::credits) =
            credits.aleo::transfer_private(payment, notice.factor, notice.advance_amount);

        let invoice_hash: field = notice.invoice_hash;
        return (factor_payment, change, final {
            let is_claimed: bool = Mapping::get(recourse_claims, invoice_hash);
            assert(is_claimed);
            Mapping::set(recourse_claims, invoice_hash, false);
        });
    }

    // Called by: Pool owner.
    // Step 1: Transfer settlement.amount credits to PROGRAM_ADDRESS via
    //   credits.aleo::transfer_public(PROGRAM_ADDRESS, amount)
    // Step 2: Call this transition to register the proceeds on-chain.
    // Can only be called once per pool (idempotency guard).
    fn open_pool_distribution(
        invoice_hash: field,
    ) -> Final {
        let caller: address = self.caller;
        return final {
            let registered_owner: address = Mapping::get(pool_owners, invoice_hash);
            assert(registered_owner == caller);
            let settlement: SettlementInfo = Mapping::get(settled_invoices, invoice_hash);
            assert(settlement.is_settled);
            assert(settlement.amount > 0u64);
            let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
            assert(is_closed);
            // Idempotency — can only open once.
            assert(!Mapping::contains(pool_proceeds, invoice_hash));
            Mapping::set(pool_proceeds, invoice_hash, settlement.amount);
            Mapping::set(pool_distributed, invoice_hash, 0u64);
        };
    }

    // Called by: Contributor (PoolShare owner) — shared by legacy and ownerless pools.
    // Payout = floor(pool_proceeds * contributed / pool_contributions).
    // Derived entirely on-chain — caller supplies expected_payout computed off-chain;
    // finalize re-derives and asserts equality. No manipulation possible.
    // Burns the PoolShare record (preventing double-claim).
    // Pays from the program's public escrow (funded by open/pool_open_distribution).
    fn claim_pool_proceeds(
        share: PoolShare,
        expected_payout: u64,
    ) -> (credits.aleo::credits, Final) {
        assert(expected_payout > 0u64);
        assert(share.contributed > 0u64);

        let (payout_record, f_pay): (credits.aleo::credits, Final) =
            credits.aleo::transfer_public_to_private(share.owner, expected_payout);

        let invoice_hash: field = share.invoice_hash;
        let contributed: u64 = share.contributed;
        return (payout_record, final {
            let settlement: SettlementInfo = Mapping::get(settled_invoices, invoice_hash);
            assert(settlement.is_settled);
            let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
            assert(is_closed);
            let proceeds: u64 = Mapping::get(pool_proceeds, invoice_hash);
            assert(proceeds > 0u64);
            // Use authoritative on-chain total — not the snapshot in the share record.
            let total: u64 = Mapping::get(pool_contributions, invoice_hash);
            assert(total > 0u64);
            // Re-derive payout on-chain; reverts if caller passed a manipulated value.
            let expected: u64 = (((proceeds as u128) * (contributed as u128)) / (total as u128)) as u64;
            assert(expected_payout == expected);
            // Over-distribution guard.
            let distributed: u64 = Mapping::get_or_use(pool_distributed, invoice_hash, 0u64);
            assert(distributed + expected_payout <= proceeds);
            Mapping::set(pool_distributed, invoice_hash, distributed + expected_payout);
            f_pay.run();
        });
    }

    // ─────────────────────────────────────────────────────────────
    // OWNERLESS POOL - CREATE
    // ─────────────────────────────────────────────────────────────
    // Any active factor creates a pool. No single owner — the program address
    // acts as trustless escrow for all contributed credits.
    //
    // name_u128: ASCII pool name encoded as u128 (max 16 chars).
    //            Use encodePoolName() from src/lib/pool-chain.ts.
    // min_advance_rate/max_advance_rate: accepted invoice pricing range (bps).
    // min_contribution: pool-defined minimum contribution in microcredits.

    fn create_ownerless_pool(
        invoice_hash: field,
        name_u128: u128,
        min_advance_rate: u16,
        max_advance_rate: u16,
        min_contribution: u64,
        use_token: bool,
    ) -> Final {
        assert(min_advance_rate >= 5000u16 && min_advance_rate <= 9900u16);
        assert(max_advance_rate >= 5000u16 && max_advance_rate <= 9900u16);
        assert(min_advance_rate <= max_advance_rate);
        assert(min_contribution > 0u64);
        let creator: address = self.caller;
        return final {
            verify_factor_active(creator);
            // Pool for this invoice hash must not already exist.
            assert(!Mapping::contains(pool_meta, invoice_hash));
            assert(!Mapping::contains(pool_contributions, invoice_hash));
            pool_registry.push(invoice_hash);
            Mapping::set(pool_meta, invoice_hash, PoolMeta {
                name_u128:        name_u128,
                min_advance_rate: min_advance_rate,
                max_advance_rate: max_advance_rate,
                min_contribution: min_contribution,
                created_at:       (block.timestamp as u64),
            });
            Mapping::set(pool_use_token,   invoice_hash, use_token);
            Mapping::set(pool_contributions, invoice_hash, 0u64);
            Mapping::set(pool_closed,        invoice_hash, false);
            Mapping::set(pool_vote_count,    invoice_hash, 0u8);
        };
    }

    // ─────────────────────────────────────────────────────────────
    // OWNERLESS POOL — CONTRIBUTE
    // ─────────────────────────────────────────────────────────────
    // Pulls from the caller's PUBLIC credits balance into the program's
    // PUBLIC escrow balance. No private record is consumed.
    //
    // PREREQUISITE: Caller must have a public credits balance >= contribution.
    //   If only holding private records, first call:
    //   credits.aleo::transfer_private_to_public(self, amount)
    //
    // program_addr:   VITE_PROGRAM_ADDRESS — verified on-chain via self.address.
    // existing_total: read pool_contributions[invoice_hash] from chain before
    //                 calling — used only to snapshot total_pool in PoolShare.

    fn pool_contribute(
        invoice_hash: field,
        program_addr: address,
        contribution: u64,
        existing_total: u64,
    ) -> (PoolShare, Final) {
        assert(contribution > 0u64);

        let share: PoolShare = PoolShare {
            owner:        self.caller,
            pool_id:      invoice_hash,
            invoice_hash: invoice_hash,
            contributed:  contribution,
            total_pool:   existing_total + contribution,
        };

        let contributor: address = self.caller;
        let f: Final = credits.aleo::transfer_public_as_signer(program_addr, contribution);
        return (share, final {
            let use_token: bool = Mapping::get_or_use(pool_use_token, invoice_hash, false);
            assert(!use_token);
            assert(program_addr == self.address);
            verify_factor_active(contributor);
            let meta: PoolMeta = Mapping::get(pool_meta, invoice_hash);
            let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
            assert(!is_closed);
            assert(contribution >= meta.min_contribution);
            let current: u64 = Mapping::get_or_use(pool_contributions, invoice_hash, 0u64);
            Mapping::set(pool_contributions, invoice_hash, current + contribution);
            f.run();
        });
    }

    // Token variant of pool_contribute for USDCx pools.
    fn pool_contribute_token(
        invoice_hash: field,
        program_addr: address,
        contribution: u64,
        existing_total: u64,
    ) -> (PoolShare, Final) {
        assert(contribution > 0u64);

        let share: PoolShare = PoolShare {
            owner:        self.caller,
            pool_id:      invoice_hash,
            invoice_hash: invoice_hash,
            contributed:  contribution,
            total_pool:   existing_total + contribution,
        };

        let contributor: address = self.caller;
        let f: Final = test_usdcx_stablecoin.aleo::transfer_from_public(
            contributor,
            program_addr,
            contribution as u128,
        );
        return (share, final {
            let use_token: bool = Mapping::get_or_use(pool_use_token, invoice_hash, false);
            assert(use_token);
            assert(program_addr == self.address);
            verify_factor_active(contributor);
            let meta: PoolMeta = Mapping::get(pool_meta, invoice_hash);
            let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
            assert(!is_closed);
            assert(contribution >= meta.min_contribution);
            let current: u64 = Mapping::get_or_use(pool_contributions, invoice_hash, 0u64);
            Mapping::set(pool_contributions, invoice_hash, current + contribution);
            f.run();
        });
    }

    // ─────────────────────────────────────────────────────────────
    // OWNERLESS POOL — BUSINESS SUBMITS INVOICE
    // ─────────────────────────────────────────────────────────────
    // Called by the business (Invoice.owner) once the pool is fully funded.
    // Consumes the Invoice record — prevents double-factoring.
    // Creates a public PendingPoolOffer that any factor can vote to approve.
    // pool_hash identifies the pool and does not need to match invoice_hash.
    //
    // The submitted advance_rate must be within the pool-configured range.
    // The pool must currently have enough contributed balance for the computed
    // advance_amount.

    fn pool_submit_invoice(
        invoice: Invoice,
        pool_hash: field,
        advance_rate: u16,
    ) -> Final {
        assert(invoice.owner == self.caller);

        let product: u128 = (invoice.amount as u128) * (advance_rate as u128);
        let advance_amount: u64 = (product / 10000u128) as u64;

        let creditor: address = self.caller;
        let debtor: address = invoice.debtor;
        let amount: u64 = invoice.amount;
        let due_date: u64 = invoice.due_date;
        let nonce: field = invoice.nonce;
        return final {
            let meta: PoolMeta = Mapping::get(pool_meta, pool_hash);
            let is_closed: bool = Mapping::get_or_use(pool_closed, pool_hash, false);
            assert(!is_closed);
            assert(!Mapping::contains(pool_pending_offer, pool_hash));
            assert(advance_rate >= meta.min_advance_rate);
            assert(advance_rate <= meta.max_advance_rate);
            let total_contributed: u64 = Mapping::get(pool_contributions, pool_hash);
            assert(total_contributed >= advance_amount);
            Mapping::set(pool_pending_offer, pool_hash, PendingPoolOffer {
                original_creditor: creditor,
                debtor:            debtor,
                amount:            amount,
                advance_rate:      advance_rate,
                advance_amount:    advance_amount,
                due_date:          due_date,
                nonce:             nonce,
                is_executed:       false,
            });
        };
    }

    // ─────────────────────────────────────────────────────────────
    // OWNERLESS POOL — MULTISIG VOTE
    // ─────────────────────────────────────────────────────────────
    // Any active factor votes to approve a pending pool offer.
    // Threshold = floor(active_factor_count / 2) + 1 (simple majority).
    // Once vote_count >= threshold, any factor can call execute_approved_pool.

    fn pool_vote(invoice_hash: field) -> Final {
        let voter: address = self.caller;
        return final {
            verify_factor_active(voter);
            let offer: PendingPoolOffer = Mapping::get(pool_pending_offer, invoice_hash);
            assert(!offer.is_executed);
            // Composite key prevents double-voting.
            let vote_id: field = Poseidon2::hash_to_field(VoteId {
                invoice_hash: invoice_hash,
                voter:        voter,
            });
            let already_voted: bool = Mapping::get_or_use(pool_voter_cast, vote_id, false);
            assert(!already_voted);
            Mapping::set(pool_voter_cast, vote_id, true);
            let count: u8 = Mapping::get_or_use(pool_vote_count, invoice_hash, 0u8);
            Mapping::set(pool_vote_count, invoice_hash, count + 1u8);
        };
    }

    // ─────────────────────────────────────────────────────────────
    // OWNERLESS POOL — EXECUTE APPROVED OFFER
    // ─────────────────────────────────────────────────────────────
    // Called by any active factor once vote_count >= majority threshold.
    // Pays advance_amount from the program's public escrow to the business.
    // Emits a PoolPaymentNotice to the debtor. Closes the pool.
    //
    // Caller must read pool_pending_offer[invoice_hash] off-chain and pass
    // the values as params — all verified against the mapping on-chain.

    fn execute_approved_pool(
        invoice_hash: field,
        business_addr: address,
        debtor_addr: address,
        advance_amount: u64,
        invoice_amount: u64,
        due_date: u64,
    ) -> (PoolPaymentNotice, Final) {
        assert(advance_amount > 0u64);

        let notice: PoolPaymentNotice = PoolPaymentNotice {
            owner:        debtor_addr,
            invoice_hash: invoice_hash,
            amount:       invoice_amount,
            due_date:     due_date,
        };

        let executor: address = self.caller;
        let f_pay: Final = credits.aleo::transfer_public(business_addr, advance_amount);
        return (notice, final {
            let use_token: bool = Mapping::get_or_use(pool_use_token, invoice_hash, false);
            assert(!use_token);
            let offer: PendingPoolOffer = Mapping::get(pool_pending_offer, invoice_hash);
            assert(!offer.is_executed);
            assert(offer.original_creditor == business_addr);
            assert(offer.debtor            == debtor_addr);
            assert(offer.advance_amount    == advance_amount);
            assert(offer.amount            == invoice_amount);
            let vote_count: u8   = Mapping::get_or_use(pool_vote_count, invoice_hash, 0u8);
            let active_count: u32 = Mapping::get_or_use(active_factor_count, false, 1u32);
            let threshold: u8    = ((active_count / 2u32) + 1u32) as u8;
            assert(vote_count >= threshold);
            Mapping::set(pool_pending_offer, invoice_hash, PendingPoolOffer {
                original_creditor: offer.original_creditor,
                debtor:            offer.debtor,
                amount:            offer.amount,
                advance_rate:      offer.advance_rate,
                advance_amount:    offer.advance_amount,
                due_date:          offer.due_date,
                nonce:             offer.nonce,
                is_executed:       true,
            });
            Mapping::set(pool_closed,   invoice_hash, true);
            Mapping::set(pool_executor, invoice_hash, executor);
            update_factor_stats(executor);
            f_pay.run();
        });
    }

    // Token variant of execute_approved_pool for USDCx pools.
    fn execute_approved_pool_token(
        invoice_hash: field,
        business_addr: address,
        debtor_addr: address,
        advance_amount: u64,
        invoice_amount: u64,
        due_date: u64,
    ) -> (PoolPaymentNotice, Final) {
        assert(advance_amount > 0u64);

        let notice: PoolPaymentNotice = PoolPaymentNotice {
            owner:        debtor_addr,
            invoice_hash: invoice_hash,
            amount:       invoice_amount,
            due_date:     due_date,
        };

        let executor: address = self.caller;
        let f_pay: Final = test_usdcx_stablecoin.aleo::transfer_public(
            business_addr,
            advance_amount as u128,
        );
        return (notice, final {
            let use_token: bool = Mapping::get_or_use(pool_use_token, invoice_hash, false);
            assert(use_token);
            let offer: PendingPoolOffer = Mapping::get(pool_pending_offer, invoice_hash);
            assert(!offer.is_executed);
            assert(offer.original_creditor == business_addr);
            assert(offer.debtor            == debtor_addr);
            assert(offer.advance_amount    == advance_amount);
            assert(offer.amount            == invoice_amount);
            let vote_count: u8   = Mapping::get_or_use(pool_vote_count, invoice_hash, 0u8);
            let active_count: u32 = Mapping::get_or_use(active_factor_count, false, 1u32);
            let threshold: u8    = ((active_count / 2u32) + 1u32) as u8;
            assert(vote_count >= threshold);
            Mapping::set(pool_pending_offer, invoice_hash, PendingPoolOffer {
                original_creditor: offer.original_creditor,
                debtor:            offer.debtor,
                amount:            offer.amount,
                advance_rate:      offer.advance_rate,
                advance_amount:    offer.advance_amount,
                due_date:          offer.due_date,
                nonce:             offer.nonce,
                is_executed:       true,
            });
            Mapping::set(pool_closed,   invoice_hash, true);
            Mapping::set(pool_executor, invoice_hash, executor);
            update_factor_stats(executor);
            f_pay.run();
        });
    }

    // ─────────────────────────────────────────────────────────────
    // OWNERLESS POOL — DEBTOR PAYS
    // ─────────────────────────────────────────────────────────────
    // Debtor sends the full invoice amount to the program escrow.
    // Triggers settlement so contributors can call claim_pool_proceeds.

    fn pay_pool_invoice(
        notice: PoolPaymentNotice,
        program_addr: address,
    ) -> Final {
        assert(notice.owner == self.caller);
        let f_pay: Final = credits.aleo::transfer_public_as_signer(program_addr, notice.amount);
        let invoice_hash: field = notice.invoice_hash;
        let amount: u64 = notice.amount;
        return final {
            let use_token: bool = Mapping::get_or_use(pool_use_token, invoice_hash, false);
            assert(!use_token);
            assert(program_addr == self.address);
            assert(!Mapping::contains(settled_invoices, invoice_hash));
            let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
            assert(is_closed);
            let offer: PendingPoolOffer = Mapping::get(pool_pending_offer, invoice_hash);
            assert(offer.is_executed);
            assert(amount == offer.amount);
            let executor: address = Mapping::get(pool_executor, invoice_hash);
            Mapping::set(settled_invoices, invoice_hash, SettlementInfo {
                is_settled:      true,
                settlement_date: (block.timestamp as u64),
                factor:          executor,
                amount:          amount,
            });
            let total_settled: u64 = Mapping::get_or_use(protocol_stats, 2u8, 0u64);
            Mapping::set(protocol_stats, 2u8, total_settled + 1u64);
            f_pay.run();
        };
    }

    // Token variant of pay_pool_invoice for USDCx pools.
    fn pay_pool_invoice_token(
        notice: PoolPaymentNotice,
        program_addr: address,
    ) -> Final {
        assert(notice.owner == self.caller);
        let f_pay: Final = test_usdcx_stablecoin.aleo::transfer_public_as_signer(
            program_addr,
            notice.amount as u128,
        );
        let invoice_hash: field = notice.invoice_hash;
        let amount: u64 = notice.amount;
        return final {
            let use_token: bool = Mapping::get_or_use(pool_use_token, invoice_hash, false);
            assert(use_token);
            assert(program_addr == self.address);
            assert(!Mapping::contains(settled_invoices, invoice_hash));
            let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
            assert(is_closed);
            let offer: PendingPoolOffer = Mapping::get(pool_pending_offer, invoice_hash);
            assert(offer.is_executed);
            assert(amount == offer.amount);
            let executor: address = Mapping::get(pool_executor, invoice_hash);
            Mapping::set(settled_invoices, invoice_hash, SettlementInfo {
                is_settled:      true,
                settlement_date: (block.timestamp as u64),
                factor:          executor,
                amount:          amount,
            });
            let total_settled: u64 = Mapping::get_or_use(protocol_stats, 2u8, 0u64);
            Mapping::set(protocol_stats, 2u8, total_settled + 1u64);
            f_pay.run();
        };
    }

    // ─────────────────────────────────────────────────────────────
    // OWNERLESS POOL — OPEN DISTRIBUTION (permissionless)
    // ─────────────────────────────────────────────────────────────
    // Unlike the legacy open_pool_distribution (requires pool owner),
    // this version can be called by anyone once the invoice is settled.
    // Credits are already in the program escrow — no external transfer needed.
    // claim_pool_proceeds is then available to all PoolShare holders.

    fn pool_open_distribution(invoice_hash: field) -> Final {
        return final {
            assert(Mapping::contains(pool_meta, invoice_hash));
            let settlement: SettlementInfo = Mapping::get(settled_invoices, invoice_hash);
            assert(settlement.is_settled);
            assert(settlement.amount > 0u64);
            let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
            assert(is_closed);
            let offer: PendingPoolOffer = Mapping::get(pool_pending_offer, invoice_hash);
            assert(offer.is_executed);
            // Debtor-payment-only distribution model:
            // contributors share only the debtor repayment amount.
            let pool_proceeds_value: u64 = settlement.amount;
            // Idempotency — only open once.
            assert(!Mapping::contains(pool_proceeds, invoice_hash));
            Mapping::set(pool_proceeds,    invoice_hash, pool_proceeds_value);
            Mapping::set(pool_distributed, invoice_hash, 0u64);
        };
    }

    // Called by: Contributor (PoolShare owner) — token pools only.
    // Mirrors claim_pool_proceeds, but transfers USDCx from the program's
    // public escrow into the caller's private token record.
    fn claim_pool_proceeds_token(
        share: PoolShare,
        expected_payout: u64,
    ) -> (
        test_usdcx_stablecoin.aleo::ComplianceRecord,
        test_usdcx_stablecoin.aleo::Token,
        Final,
    ) {
        assert(expected_payout > 0u64);
        assert(share.contributed > 0u64);

        let (compliance_record, payout_record, f_pay): (
            test_usdcx_stablecoin.aleo::ComplianceRecord,
            test_usdcx_stablecoin.aleo::Token,
            Final,
        ) =
            test_usdcx_stablecoin.aleo::transfer_public_to_private(
                share.owner,
                expected_payout as u128,
            );

        let invoice_hash: field = share.invoice_hash;
        let contributed: u64 = share.contributed;
        return (compliance_record, payout_record, final {
            let settlement: SettlementInfo = Mapping::get(settled_invoices, invoice_hash);
            assert(settlement.is_settled);
            let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
            assert(is_closed);
            let proceeds: u64 = Mapping::get(pool_proceeds, invoice_hash);
            assert(proceeds > 0u64);
            let total: u64 = Mapping::get(pool_contributions, invoice_hash);
            assert(total > 0u64);
            let expected: u64 = (((proceeds as u128) * (contributed as u128)) / (total as u128)) as u64;
            assert(expected_payout == expected);
            let distributed: u64 = Mapping::get_or_use(pool_distributed, invoice_hash, 0u64);
            assert(distributed + expected_payout <= proceeds);
            Mapping::set(pool_distributed, invoice_hash, distributed + expected_payout);
            f_pay.run();
        });
    }
}
