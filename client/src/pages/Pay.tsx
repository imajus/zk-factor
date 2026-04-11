import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Wallet,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Info,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressDisplay } from "@/components/ui/address-display";
import { AleoNetworkClient } from "@provablehq/sdk";
import { formatDate, getDaysUntilDue } from "@/lib/format";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { useQuery } from "@tanstack/react-query";
import { PROGRAM_ID, PROGRAM_ADDRESS, API_ENDPOINT } from "@/lib/config";
import { cn } from "@/lib/utils";
import {
  type AleoRecord,
  getField,
  microToAleo,
  unixToDate,
} from "@/lib/aleo-records";

// Distinguish the two notice types so we call the right transition
type NoticeKind = "single" | "pool";

interface NoticeRow {
  record: AleoRecord;
  kind: NoticeKind;
  invoiceHash: string;
  // single-factor path
  factor: string;
  // pool path — program address used as recipient
  programAddr: string;
  amount: number;
  dueDate: Date;
}

function parseNotice(record: AleoRecord, programAddr: string): NoticeRow {
  const isPool = record.recordName === "PoolPaymentNotice";
  const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
  const factor = isPool ? "" : getField(record.recordPlaintext, "factor");
  const amount = microToAleo(
    getField(record.recordPlaintext, "amount") || "0u64",
  );
  const dueDate = unixToDate(
    getField(record.recordPlaintext, "due_date") || "0u64",
  );
  return {
    record,
    kind: isPool ? "pool" : "single",
    invoiceHash,
    factor,
    programAddr,
    amount,
    dueDate,
  };
}

