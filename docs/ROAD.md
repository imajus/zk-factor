# Product Roadmap

## Table of Contents

- [Phase 1: MVP Launch (Testnet)](#phase-1-mvp-launch-testnet)
- [Phase 2: Enhanced Features](#phase-2-enhanced-features)
- [Phase 3: Mainnet Launch](#phase-3-mainnet-launch)
- [Phase 4: Enterprise Scale](#phase-4-enterprise-scale)
- [Phase 5: Ecosystem Expansion](#phase-5-ecosystem-expansion)

## Phase 1: MVP Launch (Testnet)

Core platform functionality:

- [x] Invoice creation (`mint_invoice`)
- [ ] Fraud prevention (serial number verification / UTXO consumption model)
- [x] Two-step factoring (`authorize_factoring` → `execute_factoring`)
- [x] Private debtor payment (`create_payment_request` → `pay_invoice`)
- [x] Marketplace (factor discovery and browsing)
- [x] Settlement (`settle_invoice`)
- [x] Basic web UI for business, factor, and debtor roles
- [x] Shield Wallet integration

## Phase 2: Enhanced Features

- [x] USDCx stablecoin payments integration
- [x] IPFS document attachment (invoice supporting docs stored on IPFS, CID on-chain)
- [x] Account abstraction / email login (Privy)
- [x] Email notifications (Resend API — invoice created, factored, settled)
- [ ] Partial factoring (sell portion of invoice, retain the rest)
- [ ] Recourse tracking (handle debtor non-payment and return to business)
- [ ] Multi-factor syndication (large invoices split across multiple factors)
- [ ] Mobile wallet support
- [ ] API integration for accounting software (QuickBooks, Xero, Sage — matching FundThrough's distribution)
- [ ] ZK credit scoring based on payment history (prove history without revealing details)

## Phase 3: Mainnet Launch

- [ ] Security audits (smart contract and infrastructure)
- [ ] Economic audit (tokenomics and fee structure validation)
- [ ] Bug bounty program
- [ ] Factor partnerships (onboard 5-10 progressive factors)
- [ ] Production monitoring infrastructure
- [ ] Real-world transaction volume
- [ ] Cross-border factoring with oracle integration
- [ ] Automated settlement verification
- [ ] Delegated proving infrastructure (reduce client-side proof generation time)

## Phase 4: Enterprise Scale

- [ ] ZK credit scoring (prove payment history without revealing details)
- [ ] Privacy-preserving analytics dashboard
- [ ] Cross-border factoring (multi-currency support)
- [ ] White-label licensing for banks/fintechs
- [ ] Delegated proving (reduce client-side computation)
- [ ] Compliance framework (KYC/AML integration points)
- [ ] Advanced analytics dashboards
- [ ] Institutional API integration

## Phase 5: Ecosystem Expansion

- [ ] Supply chain integration (auto-generate invoices from delivery confirmation)
- [ ] Banking partnerships
- [ ] Multi-chain bridge support
- [ ] Debtor notification system (privacy-preserving payment instructions)
- [ ] White-label deployment options for enterprise factoring companies
- [ ] Enterprise sales team and dedicated support
