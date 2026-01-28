// The 'test_zk_factor' test program.
import zk_factor.aleo;
program test_zk_factor.aleo {
    @test
    script test_it() {
        let result: u32 = zk_factor.aleo/main(1u32, 2u32);
        assert_eq(result, 3u32);
    }

    @test
    @should_fail
    transition do_nothing() {
        let result: u32 = zk_factor.aleo/main(2u32, 3u32);
        assert_eq(result, 3u32);
    }

    @noupgrade
    async constructor() {}
}
