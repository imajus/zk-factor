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
