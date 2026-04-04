import credits.aleo;
import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
program zk_factor_12251.aleo;

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

record FactorPool:
    owner as address.private;
    invoice_hash as field.private;
    target_amount as u64.private;
    total_contributed as u64.private;
    is_closed as boolean.private;

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
    target_amount as u64;
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

mapping active_factors:
    key as address.public;
    value as FactorInfo.public;

mapping settled_invoices:
    key as field.public;
    value as SettlementInfo.public;

mapping protocol_stats:
    key as u8.public;
    value as u64.public;

mapping recourse_claims:
    key as field.public;
    value as boolean.public;

mapping pool_contributions:
    key as field.public;
    value as u64.public;

mapping pool_owners:
    key as field.public;
    value as address.public;

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

mapping pool_pending_offer:
    key as field.public;
    value as PendingPoolOffer.public;

mapping pool_vote_count:
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
    output r10 as zk_factor_12251.aleo/mint_invoice.future;

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
    output r9 as zk_factor_12251.aleo/register_factor.future;

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
    output r0 as zk_factor_12251.aleo/deregister_factor.future;

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
    async authorize_factoring r1 into r10;
    output r9 as FactoringOffer.record;
    output r10 as zk_factor_12251.aleo/authorize_factoring.future;

finalize authorize_factoring:
    input r0 as address.public;
    get active_factors[r0] into r1;
    assert.eq r1.is_active true;

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
    async authorize_partial_factoring r1 into r19;
    output r17 as FactoringOffer.record;
    output r18 as Invoice.record;
    output r19 as zk_factor_12251.aleo/authorize_partial_factoring.future;

finalize authorize_partial_factoring:
    input r0 as address.public;
    get active_factors[r0] into r1;
    assert.eq r1.is_active true;

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
    async execute_factoring self.caller into r13;
    output r10 as FactoredInvoice.record;
    output r11 as credits.aleo/credits.record;
    output r12 as credits.aleo/credits.record;
    output r13 as zk_factor_12251.aleo/execute_factoring.future;

finalize execute_factoring:
    input r0 as address.public;
    get active_factors[r0] into r1;
    assert.eq r1.is_active true;
    get.or_use protocol_stats[1u8] 0u64 into r2;
    add r2 1u64 into r3;
    set r3 into protocol_stats[1u8];
    add r1.total_factored 1u64 into r4;
    cast r1.is_active r1.min_advance_rate r1.max_advance_rate r4 r1.registration_date into r5 as FactorInfo;
    set r5 into active_factors[r0];

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
    async execute_factoring_token r9 self.caller into r10;
    output r7 as FactoredInvoice.record;
    output r10 as zk_factor_12251.aleo/execute_factoring_token.future;

finalize execute_factoring_token:
    input r0 as test_usdcx_stablecoin.aleo/transfer_from_public.future;
    input r1 as address.public;
    await r0;
    get active_factors[r1] into r2;
    assert.eq r2.is_active true;
    get.or_use protocol_stats[1u8] 0u64 into r3;
    add r3 1u64 into r4;
    set r4 into protocol_stats[1u8];
    add r2.total_factored 1u64 into r5;
    cast r2.is_active r2.min_advance_rate r2.max_advance_rate r5 r2.registration_date into r6 as FactorInfo;
    set r6 into active_factors[r1];

function settle_invoice:
    input r0 as FactoredInvoice.record;
    is.eq r0.owner self.caller into r1;
    assert.eq r1 true;
    async settle_invoice r0.invoice_hash self.caller r0.amount into r2;
    output r2 as zk_factor_12251.aleo/settle_invoice.future;

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
    output r5 as zk_factor_12251.aleo/pay_invoice.future;

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
    output r3 as zk_factor_12251.aleo/initiate_recourse.future;

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
    output r6 as zk_factor_12251.aleo/settle_recourse.future;

finalize settle_recourse:
    input r0 as field.public;
    get recourse_claims[r0] into r1;
    assert.eq r1 true;
    set false into recourse_claims[r0];

function create_pool:
    input r0 as field.private;
    input r1 as u64.private;
    gt r1 0u64 into r2;
    assert.eq r2 true;
    cast self.caller r0 r1 0u64 false into r3 as FactorPool.record;
    async create_pool self.caller r0 into r4;
    output r3 as FactorPool.record;
    output r4 as zk_factor_12251.aleo/create_pool.future;

finalize create_pool:
    input r0 as address.public;
    input r1 as field.public;
    get active_factors[r0] into r2;
    assert.eq r2.is_active true;
    contains pool_contributions[r1] into r3;
    not r3 into r4;
    assert.eq r4 true;
    set 0u64 into pool_contributions[r1];
    set r0 into pool_owners[r1];
    set false into pool_closed[r1];

