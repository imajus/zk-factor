import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Percent,
  RefreshCw,
  ExternalLink,
  MoreHorizontal,
  Receipt,
  CheckCircle,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  Users,
  Loader2,
  Clock3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "@/components/ui/address-display";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PROGRAM_ID, API_ENDPOINT, USDCX_PROGRAM_ID } from "@/lib/config";
import { PoolShareCard } from "@/components/dashboard/PoolShareCard";
import { fetchAllPools } from "@/lib/pool-chain";
import {
  type AleoRecord,
  getPersistedInvoiceCurrency,
  persistFactoredInvoiceHash,
  persistInvoiceCurrency,
  getField,
  microToAleo,
  unixToDate,
} from "@/lib/aleo-records";
import { getDaysUntilDue, formatDate } from "@/lib/format";

// An invoice is "overdue" if due_date (Unix seconds) is in the past
function isOverdue(dueDateRaw: string): boolean {
  const ts = parseInt(dueDateRaw.replace(/u64$/, ""), 10);
  if (!ts) return false;
  return Date.now() / 1000 > ts;
}

export function FactorDashboard() {
  const queryClient = useQueryClient();
  const { isConnected, requestRecords } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settledHashes, setSettledHashes] = useState<Set<string>>(new Set());
  const [reclaimingId, setReclaimingId] = useState<string | null>(null);
  const [paymentRequestedHashes, setPaymentRequestedHashes] = useState<
    Set<string>
  >(new Set());
  const [executingOffers, setExecutingOffers] = useState<
    Record<
      string,
      {
        invoiceHash: string;
        business: string;
        amountMicro: number;
        rate: number;
        currency: "ALEO" | "USDCx";
      }
    >
  >({});
  const [completedOfferHashes, setCompletedOfferHashes] = useState<Set<string>>(
    new Set(),
  );
  const pendingAcceptedCurrencyRef = useRef<{
    invoiceHash: string;
    currency: "ALEO" | "USDCx";
  } | null>(null);

  const {
    data: records,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["records", PROGRAM_ID],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 0, // Always refetch after invalidation
    refetchOnMount: "always",
  });

  const { data: poolRecords } = useQuery({
    queryKey: ["records", PROGRAM_ID],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { refetch: refetchPools } = useQuery({
    queryKey: ["all_pools"],
    queryFn: fetchAllPools,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const factoredRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "FactoredInvoice" && !r.spent,
  );
  const offerRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "FactoringOffer" && !r.spent,
  );
  const visibleOfferRecords = offerRecords.filter((record) => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    return (
      !executingOffers[invoiceHash] && !completedOfferHashes.has(invoiceHash)
    );
  });
  const poolShareRecords = ((poolRecords as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "PoolShare" && !r.spent,
  );

  // FactoredInvoice records that are eligible for recourse:
  //   recourse == true  AND  due_date has passed  AND  not yet settled
  const recourseEligible = factoredRecords.filter((r) => {
    const recourse = getField(r.recordPlaintext, "recourse");
    const dueDate = getField(r.recordPlaintext, "due_date");
    const invoiceHash = getField(r.recordPlaintext, "invoice_hash");
    return (
      recourse === "true" &&
      isOverdue(dueDate) &&
      !settledHashes.has(invoiceHash)
    );
  });

  const getOfferCurrency = (record: AleoRecord): "ALEO" | "USDCx" => {
    return getField(record.recordPlaintext, "use_token") === "true"
      ? "USDCx"
      : "ALEO";
  };

  const getFactoredCurrency = (record: AleoRecord): "ALEO" | "USDCx" => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    return getPersistedInvoiceCurrency(invoiceHash) ?? "ALEO";
  };

  const portfolioValue = factoredRecords.reduce((sum, r) => {
    return sum + microToAleo(getField(r.recordPlaintext, "amount") || "0u64");
  }, 0);
  const activeCount = factoredRecords.filter(
    (r) => !settledHashes.has(getField(r.recordPlaintext, "invoice_hash")),
  ).length;

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
  }, [factoredRecords]);

  // Keep executing state only while the offer still appears and has not
  // materialized as a FactoredInvoice yet.
  useEffect(() => {
    if (!Object.keys(executingOffers).length) return;

    const openOfferHashes = new Set(
      offerRecords.map((r) => getField(r.recordPlaintext, "invoice_hash")),
    );
    const activeFactoredHashes = new Set(
      factoredRecords.map((r) => getField(r.recordPlaintext, "invoice_hash")),
    );

    setExecutingOffers((prev) => {
      const next: typeof prev = {};
      for (const [hash, data] of Object.entries(prev)) {
        if (openOfferHashes.has(hash) && !activeFactoredHashes.has(hash)) {
          next[hash] = data;
        }
      }
      return Object.keys(next).length === Object.keys(prev).length
        ? prev
        : next;
    });
  }, [offerRecords, factoredRecords, executingOffers]);

  useEffect(() => {
    if (status === "submitting")
      toast.loading("Generating proof…", { id: "tx-op" });
    else if (status === "pending")
      toast.loading("Broadcasting…", { id: "tx-op" });
    else if (status === "accepted") {
      const acceptedHash = pendingAcceptedCurrencyRef.current?.invoiceHash;
      if (pendingAcceptedCurrencyRef.current) {
        persistInvoiceCurrency(
          pendingAcceptedCurrencyRef.current.invoiceHash,
          pendingAcceptedCurrencyRef.current.currency,
        );
        persistFactoredInvoiceHash(
          pendingAcceptedCurrencyRef.current.invoiceHash,
        );
        pendingAcceptedCurrencyRef.current = null;
      }
      if (acceptedHash) {
        setCompletedOfferHashes((prev) => new Set(prev).add(acceptedHash));
        setExecutingOffers((prev) => {
          const next = { ...prev };
          delete next[acceptedHash];
          return next;
        });
      }
      toast.success("Transaction confirmed!", { id: "tx-op" });
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
      queryClient.invalidateQueries({ queryKey: ["all_pools"] });
      setSettlingId(null);
      setReclaimingId(null);
      reset();
    } else if (status === "failed") {
      const failedHash = pendingAcceptedCurrencyRef.current?.invoiceHash;
      pendingAcceptedCurrencyRef.current = null;
      if (failedHash) {
        setCompletedOfferHashes((prev) => {
          const next = new Set(prev);
          next.delete(failedHash);
          return next;
        });
        setExecutingOffers((prev) => {
          const next = { ...prev };
          delete next[failedHash];
          return next;
        });
      }
      const msg = txError || "Transaction failed";
      toast.error(
        msg.includes("already settled") ? "Invoice already settled" : msg,
        { id: "tx-op" },
      );
      setSettlingId(null);
      setReclaimingId(null);
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
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    const currency = getOfferCurrency(record);
    const amountMicro = parseInt(
      getField(record.recordPlaintext, "amount").replace(/u64$/, ""),
      10,
    );
    const rate =
      parseInt(
        getField(record.recordPlaintext, "advance_rate").replace(/u16$/, ""),
        10,
      ) / 100;
    const business = getField(record.recordPlaintext, "original_creditor");
    setSettlingId(recordId);

    pendingAcceptedCurrencyRef.current = { invoiceHash, currency };
    setExecutingOffers((prev) => ({
      ...prev,
      [invoiceHash]: {
        invoiceHash,
        business,
        amountMicro,
        rate,
        currency,
      },
    }));

    if (currency === "USDCx") {
      const advanceRateBps = parseInt(
        getField(record.recordPlaintext, "advance_rate"),
        10,
      );
      const advanceAmount = Math.floor((amountMicro * advanceRateBps) / 10000);
      toast.loading("Step 1/2: Approving USDCx spend\u2026", { id: "tx-op" });
      await execute({
        program: USDCX_PROGRAM_ID,
        function: "approve_public",
        inputs: [PROGRAM_ID, `${advanceAmount}u128`],
        fee: 50_000,
        privateFee: false,
      });
      toast.loading("Step 2/2: Executing factoring\u2026", { id: "tx-op" });
      await execute({
        program: PROGRAM_ID,
        function: "execute_factoring_token",
        inputs: [record.recordPlaintext],
        fee: 100_000,
        privateFee: false,
      });
      return;
    }

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
      setExecutingOffers((prev) => {
        const next = { ...prev };
        delete next[invoiceHash];
        return next;
      });
      return;
    }
    if (!creditsRecord) {
      toast.error("Insufficient credits to fund this factoring");
      setSettlingId(null);
      pendingAcceptedCurrencyRef.current = null;
      setCompletedOfferHashes((prev) => {
        const next = new Set(prev);
        next.delete(invoiceHash);
        return next;
      });
      setExecutingOffers((prev) => {
        const next = { ...prev };
        delete next[invoiceHash];
        return next;
      });
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

  // Factor initiates recourse on an overdue FactoredInvoice
  const handleInitiateRecourse = async (record: AleoRecord) => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    const recordId = record.commitment ?? invoiceHash;
    setReclaimingId(recordId);
    try {
      await execute({
        program: PROGRAM_ID,
        function: "initiate_recourse",
        inputs: [record.recordPlaintext],
        fee: 100_000,
        privateFee: false,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Recourse initiation failed",
        { id: "tx-op" },
      );
      setReclaimingId(null);
    }
  };

  const dynamicStats = [
    {
      title: "Invoices Factored",
      value: isLoading ? "…" : String(factoredRecords.length),
      icon: <Briefcase className="h-5 w-5 text-primary" />,
    },
    {
      title: "Portfolio Value",
      value: isLoading
        ? "…"
        : portfolioValue.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          }) + " Mixed",
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
    },
    {
      title: "Active",
      value: isLoading ? "…" : String(activeCount),
      icon: <DollarSign className="h-5 w-5 text-primary" />,
    },
    {
      title: "Avg ROI",
      value: "-",
      icon: <Percent className="h-5 w-5 text-primary" />,
    },
  ];

  const renderPortfolioCards = () => {
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
          <CardContent className="space-y-4">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">No factored invoices yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Browse the marketplace and accept offers to build your portfolio
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {factoredRecords.map((record, idx) => {
          const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
          const currency = getFactoredCurrency(record);
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
          const recourseEnabled =
            getField(record.recordPlaintext, "recourse") === "true";
          const dueDateRaw = getField(record.recordPlaintext, "due_date");
          const dueDate = unixToDate(dueDateRaw || "0u64");
          const daysUntil = getDaysUntilDue(dueDate);
          const overdue = isOverdue(dueDateRaw);
          const recordId = record.commitment ?? invoiceHash;
          const isSettling = settlingId === recordId;
          const isSettled = settledHashes.has(invoiceHash);
          const isReclaiming = reclaimingId === recordId;
          const canRecourse = recourseEnabled && overdue && !isSettled;

          return (
            <Card
              key={invoiceHash || idx}
              className={cn(
                "hover:border-primary/50 transition-colors",
                canRecourse && "border-orange-300/50",
              )}
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
                    <DropdownMenuContent align="end" sideOffset={6}>
                      <DropdownMenuItem
                        onClick={() => handleRequestPayment(record)}
                        disabled={
                          isSettled || paymentRequestedHashes.has(invoiceHash)
                        }
                      >
                        <Receipt className="h-4 w-4 mr-1" />
                        Request Payment from Debtor
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSettle(record)}
                        disabled={isSettling || isSettled}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
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
                        <ExternalLink className="h-4 w-4 mr-1" />
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
                      {currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span>{rate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due</span>
                    <div className="text-right">
                      <span>{formatDate(dueDate)}</span>
                      {overdue && (
                        <span className="ml-2 text-xs text-destructive">
                          {Math.abs(daysUntil)}d overdue
                        </span>
                      )}
                    </div>
                  </div>
                  {recourseEnabled && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recourse</span>
                      <Badge
                        variant="outline"
                        className="text-xs border-orange-300 text-orange-600"
                      >
                        Enabled
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      isSettled
                        ? "text-green-600 border-green-300"
                        : "text-yellow-600 border-yellow-300",
                    )}
                  >
                    {isSettled ? "Settled" : "Active"}
                  </Badge>

                  {/* Recourse button — only shown when eligible */}
                  {canRecourse && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 text-orange-600 border-orange-300 hover:bg-orange-50"
                      onClick={() => handleInitiateRecourse(record)}
                      disabled={isReclaiming}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {isReclaiming ? "Initiating…" : "Claim Recourse"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderOfferCards = () => {
    const executingList = Object.values(executingOffers);

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
    if (visibleOfferRecords.length === 0 && executingList.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent>
            <p className="font-medium">No pending offers</p>
            <p className="text-sm text-muted-foreground mt-1">
              Businesses will send you factoring offers from the marketplace
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-4">
        {executingList.length > 0 && (
          <Card className="border-amber-400/50 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="font-medium">Executing on-chain</p>
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-400">
                Accepted offers are being verified and indexed. They will move
                to Portfolio once finalized.
              </p>
              <div className="space-y-2">
                {executingList.map((item) => (
                  <div
                    key={item.invoiceHash}
                    className="rounded-md border border-amber-300/60 bg-amber-100/60 dark:bg-amber-900/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-mono text-xs text-amber-900 dark:text-amber-300">
                          {item.invoiceHash.slice(0, 12)}…
                        </p>
                        <p className="text-sm text-amber-900 dark:text-amber-300">
                          {microToAleo(`${item.amountMicro}u64`).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 6 },
                          )}{" "}
                          {item.currency} at {item.rate.toFixed(2)}%
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-amber-800 border-amber-400 dark:text-amber-400 dark:border-amber-600"
                      >
                        <Clock3 className="h-3.5 w-3.5 mr-1" />
                        Verifying
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {visibleOfferRecords.length === 0 ? (
          <Card className="py-8 text-center">
            <CardContent>
              <p className="font-medium">No pending offers</p>
              <p className="text-sm text-muted-foreground mt-1">
                New offers from businesses will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleOfferRecords.map((record, idx) => {
              const invoiceHash = getField(
                record.recordPlaintext,
                "invoice_hash",
              );
              const currency = getOfferCurrency(record);
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
              const recourseFlag =
                getField(record.recordPlaintext, "recourse") === "true";
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
                          {currency}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rate</span>
                        <span>{rate.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Recourse</span>
                        <span
                          className={cn(
                            "text-xs",
                            recourseFlag
                              ? "text-orange-500"
                              : "text-muted-foreground",
                          )}
                        >
                          {recourseFlag ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleAcceptOffer(record)}
                      disabled={isAccepting}
                    >
                      <FileCheck className="h-4 w-4" />
                      {isAccepting ? "Processing…" : "Accept Offer"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderPoolShareCards = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (poolShareRecords.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <Users className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">No pool shares</p>
              <p className="text-sm text-muted-foreground mt-1">
                Contribute to a pool from the{" "}
                <Link to="/pools" className="underline">
                  Pools page
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {poolShareRecords.map((record, idx) => (
          <PoolShareCard
            key={
              getField(record.recordPlaintext, "invoice_hash") ||
              String(record.commitment ?? idx)
            }
            record={record}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Factor Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your factoring portfolio
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              refetchPools();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/pools">
              <Users className="h-4 w-4" />
              Pools
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

      {/* Overdue recourse alert */}
      {recourseEligible.length > 0 && (
        <Card className="border-orange-300/50 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="pt-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <p className="text-sm text-orange-700 dark:text-orange-400">
              {recourseEligible.length} overdue invoice
              {recourseEligible.length !== 1 ? "s" : ""} with recourse enabled.
              Open the <strong>Portfolio</strong> tab to claim recourse.
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

      {/* Tabbed Sections */}
      <Tabs defaultValue="portfolio">
        <TabsList>
          <TabsTrigger value="portfolio">
            Portfolio
            {!isLoading && factoredRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({factoredRecords.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="offers">
            Pending Offers
            {!isLoading && visibleOfferRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({visibleOfferRecords.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pool-shares">
            Pool Shares
            {!isLoading && poolShareRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({poolShareRecords.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-4">
          {renderPortfolioCards()}
        </TabsContent>

        <TabsContent value="offers" className="mt-4">
          {renderOfferCards()}
        </TabsContent>

        <TabsContent value="pool-shares" className="mt-4">
          {renderPoolShareCards()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
