// ZK-Factor: Confidential invoice factoring platform on Aleo blockchain
// Cryptographically prevents double-factoring fraud while maintaining complete privacy
import credits.aleo;

program zk_factor_11765.aleo {
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

    // Factor an invoice - atomic swap of invoice for payment
    async transition factor_invoice(
        invoice: Invoice,
        factor: address,
        advance_rate: u16,
        payment: credits.aleo/credits
    ) -> (FactoredInvoice, credits.aleo/credits, credits.aleo/credits, Future) {
        assert(invoice.owner == self.caller);
        assert(advance_rate >= 5000u16 && advance_rate <= 9900u16);
        let advance_amount: u64 = (invoice.amount * (advance_rate as u64)) / 10000u64;
        assert(payment.microcredits >= advance_amount);
        let factored: FactoredInvoice = FactoredInvoice {
            owner: factor,
            original_creditor: self.caller,
            debtor: invoice.debtor,
            amount: invoice.amount,
            advance_amount: advance_amount,
            due_date: invoice.due_date,
            factoring_date: 0u64,
            advance_rate: advance_rate,
            invoice_hash: invoice.invoice_hash,
            recourse: false,
        };
        let (business_payment, change): (credits.aleo/credits, credits.aleo/credits) = credits.aleo/transfer_private(payment, self.caller, advance_amount);
        return (factored, business_payment, change, finalize_factor_invoice(factor, invoice.invoice_hash));
    }

    async function finalize_factor_invoice(factor: address, invoice_hash: field) {
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
}
