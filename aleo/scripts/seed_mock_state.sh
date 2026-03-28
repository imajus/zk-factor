#!/usr/bin/env bash
# Seed a deployed zk_factor Aleo program with mock state for demos.
#
# Scenario:
# - Factor1 register
# - Factor2 register
# - Creditor mints 10 invoices in USDCx metadata, amounts 0.1..1.0 (micro-units)
# - Due dates staggered by days: 1,2,3,4,5,6,7,8,9,11
# - Invoice #1 and #3 authorized to Factor1
# - Invoice #2 and #4 authorized to Factor2
# - Factor1 accepts invoice #1
# - Factor2 accepts invoice #2
#
# Usage:
#   cd aleo
#   cp scripts/seed_mock_state.env.example .env.seed
#   # fill private keys and endpoint/network/program
#   bash scripts/seed_mock_state.sh .env.seed
#
# Optional behavior flags in env:
#   DRY_RUN=1                  Print actions but do not execute transitions
#   WAIT_CONFIRM=1             Wait for tx confirmation (default: 1)
#   USE_TOKEN_PATH=0           0 = native credits path (default), 1 = USDC token path
#   FUND_NATIVE_FACTORS=1      Pre-create private credits for factors when USE_TOKEN_PATH=0 (default: 1)
#   FACTOR_NATIVE_FUND_MICRO=3000000
#   REGISTER_MIN_RATE_BPS=8000
#   REGISTER_MAX_RATE_BPS=9500
#   OFFER_RATE_BPS=9000

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALEO_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="${1:-$ALEO_DIR/.env.seed}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
else
  echo "Missing env file: $ENV_FILE"
  echo "Create one from scripts/seed_mock_state.env.example"
  exit 1
fi

if [[ -f "$ALEO_DIR/.env" ]]; then
  # Optional fallback for ENDPOINT/NETWORK from default env file.
  # shellcheck disable=SC1090
  source "$ALEO_DIR/.env"
fi

PROGRAM_ID="${PROGRAM_ID:-$(jq -r '.program' "$ALEO_DIR/program.json") }"
NETWORK="${NETWORK:-testnet}"
ENDPOINT="${ENDPOINT:-https://api.explorer.provable.com/v1}"
API_BASE="${ENDPOINT%/}/${NETWORK}"

DRY_RUN="${DRY_RUN:-0}"
WAIT_CONFIRM="${WAIT_CONFIRM:-1}"
USE_TOKEN_PATH="${USE_TOKEN_PATH:-0}"
FUND_NATIVE_FACTORS="${FUND_NATIVE_FACTORS:-1}"
FACTOR_NATIVE_FUND_MICRO="${FACTOR_NATIVE_FUND_MICRO:-3000000}"
REGISTER_MIN_RATE_BPS="${REGISTER_MIN_RATE_BPS:-8000}"
REGISTER_MAX_RATE_BPS="${REGISTER_MAX_RATE_BPS:-9500}"
OFFER_RATE_BPS="${OFFER_RATE_BPS:-9000}"

