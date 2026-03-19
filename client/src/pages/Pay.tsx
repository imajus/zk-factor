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
import { PROGRAM_ID, API_ENDPOINT } from "@/lib/config";
import { cn } from "@/lib/utils";
import { type AleoRecord, getField, microToAleo, unixToDate } from "@/lib/aleo-records";

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

  const notices = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "PaymentNotice" && !r.spent,
  );

  useEffect(() => {
    if (!notices.length) return;
    const client = new AleoNetworkClient(API_ENDPOINT);
    notices.forEach(async (record) => {
      const hash = getField(record.recordPlaintext, "invoice_hash");
      try {
        const result = await client.getProgramMappingValue(
          PROGRAM_ID,
          "settled_invoices",
          hash,
        );
        if (result) {
          setSettledHashes((prev) => new Set([...prev, hash]));
        }
      } catch {
        // not settled yet - ignore
      }
    });
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
      console.error("pay_invoice failed:", txError);
      toast.error(txError || "Payment failed", { id: "pay-invoice" });
      setPayingId(null);
      reset();
    }
  }, [status, txError, reset, payingId, refetch]);

  const handlePay = async (record: AleoRecord) => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    const factor = getField(record.recordPlaintext, "factor");
    const amount = getField(record.recordPlaintext, "amount").replace(
      /u64$/,
      "",
    );

    setPayingId(invoiceHash);

    try {
      toast.loading("Step 1/2: Sending payment…", { id: "pay-invoice" });
      await execute({
        program: "credits.aleo",
        function: "transfer_public",
        inputs: [factor, `${amount}u64`],
        fee: 100_000,
        privateFee: false,
      });

      toast.loading("Step 2/2: Recording settlement…", { id: "pay-invoice" });
      await execute({
        program: PROGRAM_ID,
        function: "pay_invoice",
        inputs: [record.recordPlaintext, factor],
        fee: 100_000,
        privateFee: false,
      });
    } catch (err) {
      console.error("pay_invoice threw:", err);
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
          <p className="text-muted-foreground">
            Connect your wallet to view invoices addressed to you.
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
          <p className="text-muted-foreground">
            Invoices addressed to your wallet that are pending payment.
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
          {notices.map((record, idx) => {
            const invoiceHash = getField(
              record.recordPlaintext,
              "invoice_hash",
            );
            const factor = getField(record.recordPlaintext, "factor");
            const amount = microToAleo(
              getField(record.recordPlaintext, "amount") || "0u64",
            );
            const dueDate = unixToDate(
              getField(record.recordPlaintext, "due_date") || "0u64",
            );
            const daysUntil = getDaysUntilDue(dueDate);
            const isOverdue = daysUntil < 0;
            const isPaying = payingId === invoiceHash;
            // Check both session memory AND on-chain mapping
            const isPaid =
              paidHashes.has(invoiceHash) || settledHashes.has(invoiceHash);
            const isExpanded = expandedHash === invoiceHash;

            return (
              <Card
                key={invoiceHash || idx}
                className={cn(
                  "transition-colors",
                  isPaid && "opacity-60",
                  isOverdue && !isPaid && "border-destructive/50",
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
                      <CardTitle className="text-base font-mono">
                        {invoiceHash.slice(0, 16)}…
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        Pay to:{" "}
                        <AddressDisplay
                          address={factor}
                          chars={6}
                          showExplorer
                        />
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
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Payment Method
                        </span>
                        <span className="text-xs">credits.aleo (public)</span>
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
                        handlePay(record);
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
        These invoices are encrypted in your wallet - only you can see them.
        Powered by Aleo private records.
      </p>
    </div>
  );
}
