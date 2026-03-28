import credits.aleo;
import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
program zk_factor_9597.aleo;

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

mapping factor_addresses__:
    key as u32.public;
    value as address.public;

mapping factor_addresses__len__:
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
    output r10 as zk_factor_9597.aleo/mint_invoice.future;

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
    output r9 as zk_factor_9597.aleo/register_factor.future;

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

function deregister_factor:
    async deregister_factor self.caller into r0;
    output r0 as zk_factor_9597.aleo/deregister_factor.future;

finalize deregister_factor:
    input r0 as address.public;
    get active_factors[r0] into r1;
    cast false r1.min_advance_rate r1.max_advance_rate r1.total_factored r1.registration_date into r2 as FactorInfo;
    set r2 into active_factors[r0];

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
    async authorize_factoring r1 r0.invoice_hash into r10;
    output r9 as FactoringOffer.record;
    output r10 as zk_factor_9597.aleo/authorize_factoring.future;

finalize authorize_factoring:
    input r0 as address.public;
    input r1 as field.public;
    get active_factors[r0] into r2;
    assert.eq r2.is_active true;

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
    async authorize_partial_factoring r1 r0.invoice_hash into r19;
    output r17 as FactoringOffer.record;
    output r18 as Invoice.record;
    output r19 as zk_factor_9597.aleo/authorize_partial_factoring.future;

finalize authorize_partial_factoring:
    input r0 as address.public;
    input r1 as field.public;
    get active_factors[r0] into r2;
    assert.eq r2.is_active true;

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
    output r13 as zk_factor_9597.aleo/execute_factoring.future;

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
    call test_usdcx_stablecoin.aleo/transfer_public r0.original_creditor r8 into r9;
    async execute_factoring_token self.caller r0.invoice_hash r9 into r10;
    output r7 as FactoredInvoice.record;
    output r10 as zk_factor_9597.aleo/execute_factoring_token.future;

finalize execute_factoring_token:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as test_usdcx_stablecoin.aleo/transfer_public.future;
    await r2;
    get active_factors[r0] into r3;
    assert.eq r3.is_active true;
    get.or_use protocol_stats[1u8] 0u64 into r4;
    add r4 1u64 into r5;
    set r5 into protocol_stats[1u8];
    add r3.total_factored 1u64 into r6;
    cast r3.is_active r3.min_advance_rate r3.max_advance_rate r6 r3.registration_date into r7 as FactorInfo;
    set r7 into active_factors[r0];

function settle_invoice:
    input r0 as FactoredInvoice.record;
    is.eq r0.owner self.caller into r1;
    assert.eq r1 true;
    async settle_invoice r0.invoice_hash self.caller into r2;
    output r2 as zk_factor_9597.aleo/settle_invoice.future;

finalize settle_invoice:
    input r0 as field.public;
    input r1 as address.public;
    contains settled_invoices[r0] into r2;
    not r2 into r3;
    assert.eq r3 true;
    cast block.timestamp into r4 as u64;
    cast true r4 r1 into r5 as SettlementInfo;
    set r5 into settled_invoices[r0];
    get.or_use protocol_stats[2u8] 0u64 into r6;
    add r6 1u64 into r7;
    set r7 into protocol_stats[2u8];

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
    async pay_invoice r0.invoice_hash self.caller r0.amount r1 into r4;
    output r4 as zk_factor_9597.aleo/pay_invoice.future;

finalize pay_invoice:
    input r0 as field.public;
    input r1 as address.public;
    input r2 as u64.public;
    input r3 as address.public;
    contains settled_invoices[r0] into r4;
    not r4 into r5;
    assert.eq r5 true;
    cast block.timestamp into r6 as u64;
    cast true r6 r3 into r7 as SettlementInfo;
    set r7 into settled_invoices[r0];
    get.or_use protocol_stats[2u8] 0u64 into r8;
    add r8 1u64 into r9;
    set r9 into protocol_stats[2u8];