function contribute_to_pool:
    input r0 as field.private;
    input r1 as address.private;
    input r2 as u64.private;
    input r3 as credits.aleo/credits.record;
    input r4 as u64.private;
    gt r4 0u64 into r5;
    assert.eq r5 true;
    gte r3.microcredits r4 into r6;
    assert.eq r6 true;
    call credits.aleo/transfer_private r3 r1 r4 into r7 r8;
    add r2 r4 into r9;
    cast self.caller r0 r0 r4 r9 into r10 as PoolShare.record;
    async contribute_to_pool r0 r1 r4 into r11;
    output r10 as PoolShare.record;
    output r7 as credits.aleo/credits.record;
    output r8 as credits.aleo/credits.record;
    output r11 as zk_factor_12251.aleo/contribute_to_pool.future;

finalize contribute_to_pool:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    contains pool_contributions[r0] into r3;
    assert.eq r3 true;
    get.or_use pool_closed[r0] false into r4;
    not r4 into r5;
    assert.eq r5 true;
    get pool_owners[r0] into r6;
    is.eq r6 r1 into r7;
    assert.eq r7 true;
    get pool_contributions[r0] into r8;
    add r8 r2 into r9;
    set r9 into pool_contributions[r0];

function execute_pool_factoring:
    input r0 as FactoringOffer.record;
    input r1 as FactorPool.record;
    input r2 as credits.aleo/credits.record;
    is.eq r0.owner self.caller into r3;
    assert.eq r3 true;
    is.eq r1.owner self.caller into r4;
    assert.eq r4 true;
    not r1.is_closed into r5;
    assert.eq r5 true;
    is.eq r1.invoice_hash r0.invoice_hash into r6;
    assert.eq r6 true;
    not r0.use_token into r7;
    assert.eq r7 true;
    cast r0.amount into r8 as u128;
    cast r0.advance_rate into r9 as u128;
    mul r8 r9 into r10;
    div r10 10000u128 into r11;
    cast r11 into r12 as u64;
    gte r2.microcredits r12 into r13;
    assert.eq r13 true;
    cast self.caller r0.original_creditor r0.debtor r0.amount r12 r0.due_date 0u64 r0.advance_rate r0.invoice_hash r0.recourse into r14 as FactoredInvoice.record;
    call credits.aleo/transfer_private r2 r0.original_creditor r12 into r15 r16;
    async execute_pool_factoring r0.invoice_hash r1.target_amount self.caller into r17;
    output r14 as FactoredInvoice.record;
    output r15 as credits.aleo/credits.record;
    output r16 as credits.aleo/credits.record;
    output r17 as zk_factor_12251.aleo/execute_pool_factoring.future;

finalize execute_pool_factoring:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as address.public;
    get pool_contributions[r0] into r3;
    gte r3 r1 into r4;
    assert.eq r4 true;
    get.or_use pool_closed[r0] false into r5;
    not r5 into r6;
    assert.eq r6 true;
    set true into pool_closed[r0];
    get active_factors[r2] into r7;
    assert.eq r7.is_active true;
    get.or_use protocol_stats[1u8] 0u64 into r8;
    add r8 1u64 into r9;
    set r9 into protocol_stats[1u8];
    add r7.total_factored 1u64 into r10;
    cast r7.is_active r7.min_advance_rate r7.max_advance_rate r10 r7.registration_date into r11 as FactorInfo;
    set r11 into active_factors[r2];

function recover_pool_close:
    input r0 as FactorPool.record;
    is.eq r0.owner self.caller into r1;
    assert.eq r1 true;
    not r0.is_closed into r2;
    assert.eq r2 true;
    async recover_pool_close self.caller r0.invoice_hash r0.target_amount into r3;
    output r3 as zk_factor_12251.aleo/recover_pool_close.future;

finalize recover_pool_close:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as u64.public;
    get active_factors[r0] into r3;
    assert.eq r3.is_active true;
    get pool_owners[r1] into r4;
    is.eq r4 r0 into r5;
    assert.eq r5 true;
    get pool_contributions[r1] into r6;
    gte r6 r2 into r7;
    assert.eq r7 true;
    get settled_invoices[r1] into r8;
    assert.eq r8.is_settled true;
    get.or_use pool_closed[r1] false into r9;
    not r9 into r10;
    assert.eq r10 true;
    set true into pool_closed[r1];

function open_pool_distribution:
    input r0 as field.private;
    async open_pool_distribution r0 self.caller into r1;
    output r1 as zk_factor_12251.aleo/open_pool_distribution.future;

