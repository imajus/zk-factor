# USDCx Payments

ZK Factor supports payments in USDCx, a stablecoin on the Aleo network, as an alternative to native ALEO tokens.

## Why Use USDCx?

- **Stable value** — pegged to USD, so the advance amount doesn't fluctuate with ALEO's price
- **Familiar pricing** — invoice amounts in dollars make more sense for most businesses
- **Same privacy** — USDCx transactions on Aleo have the same zero-knowledge privacy as ALEO

## How to Use It

### When Creating an Invoice

Select **USDCx** as the currency in the invoice creation form. The amount will be denominated in USDCx micro-units (6 decimal places, same as USDC).

<!-- screenshot: currency-selector.png — the currency dropdown showing ALEO and USDCx options -->

### When Factoring

When authorizing factoring, choose USDCx as the payment currency. The factor will send the advance in USDCx instead of ALEO.

## Requirements

- The factor must have sufficient USDCx balance (public) to fund the advance
- Transaction fees are still paid in ALEO regardless of invoice currency
- Both parties must be on the same network (testnet or mainnet)