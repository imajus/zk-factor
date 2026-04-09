/**
 * pool-chain.ts
 *
 * Replaces pool-directory.ts (localStorage) with on-chain reads.
 * Every pool is stored in public Aleo mappings — readable by anyone
 * without a wallet connection.
 *
 * Pool enumeration works via the pool_registry storage array
 * (compiles to pool_registry__len__ and pool_registry__ mappings).
 */

import { AleoNetworkClient } from "@provablehq/sdk";
import { PROGRAM_ID, API_ENDPOINT, USDCX_PROGRAM_ID } from "@/lib/config";
import type { PaymentCurrency } from "@/lib/config";

// ── Types ─────────────────────────────────────────────────────────────

export interface OnChainPoolMeta {
  invoiceHash: string;
  nameU128: bigint;
  /** Human-readable name decoded from nameU128 */
  name: string;
  currency: PaymentCurrency;
  useToken: boolean;
  minAdvanceRate: number;
  maxAdvanceRate: number;
  minContribution: bigint;
  createdAt: number;
}

export interface OnChainPendingOffer {
  originalCreditor: string;
  debtor: string;
  amount: bigint;
  advanceRate: number;
  advanceAmount: bigint;
  dueDate: number;
  nonce: string;
  isExecuted: boolean;
}

export interface OnChainPoolState {
  meta: OnChainPoolMeta;
  totalContributed: bigint;
  isClosed: boolean;
  isSettled: boolean;
  voteCount: number;
  rejectCount: number;
  /** null = no offer submitted yet */
  pendingOffer: OnChainPendingOffer | null;
  /** null = pool_open_distribution not yet called */
  proceeds: bigint | null;
  distributed: bigint;
}

// ── Encoding / decoding ────────────────────────────────────────────────

/**
 * Encode ASCII string (max 16 chars) into u128.
 * Each character becomes one byte; left-padded with zeros.
 *
 * "PoolA" → 0x506f6f6c41000000000000000000000000n
 */
export function encodePoolName(name: string): bigint {
  const truncated = name.slice(0, 16);
  let result = 0n;
  for (const c of truncated) {
    result = (result << 8n) | BigInt(c.charCodeAt(0));
  }
  return result;
}

/**
 * Decode u128 back to ASCII pool name.
 * Stops at the first zero byte.
 */
export function decodePoolName(nameU128: bigint): string {
  if (nameU128 === 0n) return "";
  const bytes: number[] = [];
  let n = nameU128;
  for (let i = 0; i < 16; i++) {
    const b = Number(n & 0xffn);
    if (b === 0) break;
    bytes.unshift(b);
    n >>= 8n;
  }
  return bytes.map((b) => String.fromCharCode(b)).join("");
}

// ── Shared parser ──────────────────────────────────────────────────────

