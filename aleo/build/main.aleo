import credits.aleo;
import merkle_tree.aleo;
import test_usdcx_multisig_core.aleo;
import test_usdcx_freezelist.aleo;
import test_usdcx_stablecoin.aleo;
program zk_factor_12250.aleo;

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
    output r10 as zk_factor_12250.aleo/mint_invoice.future;

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
    output r9 as zk_factor_12250.aleo/register_factor.future;

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
    output r0 as zk_factor_12250.aleo/deregister_factor.future;

finalize deregister_factor:
    input r0 as address.public;
    get active_factors[r0] into r1;
    assert.eq r1.is_active true;
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
    async authorize_factoring r1 into r10;
    output r9 as FactoringOffer.record;
    output r10 as zk_factor_12250.aleo/authorize_factoring.future;

finalize authorize_factoring:
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
    output r13 as zk_factor_12250.aleo/execute_factoring.future;

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
    output r10 as zk_factor_12250.aleo/execute_factoring_token.future;

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

function pay_invoice:
    input r0 as PaymentNotice.record;
    input r1 as address.private;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    is.eq r0.factor r1 into r3;
    assert.eq r3 true;
    call credits.aleo/transfer_public_as_signer r1 r0.amount into r4;
    async pay_invoice r0.invoice_hash r1 r0.amount r4 into r5;
    output r5 as zk_factor_12250.aleo/pay_invoice.future;

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
    output r6 as zk_factor_12250.aleo/settle_recourse.future;

finalize settle_recourse:
    input r0 as field.public;
    get recourse_claims[r0] into r1;
    assert.eq r1 true;
    set false into recourse_claims[r0];

constructor:
    assert.eq program_owner aleo19rn544c49da9z2vz52q5f7lm7nsjhp890ahmre6cz94qawdscgps6kq3cu;
