import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  Users,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  ChevronRight,
  Layers,
  Copy,
  Check,
  Info,
  Send,
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
import { PROGRAM_ID, PROGRAM_ADDRESS } from "@/lib/config";
import {
  type AleoRecord,
  decodeInvoiceCurrencyFromMetadata,
  getField,
  getPersistedInvoiceCurrency,
} from "@/lib/aleo-records";
import { type FactorInfo, fetchActiveFactors } from "@/lib/aleo-factors";
import {
  buildPoolContributeInputs,
  buildPoolSubmitInvoiceInputs,
  computePoolStats,
  fetchAllPools,
  fetchActiveFactorCount,
  fetchPublicCreditsBalance,
  type OnChainPoolState,
} from "../lib/pool-chain";
import { buildExecuteInputs, getExecuteTransition } from "@/lib/aleo-factors";
import {
  removePendingFactoringRequest,
  upsertPendingFactoringRequest,
} from "@/lib/pending-factoring";
import { PoolTimeline } from "@/components/pools/PoolTimeline";

const DEFAULT_PROGRAM_ID = "zk_factor_12250.aleo";
const DEFAULT_PROGRAM_ADDRESS =
  "aleo1s8hgprffm0tqdc9d4q5mshu90efwcg7qfvwzyr3r9wpangazrq8s5yfww6";

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

function getOwnerlessPoolStatus(
  pool: OnChainPoolState,
  stats: ReturnType<typeof computePoolStats>,
): { label: string; colorClass: string; cardClass: string } {
  if (pool.isClosed) {
    if (stats.isFullyDistributed) {
      return {
        label: "Closed",
        colorClass: "text-emerald-600 border-emerald-300",
        cardClass:
          "border-emerald-300/60 bg-emerald-50/30 dark:bg-emerald-950/20",
      };
    }

    if (pool.isSettled && pool.proceeds === null) {
      return {
        label: "Awaiting Distribution",
        colorClass: "text-violet-700 border-violet-300",
        cardClass: "border-violet-300/70 bg-violet-50/40 dark:bg-violet-950/20",
      };
    }

    if (pool.proceeds !== null && pool.proceeds > 0n) {
      return {
        label: "Paying Out",
        colorClass: "text-amber-700 border-amber-300",
        cardClass: "border-amber-300/70 bg-amber-50/40 dark:bg-amber-950/20",
      };
    }

    return {
      label: "Executed",
      colorClass: "text-blue-700 border-blue-400",
      cardClass: "border-blue-300/60 bg-blue-50/40 dark:bg-blue-950/20",
    };
  }

  if (stats.hasPendingOffer) {
    return {
      label: "Voting",
      colorClass: "text-amber-700 border-amber-300",
      cardClass: "border-amber-300/70 bg-amber-50/40 dark:bg-amber-950/20",
    };
  }

  if (stats.isFullyFunded) {
    return {
      label: "Funded",
      colorClass: "text-amber-700 border-amber-300",
      cardClass: "border-blue-300/60 bg-blue-50/40 dark:bg-blue-950/20",
    };
  }

  return {
    label: "Open",
    colorClass: "text-blue-700 border-blue-400",
    cardClass: "border-blue-300/60 bg-blue-50/40 dark:bg-blue-950/20",
  };
}

// ── types ─────────────────────────────────────────────────────────────
type PendingAction =
  | "factor"
  | "create-pool"
  | "contribute-pool"
  | "submit-invoice-pool"
  | "vote-pool"
  | "execute-pool"
  | "open-distribution"
  | null;