finalize open_pool_distribution:
    input r0 as field.public;
    input r1 as address.public;
    get pool_owners[r0] into r2;
    is.eq r2 r1 into r3;
    assert.eq r3 true;
    get settled_invoices[r0] into r4;
    assert.eq r4.is_settled true;
    gt r4.amount 0u64 into r5;
    assert.eq r5 true;
    get.or_use pool_closed[r0] false into r6;
    assert.eq r6 true;
    contains pool_proceeds[r0] into r7;
    not r7 into r8;
    assert.eq r8 true;
    set r4.amount into pool_proceeds[r0];
    set 0u64 into pool_distributed[r0];

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
    output r6 as zk_factor_12251.aleo/claim_pool_proceeds.future;

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
    input r2 as u64.private;
    input r3 as u64.private;
    gt r2 0u64 into r4;
    assert.eq r4 true;
    gte r3 5000000u64 into r5;
    assert.eq r5 true;
    lte r3 r2 into r6;
    assert.eq r6 true;
    async create_ownerless_pool self.caller r0 r1 r2 r3 into r7;
    output r7 as zk_factor_12251.aleo/create_ownerless_pool.future;

finalize create_ownerless_pool:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as u128.public;
    input r3 as u64.public;
    input r4 as u64.public;
    get active_factors[r0] into r5;
    assert.eq r5.is_active true;
    contains pool_meta[r1] into r6;
    not r6 into r7;
    assert.eq r7 true;
    contains pool_contributions[r1] into r8;
    not r8 into r9;
    assert.eq r9 true;
    get.or_use pool_registry__len__[false] 0u32 into r10;
    add r10 1u32 into r11;
    set r11 into pool_registry__len__[false];
    set r1 into pool_registry__[r10];
    cast block.timestamp into r12 as u64;
    cast r2 r3 r4 r12 into r13 as PoolMeta;
    set r13 into pool_meta[r1];
    set 0u64 into pool_contributions[r1];
    set false into pool_closed[r1];
    set 0u8 into pool_vote_count[r1];

function pool_contribute:
    input r0 as field.private;
    input r1 as address.private;
    input r2 as u64.private;
    input r3 as u64.private;
    gt r2 0u64 into r4;
    assert.eq r4 true;
    call credits.aleo/transfer_public_as_signer r1 r2 into r5;
    add r3 r2 into r6;
    cast self.caller r0 r0 r2 r6 into r7 as PoolShare.record;
    async pool_contribute r1 self.caller r0 r2 r5 into r8;
    output r7 as PoolShare.record;
    output r8 as zk_factor_12251.aleo/pool_contribute.future;

finalize pool_contribute:
    input r0 as address.public;
    input r1 as address.public;
    input r2 as field.public;
    input r3 as u64.public;
    input r4 as credits.aleo/transfer_public_as_signer.future;
    is.eq r0 zk_factor_12251.aleo into r5;
    assert.eq r5 true;
    get active_factors[r1] into r6;
    assert.eq r6.is_active true;
    get pool_meta[r2] into r7;
    get.or_use pool_closed[r2] false into r8;
    not r8 into r9;
    assert.eq r9 true;
    gte r3 r7.min_contribution into r10;
    assert.eq r10 true;
    get.or_use pool_contributions[r2] 0u64 into r11;
    add r11 r3 into r12;
    lte r12 r7.target_amount into r13;
    assert.eq r13 true;
    set r12 into pool_contributions[r2];
    await r4;

function pool_submit_invoice:
    input r0 as Invoice.record;
    input r1 as field.private;
    input r2 as u16.private;
    is.eq r0.owner self.caller into r3;
    assert.eq r3 true;
    is.eq r0.invoice_hash r1 into r4;
    assert.eq r4 true;
    gte r2 5000u16 into r5;
    lte r2 9900u16 into r6;
    and r5 r6 into r7;
    assert.eq r7 true;
    cast r0.amount into r8 as u128;
    cast r2 into r9 as u128;
    mul r8 r9 into r10;
    div r10 10000u128 into r11;
    cast r11 into r12 as u64;
    async pool_submit_invoice r1 r12 self.caller r0.debtor r0.amount r2 r0.due_date r0.nonce into r13;
    output r13 as zk_factor_12251.aleo/pool_submit_invoice.future;

finalize pool_submit_invoice:
    input r0 as field.public;
    input r1 as u64.public;
    input r2 as address.public;
    input r3 as address.public;
    input r4 as u64.public;
    input r5 as u16.public;
    input r6 as u64.public;
    input r7 as field.public;
    get pool_meta[r0] into r8;
    get.or_use pool_closed[r0] false into r9;
    not r9 into r10;
    assert.eq r10 true;
    contains pool_pending_offer[r0] into r11;
    not r11 into r12;
    assert.eq r12 true;
    get pool_contributions[r0] into r13;
    gte r13 r8.target_amount into r14;
    assert.eq r14 true;
    is.eq r1 r8.target_amount into r15;
    assert.eq r15 true;
    cast r2 r3 r4 r5 r1 r6 r7 false into r16 as PendingPoolOffer;
    set r16 into pool_pending_offer[r0];

