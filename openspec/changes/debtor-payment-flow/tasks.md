# Tasks

## Leo Contract (zk_factor_9591.aleo)

- [x] Add FactoringOffer record type
- [x] Add PaymentRequest struct
- [x] Add payment_requests mapping
- [x] Add authorize_factoring transition + finalize
- [x] Add execute_factoring transition + finalize
- [x] Add create_payment_request transition + finalize
- [x] Add pay_invoice transition (no internal credits call) + finalize
- [x] Remove factor_invoice (commented out)
- [x] Deploy as zk_factor_9591.aleo
- [x] Update VITE_ALEO_PROGRAM_ID in .env

## Frontend — /pay Page

- [x] Create src/pages/Pay.tsx
- [x] Auto-fill hash from ?hash= URL param
- [x] Lookup payment_requests mapping via AleoNetworkClient
- [x] Fix parsePaymentRequest for single-line mapping response
- [x] Show amount, due date, pay-to address, payment method
- [x] Warn if connected address ≠ request.debtor
- [x] Two-step payment: credits.aleo/transfer_public then pay_invoice
- [x] Success screen after payment confirmed
- [x] Add route /pay in App.tsx
- [x] handleLookup accepts optional hashOverride param

## Frontend — Invoices Page

- [x] Add Pending Offers tab (FactoringOffer records)
- [x] Add handleAcceptOffer (execute_factoring)
- [x] Auto-convert public credits to private if no private record found
- [x] Add "Request Payment" to FactoredInvoice dropdown
- [x] handleRequestPayment with friendly "already requested" error
- [x] Add "Copy Payment Link" to FactoredInvoice dropdown
- [x] Add "Copy Debtor Payment Link" to Invoice dropdown

## Frontend — Marketplace Page

- [x] Remove credits record check from handleFactorInvoice
- [x] Call authorize_factoring (not factor_invoice)
- [x] Inputs: invoice.recordPlaintext, factor.address, advance_rate u16

## Frontend — Header

- [x] Remove "Pay Invoice" from navItems
- [x] Add "Pay an Invoice" ghost button for non-connected users
- [x] filteredNavItems: public items always visible