export default function Marketplace() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isConnected, requestRecords, activeRole, address } = useWallet();
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

  // ── pool detail dialog ─────────────────────────────────────────────
  const [selectedPool, setSelectedPool] = useState<OnChainPoolState | null>(
    null,
  );
  const [poolDetailOpen, setPoolDetailOpen] = useState(false);

  // ── pool contribute dialog ─────────────────────────────────────────
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributePool, setContributePool] = useState<OnChainPoolState | null>(
    null,
  );
  const [contributeAmount, setContributeAmount] = useState("");
  const [publicBalance, setPublicBalance] = useState<bigint | null>(null);

  // ── pool invoice submit dialog (business) ─────────────────────────
  const [submitInvoiceOpen, setSubmitInvoiceOpen] = useState(false);
  const [submitInvoicePool, setSubmitInvoicePool] =
    useState<OnChainPoolState | null>(null);
  const [submitInvoiceSelectedId, setSubmitInvoiceSelectedId] = useState("");
  const [submitInvoiceRate, setSubmitInvoiceRate] = useState("");

  // ── misc state ─────────────────────────────────────────────────────
  const [showCompletedPools, setShowCompletedPools] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ── refs (survive re-renders during async execute) ─────────────────
  const pendingActionRef = useRef<PendingAction>(null);
  const pendingFactorModeRef = useRef<{ usePartial: boolean } | null>(null);
  const pendingFactoringHashRef = useRef<string | null>(null);
  const pendingOpenDistributionHashRef = useRef<string | null>(null);

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

  const openPools = (Array.isArray(onChainPools) ? onChainPools : []).filter(
    (p) => !computePoolStats(p, activeFactorCount).isFullyDistributed,
  );
  const closedPools = (Array.isArray(onChainPools) ? onChainPools : []).filter(
    (p) => computePoolStats(p, activeFactorCount).isFullyDistributed,
  );

  // ── invoice dialog computed values ────────────────────────────────
  const advanceRateBps = advanceRateInput ? parseInt(advanceRateInput, 10) : 0;
  const factorMinRate = selectedFactor?.min_advance_rate ?? 5000;
  const factorMaxRate = selectedFactor?.max_advance_rate ?? 9900;
  const advanceRateValid =
    Number.isFinite(advanceRateBps) &&
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
  const submitRateBps = submitInvoiceRate ? parseInt(submitInvoiceRate, 10) : 0;
  const submitRateValid =
    Number.isFinite(submitRateBps) &&
    submitRateBps >= 5000 &&
    submitRateBps <= 9900;

  const submitInvoiceRecord = availableInvoicesForPool.find(
    (r) => getInvoiceSelectionId(r) === submitInvoiceSelectedId,
  );
  const submitInvoiceAmountMicro = submitInvoiceRecord
    ? parseInvoiceAmountMicro(submitInvoiceRecord)
    : 0;
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
      } else if (action === "contribute-pool") {
        toast.success("Contribution submitted!", { id: opId });
        setContributeOpen(false);
        setContributePool(null);
        setContributeAmount("");
        refetchPools();
      } else if (action === "submit-invoice-pool") {
        toast.success("Invoice submitted to pool — factors can now vote!", {
          id: opId,
        });
        setSubmitInvoiceOpen(false);
        setSubmitInvoicePool(null);
        refetchPools();
      } else if (action === "vote-pool") {
        toast.success("Vote recorded!", { id: opId });
        refetchPools();
        if (selectedPool) setSelectedPool(null);
      } else if (action === "execute-pool") {
        toast.success("Pool factoring executed — business receives advance!", {
          id: opId,
        });
        refetchPools();
        setPoolDetailOpen(false);
      } else if (action === "open-distribution") {
        toast.success("Distribution opened.", { id: opId });
        refetchPools();
      }

      pendingActionRef.current = null;
      pendingOpenDistributionHashRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });

      if (shouldNav) {
        queryClient.removeQueries({ queryKey: ["records", PROGRAM_ID] });
        navigate("/dashboard?refresh=1", { replace: true });
      }

      reset();
    } else if (status === "failed") {
      let msg = "Transaction failed";
      if (action === "create-pool") msg = "Pool creation failed";
      else if (action === "factor") {
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
      } else if (action === "contribute-pool") msg = "Contribution failed";
      else if (action === "submit-invoice-pool")
        msg = "Invoice submission failed";
      else if (action === "vote-pool") msg = "Vote failed";
      else if (action === "execute-pool") msg = "Execution failed";
      else if (action === "open-distribution") msg = "Open distribution failed";

      toast.error(txError || msg, { id: opId });
      pendingActionRef.current = null;
      pendingOpenDistributionHashRef.current = null;
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
    selectedPool,
  ]);

  useEffect(() => {
    if (status !== "pending") return;
    if (pendingActionRef.current !== "open-distribution") return;

    const pendingHash = pendingOpenDistributionHashRef.current;
    if (!pendingHash) return;

    const pool = onChainPools.find((p) => p.meta.invoiceHash === pendingHash);
    const distributionOpened =
      !!pool && pool.proceeds !== null && pool.proceeds > 0n;

    if (!distributionOpened) return;

    toast.success("Distribution opened.", { id: "marketplace-op" });
    pendingActionRef.current = null;
    pendingOpenDistributionHashRef.current = null;
    queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
    queryClient.invalidateQueries({ queryKey: ["all_pools"] });
    reset();
  }, [status, onChainPools, queryClient, reset]);

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
    const currency = getInvoiceCurrency(
      invoice,
      getField(invoice.recordPlaintext, "invoice_hash"),
    );
    const invoiceHash = getField(invoice.recordPlaintext, "invoice_hash");
    const debtor = getField(invoice.recordPlaintext, "debtor");
    const dueDateUnix = parseInt(
      getField(invoice.recordPlaintext, "due_date").replace(/u64$/, ""),
      10,
    );
    const useToken = currency === "USDCx";
    const invoiceAmountMicro = parseInvoiceAmountMicro(invoice);
    const usePartial = wantsPartial && partialAmountMicro < invoiceAmountMicro;
    const functionName = usePartial
      ? "authorize_partial_factoring"
      : "authorize_factoring";

    if (address) {
      upsertPendingFactoringRequest(address, {
        invoiceHash,
        factorAddress: selectedFactor.address,
        debtor,
        amountMicro: usePartial ? partialAmountMicro : invoiceAmountMicro,
        currency,
        dueDateUnix,
        requestedAt: Date.now(),
      });
      pendingFactoringHashRef.current = invoiceHash;
    }

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

  // ── action: contribute to pool ────────────────────────────────────
  const openContribute = async (pool: OnChainPoolState) => {
    setContributePool(pool);
    setContributeAmount("");
    setContributeOpen(true);
    if (address) {
      const bal = await fetchPublicCreditsBalance(address);
      setPublicBalance(bal);
    }
  };

  const handleContribute = async () => {
    if (!contributePool || !address) return;
    const amountAleo = parseFloat(contributeAmount);
    if (Number.isNaN(amountAleo) || amountAleo <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    const contribution = BigInt(Math.round(amountAleo * 1_000_000));
    const minContrib = contributePool.meta.minContribution;

    if (contribution < minContrib) {
      toast.error(`Minimum contribution is ${formatMicro(minContrib)} ALEO.`);
      return;
    }
    if (publicBalance !== null && contribution > publicBalance) {
      toast.error(
        `Insufficient public credits balance (${formatMicro(publicBalance)} ALEO). ` +
          "Convert private records to public credits first.",
      );
      return;
    }
    if (!PROGRAM_ADDRESS) {
      toast.error(
        "PROGRAM_ADDRESS is not set — cannot route credits to the pool escrow.",
      );
      return;
    }

    if (
      PROGRAM_ID !== DEFAULT_PROGRAM_ID &&
      PROGRAM_ADDRESS === DEFAULT_PROGRAM_ADDRESS
    ) {
      toast.error(
        "PROGRAM_ADDRESS likely does not match your deployed PROGRAM_ID. Update VITE_PROGRAM_ADDRESS.",
      );
      return;
    }

    const existingTotal = contributePool.totalContributed;

    pendingActionRef.current = "contribute-pool";
    await execute({
      program: PROGRAM_ID,
      function: "pool_contribute",
      inputs: buildPoolContributeInputs(
        contributePool.meta.invoiceHash,
        PROGRAM_ADDRESS,
        contribution,
        existingTotal,
      ),
      fee: 80_000,
      privateFee: false,
    });
  };

  // ── action: business submits invoice to pool ───────────────────────
  const openSubmitInvoice = (pool: OnChainPoolState) => {
    setSubmitInvoicePool(pool);
    setSubmitInvoiceSelectedId("");
    setSubmitInvoiceRate("");
    setSubmitInvoiceOpen(true);
  };

  const handleSubmitInvoice = async () => {
    if (!submitInvoicePool || !submitInvoiceRecord || !submitRateValid) return;
    if (!submitRateInRange) {
      toast.error(
        `Advance rate ${(submitRateBps / 100).toFixed(1)}% is outside pool range ${
          submitInvoicePool.meta.minAdvanceRate / 100
        }%-${submitInvoicePool.meta.maxAdvanceRate / 100}%`,
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

  const handleOpenDistribution = async (invoiceHash: string) => {
    pendingActionRef.current = "open-distribution";
    pendingOpenDistributionHashRef.current = invoiceHash;
    await execute({
      program: PROGRAM_ID,
      function: "pool_open_distribution",
      inputs: [invoiceHash],
      fee: 80_000,
      privateFee: false,
    });
  };

  // ── helpers ───────────────────────────────────────────────────────
  const copyField = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 1500);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const isFactor = activeRole === "factor";
  const isBusiness = activeRole === "business";

  // ── pool card renderer ─────────────────────────────────────────────
  const renderPoolCard = (pool: OnChainPoolState) => {
    const stats = computePoolStats(pool, activeFactorCount);
    const status = getOwnerlessPoolStatus(pool, stats);

    const voteProgressPct =
      stats.threshold > 0
        ? Math.min(100, Math.round((stats.voteCount / stats.threshold) * 100))
        : 0;

    return (
      <Card
        key={pool.meta.invoiceHash}
        className={cn(
          "border-blue-300/60 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-400/80 transition-colors cursor-pointer",
          status.cardClass,
        )}
        onClick={() => {
          setSelectedPool(pool);
          setPoolDetailOpen(true);
        }}
      >
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <Badge
                variant="outline"
                className={cn("text-xs", status.colorClass)}
              >
                {status.label}
              </Badge>
              <p className="text-sm font-medium mt-1">{pool.meta.name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {pool.meta.invoiceHash.slice(0, 12)}…
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {stats.hasPendingOffer && (
                <Badge
                  variant="secondary"
                  className="text-[10px] uppercase tracking-wide"
                >
                  New
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {stats.hasPendingOffer ? `${voteProgressPct}% votes` : "Open"}
              </Badge>
            </div>
          </div>

          {/* Vote progress (only when offer pending) */}
          {stats.hasPendingOffer && (
            <div className="rounded-md bg-amber-100/60 dark:bg-amber-900/20 border border-amber-200/70 px-2.5 py-2 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-full border border-amber-300/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  Voting
                </span>
                <span className="inline-flex items-center rounded-full border border-amber-300/80 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                  {voteProgressPct}%
                </span>
              </div>
              <div className="flex justify-between text-amber-900 dark:text-amber-300">
                <span>Multisig votes</span>
                <span>
                  {stats.voteCount} / {stats.threshold} needed
                </span>
              </div>
              <Progress value={voteProgressPct} className="h-1 bg-amber-200" />
            </div>
          )}

          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Advance Rate Range</span>
              <span className="font-mono font-medium">
                {pool.meta.minAdvanceRate / 100}%-
                {pool.meta.maxAdvanceRate / 100}%
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Total Raised</span>
              <span className="font-mono font-medium">
                {formatMicro(pool.totalContributed)} ALEO
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Min contribution</span>
              <span className="font-mono text-xs">
                {formatMicro(pool.meta.minContribution)} ALEO
              </span>
            </div>
          </div>

          <Progress value={stats.percentFunded} className="h-1.5" />

          {/* Business CTA */}
          {isBusiness && !pool.isClosed && (
            <>
              {!stats.isFullyFunded && (
                <p className="text-xs text-center text-muted-foreground">
                  Waiting for pool to fill…
                </p>
              )}
              {stats.isFullyFunded && !stats.hasPendingOffer && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    openSubmitInvoice(pool);
                  }}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Submit Invoice to Pool
                </Button>
              )}
              {stats.hasPendingOffer && (
                <p className="text-xs text-center text-amber-700">
                  Invoice submitted — awaiting multisig approval
                </p>
              )}
            </>
          )}

          {/* Factor CTAs */}
          {isFactor && !pool.isClosed && (
            <div className="space-y-2">
              <Button
                size="sm"
                variant="secondary"
                className="w-full gap-1.5"
                onClick={(e) => {
                  e.stopPropagation();
                  openContribute(pool);
                }}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                Contribute
                <ChevronRight className="h-3.5 w-3.5 ml-auto" />
              </Button>
              {stats.hasPendingOffer && !stats.isApproved && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/pools");
                  }}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Go to Pools Voting
                </Button>
              )}
              {stats.hasPendingOffer && stats.isApproved && (
                <Button
                  size="sm"
                  className="w-full gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/pools");
                  }}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  Go to Pools Execution
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ── pool detail dialog renderer ───────────────────────────────────
  const renderPoolDetail = () => {
    if (!selectedPool) return null;
    const pool = selectedPool;
    const stats = computePoolStats(pool, activeFactorCount);
    const status = getOwnerlessPoolStatus(pool, stats);
    const canOpenDistribution =
      pool.isSettled && pool.isClosed && pool.proceeds === null;

    return (
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="mx-auto rounded-full bg-primary/10 p-3 mb-2">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{pool.meta.name}</DialogTitle>
          <DialogDescription className="text-center">
            On-chain pool — visible to everyone, no single owner.
          </DialogDescription>
          <div className="flex justify-center mt-2">
            <Badge
              variant="outline"
              className={cn("text-xs", status.colorClass)}
            >
              {status.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3 text-sm max-h-[36vh] overflow-y-auto pr-1">
          {/* Pool ID */}
          <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs">Pool ID</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => copyField(pool.meta.invoiceHash, "Pool ID")}
              >
                {copiedField === "Pool ID" ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <p className="font-mono text-xs break-all">
              {pool.meta.invoiceHash}
            </p>
            {isBusiness && (
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Pool ID used for voting/execution. You can submit any invoice as
                long as its advance rate falls within the pool's min/max range.
              </p>
            )}
          </div>

          {/* Funding */}
          <div className="grid grid-cols-3 gap-2">
            {[
              [
                "Rate Range",
                `${pool.meta.minAdvanceRate / 100}%-${pool.meta.maxAdvanceRate / 100}%`,
              ],
              ["Total Raised", formatMicro(pool.totalContributed) + " ALEO"],
              ["Min/Contrib", formatMicro(pool.meta.minContribution) + " ALEO"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border p-2 text-center">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="font-mono text-xs font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <Progress value={100} className="h-1.5" />
            <p className="text-right text-xs text-muted-foreground mt-1">
              Always accepting invoices within rate range
            </p>
          </div>

          {/* Pending offer / voting */}
          {pool.pendingOffer && !pool.pendingOffer.isExecuted && (
            <div className="rounded-md border border-amber-300/70 bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                  Pending Invoice Offer
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className="text-[10px] uppercase tracking-wide"
                  >
                    New
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-amber-300 text-amber-800"
                  >
                    Voting
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Creditor</span>
                  <AddressDisplay
                    address={pool.pendingOffer.originalCreditor}
                    chars={5}
                    showExplorer
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Amount</span>
                  <span className="font-mono">
                    {formatMicro(pool.pendingOffer.amount)} ALEO
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Advance Rate</span>
                  <span>
                    {(pool.pendingOffer.advanceRate / 100).toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Votes</span>
                  <span
                    className={cn(
                      stats.isApproved
                        ? "text-green-600 font-semibold"
                        : "text-amber-800 font-semibold",
                    )}
                  >
                    {stats.voteCount} / {stats.threshold} needed
                    {stats.isApproved && " ✓ Approved"}
                  </span>
                </div>
                <Progress
                  value={
                    stats.threshold > 0
                      ? Math.min(100, (stats.voteCount / stats.threshold) * 100)
                      : 0
                  }
                  className="h-1.5 bg-amber-200"
                />
              </div>
            </div>
          )}

          {/* Executed info */}
          {pool.pendingOffer?.isExecuted && (
            <div className="rounded-md border border-emerald-300/50 bg-emerald-50/30 p-3 text-xs space-y-1">
              <p className="font-medium text-emerald-700">Pool Executed</p>
              <p className="text-muted-foreground">
                Advance paid to business. Awaiting debtor payment, then
                contributors can claim proceeds.
              </p>
              {pool.proceeds !== null && (
                <p className="text-emerald-700">
                  Proceeds available: {formatMicro(pool.proceeds)} ALEO
                </p>
              )}
            </div>
          )}
        </div>

        <PoolTimeline pool={pool} activeFactorCount={activeFactorCount} />

        <DialogFooter className="flex-col gap-2">
          {canOpenDistribution && (
            <div className="w-full space-y-1.5">
              <Button
                className="w-full"
                onClick={() => handleOpenDistribution(pool.meta.invoiceHash)}
                disabled={isWorking}
              >
                Open Distribution
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Permissionless — anyone can call this once debtor has paid.
              </p>
            </div>
          )}

          {/* Business */}
          {isBusiness &&
            stats.isFullyFunded &&
            !stats.hasPendingOffer &&
            !pool.isClosed && (
              <Button
                className="w-full"
                onClick={() => {
                  setPoolDetailOpen(false);
                  openSubmitInvoice(pool);
                }}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Invoice to Pool
              </Button>
            )}

          {/* Factor: contribute */}
          {isFactor && !pool.isClosed && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                setPoolDetailOpen(false);
                openContribute(pool);
              }}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Contribute
            </Button>
          )}

          {/* Factor: vote */}
          {isFactor && stats.hasPendingOffer && !stats.isApproved && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setPoolDetailOpen(false);
                navigate("/pools");
              }}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Pools Voting
            </Button>
          )}

          {/* Factor: execute */}
          {isFactor && stats.hasPendingOffer && stats.isApproved && (
            <Button
              className="w-full"
              onClick={() => {
                setPoolDetailOpen(false);
                navigate("/pools");
              }}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Pools Execution
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    );
  };

  // ── main render ───────────────────────────────────────────────────
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {isFactor ? "Invoice Marketplace" : "Browse Factors & Pools"}
        </h1>
        <p className="text-muted-foreground">
          {isFactor
            ? "Register, contribute to pools, and manage voting from the Pools page."
            : "Find factors and join on-chain pools — no account needed to browse."}
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

          {/* ── Pools section ── */}
          {(poolsLoading || openPools.length > 0 || closedPools.length > 0) && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">On-Chain Pools</p>
                <p className="text-xs text-muted-foreground">
                  Pools are public and ownerless — contributions are held in the
                  protocol escrow. Minimum contribution: 5 ALEO.
                </p>
              </div>

              {poolsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[0, 1].map((i) => (
                    <Card key={i}>
                      <CardContent className="pt-4 space-y-3">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-2 w-full" />
                        <Skeleton className="h-9 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : openPools.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center space-y-2">
                    <p className="font-medium text-sm">No open pools</p>
                    <p className="text-xs text-muted-foreground">
                      {isFactor
                        ? "Create a pool to start collecting contributions."
                        : "Check back later — pools are created by registered factors."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {openPools.map(renderPoolCard)}
                </div>
              )}

              {closedPools.length > 0 && (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-0 text-muted-foreground"
                    onClick={() => setShowCompletedPools((p) => !p)}
                  >
                    {showCompletedPools ? "Hide" : "Show"} completed pools (
                    {closedPools.length})
                  </Button>
                  {showCompletedPools && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {closedPools.map(renderPoolCard)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Factors section ── */}
          <div className="space-y-3">
            <p className="text-sm font-medium">
              {factorsLoading
                ? "Loading factors…"
                : `${filteredFactors.length} active factor${filteredFactors.length !== 1 ? "s" : ""}`}
            </p>

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
                                  Advance Rate (bps,{" "}
                                  {selectedFactor?.min_advance_rate ?? 5000}–
                                  {selectedFactor?.max_advance_rate ?? 9900})
                                </Label>
                                <Input
                                  type="number"
                                  placeholder={`e.g. ${selectedFactor?.max_advance_rate ?? 9000}`}
                                  min={selectedFactor?.min_advance_rate ?? 5000}
                                  max={selectedFactor?.max_advance_rate ?? 9900}
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
                                      ? `${(advanceRateBps / 100).toFixed(2)}% advance`
                                      : `Must be between ${factorMinRate} and ${factorMaxRate} bps`}
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
          </div>
        </div>
      </div>

      {/* ── Pool detail dialog ─────────────────────────────────────── */}
      <Dialog
        open={poolDetailOpen}
        onOpenChange={(o) => {
          setPoolDetailOpen(o);
          if (!o) setSelectedPool(null);
        }}
      >
        {renderPoolDetail()}
      </Dialog>

      {/* ── Contribute dialog ──────────────────────────────────────── */}
      <Dialog
        open={contributeOpen}
        onOpenChange={(o) => {
          setContributeOpen(o);
          if (!o) setContributePool(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Contribute to Pool
            </DialogTitle>
            <DialogDescription>
              Credits go to the protocol escrow — you receive a PoolShare record
              as your claim ticket.
            </DialogDescription>
          </DialogHeader>
          {contributePool && (
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pool</span>
                  <span className="font-medium">
                    {contributePool.meta.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Raised</span>
                  <span className="font-mono">
                    {formatMicro(contributePool.totalContributed)} ALEO
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Min contribution
                  </span>
                  <span className="font-mono">
                    {formatMicro(contributePool.meta.minContribution)} ALEO
                  </span>
                </div>
                {publicBalance !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Your public balance
                    </span>
                    <span
                      className={cn(
                        "font-mono",
                        publicBalance < contributePool.meta.minContribution &&
                          "text-destructive",
                      )}
                    >
                      {formatMicro(publicBalance)} ALEO
                    </span>
                  </div>
                )}
              </div>

              {publicBalance !== null &&
                publicBalance < contributePool.meta.minContribution && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
                    <p className="font-medium">Insufficient public balance</p>
                    <p>
                      Pool contributions use your public credits balance (not
                      private records). Convert first:{" "}
                      <code className="bg-amber-100 px-1 rounded">
                        credits.aleo/transfer_private_to_public
                      </code>
                    </p>
                  </div>
                )}

              <div className="space-y-2">
                <Label>Contribution Amount (ALEO)</Label>
                <Input
                  type="number"
                  placeholder={`Min ${formatMicro(contributePool.meta.minContribution)}`}
                  min={Number(contributePool.meta.minContribution) / 1e6}
                  step="0.000001"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setContributeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleContribute}
              disabled={isWorking || !contributeAmount}
            >
              {isWorking && pendingActionRef.current === "contribute-pool"
                ? "Contributing…"
                : "Contribute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Pool ID</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs break-all flex-1">
                    {submitInvoicePool.meta.invoiceHash}
                  </p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={() =>
                      copyField(submitInvoicePool.meta.invoiceHash, "Pool ID")
                    }
                  >
                    {copiedField === "Pool ID" ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Invoice</Label>
                {availableInvoicesForPool.length === 0 ? (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
                    <p className="font-medium">No invoices in wallet</p>
                    <p>
                      Mint an invoice first, then submit it into this funded
                      pool with a matching advance rate.
                    </p>
                  </div>
                ) : (
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
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Advance Rate (%) — must be within pool range (
                  {submitInvoicePool?.meta.minAdvanceRate / 100}%-
                  {submitInvoicePool?.meta.maxAdvanceRate / 100}%)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 75 for 75%"
                  min="50"
                  max="99"
                  value={
                    submitInvoiceRate
                      ? String(Math.floor(Number(submitInvoiceRate) / 100))
                      : ""
                  }
                  onChange={(e) => {
                    if (e.target.value === "") {
                      setSubmitInvoiceRate("");
                      return;
                    }
                    const percent = Number(e.target.value);
                    const bps = percent * 100;
                    if (!isNaN(bps)) setSubmitInvoiceRate(bps.toString());
                  }}
                />
                {submitInvoiceRecord &&
                  submitRateValid &&
                  !submitRateInRange && (
                    <p className="text-xs text-destructive">
                      Rate {submitRateBps / 100}% is outside pool range (
                      {submitInvoicePool?.meta.minAdvanceRate / 100}%-
                      {submitInvoicePool?.meta.maxAdvanceRate / 100}%)
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
    </div>
  );
}
