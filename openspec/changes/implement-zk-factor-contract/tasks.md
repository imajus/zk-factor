## 1. Define Data Structures

- [x] 1.1 Define `Invoice` record with fields: owner, debtor, amount, due_date, invoice_hash, nonce, metadata
- [x] 1.2 Define `FactoredInvoice` record with fields: owner, original_creditor, debtor, amount, advance_amount, due_date, factoring_date, advance_rate, invoice_hash, recourse
- [x] 1.3 Define `FactorInfo` struct with fields: is_active, min_advance_rate, max_advance_rate, total_factored, registration_date
- [x] 1.4 Define `SettlementInfo` struct with fields: is_settled, settlement_date, factor
- [x] 1.5 Declare `active_factors` mapping (address => FactorInfo)
- [x] 1.6 Declare `settled_invoices` mapping (field => SettlementInfo)
- [x] 1.7 Declare `protocol_stats` mapping (u8 => u64)

## 2. Implement Invoice Registration

- [x] 2.1 Implement `mint_invoice()` transition signature with parameters: debtor, amount, due_date, invoice_hash, metadata
- [x] 2.2 Add amount validation assertion (amount > 0u64)
- [x] 2.3 Add due date validation assertion (due_date > block.timestamp)
- [x] 2.4 Add debtor validation assertion (debtor != self.caller)
- [x] 2.5 Implement nonce generation using Poseidon2::hash_to_field(invoice_hash, block.timestamp, self.caller)
- [x] 2.6 Create and return Invoice record with all fields populated

## 3. Implement Factor Management

- [x] 3.1 Implement `register_factor()` transition with parameters: min_advance_rate, max_advance_rate
- [x] 3.2 Add rate range validation (min_advance_rate <= max_advance_rate)
- [x] 3.3 Add min rate bounds validation (5000u16 <= min_advance_rate <= 9900u16)
- [x] 3.4 Add max rate bounds validation (5000u16 <= max_advance_rate <= 9900u16)
- [x] 3.5 Implement `finalize_register_factor()` async function
- [x] 3.6 Add duplicate registration check in finalize (reject if already active)
- [x] 3.7 Create FactorInfo struct and store in active_factors mapping
- [x] 3.8 Implement `deregister_factor()` transition (no parameters)
- [x] 3.9 Implement `finalize_deregister_factor()` async function
- [x] 3.10 Update is_active to false in active_factors mapping

## 4. Implement Invoice Factoring

- [x] 4.1 Implement `factor_invoice()` transition signature with parameters: invoice, factor, advance_rate, payment
- [x] 4.2 Add ownership validation (invoice.owner == self.caller)
- [x] 4.3 Add advance rate bounds validation (5000u16 <= advance_rate <= 9900u16)
- [x] 4.4 Calculate advance amount using safe arithmetic: (invoice.amount * advance_rate as u64) / 10000u64
- [x] 4.5 Add payment sufficiency validation (payment.amount >= advance_amount)
- [x] 4.6 Create FactoredInvoice record with all fields populated
- [x] 4.7 Transfer payment credits to business using credits.aleo/transfer_private()
- [x] 4.8 Implement `finalize_factor_invoice()` async function
- [x] 4.9 Add factor registration check in finalize (active_factors.contains(factor))
- [x] 4.10 Increment protocol_stats[1u8] counter (total factored)
- [x] 4.11 Increment active_factors[factor].total_factored counter
- [x] 4.12 Return FactoredInvoice and payment credits

## 5. Implement Invoice Settlement

- [x] 5.1 Implement `settle_invoice()` transition signature with parameters: factored, payment
- [x] 5.2 Add ownership validation (factored.owner == self.caller)
- [x] 5.3 Add payment amount validation (payment.amount >= factored.amount)
- [x] 5.4 Implement `finalize_settle_invoice()` async function with invoice_hash parameter
- [x] 5.5 Add double settlement check in finalize (assert !settled_invoices.contains(invoice_hash))
- [x] 5.6 Create SettlementInfo struct with is_settled=true, settlement_date=block.timestamp, factor=self.caller
- [x] 5.7 Store SettlementInfo in settled_invoices mapping
- [x] 5.8 Increment protocol_stats[2u8] counter (total settled)
- [x] 5.9 Return payment credits to factor

