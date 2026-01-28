# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ZK-Factor: Confidential invoice factoring platform on Aleo blockchain that cryptographically prevents double-factoring fraud while maintaining complete privacy of business relationships and invoice details.

**Core Innovation:** Leverages Aleo's UTXO-based record model where invoice records are cryptographically consumed during factoring. Once spent, the serial number is published on-chain, making re-use impossible without centralized registries.

See @PRD.md for complete product requirements and specifications.

## Repository Structure

```
aleo/              Leo smart contract (program: zk_factor_11765.aleo)
  └── CLAUDE.md    Aleo-specific development guide
client/            React frontend (to be added)
docs/              Language-specific guides and documentation
  └── leo.md       Leo language guide
PRD.md             Full product requirements and specifications
```

## Module-Specific Guides

**When working in `aleo/`:** Refer to @aleo/CLAUDE.md for smart contract architecture, development commands, and Aleo platform constraints.