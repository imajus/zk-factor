## 1. Landing Page FAQ Section

- [ ] 1.1 Add FAQ data array with 8 questions and ZK-Factor-adapted answers to `Landing.tsx`
- [ ] 1.2 Import Accordion components from `@/components/ui/accordion` and add FAQ section between Recent Activity and CTA Banner
- [ ] 1.3 Style FAQ section with `container py-24 space-y-12`, centered heading, `.reveal` scroll animations with staggered delays
- [ ] 1.4 Verify FAQ renders correctly and accordion expand/collapse works (`npm run build` + visual check)

## 2. About Page Updates

- [ ] 2.1 Add `approve_invoice` and `admin_approve_invoice` cards to the "How It Works" section in `About.tsx`
- [ ] 2.2 Update the invoice factoring example flow to mention debtor approval step

## 3. Roadmap Page Updates

- [ ] 3.1 Add "Debtor Invoice Approval", "Admin Due Diligence", and "Company Details Collection (IPFS)" as completed items in Phase 2 of `Roadmap.tsx`

## 4. PRD.md Documentation

- [ ] 4.1 Add Company Details Collection, Debtor Invoice Approval, and Admin Due Diligence rows to the MVP Features (Wave 1-2) table
- [ ] 4.2 Update User Flow 1 diagram to include `approve_invoice` and `admin_approve_invoice` steps before `authorize_factoring`
- [ ] 4.3 Add new User Flow for the 3-step approval pipeline (creditor → debtor → admin)

## 5. SPEC.md Documentation

- [ ] 5.1 Add IPFS Data Model section describing three separate JSON files (invoice data, creditor info, debtor info) with CID fields
- [ ] 5.2 Update Invoice record structure to include `invoice_cid` and `creditor_info_cid` fields
- [ ] 5.3 Add new record definitions: InvoiceNotice, InvoiceUpdate, InvoiceDebtorApproval, InvoiceAdminReview, InvoiceReady, InvoiceAdminApproval
- [ ] 5.4 Add `approve_invoice` transition specification (inputs, preconditions, postconditions, outputs to all 3 actors)
- [ ] 5.5 Add `admin_approve_invoice` transition specification (inputs, preconditions, postconditions, outputs)
- [ ] 5.6 Update `authorize_factoring` specification to require Invoice + InvoiceReady inputs with matching invoice_hash
- [ ] 5.7 Update Invoice Lifecycle State Machine diagram to include PendingDebtor, PendingAdmin, and Ready states
- [ ] 5.8 Update Privacy Architecture table with new record visibility entries

## 6. Verification

- [ ] 6.1 Run `npm run build` in `client/` — no build errors
- [ ] 6.2 Review PRD.md and SPEC.md for mutual consistency (state machine, record names, transition names match)