function pool_vote:
    input r0 as field.private;
    async pool_vote self.caller r0 into r1;
    output r1 as zk_factor_12251.aleo/pool_vote.future;

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

function execute_approved_pool:
    input r0 as field.private;
    input r1 as address.private;
    input r2 as address.private;
    input r3 as u64.private;
    input r4 as u64.private;
    input r5 as u64.private;
    gt r3 0u64 into r6;
    assert.eq r6 true;
    call credits.aleo/transfer_public r1 r3 into r7;
    cast r2 r0 r4 r5 into r8 as PoolPaymentNotice.record;
    async execute_approved_pool r0 r1 r2 r3 r4 self.caller r7 into r9;
    output r8 as PoolPaymentNotice.record;
    output r9 as zk_factor_12251.aleo/execute_approved_pool.future;

finalize execute_approved_pool:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as address.public;
    input r3 as u64.public;
    input r4 as u64.public;
    input r5 as address.public;
    input r6 as credits.aleo/transfer_public.future;
    get pool_pending_offer[r0] into r7;
    not r7.is_executed into r8;
    assert.eq r8 true;
    is.eq r7.original_creditor r1 into r9;
    assert.eq r9 true;
    is.eq r7.debtor r2 into r10;
    assert.eq r10 true;
    is.eq r7.advance_amount r3 into r11;
    assert.eq r11 true;
    is.eq r7.amount r4 into r12;
    assert.eq r12 true;
    get.or_use pool_vote_count[r0] 0u8 into r13;
    get.or_use active_factor_count[false] 1u32 into r14;
    div r14 2u32 into r15;
    add r15 1u32 into r16;
    cast r16 into r17 as u8;
    gte r13 r17 into r18;
    assert.eq r18 true;
    cast r7.original_creditor r7.debtor r7.amount r7.advance_rate r7.advance_amount r7.due_date r7.nonce true into r19 as PendingPoolOffer;
    set r19 into pool_pending_offer[r0];
    set true into pool_closed[r0];
    set r5 into pool_executor[r0];
    get active_factors[r5] into r20;
    assert.eq r20.is_active true;
    get.or_use protocol_stats[1u8] 0u64 into r21;
    add r21 1u64 into r22;
    set r22 into protocol_stats[1u8];
    add r20.total_factored 1u64 into r23;
    cast r20.is_active r20.min_advance_rate r20.max_advance_rate r23 r20.registration_date into r24 as FactorInfo;
    set r24 into active_factors[r5];
    await r6;

function pay_pool_invoice:
    input r0 as PoolPaymentNotice.record;
    input r1 as address.private;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    call credits.aleo/transfer_public_as_signer r1 r0.amount into r3;
    async pay_pool_invoice r1 r0.invoice_hash r0.amount r3 into r4;
    output r4 as zk_factor_12251.aleo/pay_pool_invoice.future;

finalize pay_pool_invoice:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as credits.aleo/transfer_public_as_signer.future;
    is.eq r0 zk_factor_12251.aleo into r4;
    assert.eq r4 true;
    contains settled_invoices[r1] into r5;
    not r5 into r6;
    assert.eq r6 true;
    get.or_use pool_closed[r1] false into r7;
    assert.eq r7 true;
    get pool_pending_offer[r1] into r8;
    assert.eq r8.is_executed true;
    is.eq r2 r8.amount into r9;
    assert.eq r9 true;
    get pool_executor[r1] into r10;
    cast block.timestamp into r11 as u64;
    cast true r11 r10 r2 into r12 as SettlementInfo;
    set r12 into settled_invoices[r1];
    get.or_use protocol_stats[2u8] 0u64 into r13;
    add r13 1u64 into r14;
    set r14 into protocol_stats[2u8];
    await r3;

function pool_open_distribution:
    input r0 as field.private;
    async pool_open_distribution r0 into r1;
    output r1 as zk_factor_12251.aleo/pool_open_distribution.future;

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
    contains pool_proceeds[r0] into r5;
    not r5 into r6;
    assert.eq r6 true;
    set r2.amount into pool_proceeds[r0];
    set 0u64 into pool_distributed[r0];

constructor:
    assert.eq program_owner aleo19rn544c49da9z2vz52q5f7lm7nsjhp890ahmre6cz94qawdscgps6kq3cu;
