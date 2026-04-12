import credits.aleo;
import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
program zk_factor_22098.aleo;

record Invoice:
    owner as address.private;
    debtor as address.private;
    amount as u64.private;
    due_date as u64.private;
    invoice_hash as field.private;
    nonce as field.private;
    metadata as u128.private;
    document_cid as field.private;

record FactoredInvoice:
    owner as address.private;
    original_creditor as address.private;
    debtor as address.private;
    amount as u64.private;
    advance_amount as u64.private;
    due_date as u64.private;
    factoring_date as u64.private;
    advance_rate as u16.private;
    invoice_hash as field.private;
    recourse as boolean.private;

record FactoringOffer:
    owner as address.private;
    original_creditor as address.private;
    debtor as address.private;
    amount as u64.private;
    due_date as u64.private;
    advance_rate as u16.private;
    invoice_hash as field.private;
    nonce as field.private;
    metadata as u128.private;
    use_token as boolean.private;
    recourse as boolean.private;

record PaymentNotice:
    owner as address.private;
    factor as address.private;
    amount as u64.private;
    due_date as u64.private;
    invoice_hash as field.private;

record RecourseNotice:
    owner as address.private;
    factor as address.private;
    advance_amount as u64.private;
    invoice_hash as field.private;

record PoolShare:
    owner as address.private;
    pool_id as field.private;
    invoice_hash as field.private;
    contributed as u64.private;
    total_pool as u64.private;

record PoolPaymentNotice:
    owner as address.private;
    invoice_hash as field.private;
    amount as u64.private;
    due_date as u64.private;

struct FactorInfo:
    is_active as boolean;
    min_advance_rate as u16;
    max_advance_rate as u16;
    total_factored as u64;
    registration_date as u64;

struct SettlementInfo:
    is_settled as boolean;
    settlement_date as u64;
    factor as address;
    amount as u64;

struct PoolMeta:
    name_u128 as u128;
    min_advance_rate as u16;
    max_advance_rate as u16;
    min_contribution as u64;
    created_at as u64;

struct PendingPoolOffer:
    original_creditor as address;
    debtor as address;
    amount as u64;
    advance_rate as u16;
    advance_amount as u64;
    due_date as u64;
    nonce as field;
    is_executed as boolean;

struct VoteId:
    invoice_hash as field;
    voter as address;

struct PendingOfferInfo:
    original_creditor as address;
    factor as address;
    advance_rate as u16;
    use_token as boolean;
    recourse as boolean;
    requested_at as u64;
    is_executed as boolean;

mapping active_factors:
    key as address.public;
    value as FactorInfo.public;

mapping settled_invoices:
    key as field.public;
    value as SettlementInfo.public;

mapping protocol_stats:
    key as u8.public;
    value as u64.public;

mapping pending_offers:
    key as field.public;
    value as PendingOfferInfo.public;

mapping recourse_claims:
    key as field.public;
    value as boolean.public;

mapping pool_contributions:
    key as field.public;
    value as u64.public;

mapping pool_closed:
    key as field.public;
    value as boolean.public;

mapping pool_proceeds:
    key as field.public;
    value as u64.public;

mapping pool_distributed:
    key as field.public;
    value as u64.public;

mapping pool_meta:
    key as field.public;
    value as PoolMeta.public;

mapping pool_use_token:
    key as field.public;
    value as boolean.public;

mapping pool_pending_offer:
    key as field.public;
    value as PendingPoolOffer.public;

mapping pool_vote_count:
    key as field.public;
    value as u8.public;

mapping pool_reject_count:
    key as field.public;
    value as u8.public;

mapping pool_voter_cast:
    key as field.public;
    value as boolean.public;

mapping pool_executor:
    key as field.public;
    value as address.public;

mapping active_factor_count:
    key as boolean.public;
    value as u32.public;

mapping factor_addresses__:
    key as u32.public;
    value as address.public;

mapping factor_addresses__len__:
    key as boolean.public;
    value as u32.public;

mapping pool_registry__:
    key as u32.public;
    value as field.public;

mapping pool_registry__len__:
    key as boolean.public;
    value as u32.public;

function mint_invoice:
    input r0 as address.private;
    input r1 as u64.private;
    input r2 as u64.private;
    input r3 as field.private;
    input r4 as u128.private;
    input r5 as field.private;
    gt r1 0u64 into r6;
    assert.eq r6 true;
    is.neq r0 self.caller into r7;
    assert.eq r7 true;
    hash.psd2 r3 into r8 as field;
    cast self.caller r0 r1 r2 r3 r8 r4 r5 into r9 as Invoice.record;
    async mint_invoice r2 into r10;
    output r9 as Invoice.record;
    output r10 as zk_factor_22098.aleo/mint_invoice.future;

finalize mint_invoice:
    input r0 as u64.public;
    cast block.timestamp into r1 as u64;
    gt r0 r1 into r2;
    assert.eq r2 true;

