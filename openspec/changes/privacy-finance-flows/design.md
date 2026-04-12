## Context

`zk_factor.aleo` exposes multiple finance flows where transfer amounts and participant addresses are visible on-chain. The root cause is the choice of public-balance transfer functions (`transfer_public_as_signer`, `transfer_from_public`) over record-based transfers (`transfer_private`, `transfer_private_to_public`).

**Current problematic flows:**
- `pool_contribute`: pulls from contributor's public credits balance — amount and contributor address are public
- `pay_invoice`: pulls from debtor's public credits balance — debtor identity and payment amount are public
- `pay_pool_invoice`: same as above for pool debtor payments
- `execute_factoring_token`: factor's USDCx public balance is debited and business's public balance is credited — both amounts and addresses are public

**Constraints:**
- Pool escrow is structurally public: multiple contributors collectively own one pool, which maps to a program-owned public `credits` balance. This cannot be changed.
- USDCx private record functions (`transfer_private`, `transfer_private_to_public`) require `[MerkleProof; 2u32]` compliance proofs that cannot be passed in Leo 4.0 cross-program calls. USDCx token pool flows remain public.
- Leo 4.0 `final fn` / `final { }` syntax is already in use — changes must stay within this idiom.

## Goals / Non-Goals

**Goals:**
- Hide pool contribution source funds (consume private credits record instead of public balance)
- Make individual invoice payment by debtor fully private (private record in, private record to factor)
- Make pool invoice payment source private (private record consumed, program public escrow grows)
- Privatize the business's receipt in USDCx factoring (deliver `Token` record instead of public balance credit)

**Non-Goals:**
- Hiding pool escrow total or settlement amounts (structurally public)
- Privatizing USDCx pool contributions or USDCx debtor pool payments (MerkleProof cross-program constraint)
- Changes to ALEO individual factoring advance (already uses `transfer_private` ✓)
- Changes to recourse settlement (already uses `transfer_private` ✓)

## Decisions

### D1: Accept credits record in `pool_contribute` instead of public balance

**Decision:** Add `payment: credits.aleo::credits` parameter. Replace `credits.aleo::transfer_public_as_signer(program_addr, contribution)` with a call to `credits.aleo::transfer_private_to_public(payment, program_addr, contribution)`.

**Rationale:** `transfer_private_to_public` consumes the caller's private record and deposits into the program's public balance. The contributor's source of funds is hidden; only the aggregate pool balance change is public. This is the maximum achievable privacy given that pool escrow must be public.

**Alternative considered:** Keep public balance transfer, add ZK proof of contribution source. Rejected — unnecessary complexity; the record model already provides the privacy guarantee.

### D2: Accept credits record in `pay_invoice`; use `transfer_private`

**Decision:** Add `payment: credits.aleo::credits` parameter. Replace `credits.aleo::transfer_public_as_signer(factor, notice.amount)` with `credits.aleo::transfer_private(payment, factor, notice.amount)`. Return the factor's received record and change record.

**Rationale:** `transfer_private` is fully private — both debit and credit are encrypted records. Debtor identity and payment amount are completely hidden. This is the optimal outcome for individual invoice payment.

**Alternative considered:** Keep `transfer_public_as_signer` for UX simplicity (no record needed). Rejected — debtor payment privacy is a core promise of the platform.

### D3: Accept credits record in `pay_pool_invoice`; use `transfer_private_to_public`

**Decision:** Same as D1 pattern. Add `payment: credits.aleo::credits`. Replace `transfer_public_as_signer` with `transfer_private_to_public`. Pool escrow still grows publicly (unavoidable).

**Rationale:** Debtor's payment source is hidden; the pool's public balance increase is the minimum required disclosure.

### D4: Use `transfer_from_public_to_private` in `execute_factoring_token`

**Decision:** Replace `test_usdcx_stablecoin.aleo::transfer_from_public(self.caller, offer.original_creditor, advance_amount as u128)` with `test_usdcx_stablecoin.aleo::transfer_from_public_to_private(self.caller, offer.original_creditor, advance_amount as u128)`. Update return signature to include `ComplianceRecord` and `Token` outputs.

**Rationale:** `transfer_from_public_to_private` delivers the business a private `Token` record rather than crediting a public balance. The factor's public USDCx balance deduction remains visible (unavoidable without MerkleProof-based `transfer_private`), but the business's receipt is now private.

**Alternative considered:** Use USDCx `transfer_private` for full privacy. Rejected — requires `[MerkleProof; 2u32]` as a cross-program call parameter, which Leo 4.0 does not support.

## Risks / Trade-offs

- **Breaking signature changes** → Callers (Shield wallet, client pages) must supply unspent credits records. Users with only public balance must first call `credits.aleo::transfer_public_to_private` to obtain a record. Client UI must guide this flow.
- **Record availability lag** → Shield wallet sync may not show fresh unspent records immediately. Client must handle the async record discovery case gracefully.
- **Pool escrow amounts remain public** → The aggregate pool size and settlement amounts are visible on-chain. Contribution source is hidden but pool metadata is not. This is a known and documented limitation.
- **USDCx pool flows stay public** → `pool_contribute_token` and `pay_pool_invoice_token` are not improved. Users expecting full USDCx privacy will be disappointed. Mitigate by documenting this limitation clearly in the UI.

## Migration Plan

1. Update `aleo/src/main.leo` — four transitions modified
2. `leo build` to verify compilation
3. `leo test` — update test inputs for changed signatures
4. Re-deploy program (breaking changes require new deployment)
5. Update client input builders and pages to pass records
6. Add UI hint for users who need to convert public balance to private record before paying

## Open Questions

- Does Shield wallet expose a convenient way to select a specific unspent credits record as input, or does the UI need to auto-select the largest unspent record?
- Should `pay_invoice` return the change record to the debtor, or split exact amount before calling? (Safest: let `transfer_private` handle the split and return change.)
