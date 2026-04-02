## ADDED Requirements

### Requirement: 3-step invoice approval documented in PRD
The PRD SHALL document a 3-step invoice approval process as an MVP feature: (1) creditor mints invoice with company info, (2) debtor approves and provides their company info, (3) platform admin approves after due diligence. The invoice SHALL NOT be factorable until all three steps are completed.

#### Scenario: PRD MVP features table includes approval steps
- **WHEN** a reader reviews the MVP Features section of PRD.md
- **THEN** three new features are listed: Company Details Collection, Debtor Invoice Approval, and Admin Due Diligence, with their Aleo implementation approach

#### Scenario: PRD user flow reflects 3-step process
- **WHEN** a reader reviews User Flow 1 in PRD.md
- **THEN** the flow shows: mint_invoice → approve_invoice (debtor) → admin_approve_invoice → authorize_factoring → execute_factoring → settlement

### Requirement: Fully-private record system documented in SPEC
The SPEC SHALL document a record system where every actor (Creditor, Debtor, Admin) receives private records at each invoice lifecycle stage. No public mappings SHALL be used for invoice approval status. An `InvoiceReady` permission token record, producible only by the admin approval transition, SHALL gate factoring.

#### Scenario: SPEC defines all new record structures
- **WHEN** a reader reviews the Data Models section of SPEC.md
- **THEN** the following records are defined: Invoice (updated with CID fields), InvoiceNotice, InvoiceUpdate, InvoiceDebtorApproval, InvoiceAdminReview, InvoiceReady, InvoiceAdminApproval

#### Scenario: SPEC defines new transitions
- **WHEN** a reader reviews the Program Transitions section of SPEC.md
- **THEN** two new transitions are documented: `approve_invoice` (debtor consumes InvoiceNotice, outputs InvoiceUpdate + InvoiceDebtorApproval + InvoiceAdminReview) and `admin_approve_invoice` (admin consumes InvoiceAdminReview, outputs InvoiceUpdate + InvoiceReady + InvoiceAdminApproval)

#### Scenario: SPEC state machine is updated
- **WHEN** a reader reviews the Invoice Lifecycle State Machine in SPEC.md
- **THEN** it shows: PendingDebtor → PendingAdmin → Ready → OfferSent → Factored → NoticeDelivered → Settled

### Requirement: IPFS data model documented in SPEC
The SPEC SHALL document that invoice-related data is stored as separate JSON files on IPFS via Pinata private gateway: one for invoice data (`invoice_cid`), one for creditor company info (`creditor_info_cid`), and one for debtor company info (`debtor_info_cid`). On-chain records SHALL hold only CID field values.

#### Scenario: SPEC describes IPFS data model
- **WHEN** a reader reviews the SPEC data model documentation
- **THEN** three separate IPFS JSON files are described with their contents and corresponding on-chain CID fields

### Requirement: `authorize_factoring` requires InvoiceReady token
The SPEC SHALL document that `authorize_factoring` consumes both the `Invoice` record and the `InvoiceReady` record. The `InvoiceReady` record's `invoice_hash` MUST match the `Invoice` record's `invoice_hash`.

#### Scenario: SPEC documents updated authorize_factoring inputs
- **WHEN** a reader reviews the authorize_factoring transition in SPEC.md
- **THEN** it shows two required inputs: Invoice (consumed) and InvoiceReady (consumed), with an assertion that both invoice_hash fields match

### Requirement: About page reflects approval flow
The About page SHALL update its "How It Works" section to include the new approval transitions (`approve_invoice`, `admin_approve_invoice`) alongside the existing 6 function cards.

#### Scenario: About page shows approval steps
- **WHEN** a visitor views the About page
- **THEN** the "How It Works" section displays cards for `approve_invoice` and `admin_approve_invoice` in addition to existing transitions

### Requirement: Roadmap reflects approval features
The Roadmap page SHALL list debtor invoice approval, admin due diligence, and company details collection (IPFS) as completed items in Phase 2 (Enhanced Features).

#### Scenario: Roadmap Phase 2 includes approval items
- **WHEN** a visitor views the Roadmap page
- **THEN** Phase 2 shows "Debtor Invoice Approval", "Admin Due Diligence", and "Company Details Collection (IPFS)" as completed items
