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
│   │   ├── layout/          # AppLayout, Header
│   │   ├── wallet/          # WalletConnect
│   │   └── NavLink.tsx      # Navigation component
│   ├── contexts/
│   │   └── WalletContext.tsx    # Wallet state management
│   ├── hooks/
│   │   ├── use-mobile.tsx       # Mobile detection
│   │   └── use-toast.ts         # Toast notifications
│   ├── lib/
│   │   ├── utils.ts            # Utility functions (cn, etc.)
│   │   └── mock-data.ts        # Mock data for development
│   ├── pages/
│   │   ├── Dashboard.tsx       # Main dashboard (role-based)
│   │   ├── Invoices.tsx        # Invoice list
│   │   ├── CreateInvoice.tsx   # Invoice creation form
│   │   ├── Marketplace.tsx     # Factor marketplace
│   │   ├── Transactions.tsx    # Transaction history
│   │   ├── Settings.tsx        # User settings
│   │   └── NotFound.tsx        # 404 page
│   ├── test/
│   │   ├── setup.ts            # Vitest setup
│   │   └── example.test.ts     # Example test
│   ├── App.tsx                 # Root component with routing
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

```typescript
// src/contexts/WalletContext.tsx
type UserRole = 'business' | 'factor' | 'observer';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: number;
  roles: UserRole[];
  activeRole: UserRole | null;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  syncProgress: number;
  network: 'mainnet' | 'testnet';
}
```

**Usage:**
```typescript
import { useWallet } from '@/contexts/WalletContext';

const { isConnected, address, connect, disconnect, activeRole } = useWallet();
```

**Current State**: Mock implementation. Needs integration with Aleo wallets (Leo Wallet, Puzzle Wallet).

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

Defined in `src/App.tsx`:

| Route | Component | Description |
|---|---|---|
| `/` | Dashboard | Role-based dashboard |
| `/invoices` | Invoices | Invoice list |
| `/invoices/create` | CreateInvoice | Create new invoice |
| `/marketplace` | Marketplace | Browse factors |
| `/transactions` | Transactions | Transaction history |
| `/portfolio` | Dashboard | Factor portfolio (same as /) |
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

**Current**: Integrated with Shield wallet via `@provablehq/aleo-wallet-adaptor-shield`.

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

**Required for Phase 1**:
- `mint_invoice()`: Create Invoice record
- `factor_invoice()`: Execute factoring transaction
- `settle_invoice()`: Mark invoice as settled

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
VITE_ALEO_PROGRAM_ID=zk_factor_11765.aleo
VITE_API_ENDPOINT=https://api.explorer.aleo.org/v1
VITE_ALEO_EXPLORER=https://testnet.explorer.provable.com
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

## Related Documentation

- Root project overview: @CLAUDE.md
- Product requirements: @../docs/PRD.md
- **Context7** has Provable SDK docs indexed in Context7 at library ID `/provablehq/sdk`
