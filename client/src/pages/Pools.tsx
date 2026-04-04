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
            Create an ownerless pool that accepts invoices at specific advance rates. Any business can submit an invoice if their requested advance rate falls within the pool's range.
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
              A pool is generic and can accept any invoice later if the advance rate matches this pool's configured range.
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
  encodePoolName,
  fetchPublicCreditsBalance,
  fetchAllPools,
  type OnChainPoolState,
} from "@/lib/pool-chain";

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
  const [ownerlessContributeOpen, setOwnerlessContributeOpen] = useState(false);
  const [ownerlessContributePool, setOwnerlessContributePool] =
    useState<OnChainPoolState | null>(null);
  const [ownerlessContributeAmount, setOwnerlessContributeAmount] =
    useState("");
  const [publicBalance, setPublicBalance] = useState<bigint | null>(null);

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
      setOwnerlessContributeOpen(false);
      setOwnerlessContributePool(null);
      setOwnerlessContributeAmount("");
      setPublicBalance(null);
      reset();
    }
  }, [status, txError, queryClient, reset, pendingPoolContribution]);

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

          return (
            <Card key={`ownerless-${pool.meta.invoiceHash}`}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{pool.meta.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {pool.meta.invoiceHash.slice(0, 14)}…
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {pool.isClosed ? "Closed" : "Open"}
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

                {activeRole === "factor" && !pool.isClosed && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full gap-1.5"
                    onClick={() => openOwnerlessContribute(pool)}
                    disabled={status !== "idle"}
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
          <div className="mb-4 space-y-2">
            <p className="text-sm font-medium">Ownerless Pools (On-Chain)</p>
            {renderOwnerlessPoolCards()}
          </div>

          {renderPoolCards("all")}
          <p className="mt-3 text-xs text-muted-foreground">
            Any active factor can create a pool and any active factor can
            contribute.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the Create a Pool button above to start a new pool.
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
