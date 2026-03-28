import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Users,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Plus,
  TrendingUp,
  ChevronRight,
  Layers,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AddressDisplay } from "@/components/ui/address-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from "sonner";
import { PROGRAM_ID } from "@/lib/config";
import {
  type AleoRecord,
  decodeInvoiceCurrencyFromMetadata,
  getField,
  getPersistedInvoiceCurrency,
} from "@/lib/aleo-records";
import { type FactorInfo, fetchActiveFactors } from "@/lib/aleo-factors";
import {
  buildCreatePoolInputs,
  buildClaimPoolProceedsInputs,
  buildContributeToPoolInputs,
  fetchInvoiceSettled,
  fetchPoolClosed,
} from "@/lib/aleo-factors";
import {
  listPoolDirectory,
  type PoolDirectoryEntry,
  upsertPoolCreation,
  upsertPoolContribution,
} from "@/lib/pool-directory";

export default function Marketplace() {
  const queryClient = useQueryClient();
  const { isConnected, requestRecords, activeRole, address } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const isFactoring = status !== "idle";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFactor, setSelectedFactor] = useState<FactorInfo | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [lockedPoolInvoiceHash, setLockedPoolInvoiceHash] = useState<
    string | null
  >(null);
  const [advanceRateInput, setAdvanceRateInput] = useState<string>("");
  const [partialAmountInput, setPartialAmountInput] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [poolDialogOpen, setPoolDialogOpen] = useState(false);
  const [createPoolDialogOpen, setCreatePoolDialogOpen] = useState(false);
  const [poolInvoiceHash, setPoolInvoiceHash] = useState("");
  const [poolTargetAleo, setPoolTargetAleo] = useState("");
  const [selectedPool, setSelectedPool] = useState<PoolDirectoryEntry | null>(
    null,
  );
  const [contributePoolOpen, setContributePoolOpen] = useState(false);
  const [contributePoolData, setContributePoolData] = useState<{
    pool: PoolDirectoryEntry;
    amount: string;
  } | null>(null);
  const [showCompletedPools, setShowCompletedPools] = useState(false);
  const [withdrawingPoolHash, setWithdrawingPoolHash] = useState<string | null>(
    null,
  );
  const [copiedPoolField, setCopiedPoolField] = useState<string | null>(null);
  const pendingActionRef = useRef<
    "factor" | "create-pool" | "contribute-pool" | "withdraw-proceeds" | null
  >(null);
  const pendingFactorModeRef = useRef<{ usePartial: boolean } | null>(null);
  const pendingPoolCreateRef = useRef<{
    invoiceHash: string;
    owner: string;
    targetAmountMicro: number;
  } | null>(null);

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

  const { data: records } = useQuery({
    queryKey: ["records", PROGRAM_ID, "invoices"],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 60_000,
  });

  const invoiceRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "Invoice" && !r.spent,
  );
  const poolShareRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "PoolShare" && !r.spent,
  );

  const getInvoiceSelectionId = (record: AleoRecord): string => {
    const hash = getField(record.recordPlaintext, "invoice_hash");
    return record.commitment ?? hash;
  };

  const filteredFactors = (factors ?? []).filter((f) => {
    if (!searchQuery) return true;
    return f.address.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const parseInvoiceAmountMicro = (record: AleoRecord): number => {
    return parseInt(
      getField(record.recordPlaintext, "amount").replace(/u64$/, ""),
      10,
    );
  };

  const advanceRateBps = advanceRateInput ? parseInt(advanceRateInput, 10) : 0;
  const factorMinRate = selectedFactor?.min_advance_rate ?? 5000;
  const factorMaxRate = selectedFactor?.max_advance_rate ?? 9900;
  const advanceRateValid =
    Number.isFinite(advanceRateBps) &&
    advanceRateBps >= factorMinRate &&
    advanceRateBps <= factorMaxRate;
  const getInvoiceCurrency = (record: AleoRecord): "ALEO" | "USDCx" => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    const metadata = getField(record.recordPlaintext, "metadata");
    const fromMetadata = decodeInvoiceCurrencyFromMetadata(metadata);
    // Backward compatibility for invoices minted before metadata flagging.
    const cached = getPersistedInvoiceCurrency(invoiceHash);
    return cached ?? fromMetadata;
  };
  const selectedInvoiceRecord = invoiceRecords.find(
    (r) => getInvoiceSelectionId(r) === selectedInvoiceId,
  );
  const selectedInvoiceAmountMicro = selectedInvoiceRecord
    ? parseInvoiceAmountMicro(selectedInvoiceRecord)
    : 0;
  const selectedInvoiceHash = selectedInvoiceRecord
    ? getField(selectedInvoiceRecord.recordPlaintext, "invoice_hash")
    : null;
  const selectedInvoiceCurrency = selectedInvoiceRecord
    ? getInvoiceCurrency(selectedInvoiceRecord)
    : "ALEO";
  const selectedInvoiceAmount = selectedInvoiceAmountMicro
    ? selectedInvoiceAmountMicro / 1_000_000
    : 0;
  const formattedSelectedInvoiceAmount = selectedInvoiceAmount.toLocaleString(
    undefined,
    { maximumFractionDigits: 6 },
  );
  const maxPartialAmount = selectedInvoiceAmountMicro
    ? (selectedInvoiceAmountMicro - 1) / 1_000_000
    : 0;
  const formattedMaxPartialAmount = maxPartialAmount.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
  const isPoolLockedSelection =
    !!lockedPoolInvoiceHash && selectedInvoiceHash === lockedPoolInvoiceHash;
  const partialAmountMicro = partialAmountInput
    ? Math.round(parseFloat(partialAmountInput) * 1_000_000)
    : 0;
  const wantsPartial = partialAmountInput.trim().length > 0;
  const partialAmountValid =
    !wantsPartial ||
    (Number.isFinite(partialAmountMicro) &&
      partialAmountMicro > 0 &&
      partialAmountMicro < selectedInvoiceAmountMicro);
  const poolEntries = listPoolDirectory();
  const openPoolEntries = poolEntries.filter((p) => !p.isClosed);
  const closedPoolEntries = poolEntries.filter((p) => p.isClosed);

  const factorByAddress = new Map((factors ?? []).map((f) => [f.address, f]));

  useEffect(() => {
    const opId = "marketplace-op";
    const pendingAction = pendingActionRef.current;

    if (status === "submitting")
      toast.loading("Generating proof…", { id: opId });
    else if (status === "pending") toast.loading("Broadcasting…", { id: opId });
    else if (status === "accepted") {
      if (pendingAction === "factor") {
        toast.success("Invoice factored successfully!", { id: opId });
        setDialogOpen(false);
        pendingFactorModeRef.current = null;
      }

      if (pendingAction === "create-pool" && pendingPoolCreateRef.current) {
        upsertPoolCreation(pendingPoolCreateRef.current);
        pendingPoolCreateRef.current = null;
        toast.success("Pool created successfully!", { id: opId });
        setCreatePoolDialogOpen(false);
        setPoolInvoiceHash("");
        setPoolTargetAleo("");
      }

      if (pendingAction === "contribute-pool" && contributePoolData) {
        upsertPoolContribution({
          invoiceHash: contributePoolData.pool.invoiceHash,
          owner: contributePoolData.pool.owner,
          contributor: address ?? "",
          contributedMicro: Math.round(
            parseFloat(contributePoolData.amount) * 1_000_000,
          ),
        });
        toast.success("Contribution submitted!", { id: opId });
        setContributePoolOpen(false);
        setContributePoolData(null);
      }

      if (pendingAction === "withdraw-proceeds") {
        toast.success("Pool proceeds withdrawn.", { id: opId });
        setWithdrawingPoolHash(null);
      }

      pendingActionRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
      reset();
    } else if (status === "failed") {
      pendingPoolCreateRef.current = null;

      let defaultMessage = "Transaction failed";
      if (pendingActionRef.current === "create-pool") {
        defaultMessage = "Pool creation failed";
      } else if (pendingActionRef.current === "factor") {
        defaultMessage = "Factoring failed";
        if (
          pendingFactorModeRef.current?.usePartial &&
          typeof txError === "string" &&
          /authorize_partial.*not defined/i.test(txError)
        ) {
          defaultMessage =
            "Partial factoring is not available on the configured program. Clear partial amount for full factoring, or update VITE_ALEO_PROGRAM_ID to a deployment that includes authorize_partial_factoring.";
        }
      } else if (pendingActionRef.current === "contribute-pool") {
        defaultMessage = "Contribution failed";
      } else if (pendingActionRef.current === "withdraw-proceeds") {
        defaultMessage = "Withdraw failed";
      }
      toast.error(txError || defaultMessage, { id: opId });

      pendingActionRef.current = null;
      pendingFactorModeRef.current = null;
      setWithdrawingPoolHash(null);
      reset();
    }
  }, [status, txError, queryClient, reset, address, contributePoolData]);

  // Auto-fill pool target with invoice amount when invoice hash is entered
  useEffect(() => {
    if (!poolInvoiceHash.trim()) {
      setPoolTargetAleo("");
      return;
    }

    const matching = invoiceRecords.find(
      (r) =>
        getField(r.recordPlaintext, "invoice_hash") === poolInvoiceHash.trim(),
    );

    if (matching) {
      const amountMicro = parseInvoiceAmountMicro(matching);
      const amountAleo = (amountMicro / 1_000_000).toLocaleString(undefined, {
        maximumFractionDigits: 6,
      });
      setPoolTargetAleo(amountAleo);
    }
  }, [poolInvoiceHash, invoiceRecords]);

  const getMyPoolShare = (invoiceHash: string): AleoRecord | null => {
    if (!address) return null;
    return (
      poolShareRecords.find(
        (record) =>
          getField(record.recordPlaintext, "invoice_hash") === invoiceHash &&
          getField(record.recordPlaintext, "owner") === address,
      ) ?? null
    );
  };

  const handleWithdrawPoolProceeds = async (invoiceHash: string) => {
    const share = getMyPoolShare(invoiceHash);
    if (!share) {
      toast.error("No PoolShare record found for this pool in your wallet.");
      return;
    }

    setWithdrawingPoolHash(invoiceHash);
    try {
      const [isClosed, isSettled, creditsRecords] = await Promise.all([
        fetchPoolClosed(invoiceHash),
        fetchInvoiceSettled(invoiceHash),
        requestRecords("credits.aleo", true) as Promise<AleoRecord[]>,
      ]);

      if (!isClosed) {
        toast.error(
          "Pool funding may be complete, but pool owner still needs to execute pool factoring before payouts are claimable.",
        );
        setWithdrawingPoolHash(null);
        return;
      }

      if (!isSettled) {
        toast.error(
          "Invoice is not settled yet. Withdraw is available after settlement.",
        );
        setWithdrawingPoolHash(null);
        return;
      }

      const paymentRecord = creditsRecords
        .filter((r) => !r.spent)
        .find(
          (r) =>
            BigInt(
              getField(r.recordPlaintext, "microcredits").replace(/u64$/, ""),
            ) > 0n,
        );

      if (!paymentRecord) {
        toast.error("No spendable credits record found for withdraw input.");
        setWithdrawingPoolHash(null);
        return;
      }

      pendingActionRef.current = "withdraw-proceeds";
      await execute({
        program: PROGRAM_ID,
        function: "claim_pool_proceeds",
        inputs: buildClaimPoolProceedsInputs(
          share.recordPlaintext,
          paymentRecord.recordPlaintext,
        ),
        fee: 80_000,
        privateFee: false,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Withdraw failed");
      setWithdrawingPoolHash(null);
      pendingActionRef.current = null;
    }
  };

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
    const currency = getInvoiceCurrency(invoice);
    const useToken = currency === "USDCx";
    const invoiceAmountMicro = parseInvoiceAmountMicro(invoice);
    const usePartial = wantsPartial && partialAmountMicro < invoiceAmountMicro;
    const functionName = usePartial
      ? "authorize_partial_factoring"
      : "authorize_factoring";

    pendingActionRef.current = "factor";
    pendingFactorModeRef.current = { usePartial };

    await execute({
      program: PROGRAM_ID,
      function: functionName,
      inputs: usePartial
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
          ],
      fee: 100_000,
      privateFee: false,
    });
  };

  const handleCreatePool = async () => {
    if (!isFactor) return;
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }

    const invoiceHash = poolInvoiceHash.trim();
    const targetAleo = parseFloat(poolTargetAleo);

    if (!invoiceHash || Number.isNaN(targetAleo) || targetAleo <= 0) {
      toast.error("Provide valid invoice hash and target amount.");
      return;
    }

    // Find the matching invoice to validate pool target doesn't exceed invoice amount
    const matchingInvoice = invoiceRecords.find(
      (r) => getField(r.recordPlaintext, "invoice_hash") === invoiceHash,
    );

    if (matchingInvoice) {
      const invoiceAmountMicro = parseInvoiceAmountMicro(matchingInvoice);
      const targetMicro = Math.round(targetAleo * 1_000_000);
      if (targetMicro > invoiceAmountMicro) {
        const invoiceAleo = (invoiceAmountMicro / 1_000_000).toLocaleString(
          undefined,
          { maximumFractionDigits: 6 },
        );
        toast.error(
          `Pool target cannot exceed invoice amount (${invoiceAleo} ALEO)`,
        );
        return;
      }
    }

    const targetMicro = Math.round(targetAleo * 1_000_000);
    pendingActionRef.current = "create-pool";
    pendingPoolCreateRef.current = {
      invoiceHash,
      owner: address,
      targetAmountMicro: targetMicro,
    };

    await execute({
      program: PROGRAM_ID,
      function: "create_pool",
      inputs: buildCreatePoolInputs(invoiceHash, BigInt(targetMicro)),
      fee: 80_000,
      privateFee: false,
    });
  };

  const isFactor = activeRole === "factor";

  const formatMicroToAleo = (micro: number): string => {
    return (micro / 1_000_000).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
  };

  const getPoolStats = (pool: PoolDirectoryEntry) => {
    const raisedMicro = pool.participants.reduce(
      (sum, p) => sum + p.contributedMicro,
      0,
    );
    const remainingMicro = Math.max(0, pool.targetAmountMicro - raisedMicro);
    const percent =
      pool.targetAmountMicro > 0
        ? Math.min(
            100,
            Math.round((raisedMicro * 100) / pool.targetAmountMicro),
          )
        : 0;
    return { raisedMicro, remainingMicro, percent };
  };

  const copyPoolField = async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedPoolField(field);
      setTimeout(() => setCopiedPoolField(null), 1500);
      toast.success(`${field} copied`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const openSellToPoolOwner = (pool: PoolDirectoryEntry) => {
    const ownerFactor = factorByAddress.get(pool.owner);
    if (!ownerFactor) {
      toast.error("Pool owner is not available as an active factor.");
      return;
    }

    const matchingInvoice = invoiceRecords.find(
      (r) => getField(r.recordPlaintext, "invoice_hash") === pool.invoiceHash,
    );

    if (!matchingInvoice) {
      toast.error(
        "Matching invoice record not found in your wallet. Choose manually.",
      );
      setLockedPoolInvoiceHash(null);
      setSelectedInvoiceId("");
    } else {
      setLockedPoolInvoiceHash(pool.invoiceHash);
      setSelectedInvoiceId(getInvoiceSelectionId(matchingInvoice));
    }

    setSelectedFactor(ownerFactor);
    setAdvanceRateInput("");
    setPartialAmountInput("");
    setDialogOpen(true);
  };

  return (
    <div className="container py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {isFactor ? "Invoice Marketplace" : "Browse Factors"}
        </h1>
        <p className="text-muted-foreground">
          {isFactor
            ? "View registered factors and available factoring opportunities"
            : "Find the best factoring terms for your invoices"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <Card className="lg:col-span-1 h-fit sticky top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search by address</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="aleo1…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => refetchFactors()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Error state */}
          {factorsError && (
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

          {/* Results Count */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {factorsLoading
                ? "Loading factors…"
                : `${filteredFactors.length} active factor${filteredFactors.length !== 1 ? "s" : ""}`}
            </p>

            {isFactor && (
              <Dialog
                open={createPoolDialogOpen}
                onOpenChange={setCreatePoolDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Pool
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create Pool</DialogTitle>
                    <DialogDescription>
                      Create a pool deal in marketplace so other factors can
                      join.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="pool-invoice-hash">Invoice Hash</Label>
                      <Input
                        id="pool-invoice-hash"
                        value={poolInvoiceHash}
                        onChange={(e) => setPoolInvoiceHash(e.target.value)}
                        placeholder="12345field"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pool-target">Target Amount (ALEO)</Label>
                      <Input
                        id="pool-target"
                        type="number"
                        min="0"
                        step="0.000001"
                        value={poolTargetAleo}
                        onChange={(e) => setPoolTargetAleo(e.target.value)}
                        placeholder="100.0"
                      />
                      {poolInvoiceHash.trim() && (
                        <p className="text-xs text-muted-foreground">
                          {invoiceRecords.find(
                            (r) =>
                              getField(r.recordPlaintext, "invoice_hash") ===
                              poolInvoiceHash.trim(),
                          )
                            ? `Max: ${(
                                parseInvoiceAmountMicro(
                                  invoiceRecords.find(
                                    (r) =>
                                      getField(
                                        r.recordPlaintext,
                                        "invoice_hash",
                                      ) === poolInvoiceHash.trim(),
                                  )!,
                                ) / 1_000_000
                              ).toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                              })} ALEO (invoice amount)`
                            : "Invoice not found in your wallet"}
                        </p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreatePoolDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreatePool}
                      disabled={
                        isFactoring || !poolInvoiceHash || !poolTargetAleo
                      }
                    >
                      {isFactoring ? "Processing…" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {poolEntries.length > 0 && (
            <>
              <div className="space-y-1">
                <p className="text-sm font-medium">Pool Opportunities</p>
                <p className="text-xs text-muted-foreground">
                  Open pools accept new funding. Completed pools are archived in
                  a separate section.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {openPoolEntries.map((pool) => {
                  const owner = factorByAddress.get(pool.owner);
                  const stats = getPoolStats(pool);
                  const isPoolClosed = pool.isClosed;
                  const isTargetReached =
                    stats.raisedMicro >= pool.targetAmountMicro &&
                    pool.targetAmountMicro > 0;
                  const isAwaitingExecution = !isPoolClosed && isTargetReached;
                  const isFullyFunded = isTargetReached || isPoolClosed;
                  const isBusiness = activeRole === "business";
                  const isFactorRole = activeRole === "factor";
                  return (
                    <Card
                      key={`pool-${pool.invoiceHash}`}
                      className="border-blue-300/60 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-400/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedPool(pool);
                        setPoolDialogOpen(true);
                      }}
                    >
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge
                              variant="outline"
                              className="text-xs text-blue-700 border-blue-400"
                            >
                              Pool
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              Invoice:{" "}
                              <span className="font-mono">
                                {pool.invoiceHash.slice(0, 10)}…
                              </span>
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {stats.percent}%
                          </Badge>
                        </div>

                        <div>
                          <Badge
                            variant="outline"
                            className={
                              isPoolClosed
                                ? "text-emerald-600 border-emerald-300"
                                : isAwaitingExecution
                                  ? "text-amber-700 border-amber-300"
                                  : "text-blue-700 border-blue-400"
                            }
                          >
                            {isPoolClosed
                              ? "Completed"
                              : isAwaitingExecution
                                ? "Funded"
                                : "Open"}
                          </Badge>
                        </div>

                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">
                              Target
                            </span>
                            <span className="font-mono font-medium">
                              {formatMicroToAleo(pool.targetAmountMicro)} ALEO
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">
                              Raised
                            </span>
                            <span className="font-mono font-medium">
                              {formatMicroToAleo(stats.raisedMicro)} ALEO
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">
                              Remaining
                            </span>
                            <span className="font-mono">
                              {formatMicroToAleo(stats.remainingMicro)} ALEO
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">
                              Contributors
                            </span>
                            <span>{pool.participants.length}</span>
                          </div>
                          {owner && (
                            <div className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                Rate Range
                              </span>
                              <span className="text-xs">
                                {(owner.min_advance_rate / 100).toFixed(2)}% -{" "}
                                {(owner.max_advance_rate / 100).toFixed(2)}%
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Contribution progress</span>
                            <span>{stats.percent}%</span>
                          </div>
                          <Progress value={stats.percent} className="h-1.5" />
                        </div>

                        {isBusiness && (
                          <Button
                            size="sm"
                            variant={isPoolClosed ? "outline" : "default"}
                            className="w-full gap-1.5"
                            disabled={isPoolClosed}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPoolClosed) return;
                              openSellToPoolOwner(pool);
                            }}
                          >
                            {isPoolClosed
                              ? "Pool Closed"
                              : "Sell to Pool Owner"}
                            {!isPoolClosed && (
                              <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                            )}
                          </Button>
                        )}

                        {isFactorRole && (
                          <Button
                            size="sm"
                            variant={isFullyFunded ? "outline" : "secondary"}
                            className="w-full gap-1.5"
                            disabled={isFullyFunded}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isFullyFunded) return;
                              setContributePoolData({
                                pool,
                                amount: "",
                              });
                              setContributePoolOpen(true);
                            }}
                          >
                            <TrendingUp className="h-3.5 w-3.5" />
                            {isFullyFunded
                              ? isPoolClosed
                                ? "Pool Closed"
                                : "Fully Funded"
                              : "Contribute to Pool"}
                            {!isFullyFunded && (
                              <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                            )}
                          </Button>
                        )}

                        {!isBusiness && !isFactorRole && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            disabled
                          >
                            Select a role to continue
                          </Button>
                        )}
                        <p className="text-[11px] text-muted-foreground text-center">
                          {isBusiness
                            ? isPoolClosed
                              ? "Business: pool closed"
                              : isAwaitingExecution
                                ? "Business: pool funded—sell invoice now"
                                : "Business: sell invoice to pool owner"
                            : isFactorRole
                              ? isPoolClosed
                                ? "Factor: pool closed"
                                : isAwaitingExecution
                                  ? "Factor: funded, awaiting owner execution"
                                  : "Factor: contribute if pool is open"
                              : "Click card for full pool details"}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {openPoolEntries.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <p className="font-medium">No open pools right now</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You can still review completed pools from the archive
                      section below.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Factor Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {factorsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32 mt-1" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
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
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">
                        No active factors yet
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Be the first to register as a factor on the network and
                        start purchasing invoices.
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
                        <p className="text-xs text-muted-foreground">Status</p>
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
                          if (!open) {
                            setLockedPoolInvoiceHash(null);
                            return;
                          }

                          if (selectedFactor?.address !== factor.address) {
                            setSelectedFactor(factor);
                            setSelectedInvoiceId("");
                            setAdvanceRateInput("");
                            setPartialAmountInput("");
                            setLockedPoolInvoiceHash(null);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            {isFactor ? "View Details" : "Factor Invoice"}
                          </Button>
                        </DialogTrigger>
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
                              {isPoolLockedSelection ? (
                                <>
                                  <Label>
                                    Invoice (Auto-selected from Pool)
                                  </Label>
                                  <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
                                    <p className="text-muted-foreground">
                                      Invoice Hash
                                    </p>
                                    <p className="font-mono text-xs break-all">
                                      {selectedInvoiceHash}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      This was auto-selected from the pool card.
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Label htmlFor="invoice-select">
                                    Select Invoice
                                  </Label>
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
                                          const selectionId =
                                            getInvoiceSelectionId(r);
                                          const currency =
                                            getInvoiceCurrency(r);
                                          const amount = (
                                            parseInt(
                                              getField(
                                                r.recordPlaintext,
                                                "amount",
                                              ).replace(/u64$/, ""),
                                              10,
                                            ) / 1_000_000
                                          ).toFixed(6);
                                          return (
                                            <SelectItem
                                              key={selectionId}
                                              value={selectionId}
                                            >
                                              {hash.slice(0, 12)}… - {amount}{" "}
                                              {currency}
                                            </SelectItem>
                                          );
                                        })
                                      )}
                                    </SelectContent>
                                  </Select>
                                </>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="partial-amount">
                                Optional Partial Amount (
                                {selectedInvoiceCurrency})
                              </Label>
                              <Input
                                id="partial-amount"
                                type="number"
                                min="0"
                                step="0.000001"
                                placeholder={`Leave empty to factor full ${formattedSelectedInvoiceAmount} ${selectedInvoiceCurrency}`}
                                value={partialAmountInput}
                                onChange={(e) =>
                                  setPartialAmountInput(e.target.value)
                                }
                              />
                              {selectedInvoiceRecord && (
                                <p className="text-xs text-muted-foreground">
                                  Invoice amount:{" "}
                                  {formattedSelectedInvoiceAmount}{" "}
                                  {selectedInvoiceCurrency} | Max partial:{" "}
                                  {formattedMaxPartialAmount}{" "}
                                  {selectedInvoiceCurrency}
                                </p>
                              )}
                              {wantsPartial && (
                                <p
                                  className={cn(
                                    "text-xs",
                                    partialAmountValid
                                      ? "text-muted-foreground"
                                      : "text-destructive",
                                  )}
                                >
                                  {partialAmountValid
                                    ? "Remainder stays with the creditor as a new invoice record."
                                    : `Partial amount must be > 0 and < ${formattedSelectedInvoiceAmount} ${selectedInvoiceCurrency}.`}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="advance-rate">
                                Advance Rate (basis points,{" "}
                                {selectedFactor?.min_advance_rate || 5000}–
                                {selectedFactor?.max_advance_rate || 9900})
                              </Label>
                              <Input
                                id="advance-rate"
                                type="number"
                                placeholder={`e.g. ${selectedFactor?.max_advance_rate || 9000} for ${(selectedFactor?.max_advance_rate || 9000) / 100}%`}
                                min={selectedFactor?.min_advance_rate || 5000}
                                max={selectedFactor?.max_advance_rate || 9900}
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
                                    ? `${(advanceRateBps / 100).toFixed(2)}% advance rate`
                                    : `Rate must be between ${factorMinRate} and ${factorMaxRate} basis points`}
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
                                isFactoring ||
                                selectedInvoiceId === "_none"
                              }
                            >
                              {isFactoring ? "Processing…" : "Confirm"}
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

          <Dialog
            open={poolDialogOpen}
            onOpenChange={(open) => {
              setPoolDialogOpen(open);
              if (!open) setSelectedPool(null);
            }}
          >
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <div className="mx-auto rounded-full bg-primary/10 p-3 mb-2">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <DialogTitle className="text-center">Pool Details</DialogTitle>
                <DialogDescription>
                  Pool participation is open to all active factors.
                </DialogDescription>
              </DialogHeader>

              {selectedPool && (
                <div className="space-y-4 text-sm">
                  {(() => {
                    const stats = getPoolStats(selectedPool);
                    const isFullyFunded = stats.percent >= 100;
                    const isBusiness = activeRole === "business";
                    const isFactorRole = activeRole === "factor";
                    return (
                      <>
                        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">
                              Invoice Hash
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() =>
                                copyPoolField(
                                  selectedPool.invoiceHash,
                                  "Invoice Hash",
                                )
                              }
                            >
                              {copiedPoolField === "Invoice Hash" ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="font-mono text-xs break-all">
                            {selectedPool.invoiceHash}
                          </p>
                        </div>

                        <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">
                              Pool Owner
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() =>
                                copyPoolField(selectedPool.owner, "Pool Owner")
                              }
                            >
                              {copiedPoolField === "Pool Owner" ? (
                                <Check className="h-4 w-4 text-green-600" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <AddressDisplay
                            address={selectedPool.owner}
                            chars={8}
                            showExplorer
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-md border p-3">
                            <p className="text-muted-foreground text-xs">
                              Target
                            </p>
                            <p className="font-mono font-medium">
                              {formatMicroToAleo(
                                selectedPool.targetAmountMicro,
                              )}{" "}
                              ALEO
                            </p>
                          </div>
                          <div className="rounded-md border p-3">
                            <p className="text-muted-foreground text-xs">
                              Raised
                            </p>
                            <p className="font-mono font-medium">
                              {formatMicroToAleo(stats.raisedMicro)} ALEO
                            </p>
                          </div>
                          <div className="rounded-md border p-3">
                            <p className="text-muted-foreground text-xs">
                              Remaining
                            </p>
                            <p className="font-mono font-medium">
                              {formatMicroToAleo(stats.remainingMicro)} ALEO
                            </p>
                          </div>
                          <div className="rounded-md border p-3">
                            <p className="text-muted-foreground text-xs">
                              Contributors
                            </p>
                            <p className="font-medium">
                              {selectedPool.participants.length}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{stats.percent}%</span>
                          </div>
                          <Progress value={stats.percent} className="h-2" />
                        </div>

                        {factorByAddress.get(selectedPool.owner) && (
                          <p className="text-xs text-muted-foreground">
                            Owner stats: Factored{" "}
                            {factorByAddress
                              .get(selectedPool.owner)
                              ?.total_factored.toLocaleString()}{" "}
                            | Rate range{" "}
                            {(
                              factorByAddress.get(selectedPool.owner)!
                                .min_advance_rate / 100
                            ).toFixed(2)}
                            % -
                            {(
                              factorByAddress.get(selectedPool.owner)!
                                .max_advance_rate / 100
                            ).toFixed(2)}
                            %
                          </p>
                        )}
                      </>
                    );
                  })()}

                  <div>
                    <p className="text-muted-foreground mb-2">
                      Contributing Factors
                    </p>
                    {selectedPool.participants.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No contributions recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedPool.participants.map((participant) => {
                          const factor = factorByAddress.get(
                            participant.address,
                          );
                          return (
                            <div
                              key={`${selectedPool.invoiceHash}-${participant.address}`}
                              className="rounded-md border p-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <AddressDisplay
                                  address={participant.address}
                                  chars={5}
                                  showExplorer
                                />
                                <span className="font-medium">
                                  {formatMicroToAleo(
                                    participant.contributedMicro,
                                  )}{" "}
                                  ALEO
                                </span>
                              </div>
                              {factor && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Active factor | Factored:{" "}
                                  {factor.total_factored.toLocaleString()} |
                                  Range:{" "}
                                  {(factor.min_advance_rate / 100).toFixed(2)}%
                                  - {(factor.max_advance_rate / 100).toFixed(2)}
                                  %
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    {activeRole === "business" && (
                      <Button
                        className="w-full"
                        variant={
                          selectedPool && selectedPool.isClosed
                            ? "outline"
                            : "default"
                        }
                        disabled={!!selectedPool && selectedPool.isClosed}
                        onClick={() => {
                          if (!selectedPool) return;
                          if (selectedPool.isClosed) return;
                          setPoolDialogOpen(false);
                          openSellToPoolOwner(selectedPool);
                        }}
                      >
                        {selectedPool && selectedPool.isClosed
                          ? "Pool Closed"
                          : "Sell Invoice to Pool Owner"}
                      </Button>
                    )}

                    {activeRole === "factor" && selectedPool && (
                      <>
                        <Button
                          variant={
                            selectedPool.isClosed ||
                            getPoolStats(selectedPool).percent >= 100
                              ? "outline"
                              : "secondary"
                          }
                          className="w-full"
                          disabled={
                            selectedPool.isClosed ||
                            getPoolStats(selectedPool).percent >= 100
                          }
                          onClick={() => {
                            if (
                              selectedPool.isClosed ||
                              getPoolStats(selectedPool).percent >= 100
                            )
                              return;
                            setContributePoolData({
                              pool: selectedPool,
                              amount: "",
                            });
                            setPoolDialogOpen(false);
                            setContributePoolOpen(true);
                          }}
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          {selectedPool.isClosed ||
                          getPoolStats(selectedPool).percent >= 100
                            ? selectedPool.isClosed
                              ? "Pool Closed"
                              : "Pool Fully Funded"
                            : "Contribute to This Pool"}
                        </Button>

                        {getMyPoolShare(selectedPool.invoiceHash) && (
                          <Button
                            variant="default"
                            className="w-full"
                            onClick={() =>
                              handleWithdrawPoolProceeds(
                                selectedPool.invoiceHash,
                              )
                            }
                            disabled={
                              withdrawingPoolHash === selectedPool.invoiceHash
                            }
                          >
                            {withdrawingPoolHash === selectedPool.invoiceHash
                              ? "Withdrawing..."
                              : "Withdraw Proceeds"}
                          </Button>
                        )}
                      </>
                    )}
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {closedPoolEntries.length > 0 && (
            <div className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                className="px-0"
                onClick={() => setShowCompletedPools((prev) => !prev)}
              >
                {showCompletedPools ? "Hide" : "Show"} Completed Pools (
                {closedPoolEntries.length})
              </Button>
              {showCompletedPools && (
                <div className="grid gap-2 sm:grid-cols-2">
                  {closedPoolEntries.map((pool) => {
                    const stats = getPoolStats(pool);
                    const myShare = getMyPoolShare(pool.invoiceHash);
                    const isWithdrawing =
                      withdrawingPoolHash === pool.invoiceHash;
                    return (
                      <div
                        key={`archived-${pool.invoiceHash}`}
                        className="w-full rounded-md border border-emerald-300/60 bg-emerald-50/30 dark:bg-emerald-950/20 px-3 py-2"
                      >
                        <button
                          type="button"
                          className="w-full text-left hover:opacity-90 transition-opacity"
                          onClick={() => {
                            setSelectedPool(pool);
                            setPoolDialogOpen(true);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs">
                              {pool.invoiceHash.slice(0, 12)}…
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs text-emerald-700 border-emerald-400"
                            >
                              Completed
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Raised {formatMicroToAleo(stats.raisedMicro)} /{" "}
                            {formatMicroToAleo(pool.targetAmountMicro)} ALEO
                          </p>
                        </button>
                        {activeRole === "factor" && myShare && (
                          <Button
                            size="sm"
                            className="w-full mt-2"
                            onClick={() =>
                              handleWithdrawPoolProceeds(pool.invoiceHash)
                            }
                            disabled={isWithdrawing}
                          >
                            {isWithdrawing
                              ? "Withdrawing..."
                              : "Withdraw Proceeds"}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Contribute to Pool Dialog */}
          <Dialog
            open={contributePoolOpen}
            onOpenChange={setContributePoolOpen}
          >
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Contribute to Pool
                </DialogTitle>
                <DialogDescription>
                  Join this pool and get a share of the proceeds.
                </DialogDescription>
              </DialogHeader>

              {contributePoolData && (
                <div className="space-y-4 py-2">
                  <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-mono font-medium">
                        {formatMicroToAleo(
                          contributePoolData.pool.targetAmountMicro,
                        )}{" "}
                        ALEO
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invoice</span>
                      <span className="font-mono text-xs">
                        {contributePoolData.pool.invoiceHash.slice(0, 10)}…
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contrib-amount">
                      Contribution Amount (ALEO)
                    </Label>
                    <Input
                      id="contrib-amount"
                      type="number"
                      placeholder="e.g. 250"
                      value={contributePoolData.amount}
                      onChange={(e) =>
                        setContributePoolData({
                          ...contributePoolData,
                          amount: e.target.value,
                        })
                      }
                      min="0"
                      step="0.000001"
                    />
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setContributePoolOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!address || !contributePoolData.amount) return;

                        const contributionMicro = BigInt(
                          Math.round(
                            parseFloat(contributePoolData.amount) * 1_000_000,
                          ),
                        );
                        if (contributionMicro <= 0n) {
                          toast.error("Amount must be greater than 0");
                          return;
                        }

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
                                BigInt(
                                  getField(
                                    r.recordPlaintext,
                                    "microcredits",
                                  ).replace(/u64$/, ""),
                                ) >= contributionMicro,
                            );
                        } catch {
                          toast.error("Failed to load credits records");
                          return;
                        }

                        if (!creditsRecord) {
                          toast.error(
                            "No credits record with sufficient balance",
                          );
                          return;
                        }

                        // Get existing contributions for this pool
                        const existingContributions =
                          contributePoolData.pool.participants.reduce(
                            (sum, p) => sum + BigInt(p.contributedMicro),
                            BigInt(0),
                          );

                        const inputs = buildContributeToPoolInputs(
                          contributePoolData.pool.invoiceHash.trim(),
                          contributePoolData.pool.owner.trim(),
                          existingContributions,
                          creditsRecord.recordPlaintext,
                          contributionMicro,
                        );

                        pendingActionRef.current = "contribute-pool";

                        await execute({
                          program: PROGRAM_ID,
                          function: "contribute_to_pool",
                          inputs,
                          fee: 100_000,
                          privateFee: false,
                        });
                      }}
                      disabled={isFactoring || !contributePoolData.amount}
                    >
                      {isFactoring ? "Contributing…" : "Contribute"}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
