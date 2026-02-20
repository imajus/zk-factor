import credits.aleo;
program zk_factor_9588.aleo;

record Invoice:
    owner as address.private;
    debtor as address.private;
    amount as u64.private;
    due_date as u64.private;
    invoice_hash as field.private;
    nonce as field.private;
    metadata as u128.private;

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
    gt r1 0u64 into r5;
    assert.eq r5 true;
    is.neq r0 self.caller into r6;
    assert.eq r6 true;
    hash.psd2 r3 into r7 as field;
    cast self.caller r0 r1 r2 r3 r7 r4 into r8 as Invoice.record;
    async mint_invoice r2 into r9;
    output r8 as Invoice.record;
    output r9 as zk_factor_9588.aleo/mint_invoice.future;

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
    output r9 as zk_factor_9588.aleo/register_factor.future;

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
    output r0 as zk_factor_9588.aleo/deregister_factor.future;

finalize deregister_factor:
    input r0 as address.public;
    get active_factors[r0] into r1;
    cast false r1.min_advance_rate r1.max_advance_rate r1.total_factored r1.registration_date into r2 as FactorInfo;
    set r2 into active_factors[r0];

function factor_invoice:
    input r0 as Invoice.record;
    input r1 as address.private;
    input r2 as u16.private;
    input r3 as credits.aleo/credits.record;
    is.eq r0.owner self.caller into r4;
    assert.eq r4 true;
    gte r2 5000u16 into r5;
    lte r2 9900u16 into r6;
    and r5 r6 into r7;
    assert.eq r7 true;
    cast r2 into r8 as u64;
    mul r0.amount r8 into r9;
    div r9 10000u64 into r10;
    gte r3.microcredits r10 into r11;
    assert.eq r11 true;
    cast r1 self.caller r0.debtor r0.amount r10 r0.due_date 0u64 r2 r0.invoice_hash false into r12 as FactoredInvoice.record;
    call credits.aleo/transfer_private r3 self.caller r10 into r13 r14;
    async factor_invoice r1 r0.invoice_hash into r15;
    output r12 as FactoredInvoice.record;
    output r13 as credits.aleo/credits.record;
    output r14 as credits.aleo/credits.record;
    output r15 as zk_factor_9588.aleo/factor_invoice.future;

finalize factor_invoice:
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

function settle_invoice:
    input r0 as FactoredInvoice.record;
    input r1 as credits.aleo/credits.record;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    gte r1.microcredits r0.amount into r3;
    assert.eq r3 true;
    call credits.aleo/transfer_private r1 self.caller r0.amount into r4 r5;
    async settle_invoice r0.invoice_hash self.caller into r6;
    output r4 as credits.aleo/credits.record;
    output r5 as credits.aleo/credits.record;
    output r6 as zk_factor_9588.aleo/settle_invoice.future;

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

constructor:
    assert.eq program_owner aleo19rn544c49da9z2vz52q5f7lm7nsjhp890ahmre6cz94qawdscgps6kq3cu;
