## 1. New PoolDetail Page

- [x] 1.1 Create `client/src/pages/PoolDetail.tsx` with `useParams<{ hash: string }>()` and `useQuery(["all_pools"], fetchAllPools)` to load the pool
- [x] 1.2 Add "Pool not found" fallback when hash doesn't match any pool
- [x] 1.3 Render page header: pool name, full hash, status badge (reuse `getPoolStatus` logic)
- [x] 1.4 Render stats grid: Current Funds, Percent text, Addresses Involved
- [x] 1.5 Render pending offer block (creditor, debtor, advance rate, advance amount, vote count vs threshold) when `pool.pendingOffer` is non-null
- [x] 1.6 Render `PoolTimeline` with `layout="horizontal"`
- [x] 1.7 Render pool configuration card (advance range, min contribution)
- [x] 1.8 Render inline contribute form (amount input, public balance display, Contribute button) when `!pool.isClosed`; fetch public balance on mount
- [x] 1.9 Wire contribute button to `pool_contribute` via own `useTransaction`; add validation (min contribution, balance check) and toast feedback
- [x] 1.10 Render Open Distribution button + permissionless note when `pool.isSettled && pool.isClosed && pool.proceeds === null`; wire to `pool_open_distribution` via same `useTransaction`
- [x] 1.11 Add back link `← Factor Pools` navigating to `/pools`

## 2. Register Route

- [x] 2.1 Import `PoolDetail` in `client/src/WalletApp.tsx`
- [x] 2.2 Add `/pools/:hash` route with `RequireAuth + RequireFactor + AppLayout` guards after the `/pools` route

## 3. Update Pools List Page

- [x] 3.1 Add `useNavigate` to `client/src/pages/Pools.tsx`
- [x] 3.2 Replace `openPoolDetails(hash)` card click with `navigate(\`/pools/${hash}\`)`
- [x] 3.3 Remove Contribute button from pool cards
- [x] 3.4 Remove Open Distribution button from pool cards
- [x] 3.5 Remove pool detail `<Dialog>` block and all associated state (`poolDetailOpen`, `selectedPoolHash`, derived `selectedPool`/`selectedStats`/etc.)
- [x] 3.6 Remove contribute `<Dialog>` block and associated state (`contributeOpen`, `contributePool`, `contributeAmount`, `publicBalance`)
- [x] 3.7 Remove functions: `openContribute`, `handleContribute`, `handleOpenDistribution`, `openPoolDetails`, `closePoolDetails`
- [x] 3.8 Remove `pendingDistributionHash` state and its `useEffect` watcher
- [x] 3.9 Clean up unused imports (`TrendingUp`, `Layers`, `fetchPublicCreditsBalance`, `buildPoolContributeInputs`)

## 4. Verification

- [x] 4.1 `npm run build` in `client/` passes with no TypeScript errors
- [x] 4.2 Clicking a pool card in Discover tab navigates to `/pools/<hash>`
- [x] 4.3 Pool detail page renders correctly with stats, timeline, and actions
- [x] 4.4 Contribute form validates min contribution and balance, submits transaction
- [x] 4.5 Open Distribution button appears only when applicable and submits transaction
- [x] 4.6 Back link returns to `/pools`
- [x] 4.7 Direct URL `/pools/<hash>` loads correctly
