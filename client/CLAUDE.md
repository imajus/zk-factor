# Client Frontend

This file provides guidance for working with the React frontend in this directory.

## Tech Stack

**Core:**
- **Build Tool**: Vite 5.4.19 with React SWC plugin (fast compilation)
- **Framework**: React 18.3.1 with TypeScript 5.8.3
- **Routing**: React Router DOM 6.30.1
- **Package Manager**: npm (package-lock.json present) or Bun (bun.lockb present)

**UI & Styling:**
- **Component Library**: shadcn/ui (Radix UI primitives with Tailwind CSS)
- **Styling**: Tailwind CSS 3.4.17 with @tailwindcss/typography
- **Animations**: tailwindcss-animate
- **Theme**: next-themes for dark/light mode
- **Icons**: Lucide React

**State & Data:**
- **Server State**: TanStack React Query 5.83.0
- **Forms**: React Hook Form 7.61.1 with Zod 3.25.76 validation
- **Notifications**: Sonner 1.7.4 (toast notifications)
- **Charts**: Recharts 2.15.4

**Testing:**
- **Test Runner**: Vitest 3.2.4
- **Testing Library**: @testing-library/react 16.0.0 with jsdom

## Development Commands

All commands should be run from the `client/` directory.

**Install dependencies:**
```bash
npm install
# or
bun install
```

**Start dev server:**
```bash
npm run dev      # Starts on http://[::]:8080
```

**Build:**
```bash
npm run build           # Production build
npm run build:dev       # Development build
```

**Preview production build:**
```bash
npm run preview
```

**Linting:**
```bash
npm run lint
```

**Testing:**
```bash
npm run test           # Run tests once
npm run test:watch     # Watch mode
```

## File Structure

```
client/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui components (60+ components)
│   │   ├── dashboard/       # BusinessDashboard, FactorDashboard
│   │   ├── icons/           # Custom SVG icon components
│   │   ├── layout/          # AppLayout, PublicLayout, Header
│   │   ├── wallet/          # WalletConnect
│   │   ├── FeatureIcons.tsx # Landing page feature icons
│   │   ├── RoleIcons.tsx    # Role selection icons
│   │   └── NavLink.tsx      # Navigation component
│   ├── contexts/
│   │   └── WalletContext.tsx    # Wallet + Privy state management
│   ├── hooks/
│   │   ├── use-mobile.tsx       # Mobile detection
│   │   ├── use-toast.ts         # Toast notifications
│   │   └── use-transaction.ts   # Aleo transaction execution + status
│   ├── lib/
│   │   ├── aleo-factors.ts     # Factor registry, pool, recourse helpers
│   │   ├── aleo-records.ts     # Record parsing, metadata encoding
│   │   ├── config.ts           # App config (program IDs, endpoints, keys)
│   │   ├── format.ts           # Display formatting utilities
│   │   ├── ipfs.ts             # IPFS upload via Pinata + cidToField
│   │   ├── mock-data.ts        # Mock data for development
│   │   ├── notifications.ts    # Email notifications via Resend
│   │   └── utils.ts            # Utility functions (cn, etc.)
│   ├── pages/
│   │   ├── About.tsx           # About page
│   │   ├── CreateInvoice.tsx   # Invoice creation form
│   │   ├── Landing.tsx         # Public landing page
│   │   ├── Marketplace.tsx     # Factor marketplace
│   │   ├── NotFound.tsx        # 404 page
│   │   ├── Pay.tsx             # Debtor payment page
│   │   ├── Pools.tsx           # Factor pool management
│   │   ├── Privacy.tsx         # Privacy policy
│   │   ├── RegisterFactor.tsx  # Factor registration form
│   │   ├── Roadmap.tsx         # Product roadmap
│   │   ├── SelectRole.tsx      # Post-connect role selection
│   │   ├── Settings.tsx        # User settings
│   │   ├── Terms.tsx           # Terms of service
│   │   └── Transactions.tsx    # Transaction history
│   ├── test/
│   │   ├── setup.ts            # Vitest setup
│   │   └── example.test.ts     # Example test
│   ├── App.tsx                 # Root component with public routing
│   ├── WalletApp.tsx           # Authenticated routing (RequireAuth wrapper)
│   ├── main.tsx                # Entry point
│   ├── index.css               # Global styles + Tailwind
│   └── vite-env.d.ts           # Vite type definitions
├── components.json             # shadcn/ui configuration
├── tailwind.config.ts          # Tailwind configuration
├── vite.config.ts              # Vite configuration
├── vitest.config.ts            # Vitest configuration
└── tsconfig.json               # TypeScript configuration
```

## Path Aliases

Configured in vite.config.ts and tsconfig.json:

```typescript
@/components  → src/components
@/lib         → src/lib
@/hooks       → src/hooks
@/contexts    → src/contexts
@/pages       → src/pages
```

