## Why

The current app gates all content behind wallet connection — unauthenticated visitors see only a connect-wallet card. There's no public landing page, no static pages, and no way to browse the platform without a wallet. The routing needs to support both public and authenticated experiences, with an auth guard that redirects to role selection on first connect.

## What Changes

- Restructure routes: `/` becomes public landing, `/dashboard` becomes the authenticated home
- Add routes: `/select-role`, `/register-factor`, `/about`, `/terms`, `/privacy`, `/roadmap`
- Remove routes: `/invoices` (merged into dashboard), `/portfolio` (duplicate)
- Keep `/pay` as public (debtor payment flow)
- Create `PublicLayout` for public pages (minimal header with logo, Connect Wallet, nav links)
- Update `AppLayout` — remove wallet gate, use for authenticated pages only
- Create `RequireAuth` guard component: redirects to `/` if not connected, to `/select-role` if no role in localStorage
- **BREAKING**: `/` no longer renders dashboard; dashboard moves to `/dashboard`

## Capabilities

### New Capabilities
- `public-layout`: Minimal layout wrapper for unauthenticated/public pages with navigation to About, Roadmap, etc.
- `auth-guard`: Route protection component that checks wallet connection and role selection state

### Modified Capabilities
- `app-routing`: Route structure changes — new public/auth split, removed/moved routes

## Impact

- `client/src/App.tsx` — complete route restructure
- `client/src/components/layout/AppLayout.tsx` — remove wallet gate, scope to auth pages
- `client/src/components/layout/PublicLayout.tsx` — new file
- `client/src/components/auth/RequireAuth.tsx` — new file
- All page components' internal links may need updating (e.g., `/invoices` → `/dashboard`)