function register_factor:
    input r0 as u16.private;
    input r1 as u16.private;
    lte r0 r1 into r2;
    assert.eq r2 true;
    gte r0 5000u16 into r3;
    lte r0 9900u16 into r4;
    and r3 r4 into r5;
    assert.eq r5 true;
    gte r1 5000u16 into r6;
    lte r1 9900u16 into r7;
    and r6 r7 into r8;
    assert.eq r8 true;
    async register_factor self.caller r0 r1 into r9;
    output r9 as zk_factor_22098.aleo/register_factor.future;

finalize register_factor:
    input r0 as address.public;
    input r1 as u16.public;
    input r2 as u16.public;
    cast false 0u16 0u16 0u64 0u64 into r3 as FactorInfo;
    get.or_use active_factors[r0] r3 into r4;
    not r4.is_active into r5;
    assert.eq r5 true;
    get.or_use factor_addresses__len__[false] 0u32 into r6;
    add r6 1u32 into r7;
    set r7 into factor_addresses__len__[false];
    set r0 into factor_addresses__[r6];
    cast block.timestamp into r8 as u64;
    cast true r1 r2 0u64 r8 into r9 as FactorInfo;
    set r9 into active_factors[r0];
    get.or_use active_factor_count[false] 0u32 into r10;
    add r10 1u32 into r11;
    set r11 into active_factor_count[false];

function deregister_factor:
    async deregister_factor self.caller into r0;
    output r0 as zk_factor_22098.aleo/deregister_factor.future;

finalize deregister_factor:
    input r0 as address.public;
    get active_factors[r0] into r1;
    cast false r1.min_advance_rate r1.max_advance_rate r1.total_factored r1.registration_date into r2 as FactorInfo;
    set r2 into active_factors[r0];
    get.or_use active_factor_count[false] 0u32 into r3;
    gt r3 0u32 into r4;
    branch.eq r4 false to end_then_0_0;
    sub r3 1u32 into r5;
    set r5 into active_factor_count[false];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;

function authorize_factoring:
    input r0 as Invoice.record;
    input r1 as address.private;
    input r2 as u16.private;
    input r3 as boolean.private;
    input r4 as boolean.private;
    is.eq r0.owner self.caller into r5;
    assert.eq r5 true;
    gte r2 5000u16 into r6;
    lte r2 9900u16 into r7;
    and r6 r7 into r8;
    assert.eq r8 true;
    cast r1 self.caller r0.debtor r0.amount r0.due_date r2 r0.invoice_hash r0.nonce r0.metadata r3 r4 into r9 as FactoringOffer.record;
    async authorize_factoring r1 r0.invoice_hash self.caller r2 r3 r4 into r10;
    output r9 as FactoringOffer.record;
    output r10 as zk_factor_22098.aleo/authorize_factoring.future;

finalize authorize_factoring:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as address.public;
    input r3 as u16.public;
    input r4 as boolean.public;
    input r5 as boolean.public;
    get active_factors[r0] into r6;
    assert.eq r6.is_active true;
    cast block.timestamp into r7 as u64;
    cast r2 r0 r3 r4 r5 r7 false into r8 as PendingOfferInfo;
    set r8 into pending_offers[r1];

function authorize_partial_factoring:
    input r0 as Invoice.record;
    input r1 as address.private;
    input r2 as u64.private;
    input r3 as u16.private;
    input r4 as boolean.private;
    input r5 as boolean.private;
    is.eq r0.owner self.caller into r6;
    assert.eq r6 true;
    gt r2 0u64 into r7;
    assert.eq r7 true;
    lt r2 r0.amount into r8;
    assert.eq r8 true;
    gte r3 5000u16 into r9;
    lte r3 9900u16 into r10;
    and r9 r10 into r11;
    assert.eq r11 true;
    sub r0.amount r2 into r12;
    cast r2 into r13 as field;
    add r0.invoice_hash r13 into r14;
    hash.psd2 r14 into r15 as field;
    hash.psd2 r15 into r16 as field;
    cast r1 self.caller r0.debtor r2 r0.due_date r3 r0.invoice_hash r0.nonce r0.metadata r4 r5 into r17 as FactoringOffer.record;
    cast self.caller r0.debtor r12 r0.due_date r15 r16 r0.metadata r0.document_cid into r18 as Invoice.record;
    async authorize_partial_factoring r1 r0.invoice_hash self.caller r3 r4 r5 into r19;
    output r17 as FactoringOffer.record;
    output r18 as Invoice.record;
    output r19 as zk_factor_22098.aleo/authorize_partial_factoring.future;

finalize authorize_partial_factoring:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as address.public;
    input r3 as u16.public;
    input r4 as boolean.public;
    input r5 as boolean.public;
    get active_factors[r0] into r6;
    assert.eq r6.is_active true;
    cast block.timestamp into r7 as u64;
    cast r2 r0 r3 r4 r5 r7 false into r8 as PendingOfferInfo;
    set r8 into pending_offers[r1];

