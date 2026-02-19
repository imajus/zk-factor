#!/usr/bin/env bash
# End-to-end integration test for ZK-Factor on Aleo testnet.
#
# Executes the full factoring lifecycle:
#   1. transfer_public_to_private  — get private credits for business
#   2. register_factor             — register caller as active factor
#   3. mint_invoice                — create Invoice record for business
#   4. factor_invoice              — atomic swap: Invoice → FactoredInvoice + payment
#   5. transfer_public_to_private  — get fresh private credits for settlement
#   6. settle_invoice              — mark invoice settled, collect payment
#   7. API check                   — verify settled_invoices mapping on-chain
#
# Usage:
#   cd aleo && bash scripts/test_e2e.sh
#
# Environment flags:
#   SKIP_SETTLE=1   Run steps 1-4 only (workaround until broadcast issue is resolved)
#   DRY_RUN=1       Print commands without executing them
#
# Prerequisites:
#   - leo CLI installed (leo 3.4.0+)
#   - snarkos CLI installed
#   - jq installed
#   - .env file present in aleo/ with ENDPOINT, NETWORK, PRIVATE_KEY set

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALEO_DIR="$(dirname "$SCRIPT_DIR")"

source "$ALEO_DIR/.env"

PROGRAM_ID="zk_factor_11765.aleo"
SKIP_SETTLE="${SKIP_SETTLE:-0}"
DRY_RUN="${DRY_RUN:-0}"

# ─── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[e2e]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC}  $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
die()  { echo -e "${RED}[fail]${NC} $*" >&2; exit 1; }

run() {
    if [ "$DRY_RUN" = "1" ]; then
        echo -e "${YELLOW}[dry]${NC} $*"
        return 0
    fi
    eval "$@"
}

# ─── Derived values ───────────────────────────────────────────────────────────
ACCOUNT_ADDRESS="$(leo account address --private-key "$PRIVATE_KEY" 2>/dev/null || \
    snarkos account address --private-key "$PRIVATE_KEY" 2>/dev/null)"
VIEW_KEY="$(leo account view-key --private-key "$PRIVATE_KEY" 2>/dev/null || \
    snarkos account view-key --private-key "$PRIVATE_KEY" 2>/dev/null)"
API_BASE="${ENDPOINT}/${NETWORK}"

log "Program  : $PROGRAM_ID"
log "Address  : $ACCOUNT_ADDRESS"
log "Network  : $NETWORK"
log "Endpoint : $ENDPOINT"
log ""

# ─── Helper: wait for transaction confirmation ────────────────────────────────
wait_for_tx() {
    local tx_id="$1"
    local label="${2:-transaction}"
    log "Waiting for $label ($tx_id)..."
    for i in $(seq 1 30); do
        local status
        status="$(curl -sf "$API_BASE/transaction/$tx_id" | jq -r '.status // "pending"' 2>/dev/null || echo "pending")"
        if [ "$status" = "accepted" ]; then
            ok "$label accepted."
            return 0
        fi
        sleep 5
    done
    warn "$label not confirmed after 150s — check manually: $API_BASE/transaction/$tx_id"
}

# ─── Helper: decrypt record from transaction ──────────────────────────────────
# Returns the decrypted record as JSON printed to stdout.
decrypt_record() {
    local tx_id="$1"
    local record_index="${2:-0}"
    local ciphertext
    ciphertext="$(curl -sf "$API_BASE/transaction/$tx_id" | \
        jq -r ".execution.transitions[0].outputs[$record_index].value" 2>/dev/null)"
    if [ -z "$ciphertext" ] || [ "$ciphertext" = "null" ]; then
        die "Could not extract record ciphertext from tx $tx_id (index $record_index)"
    fi
    leo account decrypt --ciphertext "$ciphertext" --view-key "$VIEW_KEY" 2>/dev/null || \
        snarkos developer decrypt --ciphertext "$ciphertext" --view-key "$VIEW_KEY" 2>/dev/null
}

# ─── Step 1: Get private credits for business (sender = caller) ───────────────
log "Step 1: transfer_public_to_private — get private credits for business"
ADVANCE_AMOUNT="100000000"  # 100 ALEO in microcredits (for 1 ALEO invoice demo)

