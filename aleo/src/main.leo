// ZK-Factor: Confidential invoice factoring platform on Aleo blockchain
// Cryptographically prevents double-factoring fraud while maintaining complete privacy
import credits.aleo;
import test_usdcx_stablecoin.aleo;

program zk_factor_9597.aleo {
    // Simple admin-controlled upgradable constructor for MVP
    // Can be upgraded to multi-sig governance later
    // IMPORTANT: Replace with actual admin address before deployment
    // See aleo/docs/deployment.md for admin key management
    @admin(address="aleo19rn544c49da9z2vz52q5f7lm7nsjhp890ahmre6cz94qawdscgps6kq3cu")
    async constructor() {}

    // Public mappings for factor registry and settlement tracking
    mapping active_factors: address => FactorInfo;
    mapping settled_invoices: field => SettlementInfo;
    mapping protocol_stats: u8 => u64;

    // Recourse claim tracking: invoice_hash => claimed (true = recourse initiated, false = settled/cleared)
    mapping recourse_claims: field => bool;

    // Pool state mappings — keyed by invoice_hash
    mapping pool_contributions: field => u64;   // total credits contributed to this pool
    mapping pool_owners: field => address;       // who created the pool
    mapping pool_closed: field => bool;          // true after execute_pool_factoring is called

    // Enumerable list of all registered factor addresses (includes deregistered)
    // Compiles to: factor_addresses__ (u32 => address) and factor_addresses__len__ (bool => u32)
    storage factor_addresses: [address];

    // Invoice record owned by business (consumed during factoring)
    record Invoice {
        owner: address,
        debtor: address,
        amount: u64,
        due_date: u64,
        invoice_hash: field,
        nonce: field,
        metadata: u128,
        // IPFS CID encoded as a field element.
        // 0field = no document attached.
        // Non-zero = cidToField(cid) from src/lib/ipfs.ts
        // The full CID string must be stored off-chain — this field only
        // proves a document exists and hasn't been tampered with.
        document_cid: field,
    }

    // FactoredInvoice record owned by factor after purchase
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

    record FactoringOffer {
        owner: address,              // Factor
        original_creditor: address,  // Business that created the original invoice
        debtor: address,             // Customer who owes payment
        amount: u64,                 // Full invoice amount in microcredits
        due_date: u64,               // Original invoice due date (Unix timestamp)
        advance_rate: u16,           // Agreed rate in basis points (e.g. 9500 = 95%)
        invoice_hash: field,         // Links back to the original off-chain invoice
        nonce: field,                // Carried over from Invoice for record uniqueness
        metadata: u128,              // Carried over from Invoice (invoice number, flags)
        use_token: bool,             // true = USDCx, false = native credits
        recourse: bool,              // true = factor can initiate recourse if debtor defaults
    }

    // Private record sent to debtor — only their wallet can read it
    // No public data exposed on-chain
    record PaymentNotice {
        owner: address,    // debtor
        factor: address,
        amount: u64,
        due_date: u64,
        invoice_hash: field,
    }

    // Sent to the original_creditor (business) when factor initiates recourse.
    // Business must call settle_recourse to repay the advance and close the claim.
    record RecourseNotice {
        owner: address,        // original_creditor (business)
        factor: address,       // factor who advanced funds and is owed repayment
        advance_amount: u64,   // amount the business must repay
        invoice_hash: field,
    }

    // Pool metadata record owned by pool creator.
    // total_contributed is a snapshot at creation time (0u64);
    // the live total is always pool_contributions[invoice_hash] on-chain.
    record FactorPool {
        owner: address,
        invoice_hash: field,
        target_amount: u64,
        total_contributed: u64,
        is_closed: bool,
    }

    // Proof of a factor's contribution to a pool.
    // Consumed when the contributor calls claim_pool_proceeds.
    // total_pool is a snapshot at contribution time — used for proportional share calc.
    record PoolShare {
        owner: address,
        pool_id: field,       // = invoice_hash (pool identifier)
        invoice_hash: field,
        contributed: u64,
        total_pool: u64,      // snapshot of pool total at time of this contribution
    }

    // Factor registration and statistics
    struct FactorInfo {
        is_active: bool,
        min_advance_rate: u16,
        max_advance_rate: u16,
        total_factored: u64,
        registration_date: u64,
    }

    // Settlement tracking information
    struct SettlementInfo {
        is_settled: bool,
        settlement_date: u64,
        factor: address,
    }

    // ─────────────────────────────────────────────────────────────
    // INVOICE
    // ─────────────────────────────────────────────────────────────

    // Create an invoice record with validation
    // document_cid: pass 0field if no document, or cidToField(cid) from src/lib/ipfs.ts
    async transition mint_invoice(
        debtor: address,
        amount: u64,
        due_date: u64,
        invoice_hash: field,
        metadata: u128,
        document_cid: field,
    ) -> (Invoice, Future) {
        assert(amount > 0u64);
        assert(debtor != self.caller);
        let nonce: field = Poseidon2::hash_to_field(invoice_hash);
        let invoice: Invoice = Invoice {
            owner: self.caller,
            debtor: debtor,
            amount: amount,
            due_date: due_date,
            invoice_hash: invoice_hash,
            nonce: nonce,
            metadata: metadata,
            document_cid: document_cid,
        };
        return (invoice, finalize_mint_invoice(due_date));
    }

    async function finalize_mint_invoice(due_date: u64) {
        assert(due_date > (block.timestamp as u64));
    }

    // ─────────────────────────────────────────────────────────────
    // FACTOR REGISTRY
    // ─────────────────────────────────────────────────────────────

    // Register as a factoring company
    async transition register_factor(
        min_advance_rate: u16,
        max_advance_rate: u16
    ) -> Future {
        assert(min_advance_rate <= max_advance_rate);
        assert(min_advance_rate >= 5000u16 && min_advance_rate <= 9900u16);
        assert(max_advance_rate >= 5000u16 && max_advance_rate <= 9900u16);
        return finalize_register_factor(self.caller, min_advance_rate, max_advance_rate);
    }

    async function finalize_register_factor(
        factor: address,
        min_rate: u16,
        max_rate: u16
    ) {
        let existing_factor: FactorInfo = Mapping::get_or_use(active_factors, factor, FactorInfo {
            is_active: false,
            min_advance_rate: 0u16,
            max_advance_rate: 0u16,
            total_factored: 0u64,
            registration_date: 0u64,
        });
        assert(!existing_factor.is_active);
        factor_addresses.push(factor);
        let new_factor: FactorInfo = FactorInfo {
            is_active: true,
            min_advance_rate: min_rate,
            max_advance_rate: max_rate,
            total_factored: 0u64,
            registration_date: (block.timestamp as u64),
        };
        Mapping::set(active_factors, factor, new_factor);
    }

    // Deregister as a factoring company
    async transition deregister_factor() -> Future {
        return finalize_deregister_factor(self.caller);
    }

    async function finalize_deregister_factor(factor: address) {
        let factor_info: FactorInfo = Mapping::get(active_factors, factor);
        let updated_info: FactorInfo = FactorInfo {
            is_active: false,
            min_advance_rate: factor_info.min_advance_rate,
            max_advance_rate: factor_info.max_advance_rate,
            total_factored: factor_info.total_factored,
            registration_date: factor_info.registration_date,
        };
        Mapping::set(active_factors, factor, updated_info);
    }

    // ─────────────────────────────────────────────────────────────
    // TWO-STEP FACTORING HANDSHAKE
    // ─────────────────────────────────────────────────────────────

    // Called by: Business
    // Inputs:    Invoice (owned by business), factor address, agreed rate, currency, recourse flag
    // Outputs:   FactoringOffer (owned by factor)
    //
    // This is the business's commitment — once called, the Invoice is
    // consumed and cannot be double-factored. The business cannot back out.
    // The factor receives a FactoringOffer they can accept at any time.
    async transition authorize_factoring(
        invoice: Invoice,
        factor: address,
        advance_rate: u16,
        use_token: bool,
        recourse: bool,
    ) -> (FactoringOffer, Future) {

        // Only the invoice owner (business) can initiate factoring
        assert(invoice.owner == self.caller);

        // Enforce advance rate bounds: 50% (5000) to 99% (9900) basis points
        assert(advance_rate >= 5000u16 && advance_rate <= 9900u16);

        let offer: FactoringOffer = FactoringOffer {
            owner: factor,                   // Factor receives and can act on this
            original_creditor: self.caller,  // Business retains identity for payment routing
            debtor: invoice.debtor,
            amount: invoice.amount,
            due_date: invoice.due_date,
            advance_rate: advance_rate,
            invoice_hash: invoice.invoice_hash,
            nonce: invoice.nonce,
            metadata: invoice.metadata,
            use_token: use_token,
            recourse: recourse,              // Passed through from business; consumed into FactoredInvoice
        };

        return (offer, finalize_authorize_factoring(factor, invoice.invoice_hash));
    }

    // Called by: Business
    // Inputs:    Invoice (owned by business), factor, partial amount, agreed rate, currency, recourse flag
    // Outputs:   FactoringOffer (owned by factor), remaining Invoice (owned by business)
    //
    // This enables partial factoring in a single transaction:
    // - factored portion is converted into a FactoringOffer for the factor
    // - unfactored remainder is returned to the creditor as a new Invoice record
    async transition authorize_partial_factoring(
        invoice: Invoice,
        factor: address,
        factoring_amount: u64,
        advance_rate: u16,
        use_token: bool,
        recourse: bool,
    ) -> (FactoringOffer, Invoice, Future) {

        assert(invoice.owner == self.caller);
        assert(factoring_amount > 0u64);
        assert(factoring_amount < invoice.amount);
        assert(advance_rate >= 5000u16 && advance_rate <= 9900u16);

        let remaining_amount: u64 = invoice.amount - factoring_amount;

        // Derive a deterministic child hash/nonce so the retained remainder can be
        // independently managed and settled without colliding with the sold portion.
        let remaining_invoice_hash: field = Poseidon2::hash_to_field(
            invoice.invoice_hash + (factoring_amount as field)
        );
        let remaining_nonce: field = Poseidon2::hash_to_field(remaining_invoice_hash);

        let offer: FactoringOffer = FactoringOffer {
            owner: factor,
            original_creditor: self.caller,
            debtor: invoice.debtor,
            amount: factoring_amount,
            due_date: invoice.due_date,
            advance_rate: advance_rate,
            invoice_hash: invoice.invoice_hash,
            nonce: invoice.nonce,
            metadata: invoice.metadata,
            use_token: use_token,
            recourse: recourse,
        };

        let remaining: Invoice = Invoice {
            owner: self.caller,
            debtor: invoice.debtor,
            amount: remaining_amount,
            due_date: invoice.due_date,
            invoice_hash: remaining_invoice_hash,
            nonce: remaining_nonce,
            metadata: invoice.metadata,
            document_cid: invoice.document_cid,
        };

        return (offer, remaining, finalize_authorize_factoring(factor, invoice.invoice_hash));
    }

    async function finalize_authorize_factoring(factor: address, invoice_hash: field) {
        // Verify the chosen factor is registered and active in the protocol.
        // Mapping::get panics if the key doesn't exist — unregistered factors
        // will cause this to fail, blocking the whole transaction.
        let factor_info: FactorInfo = Mapping::get(active_factors, factor);
        assert(factor_info.is_active);
    }

    // Called by: Factor (native credits path)
    // Inputs:    FactoringOffer (owned by factor), credits (owned by factor)
    // Outputs:   FactoredInvoice (owned by factor), payment to business, change
    //
    // Because the factor is self.caller, they legally own both inputs.
    // This is what makes the payment routing correct — the factor's own
    // credits are transferred to the business, not the business's credits
    // going back to themselves.
    async transition execute_factoring(
        offer: FactoringOffer,
        payment: credits.aleo/credits,
    ) -> (FactoredInvoice, credits.aleo/credits, credits.aleo/credits, Future) {

        // Only the factor (offer.owner) can execute — prevents anyone else
        // from accepting an offer intended for a specific factor
        assert(offer.owner == self.caller);

        // Guard: this transition is only for native credits.
        // If the offer was authorized with use_token=true, the factor must
        // call execute_factoring_token instead — prevents silent wrong-path execution.
        assert(!offer.use_token);

        // Safe multiplication using u128 to prevent overflow before dividing
        // back down to u64. Mirrors the advance rate calculation from the old code.
        let product: u128 = (offer.amount as u128) * (offer.advance_rate as u128);
        let advance_amount: u64 = (product / 10000u128) as u64;

        // Factor must provide enough credits to cover the advance payment
        assert(payment.microcredits >= advance_amount);

        // Build the FactoredInvoice — factor owns this as proof of purchase.
        // They will present this record later when the debtor pays (settle_invoice).
        let factored: FactoredInvoice = FactoredInvoice {
            owner: self.caller,                   // Factor holds this as their asset
            original_creditor: offer.original_creditor,
            debtor: offer.debtor,
            amount: offer.amount,
            advance_amount: advance_amount,
            due_date: offer.due_date,
            factoring_date: 0u64,                 // block.timestamp not available in transition scope
            advance_rate: offer.advance_rate,
            invoice_hash: offer.invoice_hash,
            recourse: offer.recourse,             // Carry through from offer (set by business in authorize_factoring)
        };

        // Factor (self.caller) owns `payment`, transfers advance_amount to business.
        // `change` is the leftover credits returned to the factor.
        let (business_payment, change): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, offer.original_creditor, advance_amount);

        return (factored, business_payment, change, finalize_execute_factoring(self.caller, offer.invoice_hash));
    }

    async function finalize_execute_factoring(factor: address, invoice_hash: field) {
        // Re-verify factor is still active at execution time.
        // Protects against a factor being deregistered between Step 1 and Step 2.
        let factor_info: FactorInfo = Mapping::get(active_factors, factor);
        assert(factor_info.is_active);

        // Increment global protocol counter (key 1 = total factored)
        let total_factored: u64 = Mapping::get_or_use(protocol_stats, 1u8, 0u64);
        Mapping::set(protocol_stats, 1u8, total_factored + 1u64);

        // Update this factor's personal total_factored count
        let updated_factor: FactorInfo = FactorInfo {
            is_active: factor_info.is_active,
            min_advance_rate: factor_info.min_advance_rate,
            max_advance_rate: factor_info.max_advance_rate,
            total_factored: factor_info.total_factored + 1u64,
            registration_date: factor_info.registration_date,
        };
        Mapping::set(active_factors, factor, updated_factor);
    }

    // Called by: Factor (USDCx stablecoin path)
    // Inputs:    FactoringOffer (owned by factor)
    // Outputs:   FactoredInvoice (owned by factor)
    //
    // PREREQUISITE: Factor must first call test_usdcx_stablecoin.aleo/approve_public
    //               to approve this program as spender for at least the advance amount.
    //               This is a separate transaction (approve + execute pattern).
    //
    // USDCx uses ARC-20 public balances — no private record is passed in.
    // The program calls transfer_from_public to move tokens from the factor's
    // balance to the business's balance, using the pre-approved allowance.
    //
    // Both credits.aleo microcredits and USDCx use 6 decimal places, so
    // advance_amount in microcredits == advance_amount in USDCx micro-units (1:1 scale).
    // Adjust if the deployed USDCx program uses a different denomination.
    async transition execute_factoring_token(
        offer: FactoringOffer,
    ) -> (FactoredInvoice, Future) {

        // Only the factor (offer.owner) can execute
        assert(offer.owner == self.caller);

        // Guard: this transition is only for USDCx.
        // If the offer was authorized with use_token=false, the factor must
        // call execute_factoring instead.
        assert(offer.use_token);

        // Safe multiplication using u128 to prevent overflow before dividing
        // back down to u64.
        let product: u128 = (offer.amount as u128) * (offer.advance_rate as u128);
        let advance_amount: u64 = (product / 10000u128) as u64;

        let factored: FactoredInvoice = FactoredInvoice {
            owner: self.caller,
            original_creditor: offer.original_creditor,
            debtor: offer.debtor,
            amount: offer.amount,
            advance_amount: advance_amount,
            due_date: offer.due_date,
            factoring_date: 0u64,
            advance_rate: offer.advance_rate,
            invoice_hash: offer.invoice_hash,
            recourse: offer.recourse,    // Carry through from offer
        };

        let transfer_future: Future = test_usdcx_stablecoin.aleo/transfer_from_public(self.caller, offer.original_creditor, advance_amount as u128);

        return (factored, finalize_exec_factoring_token(self.caller, offer.invoice_hash, transfer_future));
    }

    async function finalize_exec_factoring_token(factor: address, invoice_hash: field, transfer_future: Future) {
        transfer_future.await();

        let factor_info: FactorInfo = Mapping::get(active_factors, factor);
        assert(factor_info.is_active);

        let total_factored: u64 = Mapping::get_or_use(protocol_stats, 1u8, 0u64);
        Mapping::set(protocol_stats, 1u8, total_factored + 1u64);

        let updated_factor: FactorInfo = FactorInfo {
            is_active: factor_info.is_active,
            min_advance_rate: factor_info.min_advance_rate,
            max_advance_rate: factor_info.max_advance_rate,
            total_factored: factor_info.total_factored + 1u64,
            registration_date: factor_info.registration_date,
        };
        Mapping::set(active_factors, factor, updated_factor);
    }

    // ─────────────────────────────────────────────────────────────
    // SETTLEMENT
    // ─────────────────────────────────────────────────────────────

    // Settle a factored invoice
    async transition settle_invoice(
        factored: FactoredInvoice,
    ) -> Future {
        assert(factored.owner == self.caller);
        return finalize_settle_invoice(factored.invoice_hash, self.caller);
    }

    async function finalize_settle_invoice(invoice_hash: field, factor: address) {
        let is_settled: bool = Mapping::contains(settled_invoices, invoice_hash);
        assert(!is_settled);
        let settlement: SettlementInfo = SettlementInfo {
            is_settled: true,
            settlement_date: (block.timestamp as u64),
            factor: factor,
        };
        Mapping::set(settled_invoices, invoice_hash, settlement);
        let total_settled: u64 = Mapping::get_or_use(protocol_stats, 2u8, 0u64);
        Mapping::set(protocol_stats, 2u8, total_settled + 1u64);
    }

    transition create_payment_request(
        factored: FactoredInvoice,
    ) -> (FactoredInvoice, PaymentNotice) {
        assert(factored.owner == self.caller);

        let same: FactoredInvoice = FactoredInvoice {
            owner: factored.owner,
            original_creditor: factored.original_creditor,
            debtor: factored.debtor,
            amount: factored.amount,
            advance_amount: factored.advance_amount,
            due_date: factored.due_date,
            factoring_date: factored.factoring_date,
            advance_rate: factored.advance_rate,
            invoice_hash: factored.invoice_hash,
            recourse: factored.recourse,
        };

        let notice: PaymentNotice = PaymentNotice {
            owner: factored.debtor,
            factor: self.caller,
            amount: factored.amount,
            due_date: factored.due_date,
            invoice_hash: factored.invoice_hash,
        };

        return (same, notice);
    }

    async transition pay_invoice(
        notice: PaymentNotice,
        factor: address,
    ) -> Future {
        assert(notice.owner == self.caller);
        assert(notice.factor == factor);
        return finalize_pay_invoice(notice.invoice_hash, self.caller, notice.amount, factor);
    }

    async function finalize_pay_invoice(
        invoice_hash: field,
        debtor: address,
        amount: u64,
        factor: address,
    ) {
        let is_settled: bool = Mapping::contains(settled_invoices, invoice_hash);
        assert(!is_settled);

        let settlement: SettlementInfo = SettlementInfo {
            is_settled: true,
            settlement_date: (block.timestamp as u64),
            factor: factor,
        };
        Mapping::set(settled_invoices, invoice_hash, settlement);

        let total_settled: u64 = Mapping::get_or_use(protocol_stats, 2u8, 0u64);
        Mapping::set(protocol_stats, 2u8, total_settled + 1u64);
    }

    // ─────────────────────────────────────────────────────────────
    // RECOURSE TRACKING
    // ─────────────────────────────────────────────────────────────

    // Called by: Factor
    // When: Debtor has not paid past due_date and the FactoredInvoice has recourse=true.
    // Effect: Burns the FactoredInvoice, emits a RecourseNotice to the original_creditor,
    //         and sets recourse_claims[invoice_hash] = true.
    // Finalize guards: invoice must NOT be settled, must NOT already have a live claim.
    async transition initiate_recourse(
        factored: FactoredInvoice,
    ) -> (RecourseNotice, Future) {
        assert(factored.owner == self.caller);

        // Only recourse-eligible invoices can trigger this path
        assert(factored.recourse);

        // Emit notice to business — they must now repay the advance
        let notice: RecourseNotice = RecourseNotice {
            owner: factored.original_creditor,
            factor: self.caller,
            advance_amount: factored.advance_amount,
            invoice_hash: factored.invoice_hash,
        };

        return (notice, finalize_initiate_recourse(factored.invoice_hash, factored.due_date));
    }

    async function finalize_initiate_recourse(invoice_hash: field, due_date: u64) {
        // Invoice must be overdue — block timestamp must be past due_date
        assert((block.timestamp as u64) > due_date);

        // Invoice must NOT already be settled by the debtor
        let is_settled: bool = Mapping::contains(settled_invoices, invoice_hash);
        assert(!is_settled);

        // Must not already have an active recourse claim
        let already_claimed: bool = Mapping::get_or_use(recourse_claims, invoice_hash, false);
        assert(!already_claimed);

        Mapping::set(recourse_claims, invoice_hash, true);
    }

    // Called by: Business (RecourseNotice.owner)
    // When: Business has received a RecourseNotice and wants to repay the factor.
    // Effect: Transfers advance_amount from business credits to factor. Clears recourse claim.
    async transition settle_recourse(
        notice: RecourseNotice,
        payment: credits.aleo/credits,
    ) -> (credits.aleo/credits, credits.aleo/credits, Future) {
        assert(notice.owner == self.caller);
        assert(payment.microcredits >= notice.advance_amount);

        // Transfer advance_amount to factor; change is returned to business (self.caller)
        let (factor_payment, change): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, notice.factor, notice.advance_amount);

        return (factor_payment, change, finalize_settle_recourse(notice.invoice_hash));
    }

    async function finalize_settle_recourse(invoice_hash: field) {
        // Claim must be active before it can be settled
        let is_claimed: bool = Mapping::get(recourse_claims, invoice_hash);
        assert(is_claimed);

        // Clear the recourse claim
        Mapping::set(recourse_claims, invoice_hash, false);
    }

    // ─────────────────────────────────────────────────────────────
    // FACTOR POOLS
    // ─────────────────────────────────────────────────────────────

    // Called by: Any registered factor
    // Creates a pool for a specific invoice. Pool state is tracked in mappings.
    // The Pool record returned is metadata owned by the creator.
    async transition create_pool(
        invoice_hash: field,
        target_amount: u64,
    ) -> (FactorPool, Future) {
        assert(target_amount > 0u64);

        let pool: FactorPool = FactorPool {
            owner: self.caller,
            invoice_hash: invoice_hash,
            target_amount: target_amount,
            total_contributed: 0u64, // live total tracked in pool_contributions mapping
            is_closed: false,
        };

        return (pool, finalize_create_pool(self.caller, invoice_hash, target_amount));
    }

    async function finalize_create_pool(
        creator: address,
        invoice_hash: field,
        target_amount: u64,
    ) {
        let factor_info: FactorInfo = Mapping::get(active_factors, creator);
        assert(factor_info.is_active);

        // Pool must not already exist for this invoice
        assert(!Mapping::contains(pool_contributions, invoice_hash));

        Mapping::set(pool_contributions, invoice_hash, 0u64);
        Mapping::set(pool_owners, invoice_hash, creator);
        Mapping::set(pool_closed, invoice_hash, false);
    }

    // Called by: Any registered factor
    // Contributes credits to a pool identified by invoice_hash.
    // Credits are transferred to the pool owner (who will execute the factoring).
    // Contributor receives a PoolShare as proof of their proportional ownership.
    //
    // pool_owner: must match pool_owners[invoice_hash] — verified in finalize.
    // existing_total: read pool_contributions[invoice_hash] off-chain before calling;
    //                 used to snapshot total_pool in the PoolShare record.
    async transition contribute_to_pool(
        invoice_hash: field,
        pool_owner: address,
        existing_total: u64,
        payment: credits.aleo/credits,
        contribution: u64,
    ) -> (PoolShare, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(contribution > 0u64);
        assert(payment.microcredits >= contribution);

        // Transfer contribution to pool owner; change returned to contributor (self.caller)
        let (pool_payment, change): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, pool_owner, contribution);

        let new_total: u64 = existing_total + contribution;

        // Pool share basis points: contributed * 10000 / total_pool (avoids floats)
        // total_pool snapshot is taken at contribution time — used for proportional payout later
        let share: PoolShare = PoolShare {
            owner: self.caller,
            pool_id: invoice_hash,
            invoice_hash: invoice_hash,
            contributed: contribution,
            total_pool: new_total,
        };

        return (share, pool_payment, change, finalize_contribute_to_pool(invoice_hash, pool_owner, contribution));
    }

    async function finalize_contribute_to_pool(
        invoice_hash: field,
        pool_owner: address,
        contribution: u64,
    ) {
        // Pool must exist and not be closed
        assert(Mapping::contains(pool_contributions, invoice_hash));
        let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
        assert(!is_closed);

        // Verify pool_owner param matches the registered pool creator
        let registered_owner: address = Mapping::get(pool_owners, invoice_hash);
        assert(registered_owner == pool_owner);

        let current_total: u64 = Mapping::get(pool_contributions, invoice_hash);
        Mapping::set(pool_contributions, invoice_hash, current_total + contribution);
    }

    // Called by: Pool owner (factor who created the pool)
    // Executes factoring once sufficient contributions have been collected.
    // Transfers the advance to the business; closes the pool.
    // Only supports native credits (use execute_factoring_token for USDCx deals).
    async transition execute_pool_factoring(
        offer: FactoringOffer,
        pool: FactorPool,
        payment: credits.aleo/credits,
    ) -> (FactoredInvoice, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(offer.owner == self.caller);
        assert(pool.owner == self.caller);
        assert(!pool.is_closed);
        assert(pool.invoice_hash == offer.invoice_hash);

        // Pool factoring currently supports native credits only
        assert(!offer.use_token);

        let product: u128 = (offer.amount as u128) * (offer.advance_rate as u128);
        let advance_amount: u64 = (product / 10000u128) as u64;

        assert(payment.microcredits >= advance_amount);

        let factored: FactoredInvoice = FactoredInvoice {
            owner: self.caller,
            original_creditor: offer.original_creditor,
            debtor: offer.debtor,
            amount: offer.amount,
            advance_amount: advance_amount,
            due_date: offer.due_date,
            factoring_date: 0u64,
            advance_rate: offer.advance_rate,
            invoice_hash: offer.invoice_hash,
            recourse: offer.recourse,
        };

        let (business_payment, change): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, offer.original_creditor, advance_amount);

        return (factored, business_payment, change, finalize_exec_pool_factoring(self.caller, offer.invoice_hash, pool.target_amount, advance_amount));
    }

    async function finalize_exec_pool_factoring(
        factor: address,
        invoice_hash: field,
        target_amount: u64,
        advance_amount: u64,
    ) {
        let factor_info: FactorInfo = Mapping::get(active_factors, factor);
        assert(factor_info.is_active);

        // Verify pool has met its target
        let total_contributed: u64 = Mapping::get(pool_contributions, invoice_hash);
        assert(total_contributed >= target_amount);

        // Verify pool is not already closed
        let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
        assert(!is_closed);

        // Close the pool
        Mapping::set(pool_closed, invoice_hash, true);

        let total_factored: u64 = Mapping::get_or_use(protocol_stats, 1u8, 0u64);
        Mapping::set(protocol_stats, 1u8, total_factored + 1u64);

        let updated_factor: FactorInfo = FactorInfo {
            is_active: factor_info.is_active,
            min_advance_rate: factor_info.min_advance_rate,
            max_advance_rate: factor_info.max_advance_rate,
            total_factored: factor_info.total_factored + 1u64,
            registration_date: factor_info.registration_date,
        };
        Mapping::set(active_factors, factor, updated_factor);
    }

    // Called by: Pool owner
    // Recovery path for pools that reached target but cannot execute via
    // execute_pool_factoring (e.g. offer was consumed outside pool flow).
    // This only closes the pool after invoice settlement so contributors can claim.
    async transition recover_pool_close(
        pool: FactorPool,
    ) -> Future {
        assert(pool.owner == self.caller);
        assert(!pool.is_closed);
        return finalize_recover_pool_close(self.caller, pool.invoice_hash, pool.target_amount);
    }

    async function finalize_recover_pool_close(
        owner: address,
        invoice_hash: field,
        target_amount: u64,
    ) {
        let factor_info: FactorInfo = Mapping::get(active_factors, owner);
        assert(factor_info.is_active);

        let registered_owner: address = Mapping::get(pool_owners, invoice_hash);
        assert(registered_owner == owner);

        // Pool must have reached target before it can be recovered/closed.
        let total_contributed: u64 = Mapping::get(pool_contributions, invoice_hash);
        assert(total_contributed >= target_amount);

        // Only allow recovery close once debtor payment has been settled.
        let settlement: SettlementInfo = Mapping::get(settled_invoices, invoice_hash);
        assert(settlement.is_settled);

        let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
        assert(!is_closed);

        Mapping::set(pool_closed, invoice_hash, true);
    }

    // Called by: Pool owner
    // Distributes proceeds to a contributor after the invoice is settled.
    // Pool owner provides payment credits; payout is calculated proportionally
    // from the contributor's share (basis points: contributed * 10000 / total_pool).
    // The PoolShare record is consumed (burned), preventing double claims.
    async transition claim_pool_proceeds(
        share: PoolShare,
        payment: credits.aleo/credits,
    ) -> (credits.aleo/credits, credits.aleo/credits, Future) {
        assert(share.total_pool > 0u64);

        // Proportional payout: contributor's basis-point share of the payment provided
        let share_bps: u64 = (share.contributed * 10000u64) / share.total_pool;
        let payout: u64 = (payment.microcredits * share_bps) / 10000u64;
        assert(payment.microcredits >= payout);

        // Send proportional payout to contributor; change to caller (pool owner)
        let (contributor_payment, change): (credits.aleo/credits, credits.aleo/credits) =
            credits.aleo/transfer_private(payment, share.owner, payout);

        return (contributor_payment, change, finalize_claim_pool_proceeds(share.invoice_hash));
    }

    async function finalize_claim_pool_proceeds(invoice_hash: field) {
        // Invoice must be settled before proceeds can be claimed
        let settlement: SettlementInfo = Mapping::get(settled_invoices, invoice_hash);
        assert(settlement.is_settled);

        // Pool must be closed (execute_pool_factoring was called)
        let is_closed: bool = Mapping::get_or_use(pool_closed, invoice_hash, false);
        assert(is_closed);
    }
}
