## Context

The invoice creation form (`CreateInvoice.tsx`) uses direct `useState` management (not React Hook Form). Labels are plain `<Label>` elements paired with shadcn/ui inputs. The project already has a `Tooltip` / `TooltipContent` / `TooltipTrigger` system from shadcn/ui, and `lucide-react` is available. No existing privacy indicator pattern exists in the codebase.

## Goals / Non-Goals

**Goals:**
- Surface per-field audience information at the point of data entry
- Work without new npm dependencies
- Be accessible (not color-only)
- Be reusable across any future form

**Non-Goals:**
- Changing the actual on-chain privacy model
- Adding privacy controls or toggles (read-only indicators only)
- Applying to forms outside the invoice creation flow in this change

## Decisions

**Icon + color chip, not a plain colored circle**
A plain circle communicates only via color, which fails WCAG 1.4.1 for colorblind users. Adding a Lucide icon (Lock / Briefcase / UserCheck / Globe) gives a second semantic channel. A small `rounded-full p-0.5` chip wrapping the icon matches the visual weight of existing `StatusBadge` components.

**Tooltip per badge, not a static label**
Non-technical users need prose context ("Visible to the factor you offer this invoice to, via the FactoringOffer record"). A tooltip keeps the form compact while making the explanation available on demand.

**Multiple levels → separate badges side-by-side**
`amount` and `debtorAddress` reach two parties. Two small badges in a `flex gap-1` wrapper is more legible than a merged indicator with ambiguous combined coloring.

**Static `['factor', 'debtor']` for debtor address**
The `makeDebtorPublic` field has been removed from the form. No dynamic badge state is needed.

**Collapsible legend in the sidebar**
A "Data visibility guide" Collapsible card between Invoice Preview and the submit buttons gives first-time users a reference key without cluttering the form column.

## Risks / Trade-offs

[Tooltip discoverability] Users may not hover to read tooltips → Mitigation: the legend provides the same information persistently in the sidebar.

[Label markup changes] Wrapping labels in a flex div could affect spacing if Tailwind purge misses new classes → Mitigation: classes used are common utilities already in the bundle.
