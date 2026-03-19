## Why

Unauthenticated visitors currently see only a wallet-connect card with no information about what ZK Factor does. A public landing page with platform stats, feature explanations, and a how-it-works flow will help visitors understand the product before connecting their wallet.

## What Changes

- Create `Landing.tsx` at `/` route with sections:
  - Hero: headline, value prop subtitle, Connect Wallet CTA + Learn More scroll link
  - Platform stats: mock data cards (Total Invoices Factored, Total Volume, Active Factors, Avg Settlement Time)
  - Features: 3 cards (ZK Privacy, Anti-Double-Factor, Instant Settlement) with PRD descriptions
  - How It Works: 3-step flow (Create Invoice → Factor Invoice → Settle Payment)
  - Recent activity: mock transaction log showing platform activity
  - Footer: links to About, Terms, Privacy, Roadmap, "Built on Aleo" branding
- Create `client/src/lib/mock-data.ts` with platform stats and activity entries
- Update footer links in AppLayout to point to real routes

## Capabilities

### New Capabilities
- `landing-page`: Public landing page with hero, platform stats, features, how-it-works, and activity feed
- `mock-platform-data`: Mock data module for landing page stats and activity (to be replaced with real on-chain data later)

### Modified Capabilities

## Impact

- `client/src/pages/Landing.tsx` — new file
- `client/src/lib/mock-data.ts` — new file
- `client/src/components/layout/AppLayout.tsx` — footer link updates
- Uses `PublicLayout` from routing-layout-restructure change