function execute_factoring:
    input r0 as FactoringOffer.record;
    input r1 as credits.aleo/credits.record;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    not r0.use_token into r3;
    assert.eq r3 true;
    cast r0.amount into r4 as u128;
    cast r0.advance_rate into r5 as u128;
    mul r4 r5 into r6;
    div r6 10000u128 into r7;
    cast r7 into r8 as u64;
    gte r1.microcredits r8 into r9;
    assert.eq r9 true;
    cast self.caller r0.original_creditor r0.debtor r0.amount r8 r0.due_date 0u64 r0.advance_rate r0.invoice_hash r0.recourse into r10 as FactoredInvoice.record;
    call credits.aleo/transfer_private r1 r0.original_creditor r8 into r11 r12;
    async execute_factoring self.caller r0.invoice_hash into r13;
    output r10 as FactoredInvoice.record;
    output r11 as credits.aleo/credits.record;
    output r12 as credits.aleo/credits.record;
    output r13 as zk_factor_22098.aleo/execute_factoring.future;

finalize execute_factoring:
    input r0 as address.public;
    input r1 as field.public;
    get active_factors[r0] into r2;
    assert.eq r2.is_active true;
    get.or_use protocol_stats[1u8] 0u64 into r3;
    add r3 1u64 into r4;
    set r4 into protocol_stats[1u8];
    add r2.total_factored 1u64 into r5;
    cast r2.is_active r2.min_advance_rate r2.max_advance_rate r5 r2.registration_date into r6 as FactorInfo;
    set r6 into active_factors[r0];
    contains pending_offers[r1] into r7;
    branch.eq r7 false to end_then_0_2;
    get pending_offers[r1] into r8;
    cast r8.original_creditor r8.factor r8.advance_rate r8.use_token r8.recourse r8.requested_at true into r9 as PendingOfferInfo;
    set r9 into pending_offers[r1];
    branch.eq true true to end_otherwise_0_3;
    position end_then_0_2;
    position end_otherwise_0_3;

function execute_factoring_token:
    input r0 as FactoringOffer.record;
    is.eq r0.owner self.caller into r1;
    assert.eq r1 true;
    assert.eq r0.use_token true;
    cast r0.amount into r2 as u128;
    cast r0.advance_rate into r3 as u128;
    mul r2 r3 into r4;
    div r4 10000u128 into r5;
    cast r5 into r6 as u64;
    cast self.caller r0.original_creditor r0.debtor r0.amount r6 r0.due_date 0u64 r0.advance_rate r0.invoice_hash r0.recourse into r7 as FactoredInvoice.record;
    cast r6 into r8 as u128;
    call test_usdcx_stablecoin.aleo/transfer_from_public self.caller r0.original_creditor r8 into r9;
    async execute_factoring_token r9 self.caller r0.invoice_hash into r10;
    output r7 as FactoredInvoice.record;
    output r10 as zk_factor_22098.aleo/execute_factoring_token.future;

finalize execute_factoring_token:
    input r0 as test_usdcx_stablecoin.aleo/transfer_from_public.future;
    input r1 as address.public;
    input r2 as field.public;
    await r0;
    get active_factors[r1] into r3;
    assert.eq r3.is_active true;
    get.or_use protocol_stats[1u8] 0u64 into r4;
    add r4 1u64 into r5;
    set r5 into protocol_stats[1u8];
    add r3.total_factored 1u64 into r6;
    cast r3.is_active r3.min_advance_rate r3.max_advance_rate r6 r3.registration_date into r7 as FactorInfo;
    set r7 into active_factors[r1];
    contains pending_offers[r2] into r8;
    branch.eq r8 false to end_then_0_4;
    get pending_offers[r2] into r9;
    cast r9.original_creditor r9.factor r9.advance_rate r9.use_token r9.recourse r9.requested_at true into r10 as PendingOfferInfo;
    set r10 into pending_offers[r2];
    branch.eq true true to end_otherwise_0_5;
    position end_then_0_4;
    position end_otherwise_0_5;

function settle_invoice:
    input r0 as FactoredInvoice.record;
    is.eq r0.owner self.caller into r1;
    assert.eq r1 true;
    async settle_invoice r0.invoice_hash self.caller r0.amount into r2;
    output r2 as zk_factor_22098.aleo/settle_invoice.future;

finalize settle_invoice:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    contains settled_invoices[r0] into r3;
    not r3 into r4;
    assert.eq r4 true;
    cast block.timestamp into r5 as u64;
    cast true r5 r1 r2 into r6 as SettlementInfo;
    set r6 into settled_invoices[r0];
    get.or_use protocol_stats[2u8] 0u64 into r7;
    add r7 1u64 into r8;
    set r8 into protocol_stats[2u8];

