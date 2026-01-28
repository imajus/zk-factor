# Product Requirements Document: Confidential Invoice Factoring on Aleo

## Executive Summary

A blockchain-based invoice factoring platform that cryptographically prevents double-factoring fraud while maintaining complete privacy of business relationships, invoice amounts, and transaction details.

## Problem Statement

### Double-Factoring Fraud
Companies sell the same invoice to multiple factoring firms, with only one receiving payment upon settlement. Industry estimates indicate up to 15% of submitted invoices contain fraudulent elements.

### Current Solutions Are Inadequate
- Centralized registries are siloed between competitors
- Require trust in central operators
- Not real-time
- Reveal sensitive business relationships
- Manual verification processes take days

### Privacy Requirements
Traditional factoring exposes:
- Customer relationships (competitive intelligence)
- Invoice amounts and payment terms
- Cash flow difficulties (market signaling)
- Supply chain dependencies

## Solution Overview

Leverages Aleo's UTXO-based record model where invoice records are cryptographically consumed during factoring transactions. Once an invoice record is spent, its serial number is published on-chain, making re-use cryptographically impossible without requiring centralized registries or trust.

## Technical Architecture

### Core Components

**Invoice Record**
```
record Invoice {
  owner: address,           // Business address
  debtor: address,          // Customer who owes payment
  amount: u64,              // Invoice amount in microcredits
  due_date: u64,            // Unix timestamp
  invoice_hash: field,      // Hash of invoice details
  nonce: field             // Uniqueness guarantee
}
```

**Factored Invoice Record**
```
record FactoredInvoice {
  owner: address,           // Factor address
  original_creditor: address,
  debtor: address,
  amount: u64,
  due_date: u64,
  factoring_date: u64,
  advance_rate: u16         // Percentage paid (e.g., 9500 = 95%)
}
```

**State Mappings (Public)**
```
mapping active_factors: address => bool
mapping settled_invoices: field => bool
```

### Key Transitions

**mint_invoice**
- Input: Invoice details (private)
- Output: Invoice record owned by business
- Validates: Amount > 0, due_date > current time

**factor_invoice**
- Input: Invoice record, factor address, advance rate
- Output: FactoredInvoice record to factor, payment to business
- Validates: Invoice serial number not already spent
- Effect: Consumes invoice (publishes serial number), atomic payment swap

**settle_invoice**
- Input: FactoredInvoice record, payment proof
- Output: Marks invoice as settled
- Effect: Consumes FactoredInvoice, releases any held funds

## Functional Requirements

### Phase 1: Core Anti-Fraud

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Businesses can create invoice records with encrypted details | P0 |
| FR-2 | Factors can verify invoice serial numbers are unspent | P0 |
| FR-3 | Factoring transaction atomically swaps invoice for payment | P0 |
| FR-4 | Duplicate factoring attempts fail at protocol level | P0 |
| FR-5 | Settlement process consumes factored invoice record | P0 |

### Phase 2: Enhanced Features

| ID | Requirement | Priority |
|---|---|---|
| FR-6 | Partial factoring (split invoice ownership) | P1 |
| FR-7 | Recourse tracking (return to business if debtor defaults) | P1 |
| FR-8 | Multi-factor syndication for large invoices | P1 |
| FR-9 | ZK credit scoring based on payment history | P2 |
| FR-10 | Automated settlement verification | P2 |

## User Flows

### Primary Flow: Factor an Invoice

1. **Creation**: Business delivers goods, generates invoice off-chain
2. **Registration**: Business calls `mint_invoice()` → receives private Invoice record
3. **Discovery**: Business browses factors by rate/terms via public marketplace
4. **Request**: Business initiates factoring request with selected factor
5. **Verification**: Factor queries serial number registry (automated)
6. **Approval**: Factor approves terms and payment amount
7. **Execution**: Single atomic transaction:
   - Invoice record consumed (serial number published)
   - FactoredInvoice record minted to factor
   - Payment transferred to business
8. **Settlement**: On due date, debtor pays factor, factor calls `settle_invoice()`

### Anti-Fraud Flow: Attempted Double-Factoring

