## Why

The current Dashboard page shows only stat cards (mostly displaying "—") and quick action links, while the real data lives on the separate Invoices page. Users must navigate away to see their actual invoices. Merging these into a single page with stats header + card-based invoice grid provides a much more useful at-a-glance view and eliminates an unnecessary navigation hop.

## What Changes

- Rewrite `BusinessDashboard.tsx` to absorb all Invoices.tsx logic:
  - Stats header with 4 dynamic stat cards
  - Tabs: "My Invoices" | "Factored" | "Pending Offers" (all 3 from current Invoices.tsx)
  - Card-based invoice grid instead of table — each card shows hash, amount, due date, status, quick action
  - Preserve all existing actions: `create_payment_request`, `settle_invoice`, `execute_factoring`
  - "Create Invoice" prominent button
- Rewrite `FactorDashboard.tsx`:
  - Stats header with dynamic counts
  - Card grid of FactoredInvoice records with settle button
  - Pending Offers tab (FactoringOffer records)
  - "Browse Marketplace" CTA
- Add role-conditional tweaks to Marketplace (business vs factor wording)
- Update Settings: remove factor registration tab, add link to `/register-factor`, show deregister inline if registered
- Delete `Invoices.tsx` and `Dashboard.tsx` (merged/replaced)

## Capabilities

### New Capabilities
- `business-dashboard`: Unified creditor dashboard with stats + card-based invoice grid and all invoice management actions
- `factor-dashboard`: Unified factor dashboard with portfolio cards, pending offers, and settlement actions

### Modified Capabilities
- `marketplace`: Minor role-conditional wording changes
- `app-settings`: Factor registration removed (moved to dedicated page), deregister shown inline

## Impact

- `client/src/components/dashboard/BusinessDashboard.tsx` — major rewrite
- `client/src/components/dashboard/FactorDashboard.tsx` — major rewrite
- `client/src/pages/Marketplace.tsx` — minor role-conditional tweaks
- `client/src/pages/Settings.tsx` — remove factor tab, simplify
- `client/src/pages/Invoices.tsx` — deleted
- `client/src/pages/Dashboard.tsx` — deleted
