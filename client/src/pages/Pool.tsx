import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Layers,
  RefreshCw,
  TrendingUp,
  Vote,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AddressDisplay } from "@/components/ui/address-display";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { toast } from "sonner";
import { PROGRAM_ID, PROGRAM_ADDRESS, USDCX_PROGRAM_ID } from "@/lib/config";
import {
  computePoolStats,
  computePoolPayout,
  fetchActiveFactorCount,
  fetchAllPools,
  getPoolCurrentFunds,
  buildPoolContributeInputs,
  buildPoolVoteInputs,
  buildPoolVoteRejectInputs,
  buildFinalizeRejectedPoolInputs,
  buildExecuteApprovedPoolInputs,
  buildClaimPoolProceedsInputs,
  fetchPublicTokenBalance,
} from "@/lib/pool-chain";
import { type AleoRecord, getField } from "@/lib/aleo-records";
import { fetchPoolContributions } from "@/lib/aleo-factors";
import { PoolTimeline } from "@/components/pools/PoolTimeline";

function formatMicro(value: bigint): string {
  return (Number(value) / 1_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

function formatCurrencyAmount(
  amount: bigint,
  currency: "ALEO" | "USDCx",
): string {
  return `${formatMicro(amount)} ${currency}`;
}

export default function Pool() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { poolId } = useParams<{ poolId: string }>();
  const { activeRole, address, isConnected, requestRecords } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();

  // Contribute dialog state
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeAmount, setContributeAmount] = useState("");
  const [publicBalance, setPublicBalance] = useState<bigint | null>(null);

  // Vote tracking (persisted per-address in localStorage)
  const [votedPoolHashes, setVotedPoolHashes] = useState<Set<string>>(
    () => new Set(),
  );
  const [pendingVoteKey, setPendingVoteKey] = useState<string | null>(null);

  const { data: activeFactorCount = 1 } = useQuery({
    queryKey: ["active_factor_count"],
    queryFn: fetchActiveFactorCount,
    staleTime: 60_000,
  });

  const {
    data: pools = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["all_pools"],
    queryFn: fetchAllPools,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const pool = useMemo(
    () =>
      pools.find((candidate) => candidate.meta.invoiceHash === poolId) ?? null,
    [pools, poolId],
  );

  const stats = pool ? computePoolStats(pool, activeFactorCount) : null;
  const currentFunds = pool ? getPoolCurrentFunds(pool) : 0n;
  const advancePaid = pool?.pendingOffer?.isExecuted
    ? pool.pendingOffer.advanceAmount
    : 0n;
  const canOpenDistribution =
    !!pool && pool.isSettled && pool.isClosed && pool.proceeds === null;

  const { data: records } = useQuery({
    queryKey: ["records", PROGRAM_ID],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected && !!poolId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const myPoolShare = ((records as AleoRecord[]) ?? []).find(
    (r) =>
      r.recordName === "PoolShare" &&
      !r.spent &&
      getField(r.recordPlaintext, "invoice_hash") === poolId,
  );

  const myPayout =
    myPoolShare && pool?.proceeds && pool.totalContributed > 0n
      ? computePoolPayout(
          BigInt(
            getField(myPoolShare.recordPlaintext, "contributed").replace(
              /u64$/,
              "",
            ),
          ),
          pool.totalContributed,
          pool.proceeds,
        )
      : 0n;

  // Load vote tracking from localStorage
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

  // Toast feedback + cleanup on tx status changes
  useEffect(() => {
    if (status === "submitting")
      toast.loading("Generating proof…", { id: "pool-op" });
    else if (status === "pending")
      toast.loading("Broadcasting…", { id: "pool-op" });
    else if (status === "accepted") {
      if (pendingVoteKey) {
        setVotedPoolHashes((prev) => {
          const next = new Set(prev);
          next.add(pendingVoteKey);
          return next;
        });
        setPendingVoteKey(null);
      }
      toast.success("Transaction confirmed!", { id: "pool-op" });
      queryClient.invalidateQueries({ queryKey: ["all_pools"] });
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
      setContributeOpen(false);
      setContributeAmount("");
      setPublicBalance(null);
      reset();
    } else if (status === "failed") {
      setPendingVoteKey(null);
      toast.error(txError || "Transaction failed", { id: "pool-op" });
      setContributeOpen(false);
      setContributeAmount("");
      setPublicBalance(null);
      reset();
    }
  }, [status, txError, queryClient, reset, pendingVoteKey]);

  const buildVoteKey = (nonce: string | undefined): string =>
    `${poolId}:${nonce ?? "no-offer"}`;

  const openContribute = async () => {
    if (!pool) return;
    setContributeAmount("");
    setContributeOpen(true);
    // Only fetch public balance for USDCx pools (token path still uses public balance).
    // ALEO pools now use private credits records fetched at contribution time.
    if (address && pool.meta.currency === "USDCx") {
      const balance = await fetchPublicTokenBalance(address);
      setPublicBalance(balance);
    }
  };

  const handleContribute = async () => {
    if (!pool || !address) return;
    const amountFloat = parseFloat(contributeAmount);
    if (Number.isNaN(amountFloat) || amountFloat <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    const contribution = BigInt(Math.round(amountFloat * 1_000_000));
    const minContrib = pool.meta.minContribution;
    if (contribution < minContrib) {
      toast.error(
        `Minimum contribution is ${formatCurrencyAmount(minContrib, pool.meta.currency)}.`,
      );
      return;
    }
    if (!PROGRAM_ADDRESS) {
      toast.error("PROGRAM_ADDRESS is not set.");
      return;
    }

    if (pool.meta.currency === "USDCx") {
      // USDCx pool: public allowance path (pool_contribute_token is out of scope for private records).
      if (publicBalance !== null && contribution > publicBalance) {
        toast.error(
          `Insufficient public ${pool.meta.currency} balance (${formatCurrencyAmount(publicBalance, pool.meta.currency)}).`,
        );
        return;
      }
      await execute({
        program: USDCX_PROGRAM_ID,
        function: "approve_public",
        inputs: [PROGRAM_ID, `${contribution}u128`],
        fee: 50_000,
        privateFee: false,
      });
      await execute({
        program: PROGRAM_ID,
        function: "pool_contribute_token",
        inputs: [
          pool.meta.invoiceHash,
          PROGRAM_ADDRESS,
          `${contribution}u64`,
          `${pool.totalContributed}u64`,
        ],
        fee: 80_000,
        privateFee: false,
      });
      return;
    }

    // ALEO pool: private credits record path.
    let creditsRecord: AleoRecord | undefined;
    try {
      const creditsRecords = (await requestRecords(
        "credits.aleo",
        true,
      )) as AleoRecord[];
      const contributionMicro = Number(contribution);
      creditsRecord = creditsRecords
        .filter((r) => !r.spent)
        .find(
          (r) =>
            parseInt(
              getField(r.recordPlaintext, "microcredits").replace(/u64$/, ""),
              10,
            ) >= contributionMicro,
        );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch credits records",
      );
      return;
    }
    if (!creditsRecord) {
      toast.error(
        "No credits record with sufficient balance found. Ensure you hold an unspent credits record.",
      );
      return;
    }
    await execute({
      program: PROGRAM_ID,
      function: "pool_contribute",
      inputs: buildPoolContributeInputs(
        creditsRecord.recordPlaintext,
        pool.meta.invoiceHash,
        PROGRAM_ADDRESS,
        contribution,
        pool.totalContributed,
      ),
      fee: 80_000,
      privateFee: false,
    });
  };

  const handleVoteApprove = async () => {
    if (!pool?.pendingOffer) return;
    const voteKey = buildVoteKey(pool.pendingOffer.nonce);
    if (votedPoolHashes.has(voteKey) || pendingVoteKey === voteKey) return;
    setVotedPoolHashes((prev) => {
      const next = new Set(prev);
      next.add(voteKey);
      return next;
    });
    setPendingVoteKey(voteKey);
    await execute({
      program: PROGRAM_ID,
      function: "pool_vote",
      inputs: buildPoolVoteInputs(pool.meta.invoiceHash),
      fee: 50_000,
      privateFee: false,
    });
  };

  const handleVoteReject = async () => {
    if (!pool?.pendingOffer) return;
    const voteKey = buildVoteKey(pool.pendingOffer.nonce);
    if (votedPoolHashes.has(voteKey) || pendingVoteKey === voteKey) return;
    setVotedPoolHashes((prev) => {
      const next = new Set(prev);
      next.add(voteKey);
      return next;
    });
    setPendingVoteKey(voteKey);
    await execute({
      program: PROGRAM_ID,
      function: "pool_vote_reject",
      inputs: buildPoolVoteRejectInputs(pool.meta.invoiceHash),
      fee: 50_000,
      privateFee: false,
    });
  };

  const handleExecuteApprovedPool = async () => {
    if (!pool?.pendingOffer || pool.pendingOffer.isExecuted) return;
    const executeFunction =
      pool.meta.currency === "USDCx"
        ? "execute_approved_pool_token"
        : "execute_approved_pool";
    await execute({
      program: PROGRAM_ID,
      function: executeFunction,
      inputs: buildExecuteApprovedPoolInputs(
        pool.meta.invoiceHash,
        pool.pendingOffer.originalCreditor,
        pool.pendingOffer.debtor,
        pool.pendingOffer.advanceAmount,
        pool.pendingOffer.amount,
        pool.pendingOffer.dueDate,
      ),
      fee: 120_000,
      privateFee: false,
    });
  };

  const handleFinalizeRejectedPool = async () => {
    if (!pool) return;
    await execute({
      program: PROGRAM_ID,
      function: "finalize_rejected_pool",
      inputs: buildFinalizeRejectedPoolInputs(pool.meta.invoiceHash),
      fee: 50_000,
      privateFee: false,
    });
  };

  const handleOpenDistribution = async () => {
    if (!pool) return;
    await execute({
      program: PROGRAM_ID,
      function: "pool_open_distribution",
      inputs: [pool.meta.invoiceHash],
      fee: 80_000,
      privateFee: false,
    });
  };

  const handleClaimProceeds = async () => {
    if (!myPoolShare || !pool?.proceeds) return;
    const onChainTotal = await fetchPoolContributions(poolId!);
    if (!onChainTotal) {
      toast.error("Could not read pool totals from chain.");
      return;
    }
    const contributed = BigInt(
      getField(myPoolShare.recordPlaintext, "contributed").replace(/u64$/, ""),
    );
    const payout = computePoolPayout(contributed, onChainTotal, pool.proceeds);
    if (payout <= 0n) {
      toast.error("No claimable proceeds available.");
      return;
    }
    const claimFunction =
      pool.meta.currency === "USDCx"
        ? "claim_pool_proceeds_token"
        : "claim_pool_proceeds";
    await execute({
      program: PROGRAM_ID,
      function: claimFunction,
      inputs: buildClaimPoolProceedsInputs(myPoolShare.recordPlaintext, payout),
      fee: 80_000,
      privateFee: false,
    });
  };

  if (!poolId) {
    return (
      <div className="container py-8">
        <Card className="border-destructive/50">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">Missing pool id in URL.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Pools
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          {pool && !pool.isClosed && (
            <Button
              size="sm"
              onClick={openContribute}
              disabled={status !== "idle"}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Contribute
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Loading pool details...
            </p>
          </CardContent>
        </Card>
      )}

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">
              Failed to load this pool.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && !pool && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Pool not found for id <span className="font-mono">{poolId}</span>.
            </p>
          </CardContent>
        </Card>
      )}

      {pool && stats && (
        <div className="md:flex md:gap-6 md:items-start">
          {/* Lifecycle sidebar */}
          <div className="mb-4 md:mb-0 md:w-64 lg:w-72 shrink-0">
            <PoolTimeline pool={pool} activeFactorCount={activeFactorCount} />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-5 w-5 text-primary" />
                    {pool.meta.name}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground break-all">
                    {pool.meta.invoiceHash}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 text-sm">
                    <div className="rounded-lg border bg-muted/20 p-3 min-h-[76px] flex flex-col justify-between">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Rate Range
                      </p>
                      <p className="font-mono text-sm font-semibold leading-none">
                        {pool.meta.minAdvanceRate / 100}% -{" "}
                        {pool.meta.maxAdvanceRate / 100}%
                      </p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3 min-h-[76px] flex flex-col justify-between">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Current Funds
                      </p>
                      <p className="font-mono text-sm font-semibold leading-none">
                        {formatMicro(currentFunds)} {pool.meta.currency}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3 min-h-[76px] flex flex-col justify-between">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Advance Paid
                      </p>
                      <p className="font-mono text-sm font-semibold leading-none">
                        {formatMicro(advancePaid)} {pool.meta.currency}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3 min-h-[76px] flex flex-col justify-between">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Min Contribution
                      </p>
                      <p className="font-mono text-sm font-semibold leading-none">
                        {formatMicro(pool.meta.minContribution)}{" "}
                        {pool.meta.currency}
                      </p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3 min-h-[76px] flex flex-col justify-between">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Voting
                      </p>
                      <p className="font-mono text-sm font-semibold leading-none">
                        {stats.totalVotes}/{stats.requiredVotes}
                      </p>
                    </div>
                  </div>

                  {currentFunds <= 0n && (
                    <div className="rounded-md border border-amber-300/60 bg-amber-950/5 p-3 text-xs text-amber-700 dark:text-amber-400 space-y-1">
                      <p className="font-medium">Pool has no funds yet</p>
                      <p>
                        Invoice submissions will be rejected until contributors
                        add liquidity to this pool.
                      </p>
                    </div>
                  )}

                  {pool.pendingOffer && (
                    <div className="rounded-md border bg-muted/20 p-3 space-y-4 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Pending Offer</Badge>
                        {stats.approveCount > 0 && (
                          <Badge variant="outline">
                            Approved: {stats.approveCount}
                          </Badge>
                        )}
                        {stats.rejectCount > 0 && (
                          <Badge variant="outline">
                            Rejected: {stats.rejectCount}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            stats.allVotesCast
                              ? stats.isApproved
                                ? "text-emerald-700 border-emerald-300"
                                : "text-red-700 border-red-300"
                              : "text-amber-700 border-amber-300"
                          }
                        >
                          {stats.allVotesCast
                            ? stats.isApproved
                              ? "Approved"
                              : "Rejected"
                            : "Pending"}
                        </Badge>
                      </div>

                      <Progress
                        value={
                          stats.requiredVotes > 0
                            ? Math.min(
                                100,
                                (stats.totalVotes / stats.requiredVotes) * 100,
                              )
                            : 0
                        }
                        className="h-1.5"
                      />

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">
                            Creditor
                          </span>
                          <AddressDisplay
                            address={pool.pendingOffer.originalCreditor}
                            chars={5}
                            showExplorer
                          />
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">Debtor</span>
                          <AddressDisplay
                            address={pool.pendingOffer.debtor}
                            chars={5}
                            showExplorer
                          />
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">
                            Invoice Amount
                          </span>
                          <span className="font-mono">
                            {formatMicro(pool.pendingOffer.amount)}{" "}
                            {pool.meta.currency}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-muted-foreground">
                            Advance Rate
                          </span>
                          <span className="font-mono">
                            {(pool.pendingOffer.advanceRate / 100).toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {/* Vote buttons — factor only, while votes are still being cast */}
                      {activeRole === "factor" &&
                        !pool.pendingOffer.isExecuted &&
                        !pool.isClosed &&
                        !stats.allVotesCast &&
                        (() => {
                          const voteKey = buildVoteKey(
                            pool.pendingOffer!.nonce,
                          );
                          const hasVoted =
                            votedPoolHashes.has(voteKey) ||
                            pendingVoteKey === voteKey;
                          return (
                            <div className="flex gap-2 pt-1">
                              <Button
                                className="flex-1"
                                onClick={handleVoteApprove}
                                disabled={status !== "idle" || hasVoted}
                              >
                                <Vote className="h-4 w-4 mr-1" />
                                {hasVoted ? "Voted" : "Approve"}
                              </Button>
                              <Button
                                className="flex-1"
                                variant="destructive"
                                onClick={handleVoteReject}
                                disabled={status !== "idle" || hasVoted}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          );
                        })()}

                      {/* Execute approved pool — after all votes cast and approved */}
                      {activeRole === "factor" &&
                        !pool.pendingOffer.isExecuted &&
                        !pool.isClosed &&
                        stats.allVotesCast &&
                        stats.isApproved && (
                          <Button
                            className="w-full"
                            onClick={handleExecuteApprovedPool}
                            disabled={status !== "idle"}
                          >
                            <Zap className="h-4 w-4 mr-1" />
                            Execute Approved Pool
                          </Button>
                        )}

                      {/* Finalize rejected pool — after all votes cast and rejected */}
                      {activeRole === "factor" &&
                        !pool.pendingOffer.isExecuted &&
                        !pool.isClosed &&
                        stats.allVotesCast &&
                        !stats.isApproved && (
                          <Button
                            className="w-full"
                            variant="destructive"
                            onClick={handleFinalizeRejectedPool}
                            disabled={status !== "idle"}
                          >
                            Finalize Rejected Offer
                          </Button>
                        )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            {(canOpenDistribution || myPayout > 0n) && (
              <div className="flex flex-wrap gap-2 justify-end">
                {/* Open Distribution — permissionless once debtor has paid */}
                {canOpenDistribution && (
                  <div className="flex flex-col gap-1 items-end">
                    <Button
                      onClick={handleOpenDistribution}
                      disabled={status !== "idle"}
                    >
                      Open Distribution
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Permissionless — anyone can call this once debtor has
                      paid.
                    </p>
                  </div>
                )}

                {/* Claim proceeds — shown when this user has a PoolShare and proceeds are open */}
                {myPayout > 0n && (
                  <Button
                    onClick={handleClaimProceeds}
                    disabled={status !== "idle"}
                  >
                    Claim Proceeds ({formatMicro(myPayout)} {pool.meta.currency}
                    )
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contribute dialog */}
      <Dialog
        open={contributeOpen}
        onOpenChange={(open) => {
          setContributeOpen(open);
          if (!open) {
            setContributeAmount("");
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
              Contributions go to protocol escrow in the pool's currency, and
              you receive a PoolShare record.
            </DialogDescription>
          </DialogHeader>

          {pool && (
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pool</span>
                  <span className="font-medium">{pool.meta.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Raised</span>
                  <span className="font-mono">
                    {formatCurrencyAmount(
                      pool.totalContributed,
                      pool.meta.currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Min contribution
                  </span>
                  <span className="font-mono">
                    {formatCurrencyAmount(
                      pool.meta.minContribution,
                      pool.meta.currency,
                    )}
                  </span>
                </div>
                {publicBalance !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Your public balance
                    </span>
                    <span className="font-mono">
                      {formatCurrencyAmount(publicBalance, pool.meta.currency)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Contribution Amount ({pool.meta.currency})</Label>
                <Input
                  type="number"
                  min={Number(pool.meta.minContribution) / 1e6}
                  step="0.000001"
                  value={contributeAmount}
                  onChange={(e) => setContributeAmount(e.target.value)}
                  placeholder="e.g. 25"
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
              disabled={status !== "idle" || !contributeAmount}
            >
              {status !== "idle" ? "Contributing..." : "Contribute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
