## 1. Leo Smart Contract

- [ ] 1.1 Remove `FactorPool` record definition from `aleo/src/main.leo` (~lines 210–216)
- [ ] 1.2 Remove `create_pool` transition from `aleo/src/main.leo` (~lines 618–648)
- [ ] 1.3 Remove `contribute_to_pool` transition from `aleo/src/main.leo` (~lines 649–684)
- [ ] 1.4 Remove `execute_pool_factoring` transition from `aleo/src/main.leo` (~lines 685–731)
- [ ] 1.5 Remove `recover_pool_close` transition from `aleo/src/main.leo` (~lines 734–759)
- [ ] 1.6 Run `leo build` from `aleo/` and confirm it compiles without errors

## 2. Client Library Cleanup

- [ ] 2.1 Remove `buildCreatePoolInputs` from `client/src/lib/aleo-factors.ts`
- [ ] 2.2 Remove `buildContributeToPoolInputs` from `client/src/lib/aleo-factors.ts`
- [ ] 2.3 Remove `buildExecutePoolFactoringInputs` from `client/src/lib/aleo-factors.ts`
- [ ] 2.4 Remove `buildRecoverPoolCloseInputs` from `client/src/lib/aleo-factors.ts`
- [ ] 2.5 Delete `client/src/lib/pool-directory.ts`

## 3. Pools.tsx — Data Pipeline Removal

- [ ] 3.1 Remove import of `listPoolDirectory`, `updatePoolClosed`, `upsertPoolContribution` from `pool-directory`
- [ ] 3.2 Remove import of `buildContributeToPoolInputs`, `buildExecutePoolFactoringInputs`, `buildRecoverPoolCloseInputs` from `aleo-factors`
- [ ] 3.3 Remove `poolRecords` derived state (filter on `FactorPool` records)
- [ ] 3.4 Remove `localPoolEntries`, `poolNameById`, `onChainPoolHashes`, `directoryOnlyPools` derived state
- [ ] 3.5 Remove `ownerPoolRecords`, `ownerDirectoryPools`, `totalVisiblePools` derived state
- [ ] 3.6 Remove the `useEffect` that calls `updatePoolClosed` on pool metas (~lines 570–595)
- [ ] 3.7 Remove the `useEffect` that calls `upsertPoolContribution` on pending contributions (~lines ~610–618)
- [ ] 3.8 Remove `pendingPoolContribution` state and any setter if it has no ownerless usage
- [ ] 3.9 Remove `isContributing`, `executingPoolHash`, `recoveringPoolHash` state variables (confirmed unused by diagnostics)

## 4. Pools.tsx — UI Removal

- [ ] 4.1 Remove `renderPoolCards()` function entirely (~lines 1067–1378)
- [ ] 4.2 Remove the `renderPoolCards("all")` call site and its surrounding `<p>` hint in the Discover tab
- [ ] 4.3 Remove the `"Ownerless Pools (On-Chain)"` label `<p>` tag if it becomes unnecessary (evaluate after step 4.2)
- [ ] 4.4 Remove `poolMetas` state and its population logic if no longer referenced
- [ ] 4.5 Remove unused icon imports (`Users`) and component imports (`CardHeader`, `CardTitle`) flagged by diagnostics

## 5. Verify Build

- [ ] 5.1 Run `npm run build` from `client/` and fix any remaining broken imports or references
- [ ] 5.2 Confirm no TypeScript diagnostics remain in `Pools.tsx` and `aleo-factors.ts`

## 6. Documentation

- [ ] 6.1 Rewrite `guide/docs/factor/pools.md` to describe only the ownerless pool flow (discover → contribute → claim)
- [ ] 6.2 Update `docs/PRD.md` MVP feature table: replace `create_pool()`, `contribute_to_pool()`, `execute_pool_factoring()` entries with ownerless equivalents
- [ ] 6.3 Update `docs/PRD.md` "How We Built It" section to remove owned pool transition names
