import zk_factor_11765.aleo;
program test_zk_factor.aleo;

function do_nothing:
    call zk_factor_11765.aleo/main 2u32 3u32 into r0;
    assert.eq r0 3u32;

constructor:
    assert.eq edition 0u16;