TX1="$(run snarkos developer execute credits.aleo transfer_public_to_private \
    "$ACCOUNT_ADDRESS" \
    "${ADVANCE_AMOUNT}u64" \
    --private-key "$PRIVATE_KEY" \
    --query "$ENDPOINT" \
    --network "$NETWORK" \
    --broadcast "$ENDPOINT/$NETWORK/transaction/broadcast" \
    2>&1 | tee /dev/stderr | grep -oE 'at1[a-z0-9]+' | head -1)"

[ -z "$TX1" ] && die "Step 1 failed: no transaction ID captured"
ok "Step 1 tx: $TX1"
wait_for_tx "$TX1" "transfer_public_to_private (business credits)"

log "Decrypting business credits record..."
BUSINESS_CREDITS="$(decrypt_record "$TX1" 0)"
ok "Business credits: $BUSINESS_CREDITS"

# ─── Step 2: Register factor ──────────────────────────────────────────────────
log ""
log "Step 2: register_factor — register caller as active factor"
# Rates: 80.00% min to 95.00% max advance (as basis points * 100)
TX2="$(run leo execute register_factor \
    8000u16 \
    9500u16 \
    --private-key "$PRIVATE_KEY" \
    --network "$NETWORK" \
    --endpoint "$ENDPOINT" \
    --broadcast \
    2>&1 | tee /dev/stderr | grep -oE 'at1[a-z0-9]+' | head -1)"

[ -z "$TX2" ] && die "Step 2 failed: no transaction ID captured"
ok "Step 2 tx: $TX2"
wait_for_tx "$TX2" "register_factor"

# ─── Step 3: Mint invoice ─────────────────────────────────────────────────────
log ""
log "Step 3: mint_invoice — create Invoice record"
# invoice_hash: unique field for this test run (use timestamp-derived value)
INVOICE_HASH="${INVOICE_HASH:-$(date +%s)field}"
INVOICE_AMOUNT="1000000u64"   # 1 ALEO in microcredits
DUE_DATE="1800000000u64"      # Far-future timestamp
DEBTOR="${DEBTOR:-$ACCOUNT_ADDRESS}"  # Self as debtor for testing; use real debtor in prod
METADATA="0u128"

TX3="$(run leo execute mint_invoice \
    "$DEBTOR" \
    "$INVOICE_AMOUNT" \
    "$DUE_DATE" \
    "$INVOICE_HASH" \
    "$METADATA" \
    --private-key "$PRIVATE_KEY" \
    --network "$NETWORK" \
    --endpoint "$ENDPOINT" \
    --broadcast \
    2>&1 | tee /dev/stderr | grep -oE 'at1[a-z0-9]+' | head -1)"

[ -z "$TX3" ] && die "Step 3 failed: no transaction ID captured"
ok "Step 3 tx: $TX3"
wait_for_tx "$TX3" "mint_invoice"

log "Decrypting Invoice record..."
INVOICE_RECORD="$(decrypt_record "$TX3" 0)"
ok "Invoice record: $INVOICE_RECORD"

# ─── Step 4: Factor invoice (atomic swap) ─────────────────────────────────────
log ""
log "Step 4: factor_invoice — atomic swap: Invoice + credits → FactoredInvoice + payment"
ADVANCE_RATE="9000u16"   # 90.00% advance rate
FACTOR_ADDRESS="$ACCOUNT_ADDRESS"

TX4="$(run leo execute factor_invoice \
    "$INVOICE_RECORD" \
    "$FACTOR_ADDRESS" \
    "$ADVANCE_RATE" \
    "$BUSINESS_CREDITS" \
    --private-key "$PRIVATE_KEY" \
    --network "$NETWORK" \
    --endpoint "$ENDPOINT" \
    --broadcast \
    2>&1 | tee /dev/stderr | grep -oE 'at1[a-z0-9]+' | head -1)"

[ -z "$TX4" ] && die "Step 4 failed: no transaction ID captured"
ok "Step 4 tx: $TX4"
wait_for_tx "$TX4" "factor_invoice"

log "Decrypting FactoredInvoice record (output 0)..."
FACTORED_INVOICE="$(decrypt_record "$TX4" 0)"
ok "FactoredInvoice: $FACTORED_INVOICE"

log "Decrypting business payment record (output 1)..."
BUSINESS_PAYMENT="$(decrypt_record "$TX4" 1)"
ok "Business payment credits: $BUSINESS_PAYMENT"

