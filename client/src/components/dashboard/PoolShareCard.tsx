/**
 * src/components/dashboard/PoolShareCard.tsx
 *
 * Drop this file into src/components/dashboard/.
 * Then in FactorDashboard.tsx replace the renderPoolShareCards() function body
 * with the two lines shown at the bottom of this file.
 *
 * Why a separate component?
 * Each card needs to call useQuery for its own pool state.
 * React forbids calling hooks inside a .map() callback.
 * The fix is to move each card into its own component where
 * the hook is called at the top level — which is what this file does.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  POOL_PROGRAM_ID,
  POOL_PROGRAM_ADDRESS,
  USDCX_PROGRAM_ID,
} from "@/lib/config";
import { type AleoRecord, getField } from "@/lib/aleo-records";
import {
  fetchPoolState,
  fetchActiveFactorCount,
  computePoolStats,
  computePoolPayout,
  fetchPublicCreditsBalance,
  fetchPublicTokenBalance,
  buildPoolContributeInputs,
  buildPoolOpenDistributionInputs,
  buildClaimPoolProceedsInputs,
} from "@/lib/pool-chain";
import { fetchPoolContributions } from "@/lib/aleo-factors";

interface PoolShareCardProps {
  record: AleoRecord;
}

export function PoolShareCard({ record }: PoolShareCardProps) {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const { execute, status } = useTransaction();
  const isWorking = status !== "idle";
  const [manageOpen, setManageOpen] = useState(false);
  const [manageAmount, setManageAmount] = useState("");
  const [publicBalance, setPublicBalance] = useState<bigint | null>(null);

  const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
  const contributed = BigInt(
    getField(record.recordPlaintext, "contributed").replace(/u64$/, "") || "0",
  );
  const totalPoolSnapshot = BigInt(
    getField(record.recordPlaintext, "total_pool").replace(/u64$/, "") || "0",
  );

  // Each card fetches its own live pool state — safe because hook is at
  // the top level of this component, not inside a parent's .map().
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

  // ── computed values ───────────────────────────────────────────────
  const stats = poolState
    ? computePoolStats(poolState, activeFactorCount)
    : null;

  const snapshotSharePct =
    totalPoolSnapshot > 0n
      ? ((Number(contributed) / Number(totalPoolSnapshot)) * 100).toFixed(2)
      : "0.00";

  const proceedsAvailable =
    poolState?.proceeds !== null && (poolState?.proceeds ?? 0n) > 0n;

  const expectedPayout =
    poolState?.proceeds && poolState.totalContributed > 0n
      ? computePoolPayout(
          contributed,
          poolState.totalContributed,
          poolState.proceeds,
        )
      : 0n;

  // Pool is executed+closed but distribution hasn't been opened yet.
  const needsDistributionOpen =
    poolState?.isClosed &&
    poolState.pendingOffer?.isExecuted &&
    poolState.proceeds === null;

  const shareCurrency = poolState?.meta.currency ?? "ALEO";

  const formatInputAmount = (value: bigint) => {
    const asNumber = Number(value) / 1_000_000;
    if (!Number.isFinite(asNumber)) return "0";
    return asNumber
      .toFixed(6)
      .replace(/\.0+$/, "")
      .replace(/(\.\d*?)0+$/, "$1");
  };

  const parseInputAmount = (value: string): bigint | null => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return BigInt(Math.round(parsed * 1_000_000));
  };

  useEffect(() => {
    if (!manageOpen || !address) {
      setPublicBalance(null);
      return;
    }

    const loadBalance = async () => {
      const balance =
        shareCurrency === "USDCx"
          ? await fetchPublicTokenBalance(address)
          : await fetchPublicCreditsBalance(address);
      setPublicBalance(balance);
    };

    loadBalance();
  }, [address, manageOpen, shareCurrency]);

  const statusLabel = !poolState
    ? "Loading"
    : poolState.isClosed
      ? "Closed"
      : stats?.hasPendingOffer
        ? `Voting (${stats.voteCount}/${stats.threshold})`
        : stats?.isFullyFunded
          ? "Funded"
          : `${stats?.percentFunded ?? 0}% funded`;

  const statusClass = !poolState
    ? "text-muted-foreground border-muted"
    : poolState.isClosed
      ? "text-emerald-600 border-emerald-300"
      : stats?.hasPendingOffer
        ? "text-violet-700 border-violet-300"
        : stats?.isFullyFunded
          ? "text-amber-700 border-amber-300"
          : "text-blue-700 border-blue-300";

  // ── actions ───────────────────────────────────────────────────────
  const handleOpenDistribution = async () => {
    try {
      await execute({
        program: POOL_PROGRAM_ID,
        function: "pool_open_distribution",
        inputs: buildPoolOpenDistributionInputs(invoiceHash),
        fee: 50_000,
        privateFee: false,
      });
      queryClient.invalidateQueries({ queryKey: ["pool_state", invoiceHash] });
      toast.success("Distribution opened — contributors can now claim.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to open distribution",
      );
    }
  };

  const handleClaim = async () => {
    if (expectedPayout <= 0n) return;

    // Re-fetch authoritative total from chain before computing payout —
    // the snapshot in the record may be stale if other contributors joined after.
    const onChainTotal = await fetchPoolContributions(invoiceHash);
    if (!onChainTotal || !poolState?.proceeds) {
      toast.error("Could not read pool totals from chain.");
      return;
    }

    const payout = computePoolPayout(
      contributed,
      onChainTotal,
      poolState.proceeds,
    );
    if (payout <= 0n) {
      toast.error("No claimable proceeds available.");
      return;
    }

    try {
      await execute({
        program: POOL_PROGRAM_ID,
        function: "claim_pool_proceeds",
        inputs: buildClaimPoolProceedsInputs(record.recordPlaintext, payout),
        fee: 80_000,
        privateFee: false,
      });
      queryClient.invalidateQueries({ queryKey: ["records", POOL_PROGRAM_ID] });
      queryClient.invalidateQueries({ queryKey: ["pool_state", invoiceHash] });
      toast.success("Proceeds claimed!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Claim failed");
    }
  };

  const openManageDialog = () => {
    setManageAmount("");
    setManageOpen(true);
  };

  const handleSetMax = () => {
    if (publicBalance !== null) {
      setManageAmount(formatInputAmount(publicBalance));
    }
  };

  const handleManageSubmit = async () => {
    if (!poolState) {
      toast.error("Pool state is still loading.");
      return;
    }

    const amountMicro = parseInputAmount(manageAmount);
    if (!amountMicro || amountMicro <= 0n) {
      toast.error("Enter a valid amount.");
      return;
    }

    if (poolState.isClosed) {
      toast.error("Pool is closed. Contributions are disabled.");
      return;
    }
    if (!POOL_PROGRAM_ADDRESS) {
      toast.error("POOL_PROGRAM_ADDRESS is not set.");
      return;
    }
    if (publicBalance !== null && amountMicro > publicBalance) {
      toast.error(
        `Insufficient public ${shareCurrency} balance (${formatInputAmount(publicBalance)} ${shareCurrency}).`,
      );
      return;
    }

    try {
      if (shareCurrency === "USDCx") {
        await execute({
          program: USDCX_PROGRAM_ID,
          function: "approve_public",
          inputs: [POOL_PROGRAM_ID, `${amountMicro}u128`],
          fee: 50_000,
          privateFee: false,
        });
      }

      await execute({
        program: POOL_PROGRAM_ID,
        function:
          shareCurrency === "USDCx"
            ? "pool_contribute_token"
            : "pool_contribute",
        inputs: buildPoolContributeInputs(
          invoiceHash,
          POOL_PROGRAM_ADDRESS,
          amountMicro,
          poolState.totalContributed,
        ),
        fee: 80_000,
        privateFee: false,
      });

      toast.success("Contribution added.");
      setManageOpen(false);
      setManageAmount("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Contribution failed");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["records", POOL_PROGRAM_ID] });
    queryClient.invalidateQueries({ queryKey: ["pool_state", invoiceHash] });
    queryClient.invalidateQueries({ queryKey: ["all_pools"] });
  };

  // ── render ────────────────────────────────────────────────────────
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="pt-4 space-y-3">
        {/* Hash */}
        <span className="font-mono text-sm text-muted-foreground">
          {invoiceHash.slice(0, 12)}…
        </span>

        {/* Amounts */}
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contributed</span>
            <span className="font-mono font-medium">
              {(Number(contributed) / 1_000_000).toLocaleString(undefined, {
                maximumFractionDigits: 6,
              })}{" "}
              ALEO
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Your share</span>
            <span>{snapshotSharePct}%</span>
          </div>

          {/* Live pool status */}
          {poolStateLoading ? (
            <Skeleton className="h-3 w-full mt-1" />
          ) : (
            <>
              <div className="flex justify-between items-center mt-1">
                <span className="text-muted-foreground">Pool status</span>
                <Badge variant="outline" className={cn("text-xs", statusClass)}>
                  {statusLabel}
                </Badge>
              </div>

              {/* Payout preview */}
              {proceedsAvailable && expectedPayout > 0n && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Your payout</span>
                  <span className="font-mono">
                    {(Number(expectedPayout) / 1_000_000).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 6 },
                    )}{" "}
                    ALEO
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Open distribution button — permissionless, anyone can call */}
        {needsDistributionOpen && (
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
            onClick={handleOpenDistribution}
            disabled={isWorking}
          >
            {isWorking ? "Opening…" : "Open Distribution"}
          </Button>
        )}

        {/* Claim proceeds */}
        {proceedsAvailable && expectedPayout > 0n && (
          <Button
            size="sm"
            className="w-full"
            onClick={handleClaim}
            disabled={isWorking}
          >
            {isWorking ? "Claiming…" : "Claim Proceeds"}
          </Button>
        )}

        {/* Manage contribution */}
        <Button
          size="sm"
          variant="outline"
          onClick={openManageDialog}
          disabled={isWorking || !poolState || poolState.isClosed}
        >
          Add Funds
        </Button>

        {/* Waiting state */}
        {!needsDistributionOpen &&
          (!proceedsAvailable || expectedPayout <= 0n) && (
            <Badge
              variant="outline"
              className="w-full justify-center text-xs text-blue-600 border-blue-300"
            >
              Pool Share Active
            </Badge>
          )}
      </CardContent>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Contribution</DialogTitle>
            <DialogDescription>
              Pool {invoiceHash.slice(0, 14)}…
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Current contributed
                </span>
                <span className="font-mono font-medium">
                  {formatInputAmount(contributed)} {shareCurrency}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`manage-amount-${invoiceHash}`}>
                Amount ({shareCurrency})
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`manage-amount-${invoiceHash}`}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.000001"
                  placeholder="0.0"
                  value={manageAmount}
                  onChange={(e) => setManageAmount(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={handleSetMax}>
                  Max
                </Button>
              </div>
              {publicBalance !== null && (
                <p className="text-xs text-muted-foreground">
                  Public balance: {formatInputAmount(publicBalance)}{" "}
                  {shareCurrency}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setManageOpen(false)}
              disabled={isWorking}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleManageSubmit}
              disabled={isWorking}
            >
              {isWorking ? "Submitting…" : "Contribute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOW TO USE IN FactorDashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Add this import near the top of FactorDashboard.tsx:
//
//      import { PoolShareCard } from "@/components/dashboard/PoolShareCard";
//
// 2. Replace the entire renderPoolShareCards() function with:
//
//      const renderPoolShareCards = () => {
//        if (isLoading) {
//          return (
//            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//              {Array.from({ length: 2 }).map((_, i) => (
//                <Card key={i}>
//                  <CardContent className="pt-4 space-y-2">
//                    <Skeleton className="h-4 w-32" />
//                    <Skeleton className="h-4 w-24" />
//                    <Skeleton className="h-6 w-16" />
//                  </CardContent>
//                </Card>
//              ))}
//            </div>
//          );
//        }
//        if (poolShareRecords.length === 0) {
//          return (
//            <Card className="py-16 text-center">
//              <CardContent className="space-y-4">
//                <Users className="h-12 w-12 mx-auto text-muted-foreground" />
//                <div>
//                  <p className="font-medium">No pool shares</p>
//                  <p className="text-sm text-muted-foreground mt-1">
//                    Contribute to a pool from the{" "}
//                    <Link to="/marketplace" className="underline">Marketplace</Link>
//                  </p>
//                </div>
//              </CardContent>
//            </Card>
//          );
//        }
//        return (
//          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
//            {poolShareRecords.map((record) => (
//              <PoolShareCard
//                key={getField(record.recordPlaintext, "invoice_hash")}
//                record={record}
//              />
//            ))}
//          </div>
//        );
//      };
//
// That's the only change needed in FactorDashboard.tsx.
// Everything else (portfolio tab, offers tab, recourse) stays exactly as-is.
