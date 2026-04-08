## 1. Smart Contract — Volume Counter

- [ ] 1.1 Add `amount: u64` parameter to `finalize_exec_factoring_token` in `aleo/src/main.leo` and pass `offer.amount` from the transition call site
- [ ] 1.2 Add `protocol_stats[3u8]` volume increment logic (get_or_use + set) in `finalize_exec_factoring_token`
- [ ] 1.3 Run `leo build` to verify contract compiles
- [ ] 1.4 Run `leo test` to verify existing tests pass

## 2. Frontend — Data Fetching Layer

- [ ] 2.1 Create `client/src/lib/aleo-protocol.ts` with `fetchMappingValue()` using raw `fetch()` against explorer REST API (no `@provablehq/sdk`)
- [ ] 2.2 Add `fetchProtocolStats()` in `aleo-protocol.ts` — parallel fetch of `protocol_stats[1u8]`, `protocol_stats[2u8]`, `protocol_stats[3u8]`, and `factor_addresses__len__[false]`
- [ ] 2.3 Add `parseMappingField()` helper in `aleo-protocol.ts` for parsing Leo plaintext structs
- [ ] 2.4 Add `fetchRecentFactors(limit)` in `aleo-protocol.ts` — read last N factor addresses and their `active_factors` entries

## 3. Frontend — React Query Hooks

- [ ] 3.1 Create `client/src/hooks/use-protocol-stats.ts` with `useProtocolStats()` hook (staleTime/refetchInterval: 120s)
- [ ] 3.2 Create `client/src/hooks/use-recent-factors.ts` with `useRecentFactors(limit)` hook (staleTime/refetchInterval: 120s)

## 4. Frontend — Landing Page Updates

- [ ] 4.1 Replace `platformStats` import with `useProtocolStats()` hook in `Landing.tsx`
- [ ] 4.2 Update 4 stat cards: Invoices Factored, Total Volume (USDCx), Active Factors, Avg Settlement (hardcoded 4.2h)
- [ ] 4.3 Wire `useCountUp` to gate on `data !== undefined && statsVisible`
- [ ] 4.4 Add loading skeleton and error states for stat cards
- [ ] 4.5 Replace "Recent Activity" section with "Recent Factors" section using `useRecentFactors()`
- [ ] 4.6 Display factor rows: truncated address, advance rate range, factored count, registration time

## 5. Cleanup & Verification

- [ ] 5.1 Remove `platformStats` and `recentActivity` from `client/src/lib/mock-data.ts` (delete file if empty)
- [ ] 5.2 Run `npm run build` in `client/` to verify no build errors
- [ ] 5.3 Run `npm run lint` in `client/` to verify no lint warnings
