## ADDED Requirements

### Requirement: Landing page FAQ section
The landing page SHALL display an FAQ section with 8 questions and answers about invoice factoring, positioned between the Recent Activity section and the CTA Banner. The section SHALL use the existing shadcn/ui Accordion component with single-item expand behavior.

#### Scenario: FAQ section renders on landing page
- **WHEN** a visitor loads the landing page (`/`)
- **THEN** an FAQ section is visible with the heading "Frequently Asked Questions", containing 8 collapsible accordion items

#### Scenario: Accordion item expands on click
- **WHEN** a visitor clicks on an FAQ question
- **THEN** the answer expands with an animation and only one item is open at a time

### Requirement: FAQ content adapted to ZK Factor
The FAQ answers SHALL be adapted from traditional factoring terminology to reflect ZK Factor's blockchain-based model. Answers SHALL reference: privacy guarantees, UTXO-based fraud prevention, IPFS document storage, Shield wallet integration, on-chain recourse mechanism, and ZK proof costs.

#### Scenario: FAQ covers core factoring concepts
- **WHEN** a visitor reads the FAQ
- **THEN** the following topics are covered: (1) what factoring is useful for, (2) factoring vs loans, (3) advantage over loans, (4) debtor default handling, (5) required documents, (6) collateral requirements, (7) debtor responsibilities, (8) commission rationale

### Requirement: FAQ section matches landing page design system
The FAQ section SHALL use the same styling patterns as other landing page sections: `container py-24 space-y-12` wrapper, centered heading with `text-3xl font-bold`, `.reveal` scroll animation classes with staggered delays.

#### Scenario: FAQ section animates on scroll
- **WHEN** a visitor scrolls the FAQ section into view
- **THEN** the heading and accordion items fade in with staggered reveal animations matching the existing landing page pattern
