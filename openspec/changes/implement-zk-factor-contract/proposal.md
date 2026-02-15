## Why

The ZK-Factor platform requires a production-ready Leo smart contract to enable privacy-preserving invoice factoring with cryptographic double-factoring prevention. Currently, only a placeholder program exists (`main.leo` with a simple addition function). Without the core contract implementation, businesses cannot create invoices, factors cannot purchase them, and the fundamental value proposition—preventing double-factoring fraud through Aleo's UTXO model—remains unrealized.

## What Changes

- Implement `Invoice` and `FactoredInvoice` record structures with complete field validation
- Implement public mappings: `active_factors`, `settled_invoices`, `protocol_stats`
- Implement `mint_invoice()` transition for creating private invoice records
- Implement `factor_invoice()` transition with atomic swap logic and serial number-based double-spend prevention
- Implement `settle_invoice()` transition with settlement tracking
- Implement `register_factor()` and `deregister_factor()` transitions for factor management
- Add comprehensive validation logic (amount bounds, date validation, rate constraints, address checks)
- Create unit tests for all transitions including double-factoring prevention scenarios
- Update from placeholder `main()` function to production invoice factoring program

## Capabilities

### New Capabilities
- `invoice-registration`: Creating and validating invoice records with debtor, amount, due date, and cryptographic hash
- `invoice-factoring`: Executing atomic swap of invoice for payment with cryptographic double-spend prevention via serial number registry
- `invoice-settlement`: Settling factored invoices and preventing double settlement via public mapping
- `factor-management`: Registering and deregistering factoring companies with advance rate parameters

### Modified Capabilities
<!-- No existing capabilities to modify - this is net-new implementation -->

## Impact

- **`aleo/src/main.leo`**: Complete replacement of placeholder program with production invoice factoring logic (~300-400 lines)
- **Tests**: New test suite required for all transitions, validation scenarios, and double-spend prevention
- **Program ID**: Continues using `zk_factor_11765.aleo` (no change to deployed program name)
- **Admin constructor**: Retains existing admin-controlled constructor pattern
- **Client integration**: Enables frontend to call real transitions instead of mocks
- **Deployment**: Requires testnet deployment and testing before mainnet launch
