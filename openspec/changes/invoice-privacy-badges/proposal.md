## Why

The invoice creation form collects sensitive financial data that flows through different parties across the invoice lifecycle, but gives no visual indication of who will see each field. Users entering invoice amounts, debtor addresses, and due dates have no way to understand whether that information stays private or gets shared with factors or debtors.

## What Changes

- New `PrivacyBadge` UI component that displays a colored icon chip with a tooltip explaining who can see a piece of data
- Invoice creation form updated to show a privacy badge inline next to each field label
- New collapsible "Data visibility guide" legend added to the form sidebar

## Capabilities

### New Capabilities

- `privacy-badge`: A reusable indicator component with four levels — `private`, `factor`, `debtor`, `public` — each with a distinct icon, color, and explanatory tooltip

### Modified Capabilities

*(none — no existing spec-level requirements are changing)*

## Impact

- `client/src/components/ui/privacy-badge.tsx` — new file
- `client/src/pages/CreateInvoice.tsx` — label markup updated for 8 fields; sidebar extended with legend card
- No new npm dependencies; uses existing `lucide-react` and shadcn/ui `Tooltip`
