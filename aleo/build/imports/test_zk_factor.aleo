import credits.aleo;
import zk_factor_9588.aleo;
program test_zk_factor.aleo;

function noop:
    output true as boolean.private;

constructor:
    assert.eq edition 0u16;
