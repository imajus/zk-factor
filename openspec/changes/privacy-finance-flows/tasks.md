## 1. Leo Contract — `pool_contribute`

- [ ] 1.1 Add `payment: credits.aleo::credits` parameter to `pool_contribute` signature
- [ ] 1.2 Replace `credits.aleo::transfer_public_as_signer(program_addr, contribution)` with `credits.aleo::transfer_private_to_public(payment, program_addr, contribution)` returning `(credits.aleo::credits, Final)`
- [ ] 1.3 Remove the now-unused `let f: Final = ...` binding and update the `final { }` block to call the new Final returned by `transfer_private_to_public`

## 2. Leo Contract — `pay_invoice`

- [ ] 2.1 Add `payment: credits.aleo::credits` parameter to `pay_invoice` signature
- [ ] 2.2 Replace `credits.aleo::transfer_public_as_signer(factor, notice.amount)` with `credits.aleo::transfer_private(payment, factor, notice.amount)` returning `(credits.aleo::credits, credits.aleo::credits)`
- [ ] 2.3 Update return signature to include factor-payment record and change record
- [ ] 2.4 Remove `f_pay.run()` from the `final { }` block (transfer_private has no Final)

## 3. Leo Contract — `pay_pool_invoice`

- [ ] 3.1 Add `payment: credits.aleo::credits` parameter to `pay_pool_invoice` signature
- [ ] 3.2 Replace `credits.aleo::transfer_public_as_signer(program_addr, notice.amount)` with `credits.aleo::transfer_private_to_public(payment, program_addr, notice.amount)` returning `(credits.aleo::credits, Final)`
- [ ] 3.3 Update `final { }` block to call the new Final from `transfer_private_to_public`

## 4. Leo Contract — `execute_factoring_token`

- [ ] 4.1 Replace `test_usdcx_stablecoin.aleo::transfer_from_public(self.caller, offer.original_creditor, advance_amount as u128)` with `test_usdcx_stablecoin.aleo::transfer_from_public_to_private(self.caller, offer.original_creditor, advance_amount as u128)`
- [ ] 4.2 Destructure the three outputs: `(compliance_record, token_record, transfer_final)`
- [ ] 4.3 Add `test_usdcx_stablecoin.aleo::ComplianceRecord` and `test_usdcx_stablecoin.aleo::Token` to the transition return signature
- [ ] 4.4 Update the `return` statement to include both new record outputs

## 5. Leo Contract — Build & Test

- [ ] 5.1 Run `leo build` from `aleo/` and fix any compilation errors
- [ ] 5.2 Update test scripts in `aleo/` to supply credits record inputs for changed transitions
- [ ] 5.3 Run `leo test` and confirm all tests pass

## 6. Client — `pay_invoice` (`Pay.tsx`)

- [ ] 6.1 Fetch unspent `credits.aleo::credits` records for the debtor via `requestRecords`
- [ ] 6.2 Select a record with value ≥ invoice amount (largest unspent, or prompt user)
- [ ] 6.3 Pass `recordPlaintext` of the selected record as an additional input to the `pay_invoice` transaction
- [ ] 6.4 Handle the returned change record (display or store for future use)

## 7. Client — `pool_contribute` (`Pool.tsx`)

- [ ] 7.1 Fetch unspent `credits.aleo::credits` records for the contributor via `requestRecords`
- [ ] 7.2 Select a record with value ≥ contribution amount
- [ ] 7.3 Pass `recordPlaintext` as additional input to the `pool_contribute` transaction call
- [ ] 7.4 Add UI hint if user has no unspent credits records (guide them to convert public balance)

## 8. Client — `pay_pool_invoice` (`Pool.tsx`)

- [ ] 8.1 Fetch unspent `credits.aleo::credits` records for the debtor
- [ ] 8.2 Pass selected record's `recordPlaintext` as input to `pay_pool_invoice`

## 9. Client — `execute_factoring_token` (`Marketplace.tsx`)

- [ ] 9.1 Update the transaction call to expect `ComplianceRecord` and `Token` in the outputs
- [ ] 9.2 Display a toast or confirmation noting that the advance was delivered as a private token record

## 10. Client — Input Builders (`pool-chain.ts`)

- [ ] 10.1 Update `buildPoolContributeInputs` to accept a `creditsRecordPlaintext: string` parameter and include it in the returned inputs array
- [ ] 10.2 Update any other input-builder functions affected by signature changes