1. Business factors Invoice #1234 with Factor A
   - Invoice consumed, serial SN-1234 published
2. Business attempts to factor same invoice with Factor B
   - Transaction references SN-1234
   - Aleo protocol checks: SN-1234 already spent
   - **Transaction automatically rejected**

## Privacy Requirements

### What Must Remain Private

| Data Element | Visibility | Enforcement |
|---|---|---|
| Invoice amount | Only business and factor | Record encryption |
| Debtor identity | Only business and factor | Record encryption |
| Goods/services details | Only business | Off-chain, hash only |
| Factoring discount rate | Only business and factor | Record encryption |
| Business-debtor relationship | Only participants | No public mappings |

### What Is Publicly Visible

| Data Element | Justification |
|---|---|
| Transaction occurrence | Required for consensus |
| Serial numbers of spent invoices | Double-spend prevention |
| Program function called | Aleo limitation (function privacy not implemented) |
| Transaction fees | Public token usage |

### Privacy-Preserving Verifications

Factors must verify invoice legitimacy without learning private details:

**Option A - ZK Proof from Business:**
- Proves: "Goods delivered worth ≥ $X to address Y on date Z"
- Reveals: Nothing beyond the claim
- Implementation: Custom Leo circuit with range proofs

**Option B - Debtor Confirmation:**
- Debtor signs commitment to invoice hash
- Reveals: Acknowledgment only, not amounts or details
- Implementation: Signature verification in Leo

## Technical Constraints

### Aleo Platform Limitations

**Record Discovery**: Wallets must scan blockchain to find records. Initial sync may take minutes. UI must handle asynchronous record availability.

**Proving Times**: 
- First-time synthesis: 5-7 minutes
- Subsequent proofs: 30-60 seconds
- Impact: Not suitable for real-time interactions; async UX required

**No Read-Only Access**: Verifying record contents requires consuming and recreating it. Every verification incurs gas costs.

**Function Visibility**: Called function names are public. Observers can distinguish `factor_invoice()` from `settle_invoice()`.

**Missing Cryptographic Primitives**: 
- No SHA-256 (limits external system integration)
- No RSA/ECDSA (can't verify traditional signatures)
- Workaround: Off-chain verification with on-chain attestation

### Transaction Limits
- Max transaction size: 128 KB
- Circuit constraints: ~2M per transition
- Max records per program: 310
- Typical transaction cost: 3-10 millicredits

## Non-Functional Requirements

### Performance
- Transaction finality: <2 seconds (AleoBFT)
- Proof generation: 30-60 seconds target for standard factoring
- Wallet sync time: <5 minutes for typical user

### Security
- All private data encrypted with owner keys
- Atomic swaps prevent partial execution exploits
- Serial number registry prevents double-spend
- No trusted intermediaries required

### Scalability
- Support 1000+ concurrent factoring transactions
- Handle invoice amounts up to u64 max (~18.4 million ALEO)
- Accommodate 100+ registered factors

## User Interface Requirements

### Business Dashboard
- Create invoice forms with validation
- View available factors with rates
- Track pending/completed factorings
- Display wallet sync status during record discovery
- Show proof generation progress

### Factor Dashboard  
- Browse available invoices (anonymized)
- Approve/reject factoring requests
- Verify serial number status
- Track portfolio of factored invoices

### Shared Components
- Wallet connection (Leo Wallet/Puzzle Wallet)
- Transaction status notifications
- Proving progress indicators
- Error handling for rejected transactions

## Success Metrics

- **Fraud Prevention**: Zero successful double-factoring attempts
- **Privacy**: No unauthorized disclosure of invoice details
- **Performance**: <1 minute average time from request to confirmation
- **Adoption**: Factoring cost reduction vs traditional (target: 20-30% lower fees)

## Open Questions

1. **Recourse Handling**: How to handle refactoring if debtor defaults? Requires reverse transaction mechanism.
2. **Partial Payments**: Support for partial invoice payments? Needs record splitting logic.
3. **Cross-border**: Multi-currency support? Exchange rate oracles may compromise privacy.
4. **Debtor Integration**: How to notify debtors to pay factors without revealing business identity?