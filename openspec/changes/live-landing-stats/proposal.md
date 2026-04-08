## Why

The Landing page shows hardcoded mock statistics (1,247 invoices, $84.3M volume, 38 factors) and fake transaction activity. This undermines trust — the platform's core value proposition is cryptographic verifiability, yet its own metrics are fabricated. Real on-chain data is available via public mappings (`protocol_stats`, `active_factors`, `factor_addresses`) but the contract is missing a volume counter for stablecoin invoices, and the frontend doesn't fetch any of it.

## What Changes

- **Add USDCx volume counter** to the Leo smart contract (`protocol_stats[3u8]`), incremented only in the stablecoin factoring path (`finalize_exec_factoring_token`)
- **Create lightweight data-fetching layer** using raw `fetch()` against the Aleo explorer REST API — no `@provablehq/sdk` dependency to keep the landing page bundle WASM-free
- **Replace all 4 stat cards** with real on-chain data (invoices factored, total USDCx volume, registered factors) plus one sensible hardcoded metric (avg settlement time)
- **Replace fake "Recent Activity" section** with a **Recent Factor Registrations** list showing public factor data (address, advance rate range, invoices factored, registration date) fetched from on-chain mappings
- **Remove unused mock data** (`platformStats`, `recentActivity` from `mock-data.ts`)

## Capabilities

### New Capabilities
- `protocol-volume-counter`: On-chain USDCx volume tracking via `protocol_stats[3u8]` in the Leo contract
- `landing-live-stats`: React Query hooks and raw-fetch data layer for landing page statistics
- `landing-factor-list`: Recent factor registrations display on the landing page

### Modified Capabilities

## Impact

- **`aleo/src/main.leo`**: Modified finalize function signature for `finalize_exec_factoring_token` (adds `amount` param + 2 mapping writes)
- **`client/src/pages/Landing.tsx`**: Major rewrite of stats section and activity section
- **`client/src/lib/mock-data.ts`**: Exports removed or file deleted
- **New files**: `client/src/lib/aleo-protocol.ts`, `client/src/hooks/use-protocol-stats.ts`, `client/src/hooks/use-recent-factors.ts`
- **No API/dependency changes**: Uses existing Aleo explorer REST API, existing React Query setup
