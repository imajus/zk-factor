## What it does

**ZK Factor** is a privacy-preserving invoice factoring platform built on Aleo blockchain. It cryptographically prevents double-factoring fraud while keeping invoice amounts, business relationships, and transaction details completely private. Businesses mint invoice records and authorize factoring in a two-step handshake - the factor executes the swap and pays the advance, then sends a private PaymentNotice record to the debtor. The UTXO consumption model makes re-factoring the same invoice mathematically impossible, with no central registry required.

## Technologies used

- Aleo blockchain
- Leo programming language
- React + TypeScript with Vite, shadcn/ui, Tailwind CSS
- TanStack React Query, React Hook Form, Zod
- @provablehq/sdk, Shield Wallet integration
- Cloudflare Workers (Pinata proxy for IPFS uploads)
- zkSNARKs, Poseidon hashing
- Record encryption, zero-knowledge proofs, on-chain commitments

## Project docs

The platform is composed from multiple projects.

Each has its own documentation:

- [Aleo Program](./aleo/README.md)
- [Frontend](./client/README.md)
- [Worker](./worker/README.md)

## Resources

- [Product Requirements](./docs/PRD.md)
- [Technical Specifications](./docs/SPEC.md)
- [Product-Market Fit Analysis](./docs/PMF.md)
- [Go-To-Market Strategy](./docs/GTM.md)
- [Roadmap](./docs/ROAD.md)