export default function Pay() {
  const { isConnected, address, requestRecords } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paidHashes, setPaidHashes] = useState<Set<string>>(new Set());
  const [settledHashes, setSettledHashes] = useState<Set<string>>(new Set());
  const [expandedHash, setExpandedHash] = useState<string | null>(null);

  const {
    data: records,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["payment-notices", address],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 30_000,
  });

  // Collect both PaymentNotice and PoolPaymentNotice records
  const rawNotices = ((records as AleoRecord[]) ?? []).filter(
    (r) =>
      (r.recordName === "PaymentNotice" ||
        r.recordName === "PoolPaymentNotice") &&
      !r.spent,
  );

  const notices: NoticeRow[] = rawNotices.map((r) =>
    parseNotice(r, PROGRAM_ADDRESS),
  );

  // Check settled_invoices mapping for each notice on load
  useEffect(() => {
    if (!notices.length) return;
    const client = new AleoNetworkClient(API_ENDPOINT);
    notices.forEach(async ({ invoiceHash }) => {
      try {
        const result = await client.getProgramMappingValue(
          PROGRAM_ID,
          "settled_invoices",
          invoiceHash,
        );
        if (result) {
          setSettledHashes((prev) => new Set([...prev, invoiceHash]));
        }
      } catch {
        // not settled yet — ignore
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notices.length]);

  useEffect(() => {
    if (status === "submitting")
      toast.loading("Generating proof…", { id: "pay-invoice" });
    else if (status === "pending")
      toast.loading("Broadcasting payment…", { id: "pay-invoice" });
    else if (status === "accepted") {
      toast.success("Invoice paid successfully!", { id: "pay-invoice" });
      if (payingId) setPaidHashes((prev) => new Set([...prev, payingId]));
      setPayingId(null);
      reset();
      refetch();
    } else if (status === "failed") {
      toast.error(txError || "Payment failed", { id: "pay-invoice" });
      setPayingId(null);
      reset();
    }
  }, [status, txError, reset, payingId, refetch]);

  /**
   * Single-factor path: pay_invoice(notice, factor)
   *   → transfer_public_as_signer(factor, amount) + settlement in same finalize
   *
   * Pool path: pay_pool_invoice(notice, program_addr)
   *   → transfer_public_as_signer(program_addr, amount) + settlement in same finalize
   *   Funds land in the program's public escrow, ready for distribution.
   */
  const handlePay = async (row: NoticeRow) => {
    setPayingId(row.invoiceHash);
    try {
      if (row.kind === "pool") {
        if (!row.programAddr) {
          toast.error(
            "PROGRAM_ADDRESS is not set — cannot route payment to pool escrow.",
            { id: "pay-invoice" },
          );
          setPayingId(null);
          return;
        }

        const client = new AleoNetworkClient(API_ENDPOINT);
        let useTokenPool = false;
        try {
          const rawUseToken = await client.getProgramMappingValue(
            PROGRAM_ID,
            "pool_use_token",
            row.invoiceHash,
          );
          useTokenPool = String(rawUseToken).includes("true");
        } catch {
          useTokenPool = false;
        }

        await execute({
          program: PROGRAM_ID,
          function: useTokenPool
            ? "pay_pool_invoice_token"
            : "pay_pool_invoice",
          inputs: [row.record.recordPlaintext, row.programAddr],
          fee: 100_000,
          privateFee: false,
        });
      } else {
        await execute({
          program: PROGRAM_ID,
          function: "pay_invoice",
          inputs: [row.record.recordPlaintext, row.factor],
          fee: 100_000,
          privateFee: false,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed", {
        id: "pay-invoice",
      });
      setPayingId(null);
    }
  };

  if (!isConnected) {
    return (
      <div className="container py-6 max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Invoices</h1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2">
            Connect your wallet to view invoices addressed to you.
            <a
              href="/docs/debtor/pay-invoice"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Info className="h-3 w-3" /> Learn more
            </a>
          </p>
        </div>
        <Card>
          <CardContent className="pt-12 pb-12 flex flex-col items-center text-center gap-4">
            <Wallet className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Your pending invoices are encrypted in your wallet. Connect to
              view and pay them.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Invoices</h1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2">
            Invoices addressed to your wallet that are pending payment.
            <a
              href="/docs/debtor/pay-invoice"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Info className="h-3 w-3" /> Learn more
            </a>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load invoices. Check your wallet connection and try again.
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && notices.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 flex flex-col items-center text-center gap-3">
            <CheckCircle className="h-12 w-12 text-muted-foreground" />
            <h3 className="font-medium">No pending invoices</h3>
            <p className="text-sm text-muted-foreground">
              You have no invoices to pay right now.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && notices.length > 0 && (
        <div className="space-y-3">
          {notices.map((row, idx) => {
            const { invoiceHash, factor, kind, amount, dueDate, record } = row;
            const daysUntil = getDaysUntilDue(dueDate);
            const isOverdue = daysUntil < 0;
            const isPaying = payingId === invoiceHash;
            const isPaid =
              paidHashes.has(invoiceHash) || settledHashes.has(invoiceHash);
            const isExpanded = expandedHash === invoiceHash;
            const isPool = kind === "pool";

            return (
              <Card
                key={invoiceHash || idx}
                className={cn(
                  "transition-colors",
                  isPaid && "opacity-60",
                  isOverdue && !isPaid && "border-destructive/50",
                  isPool &&
                    !isPaid &&
                    "border-blue-300/60 bg-blue-50/30 dark:bg-blue-950/10",
                )}
              >
                <CardHeader
                  className="pb-2 cursor-pointer select-none"
                  onClick={() =>
                    setExpandedHash(isExpanded ? null : invoiceHash)
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {isPool && (
                          <Layers className="h-4 w-4 text-blue-500 shrink-0" />
                        )}
                        <CardTitle className="text-base font-mono">
                          {invoiceHash.slice(0, 16)}…
                        </CardTitle>
                        {isPool && (
                          <Badge
                            variant="outline"
                            className="text-xs text-blue-700 border-blue-400"
                          >
                            Pool Invoice
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        {isPool ? (
                          "Payment goes to pool escrow — factors will claim proportionally"
                        ) : (
                          <>
                            Pay to:{" "}
                            <AddressDisplay
                              address={factor}
                              chars={6}
                              showExplorer
                            />
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold font-mono">
                        {amount.toLocaleString(undefined, {
                          maximumFractionDigits: 6,
                        })}{" "}
                        ALEO
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span
                          className={cn(
                            "text-xs",
                            isOverdue
                              ? "text-destructive font-medium"
                              : daysUntil < 7
                                ? "text-yellow-600"
                                : "text-muted-foreground",
                          )}
                        >
                          {isOverdue
                            ? `${Math.abs(daysUntil)} days overdue`
                            : daysUntil === 0
                              ? "Due today"
                              : `Due ${formatDate(dueDate)}`}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 text-muted-foreground ml-1" />
                        ) : (
                          <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0 space-y-3">
                  {isExpanded && (
                    <div className="rounded-md bg-muted px-4 py-3 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground shrink-0">
                          Full Invoice Hash
                        </span>
                        <span className="font-mono text-xs break-all text-right">
                          {invoiceHash}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount</span>
                        <span className="font-mono font-medium">
                          {amount.toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })}{" "}
                          ALEO
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Due Date</span>
                        <span
                          className={
                            isOverdue ? "text-destructive font-medium" : ""
                          }
                        >
                          {dueDate.toLocaleDateString()}
                          {isOverdue && " (Overdue)"}
                        </span>
                      </div>
                      {!isPool && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            Factor Address
                          </span>
                          <AddressDisplay
                            address={factor}
                            chars={8}
                            showExplorer
                          />
                        </div>
                      )}
                      {isPool && (
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">
                            Escrow Address
                          </span>
                          <AddressDisplay
                            address={row.programAddr}
                            chars={8}
                            showExplorer
                          />
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Payment Method
                        </span>
                        <span className="text-xs">
                          {isPool
                            ? "Public credits → pool escrow (atomic)"
                            : "Public credits → factor (atomic settlement)"}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    {isPaid ? (
                      <Badge
                        variant="outline"
                        className="text-green-600 border-green-300"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          isOverdue
                            ? "text-destructive border-destructive/30"
                            : "text-yellow-600 border-yellow-300",
                        )}
                      >
                        {isOverdue ? "Overdue" : "Pending"}
                      </Badge>
                    )}

                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePay(row);
                      }}
                      disabled={isPaying || isPaid}
                      size="sm"
                    >
                      {isPaying
                        ? "Processing…"
                        : isPaid
                          ? "Paid"
                          : `Pay ${amount.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })} ALEO`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Payment deducts from your public credits balance and marks the invoice
        settled atomically in a single transaction. Powered by Aleo private
        records.
      </p>
    </div>
  );
}
