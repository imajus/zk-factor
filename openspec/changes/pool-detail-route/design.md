## Context

The pools feature has a list page (`/pools`) and a detail view rendered as a Dialog within that same page. Action buttons (Contribute, Open Distribution) live on the pool cards. This means the URL never changes when viewing a pool, sharing is impossible, and the limited dialog size constrains the detail layout. The refactor extracts the detail view into its own route.

## Goals / Non-Goals

**Goals:**
- `/pools/:hash` becomes the canonical URL for a pool's detail view
- Pool cards on `/pools` are navigation links only (no inline action buttons)
- PoolDetail page is self-contained: owns its own data fetching and transaction execution
- Same auth guards as `/pools` (RequireAuth + RequireFactor)

**Non-Goals:**
- Voting tab behaviour is unchanged (vote + execute buttons stay on Voting cards in `/pools`)
- Claims tab behaviour is unchanged
- PoolCreateDialog stays in `/pools`
- No new on-chain transitions or data model changes

## Decisions

**Self-contained PoolDetail vs shared state**
PoolDetail fetches its own pool data via `useQuery(["all_pools"], fetchAllPools)` and `.find()` by hash, rather than lifting pool state to a parent. The pools list query is already cached by React Query so no extra network call occurs when navigating between the two routes.
Alternative: pass pool via router `state` — rejected because direct-URL access would have no data.

**Inline contribute form vs modal on detail page**
The contribute form is rendered inline as a card section on the detail page (amount input, balance display, submit button), not inside a new Dialog. The detail page has ample space and the modal-within-page pattern adds no value.
Alternative: keep contribute as a Dialog — rejected; the refactor goal is to move away from dialogs.

**Route placement**
`/pools/:hash` added in `WalletApp.tsx` immediately after the `/pools` route, with identical guards (`RequireAuth` + `RequireFactor`). Hash values are Aleo field elements (`...field` strings) — they are safe as URL path segments.

## Risks / Trade-offs

- [Pool not found for given hash] → Show a "Pool not found" message with back link; no crash.
- [Long field-element hashes in URL] → Cosmetic only; no functional issue.
- [React Query cache miss on first load of /pools/:hash] → `fetchAllPools` is called; brief loading skeleton shown.
