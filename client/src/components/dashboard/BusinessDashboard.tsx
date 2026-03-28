import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  RefreshCw,
  ExternalLink,
  MoreHorizontal,
  Receipt,
  CheckCircle,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "@/components/ui/address-display";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AleoNetworkClient } from "@provablehq/sdk";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { formatDate, getDaysUntilDue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PROGRAM_ID, API_ENDPOINT } from "@/lib/config";
import {
  type AleoRecord,
  decodeInvoiceCurrencyFromMetadata,
  getPersistedInvoiceCurrency,
  getField,
  microToAleo,
  unixToDate,
} from "@/lib/aleo-records";

export function BusinessDashboard() {
  const queryClient = useQueryClient();
  const { isConnected, requestRecords } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settledHashes, setSettledHashes] = useState<Set<string>>(new Set());
  const [settlingRecourseId, setSettlingRecourseId] = useState<string | null>(
    null,
  );
  const [paymentRequestedHashes, setPaymentRequestedHashes] = useState<
    Set<string>
  >(new Set());
  const [selectedInvoice, setSelectedInvoice] = useState<{
    invoiceHash: string;
    debtor: string;
    amount: string;
    currency: string;
    dueDate: Date;
    transactionId?: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const shortenMiddle = (value: string, start = 10, end = 8) => {
    if (value.length <= start + end + 3) return value;
    return `${value.slice(0, start)}...${value.slice(-end)}`;
  };

  const {
    data: records,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["records", PROGRAM_ID, "business-dashboard"],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 60_000,
  });

  const invoiceRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "Invoice" && !r.spent,
  );
  const factoredRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "FactoredInvoice" && !r.spent,
  );
  const offerRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "FactoringOffer" && !r.spent,
  );
  // RecourseNotice records sent to the business (they are the original_creditor)
  const recourseNoticeRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "RecourseNotice" && !r.spent,
  );

  const getInvoiceCurrency = (record: AleoRecord): "ALEO" | "USDCx" => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    const metadata = getField(record.recordPlaintext, "metadata");
    const fromMetadata = decodeInvoiceCurrencyFromMetadata(metadata);
    const cached = getPersistedInvoiceCurrency(invoiceHash);
    return cached ?? fromMetadata;
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success(`${fieldName} copied!`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const totalValue = invoiceRecords.reduce((sum, r) => {
    return sum + microToAleo(getField(r.recordPlaintext, "amount") || "0u64");
  }, 0);
  const invoiceCurrencies = new Set(
    invoiceRecords.map((r) => getInvoiceCurrency(r)),
  );
  const totalValueUnit =
    invoiceCurrencies.size === 1
      ? Array.from(invoiceCurrencies)[0]
      : invoiceCurrencies.size > 1
        ? "Mixed"
        : "ALEO";

  // Check settled status for each factored record
  useEffect(() => {
    if (!factoredRecords.length) return;
    const client = new AleoNetworkClient(API_ENDPOINT);
    factoredRecords.forEach(async (record) => {
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
        // not settled yet
      }
    });
  }, [factoredRecords.length]);

  useEffect(() => {
    if (status === "submitting")
      toast.loading("Generating proof…", { id: "tx-op" });
    else if (status === "pending")
      toast.loading("Broadcasting…", { id: "tx-op" });
    else if (status === "accepted") {
      toast.success("Transaction confirmed!", { id: "tx-op" });
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
      setSettlingId(null);
      setSettlingRecourseId(null);
      reset();
    } else if (status === "failed") {
      const msg = txError || "Transaction failed";
      toast.error(
        msg.includes("already settled") ? "Invoice already settled" : msg,
        { id: "tx-op" },
      );
      setSettlingId(null);
      setSettlingRecourseId(null);
      reset();
    }
  }, [status, txError, queryClient, reset]);

  const handleSettle = async (record: AleoRecord) => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    const recordId = record.commitment ?? invoiceHash;
    setSettlingId(recordId);
    try {
      await execute({
        program: PROGRAM_ID,
        function: "settle_invoice",
        inputs: [record.recordPlaintext],
        fee: 100_000,
        privateFee: false,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Settlement failed", {
        id: "tx-op",
      });
      setSettlingId(null);
    }
  };

  const handleRequestPayment = async (record: AleoRecord) => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    try {
      await execute({
        program: PROGRAM_ID,
        function: "create_payment_request",
        inputs: [record.recordPlaintext],
        fee: 50_000,
        privateFee: false,
      });
      setPaymentRequestedHashes((prev) => new Set(prev).add(invoiceHash));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists in the ledger")) {
        toast.error(
          "Already published - copy the link and send it to your debtor.",
        );
        setPaymentRequestedHashes((prev) => new Set(prev).add(invoiceHash));
      } else {
        toast.error("Could not publish payment request. Try again.");
      }
    }
  };

  const handleAcceptOffer = async (record: AleoRecord) => {
    const recordId =
      record.commitment ?? getField(record.recordPlaintext, "invoice_hash");
    setSettlingId(recordId);
    let creditsRecord: AleoRecord | undefined;
    try {
      const creditsRecords = (await requestRecords(
        "credits.aleo",
        true,
      )) as AleoRecord[];
      const offerAmount = parseInt(
        getField(record.recordPlaintext, "amount").replace(/u64$/, ""),
        10,
      );
      const advanceRateBps = parseInt(
        getField(record.recordPlaintext, "advance_rate").replace(/u16$/, ""),
        10,
      );
      const advanceAmount = Math.floor((offerAmount * advanceRateBps) / 10000);
      creditsRecord = creditsRecords
        .filter((r) => !r.spent)
        .find(
          (r) =>
            parseInt(
              getField(r.recordPlaintext, "microcredits").replace(/u64$/, ""),
              10,
            ) >= advanceAmount,
        );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch credits",
      );
      setSettlingId(null);
      return;
    }
    if (!creditsRecord) {
      toast.error("Insufficient credits to fund this factoring");
      setSettlingId(null);
      return;
    }
    await execute({
      program: PROGRAM_ID,
      function: "execute_factoring",
      inputs: [record.recordPlaintext, creditsRecord.recordPlaintext],
      fee: 100_000,
      privateFee: false,
    });
  };

  // Business settles a recourse claim by repaying the factor's advance
  const handleSettleRecourse = async (notice: AleoRecord) => {
    const invoiceHash = getField(notice.recordPlaintext, "invoice_hash");
    const advanceAmountRaw = getField(notice.recordPlaintext, "advance_amount");
    const advanceAmount = parseInt(advanceAmountRaw.replace(/u64$/, ""), 10);
    const recordId = notice.commitment ?? invoiceHash;
    setSettlingRecourseId(recordId);

    let creditsRecord: AleoRecord | undefined;
    try {
      const creditsRecords = (await requestRecords(
        "credits.aleo",
        true,
      )) as AleoRecord[];
      creditsRecord = creditsRecords
        .filter((r) => !r.spent)
        .find(
          (r) =>
            parseInt(
              getField(r.recordPlaintext, "microcredits").replace(/u64$/, ""),
              10,
            ) >= advanceAmount,
        );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch credits",
      );
      setSettlingRecourseId(null);
      return;
    }
    if (!creditsRecord) {
      toast.error("Insufficient credits to repay the advance amount");
      setSettlingRecourseId(null);
      return;
    }
    try {
      await execute({
        program: PROGRAM_ID,
        function: "settle_recourse",
        inputs: [notice.recordPlaintext, creditsRecord.recordPlaintext],
        fee: 100_000,
        privateFee: false,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Recourse settlement failed",
        { id: "tx-op" },
      );
      setSettlingRecourseId(null);
    }
  };

  const dynamicStats = [
    {
      title: "Total Invoices",
      value: isLoading ? "…" : String(invoiceRecords.length),
      icon: <FileText className="h-5 w-5 text-primary" />,
    },
    {
      title: "Total Value",
      value: isLoading
        ? "…"
        : totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 }) +
          ` ${totalValueUnit}`,
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
    },
    {
      title: "Factored",
      value: isLoading ? "…" : String(factoredRecords.length),
      icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
    },
    {
      title: "Recourse Notices",
      value: isLoading ? "…" : String(recourseNoticeRecords.length),
      icon: <AlertTriangle className="h-5 w-5 text-primary" />,
    },
  ];

  const renderInvoiceCards = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (invoiceRecords.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">No invoices yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first invoice to get started
              </p>
            </div>
            <Button asChild>
              <Link to="/invoices/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {invoiceRecords.map((invoice, idx) => {
          const invoiceHash = getField(invoice.recordPlaintext, "invoice_hash");
          const currency = getInvoiceCurrency(invoice);
          const dueDate = unixToDate(
            getField(invoice.recordPlaintext, "due_date") || "0u64",
          );
          const aleoAmount = microToAleo(
            getField(invoice.recordPlaintext, "amount") || "0u64",
          );
          const debtor = getField(invoice.recordPlaintext, "debtor");
          const daysUntil = getDaysUntilDue(dueDate);
          return (
            <Card
              key={invoiceHash || idx}
              className="hover:border-primary/50 transition-colors cursor-pointer hover:shadow-lg"
              onClick={() =>
                setSelectedInvoice({
                  invoiceHash,
                  debtor,
                  amount: aleoAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  }),
                  currency,
                  dueDate,
                  transactionId: invoice.transactionId,
                })
              }
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-sm text-muted-foreground">
                    {invoiceHash.slice(0, 12)}…
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 -mt-1 -mr-1"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          window.open(
                            `${import.meta.env.VITE_ALEO_EXPLORER}/transaction/${invoice.transactionId}`,
                            "_blank",
                          )
                        }
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Explorer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Debtor</span>
                    <AddressDisplay address={debtor} chars={4} showExplorer />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono font-medium">
                      {aleoAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      {currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due</span>
                    <div className="text-right">
                      <span>{formatDate(dueDate)}</span>
                      <span
                        className={cn(
                          "ml-2 text-xs",
                          daysUntil < 0
                            ? "text-destructive"
                            : daysUntil < 7
                              ? "text-warning"
                              : "text-muted-foreground",
                        )}
                      >
                        {daysUntil > 0
                          ? `${daysUntil}d`
                          : daysUntil === 0
                            ? "today"
                            : `${Math.abs(daysUntil)}d overdue`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderFactoredCards = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (factoredRecords.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent>
            <p className="font-medium">No factored invoices</p>
            <p className="text-sm text-muted-foreground mt-1">
              Invoices you factor will appear here
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {factoredRecords.map((record, idx) => {
          const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
          const aleoAmount = microToAleo(
            getField(record.recordPlaintext, "amount") || "0u64",
          );
          const rate =
            parseInt(
              (
                getField(record.recordPlaintext, "advance_rate") || "0u16"
              ).replace(/u16$/, ""),
              10,
            ) / 100;
          const originalCreditor = getField(
            record.recordPlaintext,
            "original_creditor",
          );
          const recordId = record.commitment ?? invoiceHash;
          const isSettling = settlingId === recordId;
          const isSettled = settledHashes.has(invoiceHash);
          return (
            <Card
              key={invoiceHash || idx}
              className="hover:border-primary/50 transition-colors"
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-sm text-muted-foreground">
                    {invoiceHash.slice(0, 12)}…
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 -mt-1 -mr-1"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleRequestPayment(record)}
                        disabled={
                          isSettled || paymentRequestedHashes.has(invoiceHash)
                        }
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Request Payment from Debtor
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSettle(record)}
                        disabled={isSettling || isSettled}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isSettling ? "Settling…" : "Settle"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          window.open(
                            `${import.meta.env.VITE_ALEO_EXPLORER}/transaction/${record.transactionId}`,
                            "_blank",
                          )
                        }
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Explorer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Creditor</span>
                    <AddressDisplay
                      address={originalCreditor}
                      chars={4}
                      showExplorer
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono font-medium">
                      {aleoAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      ALEO
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span>{rate.toFixed(2)}%</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    isSettled
                      ? "text-green-600 border-green-300"
                      : "text-yellow-600 border-yellow-300",
                  )}
                >
                  {isSettled ? "Settled" : "Pending"}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderOfferCards = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (offerRecords.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent>
            <p className="font-medium">No pending offers</p>
            <p className="text-sm text-muted-foreground mt-1">
              Browse the marketplace to request factoring
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offerRecords.map((record, idx) => {
          const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
          const aleoAmount = microToAleo(
            getField(record.recordPlaintext, "amount") || "0u64",
          );
          const rate =
            parseInt(
              getField(record.recordPlaintext, "advance_rate").replace(
                /u16$/,
                "",
              ),
              10,
            ) / 100;
          const originalCreditor = getField(
            record.recordPlaintext,
            "original_creditor",
          );
          const recordId = record.commitment ?? invoiceHash;
          const isAccepting = settlingId === recordId;
          return (
            <Card
              key={invoiceHash || idx}
              className="hover:border-primary/50 transition-colors"
            >
              <CardContent className="pt-4 space-y-3">
                <span className="font-mono text-sm text-muted-foreground">
                  {invoiceHash.slice(0, 12)}…
                </span>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Business</span>
                    <AddressDisplay
                      address={originalCreditor}
                      chars={4}
                      showExplorer
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono font-medium">
                      {aleoAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      ALEO
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span>{rate.toFixed(2)}%</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleAcceptOffer(record)}
                  disabled={isAccepting}
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  {isAccepting ? "Processing…" : "Accept Offer"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderRecourseNoticeCards = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (recourseNoticeRecords.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent>
            <p className="font-medium">No recourse notices</p>
            <p className="text-sm text-muted-foreground mt-1">
              If a factor claims recourse on an overdue invoice, it will appear
              here
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recourseNoticeRecords.map((notice, idx) => {
          const invoiceHash = getField(notice.recordPlaintext, "invoice_hash");
          const factor = getField(notice.recordPlaintext, "factor");
          const advanceAmount = microToAleo(
            getField(notice.recordPlaintext, "advance_amount") || "0u64",
          );
          const recordId = notice.commitment ?? invoiceHash;
          const isSettlingThis = settlingRecourseId === recordId;
          return (
            <Card
              key={invoiceHash || idx}
              className="border-orange-300/50 hover:border-orange-400/60 transition-colors"
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                  <span className="font-mono text-sm text-muted-foreground">
                    {invoiceHash.slice(0, 12)}…
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Factor</span>
                    <AddressDisplay address={factor} chars={4} showExplorer />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Owed</span>
                    <span className="font-mono font-medium text-orange-600">
                      {advanceAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      ALEO
                    </span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs text-orange-600 border-orange-300"
                >
                  Recourse Active
                </Badge>
                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  variant="destructive"
                  onClick={() => handleSettleRecourse(notice)}
                  disabled={isSettlingThis}
                >
                  <CheckCircle className="h-4 w-4" />
                  {isSettlingThis ? "Repaying…" : "Settle Recourse"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your invoices and factoring requests
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <Link to="/marketplace">Choose Factors</Link>
          </Button>
          <Button asChild>
            <Link to="/invoices/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dynamicStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Recourse alert banner */}
      {recourseNoticeRecords.length > 0 && (
        <Card className="border-orange-300/50 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="pt-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-400">
              {recourseNoticeRecords.length} recourse notice
              {recourseNoticeRecords.length !== 1 ? "s" : ""} require your
              attention. Open the <strong>Recourse</strong> tab to repay.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {isError && !records && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 flex items-center gap-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">Failed to load records.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Invoice Sections */}
      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">
            My Invoices
            {!isLoading && invoiceRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({invoiceRecords.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="factored">
            Factored
            {!isLoading && factoredRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({factoredRecords.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="recourse">
            Recourse
            {!isLoading && recourseNoticeRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70 text-orange-500">
                ({recourseNoticeRecords.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-4">
          {renderInvoiceCards()}
        </TabsContent>

        <TabsContent value="factored" className="mt-4">
          {renderFactoredCards()}
        </TabsContent>

        <TabsContent value="recourse" className="mt-4">
          {renderRecourseNoticeCards()}
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Dialog */}
      <Dialog
        open={!!selectedInvoice}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center">Invoice Details</DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-4">
              {/* Invoice Hash */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Invoice Hash
                </label>
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
                  <span
                    className="font-mono text-xs truncate"
                    title={selectedInvoice.invoiceHash}
                  >
                    {shortenMiddle(selectedInvoice.invoiceHash)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        selectedInvoice.invoiceHash,
                        "Invoice Hash",
                      )
                    }
                  >
                    {copiedField === "Invoice Hash" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Debtor */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Debtor
                </label>
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
                  <span
                    className="font-mono text-xs truncate"
                    title={selectedInvoice.debtor}
                  >
                    {shortenMiddle(selectedInvoice.debtor)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(selectedInvoice.debtor, "Debtor Address")
                    }
                  >
                    {copiedField === "Debtor Address" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Amount
                </label>
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
                  <span className="font-mono font-semibold text-sm">
                    {selectedInvoice.amount} {selectedInvoice.currency}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        `${selectedInvoice.amount} ${selectedInvoice.currency}`,
                        "Amount",
                      )
                    }
                  >
                    {copiedField === "Amount" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Due Date
                </label>
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border">
                  <span className="text-sm">
                    {formatDate(selectedInvoice.dueDate)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(
                        formatDate(selectedInvoice.dueDate),
                        "Due Date",
                      )
                    }
                  >
                    {copiedField === "Due Date" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* View on Explorer */}
              {selectedInvoice.transactionId && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    window.open(
                      `${import.meta.env.VITE_ALEO_EXPLORER}/transaction/${selectedInvoice.transactionId}`,
                      "_blank",
                    )
                  }
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
