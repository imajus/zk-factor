// ZK-Factor: Confidential invoice factoring platform on Aleo blockchain
import credits.aleo;
import test_usdcx_stablecoin.aleo;

// --- MOVED OUTSIDE PROGRAM BLOCK (Leo 4.0 Requirement) ---

struct FactorInfo {
    is_active: bool,
    min_advance_rate: u16,
    max_advance_rate: u16,
    total_factored: u64,
    registration_date: u64,
}

struct SettlementInfo {
    is_settled: bool,
    settlement_date: u64,
    factor: address,
    amount: u64,   
}

final fn update_factor_stats(factor: address) {
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

// --- PROGRAM INTERFACE ---

program zk_factor_12250.aleo {
    // Simple admin-controlled upgradable constructor for MVP
    // UPDATED: Added required @admin annotation
    @admin(address="aleo19rn544c49da9z2vz52q5f7lm7nsjhp890ahmre6cz94qawdscgps6kq3cu")
    constructor() {}

    mapping active_factors: address => FactorInfo;
    mapping settled_invoices: field => SettlementInfo;
    mapping protocol_stats: u8 => u64;
    mapping recourse_claims: field => bool;
    mapping pool_contributions: field => u64;
    mapping pool_owners: field => address;
    mapping pool_closed: field => bool;
    mapping pool_proceeds: field => u64;
    mapping pool_distributed: field => u64;

    storage factor_addresses: [address];

    record Invoice {
        owner: address,
        debtor: address,
        amount: u64,
        due_date: u64,
        invoice_hash: field,
        nonce: field,
        metadata: u128,
        document_cid: field,
    }

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

    record PaymentNotice {
        owner: address,
        factor: address,
        amount: u64,
        due_date: u64,
        invoice_hash: field,
    }

    record RecourseNotice {
        owner: address,
        factor: address,
        advance_amount: u64,
        invoice_hash: field,
    }

    // ─────────────────────────────────────────────────────────────
    // INVOICE
    // ─────────────────────────────────────────────────────────────

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
            owner: self.caller,
            debtor: debtor,
            amount: amount,
            due_date: due_date,
            invoice_hash: invoice_hash,
            nonce: nonce,
            metadata: metadata,
            document_cid: document_cid,
        };
        return (invoice, final {
            assert(due_date > (block.timestamp as u64));
        });
    }

    // ─────────────────────────────────────────────────────────────
    // FACTOR REGISTRY
    // ─────────────────────────────────────────────────────────────

    fn register_factor(
        min_advance_rate: u16,
        max_advance_rate: u16
    ) -> Final {
        assert(min_advance_rate <= max_advance_rate);
        assert(min_advance_rate >= 5000u16 && min_advance_rate <= 9900u16);
        assert(max_advance_rate >= 5000u16 && max_advance_rate <= 9900u16);
        
        let caller: address = self.caller;
        return final {
            let existing_factor: FactorInfo = Mapping::get_or_use(active_factors, caller, FactorInfo {
                is_active: false,
                min_advance_rate: 0u16,
                max_advance_rate: 0u16,
                total_factored: 0u64,
                registration_date: 0u64,
            });
            assert(!existing_factor.is_active);
            factor_addresses.push(caller);
            let new_factor: FactorInfo = FactorInfo {
                is_active: true,
                min_advance_rate: min_advance_rate,
                max_advance_rate: max_advance_rate,
                total_factored: 0u64,
                registration_date: (block.timestamp as u64),
            };
            Mapping::set(active_factors, caller, new_factor);
        };
    }

    fn deregister_factor() -> Final {
        let caller: address = self.caller;
        return final {
            // Mapping::get will panic if the factor doesn't exist
            let factor_info: FactorInfo = Mapping::get(active_factors, caller);
            assert(factor_info.is_active);

            let updated: FactorInfo = FactorInfo {
                is_active: false,
                min_advance_rate: factor_info.min_advance_rate,
                max_advance_rate: factor_info.max_advance_rate,
                total_factored: factor_info.total_factored,
                registration_date: factor_info.registration_date,
            };
            Mapping::set(active_factors, caller, updated);
        };
    }
    
    // ─────────────────────────────────────────────────────────────
    // TWO-STEP FACTORING HANDSHAKE
    // ─────────────────────────────────────────────────────────────

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
            owner: factor,
            original_creditor: self.caller,
            debtor: invoice.debtor,
            amount: invoice.amount,
            due_date: invoice.due_date,
            advance_rate: advance_rate,
            invoice_hash: invoice.invoice_hash,
            nonce: invoice.nonce,
            metadata: invoice.metadata,
            use_token: use_token,
            recourse: recourse,
        };

        return (offer, final {
            let factor_info: FactorInfo = Mapping::get(active_factors, factor);
            assert(factor_info.is_active);
        });
    }

    fn execute_factoring(
        offer: FactoringOffer,
        payment: credits.aleo::credits, 
    ) -> (FactoredInvoice, credits.aleo::credits, credits.aleo::credits, Final) {
        assert(offer.owner == self.caller);
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

        let (business_payment, change): (credits.aleo::credits, credits.aleo::credits) =
            credits.aleo::transfer_private(payment, offer.original_creditor, advance_amount);

        let caller: address = self.caller;
        return (factored, business_payment, change, final {
            update_factor_stats(caller);
        });
    }

    fn execute_factoring_token(
        offer: FactoringOffer,
    ) -> (FactoredInvoice, Final) {
        assert(offer.owner == self.caller);
        assert(offer.use_token);

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
            recourse: offer.recourse,
        };

        let f_token: Final = test_usdcx_stablecoin.aleo::transfer_from_public(self.caller, offer.original_creditor, advance_amount as u128);

        let caller: address = self.caller;
        return (factored, final {
            f_token.run(); 
            update_factor_stats(caller);
        });
    }

    // ─────────────────────────────────────────────────────────────
    // SETTLEMENT
    // ─────────────────────────────────────────────────────────────

    fn pay_invoice(
        notice: PaymentNotice,
        factor: address,
    ) -> Final {
        assert(notice.owner == self.caller);
        assert(notice.factor == factor);

        // FIX: Extract fields from record before final block
        let notice_amount: u64 = notice.amount;
        let hash: field = notice.invoice_hash;

        let f_pay: Final = credits.aleo::transfer_public_as_signer(factor, notice_amount);

        return final {
            let is_settled: bool = Mapping::contains(settled_invoices, hash);
            assert(!is_settled);

            let settlement: SettlementInfo = SettlementInfo {
                is_settled: true,
                settlement_date: (block.timestamp as u64),
                factor: factor,
                amount: notice_amount,
            };
            Mapping::set(settled_invoices, hash, settlement);

            let total_settled: u64 = Mapping::get_or_use(protocol_stats, 2u8, 0u64);
            Mapping::set(protocol_stats, 2u8, total_settled + 1u64);

            f_pay.run();
        };
    }

    fn settle_recourse(
        notice: RecourseNotice,
        payment: credits.aleo::credits, 
    ) -> (credits.aleo::credits, credits.aleo::credits, Final) {
        assert(notice.owner == self.caller);
        assert(payment.microcredits >= notice.advance_amount);

        let (factor_payment, change): (credits.aleo::credits, credits.aleo::credits) =
            credits.aleo::transfer_private(payment, notice.factor, notice.advance_amount);

        let hash: field = notice.invoice_hash;
        return (factor_payment, change, final {
            let is_claimed: bool = Mapping::get(recourse_claims, hash);
            assert(is_claimed);
            Mapping::set(recourse_claims, hash, false);
        });
    }
}