## 1. Define Data Structures

- [ ] 1.1 Define `Invoice` record with fields: owner, debtor, amount, due_date, invoice_hash, nonce, metadata
- [ ] 1.2 Define `FactoredInvoice` record with fields: owner, original_creditor, debtor, amount, advance_amount, due_date, factoring_date, advance_rate, invoice_hash, recourse
- [ ] 1.3 Define `FactorInfo` struct with fields: is_active, min_advance_rate, max_advance_rate, total_factored, registration_date
- [ ] 1.4 Define `SettlementInfo` struct with fields: is_settled, settlement_date, factor
- [ ] 1.5 Declare `active_factors` mapping (address => FactorInfo)
- [ ] 1.6 Declare `settled_invoices` mapping (field => SettlementInfo)
- [ ] 1.7 Declare `protocol_stats` mapping (u8 => u64)

## 2. Implement Invoice Registration

- [ ] 2.1 Implement `mint_invoice()` transition signature with parameters: debtor, amount, due_date, invoice_hash, metadata
- [ ] 2.2 Add amount validation assertion (amount > 0u64)
- [ ] 2.3 Add due date validation assertion (due_date > block.timestamp)
- [ ] 2.4 Add debtor validation assertion (debtor != self.caller)
- [ ] 2.5 Implement nonce generation using Poseidon2::hash_to_field(invoice_hash, block.timestamp, self.caller)
- [ ] 2.6 Create and return Invoice record with all fields populated

## 3. Implement Factor Management

- [ ] 3.1 Implement `register_factor()` transition with parameters: min_advance_rate, max_advance_rate
- [ ] 3.2 Add rate range validation (min_advance_rate <= max_advance_rate)
- [ ] 3.3 Add min rate bounds validation (5000u16 <= min_advance_rate <= 9900u16)
- [ ] 3.4 Add max rate bounds validation (5000u16 <= max_advance_rate <= 9900u16)
- [ ] 3.5 Implement `finalize_register_factor()` async function
- [ ] 3.6 Add duplicate registration check in finalize (reject if already active)
- [ ] 3.7 Create FactorInfo struct and store in active_factors mapping
- [ ] 3.8 Implement `deregister_factor()` transition (no parameters)
- [ ] 3.9 Implement `finalize_deregister_factor()` async function
- [ ] 3.10 Update is_active to false in active_factors mapping

## 4. Implement Invoice Factoring

- [ ] 4.1 Implement `factor_invoice()` transition signature with parameters: invoice, factor, advance_rate, payment
- [ ] 4.2 Add ownership validation (invoice.owner == self.caller)
- [ ] 4.3 Add advance rate bounds validation (5000u16 <= advance_rate <= 9900u16)
- [ ] 4.4 Calculate advance amount using safe arithmetic: (invoice.amount * advance_rate as u64) / 10000u64
- [ ] 4.5 Add payment sufficiency validation (payment.amount >= advance_amount)
- [ ] 4.6 Create FactoredInvoice record with all fields populated
- [ ] 4.7 Transfer payment credits to business using credits.aleo/transfer_private()
- [ ] 4.8 Implement `finalize_factor_invoice()` async function
- [ ] 4.9 Add factor registration check in finalize (active_factors.contains(factor))
- [ ] 4.10 Increment protocol_stats[1u8] counter (total factored)
- [ ] 4.11 Increment active_factors[factor].total_factored counter
- [ ] 4.12 Return FactoredInvoice and payment credits

## 5. Implement Invoice Settlement

- [ ] 5.1 Implement `settle_invoice()` transition signature with parameters: factored, payment
- [ ] 5.2 Add ownership validation (factored.owner == self.caller)
- [ ] 5.3 Add payment amount validation (payment.amount >= factored.amount)
- [ ] 5.4 Implement `finalize_settle_invoice()` async function with invoice_hash parameter
- [ ] 5.5 Add double settlement check in finalize (assert !settled_invoices.contains(invoice_hash))
- [ ] 5.6 Create SettlementInfo struct with is_settled=true, settlement_date=block.timestamp, factor=self.caller
- [ ] 5.7 Store SettlementInfo in settled_invoices mapping
- [ ] 5.8 Increment protocol_stats[2u8] counter (total settled)
- [ ] 5.9 Return payment credits to factor

## 6. Write Unit Tests

- [ ] 6.1 Write test for valid invoice creation with positive amount and future due date
- [ ] 6.2 Write @should_fail test for zero amount invoice
- [ ] 6.3 Write @should_fail test for past due date invoice
- [ ] 6.4 Write @should_fail test for self-debtor invoice
- [ ] 6.5 Write test for factor registration with valid rate range
- [ ] 6.6 Write @should_fail test for invalid rate range (min > max)
- [ ] 6.7 Write @should_fail test for out-of-bounds advance rates
- [ ] 6.8 Write test for valid factoring transaction with registered factor
- [ ] 6.9 Write @should_fail test for factoring with unregistered factor
- [ ] 6.10 Write @should_fail test for insufficient payment in factoring
- [ ] 6.11 Write @should_fail test for double-factoring attempt (serial number spent)
- [ ] 6.12 Write test for valid settlement with full payment
- [ ] 6.13 Write @should_fail test for settlement with partial payment
- [ ] 6.14 Write @should_fail test for double settlement attempt
- [ ] 6.15 Write test for factor deregistration
- [ ] 6.16 Write test verifying protocol stats increment correctly

## 7. Update Program Structure

- [ ] 7.1 Remove placeholder `main()` transition from main.leo
- [ ] 7.2 Update program header comment with description of ZK-Factor contract
- [ ] 7.3 Verify admin constructor is present and configured correctly
- [ ] 7.4 Add imports if needed (e.g., credits.aleo for payment handling)
- [ ] 7.5 Organize code structure: mappings, structs, records, transitions in logical order

## 8. Build and Test Locally

- [ ] 8.1 Run `leo build` in aleo/ directory to compile program
- [ ] 8.2 Fix any compilation errors
- [ ] 8.3 Run `leo test` to execute all unit tests
- [ ] 8.4 Verify all tests pass
- [ ] 8.5 Review test output for any warnings or issues

## 9. Testnet Deployment

- [ ] 9.1 Configure .env file with testnet network and endpoint
- [ ] 9.2 Ensure PRIVATE_KEY is set for deployment account
- [ ] 9.3 Run `leo deploy --network testnet` to deploy program
- [ ] 9.4 Verify deployment transaction confirmed on testnet
- [ ] 9.5 Document deployed program ID and transaction hash
- [ ] 9.6 Test invoice creation on testnet
- [ ] 9.7 Test factor registration on testnet
- [ ] 9.8 Test factoring transaction on testnet
- [ ] 9.9 Test settlement on testnet
- [ ] 9.10 Measure and document gas costs for each transition

## 10. Documentation and Cleanup

- [ ] 10.1 Update aleo/README.md with deployed program information
- [ ] 10.2 Document actual gas costs in deployment.md
- [ ] 10.3 Add example transaction commands to docs
- [ ] 10.4 Update client/CLAUDE.md with deployed program ID
- [ ] 10.5 Verify all placeholder values replaced with production data
