export interface PoolParticipant {
  address: string;
  contributedMicro: number;
  updatedAt: number;
}

export interface PoolDirectoryEntry {
  invoiceHash: string;
  owner: string;
  targetAmountMicro: number;
  isClosed: boolean;
  participants: PoolParticipant[];
  updatedAt: number;
}

const POOL_DIRECTORY_KEY = "zkfactor.pool.directory";

function readDirectory(): Record<string, PoolDirectoryEntry> {
  try {
    const raw = localStorage.getItem(POOL_DIRECTORY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, PoolDirectoryEntry>) : {};
  } catch {
    return {};
  }
}

function writeDirectory(value: Record<string, PoolDirectoryEntry>): void {
  try {
    localStorage.setItem(POOL_DIRECTORY_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

export function upsertPoolCreation(input: {
  invoiceHash: string;
  owner: string;
  targetAmountMicro: number;
}): void {
  if (!input.invoiceHash || !input.owner) return;

  const existing = readDirectory();
  const prev = existing[input.invoiceHash];

  existing[input.invoiceHash] = {
    invoiceHash: input.invoiceHash,
    owner: input.owner,
    targetAmountMicro: input.targetAmountMicro,
    isClosed: prev?.isClosed ?? false,
    participants: prev?.participants ?? [],
    updatedAt: Date.now(),
  };

  writeDirectory(existing);
}

export function upsertPoolContribution(input: {
  invoiceHash: string;
  owner: string;
  targetAmountMicro?: number;
  contributor: string;
  contributedMicro: number;
}): void {
  if (!input.invoiceHash || !input.owner || !input.contributor) return;

  const existing = readDirectory();
  const prev = existing[input.invoiceHash] ?? {
    invoiceHash: input.invoiceHash,
    owner: input.owner,
    targetAmountMicro: input.targetAmountMicro ?? 0,
    isClosed: false,
    participants: [],
    updatedAt: Date.now(),
  };

  const withoutContributor = prev.participants.filter(
    (p) => p.address !== input.contributor,
  );

  const nextParticipant: PoolParticipant = {
    address: input.contributor,
    contributedMicro: input.contributedMicro,
    updatedAt: Date.now(),
  };

  existing[input.invoiceHash] = {
    ...prev,
    owner: input.owner,
    targetAmountMicro:
      input.targetAmountMicro !== undefined
        ? input.targetAmountMicro
        : prev.targetAmountMicro,
    participants: [...withoutContributor, nextParticipant],
    updatedAt: Date.now(),
  };

  writeDirectory(existing);
}

export function updatePoolClosed(invoiceHash: string, isClosed: boolean): void {
  if (!invoiceHash) return;

  const existing = readDirectory();
  const prev = existing[invoiceHash];
  if (!prev) return;

  existing[invoiceHash] = {
    ...prev,
    isClosed,
    updatedAt: Date.now(),
  };

  writeDirectory(existing);
}

export function listPoolDirectory(): PoolDirectoryEntry[] {
  return Object.values(readDirectory()).sort(
    (a, b) => b.updatedAt - a.updatedAt,
  );
}

export function getPoolDirectoryEntry(
  invoiceHash: string,
): PoolDirectoryEntry | null {
  if (!invoiceHash) return null;
  return readDirectory()[invoiceHash] ?? null;
}
