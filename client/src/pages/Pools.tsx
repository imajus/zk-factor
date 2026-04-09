import { useState, useEffect, useRef } from "react";
import {
  RefreshCw,
  AlertCircle,
  Plus,
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

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AddressDisplay } from "@/components/ui/address-display";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
  buildClaimPoolProceedsInputs,
} from "@/lib/aleo-factors";
import {
  buildCreateOwnerlessPoolInputs,
  buildPoolVoteInputs,
  buildExecuteApprovedPoolInputs,
  computePoolStats,
  encodePoolName,
  fetchActiveFactorCount,
  fetchAllPools,
  type OnChainPoolState,
} from "@/lib/pool-chain";
import { PoolTimeline } from "@/components/pools/PoolTimeline";

interface PoolCreateDialogProps {
  onOptimisticCreate?: (pool: OnChainPoolState) => void;
  onOptimisticRemove?: (invoiceHash: string) => void;
}

// Dialog for creating a new pool
function PoolCreateDialog({
  onOptimisticCreate,
  onOptimisticRemove,
}: PoolCreateDialogProps) {
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
  const optimisticInvoiceHashRef = useRef<string | null>(null);

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
      optimisticInvoiceHashRef.current = null;
      reset();
      return;
    }

    if (status === "failed") {
      toast.error(txError || "Failed to create pool.", { id: "create-pool" });
      if (optimisticInvoiceHashRef.current) {
        onOptimisticRemove?.(optimisticInvoiceHashRef.current);
      }
      setCreating(false);
      pendingPoolCreateRef.current = false;
      optimisticInvoiceHashRef.current = null;
      reset();
    }
  }, [status, txError, queryClient, reset, onOptimisticRemove]);

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
    if (!Number.isFinite(minContrib) || minContrib <= 0) {
      toast.error("Minimum contribution must be greater than 0 ALEO.");
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
      optimisticInvoiceHashRef.current = poolId;
      onOptimisticCreate?.({
        meta: {
          invoiceHash: poolId,
          nameU128: encodePoolName(trimmedName),
          name: trimmedName,
          minAdvanceRate: minRateBps,
          maxAdvanceRate: maxRateBps,
          minContribution: minContribMicro,
          createdAt: Math.floor(Date.now() / 1000),
        },
        totalContributed: 0n,
        isClosed: false,
        isSettled: false,
        voteCount: 0,
        pendingOffer: null,
        proceeds: null,
        distributed: 0n,
      });
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
      if (optimisticInvoiceHashRef.current) {
        onOptimisticRemove?.(optimisticInvoiceHashRef.current);
      }
      toast.error(
        err instanceof Error ? err.message : "Failed to create pool.",
        { id: "create-pool" },
      );
      setCreating(false);
      pendingPoolCreateRef.current = false;
      optimisticInvoiceHashRef.current = null;
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
            Create a pool that accepts invoices at specific advance rates. Any
            business can submit an invoice if their requested advance rate falls
            within the pool's range.
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
              min="0.000001"
              step="0.000001"
              value={poolMinContribAleo}
              onChange={(e) => setPoolMinContribAleo(e.target.value)}
              placeholder="1"
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

export default function Pools() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { isConnected, requestRecords, address, activeRole } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();

  const [claimingShareId, setClaimingShareId] = useState<string | null>(null);
  const [pendingExecutionHash, setPendingExecutionHash] = useState<
    string | null
  >(null);
  const [votedPoolHashes, setVotedPoolHashes] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingVoteInvoiceHash, setPendingVoteInvoiceHash] = useState<
    string | null
  >(null);

  const [optimisticPools, setOptimisticPools] = useState<OnChainPoolState[]>(
    [],
  );

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

  useEffect(() => {
    if (!address) {
      setVotedPoolHashes(new Set());
      return;
    }

    const storageKey = `voted-pools:${PROGRAM_ID}:${address}`;
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      setVotedPoolHashes(new Set(parsed));
    } catch {
      setVotedPoolHashes(new Set());
    }
  }, [address]);

  useEffect(() => {
    if (!address) return;
    const storageKey = `voted-pools:${PROGRAM_ID}:${address}`;
    localStorage.setItem(
      storageKey,
      JSON.stringify(Array.from(votedPoolHashes)),
    );
  }, [address, votedPoolHashes]);

  useEffect(() => {
    if (!optimisticPools.length || !onChainPools.length) return;

    const onChainHashes = new Set(onChainPools.map((p) => p.meta.invoiceHash));
    setOptimisticPools((prev) => {
      const next = prev.filter((p) => !onChainHashes.has(p.meta.invoiceHash));
      return next.length === prev.length ? prev : next;
    });
  }, [onChainPools, optimisticPools.length]);

  const visiblePools = (() => {
    if (!optimisticPools.length) return onChainPools;

    const onChainHashes = new Set(onChainPools.map((p) => p.meta.invoiceHash));
    const optimisticOnly = optimisticPools.filter(
      (p) => !onChainHashes.has(p.meta.invoiceHash),
    );
    return [...optimisticOnly, ...onChainPools];
  })();

  const getPoolStatus = (pool: OnChainPoolState) => {
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

  const totalPools = visiblePools.length;
  const poolShareRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "PoolShare" && !r.spent,
  );

  // Toast feedback
  useEffect(() => {
    if (status === "submitting")
      toast.loading("Generating proof…", { id: "pool-op" });
    else if (status === "pending")
      toast.loading("Broadcasting…", { id: "pool-op" });
    else if (status === "accepted") {
      if (pendingVoteInvoiceHash) {
        setVotedPoolHashes((prev) => {
          const next = new Set(prev);
          next.add(pendingVoteInvoiceHash);
          return next;
        });
        setPendingVoteInvoiceHash(null);
      }

      toast.success("Transaction confirmed!", { id: "pool-op" });
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
      queryClient.invalidateQueries({ queryKey: ["all_pools"] });
      setClaimingShareId(null);
      setPendingExecutionHash(null);
      reset();
    } else if (status === "failed") {
      setPendingVoteInvoiceHash(null);
      toast.error(txError || "Transaction failed", { id: "pool-op" });
      setClaimingShareId(null);
      setPendingExecutionHash(null);
      reset();
    }
  }, [status, txError, queryClient, reset, pendingVoteInvoiceHash]);

  useEffect(() => {
    if (status !== "pending" || !pendingExecutionHash) return;

    const pool = onChainPools.find(
      (p) => p.meta.invoiceHash === pendingExecutionHash,
    );

    const complete = pool?.pendingOffer?.isExecuted || pool?.isClosed;

    if (!complete) return;

    toast.success("Pool execution confirmed.", { id: "pool-op" });
    setPendingExecutionHash(null);
    queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
    queryClient.invalidateQueries({ queryKey: ["all_pools"] });
    reset();
  }, [status, pendingExecutionHash, onChainPools, queryClient, reset]);

  const handleVote = async (invoiceHash: string) => {
    if (
      votedPoolHashes.has(invoiceHash) ||
      pendingVoteInvoiceHash === invoiceHash
    ) {
      return;
    }

    // Optimistic UI: once user submits vote, show Voted immediately.
    setVotedPoolHashes((prev) => {
      const next = new Set(prev);
      next.add(invoiceHash);
      return next;
    });
    setPendingVoteInvoiceHash(invoiceHash);
    await execute({
      program: PROGRAM_ID,
      function: "pool_vote",
      inputs: buildPoolVoteInputs(invoiceHash),
      fee: 50_000,
      privateFee: false,
    });
  };

  const handleExecuteApprovedPool = async (pool: OnChainPoolState) => {
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

  const renderPoolCards = () => {
    if (onChainPoolsLoading && visiblePools.length === 0) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={`pool-skeleton-${i}`}>
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

    if (visiblePools.length === 0) {
      return (
        <Card className="py-10 text-center border-dashed">
          <CardContent className="space-y-2">
            <p className="font-medium">No pools on-chain yet</p>
            <p className="text-sm text-muted-foreground">
              Create one to make it publicly visible to all users.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiblePools.map((pool: OnChainPoolState) => {
          const raisedAleo = Number(pool.totalContributed) / 1_000_000;
          const poolStatus = getPoolStatus(pool);

          return (
            <Card
              key={`pool-${pool.meta.invoiceHash}`}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/pools/${pool.meta.invoiceHash.replace(/field$/, "")}`)}
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{pool.meta.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {pool.meta.invoiceHash.slice(0, 14)}…
                    </p>
                  </div>
                  <Badge variant="outline" className={poolStatus.className}>
                    {poolStatus.label}
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
          const offer = pool.pendingOffer!;
          const hasVoted =
            votedPoolHashes.has(pool.meta.invoiceHash) ||
            pendingVoteInvoiceHash === pool.meta.invoiceHash;
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

                <div className="rounded-md border bg-card/60 px-2.5 py-2 text-xs space-y-1.5">
                  <div className="flex justify-between gap-2 items-start">
                    <span className="text-muted-foreground">Seller</span>
                    <AddressDisplay
                      address={offer.originalCreditor}
                      chars={5}
                      showExplorer
                    />
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      Invoice Amount
                    </span>
                    <span className="font-mono">
                      {(Number(offer.amount) / 1_000_000).toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 6,
                        },
                      )}{" "}
                      ALEO
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      Requested Rate
                    </span>
                    <span className="font-mono">
                      {(offer.advanceRate / 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">
                      Advance Payout
                    </span>
                    <span className="font-mono">
                      {(Number(offer.advanceAmount) / 1_000_000).toLocaleString(
                        undefined,
                        {
                          maximumFractionDigits: 6,
                        },
                      )}{" "}
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
                      handleVote(pool.meta.invoiceHash);
                    }}
                    disabled={
                      status !== "idle" || activeRole !== "factor" || hasVoted
                    }
                  >
                    <Vote className="h-3.5 w-3.5" />
                    {hasVoted ? "Voted" : "Vote Approve"}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExecuteApprovedPool(pool);
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

  const poolByHash = new Map(
    visiblePools.map((pool) => [pool.meta.invoiceHash, pool]),
  );

  const claimableShareCount = poolShareRecords.filter((record) => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    const pool = onChainPools.find((p) => p.meta.invoiceHash === invoiceHash);
    return pool !== undefined && pool.proceeds !== null && pool.proceeds > 0n;
  }).length;

  const pendingVotingCount = onChainPools.filter(
    (pool) =>
      !!pool.pendingOffer && !pool.pendingOffer.isExecuted && !pool.isClosed,
  ).length;

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

    const claimableShares = poolShareRecords.filter((record) => {
      const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
      const pool = poolByHash.get(invoiceHash);
      return pool !== undefined && pool.proceeds !== null && pool.proceeds > 0n;
    });

    if (claimableShares.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent>
            <p className="font-medium">No claimable shares yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Claim cards appear once distribution is opened after debtor pays.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {claimableShares.map((record, idx) => {
          const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
          const contributedRaw = getField(
            record.recordPlaintext,
            "contributed",
          );
          const totalPoolRaw = getField(record.recordPlaintext, "total_pool");
          const contributed = BigInt(contributedRaw.replace(/u64$/, ""));
          const totalPool = BigInt(totalPoolRaw.replace(/u64$/, ""));
          const pool = poolByHash.get(invoiceHash);
          const livePoolTotal = pool?.totalContributed ?? totalPool;
          const shareBps =
            livePoolTotal > 0n ? (contributed * 10000n) / livePoolTotal : 0n;
          const shareId = record.commitment ?? invoiceHash;
          const isClaiming = claimingShareId === shareId;

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
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleClaimProceeds(record)}
                  disabled={isClaiming}
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
          <PoolCreateDialog
            onOptimisticCreate={(pool) => {
              setOptimisticPools((prev) => {
                if (
                  prev.some((p) => p.meta.invoiceHash === pool.meta.invoiceHash)
                ) {
                  return prev;
                }
                return [pool, ...prev];
              });
            }}
            onOptimisticRemove={(invoiceHash) => {
              setOptimisticPools((prev) =>
                prev.filter((pool) => pool.meta.invoiceHash !== invoiceHash),
              );
            }}
          />
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
            {!isLoading && totalPools > 0 && (
              <span className="ml-1.5 text-xs opacity-70">({totalPools})</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="voting">
            Voting
            {!onChainPoolsLoading && pendingVotingCount > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({pendingVotingCount})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="claims">
            Claims
            {!isLoading && claimableShareCount > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({claimableShareCount})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Discover tab */}
        <TabsContent value="discover" className="mt-4">
          {renderPoolCards()}
          <p className="mt-1 text-xs text-muted-foreground">
            Use the Create a Pool button above to start a new pool.
          </p>
        </TabsContent>

        {/* Voting tab */}
        <TabsContent value="voting" className="mt-4">
          {renderVotingCards()}
          <p className="mt-3 text-xs text-muted-foreground">
            Governance actions live here. Factors vote to approve pending offers
            before pool execution.
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
    </div>
  );
}
