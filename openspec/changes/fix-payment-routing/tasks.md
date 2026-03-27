# Tasks

## Leo Contract

- [x] Add `InvoiceOffer` record type to main.leo
- [x] Add `authorize_factoring` transition + finalize
- [x] Add `execute_factoring` transition + finalize
- [x] Delete old `factor_invoice` transition + finalize
- [x] Update program name for redeployment (zk_factor_v2.aleo)

## Frontend

- [x] Search for `factor_invoice` in hooks and replace with two calls
- [x] Step 1: business calls `authorize_factoring`
- [x] Step 2: factor calls `execute_factoring`
- [x] Update VITE_ALEO_PROGRAM_ID in .env after redeploy
