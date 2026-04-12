## 1. PrivacyBadge Component

- [x] 1.1 Create `client/src/components/ui/privacy-badge.tsx` with `PrivacyLevel` type and `PrivacyBadgeProps` interface
- [x] 1.2 Implement icon + color chip mapping: Lock/amber (private), Briefcase/violet (factor), UserCheck/sky (debtor), Globe/slate (public)
- [x] 1.3 Wrap each chip in a `Tooltip` with prose explanation text

## 2. Invoice Form — Field Labels

- [x] 2.1 Add `PrivacyBadge` import to `CreateInvoice.tsx`
- [x] 2.2 Add `ShieldCheck` and `ChevronDown` to the existing `lucide-react` import
- [x] 2.3 Wrap Invoice Number label in `flex items-center gap-1.5` and add `<PrivacyBadge level="private" />`
- [x] 2.4 Wrap Description label and add `<PrivacyBadge level="private" />`
- [x] 2.5 Wrap Debtor Address label and add `<PrivacyBadge level={['factor', 'debtor']} />`
- [x] 2.6 Wrap Payment Currency label and add `<PrivacyBadge level="factor" />`
- [x] 2.7 Wrap Invoice Amount label and add `<PrivacyBadge level={['factor', 'debtor']} />`
- [x] 2.8 Wrap Due Date label and add `<PrivacyBadge level="factor" />`
- [x] 2.9 Add `<PrivacyBadge level="factor" />` inline in the document upload section description
- [x] 2.10 Internal Notes field removed; N/A

## 3. Data Visibility Legend

- [x] 3.1 Add a `Collapsible` Card to the form sidebar (between Invoice Preview and submit buttons)
- [x] 3.2 Implement trigger row with `ShieldCheck` icon and "Data visibility guide" label
- [x] 3.3 Render all four levels in the legend body: icon + level name + one-sentence description
- [x] 3.4 Set legend collapsed by default
