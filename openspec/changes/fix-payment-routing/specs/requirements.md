# Requirements

## Functional

- Business must call `authorize_factoring(invoice, factor, advance_rate)`
- Factor must call `execute_factoring(offer, payment)`
- Credits must flow from factor → business (not business → business)
- Invoice serial number must be published in Step 1 (double-spend prevention)
- Factor must be registered and active at both steps

## Constraints

- Aleo: all record inputs must be owned by self.caller
- Cannot modify existing record structures (breaks on-chain compatibility)
- New record type `InvoiceOffer` required as handshake bridge
