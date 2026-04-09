## Why

Pool details are shown in a modal dialog that appears over the pools list, limiting space and making the URL non-shareable. Action buttons (Contribute, Open Distribution) are buried on the pool cards rather than in the detail context where users need them.

## What Changes

- Add new route `/pools/:hash` that renders a dedicated pool detail page
- Pool cards become navigation links — clicking navigates to `/pools/:hash`
- Remove the pool detail Dialog from `Pools.tsx`
- Remove Contribute button from pool cards; move inline contribute form to detail page
- Remove Open Distribution button from pool cards; move to detail page
- Remove the separate Contribute Dialog from `Pools.tsx`
- Register `/pools/:hash` route in `WalletApp.tsx` with same `RequireAuth + RequireFactor` guards

## Capabilities

### New Capabilities
- `pool-detail-page`: Dedicated `/pools/:hash` route showing pool stats, timeline, pending offer, contribute form, and open-distribution action

### Modified Capabilities
- (none — no existing spec files)

## Impact

- `client/src/pages/Pools.tsx` — card click handler, removed dialogs and state
- `client/src/pages/PoolDetail.tsx` — new file
- `client/src/WalletApp.tsx` — new route entry