## Key Components

### WalletContext

Manages wallet connection state and user roles:

**Key exports from `useWallet()`:**
- `isConnected`, `address`, `connect`, `disconnect` — Shield wallet
- `activeRole` — `'business' | 'factor' | 'observer'`
- `requestRecords(programId, filterSpent)` — fetch records from Shield
- `email`, `privyReady`, `loginWithPrivy`, `logoutPrivy` — Privy email login

**Current State**: Integrated with Shield wallet + Privy for account abstraction.

### Role-Based Dashboards

- `BusinessDashboard.tsx`: Invoice management, factoring requests
- `FactorDashboard.tsx`: Available invoices, portfolio tracking

Dashboards render based on `activeRole` from WalletContext.

### shadcn/ui Components

All UI components in `src/components/ui/` are from shadcn/ui. To add new components:

```bash
npx shadcn-ui@latest add <component-name>
```

Components use Radix UI primitives with custom Tailwind styling.

## Routing

Public routes in `src/App.tsx`, authenticated routes in `src/WalletApp.tsx`:

**Public (PublicLayout):**

| Route | Component | Description |
|---|---|---|
| `/` | Landing | Public landing page |
| `/about` | About | About page |
| `/terms` | Terms | Terms of service |
| `/privacy` | Privacy | Privacy policy |
| `/roadmap` | Roadmap | Product roadmap |
| `/connect` | WalletConnect | Wallet connection + Privy login |
| `/pay` | Pay | Debtor payment page |

**Authenticated (RequireAuth + AppLayout):**

| Route | Component | Description |
|---|---|---|
| `/select-role` | SelectRole | Post-connect role selection |
| `/register-factor` | RegisterFactor | Factor registration form |
| `/dashboard` | Dashboard | Role-based dashboard |
| `/invoices/create` | CreateInvoice | Create new invoice |
| `/marketplace` | Marketplace | Browse factors |
| `/pools` | Pools | Factor pool management |
| `/transactions` | Transactions | Transaction history |
| `/settings` | Settings | User settings |
| `*` | NotFound | 404 page |

## Styling Conventions

**Tailwind Classes:**
- Use `cn()` utility from `@/lib/utils` to merge classes
- Prefer utility classes over custom CSS
- Use CSS variables for theme colors (defined in index.css)

**Component Variants:**
```typescript
import { cn } from "@/lib/utils";

<button className={cn("base-classes", variant === "active" && "active-classes")} />
```

**Responsive Design:**
- Mobile-first approach
- Use Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- `use-mobile` hook for JS-based mobile detection

## Aleo Explorer API Gotchas

**Mapping values are Leo plaintext strings, not JSON objects.** Raw-fetching a mapping endpoint and calling `res.json()` returns a string like `"{ is_active: true, min_advance_rate: 7000u16 }"` — field access on it is always `undefined`. Use `AleoNetworkClient.getProgramMappingValue` from `@provablehq/sdk` instead; it returns the plaintext string correctly.

**`@provablehq/sdk` is separate from the wallet adaptor packages.** The wallet adaptor (`@provablehq/aleo-wallet-adaptor-*`) does not include `AleoNetworkClient`. Install `@provablehq/sdk` explicitly when you need network queries.

**`@provablehq/sdk` requires `build.target: "esnext"` in Vite.** The SDK uses top-level await for WASM initialization; without it the build fails with "Top-level await is not available in the configured target environment".

**`parseInt` handles Leo type suffixes naturally.** `parseInt("7000u16", 10)` → `7000`; no manual suffix stripping needed.

## Aleo Integration Points

### Wallet Connection

**Current**: Shield wallet via `@provablehq/aleo-wallet-adaptor-shield` + Privy for email login / account abstraction.

### Shield Wallet Record Shape (`requestRecords` return)

`requestRecords(programId, true)` returns `AleoRecord[]` with this shape — **not** a `{ type, data, plaintext }` object:

```typescript
interface AleoRecord {
  recordName: string;       // e.g. "Invoice" — NOT "type"
  recordPlaintext: string;  // full Leo plaintext — NOT "plaintext" or nested "data"
  spent: boolean;           // always filter !r.spent for active records
  commitment: string;       // unique record ID — NOT "id"
  owner: string;            // field-element encoded (not an aleo1... address)
  sender: string;           // the aleo1... address that submitted the tx
  programName: string;
  blockHeight?: number;
  transactionId?: string;
  tag?: string;
}
```

Parse individual fields from `recordPlaintext` (format: `field: value.private,`):

```typescript
function getField(plaintext: string, field: string): string {
  for (const line of plaintext.split('\n')) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith(`${field}:`)) continue;
    const m = trimmed.match(/^[^:]+:\s*(.+?)\.(?:private|public)/);
    if (m) return m[1].trim();
  }
  return '';
}
```

