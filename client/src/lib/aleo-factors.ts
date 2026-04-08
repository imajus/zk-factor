import { AleoNetworkClient } from "@provablehq/sdk";
import { PROGRAM_ID, API_ENDPOINT } from "@/lib/config";
import { PaymentCurrency } from "@/lib/config";

export interface FactorInfo {
  address: string;
  is_active: boolean;
  min_advance_rate: number;
  max_advance_rate: number;
  total_factored: number;
  registration_date: number;
}

export interface FactorStatus {
  is_active: boolean;
  min_advance_rate: number;
  max_advance_rate: number;
}

export interface PoolInfo {
  invoice_hash: string;
  owner: string;
  total_contributed: bigint;
  is_closed: boolean;
}

export interface SettlementInfo {
  is_settled: boolean;
  settlement_date: number;
  factor: string;
  /** Full invoice amount recorded at settlement time. 0 if not yet settled or pre-upgrade entry. */
  amount: bigint;
}

export interface PoolPayoutStatus {
  proceeds: bigint | null;       // null = open_pool_distribution not yet called
  distributed: bigint;           // how much has been paid out so far
  remaining: bigint;             // proceeds - distributed
  isFullyDistributed: boolean;   // distributed >= proceeds
}

function parseMappingField(plaintext: string, field: string): string {
  for (const line of plaintext.split("\n")) {
    const t = line.trimStart();
    if (!t.startsWith(`${field}:`)) continue;
    const m = t.match(/^[^:]+:\s*(.+?)\.(?:private|public)/);
    if (m) return m[1].trim();
    const s = t.match(/^[^:]+:\s*(.+?)(?:,\s*)?$/);
    if (s) return s[1].replace(/,$/, "").trim();
  }
  return "";
}

export function parseFactorInfo(
  address: string,
  plaintext: string,
): FactorInfo {
  return {
    address,
    is_active: parseMappingField(plaintext, "is_active") === "true",
    min_advance_rate: parseInt(
      parseMappingField(plaintext, "min_advance_rate"),
      10,
    ),
    max_advance_rate: parseInt(
      parseMappingField(plaintext, "max_advance_rate"),
      10,
    ),
    total_factored: parseInt(
      parseMappingField(plaintext, "total_factored"),
      10,
    ),
    registration_date: parseInt(
      parseMappingField(plaintext, "registration_date"),
      10,
    ),
  };
}

export async function fetchActiveFactors(): Promise<FactorInfo[]> {
  const client = new AleoNetworkClient(API_ENDPOINT);
  const lenRaw = await client.getProgramMappingValue(
    PROGRAM_ID,
    "factor_addresses__len__",
    "false",
  );
  const len = parseInt(String(lenRaw), 10);
  if (!len) return [];
  const indices = Array.from({ length: len }, (_, i) => i);
  const addresses = await Promise.all(
    indices.map((i) =>
      client.getProgramMappingValue(
        PROGRAM_ID,
        "factor_addresses__",
        `${i}u32`,
      ),
    ),
  );
  const infos = await Promise.all(
    addresses.map((addr) =>
      client.getProgramMappingValue(PROGRAM_ID, "active_factors", String(addr)),
    ),
  );
  return infos
    .map((raw, i) => parseFactorInfo(String(addresses[i]), String(raw)))
    .filter((f) => f.is_active);
}