function create_payment_request:
    input r0 as FactoredInvoice.record;
    is.eq r0.owner self.caller into r1;
    assert.eq r1 true;
    cast r0.owner r0.original_creditor r0.debtor r0.amount r0.advance_amount r0.due_date r0.factoring_date r0.advance_rate r0.invoice_hash r0.recourse into r2 as FactoredInvoice.record;
    cast r0.debtor self.caller r0.amount r0.due_date r0.invoice_hash into r3 as PaymentNotice.record;
    output r2 as FactoredInvoice.record;
    output r3 as PaymentNotice.record;

function pay_invoice:
    input r0 as PaymentNotice.record;
    input r1 as address.private;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    is.eq r0.factor r1 into r3;
    assert.eq r3 true;
    call credits.aleo/transfer_public_as_signer r1 r0.amount into r4;
    async pay_invoice r0.invoice_hash r1 r0.amount r4 into r5;
    output r5 as zk_factor_22098.aleo/pay_invoice.future;

finalize pay_invoice:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    input r3 as credits.aleo/transfer_public_as_signer.future;
    contains settled_invoices[r0] into r4;
    not r4 into r5;
    assert.eq r5 true;
    cast block.timestamp into r6 as u64;
    cast true r6 r1 r2 into r7 as SettlementInfo;
    set r7 into settled_invoices[r0];
    get.or_use protocol_stats[2u8] 0u64 into r8;
    add r8 1u64 into r9;
    set r9 into protocol_stats[2u8];
    await r3;

function initiate_recourse:
    input r0 as FactoredInvoice.record;
    is.eq r0.owner self.caller into r1;
    assert.eq r1 true;
    assert.eq r0.recourse true;
    cast r0.original_creditor self.caller r0.advance_amount r0.invoice_hash into r2 as RecourseNotice.record;
    async initiate_recourse r0.due_date r0.invoice_hash into r3;
    output r2 as RecourseNotice.record;
    output r3 as zk_factor_22098.aleo/initiate_recourse.future;

finalize initiate_recourse:
    input r0 as u64.public;
    input r1 as field.public;
    cast block.timestamp into r2 as u64;
    gt r2 r0 into r3;
    assert.eq r3 true;
    contains settled_invoices[r1] into r4;
    not r4 into r5;
    assert.eq r5 true;
    get.or_use recourse_claims[r1] false into r6;
    not r6 into r7;
    assert.eq r7 true;
    set true into recourse_claims[r1];

function settle_recourse:
    input r0 as RecourseNotice.record;
    input r1 as credits.aleo/credits.record;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    gte r1.microcredits r0.advance_amount into r3;
    assert.eq r3 true;
    call credits.aleo/transfer_private r1 r0.factor r0.advance_amount into r4 r5;
    async settle_recourse r0.invoice_hash into r6;
    output r4 as credits.aleo/credits.record;
    output r5 as credits.aleo/credits.record;
    output r6 as zk_factor_22098.aleo/settle_recourse.future;

finalize settle_recourse:
    input r0 as field.public;
    get recourse_claims[r0] into r1;
    assert.eq r1 true;
    set false into recourse_claims[r0];

function claim_pool_proceeds:
    input r0 as PoolShare.record;
    input r1 as u64.private;
    gt r1 0u64 into r2;
    assert.eq r2 true;
    gt r0.contributed 0u64 into r3;
    assert.eq r3 true;
    call credits.aleo/transfer_public_to_private r0.owner r1 into r4 r5;
    async claim_pool_proceeds r0.invoice_hash r0.contributed r1 r5 into r6;
    output r4 as credits.aleo/credits.record;
    output r6 as zk_factor_22098.aleo/claim_pool_proceeds.future;

finalize claim_pool_proceeds:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as u64.public;
    input r3 as credits.aleo/transfer_public_to_private.future;
    get settled_invoices[r0] into r4;
    assert.eq r4.is_settled true;
    get.or_use pool_closed[r0] false into r5;
    assert.eq r5 true;
    get pool_proceeds[r0] into r6;
    gt r6 0u64 into r7;
    assert.eq r7 true;
    get pool_contributions[r0] into r8;
    gt r8 0u64 into r9;
    assert.eq r9 true;
    cast r6 into r10 as u128;
    cast r1 into r11 as u128;
    mul r10 r11 into r12;
    cast r8 into r13 as u128;
    div r12 r13 into r14;
    cast r14 into r15 as u64;
    is.eq r2 r15 into r16;
    assert.eq r16 true;
    get.or_use pool_distributed[r0] 0u64 into r17;
    add r17 r2 into r18;
    lte r18 r6 into r19;
    assert.eq r19 true;
    set r18 into pool_distributed[r0];
    await r3;

function create_ownerless_pool:
    input r0 as field.private;
    input r1 as u128.private;
    input r2 as u16.private;
    input r3 as u16.private;
    input r4 as u64.private;
    input r5 as boolean.private;
    gte r2 5000u16 into r6;
    lte r2 9900u16 into r7;
    and r6 r7 into r8;
    assert.eq r8 true;
    gte r3 5000u16 into r9;
    lte r3 9900u16 into r10;
    and r9 r10 into r11;
    assert.eq r11 true;
    lte r2 r3 into r12;
    assert.eq r12 true;
    gt r4 0u64 into r13;
    assert.eq r13 true;
    async create_ownerless_pool self.caller r0 r1 r2 r3 r4 r5 into r14;
    output r14 as zk_factor_22098.aleo/create_ownerless_pool.future;

