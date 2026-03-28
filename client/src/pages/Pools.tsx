import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  Lock,
  Unlock,
  ChevronRight,
  Layers,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { toast } from "sonner";
import { PROGRAM_ID } from "@/lib/config";
import { type AleoRecord, getField, microToAleo } from "@/lib/aleo-records";
import {
  fetchPoolContributions,
  fetchPoolClosed,
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

interface PoolMeta {
  invoiceHash: string;
  owner: string;
  targetAmount: bigint;
  contributed: bigint | null;
  isClosed: boolean;
}

export default function Pools() {
  const queryClient = useQueryClient();
  const { isConnected, requestRecords, address } = useWallet();
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
      setIsContributing(false);
      setContributeInvoiceHash("");
      setContributePoolOwner("");
      setContributeAmountAleo("");
      setClaimingShareId(null);
      setExecutingPoolHash(null);
      setRecoveringPoolHash(null);
      reset();
    } else if (status === "failed") {
      setPendingPoolContribution(null);
      toast.error(txError || "Transaction failed", { id: "pool-op" });
      setIsContributing(false);
      setClaimingShareId(null);
      setExecutingPoolHash(null);
      setRecoveringPoolHash(null);
      reset();
    }
  }, [status, txError, queryClient, reset, pendingPoolContribution]);

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
      targetAmountMicro: meta ? Number(meta.targetAmount) : undefined,
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
      const [isClosed, isSettled, creditsRecords] = await Promise.all([
        fetchPoolClosed(invoiceHash),
        fetchInvoiceSettled(invoiceHash),
        requestRecords("credits.aleo", true) as Promise<AleoRecord[]>,
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

      const paymentRecord = creditsRecords
        .filter((r) => !r.spent)
        .find(
          (r) =>
            BigInt(
              getField(r.recordPlaintext, "microcredits").replace(/u64$/, ""),
            ) > 0n,
        );

      if (!paymentRecord) {
        toast.error(
          "No spendable credits record found for payout transaction.",
        );
        setClaimingShareId(null);
        return;
      }

      const inputs = buildClaimPoolProceedsInputs(
        share.recordPlaintext,
        paymentRecord.recordPlaintext,
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
              className="hover:border-primary/50 transition-colors"
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

                {!isClosed && (
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5"
                      disabled={isAwaitingExecution}
                      onClick={() => {
                        if (isAwaitingExecution) return;
                        setContributeInvoiceHash(invoiceHash);
                        setContributePoolOwner(
                          getField(record.recordPlaintext, "owner"),
                        );
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

                    {isAwaitingExecution && isOwner && matchingOffer && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() =>
                          handleExecutePoolFactoring(record, matchingOffer)
                        }
                        disabled={executingPoolHash === invoiceHash}
                      >
                        {executingPoolHash === invoiceHash
                          ? "Executing..."
                          : "Execute Pool Factoring"}
                      </Button>
                    )}

                    {isAwaitingExecution &&
                      isOwner &&
                      !matchingOffer &&
                      alreadyFactoredByOwner && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full"
                          onClick={() => handleRecoverPoolClose(record)}
                          disabled={recoveringPoolHash === invoiceHash}
                        >
                          {recoveringPoolHash === invoiceHash
                            ? "Closing..."
                            : "Recover / Close Pool"}
                        </Button>
                      )}

                    {isAwaitingExecution && awaitingReason && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {awaitingReason}
                      </p>
                    )}
                  </div>
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
              className="hover:border-primary/50 transition-colors"
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
          const isPoolClosed = poolMetas[invoiceHash]?.isClosed ?? false;
          const canClaim = isPoolClosed;

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
                    Claim unlocks after pool execution closes this pool.
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
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/dashboard">
              <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
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
            {!isLoading && totalVisiblePools > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({totalVisiblePools})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="owner-ops">
            Owner Ops
            {!isLoading &&
              ownerPoolRecords.length + ownerDirectoryPools.length > 0 && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({ownerPoolRecords.length + ownerDirectoryPools.length})
                </span>
              )}
          </TabsTrigger>
          <TabsTrigger value="my-shares">
            Contributor Claims
            {!isLoading && poolShareRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({poolShareRecords.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="contribute">Join Pool</TabsTrigger>
        </TabsList>

        {/* Discover tab */}
        <TabsContent value="discover" className="mt-4">
          {renderPoolCards("all")}
          <p className="mt-3 text-xs text-muted-foreground">
            Any active factor can create a pool and any active factor can
            contribute.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use Marketplace to create new pools.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Payout claim requires pool closed + invoice settled + one spendable
            credits record for the claim transaction input.
          </p>
        </TabsContent>

        {/* Owner Ops tab */}
        <TabsContent value="owner-ops" className="mt-4">
          {renderPoolCards("owner")}
          <p className="mt-3 text-xs text-muted-foreground">
            Owner flow: keep pool funded, execute pool factoring once funded,
            then monitor settlement and claims.
          </p>
        </TabsContent>

        {/* My Shares tab */}
        <TabsContent value="my-shares" className="mt-4">
          {renderShareCards()}
        </TabsContent>

        {/* Contribute tab */}
        <TabsContent value="contribute" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Contribute to a Pool
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the pool ID and pool owner address. Any active factor can
                join, and each contributor receives a PoolShare record.
              </p>
              <div className="space-y-2">
                <Label htmlFor="contrib-hash">Pool ID</Label>
                <Input
                  id="contrib-hash"
                  placeholder="pool_id field value (e.g. 12345field)"
                  value={contributeInvoiceHash}
                  onChange={(e) => setContributeInvoiceHash(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contrib-owner">Pool Owner Address</Label>
                <Input
                  id="contrib-owner"
                  placeholder="aleo1..."
                  value={contributePoolOwner}
                  onChange={(e) => setContributePoolOwner(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contrib-amount">
                  Contribution Amount (ALEO)
                </Label>
                <Input
                  id="contrib-amount"
                  type="number"
                  placeholder="e.g. 250"
                  value={contributeAmountAleo}
                  onChange={(e) => setContributeAmountAleo(e.target.value)}
                  min="0"
                  step="0.000001"
                />
              </div>
              <Button
                className="w-full gap-2"
                onClick={handleContribute}
                disabled={
                  isContributing ||
                  !contributeInvoiceHash ||
                  !contributePoolOwner ||
                  !contributeAmountAleo
                }
              >
                <TrendingUp className="h-4 w-4" />
                {isContributing ? "Contributing…" : "Contribute"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
