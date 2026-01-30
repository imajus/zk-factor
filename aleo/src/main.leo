// The 'zk_factor' program.
program zk_factor_11765.aleo {
    // Simple admin-controlled upgradable constructor for MVP
    // Can be upgraded to multi-sig governance later
    // IMPORTANT: Replace with actual admin address before deployment
    // See aleo/docs/deployment.md for admin key management
    @admin(address="aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc")
    async constructor() {}

    transition main(public a: u32, b: u32) -> u32 {
        let c: u32 = a + b;
        return c;
    }
}