: "${CREDITOR_PRIVATE_KEY:?CREDITOR_PRIVATE_KEY is required}"
: "${FACTOR1_PRIVATE_KEY:?FACTOR1_PRIVATE_KEY is required}"
: "${FACTOR2_PRIVATE_KEY:?FACTOR2_PRIVATE_KEY is required}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[seed]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC}   $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
die()  { echo -e "${RED}[fail]${NC} $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

require_cmd jq
require_cmd curl
require_cmd leo
require_cmd snarkos

account_address() {
  local pk="$1"
  leo account address --private-key "$pk" 2>/dev/null || \
    snarkos account address --private-key "$pk" 2>/dev/null
}

account_view_key() {
  local pk="$1"
  leo account view-key --private-key "$pk" 2>/dev/null || \
    snarkos account view-key --private-key "$pk" 2>/dev/null
}

extract_tx_id() {
  grep -oE 'at1[a-z0-9]+' | head -1
}

run_capture_tx() {
  local cmd="$1"
  if [[ "$DRY_RUN" == "1" ]]; then
    echo -e "${YELLOW}[dry]${NC} $cmd" >&2
    echo "dry_tx"
    return 0
  fi

  local out
  set +e
  out="$(eval "$cmd" 2>&1)"
  local rc=$?
  set -e

  echo "$out" >&2
  [[ $rc -ne 0 ]] && return $rc

  local tx
  tx="$(echo "$out" | extract_tx_id)"
  [[ -z "$tx" ]] && return 1
  echo "$tx"
}

wait_for_tx() {
  local tx_id="$1"
  local label="${2:-transaction}"

  [[ "$DRY_RUN" == "1" ]] && return 0
  [[ "$WAIT_CONFIRM" != "1" ]] && return 0

  log "Waiting for $label: $tx_id"
  for _ in $(seq 1 40); do
    local status
    status="$(curl -sf "$API_BASE/transaction/$tx_id" | jq -r '.status // "pending"' 2>/dev/null || echo "pending")"
    if [[ "$status" == "accepted" ]]; then
      ok "$label accepted"
      return 0
    fi
    sleep 4
  done
  warn "$label not confirmed in time: $tx_id"
}

decrypt_record() {
  local tx_id="$1"
  local view_key="$2"
  local output_index="${3:-0}"

  [[ "$DRY_RUN" == "1" ]] && {
    echo "{owner: aleo1dummy.private, amount: 100000u64.private, due_date: 1800000000u64.private, invoice_hash: 1field.private, nonce: 1field.private, metadata: 1u128.private, document_cid: 0field.private}"
    return 0
  }

  local ciphertext
  ciphertext="$(curl -sf "$API_BASE/transaction/$tx_id" | jq -r ".execution.transitions[0].outputs[$output_index].value" 2>/dev/null)"
  [[ -z "$ciphertext" || "$ciphertext" == "null" ]] && die "Could not extract output[$output_index] from tx $tx_id"

  leo account decrypt --ciphertext "$ciphertext" --view-key "$view_key" 2>/dev/null || \
    snarkos developer decrypt --ciphertext "$ciphertext" --view-key "$view_key" 2>/dev/null
}

leo_execute() {
  local pk="$1"
  shift
  local cmd="leo execute $* --private-key '$pk' --network '$NETWORK' --endpoint '$ENDPOINT' --broadcast"
  run_capture_tx "$cmd"
}

credits_execute() {
  local pk="$1"
  shift
  local cmd="snarkos developer execute credits.aleo $* --private-key '$pk' --query '$ENDPOINT' --network '$NETWORK' --broadcast '$ENDPOINT/$NETWORK/transaction/broadcast'"
  run_capture_tx "$cmd"
}

usdcx_execute() {
  local pk="$1"
  shift
  local cmd="snarkos developer execute test_usdcx_stablecoin.aleo $* --private-key '$pk' --query '$ENDPOINT' --network '$NETWORK' --broadcast '$ENDPOINT/$NETWORK/transaction/broadcast'"
  run_capture_tx "$cmd"
}

# Resolve addresses/keys
CREDITOR_ADDRESS="$(account_address "$CREDITOR_PRIVATE_KEY")"
FACTOR1_ADDRESS="$(account_address "$FACTOR1_PRIVATE_KEY")"
FACTOR2_ADDRESS="$(account_address "$FACTOR2_PRIVATE_KEY")"
CREDITOR_VIEW_KEY="$(account_view_key "$CREDITOR_PRIVATE_KEY")"
FACTOR1_VIEW_KEY="$(account_view_key "$FACTOR1_PRIVATE_KEY")"
FACTOR2_VIEW_KEY="$(account_view_key "$FACTOR2_PRIVATE_KEY")"

if [[ -n "${DEBTOR_PRIVATE_KEY:-}" ]]; then
  DEBTOR_ADDRESS="$(account_address "$DEBTOR_PRIVATE_KEY")"
elif [[ -n "${DEBTOR_ADDRESS:-}" ]]; then
  DEBTOR_ADDRESS="$DEBTOR_ADDRESS"
else
  die "Provide DEBTOR_PRIVATE_KEY or DEBTOR_ADDRESS"
fi

log "Program         : $PROGRAM_ID"
log "Network         : $NETWORK"
log "Endpoint        : $ENDPOINT"
log "Creditor        : $CREDITOR_ADDRESS"
log "Debtor          : $DEBTOR_ADDRESS"
log "Factor1         : $FACTOR1_ADDRESS"
log "Factor2         : $FACTOR2_ADDRESS"
log "Use token path  : $USE_TOKEN_PATH"

# 1) Register factors
log "Registering Factor1"
if tx="$(leo_execute "$FACTOR1_PRIVATE_KEY" register_factor "${REGISTER_MIN_RATE_BPS}u16" "${REGISTER_MAX_RATE_BPS}u16")"; then
  ok "Factor1 register tx: $tx"
  wait_for_tx "$tx" "register_factor Factor1"
else
  warn "Factor1 registration failed (possibly already registered). Continuing."
fi

log "Registering Factor2"
if tx="$(leo_execute "$FACTOR2_PRIVATE_KEY" register_factor "${REGISTER_MIN_RATE_BPS}u16" "${REGISTER_MAX_RATE_BPS}u16")"; then
  ok "Factor2 register tx: $tx"
  wait_for_tx "$tx" "register_factor Factor2"
else
  warn "Factor2 registration failed (possibly already registered). Continuing."
fi

# Optional native credits funding for factor accept steps.
if [[ "$USE_TOKEN_PATH" != "1" && "$FUND_NATIVE_FACTORS" == "1" ]]; then
  log "Creating native private credits for Factor1"
  tx="$(credits_execute "$FACTOR1_PRIVATE_KEY" transfer_public_to_private "$FACTOR1_ADDRESS" "${FACTOR_NATIVE_FUND_MICRO}u64")" || \
    die "Failed to create private credits for Factor1"
  ok "Factor1 credits tx: $tx"
  wait_for_tx "$tx" "factor1 transfer_public_to_private"
  FACTOR1_PAYMENT_RECORD="$(decrypt_record "$tx" "$FACTOR1_VIEW_KEY" 0)"

  log "Creating native private credits for Factor2"
  tx="$(credits_execute "$FACTOR2_PRIVATE_KEY" transfer_public_to_private "$FACTOR2_ADDRESS" "${FACTOR_NATIVE_FUND_MICRO}u64")" || \
    die "Failed to create private credits for Factor2"
  ok "Factor2 credits tx: $tx"
  wait_for_tx "$tx" "factor2 transfer_public_to_private"
  FACTOR2_PAYMENT_RECORD="$(decrypt_record "$tx" "$FACTOR2_VIEW_KEY" 0)"
fi

# 2) Mint 10 invoices (USDCx metadata flag set)
# Amounts: 0.1 to 1.0 in micro-units.
# Days: 1,2,3,4,5,6,7,8,9,11
DUE_DAYS=(1 2 3 4 5 6 7 8 9 11)

declare -a INVOICE_RECORDS

ts_base="$(date +%s)"

for i in $(seq 1 10); do
  amount_micro=$((100000 * i))
  due_days="${DUE_DAYS[$((i - 1))]}"
  due_unix="$(( $(date +%s) + due_days * 86400 ))"

  # Simple metadata encoding with USDC flag bit set (LSB = 1).
  # Higher bits include invoice index for uniqueness/readability.
  metadata_u128="$(( (i << 8) | 1 ))"
  invoice_hash="$((ts_base * 100 + i))field"

  log "Mint invoice #$i amount=${amount_micro}u64 due_in=${due_days}d"
  tx="$(leo_execute "$CREDITOR_PRIVATE_KEY" mint_invoice "$DEBTOR_ADDRESS" "${amount_micro}u64" "${due_unix}u64" "$invoice_hash" "${metadata_u128}u128" "0field")" || \
    die "mint_invoice failed for #$i"

  ok "Invoice #$i mint tx: $tx"
  wait_for_tx "$tx" "mint_invoice #$i"

  INVOICE_RECORDS[$i]="$(decrypt_record "$tx" "$CREDITOR_VIEW_KEY" 0)"
done

# 3) Authorize factoring for invoices 1..4
# #1 -> Factor1, #2 -> Factor2, #3 -> Factor1, #4 -> Factor2

declare -a OFFER_RECORDS

authorize_for_factor() {
  local invoice_idx="$1"
  local factor_label="$2"
  local factor_address="$3"

  local invoice_record="${INVOICE_RECORDS[$invoice_idx]}"
  [[ -z "$invoice_record" ]] && die "Missing invoice record for index $invoice_idx"

  log "Authorize invoice #$invoice_idx to $factor_label"
  tx="$(leo_execute "$CREDITOR_PRIVATE_KEY" authorize_factoring "$invoice_record" "$factor_address" "${OFFER_RATE_BPS}u16" "$([[ "$USE_TOKEN_PATH" == "1" ]] && echo true || echo false)" false)" || \
    die "authorize_factoring failed for invoice #$invoice_idx"

  ok "Invoice #$invoice_idx offer tx: $tx"
  wait_for_tx "$tx" "authorize_factoring #$invoice_idx"

  local factor_view_key
  if [[ "$factor_label" == "Factor1" ]]; then
    factor_view_key="$FACTOR1_VIEW_KEY"
  else
    factor_view_key="$FACTOR2_VIEW_KEY"
  fi

  OFFER_RECORDS[$invoice_idx]="$(decrypt_record "$tx" "$factor_view_key" 0)"
}

authorize_for_factor 1 "Factor1" "$FACTOR1_ADDRESS"
authorize_for_factor 2 "Factor2" "$FACTOR2_ADDRESS"
authorize_for_factor 3 "Factor1" "$FACTOR1_ADDRESS"
authorize_for_factor 4 "Factor2" "$FACTOR2_ADDRESS"

# 4) Accept first and second offers
accept_offer() {
  local invoice_idx="$1"
  local factor_label="$2"
  local factor_pk="$3"
  local offer_record="${OFFER_RECORDS[$invoice_idx]}"

  [[ -z "$offer_record" ]] && die "Missing offer record for invoice #$invoice_idx"

  if [[ "$USE_TOKEN_PATH" == "1" ]]; then
    # Compute advance amount: (invoice_amount * rate_bps) / 10000
    local invoice_amount=$((100000 * invoice_idx))
    local advance_amount=$(( (invoice_amount * OFFER_RATE_BPS) / 10000 ))

    log "$factor_label approving USDCx spend for invoice #$invoice_idx (${advance_amount})"
    tx="$(usdcx_execute "$factor_pk" approve_public "$PROGRAM_ID" "${advance_amount}u128")" || \
      die "$factor_label failed approve_public for invoice #$invoice_idx"
    wait_for_tx "$tx" "$factor_label approve_public #$invoice_idx"

    log "$factor_label accepting invoice #$invoice_idx via token path"
    tx="$(leo_execute "$factor_pk" execute_factoring_token "$offer_record")" || \
      die "$factor_label failed execute_factoring_token for invoice #$invoice_idx"
  else
    local payment_record
    if [[ "$factor_label" == "Factor1" ]]; then
      payment_record="$FACTOR1_PAYMENT_RECORD"
    else
      payment_record="$FACTOR2_PAYMENT_RECORD"
    fi
    [[ -z "$payment_record" ]] && die "Missing native payment record for $factor_label"

    log "$factor_label accepting invoice #$invoice_idx via native path"
    tx="$(leo_execute "$factor_pk" execute_factoring "$offer_record" "$payment_record")" || \
      die "$factor_label failed execute_factoring for invoice #$invoice_idx"
  fi

  ok "$factor_label accepted invoice #$invoice_idx tx: $tx"
  wait_for_tx "$tx" "$factor_label accept invoice #$invoice_idx"
}

accept_offer 1 "Factor1" "$FACTOR1_PRIVATE_KEY"
accept_offer 2 "Factor2" "$FACTOR2_PRIVATE_KEY"

log "------------------------------------------------------------"
ok "Mock seed complete"
log "Seeded: 10 invoices (USDC metadata), 4 offers, 2 accepted"
log "Mappings requested: #1/#3 -> Factor1, #2/#4 -> Factor2"
log "Accepted: Factor1->#1 and Factor2->#2"
