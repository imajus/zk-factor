import credits.aleo;
import zk_factor_11765.aleo;
program test_zk_factor.aleo;

function test_zero_amount_invoice:
    call zk_factor_11765.aleo/mint_invoice aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc 0u64 1800000000u64 12345field 67890u128 into r0 r1;

function test_past_due_date_invoice:
    call zk_factor_11765.aleo/mint_invoice aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc 100000u64 1000000000u64 12345field 67890u128 into r0 r1;

function test_self_debtor_invoice:
    call zk_factor_11765.aleo/mint_invoice self.caller 100000u64 1800000000u64 12345field 67890u128 into r0 r1;

function test_valid_factor_registration:
    call zk_factor_11765.aleo/register_factor 8000u16 9500u16 into r0;

function test_invalid_rate_range:
    call zk_factor_11765.aleo/register_factor 9500u16 8000u16 into r0;

function test_out_of_bounds_min_rate:
    call zk_factor_11765.aleo/register_factor 4000u16 9000u16 into r0;

function test_out_of_bounds_max_rate:
    call zk_factor_11765.aleo/register_factor 7000u16 10000u16 into r0;

function test_factor_deregistration:
    call zk_factor_11765.aleo/deregister_factor into r0;

constructor:
    assert.eq edition 0u16;
