## Context

The codebase has two pool implementations that coexist:

1. **Legacy owned pools** — `FactorPool` UTXO record in the Leo contract. A single factor creates a private record, collects contributions off-chain via a local-storage directory (`pool-directory.ts`), and executes factoring from their wallet. Discoverable only within the creator's wallet or via a shared browser storage entry.

2. **Ownerless pools** — `create_ownerless_pool` transition stores pool state in a public on-chain mapping, globally discoverable by any user. Voting, contribution, and claim flows are all handled through `pool-chain.ts` and the ownerless sections of `Pools.tsx`.

Both systems render in the same "Discover" tab (`Pools.tsx`), producing duplicate empty states and dead-code paths. The legacy system's `pool-directory.ts` relies on localStorage, which is not shared between users, making "discover all pools" semantically impossible for owned pools.

## Goals / Non-Goals

**Goals:**
- Delete `FactorPool` record and its 4 transitions from `aleo/src/main.leo`
- Delete `buildCreatePoolInputs`, `buildContributeToPoolInputs`, `buildExecutePoolFactoringInputs`, `buildRecoverPoolCloseInputs` from `aleo-factors.ts`
- Delete `client/src/lib/pool-directory.ts` entirely
- Remove `renderPoolCards()` and all its data sources from `Pools.tsx`
- Clean up all now-unused imports, state variables, and effects in `Pools.tsx`
- Update `guide/docs/factor/pools.md` to describe only the ownerless flow
- Update `docs/PRD.md` MVP table and implementation section

**Non-Goals:**
- Removing `open_pool_distribution`, `pool_owners`, `pool_closed`, or other mappings shared with the ownerless system
- Changing the ownerless pool flow in any way
- Migrating or preserving any existing `FactorPool` on-chain records

## Decisions

**Delete transitions from Leo source, not just the frontend**
The `FactorPool` record and its 4 transitions are dead paths — no UI triggers them. Leaving them in the contract wastes circuit budget and misleads future developers. Since this is testnet and no migration of existing records is planned, deletion is correct.

**Delete `pool-directory.ts` entirely rather than keeping it**
The file exists solely to back the legacy pool discover flow via localStorage. No other module uses it. The comment in `pool-chain.ts` line 4 confirms it was already considered replaced: _"Replaces pool-directory.ts (localStorage) with on-chain reads."_ Safe to delete.

**Rewrite the guide page, not just amend it**
`guide/docs/factor/pools.md` describes only the owned-pool workflow (create → contribute → execute). The entire page needs to be rewritten around ownerless pool discovery and contribution.

## Risks / Trade-offs

[Risk] Existing testnet `FactorPool` records become unspendable after the transitions are removed → Acceptable: testnet only, no real funds at stake.

[Risk] `pool-directory.ts` deletion leaves stale localStorage keys in existing browsers → Harmless: stale keys are ignored silently.

[Risk] `Pools.tsx` cleanup removes state that other functions (voting, claims, detail modal) indirectly share → Mitigation: audit `poolMetas`, `pendingPoolContribution`, `contributeInvoiceHash` for ownerless-side usage before deleting.

## Migration Plan

1. Remove Leo transitions and record → `leo build` to verify compilation
2. Remove `pool-directory.ts` and its 3 imports from `Pools.tsx`
3. Remove `renderPoolCards` and its data pipeline from `Pools.tsx`; remove the call site in the Discover tab
4. Remove 4 builder functions from `aleo-factors.ts`; remove their imports from `Pools.tsx`
5. Run `npm run build` in `client/` to surface any remaining broken references
6. Rewrite `guide/docs/factor/pools.md`
7. Update `docs/PRD.md`

No deployment or rollback plan needed — testnet only.

## Open Questions

- Does `pendingPoolContribution` state (used via `upsertPoolContribution`) have any ownerless-side usage, or is it purely legacy? → Check before removing.
- Should `aleo/CLAUDE.md` mention that owned pools have been removed, so future contributors don't attempt to re-add them?
