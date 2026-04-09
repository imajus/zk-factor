import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressDisplay } from "@/components/ui/address-display";
import { PoolTimeline } from "@/components/pools/PoolTimeline";
import { toast } from "sonner";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { PROGRAM_ID, PROGRAM_ADDRESS } from "@/lib/config";
import {
  fetchAllPools,
  fetchPublicCreditsBalance,
  buildPoolContributeInputs,
  computePoolStats,
  fetchActiveFactorCount,
  type OnChainPoolState,
} from "@/lib/pool-chain";

function getPoolStatus(pool: OnChainPoolState, activeFactorCount: number) {
  const stats = computePoolStats(pool, activeFactorCount);
  if (pool.isClosed) {
    if (stats.isFullyDistributed) {
      return { label: "Closed", className: "text-green-600 border-green-300 text-xs" };
    }
    if (pool.isSettled && pool.proceeds === null) {
      return { label: "Awaiting Distribution", className: "text-violet-700 border-violet-300 text-xs" };
    }
    if (pool.proceeds !== null && pool.proceeds > 0n) {
      return { label: "Paying Out", className: "text-amber-700 border-amber-300 text-xs" };
    }
    return { label: "Executed", className: "text-blue-600 border-blue-300 text-xs" };
  }
  return { label: "Open", className: "text-blue-600 border-blue-300 text-xs" };
}