function initiate_recourse:
    input r0 as FactoredInvoice.record;
    is.eq r0.owner self.caller into r1;
    assert.eq r1 true;
    assert.eq r0.recourse true;
    cast r0.original_creditor self.caller r0.advance_amount r0.invoice_hash into r2 as RecourseNotice.record;
    async initiate_recourse r0.invoice_hash r0.due_date into r3;
    output r2 as RecourseNotice.record;
    output r3 as zk_factor_9597.aleo/initiate_recourse.future;

finalize initiate_recourse:
    input r0 as field.public;
    input r1 as u64.public;
    cast block.timestamp into r2 as u64;
    gt r2 r1 into r3;
    assert.eq r3 true;
    contains settled_invoices[r0] into r4;
    not r4 into r5;
    assert.eq r5 true;
    get.or_use recourse_claims[r0] false into r6;
    not r6 into r7;
    assert.eq r7 true;
    set true into recourse_claims[r0];

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
    output r6 as zk_factor_9597.aleo/settle_recourse.future;

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
    async create_pool self.caller r0 r1 into r4;
    output r3 as FactorPool.record;
    output r4 as zk_factor_9597.aleo/create_pool.future;

finalize create_pool:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as u64.public;
    get active_factors[r0] into r3;
    assert.eq r3.is_active true;
    contains pool_contributions[r1] into r4;
    not r4 into r5;
    assert.eq r5 true;
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
    output r11 as zk_factor_9597.aleo/contribute_to_pool.future;

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
    async execute_pool_factoring self.caller r0.invoice_hash r1.target_amount r12 into r17;
    output r14 as FactoredInvoice.record;
    output r15 as credits.aleo/credits.record;
    output r16 as credits.aleo/credits.record;
    output r17 as zk_factor_9597.aleo/execute_pool_factoring.future;

finalize execute_pool_factoring:
    input r0 as address.public;
    input r1 as field.public;
    input r2 as u64.public;
    input r3 as u64.public;
    get active_factors[r0] into r4;
    assert.eq r4.is_active true;
    get pool_contributions[r1] into r5;
    gte r5 r2 into r6;
    assert.eq r6 true;
    get.or_use pool_closed[r1] false into r7;
    not r7 into r8;
    assert.eq r8 true;
    set true into pool_closed[r1];
    get.or_use protocol_stats[1u8] 0u64 into r9;
    add r9 1u64 into r10;
    set r10 into protocol_stats[1u8];
    add r4.total_factored 1u64 into r11;
    cast r4.is_active r4.min_advance_rate r4.max_advance_rate r11 r4.registration_date into r12 as FactorInfo;
    set r12 into active_factors[r0];

function recover_pool_close:
    input r0 as FactorPool.record;
    is.eq r0.owner self.caller into r1;
    assert.eq r1 true;
    not r0.is_closed into r2;
    assert.eq r2 true;
    async recover_pool_close self.caller r0.invoice_hash r0.target_amount into r3;
    output r3 as zk_factor_9597.aleo/recover_pool_close.future;

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

function claim_pool_proceeds:
    input r0 as PoolShare.record;
    input r1 as credits.aleo/credits.record;
    gt r0.total_pool 0u64 into r2;
    assert.eq r2 true;
    mul r0.contributed 10000u64 into r3;
    div r3 r0.total_pool into r4;
    mul r1.microcredits r4 into r5;
    div r5 10000u64 into r6;
    gte r1.microcredits r6 into r7;
    assert.eq r7 true;
    call credits.aleo/transfer_private r1 r0.owner r6 into r8 r9;
    async claim_pool_proceeds r0.invoice_hash into r10;
    output r8 as credits.aleo/credits.record;
    output r9 as credits.aleo/credits.record;
    output r10 as zk_factor_9597.aleo/claim_pool_proceeds.future;

finalize claim_pool_proceeds:
    input r0 as field.public;
    get settled_invoices[r0] into r1;
    assert.eq r1.is_settled true;
    get.or_use pool_closed[r0] false into r2;
    assert.eq r2 true;

constructor:
    assert.eq program_owner aleo19rn544c49da9z2vz52q5f7lm7nsjhp890ahmre6cz94qawdscgps6kq3cu;
