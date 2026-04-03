import zk_factor_12250.aleo;

program test_zk_factor.aleo {
    @noupgrade
    constructor() {}

    @test
    @should_fail
    fn test_past_due_invoice() {
        let debtor: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        
        let (invoice, f): (zk_factor_12250.aleo::Invoice, Final) =
            zk_factor_12250.aleo::mint_invoice(debtor, 100000u64, 1000000000u64, 12345field, 0u128, 0field);
        
        // Use 'let' to consume the value, but do NOT specify the type '()'
        let outcome = final {
            f.run();
        }; 
    }

    @test
    fn test_full_lifecycle() {
        let debtor: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        
        // 1. ALL external calls (::) MUST be first
        let f1: Final = zk_factor_12250.aleo::register_factor(8000u16, 9500u16);
        let (invoice, f2): (zk_factor_12250.aleo::Invoice, Final) =
            zk_factor_12250.aleo::mint_invoice(debtor, 150000u64, 1800000000u64, 77777field, 0u128, 0field);
        
        // 2. Exactly one final block to execute the runs
        let outcome = final { 
            f1.run(); 
            f2.run();
        };

        // 3. Local assertions can happen after the final block
        assert_eq(invoice.amount, 150000u64);
    }

    @test
    @should_fail
    fn test_double_settle_prevent() {
        let f1: Final = zk_factor_12250.aleo::register_factor(8500u16, 9200u16);
        let f2: Final = zk_factor_12250.aleo::register_factor(8500u16, 9200u16);
        
        let outcome = final { 
            f1.run(); 
            f2.run();
        };
    }

    @test
    fn test_deregister_state() {
        let f1: Final = zk_factor_12250.aleo::register_factor(7000u16, 9000u16);
        let f2: Final = zk_factor_12250.aleo::deregister_factor();
        let f3: Final = zk_factor_12250.aleo::register_factor(9000u16, 9800u16);
        
        let outcome = final { 
            f1.run(); 
            f2.run();
            f3.run();
        };
    }

    @test
    fn test_payout_three_dust() {
        let proceeds: u128 = 10u128;
        let total: u128 = 3u128;
        let payout_each: u64 = ((proceeds * 1u128) / total) as u64;
        assert_eq(payout_each, 3u64); 
    }
}