finalize create_ownerless_pool:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as u128.public;
    input r3 as u16.public;
    input r4 as u16.public;
    input r5 as u64.public;
    input r6 as boolean.public;
    get active_factors[r0] into r7;
    assert.eq r7.is_active true;
    contains pool_meta[r1] into r8;
    not r8 into r9;
    assert.eq r9 true;
    contains pool_contributions[r1] into r10;
    not r10 into r11;
    assert.eq r11 true;
    get.or_use pool_registry__len__[false] 0u32 into r12;
    add r12 1u32 into r13;
    set r13 into pool_registry__len__[false];
    set r1 into pool_registry__[r12];
    cast block.timestamp into r14 as u64;
    cast r2 r3 r4 r5 r14 into r15 as PoolMeta;
    set r15 into pool_meta[r1];
    set r6 into pool_use_token[r1];
    set 0u64 into pool_contributions[r1];
    set false into pool_closed[r1];
    set 0u8 into pool_vote_count[r1];
    set 0u8 into pool_reject_count[r1];

function pool_contribute:
    input r0 as field.private;
    input r1 as address.private;
    input r2 as u64.private;
    input r3 as u64.private;
    gt r2 0u64 into r4;
    assert.eq r4 true;
    add r3 r2 into r5;
    cast self.caller r0 r0 r2 r5 into r6 as PoolShare.record;
    call credits.aleo/transfer_public_as_signer r1 r2 into r7;
    async pool_contribute r0 r1 self.caller r2 r7 into r8;
    output r6 as PoolShare.record;
    output r8 as zk_factor_22098.aleo/pool_contribute.future;

finalize pool_contribute:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as address.public;
    input r3 as u64.public;
    input r4 as credits.aleo/transfer_public_as_signer.future;
    get.or_use pool_use_token[r0] false into r5;
    not r5 into r6;
    assert.eq r6 true;
    is.eq r1 zk_factor_22098.aleo into r7;
    assert.eq r7 true;
    get active_factors[r2] into r8;
    assert.eq r8.is_active true;
    get pool_meta[r0] into r9;
    get.or_use pool_closed[r0] false into r10;
    not r10 into r11;
    assert.eq r11 true;
    gte r3 r9.min_contribution into r12;
    assert.eq r12 true;
    get.or_use pool_contributions[r0] 0u64 into r13;
    add r13 r3 into r14;
    set r14 into pool_contributions[r0];
    await r4;

function pool_contribute_token:
    input r0 as field.private;
    input r1 as address.private;
    input r2 as u64.private;
    input r3 as u64.private;
    gt r2 0u64 into r4;
    assert.eq r4 true;
    add r3 r2 into r5;
    cast self.caller r0 r0 r2 r5 into r6 as PoolShare.record;
    cast r2 into r7 as u128;
    call test_usdcx_stablecoin.aleo/transfer_from_public self.caller r1 r7 into r8;
    async pool_contribute_token r0 r1 self.caller r2 r8 into r9;
    output r6 as PoolShare.record;
    output r9 as zk_factor_22098.aleo/pool_contribute_token.future;

finalize pool_contribute_token:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as address.public;
    input r3 as u64.public;
    input r4 as test_usdcx_stablecoin.aleo/transfer_from_public.future;
    get.or_use pool_use_token[r0] false into r5;
    assert.eq r5 true;
    is.eq r1 zk_factor_22098.aleo into r6;
    assert.eq r6 true;
    get active_factors[r2] into r7;
    assert.eq r7.is_active true;
    get pool_meta[r0] into r8;
    get.or_use pool_closed[r0] false into r9;
    not r9 into r10;
    assert.eq r10 true;
    gte r3 r8.min_contribution into r11;
    assert.eq r11 true;
    get.or_use pool_contributions[r0] 0u64 into r12;
    add r12 r3 into r13;
    set r13 into pool_contributions[r0];
    await r4;

function pool_submit_invoice:
    input r0 as Invoice.record;
    input r1 as field.private;
    input r2 as u16.private;
    is.eq r0.owner self.caller into r3;
    assert.eq r3 true;
    cast r0.amount into r4 as u128;
    cast r2 into r5 as u128;
    mul r4 r5 into r6;
    div r6 10000u128 into r7;
    cast r7 into r8 as u64;
    async pool_submit_invoice r1 r2 r8 self.caller r0.debtor r0.amount r0.due_date r0.nonce into r9;
    output r9 as zk_factor_22098.aleo/pool_submit_invoice.future;

