import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Send,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressDisplay } from "@/components/ui/address-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { cn } from "@/lib/utils";
import { formatAdvanceRate } from "@/lib/format";
import { toast } from "sonner";
import { PROGRAM_ID } from "@/lib/config";
import {
  type AleoRecord,
  decodeInvoiceCurrencyFromMetadata,
  getField,
  getPersistedInvoiceCurrency,
  persistFactoredInvoiceHash,
} from "@/lib/aleo-records";
import { type FactorInfo, fetchActiveFactors } from "@/lib/aleo-factors";
import {
  buildPoolSubmitInvoiceInputs,
  computePoolStats,
  fetchAllPools,
  fetchActiveFactorCount,
  type OnChainPoolState,
} from "../lib/pool-chain";
import {
  removePendingFactoringRequest,
  upsertPendingFactoringRequest,
} from "@/lib/pending-factoring";

// ── helpers ───────────────────────────────────────────────────────────
function formatMicro(micro: bigint | number): string {
  const n = typeof micro === "bigint" ? Number(micro) : micro;
  return (n / 1_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

function getInvoiceSelectionId(record: AleoRecord): string {
  const hash = getField(record.recordPlaintext, "invoice_hash");
  return record.commitment ?? hash;
}

function parseInvoiceAmountMicro(record: AleoRecord): number {
  return parseInt(
    getField(record.recordPlaintext, "amount").replace(/u64$/, ""),
    10,
  );
}

function getInvoiceCurrency(
  record: AleoRecord,
  invoiceHash: string,
): "ALEO" | "USDCx" {
  const metadata = getField(record.recordPlaintext, "metadata");
  const fromMetadata = decodeInvoiceCurrencyFromMetadata(metadata);
  const cached = getPersistedInvoiceCurrency(invoiceHash);
  return cached ?? fromMetadata;
}


// ── types ─────────────────────────────────────────────────────────────
type PendingAction = "factor" | "submit-invoice-pool" | null;

export default function Marketplace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isConnected, requestRecords, address } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();

  // ── general UI state ───────────────────────────────────────────────
  const isWorking = status !== "idle";
  const [searchQuery, setSearchQuery] = useState("");

  // ── factor invoice dialog state ────────────────────────────────────
  const [selectedFactor, setSelectedFactor] = useState<FactorInfo | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [advanceRateInput, setAdvanceRateInput] = useState("");
  const [partialAmountInput, setPartialAmountInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── pool invoice submit dialog (business) ─────────────────────────
  const [submitInvoiceOpen, setSubmitInvoiceOpen] = useState(false);
  const [submitInvoicePool, setSubmitInvoicePool] =
    useState<OnChainPoolState | null>(null);
  const [submitInvoiceSelectedId, setSubmitInvoiceSelectedId] = useState("");
  const [submitInvoiceRate, setSubmitInvoiceRate] = useState("");

  // ── misc state ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"all" | "factors" | "pools">("all");
  const [noInvoiceDialogOpen, setNoInvoiceDialogOpen] = useState(false);

  // ── refs (survive re-renders during async execute) ─────────────────
  const pendingActionRef = useRef<PendingAction>(null);
  const pendingFactorModeRef = useRef<{ usePartial: boolean } | null>(null);
  const pendingFactoringHashRef = useRef<string | null>(null);

  // ── data queries ───────────────────────────────────────────────────
  const {
    data: factors,
    isLoading: factorsLoading,
    isError: factorsError,
    refetch: refetchFactors,
  } = useQuery({
    queryKey: ["active_factors"],
    queryFn: fetchActiveFactors,
    staleTime: 60_000,
    retry: false,
  });

  const { data: activeFactorCount = 1 } = useQuery({
    queryKey: ["active_factor_count"],
    queryFn: fetchActiveFactorCount,
    staleTime: 60_000,
  });

  const {
    data: onChainPools = [],
    isLoading: poolsLoading,
    refetch: refetchPools,
  } = useQuery({
    queryKey: ["all_pools"],
    queryFn: fetchAllPools,
    staleTime: 30_000,
    refetchInterval: 90_000,
  });

  const { data: records } = useQuery({
    queryKey: ["records", PROGRAM_ID, "invoices"],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 60_000,
  });

  // ── derived record lists ───────────────────────────────────────────
  const invoiceRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "Invoice" && !r.spent,
  );
  const filteredFactors = (factors ?? []).filter(
    (f) =>
      !searchQuery ||
      f.address.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const allPools = Array.isArray(onChainPools) ? onChainPools : [];
  const openPools = allPools.filter((pool) => {
    const stats = computePoolStats(pool, activeFactorCount);
    return !pool.isClosed && !stats.hasPendingOffer;
  });

  // ── invoice dialog computed values ────────────────────────────────
  const advanceRatePercent = advanceRateInput ? parseFloat(advanceRateInput) : 0;
  const advanceRateBps = Math.round(advanceRatePercent * 100);
  const factorMinRate = selectedFactor?.min_advance_rate ?? 5000;
  const factorMaxRate = selectedFactor?.max_advance_rate ?? 9900;
  const advanceRateValid =
    Number.isFinite(advanceRatePercent) &&
    advanceRateBps >= factorMinRate &&
    advanceRateBps <= factorMaxRate;

  const selectedInvoiceRecord = invoiceRecords.find(
    (r) => getInvoiceSelectionId(r) === selectedInvoiceId,
  );
  const selectedInvoiceAmountMicro = selectedInvoiceRecord
    ? parseInvoiceAmountMicro(selectedInvoiceRecord)
    : 0;
  const selectedInvoiceHash = selectedInvoiceRecord
    ? getField(selectedInvoiceRecord.recordPlaintext, "invoice_hash")
    : "";
  const selectedInvoiceCurrency = selectedInvoiceRecord
    ? getInvoiceCurrency(selectedInvoiceRecord, selectedInvoiceHash)
    : "ALEO";
  const formattedInvoiceAmount = (
    selectedInvoiceAmountMicro / 1_000_000
  ).toLocaleString(undefined, { maximumFractionDigits: 6 });
  const partialAmountMicro = partialAmountInput
    ? Math.round(parseFloat(partialAmountInput) * 1_000_000)
    : 0;
  const wantsPartial = partialAmountInput.trim().length > 0;
  const partialAmountValid =
    !wantsPartial ||
    (Number.isFinite(partialAmountMicro) &&
      partialAmountMicro > 0 &&
      partialAmountMicro < selectedInvoiceAmountMicro);

  // ── pool submit invoice — available invoices ───────────────────────
  const availableInvoicesForPool = submitInvoicePool ? invoiceRecords : [];

  // ── pool submit dialog computed values ────────────────────────────
  // submitInvoiceRate stores a percentage string (e.g. "75" for 75%)
  const submitRatePercent = submitInvoiceRate ? parseFloat(submitInvoiceRate) : 0;
  const submitRateBps = Math.round(submitRatePercent * 100);
  const submitRateValid =
    Number.isFinite(submitRatePercent) &&
    submitRatePercent >= 50 &&
    submitRatePercent <= 99;

  const submitInvoiceRecord = availableInvoicesForPool.find(
    (r) => getInvoiceSelectionId(r) === submitInvoiceSelectedId,
  );
  const submitAdvanceAmount =
    submitInvoiceRecord && submitRateValid
      ? Math.floor(
          (parseInvoiceAmountMicro(submitInvoiceRecord) * submitRateBps) /
            10000,
        )
      : 0;
  // In range-based pools, check if the submitted rate is within the pool's min/max
  const submitRateInRange =
    !!submitInvoicePool &&
    submitRateBps >= submitInvoicePool.meta.minAdvanceRate &&
    submitRateBps <= submitInvoicePool.meta.maxAdvanceRate;

  // ── transaction status watcher ────────────────────────────────────
  useEffect(() => {
    const opId = "marketplace-op";
    const action = pendingActionRef.current;

    if (status === "submitting")
      toast.loading("Generating proof…", { id: opId });
    else if (status === "pending") toast.loading("Broadcasting…", { id: opId });
    else if (status === "accepted") {
      const shouldNav = action === "factor";

      if (action === "factor") {
        toast.success("Invoice factored successfully!", { id: opId });
        setDialogOpen(false);
        pendingFactorModeRef.current = null;
        pendingFactoringHashRef.current = null;
      } else if (action === "submit-invoice-pool") {
        toast.success("Invoice submitted to pool — factors can now vote!", {
          id: opId,
        });
        if (submitInvoiceRecord) {
          persistFactoredInvoiceHash(
            getField(submitInvoiceRecord.recordPlaintext, "invoice_hash"),
          );
        }
        setSubmitInvoiceOpen(false);
        setSubmitInvoicePool(null);
        refetchPools();
      }

      pendingActionRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });

      if (shouldNav) {
        queryClient.removeQueries({ queryKey: ["records", PROGRAM_ID] });
        navigate("/dashboard?refresh=1", { replace: true });
      }

      reset();
    } else if (status === "failed") {
      let msg = "Transaction failed";
      if (action === "factor") {
        msg = "Factoring failed";
        if (address && pendingFactoringHashRef.current) {
          removePendingFactoringRequest(
            address,
            pendingFactoringHashRef.current,
          );
          pendingFactoringHashRef.current = null;
        }
        if (
          pendingFactorModeRef.current?.usePartial &&
          typeof txError === "string" &&
          /authorize_partial.*not defined/i.test(txError)
        ) {
          msg =
            "Partial factoring unavailable on this deployment. Clear partial amount for full factoring.";
        }
        pendingFactorModeRef.current = null;
      } else if (action === "submit-invoice-pool")
        msg = "Invoice submission failed";

      toast.error(txError || msg, { id: opId });
      pendingActionRef.current = null;
      reset();
    }
  }, [
    status,
    txError,
    queryClient,
    reset,
    address,
    navigate,
    refetchPools,
    submitInvoiceRecord,
  ]);

  // ── action: factor invoice ─────────────────────────────────────────
  const handleFactorInvoice = async () => {
    if (
      !selectedFactor ||
      !selectedInvoiceId ||
      !advanceRateValid ||
      !partialAmountValid
    )
      return;
    const invoice = invoiceRecords.find(
      (r) => getInvoiceSelectionId(r) === selectedInvoiceId,
    );
    if (!invoice) return;

    const invoiceHash = getField(invoice.recordPlaintext, "invoice_hash");
    const invoiceAmountMicro = parseInvoiceAmountMicro(invoice);
    const usePartial = wantsPartial && partialAmountMicro < invoiceAmountMicro;
    const useToken = selectedInvoiceCurrency === "USDCx";
    const functionName = usePartial
      ? "authorize_partial_factoring"
      : "authorize_factoring";
    const inputs = usePartial
      ? [
          invoice.recordPlaintext,
          selectedFactor.address,
          `${partialAmountMicro}u64`,
          `${advanceRateBps}u16`,
          useToken ? "true" : "false",
          "false",
        ]
      : [
          invoice.recordPlaintext,
          selectedFactor.address,
          `${advanceRateBps}u16`,
          useToken ? "true" : "false",
          "false",
        ];

    if (address) {
      upsertPendingFactoringRequest(address, {
        invoiceHash,
        factorAddress: selectedFactor.address,
        debtor: getField(invoice.recordPlaintext, "debtor"),
        amountMicro: invoiceAmountMicro,
        dueDateUnix: parseInt(
          getField(invoice.recordPlaintext, "due_date").replace(/u64$/, ""),
          10,
        ),
        currency: selectedInvoiceCurrency,
        requestedAt: Date.now(),
      });
      pendingFactoringHashRef.current = invoiceHash;
    }

    pendingFactorModeRef.current = { usePartial };
    pendingActionRef.current = "factor";

    await execute({
      program: PROGRAM_ID,
      function: functionName,
      inputs,
      fee: 100_000,
      privateFee: false,
    });
  };

  // ── action: business submits invoice to pool ───────────────────────
  const openSubmitInvoice = (pool: OnChainPoolState) => {
    if (invoiceRecords.length === 0) {
      setNoInvoiceDialogOpen(true);
      return;
    }
    setSubmitInvoicePool(pool);
    setSubmitInvoiceSelectedId("");
    setSubmitInvoiceRate("");
    setSubmitInvoiceOpen(true);
  };

  const handleSubmitInvoice = async () => {
    if (!submitInvoicePool || !submitInvoiceRecord || !submitRateValid) return;
    if (!submitRateInRange) {
      toast.error(
        `Advance rate ${formatAdvanceRate(submitRateBps)} is outside pool range ${formatAdvanceRate(submitInvoicePool.meta.minAdvanceRate)}–${formatAdvanceRate(submitInvoicePool.meta.maxAdvanceRate)}`,
      );
      return;
    }

    if (submitInvoicePool.totalContributed <= 0n) {
      toast.error(
        "This pool has no funds yet. It will reject invoice submissions until contributors fund it.",
      );
      return;
    }

    if (BigInt(submitAdvanceAmount) > submitInvoicePool.totalContributed) {
      toast.error(
        `This pool only has ${formatMicro(submitInvoicePool.totalContributed)} ALEO available, but this invoice needs ${formatMicro(BigInt(submitAdvanceAmount))} ALEO.`,
      );
      return;
    }

    pendingActionRef.current = "submit-invoice-pool";
    await execute({
      program: PROGRAM_ID,
      function: "pool_submit_invoice",
      inputs: buildPoolSubmitInvoiceInputs(
        submitInvoiceRecord.recordPlaintext,
        submitInvoicePool.meta.invoiceHash,
        submitRateBps,
      ),
      fee: 100_000,
      privateFee: false,
    });
  };

  // ── pool card renderer ─────────────────────────────────────────────
  const renderPoolCard = (pool: OnChainPoolState) => {
    return (
      <Card
        key={pool.meta.invoiceHash}
        className="hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => navigate(`/pools/${pool.meta.invoiceHash}`)}
      >
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">{pool.meta.name}</CardTitle>
            <Badge variant="outline" className="text-xs text-blue-600 border-blue-300/60 w-fit">
              Pool
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Min Rate</p>
              <p className="font-semibold text-primary">
                {(pool.meta.minAdvanceRate / 100).toFixed(2)}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Max Rate</p>
              <p className="font-semibold text-primary">
                {(pool.meta.maxAdvanceRate / 100).toFixed(2)}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Total Raised</p>
              <p className="font-semibold">
                {formatMicro(pool.totalContributed)} ALEO
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Min Contribution</p>
              <p className="font-semibold text-sm">
                {formatMicro(pool.meta.minContribution)} ALEO
              </p>
            </div>
          </div>

          {isConnected && (
            <Button
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                openSubmitInvoice(pool);
              }}
            >
              <Zap className="h-4 w-4 mr-1.5" />
              Factor
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── main render ───────────────────────────────────────────────────
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Browse Factors & Pools</h1>
        <p className="text-muted-foreground">
          Find factors and join on-chain pools — no account needed to browse.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Sidebar */}
        <Card className="lg:col-span-1 h-fit sticky top-20">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Search by address</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="aleo1…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex rounded-md overflow-hidden border text-sm">
              {(["all", "factors", "pools"] as const).map((tab) => (
                <button
                  key={tab}
                  className={cn(
                    "flex-1 py-1.5 capitalize transition-colors",
                    activeTab === tab
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-muted",
                  )}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                refetchFactors();
                refetchPools();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          {factorsError && activeTab !== "pools" && (
            <Card className="border-destructive/50">
              <CardContent className="pt-6 flex items-center gap-4">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">
                  Failed to load factors from chain.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchFactors()}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Pools tab ── */}
          {activeTab !== "factors" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {poolsLoading ? (
                [0, 1].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <Skeleton className="h-5 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : openPools.length === 0 ? (
                <div className="col-span-2">
                  <Card className="border-dashed">
                    <CardContent className="py-16 text-center space-y-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">No open pools</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                          There are no pools accepting submissions right now.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                openPools.map(renderPoolCard)
              )}
            </div>
          )}

          {/* ── Factors tab ── */}
          {activeTab !== "pools" && (
            <div className="grid gap-4 sm:grid-cols-2">
              {factorsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3">
                      <Skeleton className="h-5 w-48" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredFactors.length === 0 ? (
                <div className="col-span-2">
                  <Card className="border-dashed">
                    <CardContent className="py-16 text-center space-y-4">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          No active factors yet
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                          Be the first to register as a factor.
                        </p>
                      </div>
                      <Button asChild>
                        <Link to="/settings">
                          Register as Factor
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                filteredFactors.map((factor) => (
                  <Card
                    key={factor.address}
                    className="hover:border-primary/50 transition-colors"
                  >
                    <CardHeader className="pb-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          Anonymous Factor
                        </CardTitle>
                        <AddressDisplay address={factor.address} chars={4} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Min Rate
                          </p>
                          <p className="font-semibold text-primary">
                            {(factor.min_advance_rate / 100).toFixed(2)}%
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Max Rate
                          </p>
                          <p className="font-semibold text-primary">
                            {(factor.max_advance_rate / 100).toFixed(2)}%
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Invoices Factored
                          </p>
                          <p className="font-semibold">
                            {factor.total_factored.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Status
                          </p>
                          <Badge
                            variant="outline"
                            className="text-xs text-primary border-primary/30"
                          >
                            Active
                          </Badge>
                        </div>
                      </div>

                      {isConnected && (
                        <Dialog
                          open={
                            dialogOpen &&
                            selectedFactor?.address === factor.address
                          }
                          onOpenChange={(open) => {
                            setDialogOpen(open);
                            if (!open) return;
                            if (selectedFactor?.address !== factor.address) {
                              setSelectedFactor(factor);
                              setSelectedInvoiceId("");
                              setAdvanceRateInput("");
                              setPartialAmountInput("");
                            }
                          }}
                        >
                          <Button
                            className="w-full"
                            onClick={() => {
                              if (invoiceRecords.length === 0) {
                                setNoInvoiceDialogOpen(true);
                                return;
                              }
                              if (selectedFactor?.address !== factor.address) {
                                setSelectedFactor(factor);
                                setSelectedInvoiceId("");
                                setAdvanceRateInput("");
                                setPartialAmountInput("");
                              }
                              setDialogOpen(true);
                            }}
                          >
                            <Zap className="h-4 w-4 mr-1.5" />
                            Factor
                          </Button>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Factor Invoice</DialogTitle>
                              <DialogDescription>
                                Sell your invoice to this factor at an agreed
                                advance rate.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-2">
                              <div className="space-y-2">
                                <Label>Factor</Label>
                                <AddressDisplay
                                  address={factor.address}
                                  showExplorer
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Select Invoice</Label>
                                <Select
                                  value={selectedInvoiceId}
                                  onValueChange={setSelectedInvoiceId}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose an invoice…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {invoiceRecords.length === 0 ? (
                                      <SelectItem value="_none" disabled>
                                        No invoices available
                                      </SelectItem>
                                    ) : (
                                      invoiceRecords.map((r) => {
                                        const hash = getField(
                                          r.recordPlaintext,
                                          "invoice_hash",
                                        );
                                        const selId = getInvoiceSelectionId(r);
                                        const currency = getInvoiceCurrency(
                                          r,
                                          hash,
                                        );
                                        const amount = (
                                          parseInvoiceAmountMicro(r) / 1_000_000
                                        ).toFixed(6);
                                        return (
                                          <SelectItem key={selId} value={selId}>
                                            {hash.slice(0, 12)}… — {amount}{" "}
                                            {currency}
                                          </SelectItem>
                                        );
                                      })
                                    )}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>
                                  Partial Amount ({selectedInvoiceCurrency},
                                  optional)
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.000001"
                                  placeholder={`Leave empty to factor full ${formattedInvoiceAmount}`}
                                  value={partialAmountInput}
                                  onChange={(e) =>
                                    setPartialAmountInput(e.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>
                                  Advance Rate (%, {formatAdvanceRate(factorMinRate)}–
                                  {formatAdvanceRate(factorMaxRate)})
                                </Label>
                                <Input
                                  type="number"
                                  placeholder={`e.g. ${(factorMaxRate / 100).toFixed(0)}`}
                                  min={factorMinRate / 100}
                                  max={factorMaxRate / 100}
                                  step="0.01"
                                  value={advanceRateInput}
                                  onChange={(e) =>
                                    setAdvanceRateInput(e.target.value)
                                  }
                                />
                                {advanceRateInput && (
                                  <p
                                    className={cn(
                                      "text-xs",
                                      advanceRateValid
                                        ? "text-muted-foreground"
                                        : "text-destructive",
                                    )}
                                  >
                                    {advanceRateValid
                                      ? `${formatAdvanceRate(advanceRateBps)} advance`
                                      : `Must be between ${formatAdvanceRate(factorMinRate)} and ${formatAdvanceRate(factorMaxRate)}`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setDialogOpen(false)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleFactorInvoice}
                                disabled={
                                  !selectedInvoiceId ||
                                  !advanceRateValid ||
                                  !partialAmountValid ||
                                  isWorking ||
                                  selectedInvoiceId === "_none"
                                }
                              >
                                {isWorking &&
                                pendingActionRef.current === "factor"
                                  ? "Processing…"
                                  : "Confirm"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Submit Invoice to Pool dialog (business) ───────────────── */}
      <Dialog
        open={submitInvoiceOpen}
        onOpenChange={(o) => {
          setSubmitInvoiceOpen(o);
          if (!o) setSubmitInvoicePool(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Submit Invoice to Pool
            </DialogTitle>
            <DialogDescription>
              Your invoice will be consumed on-chain. Factors will vote to
              approve — once majority agrees, the advance is released.
            </DialogDescription>
          </DialogHeader>
          {submitInvoicePool && (
            <div className="space-y-4 py-2">
              {submitInvoicePool.totalContributed <= 0n ? (
                <div className="rounded-md border border-amber-300/60 bg-amber-950/5 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                  <p className="font-medium">Pool has no funds yet</p>
                  <p>
                    Invoice submission will be rejected until contributors add
                    liquidity to this pool.
                  </p>
                </div>
              ) : BigInt(submitAdvanceAmount) >
                submitInvoicePool.totalContributed ? (
                <div className="rounded-md border border-amber-300/60 bg-amber-950/5 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                  <p className="font-medium">
                    Pool is underfunded for this invoice
                  </p>
                  <p>
                    Available: {formatMicro(submitInvoicePool.totalContributed)}{" "}
                    ALEO · Required: {formatMicro(BigInt(submitAdvanceAmount))}{" "}
                    ALEO
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Select Invoice</Label>
                <Select
                  value={submitInvoiceSelectedId}
                  onValueChange={setSubmitInvoiceSelectedId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose invoice…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInvoicesForPool.map((r) => {
                      const selId = getInvoiceSelectionId(r);
                      const hash = getField(
                        r.recordPlaintext,
                        "invoice_hash",
                      );
                      const amount = (
                        parseInvoiceAmountMicro(r) / 1_000_000
                      ).toFixed(6);
                      return (
                        <SelectItem key={selId} value={selId}>
                          {hash.slice(0, 12)}… — {amount} ALEO
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Advance Rate (%) — must be within pool range (
                  {formatAdvanceRate(submitInvoicePool.meta.minAdvanceRate)}–
                  {formatAdvanceRate(submitInvoicePool.meta.maxAdvanceRate)})
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 75"
                  min="50"
                  max="99"
                  step="0.01"
                  value={submitInvoiceRate}
                  onChange={(e) => setSubmitInvoiceRate(e.target.value)}
                />
                {submitInvoiceRecord &&
                  submitRateValid &&
                  !submitRateInRange && (
                    <p className="text-xs text-destructive">
                      Rate {formatAdvanceRate(submitRateBps)} is outside pool range (
                      {formatAdvanceRate(submitInvoicePool.meta.minAdvanceRate)}–
                      {formatAdvanceRate(submitInvoicePool.meta.maxAdvanceRate)})
                    </p>
                  )}
                {submitInvoiceRecord &&
                  submitRateValid &&
                  submitRateInRange && (
                    <p className="text-xs text-muted-foreground">
                      Advance = {formatMicro(submitAdvanceAmount)} ALEO ✓
                    </p>
                  )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitInvoiceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitInvoice}
              disabled={
                isWorking ||
                !submitInvoiceRecord ||
                !submitRateValid ||
                !submitRateInRange
              }
            >
              {isWorking && pendingActionRef.current === "submit-invoice-pool"
                ? "Submitting…"
                : "Submit Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── No invoices warning dialog ─────────────────────────────── */}
      <Dialog open={noInvoiceDialogOpen} onOpenChange={setNoInvoiceDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>No invoices available</DialogTitle>
          </DialogHeader>
          <div className="rounded-md border border-amber-300/60 bg-amber-950/5 p-3 text-xs text-amber-700 dark:text-amber-400">
            You need to create an invoice before you can factor it. Go to your
            dashboard to create one.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoInvoiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setNoInvoiceDialogOpen(false);
                navigate("/dashboard");
              }}
            >
              Go to Dashboard
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
