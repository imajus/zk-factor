## Why

The same Aleo record parsing utilities (`getField`, `microToAleo`, `unixToDate`, `AleoRecord` interface) are copy-pasted across Invoices.tsx, Marketplace.tsx, Pay.tsx, and Settings.tsx. Factor-related queries (`parseFactorInfo`, `fetchActiveFactors`, `fetchFactorStatus`) are duplicated between Marketplace.tsx and Settings.tsx. This makes maintenance error-prone and blocks the upcoming dashboard merge (which needs these utils in new locations).

## What Changes

- Extract `AleoRecord` interface, `getField`, `microToAleo`, `unixToDate` into `client/src/lib/aleo-records.ts`
- Extract `FactorInfo` interface, `parseFactorInfo`, `fetchActiveFactors`, `fetchFactorStatus` into `client/src/lib/aleo-factors.ts`
- Update all consuming files to import from shared modules instead of defining locally
- Remove duplicate definitions from Invoices.tsx, Marketplace.tsx, Pay.tsx, Settings.tsx

## Capabilities

### New Capabilities
- `aleo-record-utils`: Shared utilities for parsing Aleo record plaintexts and converting Leo-typed values
- `aleo-factor-queries`: Shared functions for querying factor registration status and active factors from on-chain mappings

### Modified Capabilities

## Impact

- `client/src/pages/Invoices.tsx` — remove local definitions, add imports
- `client/src/pages/Marketplace.tsx` — remove local definitions, add imports
- `client/src/pages/Pay.tsx` — remove local definitions, add imports
- `client/src/pages/Settings.tsx` — remove local definitions, add imports
- No API or behavior changes — pure refactoring
