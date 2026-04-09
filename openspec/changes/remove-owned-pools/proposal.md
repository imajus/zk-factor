## Why

The owned `FactorPool` system (where a single factor creates a private UTXO record and manually collects contributions) has been superseded by the ownerless pool system, which uses a public on-chain mapping discoverable by all users without trust in a single owner. Keeping the legacy code increases maintenance surface, causes duplicate empty states in the UI, and misleads users and contributors reading the docs.

## What Changes

- **BREAKING** Remove `FactorPool` record and its four transitions (`create_pool`, `contribute_to_pool`, `execute_pool_factoring`, `recover_pool_close`) from the Leo smart contract
- Remove `renderPoolCards()` and all legacy data sources it depends on (`poolRecords`, `directoryOnlyPools`, `ownerPoolRecords`, `ownerDirectoryPools`, `totalVisiblePools`, `poolMetas`, `poolNameById`) from `client/src/pages/Pools.tsx`
- Remove `buildCreatePoolInputs`, `buildContributeToPoolInputs`, `buildExecutePoolFactoringInputs`, `buildRecoverPoolCloseInputs` from `client/src/lib/aleo-factors.ts`
- Remove `client/src/lib/pool-directory.ts` (local-storage directory backing the legacy system)
- Remove all imports of the above from `Pools.tsx` and any other consumers
- Update `guide/docs/factor/pools.md` to document only the ownerless pool flow
- Update `docs/PRD.md` to remove references to `create_pool()`, `contribute_to_pool()`, and `execute_pool_factoring()` in the MVP feature table and "How We Built It" section

## Capabilities

### New Capabilities

_(none — this is a removal-only change)_

### Modified Capabilities

- `pools`: Remove owned-pool creation/contribution/execution paths; retain ownerless pool discovery, contribution, voting, and claims

## Impact

- `aleo/src/main.leo` — delete `FactorPool` record + 4 transitions; rebuild required
- `client/src/pages/Pools.tsx` — significant cleanup (~300 lines removed)
- `client/src/lib/aleo-factors.ts` — remove 4 builder functions
- `client/src/lib/pool-directory.ts` — delete file entirely
- `client/src/lib/mock-data.ts` — remove any legacy pool mock entries
- `guide/docs/factor/pools.md` — rewrite to ownerless-only workflow
- `docs/PRD.md` — update MVP table and implementation description