export async function fetchFactorStatus(
  address: string,
): Promise<FactorStatus | null> {
  try {
    const client = new AleoNetworkClient(API_ENDPOINT);
    const value = await client.getProgramMappingValue(
      PROGRAM_ID,
      "active_factors",
      address,
    );
    return {
      is_active: parseMappingField(String(value), "is_active") === "true",
      min_advance_rate: parseInt(
        parseMappingField(String(value), "min_advance_rate"),
        10,
      ),
      max_advance_rate: parseInt(
        parseMappingField(String(value), "max_advance_rate"),
        10,
      ),
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// SETTLEMENT
// ─────────────────────────────────────────────────────────────

/**
 * Returns full SettlementInfo including amount, or null if the invoice is not settled.
 * The amount field was added in this version of the contract — entries written by the
 * previous contract version will parse amount as 0n.
 */
export async function fetchSettlementInfo(
  invoiceHash: string,
): Promise<SettlementInfo | null> {
  try {
    const client = new AleoNetworkClient(API_ENDPOINT);
    const value = await client.getProgramMappingValue(
      PROGRAM_ID,
      "settled_invoices",
      invoiceHash,
    );
    const raw = String(value);
    const isSettled = parseMappingField(raw, "is_settled") === "true";
    if (!isSettled) return null;
    const amountStr = parseMappingField(raw, "amount").replace(/u64$/, "");
    return {
      is_settled: true,
      settlement_date: parseInt(
        parseMappingField(raw, "settlement_date").replace(/u64$/, ""),
        10,
      ),
      factor: parseMappingField(raw, "factor"),
      amount: amountStr ? BigInt(amountStr) : 0n,
    };
  } catch {
    return null;
  }
}

/**
 * Convenience wrapper — returns true if the invoice is settled.
 */
export async function fetchInvoiceSettled(
  invoiceHash: string,
): Promise<boolean> {
  const info = await fetchSettlementInfo(invoiceHash);
  return info?.is_settled ?? false;
}

// ─────────────────────────────────────────────────────────────
// RECOURSE
// ─────────────────────────────────────────────────────────────

export async function fetchRecourseClaimStatus(
  invoiceHash: string,
): Promise<boolean> {
  try {
    const client = new AleoNetworkClient(API_ENDPOINT);
    const value = await client.getProgramMappingValue(
      PROGRAM_ID,
      "recourse_claims",
      invoiceHash,
    );
    return String(value).trim() === "true";
  } catch {
    return false;
  }
}

export function buildInitiateRecourseInputs(factored: string): string[] {
  return [factored];
}

export function buildSettleRecourseInputs(
  notice: string,
  creditsRecord: string,
): string[] {
  return [notice, creditsRecord];
}

// ─────────────────────────────────────────────────────────────
// POOLS — STATE READS
// ─────────────────────────────────────────────────────────────

/**
 * Returns total credits contributed to a pool, or null if pool does not exist.
 */
export async function fetchPoolContributions(
  invoiceHash: string,
): Promise<bigint | null> {
  try {
    const client = new AleoNetworkClient(API_ENDPOINT);
    const value = await client.getProgramMappingValue(
      PROGRAM_ID,
      "pool_contributions",
      invoiceHash,
    );
    return BigInt(String(value).replace(/u64$/, "").trim());
  } catch {
    return null;
  }
}

/**
 * Returns the pool owner's address, or null if pool does not exist.
 */
export async function fetchPoolOwner(
  invoiceHash: string,
): Promise<string | null> {
  try {
    const client = new AleoNetworkClient(API_ENDPOINT);
    const value = await client.getProgramMappingValue(
      PROGRAM_ID,
      "pool_owners",
      invoiceHash,
    );
    return String(value).trim();
  } catch {
    return null;
  }
}

/**
 * Returns true if execute_pool_factoring (or recover_pool_close) has been called.
 */
export async function fetchPoolClosed(invoiceHash: string): Promise<boolean> {
  try {
    const client = new AleoNetworkClient(API_ENDPOINT);
    const value = await client.getProgramMappingValue(
      PROGRAM_ID,
      "pool_closed",
      invoiceHash,
    );
    return String(value).trim() === "true";
  } catch {
    return false;
  }
}

/**
 * Returns the total proceeds registered for distribution (set by open_pool_distribution),
 * or null if open_pool_distribution has not been called yet.
 */
export async function fetchPoolProceeds(
  invoiceHash: string,
): Promise<bigint | null> {
  try {
    const client = new AleoNetworkClient(API_ENDPOINT);
    const value = await client.getProgramMappingValue(
      PROGRAM_ID,
      "pool_proceeds",
      invoiceHash,
    );
    return BigInt(String(value).replace(/u64$/, "").trim());
  } catch {
    return null;
  }
}

/**
 * Returns how many microcredits have been distributed from this pool so far.
 * Returns 0n if no distributions have occurred or pool_proceeds is not open.
 */
export async function fetchPoolDistributed(
  invoiceHash: string,
): Promise<bigint> {
  try {
    const client = new AleoNetworkClient(API_ENDPOINT);
    const value = await client.getProgramMappingValue(
      PROGRAM_ID,
      "pool_distributed",
      invoiceHash,
    );
    return BigInt(String(value).replace(/u64$/, "").trim());
  } catch {
    return 0n;
  }
}

/**
 * Fetches all payout accounting fields in one go for display in the pool owner UI.
 * Returns null if the pool does not exist.
 */
export async function fetchPoolPayoutStatus(
  invoiceHash: string,
): Promise<PoolPayoutStatus | null> {
  try {
    const [proceeds, distributed] = await Promise.all([
      fetchPoolProceeds(invoiceHash),
      fetchPoolDistributed(invoiceHash),
    ]);
    const remaining = proceeds != null ? proceeds - distributed : 0n;
    return {
      proceeds,
      distributed,
      remaining,
      isFullyDistributed: proceeds != null && distributed >= proceeds,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// POOLS — PAYOUT MATH
// ─────────────────────────────────────────────────────────────

/**
 * Computes the deterministic integer payout for a single contributor.
 * This mirrors the on-chain formula exactly:
 *   floor(proceeds * contributed / totalContributions)
 *
 * Pass this result as expected_payout to claim_pool_proceeds.
 * The finalize will re-derive and assert equality — no trust required.
 *
 * Returns 0n if any input is zero or if proceeds have not been opened.
 */
export function computeExpectedPoolPayout(
  contributed: bigint,
  totalContributions: bigint,
  proceeds: bigint,
): bigint {
  if (contributed <= 0n || totalContributions <= 0n || proceeds <= 0n) return 0n;
  return (proceeds * contributed) / totalContributions;
}

// ─────────────────────────────────────────────────────────────
// POOLS — TRANSACTION BUILDERS
// ─────────────────────────────────────────────────────────────

/**
 * Build inputs for open_pool_distribution transition.
 *
 * IMPORTANT: The pool owner must separately transfer settlement.amount credits to the
 * program's public address BEFORE calling this. Do this in sequence from the client:
 *
 *   Step 1:
 *     execute({ program: 'credits.aleo', function: 'transfer_public',
 *               inputs: [PROGRAM_ADDRESS, `${settlementAmount}u64`] })
 *
 *   Step 2:
 *     execute({ program: PROGRAM_ID, function: 'open_pool_distribution',
 *               inputs: buildOpenPoolDistributionInputs(invoiceHash) })
 *
 * PROGRAM_ADDRESS is the on-chain address of zk_factor_12250.aleo. Compute with:
 *   snarkos developer compute-program-address --program-id zk_factor_12250.aleo
 * and set VITE_PROGRAM_ADDRESS in your environment.
 */
export function buildOpenPoolDistributionInputs(invoiceHash: string): string[] {
  return [invoiceHash];
}

/**
 * Build inputs for claim_pool_proceeds transition.
 *
 * expected_payout must be computed via computeExpectedPoolPayout() using live
 * on-chain mapping values. The finalize will re-derive it and assert equality.
 *
 * Changed from previous version: no creditsRecord param. The payout now comes
 * from the program's public escrow balance funded by open_pool_distribution,
 * not from a caller-supplied record.
 */
export function buildClaimPoolProceedsInputs(
  share: string,           // serialized PoolShare record plaintext
  expectedPayout: bigint,
): string[] {
  return [share, `${expectedPayout}u64`];
}

// ─────────────────────────────────────────────────────────────
// EXISTING HELPERS (unchanged)
// ─────────────────────────────────────────────────────────────

export function getExecuteTransition(currency: PaymentCurrency): string {
  return currency === "USDCx" ? "execute_factoring_token" : "execute_factoring";
}

export function buildExecuteInputs(
  offer: string,
  advanceAmount: bigint,
  currency: PaymentCurrency,
  creditsRecord?: string,
): string[] {
  if (currency === "USDCx") {
    return [offer];
  }
  if (!creditsRecord)
    throw new Error("Credits record required for ALEO payment");
  return [offer, creditsRecord];
}