export interface PendingFactoringRequest {
  invoiceHash: string;
  factorAddress: string;
  debtor: string;
  amountMicro: number;
  currency: "ALEO" | "USDCx";
  dueDateUnix: number;
  requestedAt: number;
}

type PendingFactoringStore = Record<string, PendingFactoringRequest[]>;

const PENDING_FACTORING_KEY = "zkfactor.pending_factoring.v1";

function readStore(): PendingFactoringStore {
  try {
    const raw = localStorage.getItem(PENDING_FACTORING_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PendingFactoringStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(value: PendingFactoringStore): void {
  try {
    localStorage.setItem(PENDING_FACTORING_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures in restricted/private modes.
  }
}

export function listPendingFactoringRequests(
  creditorAddress: string,
): PendingFactoringRequest[] {
  if (!creditorAddress) return [];
  const store = readStore();
  const list = store[creditorAddress] ?? [];
  return [...list].sort((a, b) => b.requestedAt - a.requestedAt);
}

export function upsertPendingFactoringRequest(
  creditorAddress: string,
  request: PendingFactoringRequest,
): void {
  if (!creditorAddress || !request.invoiceHash) return;
  const store = readStore();
  const current = store[creditorAddress] ?? [];
  const next = current.filter((r) => r.invoiceHash !== request.invoiceHash);
  next.push(request);
  store[creditorAddress] = next;
  writeStore(store);
}

export function removePendingFactoringRequest(
  creditorAddress: string,
  invoiceHash: string,
): void {
  if (!creditorAddress || !invoiceHash) return;
  const store = readStore();
  const current = store[creditorAddress] ?? [];
  store[creditorAddress] = current.filter((r) => r.invoiceHash !== invoiceHash);
  writeStore(store);
}
