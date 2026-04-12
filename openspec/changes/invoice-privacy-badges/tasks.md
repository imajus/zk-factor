## 1. PrivacyBadge Component

- [ ] 1.1 Create `client/src/components/ui/privacy-badge.tsx` with `PrivacyLevel` type and `PrivacyBadgeProps` interface
- [ ] 1.2 Implement icon + color chip mapping: Lock/amber (private), Briefcase/violet (factor), UserCheck/sky (debtor), Globe/slate (public)
- [ ] 1.3 Wrap each chip in a `Tooltip` with prose explanation text
- [ ] 1.4 Add `sr-only` span inside each chip for screen reader accessibility
- [ ] 1.5 Normalize `level` prop to array so single and multi-level usage share one render path

## 2. Invoice Form — Field Labels

- [ ] 2.1 Add `PrivacyBadge` import to `CreateInvoice.tsx`
- [ ] 2.2 Add `ShieldCheck` and `ChevronDown` to the existing `lucide-react` import
- [ ] 2.3 Wrap Invoice Number label in `flex items-center gap-1.5` and add `<PrivacyBadge level="private" />`
- [ ] 2.4 Wrap Description label and add `<PrivacyBadge level="private" />`
- [ ] 2.5 Wrap Debtor Address label and add `<PrivacyBadge level={['factor', 'debtor']} />`
- [ ] 2.6 Wrap Payment Currency label and add `<PrivacyBadge level="factor" />`
- [ ] 2.7 Wrap Invoice Amount label and add `<PrivacyBadge level={['factor', 'debtor']} />`
- [ ] 2.8 Wrap Due Date label and add `<PrivacyBadge level="factor" />`
- [ ] 2.9 Add `<PrivacyBadge level="factor" />` inline in the document upload section description
- [ ] 2.10 Wrap Internal Notes label and add `<PrivacyBadge level="private" />`

## 3. Data Visibility Legend

- [ ] 3.1 Add a `Collapsible` Card to the form sidebar (between Invoice Preview and submit buttons)
- [ ] 3.2 Implement trigger row with `ShieldCheck` icon and "Data visibility guide" label
- [ ] 3.3 Render all four levels in the legend body: icon + level name + one-sentence description
- [ ] 3.4 Set legend collapsed by default
