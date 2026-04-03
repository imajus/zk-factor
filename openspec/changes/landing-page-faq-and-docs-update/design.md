## Context

The landing page currently has no educational FAQ content. Product docs (PRD.md, SPEC.md) describe a simplified invoice flow where factoring happens immediately after minting — no debtor consent or admin oversight. The About and Roadmap pages don't reflect the approval pipeline either.

Current invoice lifecycle: `mint_invoice → authorize_factoring → execute_factoring → create_payment_request → pay_invoice → settle_invoice`. The Invoice record is owned by the creditor and consumed at factoring. No other actors receive records until after factoring is complete.

Aleo's UTXO model constraint: records are private, can only be consumed (not read), and the only way to notify another actor is to output a record they own.

## Goals / Non-Goals

**Goals:**
- Implement FAQ accordion section on the landing page
- Update About.tsx and Roadmap.tsx to reflect the 3-step approval flow
- Document in PRD.md: company details collection, debtor approval, admin due diligence as MVP features
- Document in SPEC.md: new record structures, transitions, IPFS data model, updated state machine — all using a fully-private record system (no public invoice mappings)

**Non-Goals:**
- Implementing the smart contract changes (Leo code) — documentation only
- Implementing new frontend pages for debtor approval or admin review
- Creating the `/docs` user guide pages (broken links noted but out of scope)
- Changing existing transitions or record structures in the deployed contract

## Decisions

### 1. FAQ placement: between Recent Activity and CTA Banner

The landing page sections flow: Hero → Stats → Features → How It Works → Recent Activity → CTA. The FAQ fits naturally before the final CTA as an objection-handling section — visitors who've seen the product pitch can get answers before being asked to connect.

Alternative: After Features or after How It Works. Rejected because the FAQ content is higher-level (about factoring in general, not platform mechanics) and works better as a pre-CTA trust builder.

### 2. Fully-private record system with permission tokens (no public invoice mappings)

Instead of a public `approved_invoices` mapping to gate factoring, each lifecycle step outputs private records to all relevant actors. The admin approval step produces an `InvoiceReady` record owned by the creditor — this acts as a cryptographic permission token that can only exist if the full 3-step approval completed. `authorize_factoring` consumes both `Invoice` + `InvoiceReady`.

Alternative: Public mapping (`approved_invoices: field => bool`). Rejected because it leaks which invoice hashes have been approved, creating a public registry of factored invoices.

### 3. Separate IPFS files for invoice data, creditor info, and debtor info

Three separate JSON files on Pinata private gateway, each with its own CID field in on-chain records. This allows: (a) creditor info to be uploaded at mint time while debtor info is added later at approval, (b) actors to fetch only the data relevant to them, (c) fine-grained access control if needed later.

Alternative: Single combined JSON file. Rejected because debtor info isn't available at mint time — the file would need to be re-uploaded and CID would change.

### 4. `invoice_hash` retained alongside CID fields

`invoice_hash` (Poseidon2 of core business fields) serves as the on-chain linking key across record types and derives the `nonce` field. CIDs are pointers to off-chain data. They serve different purposes — `invoice_hash` is deterministic from business content while CIDs depend on file formatting. Multiple CIDs exist per invoice but only one `invoice_hash`.

### 5. `InvoiceUpdate` record for creditor status notifications

When debtor or admin acts, the creditor receives an `InvoiceUpdate` record with a `status: u8` field. This lets the creditor's dashboard show real-time status without polling any public state. The record type is lightweight (just `invoice_hash` + `status`) to minimize circuit complexity.

Alternative: Creditor checks a public mapping. Rejected per Decision #2. Alternative: No notification — creditor just waits for `InvoiceReady`. Rejected because the creditor needs intermediate status visibility.

## Risks / Trade-offs

**Record proliferation** → Each invoice mint now produces 2 records instead of 1; each approval step produces 2-3 records. This increases on-chain storage and proving costs. Mitigation: history records (`InvoiceDebtorApproval`, `InvoiceAdminApproval`, `InvoiceUpdate`) are lightweight with minimal fields.

**Admin as bottleneck** → Every invoice requires admin approval, creating a centralized chokepoint. Mitigation: documented as MVP constraint; future upgrade path to automated approval rules or multi-admin delegation.

**Debtor must have a wallet** → Debtor approval requires connecting a Shield wallet and calling a transition. Traditional factoring doesn't require debtor participation at this stage. Mitigation: this is a deliberate product decision — debtor confirmation prevents fraudulent invoice submission.

**No rejection flow documented** → Current design only covers the happy path. What happens if debtor or admin rejects? Mitigation: rejection flows are out of scope for this documentation change; can be added as a follow-up.
