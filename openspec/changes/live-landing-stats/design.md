## Context

The Landing page (`client/src/pages/Landing.tsx`) imports `platformStats` and `recentActivity` from `client/src/lib/mock-data.ts` — all hardcoded values. The Aleo contract already tracks `protocol_stats[1u8]` (factored count) and `protocol_stats[2u8]` (settled count) as public mappings. Factor registration data (`active_factors`, `factor_addresses`) is also public and enumerable. The missing piece is a volume counter for stablecoin invoices.

The Landing page is a public route rendered without the wallet provider — `@provablehq/sdk` (which uses WASM + top-level await) is lazy-loaded only for authenticated routes. This constraint drives the raw-fetch approach.

## Goals / Non-Goals

**Goals:**
- Add `protocol_stats[3u8]` volume counter for USDCx factoring in the Leo contract
- Display real on-chain metrics on the landing page with loading/error states
- Show recently registered factors with their public data
- Keep the landing page bundle WASM-free (no `@provablehq/sdk` import)

**Non-Goals:**
- Tracking credits-based factoring volume (not meaningful in dollar terms)
- Backend aggregation service or indexer
- Real-time transaction feed (individual transactions are private)
- Modifying factor registration flow or FactorInfo struct

## Decisions

### 1. Raw `fetch()` over `AleoNetworkClient` for landing page

The Aleo explorer REST API supports direct mapping reads at `${API_ENDPOINT}/testnet/program/${PROGRAM_ID}/mapping/${mapping}/${key}`. Using raw `fetch()` avoids pulling `@provablehq/sdk` WASM into the landing page chunk.

**Alternative considered:** Dynamic `import('@provablehq/sdk')` — adds complexity and still loads WASM on first visit. Raw fetch is simpler and faster.

### 2. Volume counter only for USDCx path

Only `finalize_exec_factoring_token` gets the volume counter. The credits path (`finalize_execute_factoring`) and pool path (`finalize_exec_pool_factoring`, which is credits-only per `assert(!offer.use_token)`) are excluded because native credit amounts don't represent stable dollar values.

**Alternative considered:** Track both with separate keys — adds complexity for data that isn't meaningful to display.

### 3. Reuse existing factor enumeration pattern for "Recent Factors"

The `factor_addresses` storage vector is enumerable (compiled to `factor_addresses__` indexed by `u32` and `factor_addresses__len__` keyed by `false`). Read the last N entries and their `active_factors` mapping data. This mirrors the approach in `fetchActiveFactors()` from `aleo-factors.ts` but uses raw fetch.

### 4. Duplicate `parseMappingField` in `aleo-protocol.ts`

A small (~10 line) plaintext parser is duplicated rather than importing from `aleo-factors.ts`, which pulls in `@provablehq/sdk`. The duplication is minimal and keeps the import boundary clean.

### 5. Keep avg settlement time hardcoded

`4.2h` stays as a hardcoded display value. Computing real settlement time would require enumerating all `settled_invoices` entries (keyed by hash, not enumerable) and correlating with factoring timestamps (private records). Not worth the complexity.

## Risks / Trade-offs

- **CORS on explorer API** → The existing `AleoNetworkClient` hits the same endpoint successfully, so CORS should not be an issue. If it is, fall back to dynamic SDK import.
- **Mapping keys not yet written (fresh deploy)** → `fetchMappingValue` returns null/404. Each read wrapped in try/catch, defaults to 0.
- **`factor_addresses__len__` key format** → Existing code uses `"false"` as the key (line 85 of `aleo-factors.ts`). Verified this is the Leo storage vector convention.
- **N+1 API calls for factor list** → Reading 5 recent factors = 1 (len) + 5 (addresses) + 5 (factor info) = 11 calls. Mitigated by aggressive caching (2-min staleTime) and `Promise.all` parallelism.
- **Contract upgrade requires redeployment** → The `protocol_stats[3u8]` counter starts at 0 after upgrade. Historical volume is lost. Acceptable for a testnet/early platform.
