## 1. Leo Smart Contract

- [x] 1.1 Remove `FactorPool` record definition from `aleo/src/main.leo` (~lines 210–216)
- [x] 1.2 Remove `create_pool` transition from `aleo/src/main.leo` (~lines 618–648)
- [x] 1.3 Remove `contribute_to_pool` transition from `aleo/src/main.leo` (~lines 649–684)
- [x] 1.4 Remove `execute_pool_factoring` transition from `aleo/src/main.leo` (~lines 685–731)
- [x] 1.5 Remove `recover_pool_close` transition from `aleo/src/main.leo` (~lines 734–759)
- [x] 1.6 Run `leo build` from `aleo/` and confirm it compiles without errors

## 2. Client Library Cleanup

- [x] 2.1 Remove `buildCreatePoolInputs` from `client/src/lib/aleo-factors.ts`
- [x] 2.2 Remove `buildContributeToPoolInputs` from `client/src/lib/aleo-factors.ts`
- [x] 2.3 Remove `buildExecutePoolFactoringInputs` from `client/src/lib/aleo-factors.ts`
- [x] 2.4 Remove `buildRecoverPoolCloseInputs` from `client/src/lib/aleo-factors.ts`
- [x] 2.5 Delete `client/src/lib/pool-directory.ts`

## 3. Pools.tsx — Data Pipeline Removal

- [x] 3.1 Remove import of `listPoolDirectory`, `updatePoolClosed`, `upsertPoolContribution` from `pool-directory`
- [x] 3.2 Remove import of `buildContributeToPoolInputs`, `buildExecutePoolFactoringInputs`, `buildRecoverPoolCloseInputs` from `aleo-factors`
- [x] 3.3 Remove `poolRecords` derived state (filter on `FactorPool` records)
- [x] 3.4 Remove `localPoolEntries`, `poolNameById`, `onChainPoolHashes`, `directoryOnlyPools` derived state
- [x] 3.5 Remove `ownerPoolRecords`, `ownerDirectoryPools`, `totalVisiblePools` derived state
- [x] 3.6 Remove the `useEffect` that calls `updatePoolClosed` on pool metas (~lines 570–595)
- [x] 3.7 Remove the `useEffect` that calls `upsertPoolContribution` on pending contributions (~lines ~610–618)
- [x] 3.8 Remove `pendingPoolContribution` state and any setter if it has no ownerless usage
- [x] 3.9 Remove `isContributing`, `executingPoolHash`, `recoveringPoolHash` state variables (confirmed unused by diagnostics)

## 4. Pools.tsx — UI Removal

- [x] 4.1 Remove `renderPoolCards()` function entirely (~lines 1067–1378) — old owned-pool version removed; ownerless version retained
- [x] 4.2 Remove the `renderPoolCards("all")` call site and its surrounding `<p>` hint in the Discover tab
- [x] 4.3 Remove the `"Ownerless Pools (On-Chain)"` label `<p>` tag if it becomes unnecessary (evaluate after step 4.2)
- [x] 4.4 Remove `poolMetas` state and its population logic if no longer referenced
- [x] 4.5 Remove unused icon imports (`Users`) and component imports (`CardHeader`, `CardTitle`) flagged by diagnostics

## 5. Verify Build

- [x] 5.1 Run `npm run build` from `client/` and fix any remaining broken imports or references
- [x] 5.2 Confirm no TypeScript diagnostics remain in `Pools.tsx` and `aleo-factors.ts`

## 6. Documentation

- [x] 6.1 Rewrite `guide/docs/factor/pools.md` to describe only the ownerless pool flow (discover → contribute → claim)
- [x] 6.2 Update `docs/PRD.md` MVP feature table: replace `create_pool()`, `contribute_to_pool()`, `execute_pool_factoring()` entries with ownerless equivalents
- [x] 6.3 Update `docs/PRD.md` "How We Built It" section to remove owned pool transition names
