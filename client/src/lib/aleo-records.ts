export interface AleoRecord {
  recordName: string;
  owner: string;
  programName: string;
  recordPlaintext: string;
  spent: boolean;
  commitment?: string;
  sender?: string;
  blockHeight?: number;
  transactionId?: string;
  tag?: string;
}

type InvoiceCurrency = "ALEO" | "USDCx";
const INVOICE_METADATA_FLAG_MASK = 1n;
const INVOICE_CURRENCY_CACHE_KEY = "zkfactor.invoice_currency_map";
const FACTORED_INVOICE_CACHE_KEY = "zkfactor.factored_invoice_hashes";

export function getField(plaintext: string, field: string): string {
  for (const line of plaintext.split("\n")) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith(`${field}:`)) continue;
    const m = trimmed.match(/^[^:]+:\s*(.+?)\.(?:private|public)/);
    if (m) return m[1].trim();
  }
  return "";
}

export function microToAleo(microcredits: string): number {
  return parseInt(microcredits.replace(/u64$/, ""), 10) / 1_000_000;
}

export function unixToDate(unixSeconds: string): Date {
  return new Date(parseInt(unixSeconds.replace(/u64$/, ""), 10) * 1000);
}

export function encodeInvoiceMetadata(
  invoiceNumber: string,
  currency: InvoiceCurrency,
): string {
  // Reserve the lowest 8 bits for flags to keep metadata extensible.
  const bytes = new TextEncoder().encode(invoiceNumber);
  let value = 0n;
  for (let i = 0; i < Math.min(15, bytes.length); i++) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  value <<= 8n;
  if (currency === "USDCx") {
    value |= INVOICE_METADATA_FLAG_MASK;
  }
  return `${value}u128`;
}

export function decodeInvoiceCurrencyFromMetadata(
  metadata: string,
): InvoiceCurrency {
  const raw = metadata.replace(/u128$/, "").trim();
  if (!raw) return "ALEO";
  try {
    const value = BigInt(raw);
    return (value & INVOICE_METADATA_FLAG_MASK) === INVOICE_METADATA_FLAG_MASK
      ? "USDCx"
      : "ALEO";
  } catch {
    return "ALEO";
  }
}

export function persistInvoiceCurrency(
  invoiceHash: string,
  currency: InvoiceCurrency,
): void {
  if (!invoiceHash) return;
  try {
    const existing = localStorage.getItem(INVOICE_CURRENCY_CACHE_KEY);
    const map = existing
      ? (JSON.parse(existing) as Record<string, InvoiceCurrency>)
      : {};
    map[invoiceHash] = currency;
    localStorage.setItem(INVOICE_CURRENCY_CACHE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage failures (private browsing / quota issues).
  }
}

export function getPersistedInvoiceCurrency(
  invoiceHash: string,
): InvoiceCurrency | null {
  if (!invoiceHash) return null;
  try {
    const existing = localStorage.getItem(INVOICE_CURRENCY_CACHE_KEY);
    if (!existing) return null;
    const map = JSON.parse(existing) as Record<string, InvoiceCurrency>;
    return map[invoiceHash] ?? null;
  } catch {
    return null;
  }
}

export function persistFactoredInvoiceHash(invoiceHash: string): void {
  if (!invoiceHash) return;
  try {
    const existing = localStorage.getItem(FACTORED_INVOICE_CACHE_KEY);
    const hashes = existing ? (JSON.parse(existing) as string[]) : [];
    if (!hashes.includes(invoiceHash)) {
      hashes.push(invoiceHash);
      localStorage.setItem(FACTORED_INVOICE_CACHE_KEY, JSON.stringify(hashes));
    }
    window.dispatchEvent(new Event("zkfactor:factored-invoices-changed"));
  } catch {
    // Ignore storage failures (private browsing / quota issues).
  }
}

export function getPersistedFactoredInvoiceHashes(): Set<string> {
  try {
    const existing = localStorage.getItem(FACTORED_INVOICE_CACHE_KEY);
    if (!existing) return new Set();
    const hashes = JSON.parse(existing) as string[];
    return new Set(hashes.filter((hash) => typeof hash === "string" && hash));
  } catch {
    return new Set();
  }
}
