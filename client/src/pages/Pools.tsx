import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Plus,
  Lock,
  Unlock,
  ChevronRight,
  Layers,
  Info,
  Vote,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AddressDisplay } from "@/components/ui/address-display";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { toast } from "sonner";
import { PROGRAM_ID, PROGRAM_ADDRESS } from "@/lib/config";
import { type AleoRecord, getField, microToAleo } from "@/lib/aleo-records";
import {
  computeExpectedPoolPayout,
  fetchPoolContributions,
  fetchPoolClosed,
  fetchPoolProceeds,
  fetchInvoiceSettled,
  buildContributeToPoolInputs,
  buildClaimPoolProceedsInputs,
  buildExecutePoolFactoringInputs,
  buildRecoverPoolCloseInputs,
} from "@/lib/aleo-factors";
import {
  listPoolDirectory,
  updatePoolClosed,
  upsertPoolContribution,
} from "@/lib/pool-directory";
import {
  buildCreateOwnerlessPoolInputs,
  buildPoolContributeInputs,
  buildPoolVoteInputs,
  buildExecuteApprovedPoolInputs,
  computePoolStats,
  encodePoolName,
  fetchPublicCreditsBalance,
  fetchActiveFactorCount,
  fetchAllPools,
  type OnChainPoolState,
} from "@/lib/pool-chain";
import { PoolTimeline } from "@/components/pools/PoolTimeline";

