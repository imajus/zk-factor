## Why

The frontend uses Inter + default shadcn styling, making it visually indistinguishable from generic AI-generated dashboards. The theme system uses manual DOM class toggling instead of the installed `next-themes` library, and several UI elements have dead links and broken states. The app needs a visual identity upgrade and UX bug fixes to feel polished and trustworthy.

## What Changes

- Replace Inter with Satoshi for headings (geometric, modern, web3-native) via CDN; keep system sans-serif for body; keep JetBrains Mono for addresses
- Update `index.css` font imports and `tailwind.config.ts` font families
- Add landing page atmosphere: dot-grid/noise texture background, gradient mesh behind hero, glow effects on CTAs, staggered fade-in animations
- Wire up `next-themes` properly — replace manual `document.documentElement.classList` toggling in Settings
- Persist theme preference via `next-themes` localStorage
- Fix 404 page (remove duplicate `min-h-screen bg-muted`, use proper layout)
- Fix dead "View on Explorer" link in header wallet dropdown
- Add improved empty states with illustrations and CTAs:
  - Dashboard with no invoices: "Create your first invoice" CTA
  - Marketplace with no factors: "Be the first factor" CTA pointing to registration

## Capabilities

### New Capabilities
- `design-system-typography`: Distinctive font pairing replacing generic Inter
- `landing-atmosphere`: Visual effects (textures, gradients, animations) for the landing page
- `empty-state-illustrations`: Illustrated empty states with contextual CTAs

### Modified Capabilities
- `theme-management`: Replace manual DOM toggling with next-themes integration
- `error-pages`: Fix 404 page layout issues

## Impact

- `client/src/index.css` — font imports, utility classes, animation keyframes
- `client/tailwind.config.ts` — font family updates, animation definitions
- `client/src/pages/Settings.tsx` — replace manual theme logic with next-themes
- `client/src/pages/NotFound.tsx` — fix layout
- `client/src/components/layout/Header.tsx` — fix explorer link
- `client/src/App.tsx` — wrap with ThemeProvider from next-themes
- `client/src/pages/Landing.tsx` — atmospheric effects (after landing page exists)
- `client/src/components/dashboard/BusinessDashboard.tsx` — empty state illustration
- `client/src/pages/Marketplace.tsx` — empty state illustration