finalize pool_submit_invoice:
    input r0 as field.public;
    input r1 as u16.public;
    input r2 as u64.public;
    input r3 as address.public;
    input r4 as address.public;
    input r5 as u64.public;
    input r6 as u64.public;
    input r7 as field.public;
    get pool_meta[r0] into r8;
    get.or_use pool_closed[r0] false into r9;
    not r9 into r10;
    assert.eq r10 true;
    contains pool_pending_offer[r0] into r11;
    branch.eq r11 false to end_then_0_6;
    get pool_pending_offer[r0] into r12;
    assert.eq r12.is_executed true;
    branch.eq true true to end_otherwise_0_7;
    position end_then_0_6;
    position end_otherwise_0_7;
    gte r1 r8.min_advance_rate into r13;
    assert.eq r13 true;
    lte r1 r8.max_advance_rate into r14;
    assert.eq r14 true;
    get pool_contributions[r0] into r15;
    gte r15 r2 into r16;
    assert.eq r16 true;
    cast r3 r4 r5 r1 r2 r6 r7 false into r17 as PendingPoolOffer;
    set r17 into pool_pending_offer[r0];
    set 0u8 into pool_vote_count[r0];
    set 0u8 into pool_reject_count[r0];

function pool_vote:
    input r0 as field.private;
    async pool_vote self.caller r0 into r1;
    output r1 as zk_factor_22098.aleo/pool_vote.future;

finalize pool_vote:
    input r0 as address.public;
    input r1 as field.public;
    get active_factors[r0] into r2;
    assert.eq r2.is_active true;
    get pool_pending_offer[r1] into r3;
    not r3.is_executed into r4;
    assert.eq r4 true;
    cast r1 r0 into r5 as VoteId;
    hash.psd2 r5 into r6 as field;
    get.or_use pool_voter_cast[r6] false into r7;
    not r7 into r8;
    assert.eq r8 true;
    set true into pool_voter_cast[r6];
    get.or_use pool_vote_count[r1] 0u8 into r9;
    add r9 1u8 into r10;
    set r10 into pool_vote_count[r1];

function pool_vote_reject:
    input r0 as field.private;
    async pool_vote_reject self.caller r0 into r1;
    output r1 as zk_factor_22098.aleo/pool_vote_reject.future;

finalize pool_vote_reject:
    input r0 as address.public;
    input r1 as field.public;
    get active_factors[r0] into r2;
    assert.eq r2.is_active true;
    get pool_pending_offer[r1] into r3;
    not r3.is_executed into r4;
    assert.eq r4 true;
    cast r1 r0 into r5 as VoteId;
    hash.psd2 r5 into r6 as field;
    get.or_use pool_voter_cast[r6] false into r7;
    not r7 into r8;
    assert.eq r8 true;
    set true into pool_voter_cast[r6];
    get.or_use pool_reject_count[r1] 0u8 into r9;
    add r9 1u8 into r10;
    set r10 into pool_reject_count[r1];

function finalize_rejected_pool:
    input r0 as field.private;
    async finalize_rejected_pool self.caller r0 into r1;
    output r1 as zk_factor_22098.aleo/finalize_rejected_pool.future;

finalize finalize_rejected_pool:
    input r0 as address.public;
    input r1 as field.public;
    get active_factors[r0] into r2;
    assert.eq r2.is_active true;
    get pool_pending_offer[r1] into r3;
    not r3.is_executed into r4;
    assert.eq r4 true;
    get.or_use pool_vote_count[r1] 0u8 into r5;
    get.or_use pool_reject_count[r1] 0u8 into r6;
    get.or_use active_factor_count[false] 1u32 into r7;
    cast r5 into r8 as u32;
    cast r6 into r9 as u32;
    add r8 r9 into r10;
    is.eq r10 r7 into r11;
    assert.eq r11 true;
    lte r5 r6 into r12;
    assert.eq r12 true;
    cast r3.original_creditor r3.debtor r3.amount r3.advance_rate r3.advance_amount r3.due_date r3.nonce true into r13 as PendingPoolOffer;
    set r13 into pool_pending_offer[r1];

function execute_approved_pool:
    input r0 as field.private;
    input r1 as address.private;
    input r2 as address.private;
    input r3 as u64.private;
    input r4 as u64.private;
    input r5 as u64.private;
    gt r3 0u64 into r6;
    assert.eq r6 true;
    cast r2 r0 r4 r5 into r7 as PoolPaymentNotice.record;
    call credits.aleo/transfer_public r1 r3 into r8;
    async execute_approved_pool r0 r1 r2 r3 r4 self.caller r8 into r9;
    output r7 as PoolPaymentNotice.record;
    output r9 as zk_factor_22098.aleo/execute_approved_pool.future;