Values retain Leo type suffixes: `1000000u64`, `9500u16`, `97440...field`, `aleo1...`.
Pass `record.recordPlaintext` directly as inputs to `executeTransaction`.

**Required for wallet connection**:
- Handle wallet connection/disconnection
- Implement record discovery (scan blockchain for user records)
- Show sync progress during initial wallet sync

### Transaction Execution

Use the `useTransaction()` hook from `@/hooks/use-transaction.ts` for all on-chain calls. It manages proof generation status and error handling.

**Core transitions:**
- `mint_invoice()` — Create Invoice record (includes `document_cid` for IPFS attachment)
- `authorize_factoring()` — Business commits invoice to a factor
- `execute_factoring()` / `execute_factoring_token()` — Factor accepts (credits / USDCx)
- `settle_invoice()` — Factor finalizes after debtor payment
- `pay_invoice()` — Debtor pays invoice
- `initiate_recourse()` / `settle_recourse()` — Recourse flow for defaulted invoices
- `create_pool()` / `contribute_to_pool()` / `execute_pool_factoring()` — Pool syndication

**Implementation Notes**:
- Proving times: 30-60 seconds (show progress indicator)
- First-time synthesis: 5-7 minutes (warn users)
- Async record availability (poll/subscribe for new records)

### Privacy Requirements

**Never expose in UI**:
- Full invoice amounts (unless user owns the record)
- Debtor identity (unless user is party to transaction)
- Business-debtor relationships

**Show encrypted/hashed only**:
- Invoice hashes
- Serial numbers (for double-spend verification)

## Mock Data

Located in `src/lib/mock-data.ts`. Used for:
- Invoice lists
- Transaction history
- Factor marketplace data

**Remove in production**: Replace with real data from Aleo blockchain.

## Testing

**Test Files**: `src/test/*.test.ts` or co-located with components

**Run Tests**:
```bash
npm run test          # Once
npm run test:watch    # Watch mode
```

**Example Test**:
```typescript
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

## Environment Variables

Create `.env` file in `client/` directory:

```bash
VITE_ALEO_NETWORK=testnet          # or mainnet
VITE_ALEO_PROGRAM_ID=zk_factor.aleo
VITE_API_ENDPOINT=https://api.explorer.aleo.org/v1
VITE_ALEO_EXPLORER=https://testnet.explorer.provable.com
VITE_USDCX_PROGRAM_ID=test_usdcx_stablecoin.aleo
VITE_PRIVY_APP_ID=              # Privy app ID for account abstraction / email login
VITE_PINATA_JWT=                # Pinata API JWT for IPFS document uploads
VITE_RESEND_API_KEY=            # Resend API key for email notifications
VITE_RESEND_PROXY_URL=          # Optional: custom Resend proxy endpoint
VITE_NOTIFY_FROM=               # Optional: sender address (default: ZK-Factor <notify@zkfactor.app>)
```

Access in code:
```typescript
const network = import.meta.env.VITE_ALEO_NETWORK;
```

## Performance Considerations

**Bundle Size**:
- Vite with React SWC for fast builds
- Tree-shaking enabled
- Lazy load routes: `React.lazy()` if needed

**Aleo-Specific**:
- Show loading states during proof generation
- Cache record data to minimize blockchain scans
- Debounce wallet sync operations
- Use React Query for efficient data fetching/caching

## Known Limitations

**Aleo Platform Constraints**:
- Record discovery requires blockchain scan (async, takes time)
- No read-only record access (must consume & recreate)
- Proving times not suitable for real-time UX
- Function names visible on-chain (privacy limitation)

**UI Implications**:
- Always show sync progress indicators
- Warn users about first-time proving delays
- Handle async record availability gracefully
- Provide transaction status updates

## Icon Sourcing

Use the **Better Icons** skill (`better-icons`) for sourcing SVGs from 200+ Iconify libraries.

**Gotchas:**
- `search_icons` requires **single-keyword** queries — multi-word queries return 0 results
- `recommend_icons` MCP tool returns empty results — use `search_icons` instead
- `get_icon <prefix:name>` returns SVG with `fill="currentColor"` on path elements — set `fill="none"` on the wrapper `<g>` to get clean outlines
- Preferred collection for outline icons: `tabler:` prefix

**Icon component pattern** (`client/src/components/icons/`):
- Props: `{ className?: string; size?: number }`
- Use `currentColor` for stroke, `viewBox` sized to icon, `width={size} height={size}`
- Composite icons: use SVG `<g transform="translate(...) scale(...)">` to layer multiple icons

## Related Documentation

- Root project overview: @CLAUDE.md
- Product requirements: @../docs/PRD.md
- **Context7** has Provable SDK docs indexed in Context7 at library ID `/provablehq/sdk`