export default function PoolDetail() {
  const { hash } = useParams<{ hash: string }>();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const { execute, status, error: txError, reset } = useTransaction();

  const [contributeAmount, setContributeAmount] = useState("");
  const [publicBalance, setPublicBalance] = useState<bigint | null>(null);
  const [pendingDistributionHash, setPendingDistributionHash] = useState<string | null>(null);

  const { data: pools = [], isLoading } = useQuery({
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

  const pool = hash ? (pools.find((p) => p.meta.invoiceHash.replace(/field$/, "") === hash) ?? null) : null;
  const stats = pool ? computePoolStats(pool, activeFactorCount) : null;
  const poolStatus = pool ? getPoolStatus(pool, activeFactorCount) : null;
  const canOpenDistribution =
    !!pool && pool.isSettled && pool.isClosed && pool.proceeds === null;

  useEffect(() => {
    if (address) {
      fetchPublicCreditsBalance(address).then(setPublicBalance);
    }
  }, [address]);

  const percentText = (() => {
    if (!pool) return "Loading";
    if (stats?.isFullyDistributed) return "100% complete";
    if (pool.pendingOffer?.isExecuted) {
      if (pool.proceeds && pool.proceeds > 0n) {
        const claimedPct =
          Number((pool.distributed * 10000n) / pool.proceeds) / 100;
        return `${claimedPct.toFixed(1)}% claimed`;
      }
      return "0.0% claimed";
    }
    return `${(Number(pool.totalContributed) / 1_000_000).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    })} ALEO raised`;
  })();

  useEffect(() => {
    if (status === "submitting")
      toast.loading("Generating proof…", { id: "pool-detail-op" });
    else if (status === "pending")
      toast.loading("Broadcasting…", { id: "pool-detail-op" });
    else if (status === "accepted") {
      toast.success("Transaction confirmed!", { id: "pool-detail-op" });
      queryClient.invalidateQueries({ queryKey: ["all_pools"] });
      setPendingDistributionHash(null);
      setContributeAmount("");
      reset();
    } else if (status === "failed") {
      toast.error(txError || "Transaction failed", { id: "pool-detail-op" });
      setPendingDistributionHash(null);
      reset();
    }
  }, [status, txError, queryClient, reset]);

  useEffect(() => {
    if (status !== "pending" || !pendingDistributionHash || !pool) return;
    const distributionOpened = pool.proceeds !== null && pool.proceeds > 0n;
    if (!distributionOpened) return;
    toast.success("Distribution opened.", { id: "pool-detail-op" });
    setPendingDistributionHash(null);
    queryClient.invalidateQueries({ queryKey: ["all_pools"] });
    reset();
  }, [status, pendingDistributionHash, pool, queryClient, reset]);

  const handleContribute = async () => {
    if (!pool || !address) return;
    const amountAleo = parseFloat(contributeAmount);
    if (Number.isNaN(amountAleo) || amountAleo <= 0) {
      toast.error("Enter a valid amount.");
      return;
    }
    const contribution = BigInt(Math.round(amountAleo * 1_000_000));
    const minContrib = pool.meta.minContribution;
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
    await execute({
      program: PROGRAM_ID,
      function: "pool_contribute",
      inputs: buildPoolContributeInputs(
        pool.meta.invoiceHash,
        PROGRAM_ADDRESS,
        contribution,
        pool.totalContributed,
      ),
      fee: 80_000,
      privateFee: false,
    });
  };

  const handleOpenDistribution = async () => {
    if (!pool) return;
    setPendingDistributionHash(pool.meta.invoiceHash);
    await execute({
      program: PROGRAM_ID,
      function: "pool_open_distribution",
      inputs: [pool.meta.invoiceHash],
      fee: 80_000,
      privateFee: false,
    });
  };

  const backLink = (
    <Link
      to="/pools"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      Factor Pools
    </Link>
  );

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        {backLink}
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
        <Card>
          <CardContent className="pt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-md" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="container py-6 space-y-6">
        {backLink}
        <Card>
          <CardContent className="pt-6 text-center space-y-2 pb-8">
            <p className="font-medium">Pool not found</p>
            <p className="text-sm text-muted-foreground break-all">
              No pool found for hash: {hash}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Back link */}
      {backLink}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{pool.meta.name}</h1>
          <p className="font-mono text-xs text-muted-foreground break-all mt-1">
            {pool.meta.invoiceHash}
          </p>
        </div>
        <Badge variant="outline" className={poolStatus?.className ?? "text-xs"}>
          {poolStatus?.label ?? "Loading"}
        </Badge>
      </div>

      {/* Stats grid */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Current Funds</p>
              <p className="mt-1 font-mono text-sm font-semibold">
                {(Number(pool.totalContributed) / 1_000_000).toLocaleString(
                  undefined,
                  { maximumFractionDigits: 6 },
                )}{" "}
                ALEO
              </p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Percent</p>
              <p className="mt-1 font-mono text-sm font-semibold">{percentText}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Addresses Involved</p>
              <p className="mt-1 text-sm font-medium">
                {pool.pendingOffer ? "Creditor + debtor" : "Pending offer not submitted"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending offer block */}
      {pool.pendingOffer && (
        <Card>
          <CardContent className="pt-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="text-[10px] uppercase tracking-wide"
              >
                Pending Offer
              </Badge>
              <Badge variant="outline" className="text-xs">
                {stats?.voteCount ?? 0} / {stats?.threshold ?? 0} votes
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Creditor</span>
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
                <span className="text-muted-foreground">Advance Rate</span>
                <span className="font-mono">
                  {(pool.pendingOffer.advanceRate / 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Advance Amount</span>
                <span className="font-mono">
                  {(
                    Number(pool.pendingOffer.advanceAmount) / 1_000_000
                  ).toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
                  ALEO
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <PoolTimeline
        pool={pool}
        activeFactorCount={activeFactorCount}
        layout="horizontal"
      />

      {/* Pool configuration */}
      <Card className="border-dashed">
        <CardContent className="pt-4 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Advance Range</span>
            <span className="font-mono text-right">
              {pool.meta.minAdvanceRate / 100}% – {pool.meta.maxAdvanceRate / 100}%
            </span>
          </div>
          <div className="flex items-start justify-between gap-3">
            <span className="text-muted-foreground">Minimum Contribution</span>
            <span className="font-mono text-right">
              {(Number(pool.meta.minContribution) / 1_000_000).toLocaleString(
                undefined,
                { maximumFractionDigits: 6 },
              )}{" "}
              ALEO
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Contribute form */}
      {!pool.isClosed && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <h2 className="font-semibold text-sm">Contribute</h2>
            <div className="space-y-2">
              <Label htmlFor="contribute-amount">Amount (ALEO)</Label>
              <Input
                id="contribute-amount"
                type="number"
                min={Number(pool.meta.minContribution) / 1e6}
                step="0.000001"
                value={contributeAmount}
                onChange={(e) => setContributeAmount(e.target.value)}
                placeholder="e.g. 25"
              />
              {publicBalance !== null && (
                <p className="text-xs text-muted-foreground">
                  Your public balance:{" "}
                  {(Number(publicBalance) / 1_000_000).toLocaleString(undefined, {
                    maximumFractionDigits: 6,
                  })}{" "}
                  ALEO
                </p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={handleContribute}
              disabled={status !== "idle" || !contributeAmount}
            >
              {status !== "idle" ? "Contributing..." : "Contribute"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Open Distribution */}
      {canOpenDistribution && (
        <Card className="border-dashed">
          <CardContent className="pt-4 space-y-2">
            <Button
              className="w-full"
              onClick={handleOpenDistribution}
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
    </div>
  );
}
