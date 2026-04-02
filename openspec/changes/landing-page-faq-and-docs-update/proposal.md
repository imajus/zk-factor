## Why

The landing page lacks educational content about invoice factoring, leaving visitors without context to understand ZK Factor's value. Additionally, the current product documentation and technical spec describe a simplified flow where invoices can be factored immediately without debtor consent or platform oversight. A 3-step approval process (creditor → debtor → admin) is needed to ensure invoice validity, collect business details from both parties, and enable due diligence before factoring proceeds.

## What Changes

- **Landing page FAQ section**: Add 8-question accordion FAQ between Recent Activity and CTA Banner, adapted to ZK Factor's blockchain-based factoring model
- **3-step invoice approval flow** documented in PRD and SPEC: creditor mints invoice → debtor approves (provides company info) → admin approves for due diligence → invoice becomes factorable
- **Fully-private record system**: Each actor (Creditor, Debtor, Admin) receives private records at each lifecycle stage for dashboard status tracking and history. No public invoice mappings — an `InvoiceReady` permission token record (only producible by admin approval) gates factoring cryptographically
- **IPFS data model**: Invoice data, creditor company info, and debtor company info stored as separate JSON files on Pinata private gateway; on-chain records hold CID fields only
- **About page**: Updated "How It Works" section with new approval transitions
- **Roadmap page**: Debtor approval and admin due diligence added to Phase 2

## Capabilities

### New Capabilities
- `landing-faq`: FAQ accordion section on the landing page with ZK-specific answers about invoice factoring
- `invoice-approval-flow`: 3-step invoice approval pipeline (debtor approval + admin due diligence) documented in PRD and SPEC, with fully-private record system design

### Modified Capabilities

## Impact

- `client/src/pages/Landing.tsx` — new FAQ section (implementation)
- `client/src/pages/About.tsx` — updated How It Works section (implementation)
- `client/src/pages/Roadmap.tsx` — Phase 2 items added (implementation)
- `docs/PRD.md` — new MVP features, updated user flows (documentation)
- `docs/SPEC.md` — new record structures, transitions, state machine, IPFS data model (documentation)
- No new npm dependencies (Accordion component already exists in shadcn/ui)
- No smart contract changes in this change (documentation only for the approval flow)
