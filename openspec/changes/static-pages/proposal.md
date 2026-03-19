## Why

Footer links to Documentation, Terms, and Privacy currently point to `#` (dead links). The app needs real static pages with actual content to look professional and provide context about the platform, its terms, privacy model, and roadmap.

## What Changes

- Create About page (`/about`) with content from `docs/PRD.md`:
  - What is invoice factoring
  - The double-factoring fraud problem
  - Why Aleo solves it (ZK approach)
  - Technologies used
  - Team/project section (placeholder)
- Create Terms page (`/terms`):
  - Testnet-appropriate terms of service
  - Standard disclaimers: not financial advice, testnet only, no warranty
- Create Privacy page (`/privacy`):
  - What data is on-chain (public): serial numbers, function calls
  - What's private (ZK): invoice amounts, relationships, debtor identity
  - No server-side data collection (client-only app)
  - Wallet data handling
- Create Roadmap page (`/roadmap`) sourced from `docs/ROAD.md`:
  - Phase 1: MVP Launch (Testnet) — current phase, highlighted
  - Phase 2: Enhanced Features
  - Phase 3: Mainnet Launch
  - Phase 4: Enterprise Scale
  - Phase 5: Ecosystem Expansion
  - Visual timeline layout with phase cards

## Capabilities

### New Capabilities
- `about-page`: Public about page explaining invoice factoring, double-factoring fraud, and ZK Factor's approach
- `terms-page`: Terms of service page for testnet product
- `privacy-page`: Privacy policy page covering on-chain/off-chain data model
- `roadmap-page`: Visual roadmap page sourced from docs/ROAD.md with 5 phases

### Modified Capabilities

## Impact

- `client/src/pages/About.tsx` — new file
- `client/src/pages/Terms.tsx` — new file
- `client/src/pages/Privacy.tsx` — new file
- `client/src/pages/Roadmap.tsx` — new file
- All pages use `PublicLayout` from routing-layout-restructure change