finalize execute_approved_pool:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as address.public;
    input r3 as u64.public;
    input r4 as u64.public;
    input r5 as address.public;
    input r6 as credits.aleo/transfer_public.future;
    get.or_use pool_use_token[r0] false into r7;
    not r7 into r8;
    assert.eq r8 true;
    get pool_pending_offer[r0] into r9;
    not r9.is_executed into r10;
    assert.eq r10 true;
    is.eq r9.original_creditor r1 into r11;
    assert.eq r11 true;
    is.eq r9.debtor r2 into r12;
    assert.eq r12 true;
    is.eq r9.advance_amount r3 into r13;
    assert.eq r13 true;
    is.eq r9.amount r4 into r14;
    assert.eq r14 true;
    get.or_use pool_vote_count[r0] 0u8 into r15;
    get.or_use pool_reject_count[r0] 0u8 into r16;
    get.or_use active_factor_count[false] 1u32 into r17;
    cast r15 into r18 as u32;
    cast r16 into r19 as u32;
    add r18 r19 into r20;
    is.eq r20 r17 into r21;
    assert.eq r21 true;
    gt r15 r16 into r22;
    assert.eq r22 true;
    cast r9.original_creditor r9.debtor r9.amount r9.advance_rate r9.advance_amount r9.due_date r9.nonce true into r23 as PendingPoolOffer;
    set r23 into pool_pending_offer[r0];
    set true into pool_closed[r0];
    set r5 into pool_executor[r0];
    get active_factors[r5] into r24;
    assert.eq r24.is_active true;
    get.or_use protocol_stats[1u8] 0u64 into r25;
    add r25 1u64 into r26;
    set r26 into protocol_stats[1u8];
    add r24.total_factored 1u64 into r27;
    cast r24.is_active r24.min_advance_rate r24.max_advance_rate r27 r24.registration_date into r28 as FactorInfo;
    set r28 into active_factors[r5];
    await r6;

function execute_approved_pool_token:
    input r0 as field.private;
    input r1 as address.private;
    input r2 as address.private;
    input r3 as u64.private;
    input r4 as u64.private;
    input r5 as u64.private;
    gt r3 0u64 into r6;
    assert.eq r6 true;
    cast r2 r0 r4 r5 into r7 as PoolPaymentNotice.record;
    cast r3 into r8 as u128;
    call test_usdcx_stablecoin.aleo/transfer_public r1 r8 into r9;
    async execute_approved_pool_token r0 r1 r2 r3 r4 self.caller r9 into r10;
    output r7 as PoolPaymentNotice.record;
    output r10 as zk_factor_22098.aleo/execute_approved_pool_token.future;

finalize execute_approved_pool_token:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as address.public;
    input r3 as u64.public;
    input r4 as u64.public;
    input r5 as address.public;
    input r6 as test_usdcx_stablecoin.aleo/transfer_public.future;
    get.or_use pool_use_token[r0] false into r7;
    assert.eq r7 true;
    get pool_pending_offer[r0] into r8;
    not r8.is_executed into r9;
    assert.eq r9 true;
    is.eq r8.original_creditor r1 into r10;
    assert.eq r10 true;
    is.eq r8.debtor r2 into r11;
    assert.eq r11 true;
    is.eq r8.advance_amount r3 into r12;
    assert.eq r12 true;
    is.eq r8.amount r4 into r13;
    assert.eq r13 true;
    get.or_use pool_vote_count[r0] 0u8 into r14;
    get.or_use pool_reject_count[r0] 0u8 into r15;
    get.or_use active_factor_count[false] 1u32 into r16;
    cast r14 into r17 as u32;
    cast r15 into r18 as u32;
    add r17 r18 into r19;
    is.eq r19 r16 into r20;
    assert.eq r20 true;
    gt r14 r15 into r21;
    assert.eq r21 true;
    cast r8.original_creditor r8.debtor r8.amount r8.advance_rate r8.advance_amount r8.due_date r8.nonce true into r22 as PendingPoolOffer;
    set r22 into pool_pending_offer[r0];
    set true into pool_closed[r0];
    set r5 into pool_executor[r0];
    get active_factors[r5] into r23;
    assert.eq r23.is_active true;
    get.or_use protocol_stats[1u8] 0u64 into r24;
    add r24 1u64 into r25;
    set r25 into protocol_stats[1u8];
    add r23.total_factored 1u64 into r26;
    cast r23.is_active r23.min_advance_rate r23.max_advance_rate r26 r23.registration_date into r27 as FactorInfo;
    set r27 into active_factors[r5];
    await r6;

function pay_pool_invoice:
    input r0 as PoolPaymentNotice.record;
    input r1 as address.private;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    call credits.aleo/transfer_public_as_signer r1 r0.amount into r3;
    async pay_pool_invoice r0.invoice_hash r1 r0.amount r3 into r4;
    output r4 as zk_factor_22098.aleo/pay_pool_invoice.future;

