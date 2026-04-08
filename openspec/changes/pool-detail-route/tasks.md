## 1. New PoolDetail Page

- [ ] 1.1 Create `client/src/pages/PoolDetail.tsx` with `useParams<{ hash: string }>()` and `useQuery(["all_pools"], fetchAllPools)` to load the pool
- [ ] 1.2 Add "Pool not found" fallback when hash doesn't match any pool
- [ ] 1.3 Render page header: pool name, full hash, status badge (reuse `getPoolStatus` logic)
- [ ] 1.4 Render stats grid: Current Funds, Percent text, Addresses Involved
- [ ] 1.5 Render pending offer block (creditor, debtor, advance rate, advance amount, vote count vs threshold) when `pool.pendingOffer` is non-null
- [ ] 1.6 Render `PoolTimeline` with `layout="horizontal"`
- [ ] 1.7 Render pool configuration card (advance range, min contribution)
- [ ] 1.8 Render inline contribute form (amount input, public balance display, Contribute button) when `!pool.isClosed`; fetch public balance on mount
- [ ] 1.9 Wire contribute button to `pool_contribute` via own `useTransaction`; add validation (min contribution, balance check) and toast feedback
- [ ] 1.10 Render Open Distribution button + permissionless note when `pool.isSettled && pool.isClosed && pool.proceeds === null`; wire to `pool_open_distribution` via same `useTransaction`
- [ ] 1.11 Add back link `← Factor Pools` navigating to `/pools`

## 2. Register Route

- [ ] 2.1 Import `PoolDetail` in `client/src/WalletApp.tsx`
- [ ] 2.2 Add `/pools/:hash` route with `RequireAuth + RequireFactor + AppLayout` guards after the `/pools` route

## 3. Update Pools List Page

- [ ] 3.1 Add `useNavigate` to `client/src/pages/Pools.tsx`
- [ ] 3.2 Replace `openPoolDetails(hash)` card click with `navigate(\`/pools/${hash}\`)`
- [ ] 3.3 Remove Contribute button from pool cards
- [ ] 3.4 Remove Open Distribution button from pool cards
- [ ] 3.5 Remove pool detail `<Dialog>` block and all associated state (`poolDetailOpen`, `selectedPoolHash`, derived `selectedPool`/`selectedStats`/etc.)
- [ ] 3.6 Remove contribute `<Dialog>` block and associated state (`contributeOpen`, `contributePool`, `contributeAmount`, `publicBalance`)
- [ ] 3.7 Remove functions: `openContribute`, `handleContribute`, `handleOpenDistribution`, `openPoolDetails`, `closePoolDetails`
- [ ] 3.8 Remove `pendingDistributionHash` state and its `useEffect` watcher
- [ ] 3.9 Clean up unused imports (`TrendingUp`, `Layers`, `fetchPublicCreditsBalance`, `buildPoolContributeInputs`)

## 4. Verification

- [ ] 4.1 `npm run build` in `client/` passes with no TypeScript errors
- [ ] 4.2 Clicking a pool card in Discover tab navigates to `/pools/<hash>`
- [ ] 4.3 Pool detail page renders correctly with stats, timeline, and actions
- [ ] 4.4 Contribute form validates min contribution and balance, submits transaction
- [ ] 4.5 Open Distribution button appears only when applicable and submits transaction
- [ ] 4.6 Back link returns to `/pools`
- [ ] 4.7 Direct URL `/pools/<hash>` loads correctly
