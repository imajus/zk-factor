# ZK Factor — Frontend

React frontend for ZK Factor: a confidential invoice factoring platform built on the Aleo blockchain. Businesses can sell unpaid invoices to factoring companies with cryptographic guarantees against double-factoring fraud — no central registry, no trust required.

## How it works

Invoice records live as private, UTXO-like records on-chain. When a business factors an invoice, the record is consumed and its serial number is published. Any attempt to factor the same invoice a second time fails at the protocol level — it is cryptographically impossible, not just policy.

The frontend interacts with the `zk_factor_11765.aleo` program deployed on Aleo testnet. All sensitive data (invoice amounts, debtor identity, business relationships) stays encrypted inside private records. Only the occurrence of a transaction is visible on-chain.

## User roles

| Role | What they do |
|------|--------------|
| **Business** | Create invoices (`mint_invoice`), browse factors, sell invoices (`factor_invoice`) |
| **Factor** | Register on-chain (`register_factor`), receive factored invoices, settle payments (`settle_invoice`) |

Switch roles in the header after connecting your wallet.

## Tech stack

- **React 18** + **TypeScript** + **Vite**
- **shadcn/ui** (Radix UI + Tailwind CSS) for components
- **TanStack React Query** for server state and caching
- **React Router DOM** for client-side routing
- **`@provablehq/aleo-wallet-adaptor-react`** + **Shield Wallet** for Aleo wallet connection
- **Sonner** for toast notifications
- **Vitest** + **Testing Library** for tests

## Prerequisites

- **Node.js 18+** and **npm**
- **[Shield Wallet](https://www.shield.app/)** browser extension (required to sign Aleo transactions)

## Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:8080)
npm run dev

# Run tests
npm test

# Production build
npm run build
```

## Environment variables

Create a `.env` file in this directory:

```bash
VITE_ALEO_NETWORK=testnet                          # testnet | mainnet | canary
VITE_ALEO_PROGRAM_ID=zk_factor_11765.aleo          # on-chain program to interact with
VITE_API_ENDPOINT=https://api.explorer.aleo.org/v1 # Aleo explorer REST base URL
```

All three variables are read at startup from `src/lib/config.ts` and have the defaults shown above. `VITE_ALEO_NETWORK` controls the network passed to the wallet provider and the network segment in explorer API requests. `VITE_ALEO_PROGRAM_ID` is whitelisted alongside `credits.aleo` for record decryption so the wallet knows which program records to decrypt.

## Project structure

```
src/
├── components/
│   ├── ui/            # shadcn/ui primitives (Button, Card, Table, …)
│   ├── dashboard/     # BusinessDashboard, FactorDashboard
│   ├── layout/        # AppLayout, Header
│   └── wallet/        # WalletConnect screen
├── contexts/
│   └── WalletContext.tsx  # Thin facade over the Aleo wallet adapter
├── hooks/             # use-mobile, use-toast
├── lib/
│   ├── format.ts      # Formatting helpers (formatAleo, formatDate, …)
│   └── utils.ts       # Tailwind class merger (cn)
├── pages/
│   ├── CreateInvoice.tsx  # mint_invoice form
│   ├── Invoices.tsx       # Record browser + settle action
│   ├── Marketplace.tsx    # Active factors + factor_invoice flow
│   ├── Transactions.tsx   # Transaction history
│   ├── Settings.tsx       # Factor registration + preferences
│   └── Dashboard.tsx      # Role-based landing page
└── test/
    └── example.test.ts
```

## Aleo-specific notes

**Proving times** — First proof generation can take 5–7 minutes. Subsequent proofs take 30–60 seconds. The UI shows progress toasts throughout.

**Record discovery** — After connecting, the wallet scans the blockchain to find your records. This can take a minute on first load.

**No read-only access** — Verifying a record's contents requires consuming it on-chain (gas cost). The app avoids this where possible.

**Wallet requirement** — Shield Wallet is the only supported wallet adapter. If the extension is not installed, the connect screen shows an install link.

## Smart contract

Program ID: `zk_factor_11765.aleo`, deployed on Aleo testnet.

See [`../aleo/`](../aleo/) for the Leo source code and [`../docs/PRD.md`](../docs/PRD.md) for the full product specification.