finalize pay_pool_invoice:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    input r3 as credits.aleo/transfer_public_as_signer.future;
    get.or_use pool_use_token[r0] false into r4;
    not r4 into r5;
    assert.eq r5 true;
    is.eq r1 zk_factor_22098.aleo into r6;
    assert.eq r6 true;
    contains settled_invoices[r0] into r7;
    not r7 into r8;
    assert.eq r8 true;
    get.or_use pool_closed[r0] false into r9;
    assert.eq r9 true;
    get pool_pending_offer[r0] into r10;
    assert.eq r10.is_executed true;
    is.eq r2 r10.amount into r11;
    assert.eq r11 true;
    get pool_executor[r0] into r12;
    cast block.timestamp into r13 as u64;
    cast true r13 r12 r2 into r14 as SettlementInfo;
    set r14 into settled_invoices[r0];
    get.or_use protocol_stats[2u8] 0u64 into r15;
    add r15 1u64 into r16;
    set r16 into protocol_stats[2u8];
    await r3;

function pay_pool_invoice_token:
    input r0 as PoolPaymentNotice.record;
    input r1 as address.private;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    cast r0.amount into r3 as u128;
    call test_usdcx_stablecoin.aleo/transfer_public_as_signer r1 r3 into r4;
    async pay_pool_invoice_token r0.invoice_hash r1 r0.amount r4 into r5;
    output r5 as zk_factor_22098.aleo/pay_pool_invoice_token.future;

finalize pay_pool_invoice_token:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    input r3 as test_usdcx_stablecoin.aleo/transfer_public_as_signer.future;
    get.or_use pool_use_token[r0] false into r4;
    assert.eq r4 true;
    is.eq r1 zk_factor_22098.aleo into r5;
    assert.eq r5 true;
    contains settled_invoices[r0] into r6;
    not r6 into r7;
    assert.eq r7 true;
    get.or_use pool_closed[r0] false into r8;
    assert.eq r8 true;
    get pool_pending_offer[r0] into r9;
    assert.eq r9.is_executed true;
    is.eq r2 r9.amount into r10;
    assert.eq r10 true;
    get pool_executor[r0] into r11;
    cast block.timestamp into r12 as u64;
    cast true r12 r11 r2 into r13 as SettlementInfo;
    set r13 into settled_invoices[r0];
    get.or_use protocol_stats[2u8] 0u64 into r14;
    add r14 1u64 into r15;
    set r15 into protocol_stats[2u8];
    await r3;

function pool_open_distribution:
    input r0 as field.private;
    async pool_open_distribution r0 into r1;
    output r1 as zk_factor_22098.aleo/pool_open_distribution.future;

finalize pool_open_distribution:
    input r0 as field.public;
    contains pool_meta[r0] into r1;
    assert.eq r1 true;
    get settled_invoices[r0] into r2;
    assert.eq r2.is_settled true;
    gt r2.amount 0u64 into r3;
    assert.eq r3 true;
    get.or_use pool_closed[r0] false into r4;
    assert.eq r4 true;
    get pool_pending_offer[r0] into r5;
    assert.eq r5.is_executed true;
    contains pool_proceeds[r0] into r6;
    not r6 into r7;
    assert.eq r7 true;
    set r2.amount into pool_proceeds[r0];
    set 0u64 into pool_distributed[r0];

function claim_pool_proceeds_token:
    input r0 as PoolShare.record;
    input r1 as u64.private;
    gt r1 0u64 into r2;
    assert.eq r2 true;
    gt r0.contributed 0u64 into r3;
    assert.eq r3 true;
    cast r1 into r4 as u128;
    call test_usdcx_stablecoin.aleo/transfer_public_to_private r0.owner r4 into r5 r6 r7;
    async claim_pool_proceeds_token r0.invoice_hash r0.contributed r1 r7 into r8;
    output r5 as test_usdcx_stablecoin.aleo/ComplianceRecord.record;
    output r6 as test_usdcx_stablecoin.aleo/Token.record;
    output r8 as zk_factor_22098.aleo/claim_pool_proceeds_token.future;

finalize claim_pool_proceeds_token:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as u64.public;
    input r3 as test_usdcx_stablecoin.aleo/transfer_public_to_private.future;
    get settled_invoices[r0] into r4;
    assert.eq r4.is_settled true;
    get.or_use pool_closed[r0] false into r5;
    assert.eq r5 true;
    get pool_proceeds[r0] into r6;
    gt r6 0u64 into r7;
    assert.eq r7 true;
    get pool_contributions[r0] into r8;
    gt r8 0u64 into r9;
    assert.eq r9 true;
    cast r6 into r10 as u128;
    cast r1 into r11 as u128;
    mul r10 r11 into r12;
    cast r8 into r13 as u128;
    div r12 r13 into r14;
    cast r14 into r15 as u64;
    is.eq r2 r15 into r16;
    assert.eq r16 true;
    get.or_use pool_distributed[r0] 0u64 into r17;
    add r17 r2 into r18;
    lte r18 r6 into r19;
    assert.eq r19 true;
    set r18 into pool_distributed[r0];
    await r3;

constructor:
    assert.eq program_owner aleo19rn544c49da9z2vz52q5f7lm7nsjhp890ahmre6cz94qawdscgps6kq3cu;
