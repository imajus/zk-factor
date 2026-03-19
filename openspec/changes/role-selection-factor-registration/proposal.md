## Why

The `activeRole` state is never set after wallet connect — it stays `null`, making role-based nav filtering and dashboard switching dead code. Users need an explicit role selection step on first connect, with the choice persisted in localStorage per wallet address. Selecting Factor role requires on-chain registration, which is currently buried in a Settings tab and needs its own dedicated page.

## What Changes

- Create `/select-role` page: full-screen split layout, Creditor vs Factor with role-specific icons and descriptions
  - Creditor click → sets role, navigates to `/dashboard`
  - Factor click → navigates to `/register-factor` (registration required)
  - Only shown on first connect (no role in localStorage for this address)
- Create `/register-factor` page: dedicated registration form extracted from Settings
  - Min/max advance rate inputs with validation
  - Calls `register_factor` transition on submit
  - On success → sets role to `factor`, saves to localStorage, navigates to `/dashboard`
- Add role switcher to Header nav bar (between nav items and wallet dropdown)
  - Factor → Creditor: always allowed
  - Creditor → Factor: checks `active_factors` mapping, redirects to `/register-factor` if not registered
- Update `WalletContext` to persist `activeRole` in localStorage keyed by wallet address
- Remove factor registration form from Settings page
- Remove `businessOnly`/`factorOnly` nav item filtering — all pages visible to all roles

## Capabilities

### New Capabilities
- `role-selection`: Post-connect role selection page with localStorage persistence per wallet address
- `factor-registration-page`: Dedicated factor registration page extracted from Settings
- `role-switcher`: Header component for switching between Creditor and Factor roles with registration gate

### Modified Capabilities
- `wallet-context`: Add localStorage persistence for activeRole keyed by address
- `app-settings`: Remove factor registration tab, simplify to Wallet + Display tabs

## Impact

- `client/src/pages/SelectRole.tsx` — new file
- `client/src/pages/RegisterFactor.tsx` — new file
- `client/src/components/layout/Header.tsx` — add role switcher
- `client/src/contexts/WalletContext.tsx` — localStorage persistence
- `client/src/pages/Settings.tsx` — remove factor registration tab
