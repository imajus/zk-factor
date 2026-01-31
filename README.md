## What it does

**ZK Factor** is a privacy-preserving invoice factoring platform built on Aleo blockchain. It cryptographically prevents double-factoring fraud while keeping invoice amounts, business relationships, and transaction details completely private. Businesses mint invoice records, factors purchase them through atomic swaps, and the UTXO consumption model makes re-factoring the same invoice mathematically impossible.

## The problem it solves

Invoice factoring fraud costs the industry billions annually, with the same invoice sold to multiple factors. Current solutions rely on centralized registries that are siloed between competitors, require trust, take days for manual verification, and expose sensitive business data including customer relationships, invoice amounts, and cash flow difficulties that signal competitive weakness.

## Challenges I ran into

- ZK proving times required rethinking UX entirely.
- Record discovery through blockchain scanning may take 2-5 minutes for initial wallet sync.
- The UTXO model means no read-only record access, i.e. every verification consumes the record and requires recreation.

## Technologies I used

- Aleo blockchain
- Leo programming language
- React + TypeScript with @provablehq/sdk
- Shadow Wallet integration
- zkSNARKs, Poseidon hashing
- Record encryption, zero-knowledge proofs, on-chain commitments

## How we built it

Designed a UTXO-based record model where Invoice records are consumed during factoring, publishing serial numbers that prevent reuse.

Implemented three core Leo transitions: `mint_invoice()` creates encrypted invoice records, `factor_invoice()` atomically swaps invoices for payment while consuming the record, and `settle_invoice()` marks completion. Used public mappings for factor registration and settlement tracking while keeping sensitive data in encrypted records.

Built React frontend with wallet integration, proof generation progress tracking, and asynchronous record discovery. 

## What we learned

The UTXO model requires fundamentally different architectural thinking than account-based systems. Zero-knowledge proofs provide genuine cryptographic confidentiality but introduce latency that challenges traditional UX expectations. Record discovery limitations force careful consideration of wallet synchronization flows. Async design isn't optional when proving make take minutes.

Most importantly: blockchain privacy requires thinking beyond just cryptography to include network metadata, timing analysis, and operational security.

## What's next for ZK Factor

**Phase 2**: Stable coin token integration (UDSCx), Partial factoring (split invoice ownership), multi-factor syndication for large invoices, recourse factoring implementation, ZK credit scoring based on payment history.

**Phase 3**: Cross-border factoring with oracle integration, automated settlement verification, mobile wallet support, delegated proving infrastructure for faster proofs.

**Phase 4**: Layer-2 scaling solutions, advanced analytics dashboards, institutional API integration, white-label deployment options for enterprise factoring companies.

## Resources

- [Product Requirements](https://github.com/imajus/zk-factor/blob/main/docs/PRD.md)
- [Technical Specifications](https://github.com/imajus/zk-factor/blob/main/docs/SPEC.md)
- [Product-Market Fit Analysis](https://github.com/imajus/zk-factor/blob/main/docs/PMF.md)
- [Go-To-Market Strategy](https://github.com/imajus/zk-factor/blob/main/docs/GTM.md)
- [Roadmap](https://github.com/imajus/zk-factor/blob/main/docs/ROAD.md)