## 6. Write Unit Tests

- [x] 6.1 Write test for valid invoice creation with positive amount and future due date
- [x] 6.2 Write @should_fail test for zero amount invoice
- [x] 6.3 Write @should_fail test for past due date invoice
- [x] 6.4 Write @should_fail test for self-debtor invoice
- [x] 6.5 Write test for factor registration with valid rate range
- [x] 6.6 Write @should_fail test for invalid rate range (min > max)
- [x] 6.7 Write @should_fail test for out-of-bounds advance rates
- [x] 6.8 Write test for valid factoring transaction with registered factor
- [x] 6.9 Write @should_fail test for factoring with unregistered factor
- [x] 6.10 Write @should_fail test for insufficient payment in factoring
- [x] 6.11 Write @should_fail test for double-factoring attempt (serial number spent)
- [x] 6.12 Write test for valid settlement with full payment
- [x] 6.13 Write @should_fail test for settlement with partial payment
- [x] 6.14 Write @should_fail test for double settlement attempt
- [x] 6.15 Write test for factor deregistration
- [x] 6.16 Write test verifying protocol stats increment correctly

## 7. Update Program Structure

- [x] 7.1 Remove placeholder `main()` transition from main.leo
- [x] 7.2 Update program header comment with description of ZK-Factor contract
- [x] 7.3 Verify admin constructor is present and configured correctly
- [x] 7.4 Add imports if needed (e.g., credits.aleo for payment handling)
- [x] 7.5 Organize code structure: mappings, structs, records, transitions in logical order

## 8. Build and Test Locally

- [x] 8.1 Run `leo build` in aleo/ directory to compile program
- [x] 8.2 Fix any compilation errors
- [x] 8.3 Run `leo test` to execute all unit tests
- [x] 8.4 Verify all tests pass
- [x] 8.5 Review test output for any warnings or issues

## 9. Testnet Deployment

- [x] 9.1 Configure .env file with testnet network and endpoint
- [x] 9.2 Ensure PRIVATE_KEY is set for deployment account
- [x] 9.3 Run `leo deploy --network testnet` to deploy program (deployed via Leo Playground due to leo CLI endpoint path-stripping bug)
- [x] 9.4 Verify deployment transaction confirmed on testnet (at1ske79h4mmyjg963rc3gu3wkgft8h6zd80m7auk6d4zpr4gnrwuxq6y3sr9)
- [ ] 9.5 Document deployed program ID and transaction hash
- [x] 9.6 Test invoice creation on testnet (at18rllhldgfftyc0n7kr6ffafaxsjm4fcp3weksael97kpy0vj4uysn9fen3)
- [x] 9.7 Test factor registration on testnet (at1xt40g2flcp6gguqa9m6hxfqx4y8we8yw6zlyzgvjspjmphz60u9ql75jan)
- [x] 9.8 Test factoring transaction on testnet (at1j5fn4nhr50que77yva7e8ndaa74vnw6yc5y0g5e89ywquehnavqswx33fe)
- [ ] 9.9 Test settlement on testnet (blocked: settle_invoice transactions dropped from mempool; local execution succeeds, proofs valid)
- [ ] 9.10 Measure and document gas costs for each transition

## 10. Documentation and Cleanup

- [ ] 10.1 Update aleo/README.md with deployed program information
- [ ] 10.2 Document actual gas costs in deployment.md
- [ ] 10.3 Add example transaction commands to docs
- [ ] 10.4 Update client/CLAUDE.md with deployed program ID
- [ ] 10.5 Verify all placeholder values replaced with production data
