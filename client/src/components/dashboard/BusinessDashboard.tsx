import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  TrendingUp,
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
  Hourglass,
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
  getPersistedFactoredInvoiceHashes,
  getPersistedInvoiceCurrency,
  getField,
  microToAleo,
  unixToDate,
} from "@/lib/aleo-records";
import {
  fetchPendingOffer,
  type PendingOfferOnChain,
} from "@/lib/aleo-factors";
import {
  computePoolStats,
  fetchActiveFactorCount,
  fetchAllPools,
} from "@/lib/pool-chain";

export function BusinessDashboard() {
  const queryClient = useQueryClient();
  const { isConnected, requestRecords, address } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settledHashes, setSettledHashes] = useState<Set<string>>(new Set());
  const [settlingRecourseId, setSettlingRecourseId] = useState<string | null>(
    null,
  );
  const [paymentRequestedHashes, setPaymentRequestedHashes] = useState<
    Set<string>
  >(new Set());
  const [hiddenInvoiceHashes, setHiddenInvoiceHashes] = useState<Set<string>>(
    () => new Set(),
  );
  const [persistedFactoredInvoiceHashes, setPersistedFactoredInvoiceHashes] =
    useState<Set<string>>(() => getPersistedFactoredInvoiceHashes());
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
    queryKey: ["records", PROGRAM_ID],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 0, // Always refetch after invalidation
    refetchOnMount: "always",
  });

  const { data: activeFactorCount = 1 } = useQuery({
    queryKey: ["active_factor_count"],
    queryFn: fetchActiveFactorCount,
    staleTime: 60_000,
  });

  const { data: onChainPools = [], isLoading: poolsLoading } = useQuery({
    queryKey: ["all_pools"],
    queryFn: fetchAllPools,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const allRecords = (records as AleoRecord[]) ?? [];
  const allInvoiceRecords = allRecords.filter(
    (r) => r.recordName === "Invoice" && !r.spent,
  );
  const factoredRecords = allRecords.filter(
    (r) => r.recordName === "FactoredInvoice" && !r.spent,
  );
  const offerRecords = allRecords.filter(
    (r) => r.recordName === "FactoringOffer" && !r.spent,
  );
  // RecourseNotice records sent to the business (they are the original_creditor)
  const recourseNoticeRecords = allRecords.filter(
    (r) => r.recordName === "RecourseNotice" && !r.spent,
  );
  // Spent Invoice records — business can use these cross-device to reconstruct
  // display data (amount, debtor, due_date) for pending offers.
  const spentInvoiceRecords = allRecords.filter(
    (r) => r.recordName === "Invoice" && r.spent,
  );
  const spentInvoiceHashes = spentInvoiceRecords
    .map((r) => getField(r.recordPlaintext, "invoice_hash"))
    .filter(Boolean);

  const factoredInvoiceHashes = new Set(
    factoredRecords.map((record) =>
      getField(record.recordPlaintext, "invoice_hash"),
    ),
  );
  const offeredInvoiceHashes = new Set(
    offerRecords.map((record) =>
      getField(record.recordPlaintext, "invoice_hash"),
    ),
  );

  // Query on-chain pending_offers mapping for each spent Invoice hash.
  // This is the cross-device source of truth: written by authorize_factoring,
  // cleared (is_executed=true) by execute_factoring.
  const { data: onChainPendingOffers = [], isLoading: pendingOffersLoading } =
    useQuery<PendingOfferOnChain[]>({
      queryKey: ["pending_offers", spentInvoiceHashes],
      queryFn: async () => {
        const results = await Promise.all(
          spentInvoiceHashes.map((hash) => fetchPendingOffer(hash)),
        );
        return results.filter((r): r is PendingOfferOnChain => r !== null);
      },
      enabled: isConnected && spentInvoiceHashes.length > 0,
      staleTime: 30_000,
      refetchInterval: 60_000,
    });

  // Build a lookup map from invoice_hash → spent Invoice record for display enrichment.
  const spentInvoiceByHash = new Map(
    spentInvoiceRecords.map((r) => [
      getField(r.recordPlaintext, "invoice_hash"),
      r,
    ]),
  );

  // Merge on-chain pending offer info with display data from spent Invoice records.
  const pendingFactoringRequests = onChainPendingOffers
    .map((offer) => {
      const spentRec = spentInvoiceByHash.get(offer.invoiceHash);
      const currency = spentRec
        ? decodeInvoiceCurrencyFromMetadata(
            getField(spentRec.recordPlaintext, "metadata"),
          )
        : ((offer.useToken ? "USDCx" : "ALEO") as "ALEO" | "USDCx");
      return {
        invoiceHash: offer.invoiceHash,
        factorAddress: offer.factor,
        debtor: spentRec ? getField(spentRec.recordPlaintext, "debtor") : "",
        amountMicro: spentRec
          ? parseInt(
              getField(spentRec.recordPlaintext, "amount").replace(/u64$/, ""),
              10,
            )
          : 0,
        currency,
        dueDateUnix: spentRec
          ? parseInt(
              getField(spentRec.recordPlaintext, "due_date").replace(
                /u64$/,
                "",
              ),
              10,
            )
          : 0,
        requestedAt: offer.requestedAt * 1000, // seconds → ms
      };
    })
    .sort((a, b) => b.requestedAt - a.requestedAt);
  const submittedPoolOffers = onChainPools.filter((pool) => {
    if (!pool.pendingOffer || pool.pendingOffer.originalCreditor !== address) {
      return false;
    }

    const stats = computePoolStats(pool, activeFactorCount);
    return !pool.pendingOffer.isExecuted && !stats.allVotesCast;
  });
  const submittedPoolInvoiceHashes = new Set(
    submittedPoolOffers.map((pool) => pool.meta.invoiceHash),
  );
  const activeInvoiceRecords = allInvoiceRecords.filter((record) => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    return (
      !factoredInvoiceHashes.has(invoiceHash) &&
      !offeredInvoiceHashes.has(invoiceHash) &&
      !persistedFactoredInvoiceHashes.has(invoiceHash)
    );
  });
  const historicalInvoiceRecords = spentInvoiceRecords.filter((record) => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    return (
      submittedPoolInvoiceHashes.has(invoiceHash) ||
      factoredInvoiceHashes.has(invoiceHash) ||
      persistedFactoredInvoiceHashes.has(invoiceHash)
    );
  });
  const visibleInvoiceRecords = [
    ...activeInvoiceRecords,
    ...historicalInvoiceRecords,
  ].filter(
    (record) =>
      !hiddenInvoiceHashes.has(
        getField(record.recordPlaintext, "invoice_hash"),
      ),
  );

  useEffect(() => {
    const syncPersistedFactoredHashes = () => {
      setPersistedFactoredInvoiceHashes(getPersistedFactoredInvoiceHashes());
    };

    window.addEventListener(
      "zkfactor:factored-invoices-changed",
      syncPersistedFactoredHashes,
    );
    window.addEventListener("storage", syncPersistedFactoredHashes);

    return () => {
      window.removeEventListener(
        "zkfactor:factored-invoices-changed",
        syncPersistedFactoredHashes,
      );
      window.removeEventListener("storage", syncPersistedFactoredHashes);
    };
  }, []);

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

  const totalAleo = visibleInvoiceRecords
    .filter((r) => getInvoiceCurrency(r) === "ALEO")
    .reduce((sum, r) => sum + microToAleo(getField(r.recordPlaintext, "amount") || "0u64"), 0);
  const totalUSDCx = visibleInvoiceRecords
    .filter((r) => getInvoiceCurrency(r) === "USDCx")
    .reduce((sum, r) => sum + microToAleo(getField(r.recordPlaintext, "amount") || "0u64"), 0);
  const currencyValues: string[] = [];
  if (totalAleo > 0) currencyValues.push(`${totalAleo.toLocaleString(undefined, { maximumFractionDigits: 2 })} ALEO`);
  if (totalUSDCx > 0) currencyValues.push(`${totalUSDCx.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDCx`);
  if (currencyValues.length === 0) currencyValues.push("0 ALEO");
  const [totalValueIndex, setTotalValueIndex] = useState(0);
  useEffect(() => {
    if (currencyValues.length <= 1) return;
    const id = setInterval(() => {
      setTotalValueIndex((i) => (i + 1) % currencyValues.length);
    }, 2500);
    return () => clearInterval(id);
  }, [currencyValues.length]);

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
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    const recordId = record.commitment ?? invoiceHash;
    setSettlingId(recordId);
    setHiddenInvoiceHashes((prev) => new Set(prev).add(invoiceHash));
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
      setHiddenInvoiceHashes((prev) => {
        const next = new Set(prev);
        next.delete(invoiceHash);
        return next;
      });
      return;
    }
    if (!creditsRecord) {
      toast.error("Insufficient credits to fund this factoring");
      setSettlingId(null);
      setHiddenInvoiceHashes((prev) => {
        const next = new Set(prev);
        next.delete(invoiceHash);
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
      value: isLoading ? "…" : String(visibleInvoiceRecords.length),
      icon: <FileText className="h-5 w-5 text-primary" />,
    },
    {
      title: "Total Value",
      value: isLoading ? (
        "…"
      ) : (
        <span
          key={totalValueIndex}
          className="animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          {currencyValues[totalValueIndex % currencyValues.length]}
        </span>
      ),
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
    },
    {
      title: "Pending Offers",
      value:
        isLoading || pendingOffersLoading
          ? "…"
          : String(pendingFactoringRequests.length),
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
    if (visibleInvoiceRecords.length === 0) {
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
                <Plus className="h-4 w-4" />
                Create Invoice
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleInvoiceRecords.map((invoice, idx) => {
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
          const isPaid = settledHashes.has(invoiceHash);
          const isSubmittedToPool = submittedPoolInvoiceHashes.has(invoiceHash);
          const isFactored =
            factoredInvoiceHashes.has(invoiceHash) ||
            persistedFactoredInvoiceHashes.has(invoiceHash);
          const statusLabel = isPaid
            ? "Paid"
            : isSubmittedToPool
              ? "Submitted to Pool"
              : isFactored
                ? "Factored"
                : "Open";
          const statusClassName = isPaid
            ? "text-emerald-600 border-emerald-300"
            : isSubmittedToPool
              ? "text-blue-600 border-blue-300"
              : isFactored
                ? "text-violet-600 border-violet-300"
                : "text-amber-700 border-amber-300";
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
                  <div className="flex items-center gap-1.5 -mt-1 -mr-1">
                    <Badge
                      variant="outline"
                      className={cn("text-xs", statusClassName)}
                    >
                      {statusLabel}
                    </Badge>
                    {daysUntil < 0 && (
                      <Badge
                        variant="outline"
                        className="text-xs text-destructive border-destructive/40"
                      >
                        Overdue
                      </Badge>
                    )}
                    {daysUntil >= 0 && daysUntil < 7 && (
                      <Badge
                        variant="outline"
                        className="text-xs text-amber-700 border-amber-300"
                      >
                        Due Soon
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={6}>
                        <DropdownMenuItem
                          onClick={() =>
                            window.open(
                              `${import.meta.env.VITE_ALEO_EXPLORER}/transaction/${invoice.transactionId}`,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                          View on Explorer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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

  const renderPendingCards = () => {
    if (isLoading || poolsLoading || pendingOffersLoading) {
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
    if (
      pendingFactoringRequests.length === 0 &&
      submittedPoolOffers.length === 0
    ) {
      return (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <Hourglass className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">No pending offers</p>
              <p className="text-sm text-muted-foreground">
                Invoices awaiting factor acceptance will appear here
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pendingFactoringRequests.map((request, idx) => {
          const dueDate = new Date(request.dueDateUnix * 1000);
          const daysUntil = getDaysUntilDue(dueDate);
          return (
            <Card
              key={request.invoiceHash || idx}
              className="hover:border-primary/50 transition-colors"
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    {request.invoiceHash.slice(0, 12)}…
                  </span>
                  <div className="flex items-center gap-1.5 -mt-1 -mr-1 shrink-0">
                    <Badge
                      variant="outline"
                      className="text-xs text-amber-700 border-amber-300"
                    >
                      Awaiting Approval
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Factor</span>
                    <AddressDisplay
                      address={request.factorAddress}
                      chars={4}
                      showExplorer
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Debtor</span>
                    <AddressDisplay
                      address={request.debtor}
                      chars={4}
                      showExplorer
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono font-medium">
                      {(request.amountMicro / 1_000_000).toLocaleString(
                        undefined,
                        { maximumFractionDigits: 6 },
                      )}{" "}
                      {request.currency}
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
        {submittedPoolOffers.map((pool) => {
          const stats = computePoolStats(pool, activeFactorCount);
          const decisionLabel = stats.allVotesCast
            ? stats.isApproved
              ? "Approved"
              : "Rejected"
            : "Pending";
          const offer = pool.pendingOffer!;
          const aleoAmount = microToAleo(`${offer.amount}u64`);
          const dueDate = unixToDate(`${offer.dueDate}u64`);
          const rate = offer.advanceRate / 100;
          const poolDaysUntil = getDaysUntilDue(dueDate);
          return (
            <Card
              key={`submitted-${pool.meta.invoiceHash}`}
              className="hover:border-primary/50 transition-colors"
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight truncate">
                      {pool.meta.name}
                    </p>
                    <span className="font-mono text-xs text-muted-foreground">
                      {pool.meta.invoiceHash.slice(0, 12)}…
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 -mt-1 -mr-1 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        stats.allVotesCast && stats.isApproved
                          ? "text-green-600 border-green-300"
                          : stats.allVotesCast && !stats.isApproved
                            ? "text-destructive border-destructive/40"
                            : "text-yellow-600 border-yellow-300",
                      )}
                    >
                      {decisionLabel}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      asChild
                    >
                      <Link to="/pools">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono font-medium">
                      {aleoAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      {pool.meta.currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Advance Rate</span>
                    <span>{rate.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due</span>
                    <div className="text-right">
                      <span>{formatDate(dueDate)}</span>
                      <span
                        className={cn(
                          "ml-2 text-xs",
                          poolDaysUntil < 0
                            ? "text-destructive"
                            : poolDaysUntil < 7
                              ? "text-warning"
                              : "text-muted-foreground",
                        )}
                      >
                        {poolDaysUntil > 0
                          ? `${poolDaysUntil}d`
                          : poolDaysUntil === 0
                            ? "today"
                            : `${Math.abs(poolDaysUntil)}d overdue`}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Votes</span>
                    <span>
                      {stats.totalVotes}/{stats.requiredVotes}
                    </span>
                  </div>
                </div>
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
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/marketplace">Choose Factors</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/invoices/create">
              <Plus className="h-4 w-4" />
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
            {!isLoading && visibleInvoiceRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({visibleInvoiceRecords.length})
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
          <TabsTrigger value="pending">
            Pending Offers
            {!isLoading &&
              !poolsLoading &&
              pendingFactoringRequests.length + submittedPoolOffers.length >
                0 && (
                <span className="ml-1.5 text-xs opacity-70">
                  (
                  {pendingFactoringRequests.length + submittedPoolOffers.length}
                  )
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

        <TabsContent value="pending" className="mt-4">
          {renderPendingCards()}
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
                <div className="flex items-center justify-between gap-2 pl-3 rounded-md bg-muted/50 border border-border">
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
                <div className="flex items-center justify-between gap-2 pl-3 rounded-md bg-muted/50 border border-border">
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
                <div className="flex items-center justify-between gap-2 pl-3 rounded-md bg-muted/50 border border-border">
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
                <div className="flex items-center justify-between gap-2 pl-3 rounded-md bg-muted/50 border border-border">
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
                  <ExternalLink className="h-4 w-4" />
                  View on Explorer
                </Button>
              )}
              <Button asChild className="w-full">
                <Link to="/marketplace">Choose a Factor</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