// Dialog for creating a new pool
function PoolCreateDialog() {
  const [open, setOpen] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [poolInvoiceHash, setPoolInvoiceHash] = useState("");
  const [poolMinAdvanceRate, setPoolMinAdvanceRate] = useState("50");
  const [poolMaxAdvanceRate, setPoolMaxAdvanceRate] = useState("80");
  const [poolMinContribAleo, setPoolMinContribAleo] = useState("5");
  const queryClient = useQueryClient();
  const { activeRole } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const [creating, setCreating] = useState(false);
  const pendingPoolCreateRef = useRef(false);

  useEffect(() => {
    if (!pendingPoolCreateRef.current) return;

    if (status === "submitting") {
      toast.loading("Generating proof...", { id: "create-pool" });
      return;
    }

    if (status === "pending") {
      toast.loading("Broadcasting...", { id: "create-pool" });
      return;
    }

    if (status === "accepted") {
      toast.success("Pool created successfully.", { id: "create-pool" });
      setOpen(false);
      setPoolName("");
      setPoolInvoiceHash("");
      setPoolMinAdvanceRate("50");
      setPoolMaxAdvanceRate("80");
      setPoolMinContribAleo("5");
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
      queryClient.invalidateQueries({ queryKey: ["all_pools"] });
      queryClient.refetchQueries({ queryKey: ["all_pools"] });
      pendingPoolCreateRef.current = false;
      reset();
      return;
    }

    if (status === "failed") {
      toast.error(txError || "Failed to create pool.", { id: "create-pool" });
      setCreating(false);
      pendingPoolCreateRef.current = false;
      reset();
    }
  }, [status, txError, queryClient, reset]);

  const handleCreatePool = async () => {
    const trimmedName = poolName.trim();
    const minRate = Number(poolMinAdvanceRate);
    const maxRate = Number(poolMaxAdvanceRate);
    const minContrib = Number(poolMinContribAleo);

    if (!trimmedName) {
      toast.error("Pool name is required.");
      return;
    }
    if (!Number.isFinite(minRate) || minRate < 50 || minRate > 99) {
      toast.error("Min advance rate must be between 50% and 99%.");
      return;
    }
    if (!Number.isFinite(maxRate) || maxRate < 50 || maxRate > 99) {
      toast.error("Max advance rate must be between 50% and 99%.");
      return;
    }
    if (minRate > maxRate) {
      toast.error("Min advance rate cannot exceed max advance rate.");
      return;
    }
    if (!Number.isFinite(minContrib) || minContrib < 5) {
      toast.error("Minimum contribution must be at least 5 ALEO.");
      return;
    }

    const minRateBps = Math.round(minRate * 100);
    const maxRateBps = Math.round(maxRate * 100);
    const minContribMicro = BigInt(Math.round(minContrib * 1_000_000));

    setCreating(true);
    pendingPoolCreateRef.current = true;
    try {
      const poolId =
        poolInvoiceHash.trim() ||
        `${Date.now()}${Math.floor(Math.random() * 1_000_000)}field`;
      await execute({
        program: PROGRAM_ID,
        function: "create_ownerless_pool",
        inputs: buildCreateOwnerlessPoolInputs(
          poolId,
          encodePoolName(trimmedName),
          minRateBps,
          maxRateBps,
          minContribMicro,
        ),
        fee: 100_000,
        privateFee: false,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create pool.",
        { id: "create-pool" },
      );
      setCreating(false);
      pendingPoolCreateRef.current = false;
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            Create an ownerless pool that accepts invoices at specific advance
            rates. Any business can submit an invoice if their requested advance
            rate falls within the pool's range.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pool-name">Pool Name</Label>
            <Input
              id="pool-name"
              value={poolName}
              onChange={(e) => setPoolName(e.target.value)}
              placeholder="e.g. FastPay Growth"
              maxLength={16}
            />
            <p className="text-xs text-muted-foreground">
              Max 16 ASCII characters.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pool-target">Pool ID (optional)</Label>
            <Input
              id="pool-target"
              value={poolInvoiceHash}
              onChange={(e) => setPoolInvoiceHash(e.target.value)}
              placeholder="Auto-generated if left empty"
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              A pool is generic and can accept any invoice later if the advance
              rate matches this pool's configured range.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pool-min-rate">Min Advance Rate (%)</Label>
            <Input
              id="pool-min-rate"
              type="number"
              min="50"
              max="99"
              step="1"
              value={poolMinAdvanceRate}
              onChange={(e) => setPoolMinAdvanceRate(e.target.value)}
              placeholder="50"
            />
            <p className="text-xs text-muted-foreground">
              Minimum percentage advance (50-99%).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pool-max-rate">Max Advance Rate (%)</Label>
            <Input
              id="pool-max-rate"
              type="number"
              min="50"
              max="99"
              step="1"
              value={poolMaxAdvanceRate}
              onChange={(e) => setPoolMaxAdvanceRate(e.target.value)}
              placeholder="80"
            />
            <p className="text-xs text-muted-foreground">
              Maximum percentage advance (50-99%).
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pool-min-contrib">
              Minimum Contribution (ALEO)
            </Label>
            <Input
              id="pool-min-contrib"
              type="number"
              min="5"
              step="0.000001"
              value={poolMinContribAleo}
              onChange={(e) => setPoolMinContribAleo(e.target.value)}
              placeholder="5"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreatePool}
            disabled={
              creating ||
              status !== "idle" ||
              activeRole !== "factor" ||
              !poolName.trim() ||
              !poolMinAdvanceRate.trim() ||
              !poolMaxAdvanceRate.trim() ||
              isNaN(Number(poolMinAdvanceRate)) ||
              isNaN(Number(poolMaxAdvanceRate)) ||
              Number(poolMinAdvanceRate) < 50 ||
              Number(poolMaxAdvanceRate) > 99 ||
              Number(poolMinAdvanceRate) > Number(poolMaxAdvanceRate)
            }
          >
            {status === "submitting"
              ? "Generating proof..."
              : status === "pending"
                ? "Broadcasting..."
                : creating
                  ? "Creating..."
                  : "Create Pool"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DEFAULT_PROGRAM_ID = "zk_factor_12250.aleo";
const DEFAULT_PROGRAM_ADDRESS =
  "aleo1s8hgprffm0tqdc9d4q5mshu90efwcg7qfvwzyr3r9wpangazrq8s5yfww6";

interface PoolMeta {
  invoiceHash: string;
  owner: string;
  targetAmount: bigint;
  contributed: bigint | null;
  isClosed: boolean;
}

export default function Pools() {
  const queryClient = useQueryClient();
  const { isConnected, requestRecords, address, activeRole } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();

  // Contribute form state
  const [contributeInvoiceHash, setContributeInvoiceHash] = useState("");
  const [contributePoolOwner, setContributePoolOwner] = useState("");
  const [contributeAmountAleo, setContributeAmountAleo] = useState("");
  const [isContributing, setIsContributing] = useState(false);
  const [claimingShareId, setClaimingShareId] = useState<string | null>(null);
  const [executingPoolHash, setExecutingPoolHash] = useState<string | null>(
    null,
  );
  const [recoveringPoolHash, setRecoveringPoolHash] = useState<string | null>(
    null,
  );
  const [pendingExecutionHash, setPendingExecutionHash] = useState<
    string | null
  >(null);
  const [pendingDistributionHash, setPendingDistributionHash] = useState<
    string | null
  >(null);
  const [ownerlessContributeOpen, setOwnerlessContributeOpen] = useState(false);
  const [ownerlessContributePool, setOwnerlessContributePool] =
    useState<OnChainPoolState | null>(null);
  const [ownerlessContributeAmount, setOwnerlessContributeAmount] =
    useState("");
  const [publicBalance, setPublicBalance] = useState<bigint | null>(null);
  const [poolDetailOpen, setPoolDetailOpen] = useState(false);
  const [selectedPoolHash, setSelectedPoolHash] = useState<string | null>(null);
  const [selectedPoolKind, setSelectedPoolKind] = useState<
    "legacy" | "ownerless" | null
  >(null);

  // Per-pool live metadata (contributions + closed status)
  const [poolMetas, setPoolMetas] = useState<Record<string, PoolMeta>>({});
  const [pendingPoolContribution, setPendingPoolContribution] = useState<{
    invoiceHash: string;
    owner: string;
    contributor: string;
    contributedMicro: number;
    targetAmountMicro?: number;
  } | null>(null);

  const {
    data: records,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["records", PROGRAM_ID, "pools"],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 60_000,
  });

  const {
    data: onChainPools = [],
    isLoading: onChainPoolsLoading,
    refetch: refetchOnChainPools,
  } = useQuery({
    queryKey: ["all_pools"],
    queryFn: fetchAllPools,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: activeFactorCount = 1 } = useQuery({
    queryKey: ["active_factor_count"],
    queryFn: fetchActiveFactorCount,
    staleTime: 60_000,
  });

  const getOwnerlessPoolStatus = (pool: OnChainPoolState) => {
    const stats = computePoolStats(pool, activeFactorCount);

    if (pool.isClosed) {
      if (stats.isFullyDistributed) {
        return {
          label: "Closed",
          className: "text-green-600 border-green-300 text-xs",
        };
      }
      if (pool.isSettled && pool.proceeds === null) {
        return {
          label: "Awaiting Distribution",
          className: "text-violet-700 border-violet-300 text-xs",
        };
      }
      if (pool.proceeds !== null && pool.proceeds > 0n) {
        return {
          label: "Paying Out",
          className: "text-amber-700 border-amber-300 text-xs",
        };
      }
      return {
        label: "Executed",
        className: "text-blue-600 border-blue-300 text-xs",
      };
    }

    return {
      label: "Open",
      className: "text-blue-600 border-blue-300 text-xs",
    };
  };

  const openPoolDetails = (
    invoiceHash: string,
    kind: "legacy" | "ownerless",
  ) => {
    setSelectedPoolHash(invoiceHash);
    setSelectedPoolKind(kind);
    setPoolDetailOpen(true);
  };

  const closePoolDetails = () => {
    setPoolDetailOpen(false);
    setSelectedPoolHash(null);
    setSelectedPoolKind(null);
  };

  const poolRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "FactorPool" && !r.spent,
  );
  const localPoolEntries = listPoolDirectory();
  const poolNameById = new Map(
    localPoolEntries.map((entry) => [entry.invoiceHash, entry.poolName]),
  );
  const onChainPoolHashes = new Set(
    poolRecords.map((r) => getField(r.recordPlaintext, "invoice_hash")),
  );
  const directoryOnlyPools = localPoolEntries.filter(
    (p) => !onChainPoolHashes.has(p.invoiceHash),
  );
  const ownerPoolRecords = poolRecords.filter(
    (r) => !!address && getField(r.recordPlaintext, "owner") === address,
  );
  const ownerDirectoryPools = directoryOnlyPools.filter(
    (p) => !!address && p.owner === address,
  );
  const totalVisiblePools = poolRecords.length + directoryOnlyPools.length;
  const totalOwnerlessPools = onChainPools.length;
  const poolShareRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "PoolShare" && !r.spent,
  );
  const offerRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "FactoringOffer" && !r.spent,
  );
  const factoredRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "FactoredInvoice" && !r.spent,
  );

  // Load live on-chain metadata for all Pool records
  useEffect(() => {
    if (!poolRecords.length) return;
    poolRecords.forEach(async (record) => {
      const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
      const owner = getField(record.recordPlaintext, "owner");
      const targetRaw = getField(record.recordPlaintext, "target_amount");
      const targetAmount = BigInt(targetRaw.replace(/u64$/, ""));

      const [contributed, isClosed] = await Promise.all([
        fetchPoolContributions(invoiceHash),
        fetchPoolClosed(invoiceHash),
      ]);

      setPoolMetas((prev) => ({
        ...prev,
        [invoiceHash]: {
          invoiceHash,
          owner,
          targetAmount,
          contributed,
          isClosed,
        },
      }));

      updatePoolClosed(invoiceHash, isClosed);
    });
  }, [poolRecords]);

  // Toast feedback
  useEffect(() => {
    if (status === "submitting")
      toast.loading("Generating proof…", { id: "pool-op" });
    else if (status === "pending")
      toast.loading("Broadcasting…", { id: "pool-op" });
    else if (status === "accepted") {
      if (pendingPoolContribution) {
        upsertPoolContribution(pendingPoolContribution);
        setPendingPoolContribution(null);
      }

      toast.success("Transaction confirmed!", { id: "pool-op" });
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
      queryClient.invalidateQueries({ queryKey: ["all_pools"] });
      setIsContributing(false);
      setContributeInvoiceHash("");
      setContributePoolOwner("");
      setContributeAmountAleo("");
      setClaimingShareId(null);
      setExecutingPoolHash(null);
      setRecoveringPoolHash(null);
      setPendingExecutionHash(null);
      setPendingDistributionHash(null);
      setOwnerlessContributeOpen(false);
      setOwnerlessContributePool(null);
      setOwnerlessContributeAmount("");
      setPublicBalance(null);
      reset();
    } else if (status === "failed") {
      setPendingPoolContribution(null);
      toast.error(txError || "Transaction failed", { id: "pool-op" });
      setIsContributing(false);
      setClaimingShareId(null);
      setExecutingPoolHash(null);
      setRecoveringPoolHash(null);
      setPendingExecutionHash(null);
      setPendingDistributionHash(null);
      setOwnerlessContributeOpen(false);
      setOwnerlessContributePool(null);
      setOwnerlessContributeAmount("");
      setPublicBalance(null);
      reset();
    }
  }, [status, txError, queryClient, reset, pendingPoolContribution]);

  useEffect(() => {
    if (status !== "pending" || !pendingExecutionHash) return;

    const ownerlessPool = onChainPools.find(
      (pool) => pool.meta.invoiceHash === pendingExecutionHash,
    );
    const legacyPoolClosed = poolMetas[pendingExecutionHash]?.isClosed;

    const ownerlessComplete =
      ownerlessPool?.pendingOffer?.isExecuted || ownerlessPool?.isClosed;
    const legacyComplete = legacyPoolClosed === true;

    if (!ownerlessComplete && !legacyComplete) return;

    toast.success("Pool execution confirmed.", { id: "pool-op" });
    setPendingExecutionHash(null);
    setExecutingPoolHash(null);
    setRecoveringPoolHash(null);
    queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
    queryClient.invalidateQueries({ queryKey: ["all_pools"] });
    reset();
  }, [
    status,
    pendingExecutionHash,
    onChainPools,
    poolMetas,
    queryClient,
    reset,
  ]);

  useEffect(() => {
    if (status !== "pending" || !pendingDistributionHash) return;

    const ownerlessPool = onChainPools.find(
      (pool) => pool.meta.invoiceHash === pendingDistributionHash,
    );
    const distributionOpened =
      !!ownerlessPool && ownerlessPool.proceeds !== null && ownerlessPool.proceeds > 0n;

    if (!distributionOpened) return;

    toast.success("Distribution opened.", { id: "pool-op" });
    setPendingDistributionHash(null);
    queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
    queryClient.invalidateQueries({ queryKey: ["all_pools"] });
    reset();
  }, [
    status,
    pendingDistributionHash,
    onChainPools,
    queryClient,
    reset,
  ]);

  const openOwnerlessContribute = async (pool: OnChainPoolState) => {
    setOwnerlessContributePool(pool);
    setOwnerlessContributeAmount("");
    setOwnerlessContributeOpen(true);
    if (address) {
      const balance = await fetchPublicCreditsBalance(address);
      setPublicBalance(balance);
    }
  };

  const handleOwnerlessContribute = async () => {
    if (!ownerlessContributePool || !address) return;
    const amountAleo = parseFloat(ownerlessContributeAmount);
    if (Number.isNaN(amountAleo) || amountAleo <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }

    const contribution = BigInt(Math.round(amountAleo * 1_000_000));
    const minContrib = ownerlessContributePool.meta.minContribution;
    if (contribution < minContrib) {
      toast.error(
        `Minimum contribution is ${(Number(minContrib) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })} ALEO.`,
      );
      return;
    }

    if (publicBalance !== null && contribution > publicBalance) {
      toast.error(
        `Insufficient public credits balance (${(Number(publicBalance) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })} ALEO).`,
      );
      return;
    }

    if (!PROGRAM_ADDRESS) {
      toast.error("PROGRAM_ADDRESS is not set.");
      return;
    }

    // Helpful guard: most generic "Rejected" tx here are program address mismatch.
    if (
      PROGRAM_ID !== DEFAULT_PROGRAM_ID &&
      PROGRAM_ADDRESS === DEFAULT_PROGRAM_ADDRESS
    ) {
      toast.error(
        "PROGRAM_ADDRESS likely does not match your deployed PROGRAM_ID. Update VITE_PROGRAM_ADDRESS for the current program deployment.",
      );
      return;
    }

    const existingTotal = ownerlessContributePool.totalContributed;

    await execute({
      program: PROGRAM_ID,
      function: "pool_contribute",
      inputs: buildPoolContributeInputs(
        ownerlessContributePool.meta.invoiceHash,
        PROGRAM_ADDRESS,
        contribution,
        existingTotal,
      ),
      fee: 80_000,
      privateFee: false,
    });
  };

  const handleOwnerlessVote = async (invoiceHash: string) => {
    await execute({
      program: PROGRAM_ID,
      function: "pool_vote",
      inputs: buildPoolVoteInputs(invoiceHash),
      fee: 50_000,
      privateFee: false,
    });
  };

  const handleExecuteApprovedOwnerlessPool = async (pool: OnChainPoolState) => {
    const offer = pool.pendingOffer;
    if (!offer || offer.isExecuted) return;

    await execute({
      program: PROGRAM_ID,
      function: "execute_approved_pool",
      inputs: buildExecuteApprovedPoolInputs(
        pool.meta.invoiceHash,
        offer.originalCreditor,
        offer.debtor,
        offer.advanceAmount,
        offer.amount,
        offer.dueDate,
      ),
      fee: 120_000,
      privateFee: false,
    });
  };

  const handleOpenOwnerlessDistribution = async (invoiceHash: string) => {
    setPendingDistributionHash(invoiceHash);
    await execute({
      program: PROGRAM_ID,
      function: "pool_open_distribution",
      inputs: [invoiceHash],
      fee: 80_000,
      privateFee: false,
    });
  };

  const handleContribute = async () => {
    if (
      !contributeInvoiceHash.trim() ||
      !contributePoolOwner.trim() ||
      !contributeAmountAleo.trim()
    ) {
      toast.error("Fill in all fields");
      return;
    }
    const contributionMicro = BigInt(
      Math.round(parseFloat(contributeAmountAleo) * 1_000_000),
    );
    if (contributionMicro <= 0n) {
      toast.error("Amount must be > 0");
      return;
    }
    setIsContributing(true);

    // Fetch existing total and a credits record
    let creditsRecord: AleoRecord | undefined;
    let existingTotal = 0n;
    try {
      const [existingRaw, creditsRecords] = await Promise.all([
        fetchPoolContributions(contributeInvoiceHash.trim()),
        requestRecords("credits.aleo", true) as Promise<AleoRecord[]>,
      ]);
      existingTotal = existingRaw ?? 0n;
      creditsRecord = creditsRecords
        .filter((r) => !r.spent)
        .find(
          (r) =>
            BigInt(
              getField(r.recordPlaintext, "microcredits").replace(/u64$/, ""),
            ) >= contributionMicro,
        );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch credits",
      );
      setIsContributing(false);
      return;
    }
    if (!creditsRecord) {
      toast.error("No credits record with sufficient balance");
      setIsContributing(false);
      return;
    }

    const inputs = buildContributeToPoolInputs(
      contributeInvoiceHash.trim(),
      contributePoolOwner.trim(),
      existingTotal,
      creditsRecord.recordPlaintext,
      contributionMicro,
    );

    const meta = poolMetas[contributeInvoiceHash.trim()];
    setPendingPoolContribution({
      invoiceHash: contributeInvoiceHash.trim(),
      owner: contributePoolOwner.trim(),
      contributor: address ?? "",
      contributedMicro: Number(contributionMicro),
    });

    await execute({
      program: PROGRAM_ID,
      function: "contribute_to_pool",
      inputs,
      fee: 100_000,
      privateFee: false,
    });
  };

  const handleClaimProceeds = async (share: AleoRecord) => {
    const shareId =
      share.commitment ?? getField(share.recordPlaintext, "invoice_hash");
    const invoiceHash = getField(share.recordPlaintext, "invoice_hash");
    setClaimingShareId(shareId);

    try {
      const [isClosed, isSettled, totalContributions, poolProceeds] =
        await Promise.all([
          fetchPoolClosed(invoiceHash),
          fetchInvoiceSettled(invoiceHash),
          fetchPoolContributions(invoiceHash),
          fetchPoolProceeds(invoiceHash),
        ]);

      if (!isClosed) {
        toast.error(
          "Pool funding may be complete, but pool owner still needs to execute pool factoring before payouts are claimable.",
        );
        setClaimingShareId(null);
        return;
      }

      if (!isSettled) {
        toast.error(
          "Invoice is not settled yet. Wait until debtor payment is confirmed.",
        );
        setClaimingShareId(null);
        return;
      }

      if (poolProceeds === null || poolProceeds <= 0n) {
        toast.error(
          "Pool proceeds are not opened yet. Pool owner must open distribution first.",
        );
        setClaimingShareId(null);
        return;
      }

      if (totalContributions === null || totalContributions <= 0n) {
        toast.error("Pool contribution totals are unavailable for this pool.");
        setClaimingShareId(null);
        return;
      }

      const contributed = BigInt(
        getField(share.recordPlaintext, "contributed").replace(/u64$/, ""),
      );
      const expectedPayout = computeExpectedPoolPayout(
        contributed,
        totalContributions,
        poolProceeds,
      );

      if (expectedPayout <= 0n) {
        toast.error("No claimable proceeds available for this share yet.");
        setClaimingShareId(null);
        return;
      }

      const inputs = buildClaimPoolProceedsInputs(
        share.recordPlaintext,
        expectedPayout,
      );

      await execute({
        program: PROGRAM_ID,
        function: "claim_pool_proceeds",
        inputs,
        fee: 80_000,
        privateFee: false,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Claim proceeds failed");
      setClaimingShareId(null);
    }
  };

  const handleExecutePoolFactoring = async (
    poolRecord: AleoRecord,
    offerRecord: AleoRecord,
  ) => {
    const invoiceHash = getField(poolRecord.recordPlaintext, "invoice_hash");
    setExecutingPoolHash(invoiceHash);
    setPendingExecutionHash(invoiceHash);

    try {
      const offerAmount = BigInt(
        getField(offerRecord.recordPlaintext, "amount").replace(/u64$/, ""),
      );
      const advanceRate = BigInt(
        getField(offerRecord.recordPlaintext, "advance_rate").replace(
          /u16$/,
          "",
        ),
      );
      const advanceAmount = (offerAmount * advanceRate) / 10000n;

      const creditsRecords = (await requestRecords(
        "credits.aleo",
        true,
      )) as AleoRecord[];
      const paymentRecord = creditsRecords
        .filter((r) => !r.spent)
        .find(
          (r) =>
            BigInt(
              getField(r.recordPlaintext, "microcredits").replace(/u64$/, ""),
            ) >= advanceAmount,
        );

      if (!paymentRecord) {
        toast.error("Insufficient credits to execute pool factoring.");
        setExecutingPoolHash(null);
        return;
      }

      await execute({
        program: PROGRAM_ID,
        function: "execute_pool_factoring",
        inputs: buildExecutePoolFactoringInputs(
          offerRecord.recordPlaintext,
          poolRecord.recordPlaintext,
          paymentRecord.recordPlaintext,
        ),
        fee: 100_000,
        privateFee: false,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pool execution failed");
      setExecutingPoolHash(null);
    }
  };

  const handleRecoverPoolClose = async (poolRecord: AleoRecord) => {
    const invoiceHash = getField(poolRecord.recordPlaintext, "invoice_hash");
    setRecoveringPoolHash(invoiceHash);
    setPendingExecutionHash(invoiceHash);

    try {
      const settled = await fetchInvoiceSettled(invoiceHash);
      if (!settled) {
        toast.error(
          "Invoice is not settled yet. Recovery close is only allowed after settlement.",
        );
        setRecoveringPoolHash(null);
        return;
      }

      await execute({
        program: PROGRAM_ID,
        function: "recover_pool_close",
        inputs: buildRecoverPoolCloseInputs(poolRecord.recordPlaintext),
        fee: 80_000,
        privateFee: false,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pool recovery failed");
      setRecoveringPoolHash(null);
    }
  };

  const renderPoolCards = (view: "all" | "owner" = "all") => {
    const viewPoolRecords = view === "owner" ? ownerPoolRecords : poolRecords;
    const viewDirectoryPools =
      view === "owner" ? ownerDirectoryPools : directoryOnlyPools;

    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (viewPoolRecords.length === 0 && viewDirectoryPools.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">
                {view === "owner"
                  ? "You don't own any pools yet"
                  : "No pools yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {view === "owner"
                  ? "Create a pool in Marketplace to start managing owner operations."
                  : "Create a pool to syndicate factoring across multiple contributors"}
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {viewPoolRecords.map((record, idx) => {
          const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
          const poolName = poolNameById.get(invoiceHash);
          const targetRaw = getField(record.recordPlaintext, "target_amount");
          const targetMicro = BigInt(targetRaw.replace(/u64$/, ""));
          const meta = poolMetas[invoiceHash];
          const contributed = meta?.contributed ?? null;
          const isClosed = meta?.isClosed ?? false;
          const isTargetReached =
            contributed !== null &&
            targetMicro > 0n &&
            contributed >= targetMicro;
          const isAwaitingExecution = !isClosed && isTargetReached;
          const isOwner =
            !!address && getField(record.recordPlaintext, "owner") === address;
          const matchingOffer = offerRecords.find(
            (offer) =>
              getField(offer.recordPlaintext, "invoice_hash") === invoiceHash &&
              getField(offer.recordPlaintext, "owner") === address,
          );
          const alreadyFactoredByOwner = factoredRecords.some(
            (factored) =>
              getField(factored.recordPlaintext, "invoice_hash") ===
                invoiceHash &&
              getField(factored.recordPlaintext, "owner") === address,
          );
          const awaitingReason = isAwaitingExecution
            ? !isOwner
              ? "Only the pool owner can execute this funded pool."
              : alreadyFactoredByOwner && !matchingOffer
                ? "Offer was already consumed outside pool execution. This pool cannot be executed anymore."
                : !matchingOffer
                  ? "Missing matching FactoringOffer record in this wallet."
                  : "If debtor already paid, run Execute Pool Factoring now. Then claim from My Shares."
            : null;

          const fillPct =
            contributed !== null && targetMicro > 0n
              ? Math.min(100, Number((contributed * 100n) / targetMicro))
              : null;

          const targetAleo = microToAleo(targetRaw);

          return (
            <Card
              key={invoiceHash || idx}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => openPoolDetails(invoiceHash, "legacy")}
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {poolName ?? "Untitled Pool"}
                    </p>
                    <span className="font-mono text-sm text-muted-foreground">
                      {invoiceHash.slice(0, 14)}…
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      isClosed
                        ? "text-green-600 border-green-300 text-xs"
                        : isAwaitingExecution
                          ? "text-amber-700 border-amber-300 text-xs"
                          : "text-blue-600 border-blue-300 text-xs"
                    }
                  >
                    {isClosed ? (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Closed
                      </>
                    ) : isAwaitingExecution ? (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Funded
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3 w-3 mr-1" />
                        Open
                      </>
                    )}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-mono font-medium">
                      {targetAleo.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      ALEO
                    </span>
                  </div>
                  {contributed !== null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Raised</span>
                      <span className="font-mono font-medium">
                        {microToAleo(`${contributed}u64`).toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                          },
                        )}{" "}
                        ALEO
                      </span>
                    </div>
                  )}
                </div>

                {fillPct !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Fill</span>
                      <span>{fillPct}%</span>
                    </div>
                    <Progress value={fillPct} className="h-1.5" />
                  </div>
                )}

                {!isClosed && isAwaitingExecution && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pool is funded. Voting and execution are managed from the
                    Voting tab.
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}

        {viewDirectoryPools.map((pool) => {
          const targetAleo = (
            pool.targetAmountMicro / 1_000_000
          ).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          });
          const contributedMicro = pool.participants.reduce(
            (sum, participant) => sum + participant.contributedMicro,
            0,
          );
          const isTargetReached =
            pool.targetAmountMicro > 0 &&
            contributedMicro >= pool.targetAmountMicro;
          const isAwaitingExecution = !pool.isClosed && isTargetReached;
          const contributedAleo = (contributedMicro / 1_000_000).toLocaleString(
            undefined,
            {
              maximumFractionDigits: 2,
            },
          );
          const fillPct =
            pool.targetAmountMicro > 0
              ? Math.min(
                  100,
                  Math.round((contributedMicro * 100) / pool.targetAmountMicro),
                )
              : null;

          return (
            <Card
              key={`directory-${pool.invoiceHash}`}
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => openPoolDetails(pool.invoiceHash, "legacy")}
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {pool.poolName ?? "Untitled Pool"}
                    </p>
                    <span className="font-mono text-sm text-muted-foreground">
                      {pool.invoiceHash.slice(0, 14)}…
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      pool.isClosed
                        ? "text-green-600 border-green-300 text-xs"
                        : isAwaitingExecution
                          ? "text-amber-700 border-amber-300 text-xs"
                          : "text-blue-600 border-blue-300 text-xs"
                    }
                  >
                    {pool.isClosed ? (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Closed
                      </>
                    ) : isAwaitingExecution ? (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Funded
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3 w-3 mr-1" />
                        Open
                      </>
                    )}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-mono font-medium">
                      {targetAleo} ALEO
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Raised</span>
                    <span className="font-mono font-medium">
                      {contributedAleo} ALEO
                    </span>
                  </div>
                </div>

                {fillPct !== null && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Fill</span>
                      <span>{fillPct}%</span>
                    </div>
                    <Progress value={fillPct} className="h-1.5" />
                  </div>
                )}

                {!pool.isClosed && (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5"
                      disabled={isAwaitingExecution}
                      onClick={() => {
                        if (isAwaitingExecution) return;
                        setContributeInvoiceHash(pool.invoiceHash);
                        setContributePoolOwner(pool.owner);
                      }}
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                      {isAwaitingExecution
                        ? "Awaiting Pool Execution"
                        : "Contribute"}
                      {!isAwaitingExecution && (
                        <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                      )}
                    </Button>

                    {isAwaitingExecution && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Pool is funded. The pool owner must execute factoring
                        on-chain before claims unlock.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderOwnerlessPoolCards = () => {
    if (onChainPoolsLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`ownerless-skeleton-${i}`}>
              <CardContent className="pt-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (onChainPools.length === 0) {
      return (
        <Card className="py-10 text-center border-dashed">
          <CardContent className="space-y-2">
            <p className="font-medium">No ownerless pools on-chain yet</p>
            <p className="text-sm text-muted-foreground">
              Create one to make it publicly visible to all users.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {onChainPools.map((pool: OnChainPoolState) => {
          const raisedAleo = Number(pool.totalContributed) / 1_000_000;
          const status = getOwnerlessPoolStatus(pool);
          const canOpenDistributionFromCard =
            pool.isSettled && pool.isClosed && pool.proceeds === null;

          return (
            <Card key={`ownerless-${pool.meta.invoiceHash}`}>
              <CardContent
                className="pt-4 space-y-3 cursor-pointer"
                onClick={() =>
                  openPoolDetails(pool.meta.invoiceHash, "ownerless")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{pool.meta.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {pool.meta.invoiceHash.slice(0, 14)}…
                    </p>
                  </div>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate range</span>
                    <span className="font-mono">
                      {pool.meta.minAdvanceRate / 100}% -{" "}
                      {pool.meta.maxAdvanceRate / 100}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Raised</span>
                    <span className="font-mono">
                      {raisedAleo.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}{" "}
                      ALEO
                    </span>
                  </div>
                </div>

                {!pool.isClosed && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Open pool. Use the Voting tab when a business submits an
                    invoice.
                  </p>
                )}

                {canOpenDistributionFromCard && (
                  <div className="space-y-1.5">
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenOwnerlessDistribution(pool.meta.invoiceHash);
                      }}
                      disabled={status !== "idle"}
                    >
                      Open Distribution
                    </Button>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Permissionless — anyone can call this once debtor has paid.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderVotingCards = () => {
    if (onChainPoolsLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`vote-skeleton-${i}`}>
              <CardContent className="pt-4 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    const pendingPools = onChainPools.filter(
      (p) => !!p.pendingOffer && !p.pendingOffer.isExecuted && !p.isClosed,
    );

    if (pendingPools.length === 0) {
      return (
        <Card className="py-12 text-center border-dashed">
          <CardContent className="space-y-2">
            <p className="font-medium">No pools awaiting votes</p>
            <p className="text-sm text-muted-foreground">
              Pending offers will appear here for factor voting and execution.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pendingPools.map((pool) => {
          const stats = computePoolStats(pool, activeFactorCount);
          const voteProgressPct =
            stats.threshold > 0
              ? Math.min(
                  100,
                  Math.round((stats.voteCount / stats.threshold) * 100),
                )
              : 0;

          return (
            <Card
              key={`voting-${pool.meta.invoiceHash}`}
              className="border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/30"
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{pool.meta.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {pool.meta.invoiceHash.slice(0, 14)}…
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="secondary"
                      className="text-[10px] uppercase tracking-wide"
                    >
                      New
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"
                    >
                      Voting
                    </Badge>
                  </div>
                </div>

                <div className="rounded-md bg-slate-100/80 dark:bg-slate-900/30 border border-slate-200/80 dark:border-slate-800 px-2.5 py-2 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-700 dark:text-slate-200">
                    <span>Multisig votes</span>
                    <span>
                      {stats.voteCount} / {stats.threshold} needed
                    </span>
                  </div>
                  <Progress
                    value={voteProgressPct}
                    className="h-1 bg-slate-200 dark:bg-slate-800"
                  />
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      Advance Rate Range
                    </span>
                    <span className="font-mono font-medium">
                      {pool.meta.minAdvanceRate / 100}%-
                      {pool.meta.maxAdvanceRate / 100}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Total Raised</span>
                    <span className="font-mono font-medium">
                      {(
                        Number(pool.totalContributed) / 1_000_000
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      ALEO
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      Min contribution
                    </span>
                    <span className="font-mono text-xs">
                      {(
                        Number(pool.meta.minContribution) / 1_000_000
                      ).toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      ALEO
                    </span>
                  </div>
                </div>

                {!stats.isApproved ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOwnerlessVote(pool.meta.invoiceHash);
                    }}
                    disabled={status !== "idle" || activeRole !== "factor"}
                  >
                    <Vote className="h-3.5 w-3.5" />
                    Vote Approve
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecuteApprovedOwnerlessPool(pool);
                    }}
                    disabled={status !== "idle" || activeRole !== "factor"}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Execute Approved Pool
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const selectedDirectoryEntry = selectedPoolHash
    ? (localPoolEntries.find(
        (entry) => entry.invoiceHash === selectedPoolHash,
      ) ?? null)
    : null;
  const selectedParticipants =
    selectedDirectoryEntry?.participants
      ?.slice()
      .sort((a, b) => b.updatedAt - a.updatedAt) ?? [];
  const selectedLegacyPoolRecord =
    selectedPoolKind === "legacy" && selectedPoolHash
      ? (poolRecords.find(
          (record) =>
            getField(record.recordPlaintext, "invoice_hash") ===
            selectedPoolHash,
        ) ?? null)
      : null;
  const selectedLegacyMeta =
    selectedPoolKind === "legacy" && selectedPoolHash
      ? (poolMetas[selectedPoolHash] ?? null)
      : null;
  const selectedLegacyFillPct =
    selectedLegacyMeta && selectedLegacyMeta.targetAmount > 0n
      ? Math.min(
          100,
          Number((selectedLegacyMeta.contributed ?? 0n) * 100n) /
            Number(selectedLegacyMeta.targetAmount),
        )
      : null;
  const selectedOwnerlessPool =
    selectedPoolKind === "ownerless" && selectedPoolHash
      ? (onChainPools.find(
          (pool) => pool.meta.invoiceHash === selectedPoolHash,
        ) ?? null)
      : null;
  const selectedOwnerlessStats = selectedOwnerlessPool
    ? computePoolStats(selectedOwnerlessPool, activeFactorCount)
    : null;
  const selectedOwnerlessStatus = selectedOwnerlessPool
    ? getOwnerlessPoolStatus(selectedOwnerlessPool)
    : null;
  const canOpenSelectedOwnerlessDistribution =
    !!selectedOwnerlessPool &&
    selectedOwnerlessPool.isSettled &&
    selectedOwnerlessPool.isClosed &&
    selectedOwnerlessPool.proceeds === null;
  const selectedOwnerlessPercentText = (() => {
    if (!selectedOwnerlessPool) return "Loading";

    if (selectedOwnerlessStats?.isFullyDistributed) {
      return "100% complete";
    }

    if (selectedOwnerlessPool.pendingOffer?.isExecuted) {
      if (selectedOwnerlessPool.proceeds && selectedOwnerlessPool.proceeds > 0n) {
        const claimedPct = Number(
          (selectedOwnerlessPool.distributed * 10000n) /
            selectedOwnerlessPool.proceeds,
        ) / 100;
        return `${claimedPct.toFixed(1)}% claimed`;
      }
      return "0.0% claimed";
    }

    return `${(Number(selectedOwnerlessPool.totalContributed) / 1_000_000).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    })} ALEO raised`;
  })();
  const selectedPoolName =
    selectedPoolKind === "ownerless"
      ? (selectedOwnerlessPool?.meta.name ?? "Pool")
      : (selectedDirectoryEntry?.poolName ??
        (selectedLegacyPoolRecord
          ? getField(selectedLegacyPoolRecord.recordPlaintext, "owner")
          : "Pool"));

  const renderShareCards = () => {
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
    if (poolShareRecords.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent>
            <p className="font-medium">No pool shares</p>
            <p className="text-sm text-muted-foreground mt-1">
              Contribute to a pool to receive PoolShare records
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {poolShareRecords.map((record, idx) => {
          const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
          const contributedRaw = getField(
            record.recordPlaintext,
            "contributed",
          );
          const totalPoolRaw = getField(record.recordPlaintext, "total_pool");
          const contributed = BigInt(contributedRaw.replace(/u64$/, ""));
          const totalPool = BigInt(totalPoolRaw.replace(/u64$/, ""));
          const livePoolTotal =
            poolMetas[invoiceHash]?.contributed ?? totalPool;
          const shareBps =
            livePoolTotal > 0n ? (contributed * 10000n) / livePoolTotal : 0n;
          const shareId = record.commitment ?? invoiceHash;
          const isClaiming = claimingShareId === shareId;

          // Legacy pool check
          const isPoolClosed = poolMetas[invoiceHash]?.isClosed ?? false;

          // Ownerless pool check — find matching pool from onChainPools
          const ownerlessPool = onChainPools.find(
            (p) => p.meta.invoiceHash === invoiceHash,
          );
          const ownerlessReady =
            ownerlessPool !== undefined &&
            ownerlessPool.proceeds !== null &&
            ownerlessPool.proceeds > 0n;

          const canClaim = isPoolClosed || ownerlessReady;

          return (
            <Card
              key={invoiceHash || idx}
              className="hover:border-primary/50 transition-colors"
            >
              <CardContent className="pt-4 space-y-3">
                <span className="font-mono text-sm text-muted-foreground block">
                  {invoiceHash.slice(0, 14)}…
                </span>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contributed</span>
                    <span className="font-mono font-medium">
                      {microToAleo(contributedRaw).toLocaleString(undefined, {
                        maximumFractionDigits: 4,
                      })}{" "}
                      ALEO
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Share</span>
                    <span className="font-medium">
                      {(Number(shareBps) / 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
                {!canClaim && (
                  <p className="text-xs text-muted-foreground">
                    Claim unlocks once distribution is opened after debtor pays.
                  </p>
                )}
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleClaimProceeds(record)}
                  disabled={isClaiming || !canClaim}
                >
                  {isClaiming ? "Claiming…" : "Claim Proceeds"}
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
          <h1 className="text-2xl font-bold">Factor Pools</h1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2">
            Syndicate invoice factoring with other contributors
            <a
              href="/docs/factor/pools"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Info className="h-3 w-3" /> Learn more
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              refetchOnChainPools();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <PoolCreateDialog />
          <Button size="sm" asChild>
            <Link to="/dashboard">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Error state */}
      {isError && (
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

      <Tabs defaultValue="discover">
        <TabsList>
          <TabsTrigger value="discover">
            Discover Pools
            {!isLoading && totalOwnerlessPools > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({totalOwnerlessPools})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="voting">Voting</TabsTrigger>
          <TabsTrigger value="claims">
            Claims
            {!isLoading && poolShareRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({poolShareRecords.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Discover tab */}
        <TabsContent value="discover" className="mt-4">
          <div className="mb-4 space-y-2">
            <p className="text-sm font-medium">Ownerless Pools (On-Chain)</p>
            {renderOwnerlessPoolCards()}
          </div>

          {renderPoolCards("all")}
          <p className="mt-1 text-xs text-muted-foreground">
            Use the Create a Pool button above to start a new pool.
          </p>
        </TabsContent>

        {/* Voting tab */}
        <TabsContent value="voting" className="mt-4">
          {renderVotingCards()}
          <p className="mt-3 text-xs text-muted-foreground">
            Governance actions for ownerless pools live here. Marketplace now
            focuses on discovery and pool submission.
          </p>
        </TabsContent>

        {/* Claims tab */}
        <TabsContent value="claims" className="mt-4">
          {renderShareCards()}
          <p className="mt-3 text-xs text-muted-foreground">
            Claim pool proceeds after the pool is closed and the invoice is
            settled.
          </p>
        </TabsContent>
      </Tabs>

      <Dialog
        open={poolDetailOpen && !!selectedPoolHash}
        onOpenChange={(open) => {
          if (!open) closePoolDetails();
        }}
      >
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 pr-10">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Pool Details
                </DialogTitle>
                <DialogDescription>
                  Snapshot of funds, rates, participants, and related wallet
                  addresses.
                </DialogDescription>
              </div>
              <div className="flex flex-wrap justify-end gap-2 max-w-[70%]">
                <Badge
                  variant="secondary"
                  className="text-xs uppercase tracking-wide"
                >
                  {selectedPoolKind === "ownerless" ? "Ownerless" : "Legacy"}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    selectedPoolKind === "ownerless"
                      ? selectedOwnerlessStatus?.className ?? "text-xs"
                      : "text-xs"
                  }
                >
                  {selectedPoolKind === "ownerless"
                    ? (selectedOwnerlessStatus?.label ?? "Loading")
                    : selectedLegacyMeta?.isClosed
                      ? "Closed"
                      : selectedLegacyMeta
                        ? "Open"
                        : "Loading"}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {selectedPoolHash && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{selectedPoolName}</p>
                      <p className="font-mono text-xs text-muted-foreground break-all">
                        {selectedPoolHash}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {selectedDirectoryEntry?.participants.length ?? 0} joins
                    </Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        Current Funds
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold">
                        {selectedPoolKind === "ownerless"
                          ? `${(Number(selectedOwnerlessPool?.totalContributed ?? 0n) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })} ALEO`
                          : `${(Number(selectedLegacyMeta?.contributed ?? 0n) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })} ALEO`}
                      </p>
                    </div>

                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Percent</p>
                      <p className="mt-1 font-mono text-sm font-semibold">
                        {selectedPoolKind === "ownerless"
                          ? selectedOwnerlessPercentText
                          : `${selectedLegacyFillPct !== null ? selectedLegacyFillPct.toFixed(1) : "0.0"}% funded`}
                      </p>
                    </div>

                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        Addresses Involved
                      </p>
                      <p className="mt-1 text-sm font-medium">
                        {selectedPoolKind === "ownerless"
                          ? selectedOwnerlessPool?.pendingOffer
                            ? "Creditor + debtor"
                            : "Pending offer not submitted"
                          : selectedDirectoryEntry?.owner
                            ? "Owner + contributors"
                            : "Owner only"}
                      </p>
                    </div>

                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">
                        Joined Count
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold">
                        {selectedParticipants.length}
                      </p>
                    </div>
                  </div>

                  {selectedPoolKind === "ownerless" &&
                    selectedOwnerlessPool?.pendingOffer && (
                      <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase tracking-wide"
                          >
                            Pending Offer
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {selectedOwnerlessStats?.voteCount ?? 0} /{" "}
                            {selectedOwnerlessStats?.threshold ?? 0} votes
                          </Badge>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">
                              Creditor
                            </span>
                            <AddressDisplay
                              address={
                                selectedOwnerlessPool.pendingOffer
                                  .originalCreditor
                              }
                              chars={5}
                              showExplorer
                            />
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">
                              Debtor
                            </span>
                            <AddressDisplay
                              address={
                                selectedOwnerlessPool.pendingOffer.debtor
                              }
                              chars={5}
                              showExplorer
                            />
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">
                              Advance Rate
                            </span>
                            <span className="font-mono">
                              {(
                                selectedOwnerlessPool.pendingOffer.advanceRate /
                                100
                              ).toFixed(2)}
                              %
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-muted-foreground">
                              Advance Amount
                            </span>
                            <span className="font-mono">
                              {(
                                Number(
                                  selectedOwnerlessPool.pendingOffer
                                    .advanceAmount,
                                ) / 1_000_000
                              ).toLocaleString(undefined, {
                                maximumFractionDigits: 6,
                              })}{" "}
                              ALEO
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recent Joins</p>
                    {selectedParticipants.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedParticipants.map((participant) => (
                          <Badge
                            key={`${participant.address}-${participant.updatedAt}`}
                            variant="secondary"
                            className="font-mono text-xs"
                          >
                            {participant.address.slice(0, 8)}… ·{" "}
                            {(
                              participant.contributedMicro / 1_000_000
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 6,
                            })}{" "}
                            ALEO
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No local join history has been recorded yet for this
                        pool.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              <PoolTimeline
                pool={selectedOwnerlessPool}
                activeFactorCount={activeFactorCount}
                layout="horizontal"
              />

              {canOpenSelectedOwnerlessDistribution && (
                <Card className="border-dashed">
                  <CardContent className="pt-4 space-y-2">
                    <Button
                      className="w-full"
                      onClick={() =>
                        handleOpenOwnerlessDistribution(
                          selectedOwnerlessPool.meta.invoiceHash,
                        )
                      }
                      disabled={status !== "idle"}
                    >
                      Open Distribution
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Permissionless — anyone can call this once debtor has paid.
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="border-dashed">
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Owner</span>
                    <span className="font-mono text-right">
                      {selectedPoolKind === "ownerless"
                        ? "Ownerless pool"
                        : (selectedLegacyMeta?.owner ?? "Unknown")}
                    </span>
                  </div>
                  {selectedPoolKind === "legacy" && (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted-foreground">
                          Target Amount
                        </span>
                        <span className="font-mono text-right">
                          {(
                            Number(selectedLegacyMeta?.targetAmount ?? 0n) /
                            1_000_000
                          ).toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })}{" "}
                          ALEO
                        </span>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-muted-foreground">
                          Funding State
                        </span>
                        <span className="font-medium text-right">
                          {selectedLegacyMeta?.isClosed ? "Closed" : "Open"}
                        </span>
                      </div>
                    </>
                  )}
                  {selectedPoolKind === "ownerless" &&
                    selectedOwnerlessPool && (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-muted-foreground">
                            Advance Range
                          </span>
                          <span className="font-mono text-right">
                            {selectedOwnerlessPool.meta.minAdvanceRate / 100}% -{" "}
                            {selectedOwnerlessPool.meta.maxAdvanceRate / 100}%
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-muted-foreground">
                            Minimum Contribution
                          </span>
                          <span className="font-mono text-right">
                            {(
                              Number(
                                selectedOwnerlessPool.meta.minContribution,
                              ) / 1_000_000
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 6,
                            })}{" "}
                            ALEO
                          </span>
                        </div>
                      </>
                    )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={ownerlessContributeOpen}
        onOpenChange={(open) => {
          setOwnerlessContributeOpen(open);
          if (!open) {
            setOwnerlessContributePool(null);
            setOwnerlessContributeAmount("");
            setPublicBalance(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Contribute to Pool
            </DialogTitle>
            <DialogDescription>
              Credits go to protocol escrow and you receive a PoolShare record.
            </DialogDescription>
          </DialogHeader>

          {ownerlessContributePool && (
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pool</span>
                  <span className="font-medium">
                    {ownerlessContributePool.meta.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Raised</span>
                  <span className="font-mono">
                    {(
                      Number(ownerlessContributePool.totalContributed) /
                      1_000_000
                    ).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}{" "}
                    ALEO
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Min contribution
                  </span>
                  <span className="font-mono">
                    {(
                      Number(ownerlessContributePool.meta.minContribution) /
                      1_000_000
                    ).toLocaleString(undefined, {
                      maximumFractionDigits: 6,
                    })}{" "}
                    ALEO
                  </span>
                </div>
                {publicBalance !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Your public balance
                    </span>
                    <span className="font-mono">
                      {(Number(publicBalance) / 1_000_000).toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 6,
                        },
                      )}{" "}
                      ALEO
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Contribution Amount (ALEO)</Label>
                <Input
                  type="number"
                  min={
                    Number(ownerlessContributePool.meta.minContribution) / 1e6
                  }
                  step="0.000001"
                  value={ownerlessContributeAmount}
                  onChange={(e) => setOwnerlessContributeAmount(e.target.value)}
                  placeholder="e.g. 25"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOwnerlessContributeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOwnerlessContribute}
              disabled={status !== "idle" || !ownerlessContributeAmount}
            >
              {status !== "idle" ? "Contributing..." : "Contribute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