function parseField(plaintext: string, field: string): string {
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

function stripSuffix(s: string): string {
  return s.replace(/u(?:8|16|32|64|128|32)$/, "").trim();
}

async function safeGet(
  client: AleoNetworkClient,
  mapping: string,
  key: string,
): Promise<string | null> {
  try {
    const v = await client.getProgramMappingValue(PROGRAM_ID, mapping, key);
    return v ? String(v) : null;
  } catch {
    return null;
  }
}

// ── On-chain reads ─────────────────────────────────────────────────────

/** Total number of ownerless pools registered on-chain. */
export async function fetchPoolCount(): Promise<number> {
  const client = new AleoNetworkClient(API_ENDPOINT);
  const raw = await safeGet(client, "pool_registry__len__", "false");
  if (!raw) return 0;
  return parseInt(stripSuffix(raw), 10) || 0;
}

/** All pool invoice_hashes from the on-chain registry. */
export async function fetchPoolHashes(): Promise<string[]> {
  const client = new AleoNetworkClient(API_ENDPOINT);
  const len = await fetchPoolCount();
  if (len === 0) return [];
  const results = await Promise.all(
    Array.from({ length: len }, (_, i) =>
      client
        .getProgramMappingValue(PROGRAM_ID, "pool_registry__", `${i}u32`)
        .then((v) => String(v).trim())
        .catch(() => null),
    ),
  );
  return results.filter(Boolean) as string[];
}

/** Pool metadata for a single hash. Returns null if pool does not exist. */
export async function fetchPoolMeta(
  invoiceHash: string,
): Promise<OnChainPoolMeta | null> {
  const client = new AleoNetworkClient(API_ENDPOINT);
  const [raw, useTokenRaw] = await Promise.all([
    safeGet(client, "pool_meta", invoiceHash),
    safeGet(client, "pool_use_token", invoiceHash),
  ]);
  if (!raw) return null;
  const useToken = useTokenRaw?.trim() === "true";

  const nameU128Str = stripSuffix(parseField(raw, "name_u128"));
  const nameU128 = nameU128Str ? BigInt(nameU128Str) : 0n;
  const decoded = decodePoolName(nameU128);

  return {
    invoiceHash,
    nameU128,
    name: decoded || `Pool ${invoiceHash.slice(0, 10)}…`,
    currency: useToken ? "USDCx" : "ALEO",
    useToken,
    minAdvanceRate: parseInt(
      stripSuffix(parseField(raw, "min_advance_rate")) || "5000",
      10,
    ),
    maxAdvanceRate: parseInt(
      stripSuffix(parseField(raw, "max_advance_rate")) || "9900",
      10,
    ),
    minContribution: BigInt(
      stripSuffix(parseField(raw, "min_contribution")) || "5000000",
    ),
    createdAt: parseInt(stripSuffix(parseField(raw, "created_at")) || "0", 10),
  };
}

/** Pending offer submitted by a business, or null if none submitted yet. */
export async function fetchPendingOffer(
  invoiceHash: string,
): Promise<OnChainPendingOffer | null> {
  const client = new AleoNetworkClient(API_ENDPOINT);
  const raw = await safeGet(client, "pool_pending_offer", invoiceHash);
  if (!raw) return null;

  return {
    originalCreditor: parseField(raw, "original_creditor"),
    debtor: parseField(raw, "debtor"),
    amount: BigInt(stripSuffix(parseField(raw, "amount")) || "0"),
    advanceRate: parseInt(
      stripSuffix(parseField(raw, "advance_rate")) || "0",
      10,
    ),
    advanceAmount: BigInt(
      stripSuffix(parseField(raw, "advance_amount")) || "0",
    ),
    dueDate: parseInt(stripSuffix(parseField(raw, "due_date")) || "0", 10),
    nonce: parseField(raw, "nonce"),
    isExecuted: parseField(raw, "is_executed") === "true",
  };
}

/** Current vote count for a pool's pending offer. */
export async function fetchPoolVoteCount(invoiceHash: string): Promise<number> {
  const client = new AleoNetworkClient(API_ENDPOINT);
  const raw = await safeGet(client, "pool_vote_count", invoiceHash);
  if (!raw) return 0;
  return parseInt(stripSuffix(raw), 10) || 0;
}

/** Current reject vote count for a pool's pending offer. */
export async function fetchPoolRejectCount(
  invoiceHash: string,
): Promise<number> {
  const client = new AleoNetworkClient(API_ENDPOINT);
  const raw = await safeGet(client, "pool_reject_count", invoiceHash);
  if (!raw) return 0;
  return parseInt(stripSuffix(raw), 10) || 0;
}

/** Current active factor count (used to compute vote threshold). */
export async function fetchActiveFactorCount(): Promise<number> {
  const client = new AleoNetworkClient(API_ENDPOINT);
  const raw = await safeGet(client, "active_factor_count", "false");
  if (!raw) return 1; // default to 1 for bootstrapping
  return Math.max(1, parseInt(stripSuffix(raw), 10) || 1);
}

/**
 * Compute the majority vote threshold.
 * threshold = floor(active_count / 2) + 1
 */
export function computeVoteThreshold(activeFactorCount: number): number {
  return Math.floor(activeFactorCount / 2) + 1;
}

/** Full state for a single pool. Returns null if pool does not exist. */
export async function fetchPoolState(
  invoiceHash: string,
): Promise<OnChainPoolState | null> {
  const client = new AleoNetworkClient(API_ENDPOINT);

  const [
    meta,
    totalContribRaw,
    isClosedRaw,
    settledInvoiceRaw,
    voteCountRaw,
    rejectCountRaw,
    pendingOffer,
    proceedsRaw,
    distributedRaw,
  ] = await Promise.all([
    fetchPoolMeta(invoiceHash),
    safeGet(client, "pool_contributions", invoiceHash),
    safeGet(client, "pool_closed", invoiceHash),
    safeGet(client, "settled_invoices", invoiceHash),
    safeGet(client, "pool_vote_count", invoiceHash),
    safeGet(client, "pool_reject_count", invoiceHash),
    fetchPendingOffer(invoiceHash),
    safeGet(client, "pool_proceeds", invoiceHash),
    safeGet(client, "pool_distributed", invoiceHash),
  ]);

  if (!meta) return null;

  return {
    meta,
    totalContributed: BigInt(
      stripSuffix(totalContribRaw?.trim() ?? "0") || "0",
    ),
    isClosed: isClosedRaw?.trim() === "true",
    isSettled:
      !!settledInvoiceRaw &&
      parseField(settledInvoiceRaw, "is_settled") === "true",
    voteCount: parseInt(stripSuffix(voteCountRaw?.trim() ?? "0") || "0", 10),
    rejectCount: parseInt(
      stripSuffix(rejectCountRaw?.trim() ?? "0") || "0",
      10,
    ),
    pendingOffer,
    proceeds: proceedsRaw
      ? BigInt(stripSuffix(proceedsRaw.trim()) || "0")
      : null,
    distributed: BigInt(stripSuffix(distributedRaw?.trim() ?? "0") || "0"),
  };
}

/** Fetch all ownerless pools from chain. Safe to call without a wallet. */
export async function fetchAllPools(): Promise<OnChainPoolState[]> {
  const hashes = await fetchPoolHashes();
  const results = await Promise.all(
    hashes.map((h) => fetchPoolState(h).catch(() => null)),
  );
  return (results.filter(Boolean) as OnChainPoolState[]).sort(
    (a, b) => b.meta.createdAt - a.meta.createdAt,
  );
}

/**
 * Check a caller's public credits balance.
 * Returns 0n if the address has no public balance.
 */
export async function fetchPublicCreditsBalance(
  address: string,
): Promise<bigint> {
  const client = new AleoNetworkClient(API_ENDPOINT);
  try {
    const raw = await client.getProgramMappingValue(
      "credits.aleo",
      "account",
      address,
    );
    return BigInt(stripSuffix(String(raw).trim()) || "0");
  } catch {
    return 0n;
  }
}

/**
 * Check a caller's public USDCx balance.
 * Returns 0n if the address has no public balance.
 */
export async function fetchPublicTokenBalance(
  address: string,
): Promise<bigint> {
  const client = new AleoNetworkClient(API_ENDPOINT);
  try {
    const raw = await client.getProgramMappingValue(
      USDCX_PROGRAM_ID,
      "account",
      address,
    );
    return BigInt(stripSuffix(String(raw).trim()) || "0");
  } catch {
    return 0n;
  }
}

// ── Payout math ────────────────────────────────────────────────────────

/**
 * Mirrors the on-chain claim formula:
 *   floor(proceeds * contributed / totalContributions)
 *
 * Pass as expected_payout to claim_pool_proceeds.
 */
export function computePoolPayout(
  contributed: bigint,
  totalContributions: bigint,
  proceeds: bigint,
): bigint {
  if (contributed <= 0n || totalContributions <= 0n || proceeds <= 0n)
    return 0n;
  return (proceeds * contributed) / totalContributions;
}

// ── Pool stats helper ──────────────────────────────────────────────────

export interface PoolStats {
  raisedMicro: bigint;
  remainingMicro: bigint;
  percentFunded: number;
  isFullyFunded: boolean;
  isFullyDistributed: boolean;
  hasPendingOffer: boolean;
  isApproved: boolean;
  isRejected: boolean;
  allVotesCast: boolean;
  requiredVotes: number;
  approveCount: number;
  rejectCount: number;
  totalVotes: number;
  isExecuted: boolean;
  voteCount: number;
  threshold: number;
}

export function computePoolStats(
  pool: OnChainPoolState,
  activeFactorCount: number,
): PoolStats {
  const raisedMicro = pool.totalContributed;
  // In range-based pools, there's no funding target, so no "remaining" or "percent funded"
  const remainingMicro = 0n;
  const percentFunded = 0; // Not applicable in range-based model
  const requiredVotes = Math.max(1, activeFactorCount);
  const approveCount = pool.voteCount;
  const rejectCount = pool.rejectCount;
  const totalVotes = approveCount + rejectCount;
  const allVotesCast = totalVotes >= requiredVotes;
  const isApproved = allVotesCast && approveCount > rejectCount;
  const isRejected = allVotesCast && approveCount <= rejectCount;
  const isExecuted = pool.pendingOffer?.isExecuted ?? false;
  const isFullyDistributed =
    pool.proceeds !== null &&
    pool.proceeds > 0n &&
    pool.distributed >= pool.proceeds;

  return {
    raisedMicro,
    remainingMicro,
    percentFunded,
    isFullyFunded: true, // Range pools accept contributions at any level
    isFullyDistributed,
    hasPendingOffer: pool.pendingOffer !== null && !isExecuted,
    isApproved,
    isRejected,
    allVotesCast,
    requiredVotes,
    approveCount,
    rejectCount,
    totalVotes,
    isExecuted,
    voteCount: approveCount,
    threshold: requiredVotes,
  };
}

// ── Transaction input builders ─────────────────────────────────────────

export function buildCreateOwnerlessPoolInputs(
  invoiceHash: string,
  nameU128: bigint,
  minAdvanceRate: number,
  maxAdvanceRate: number,
  minContribution: bigint,
  useToken: boolean,
): string[] {
  return [
    invoiceHash,
    `${nameU128}u128`,
    `${minAdvanceRate}u16`,
    `${maxAdvanceRate}u16`,
    `${minContribution}u64`,
    `${useToken}`,
  ];
}

/** existing_total: current pool_contributions[invoiceHash] read from chain. */
export function buildPoolContributeInputs(
  invoiceHash: string,
  programAddr: string,
  contribution: bigint,
  existingTotal: bigint,
): string[] {
  return [
    invoiceHash,
    programAddr,
    `${contribution}u64`,
    `${existingTotal}u64`,
  ];
}

export function buildPoolSubmitInvoiceInputs(
  invoicePlaintext: string,
  poolHash: string,
  advanceRate: number,
): string[] {
  return [invoicePlaintext, poolHash, `${advanceRate}u16`];
}

export function buildPoolVoteInputs(invoiceHash: string): string[] {
  return [invoiceHash];
}

export function buildPoolVoteRejectInputs(invoiceHash: string): string[] {
  return [invoiceHash];
}

export function buildFinalizeRejectedPoolInputs(invoiceHash: string): string[] {
  return [invoiceHash];
}

export function buildExecuteApprovedPoolInputs(
  invoiceHash: string,
  businessAddr: string,
  debtorAddr: string,
  advanceAmount: bigint,
  invoiceAmount: bigint,
  dueDate: number,
): string[] {
  return [
    invoiceHash,
    businessAddr,
    debtorAddr,
    `${advanceAmount}u64`,
    `${invoiceAmount}u64`,
    `${dueDate}u64`,
  ];
}

export function buildPayPoolInvoiceInputs(
  noticePlaintext: string,
  programAddr: string,
): string[] {
  return [noticePlaintext, programAddr];
}

/** Pool distribution is permissionless — no params beyond the hash. */
export function buildPoolOpenDistributionInputs(invoiceHash: string): string[] {
  return [invoiceHash];
}

export function buildClaimPoolProceedsInputs(
  sharePlaintext: string,
  expectedPayout: bigint,
): string[] {
  return [sharePlaintext, `${expectedPayout}u64`];
}
