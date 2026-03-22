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
