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

function parseMappingField(plaintext: string, field: string): string {
  for (const line of plaintext.split("\n")) {
    const t = line.trimStart();
    if (!t.startsWith(`${field}:`)) continue;
    // Record field format: "field: value.private" or "field: value.public"
    const m = t.match(/^[^:]+:\s*(.+?)\.(?:private|public)/);
    if (m) return m[1].trim();
    // Mapping/struct format: "field: value," or "field: value"
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
// RECOURSE
// ─────────────────────────────────────────────────────────────

/**
 * Checks whether a recourse claim is currently active for an invoice.
 * Returns true if initiate_recourse has been called but settle_recourse has not.
 */
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

/**
 * Build execute inputs for initiate_recourse.
 * Factor calls this when debtor has not paid past due_date.
 * factored: serialized FactoredInvoice record plaintext
 */
export function buildInitiateRecourseInputs(factored: string): string[] {
  return [factored];
}

/**
 * Build execute inputs for settle_recourse.
 * Business calls this to repay the factor's advance and clear the claim.
 * notice: serialized RecourseNotice record plaintext
 * creditsRecord: serialized credits.aleo/credits record plaintext
 */
export function buildSettleRecourseInputs(
  notice: string,
  creditsRecord: string,
): string[] {
  return [notice, creditsRecord];
}

// ─────────────────────────────────────────────────────────────
// POOLS
// ─────────────────────────────────────────────────────────────

/**
 * Fetches the total amount contributed to a pool from the on-chain mapping.
 * Returns null if the pool does not exist.
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
    const raw = String(value).replace(/u64$/, "").trim();
    return BigInt(raw);
  } catch {
    return null;
  }
}

/**
 * Fetches the owner address of a pool.
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
 * Returns true if the pool has been closed (execute_pool_factoring was called).
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
 * Build inputs for create_pool transition.
 */
export function buildCreatePoolInputs(
  invoiceHash: string,
  targetAmount: bigint,
): string[] {
  return [invoiceHash, `${targetAmount}u64`];
}

/**
 * Build inputs for contribute_to_pool transition.
 * existingTotal: current pool_contributions[invoiceHash] read from chain before calling.
 * contribution: amount in microcredits to contribute.
 */
export function buildContributeToPoolInputs(
  invoiceHash: string,
  poolOwner: string,
  existingTotal: bigint,
  creditsRecord: string,
  contribution: bigint,
): string[] {
  return [
    invoiceHash,
    poolOwner,
    `${existingTotal}u64`,
    creditsRecord,
    `${contribution}u64`,
  ];
}

/**
 * Build inputs for execute_pool_factoring transition.
 */
export function buildExecutePoolFactoringInputs(
  offer: string,
  pool: string,
  creditsRecord: string,
): string[] {
  return [offer, pool, creditsRecord];
}

/**
 * Build inputs for claim_pool_proceeds transition.
 */
export function buildClaimPoolProceedsInputs(
  share: string,
  creditsRecord: string,
): string[] {
  return [share, creditsRecord];
}

// ─────────────────────────────────────────────────────────────
// EXISTING HELPERS (unchanged)
// ─────────────────────────────────────────────────────────────

// Call the correct execute transition based on currency
export function getExecuteTransition(currency: PaymentCurrency): string {
  return currency === "USDCx" ? "execute_factoring_token" : "execute_factoring";
}

// Inputs differ: credits path needs a private record, USDCx uses public balance
export function buildExecuteInputs(
  offer: string, // serialized FactoringOffer record
  advanceAmount: bigint,
  currency: PaymentCurrency,
  creditsRecord?: string, // only needed for ALEO path
): string[] {
  if (currency === "USDCx") {
    return [offer]; // USDCx: balance checked on-chain via public mapping
  }
  if (!creditsRecord)
    throw new Error("Credits record required for ALEO payment");
  return [offer, creditsRecord];
}
