import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { type AleoRecord, getField } from "@/lib/aleo-records";
import {
  fetchPoolState,
  fetchActiveFactorCount,
  computePoolStats,
  computePoolPayout,
} from "@/lib/pool-chain";

interface PoolShareCardProps {
  record: AleoRecord;
}

export function PoolShareCard({ record }: PoolShareCardProps) {
  const navigate = useNavigate();

  const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
  const contributed = BigInt(
    getField(record.recordPlaintext, "contributed").replace(/u64$/, "") || "0",
  );
  const totalPoolSnapshot = BigInt(
    getField(record.recordPlaintext, "total_pool").replace(/u64$/, "") || "0",
  );

  const { data: poolState, isLoading: poolStateLoading } = useQuery({
    queryKey: ["pool_state", invoiceHash],
    queryFn: () => fetchPoolState(invoiceHash),
    staleTime: 30_000,
    enabled: !!invoiceHash,
  });

  const { data: activeFactorCount = 1 } = useQuery({
    queryKey: ["active_factor_count"],
    queryFn: fetchActiveFactorCount,
    staleTime: 60_000,
  });

  const stats = poolState ? computePoolStats(poolState, activeFactorCount) : null;

  const shareDenominator =
    poolState?.totalContributed && poolState.totalContributed > 0n
      ? poolState.totalContributed
      : totalPoolSnapshot;

  const sharePct =
    shareDenominator > 0n
      ? ((Number(contributed) / Number(shareDenominator)) * 100).toFixed(2)
      : "0.00";

  const proceedsAvailable =
    poolState?.proceeds !== null && (poolState?.proceeds ?? 0n) > 0n;

  const expectedPayout =
    poolState?.proceeds && poolState.totalContributed > 0n
      ? computePoolPayout(contributed, poolState.totalContributed, poolState.proceeds)
      : 0n;

  const shareCurrency = poolState?.meta.currency ?? "ALEO";

  const { statusLabel, statusClass } = (() => {
    if (!poolState) return { statusLabel: "Loading", statusClass: "text-muted-foreground border-muted" };
    if (poolState.isClosed) {
      if (stats?.isFullyDistributed) return { statusLabel: "Closed", statusClass: "text-amber-700 border-amber-300" };
      if (poolState.isSettled && poolState.proceeds === null) return { statusLabel: "Awaiting Distribution", statusClass: "text-violet-700 border-violet-300" };
      if (poolState.proceeds !== null && poolState.proceeds > 0n) return { statusLabel: "Paying Out", statusClass: "text-green-600 border-green-300" };
      return { statusLabel: "Executed", statusClass: "text-blue-600 border-blue-300" };
    }
    if (poolState.pendingOffer?.isExecuted) return { statusLabel: "Rejected", statusClass: "text-red-700 border-red-300" };
    if (poolState.pendingOffer && !poolState.pendingOffer.isExecuted) return { statusLabel: "Voting", statusClass: "text-amber-600 border-amber-300" };
    return { statusLabel: "Open", statusClass: "text-blue-600 border-blue-300" };
  })();

  return (
    <Card
      className="hover:border-primary/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/pools/${invoiceHash}`)}
    >
      <CardContent className="pt-4 space-y-3">
        {/* Header: name + hash + status badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            {poolStateLoading ? (
              <Skeleton className="h-4 w-24 mb-1" />
            ) : (
              <p className="text-sm font-medium">{poolState?.meta.name ?? "—"}</p>
            )}
          </div>
          {poolStateLoading ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <Badge variant="outline" className={cn("text-xs", statusClass)}>
              {statusLabel}
            </Badge>
          )}
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contributed</span>
            <span className="font-mono font-medium">
              {(Number(contributed) / 1_000_000).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}{" "}
              {shareCurrency}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your share</span>
            <span>{sharePct}%</span>
          </div>

          {!poolStateLoading && proceedsAvailable && expectedPayout > 0n && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Your payout</span>
              <span className="font-mono">
                {(Number(expectedPayout) / 1_000_000).toLocaleString(
                  undefined,
                  { maximumFractionDigits: 6 },
                )}{" "}
                {shareCurrency}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