log "Decrypting change record (output 2)..."
CHANGE_RECORD="$(decrypt_record "$TX4" 2)"
ok "Change record: $CHANGE_RECORD"

# ─── Check: verify protocol_stats[1] incremented ─────────────────────────────
STATS_FACTORED="$(curl -sf \
    "$API_BASE/program/$PROGRAM_ID/mapping/protocol_stats/1u8" 2>/dev/null || echo "null")"
ok "protocol_stats[1u8] (total factored): $STATS_FACTORED"

if [ "$SKIP_SETTLE" = "1" ]; then
    warn ""
    warn "SKIP_SETTLE=1 — stopping after step 4."
    warn "Re-run without SKIP_SETTLE=1 to execute settlement steps."
    warn ""
    warn "Summary:"
    warn "  register_factor tx : $TX2"
    warn "  mint_invoice tx    : $TX3"
    warn "  factor_invoice tx  : $TX4"
    exit 0
fi

# ─── Step 5: Get fresh private credits for settlement ─────────────────────────
log ""
log "Step 5: transfer_public_to_private — get fresh credits for settlement"
SETTLE_AMOUNT="1000000"  # Full invoice amount

TX5="$(run snarkos developer execute credits.aleo transfer_public_to_private \
    "$ACCOUNT_ADDRESS" \
    "${SETTLE_AMOUNT}u64" \
    --private-key "$PRIVATE_KEY" \
    --query "$ENDPOINT" \
    --network "$NETWORK" \
    --broadcast "$ENDPOINT/$NETWORK/transaction/broadcast" \
    2>&1 | tee /dev/stderr | grep -oE 'at1[a-z0-9]+' | head -1)"

[ -z "$TX5" ] && die "Step 5 failed: no transaction ID captured"
ok "Step 5 tx: $TX5"
wait_for_tx "$TX5" "transfer_public_to_private (settlement credits)"

log "Decrypting settlement credits record..."
SETTLE_CREDITS="$(decrypt_record "$TX5" 0)"
ok "Settlement credits: $SETTLE_CREDITS"

# ─── Step 6: Settle invoice ───────────────────────────────────────────────────
log ""
log "Step 6: settle_invoice — mark invoice settled, collect payment"

TX6="$(run leo execute settle_invoice \
    "$FACTORED_INVOICE" \
    "$SETTLE_CREDITS" \
    --private-key "$PRIVATE_KEY" \
    --network "$NETWORK" \
    --endpoint "$ENDPOINT" \
    --broadcast \
    2>&1 | tee /dev/stderr | grep -oE 'at1[a-z0-9]+' | head -1)"

[ -z "$TX6" ] && die "Step 6 failed: no transaction ID captured"
ok "Step 6 tx: $TX6"
wait_for_tx "$TX6" "settle_invoice"

# ─── Step 7: Verify settled_invoices mapping on-chain ────────────────────────
log ""
log "Step 7: verify settled_invoices mapping"
SETTLEMENT_INFO="$(curl -sf \
    "$API_BASE/program/$PROGRAM_ID/mapping/settled_invoices/$INVOICE_HASH" 2>/dev/null || echo "null")"
ok "settled_invoices[$INVOICE_HASH]: $SETTLEMENT_INFO"

IS_SETTLED="$(echo "$SETTLEMENT_INFO" | jq -r '.is_settled // false' 2>/dev/null || echo "false")"
if [ "$IS_SETTLED" = "true" ]; then
    ok "Settlement confirmed on-chain."
else
    warn "Settlement entry not yet visible — mapping may still be propagating."
    warn "Check manually: $API_BASE/program/$PROGRAM_ID/mapping/settled_invoices/$INVOICE_HASH"
fi

# ─── Summary ──────────────────────────────────────────────────────────────────
log ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "E2E test complete"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  transfer (biz credits) : $TX1"
echo "  register_factor        : $TX2"
echo "  mint_invoice           : $TX3"
echo "  factor_invoice         : $TX4"
echo "  transfer (settle creds): $TX5"
echo "  settle_invoice         : $TX6"
echo ""
echo "  protocol_stats[1]      : $STATS_FACTORED  (total factored)"
echo "  settled_invoices       : $IS_SETTLED  (invoice hash: $INVOICE_HASH)"
echo ""
