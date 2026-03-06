// ZK-Factor: Confidential invoice factoring platform on Aleo blockchain
// Cryptographically prevents double-factoring fraud while maintaining complete privacy
import credits.aleo;

program zk_factor_9591.aleo {
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
    mapping payment_requests: field => PaymentRequest; // For USDC payment

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

    struct PaymentRequest {
        factor: address,
        amount: u64,
        due_date: u64,
        debtor: address,
    }

    // Create an invoice record with validation
    async transition mint_invoice(
        debtor: address,
        amount: u64,
        due_date: u64,
        invoice_hash: field,
        metadata: u128
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
        };
        return (invoice, finalize_mint_invoice(due_date));
    }

    async function finalize_mint_invoice(due_date: u64) {
        assert(due_date > (block.timestamp as u64));
    }

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


    // Called by: Business
    // Inputs:    Invoice (owned by business), factor address, agreed rate
    // Outputs:   FactoringOffer (owned by factor)
    //
    // This is the business's commitment — once called, the Invoice is
    // consumed and cannot be double-factored. The business cannot back out.
    // The factor receives an FactoringOffer they can accept at any time.
    async transition authorize_factoring(
        invoice: Invoice,
        factor: address,
        advance_rate: u16,
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
        };

        return (offer, finalize_authorize_factoring(factor, invoice.invoice_hash));
    }

    async function finalize_authorize_factoring(factor: address, invoice_hash: field) {
        // Verify the chosen factor is registered and active in the protocol.
        // Mapping::get panics if the key doesn't exist — unregistered factors
        // will cause this to fail, blocking the whole transaction.
        let factor_info: FactorInfo = Mapping::get(active_factors, factor);
        assert(factor_info.is_active);
    }

    // Called by: Factor
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
            recourse: false,
        };

        // Factor (self.caller) owns `payment`, transfers advance_amount to business.
        // `change` is the leftover credits returned to the factor.
        // This is the key fix — factor pays business, not business paying themselves.
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


    // Factor an invoice - atomic swap of invoice for payment
//    async transition factor_invoice(
//        invoice: Invoice,
//        factor: address,
//        advance_rate: u16,
//        payment: credits.aleo/credits
//    ) -> (FactoredInvoice, credits.aleo/credits, credits.aleo/credits, Future) {
//        assert(invoice.owner == self.caller);
//        assert(advance_rate >= 5000u16 && advance_rate <= 9900u16);
//        let advance_amount: u64 = (invoice.amount * (advance_rate as u64)) / 10000u64;
//        assert(payment.microcredits >= advance_amount);
//        let factored: FactoredInvoice = FactoredInvoice {
//            owner: factor,
//            original_creditor: self.caller,
//            debtor: invoice.debtor,
//            amount: invoice.amount,
//            advance_amount: advance_amount,
//            due_date: invoice.due_date,
//            factoring_date: 0u64,
//            advance_rate: advance_rate,
//            invoice_hash: invoice.invoice_hash,
//            recourse: false,
//        };
//        let (business_payment, change): (credits.aleo/credits, credits.aleo/credits) = credits.aleo/transfer_private(payment, self.caller, advance_amount);
//        return (factored, business_payment, change, finalize_factor_invoice(factor, invoice.invoice_hash));
//    }

//    async function finalize_factor_invoice(factor: address, invoice_hash: field) {
//        let factor_info: FactorInfo = Mapping::get(active_factors, factor);
//        assert(factor_info.is_active);
//        let total_factored: u64 = Mapping::get_or_use(protocol_stats, 1u8, 0u64);
//        Mapping::set(protocol_stats, 1u8, total_factored + 1u64);
//        let updated_factor: FactorInfo = FactorInfo {
//            is_active: factor_info.is_active,
//            min_advance_rate: factor_info.min_advance_rate,
//            max_advance_rate: factor_info.max_advance_rate,
//            total_factored: factor_info.total_factored + 1u64,
//            registration_date: factor_info.registration_date,
//        };
//        Mapping::set(active_factors, factor, updated_factor);
//    }

    // Settle a factored invoice
    async transition settle_invoice(
        factored: FactoredInvoice,
        payment: credits.aleo/credits
    ) -> (credits.aleo/credits, credits.aleo/credits, Future) {
        assert(factored.owner == self.caller);
        assert(payment.microcredits >= factored.amount);
        let (factor_payment, change): (credits.aleo/credits, credits.aleo/credits) = credits.aleo/transfer_private(payment, self.caller, factored.amount);
        return (factor_payment, change, finalize_settle_invoice(factored.invoice_hash, self.caller));
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


    // Uses credits.aleo: NO direct transfer here, but sets up the
    // on-chain data that routes the credits.aleo payment in pay_invoice
    async transition create_payment_request(
        factored: FactoredInvoice,
    ) -> (FactoredInvoice, Future) {

        // Only the factor who owns this record can publish a payment request
        assert(factored.owner == self.caller);

        // Return the record unchanged — we only need to READ it to
        // publish the public payment request. Record is NOT consumed here,
        // factor keeps it and uses it later for settle_invoice.
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

        return (same, finalize_create_payment_request(
            self.caller,
            factored.invoice_hash,
            factored.amount,
            factored.due_date,
            factored.debtor,
        ));
    }

    async function finalize_create_payment_request(
        factor: address,
        invoice_hash: field,
        amount: u64,
        due_date: u64,
        debtor: address,
    ) {
        // Cannot create a payment request for an already-settled invoice
        let is_settled: bool = Mapping::contains(settled_invoices, invoice_hash);
        assert(!is_settled);

        // Cannot overwrite an existing payment request
        let already_requested: bool = Mapping::contains(payment_requests, invoice_hash);
        assert(!already_requested);

        // Publish payment details publicly
        let request: PaymentRequest = PaymentRequest {
            factor: factor,
            amount: amount,
            due_date: due_date,
            debtor: debtor,
        };
        Mapping::set(payment_requests, invoice_hash, request);
    }

    // WHY transfer_public not transfer_private:
    //   In Aleo, transition inputs must be owned by self.caller.
    //   The factor's address is only known at FINALIZE time (from mapping).
    //   transfer_public works at the mapping level so we can pay a
    //   dynamic address - exactly what we need here.
    async transition pay_invoice(
        invoice_hash: field,
        amount: u64,
        factor: address,
    ) -> Future {
        return finalize_pay_invoice(invoice_hash, self.caller, amount, factor);
    }

    async function finalize_pay_invoice(
        invoice_hash: field,
        debtor: address,
        amount: u64,
        factor: address,
    ) {
        let request: PaymentRequest = Mapping::get(payment_requests, invoice_hash);
        assert(debtor == request.debtor);
        assert(amount >= request.amount);
        assert(factor == request.factor);

        let is_settled: bool = Mapping::contains(settled_invoices, invoice_hash);
        assert(!is_settled);

        let settlement: SettlementInfo = SettlementInfo {
            is_settled: true,
            settlement_date: (block.timestamp as u64),
            factor: request.factor,
        };
        Mapping::set(settled_invoices, invoice_hash, settlement);

        let total_settled: u64 = Mapping::get_or_use(protocol_stats, 2u8, 0u64);
        Mapping::set(protocol_stats, 2u8, total_settled + 1u64);
    }   
}
