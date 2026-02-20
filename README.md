## What it does

**ZK Factor** is a privacy-preserving invoice factoring platform built on Aleo blockchain. It cryptographically prevents double-factoring fraud while keeping invoice amounts, business relationships, and transaction details completely private. Businesses mint invoice records, factors purchase them through atomic swaps, and the UTXO consumption model makes re-factoring the same invoice mathematically impossible.

## Technologies used

- Aleo blockchain
- Leo programming language
- React + TypeScript with @provablehq/sdk
- Shadow Wallet integration
- zkSNARKs, Poseidon hashing
- Record encryption, zero-knowledge proofs, on-chain commitments

## Project docs

The platform is composed from multiple projects.

Each has it's own documentation:

- [Aleo Program](./aleo/README.md)
- [Frontend](./client/README.md)

## Resources

- [Product Requirements](https://github.com/imajus/zk-factor/blob/main/docs/PRD.md)
- [Technical Specifications](https://github.com/imajus/zk-factor/blob/main/docs/SPEC.md)
- [Product-Market Fit Analysis](https://github.com/imajus/zk-factor/blob/main/docs/PMF.md)
- [Go-To-Market Strategy](https://github.com/imajus/zk-factor/blob/main/docs/GTM.md)
- [Roadmap](https://github.com/imajus/zk-factor/blob/main/docs/ROAD.md)