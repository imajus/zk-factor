# Tasks

## Leo Contract

- [ ] Add `InvoiceOffer` record type to main.leo
- [ ] Add `authorize_factoring` transition + finalize
- [ ] Add `execute_factoring` transition + finalize
- [ ] Delete old `factor_invoice` transition + finalize
- [ ] Update program name for redeployment (zk_factor_v2.aleo)

## Frontend

- [ ] Search for `factor_invoice` in hooks and replace with two calls
- [ ] Step 1: business calls `authorize_factoring`
- [ ] Step 2: factor calls `execute_factoring`
- [ ] Update VITE_ALEO_PROGRAM_ID in .env after redeploy
