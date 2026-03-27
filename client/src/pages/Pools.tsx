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
  buildContributeToPoolInputs,
  buildClaimPoolProceedsInputs,
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
  const onChainPoolHashes = new Set(
    poolRecords.map((r) => getField(r.recordPlaintext, "invoice_hash")),
  );
  const directoryOnlyPools = localPoolEntries.filter(
    (p) => !onChainPoolHashes.has(p.invoiceHash),
  );
  const totalVisiblePools = poolRecords.length + directoryOnlyPools.length;
  const poolShareRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "PoolShare" && !r.spent,
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
  }, [poolRecords.length]);

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
      reset();
    } else if (status === "failed") {
      setPendingPoolContribution(null);
      toast.error(txError || "Transaction failed", { id: "pool-op" });
      setIsContributing(false);
      reset();
    }
  }, [status, txError, queryClient, reset]);

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
    const inputs = buildClaimPoolProceedsInputs(share.recordPlaintext);
    await execute({
      program: PROGRAM_ID,
      function: "claim_pool_proceeds",
      inputs,
      fee: 80_000,
      privateFee: false,
    });
  };

  const renderPoolCards = () => {
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
    if (poolRecords.length === 0 && directoryOnlyPools.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">No pools yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create a pool to syndicate factoring across multiple
                contributors
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {poolRecords.map((record, idx) => {
          const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
          const targetRaw = getField(record.recordPlaintext, "target_amount");
          const targetMicro = BigInt(targetRaw.replace(/u64$/, ""));
          const meta = poolMetas[invoiceHash];
          const contributed = meta?.contributed ?? null;
          const isClosed = meta?.isClosed ?? false;

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
                  <span className="font-mono text-sm text-muted-foreground">
                    {invoiceHash.slice(0, 14)}…
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      isClosed
                        ? "text-green-600 border-green-300 text-xs"
                        : "text-blue-600 border-blue-300 text-xs"
                    }
                  >
                    {isClosed ? (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Closed
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={() => {
                      setContributeInvoiceHash(invoiceHash);
                      setContributePoolOwner(
                        getField(record.recordPlaintext, "owner"),
                      );
                    }}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    Contribute
                    <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}

        {directoryOnlyPools.map((pool) => {
          const targetAleo = (
            pool.targetAmountMicro / 1_000_000
          ).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          });
          const contributedMicro = pool.participants.reduce(
            (sum, participant) => sum + participant.contributedMicro,
            0,
          );
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
                  <span className="font-mono text-sm text-muted-foreground">
                    {pool.invoiceHash.slice(0, 14)}…
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      pool.isClosed
                        ? "text-green-600 border-green-300 text-xs"
                        : "text-blue-600 border-blue-300 text-xs"
                    }
                  >
                    {pool.isClosed ? (
                      <>
                        <Lock className="h-3 w-3 mr-1" />
                        Closed
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={() => {
                      setContributeInvoiceHash(pool.invoiceHash);
                      setContributePoolOwner(pool.owner);
                    }}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    Contribute
                    <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                  </Button>
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
          const shareBps =
            totalPool > 0n ? (contributed * 10000n) / totalPool : 0n;

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
                >
                  Claim Proceeds
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
          <p className="text-muted-foreground">
            Syndicate invoice factoring with other contributors
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

      <Tabs defaultValue="my-pools">
        <TabsList>
          <TabsTrigger value="my-pools">
            Pools
            {!isLoading && totalVisiblePools > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({totalVisiblePools})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-shares">
            My Shares
            {!isLoading && poolShareRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({poolShareRecords.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="contribute">Contribute</TabsTrigger>
        </TabsList>

        {/* My Pools tab */}
        <TabsContent value="my-pools" className="mt-4">
          {renderPoolCards()}
          <p className="mt-3 text-xs text-muted-foreground">
            Any active factor can create a pool and any active factor can
            contribute.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use Marketplace to create new pools.
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
                Enter the pool invoice hash and pool owner address. Any active
                factor can join, and each contributor receives a PoolShare
                record.
              </p>
              <div className="space-y-2">
                <Label htmlFor="contrib-hash">Invoice Hash</Label>
                <Input
                  id="contrib-hash"
                  placeholder="invoice_hash field value"
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
