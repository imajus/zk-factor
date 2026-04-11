import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Layers,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AddressDisplay } from "@/components/ui/address-display";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { toast } from "sonner";
import { PROGRAM_ID } from "@/lib/config";
import {
  computePoolStats,
  fetchActiveFactorCount,
  fetchAllPools,
  getPoolCurrentFunds,
} from "@/lib/pool-chain";
import { PoolTimeline } from "@/components/pools/PoolTimeline";

function formatMicro(value: bigint): string {
  return (Number(value) / 1_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

export default function Pool() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { poolId } = useParams<{ poolId: string }>();
  const { activeRole } = useWallet();
  const { execute, status } = useTransaction();

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

  const openDistribution = async () => {
    if (!pool) return;
    await execute({
      program: PROGRAM_ID,
      function: "pool_open_distribution",
      inputs: [pool.meta.invoiceHash],
      fee: 80_000,
      privateFee: false,
    });
    toast.success("Distribution opened.");
    queryClient.invalidateQueries({ queryKey: ["all_pools"] });
    queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
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
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
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
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                {pool.meta.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="font-mono text-xs text-muted-foreground break-all">
                {pool.meta.invoiceHash}
              </div>

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
                        {formatMicro(currentFunds)} ALEO
                      </p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3 min-h-[76px] flex flex-col justify-between">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Advance Paid
                      </p>
                      <p className="font-mono text-sm font-semibold leading-none">
                        {formatMicro(advancePaid)} ALEO
                      </p>
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-3 min-h-[76px] flex flex-col justify-between">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        Min Contribution
                      </p>
                      <p className="font-mono text-sm font-semibold leading-none">
                        {formatMicro(pool.meta.minContribution)} ALEO
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
                        Invoice submissions will be rejected until contributors add
                        liquidity to this pool.
                      </p>
                    </div>
                  )}

                  {pool.pendingOffer && (
                    <div className="rounded-md border bg-muted/20 p-3 space-y-2 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Pending Offer</Badge>
                        <Badge variant="outline">
                          Approve {stats.approveCount}
                        </Badge>
                        <Badge variant="outline">Reject {stats.rejectCount}</Badge>
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
                          <span className="text-muted-foreground">
                            Invoice Amount
                          </span>
                          <span className="font-mono">
                            {formatMicro(pool.pendingOffer.amount)} ALEO
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
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {canOpenDistribution && (
                      <Button
                        onClick={openDistribution}
                        disabled={status !== "idle"}
                      >
                        Open Distribution
                      </Button>
                    )}

                    {activeRole === "factor" && pool.pendingOffer && (
                      <Button asChild variant="secondary">
                        <Link to="/pools">
                          <ArrowRight className="h-4 w-4 mr-1.5" />
                          Go to Pools Voting
                        </Link>
                      </Button>
                    )}

                    {activeRole === "business" &&
                      !pool.isClosed &&
                      !stats.hasPendingOffer && (
                        <Button asChild variant="secondary">
                          <Link to="/marketplace">
                            <ArrowRight className="h-4 w-4 mr-1.5" />
                            Go to Marketplace
                          </Link>
                        </Button>
                      )}
                  </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      )}
    </div>
  );
}
