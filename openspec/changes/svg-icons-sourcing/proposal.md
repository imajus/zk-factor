## Why

The frontend redesign requires distinctive role-specific icons for the role selection page, landing page features, and empty states. Lucide React (already installed) covers standard UI icons but lacks larger illustrative SVGs needed for these contexts. Custom SVG components are needed before the role selection and landing pages can be built.

## What Changes

- Create `client/src/components/icons/RoleIcons.tsx` with large illustrative SVG components for Creditor and Factor roles
- Create `client/src/components/icons/FeatureIcons.tsx` with feature illustration SVGs (ZK privacy, anti-double-factor, instant settlement)
- Source SVGs from Lucide React where possible; create custom inline SVGs for larger illustrations
- Icons needed: Creditor role (invoice/document themed), Factor role (investment/briefcase themed), landing features (shield, lightning, chain-link), empty states

## Capabilities

### New Capabilities
- `role-icons`: SVG icon components for role selection and role-specific UI elements
- `feature-icons`: SVG icon components for landing page feature illustrations and empty states

### Modified Capabilities

## Impact

- New files in `client/src/components/icons/`
- No existing code modified — these are new assets consumed by upcoming pages
