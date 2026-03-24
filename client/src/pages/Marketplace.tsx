import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Users,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Plus,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressDisplay } from "@/components/ui/address-display";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PROGRAM_ID } from "@/lib/config";
import {
  type AleoRecord,
  decodeInvoiceCurrencyFromMetadata,
  getField,
  getPersistedInvoiceCurrency,
} from "@/lib/aleo-records";
import { type FactorInfo, fetchActiveFactors } from "@/lib/aleo-factors";
import { buildCreatePoolInputs } from "@/lib/aleo-factors";
import {
  listPoolDirectory,
  type PoolDirectoryEntry,
  upsertPoolCreation,
} from "@/lib/pool-directory";

export default function Marketplace() {
  const queryClient = useQueryClient();
  const { isConnected, requestRecords, activeRole, address } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const isFactoring = status !== "idle";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFactor, setSelectedFactor] = useState<FactorInfo | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [advanceRateInput, setAdvanceRateInput] = useState<string>("");
  const [partialAmountInput, setPartialAmountInput] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [poolDialogOpen, setPoolDialogOpen] = useState(false);
  const [createPoolDialogOpen, setCreatePoolDialogOpen] = useState(false);
  const [poolInvoiceHash, setPoolInvoiceHash] = useState("");
  const [poolTargetAleo, setPoolTargetAleo] = useState("");
  const [selectedPool, setSelectedPool] = useState<PoolDirectoryEntry | null>(
    null,
  );
  const pendingActionRef = useRef<"factor" | "create-pool" | null>(null);
  const pendingPoolCreateRef = useRef<{
    invoiceHash: string;
    owner: string;
    targetAmountMicro: number;
  } | null>(null);

  const {
    data: factors,
    isLoading: factorsLoading,
    isError: factorsError,
    refetch: refetchFactors,
  } = useQuery({
    queryKey: ["active_factors"],
    queryFn: fetchActiveFactors,
    staleTime: 60_000,
    retry: false,
  });

  const { data: records } = useQuery({
    queryKey: ["records", PROGRAM_ID, "invoices"],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 60_000,
  });

  const invoiceRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "Invoice" && !r.spent,
  );

  const getInvoiceSelectionId = (record: AleoRecord): string => {
    const hash = getField(record.recordPlaintext, "invoice_hash");
    return record.commitment ?? hash;
  };

  const filteredFactors = (factors ?? []).filter((f) => {
    if (!searchQuery) return true;
    return f.address.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const parseInvoiceAmountMicro = (record: AleoRecord): number => {
    return parseInt(
      getField(record.recordPlaintext, "amount").replace(/u64$/, ""),
      10,
    );
  };

  const advanceRateBps = advanceRateInput ? parseInt(advanceRateInput, 10) : 0;
  const advanceRateValid = advanceRateBps >= 5000 && advanceRateBps <= 9900;
  const selectedInvoiceRecord = invoiceRecords.find(
    (r) => getInvoiceSelectionId(r) === selectedInvoiceId,
  );
  const selectedInvoiceAmountMicro = selectedInvoiceRecord
    ? parseInvoiceAmountMicro(selectedInvoiceRecord)
    : 0;
  const partialAmountMicro = partialAmountInput
    ? Math.round(parseFloat(partialAmountInput) * 1_000_000)
    : 0;
  const wantsPartial = partialAmountInput.trim().length > 0;
  const partialAmountValid =
    !wantsPartial ||
    (Number.isFinite(partialAmountMicro) &&
      partialAmountMicro > 0 &&
      partialAmountMicro < selectedInvoiceAmountMicro);
  const poolEntries = listPoolDirectory();
  const openPoolEntries = poolEntries.filter((p) => !p.isClosed);

  const factorByAddress = new Map((factors ?? []).map((f) => [f.address, f]));

  const getInvoiceCurrency = (record: AleoRecord): "ALEO" | "USDCx" => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    const metadata = getField(record.recordPlaintext, "metadata");
    const fromMetadata = decodeInvoiceCurrencyFromMetadata(metadata);
    // Backward compatibility for invoices minted before metadata flagging.
    const cached = getPersistedInvoiceCurrency(invoiceHash);
    return cached ?? fromMetadata;
  };

  useEffect(() => {
    const opId = "marketplace-op";
    const pendingAction = pendingActionRef.current;

    if (status === "submitting")
      toast.loading("Generating proof…", { id: opId });
    else if (status === "pending") toast.loading("Broadcasting…", { id: opId });
    else if (status === "accepted") {
      if (pendingAction === "factor") {
        toast.success("Invoice factored successfully!", { id: opId });
        setDialogOpen(false);
      }

      if (pendingAction === "create-pool" && pendingPoolCreateRef.current) {
        upsertPoolCreation(pendingPoolCreateRef.current);
        pendingPoolCreateRef.current = null;
        toast.success("Pool created successfully!", { id: opId });
        setCreatePoolDialogOpen(false);
        setPoolInvoiceHash("");
        setPoolTargetAleo("");
      }

      pendingActionRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
      reset();
    } else if (status === "failed") {
      pendingPoolCreateRef.current = null;

      const defaultMessage =
        pendingActionRef.current === "create-pool"
          ? "Pool creation failed"
          : "Factoring failed";
      toast.error(txError || defaultMessage, { id: opId });

      pendingActionRef.current = null;
      reset();
    }
  }, [status, txError, queryClient, reset]);

  const handleFactorInvoice = async () => {
    if (
      !selectedFactor ||
      !selectedInvoiceId ||
      !advanceRateValid ||
      !partialAmountValid
    )
      return;

    const invoice = invoiceRecords.find(
      (r) => getInvoiceSelectionId(r) === selectedInvoiceId,
    );
    if (!invoice) return;
    const currency = getInvoiceCurrency(invoice);
    const useToken = currency === "USDCx";
    const invoiceAmountMicro = parseInvoiceAmountMicro(invoice);
    const usePartial = wantsPartial && partialAmountMicro < invoiceAmountMicro;
    const functionName = usePartial
      ? "authorize_partial_factoring"
      : "authorize_factoring";

    pendingActionRef.current = "factor";

    await execute({
      program: PROGRAM_ID,
      function: functionName,
      inputs: usePartial
        ? [
          invoice.recordPlaintext,
          selectedFactor.address,
          `${partialAmountMicro}u64`,
          `${advanceRateBps}u16`,
          useToken ? "true" : "false",
          "false",
        ]
        : [
          invoice.recordPlaintext,
          selectedFactor.address,
          `${advanceRateBps}u16`,
          useToken ? "true" : "false",
          "false",
        ],
      fee: 100_000,
      privateFee: false,
    });
  };

  const handleCreatePool = async () => {
    if (!isFactor) return;
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }

    const invoiceHash = poolInvoiceHash.trim();
    const targetAleo = parseFloat(poolTargetAleo);

    if (!invoiceHash || Number.isNaN(targetAleo) || targetAleo <= 0) {
      toast.error("Provide valid invoice hash and target amount.");
      return;
    }

    const targetMicro = Math.round(targetAleo * 1_000_000);
    pendingActionRef.current = "create-pool";
    pendingPoolCreateRef.current = {
      invoiceHash,
      owner: address,
      targetAmountMicro: targetMicro,
    };

    await execute({
      program: PROGRAM_ID,
      function: "create_pool",
      inputs: buildCreatePoolInputs(invoiceHash, BigInt(targetMicro)),
      fee: 80_000,
      privateFee: false,
    });
  };

  const isFactor = activeRole === "factor";

  const formatMicroToAleo = (micro: number): string => {
    return (micro / 1_000_000).toLocaleString(undefined, {
      maximumFractionDigits: 6,
    });
  };

  return (
    <div className="container py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {isFactor ? "Invoice Marketplace" : "Browse Factors"}
        </h1>
        <p className="text-muted-foreground flex flex-wrap items-center gap-2">
          {isFactor
            ? "View registered factors and available factoring opportunities"
            : "Find the best factoring terms for your invoices"}
          <a href="/docs/factor/marketplace" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Info className="h-3 w-3" /> Learn more
          </a>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <Card className="lg:col-span-1 h-fit sticky top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search by address</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="aleo1…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => refetchFactors()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-4">
          {/* Error state */}
          {factorsError && (
            <Card className="border-destructive/50">
              <CardContent className="pt-6 flex items-center gap-4">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">
                  Failed to load factors from chain.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchFactors()}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Results Count */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {factorsLoading
                ? "Loading factors…"
                : `${filteredFactors.length} active factor${filteredFactors.length !== 1 ? "s" : ""}`}
            </p>

            {isFactor && (
              <Dialog
                open={createPoolDialogOpen}
                onOpenChange={setCreatePoolDialogOpen}
              >
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
                      Create a pool deal in marketplace so other factors can
                      join.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="pool-invoice-hash">Invoice Hash</Label>
                      <Input
                        id="pool-invoice-hash"
                        value={poolInvoiceHash}
                        onChange={(e) => setPoolInvoiceHash(e.target.value)}
                        placeholder="12345field"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pool-target">Target Amount (ALEO)</Label>
                      <Input
                        id="pool-target"
                        type="number"
                        min="0"
                        step="0.000001"
                        value={poolTargetAleo}
                        onChange={(e) => setPoolTargetAleo(e.target.value)}
                        placeholder="100.0"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCreatePoolDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreatePool}
                      disabled={
                        isFactoring || !poolInvoiceHash || !poolTargetAleo
                      }
                    >
                      {isFactoring ? "Processing…" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {openPoolEntries.length > 0 && (
            <>
              <p className="text-sm font-medium">Open Pool Opportunities</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {openPoolEntries.map((pool) => {
                  const owner = factorByAddress.get(pool.owner);
                  return (
                    <Card
                      key={`pool-${pool.invoiceHash}`}
                      className="border-blue-300/60 bg-blue-50/40 dark:bg-blue-950/20"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            Invoice Pool
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className="text-xs text-blue-700 border-blue-400"
                          >
                            Pool
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">
                              Invoice Hash
                            </span>
                            <span className="font-mono text-xs">
                              {pool.invoiceHash.slice(0, 14)}…
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">
                              Pool Owner
                            </span>
                            <AddressDisplay address={pool.owner} chars={4} />
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">
                              Target
                            </span>
                            <span className="font-medium">
                              {formatMicroToAleo(pool.targetAmountMicro)} ALEO
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">
                              Contributors
                            </span>
                            <span>{pool.participants.length}</span>
                          </div>
                        </div>

                        {owner && (
                          <p className="text-xs text-muted-foreground">
                            Owner rates:{" "}
                            {(owner.min_advance_rate / 100).toFixed(2)}% -{" "}
                            {(owner.max_advance_rate / 100).toFixed(2)}%
                          </p>
                        )}

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setSelectedPool(pool);
                            setPoolDialogOpen(true);
                          }}
                        >
                          View Pool Details
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}

          {/* Factor Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {factorsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-32 mt-1" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : filteredFactors.length === 0 ? (
              <div className="col-span-2">
                <Card className="border-dashed">
                  <CardContent className="py-16 text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">
                        No active factors yet
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Be the first to register as a factor on the network and
                        start purchasing invoices.
                      </p>
                    </div>
                    <Button asChild>
                      <Link to="/settings">
                        Register as Factor
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              filteredFactors.map((factor) => (
                <Card
                  key={factor.address}
                  className="hover:border-primary/50 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        Anonymous Factor
                      </CardTitle>
                      <AddressDisplay address={factor.address} chars={4} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Min Rate
                        </p>
                        <p className="font-semibold text-primary">
                          {(factor.min_advance_rate / 100).toFixed(2)}%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Max Rate
                        </p>
                        <p className="font-semibold text-primary">
                          {(factor.max_advance_rate / 100).toFixed(2)}%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Invoices Factored
                        </p>
                        <p className="font-semibold">
                          {factor.total_factored.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge
                          variant="outline"
                          className="text-xs text-primary border-primary/30"
                        >
                          Active
                        </Badge>
                      </div>
                    </div>

                    {isConnected && (
                      <Dialog
                        open={
                          dialogOpen &&
                          selectedFactor?.address === factor.address
                        }
                        onOpenChange={(open) => {
                          setDialogOpen(open);
                          if (open) {
                            setSelectedFactor(factor);
                            setSelectedInvoiceId("");
                            setAdvanceRateInput("");
                            setPartialAmountInput("");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            {isFactor ? "View Details" : "Factor Invoice"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Factor Invoice</DialogTitle>
                            <DialogDescription>
                              Sell your invoice to this factor at an agreed
                              advance rate.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <Label>Factor</Label>
                              <AddressDisplay
                                address={factor.address}
                                showExplorer
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="invoice-select">
                                Select Invoice
                              </Label>
                              <Select
                                value={selectedInvoiceId}
                                onValueChange={setSelectedInvoiceId}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose an invoice…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {invoiceRecords.length === 0 ? (
                                    <SelectItem value="_none" disabled>
                                      No invoices available
                                    </SelectItem>
                                  ) : (
                                    invoiceRecords.map((r) => {
                                      const hash = getField(
                                        r.recordPlaintext,
                                        "invoice_hash",
                                      );
                                      const selectionId =
                                        getInvoiceSelectionId(r);
                                      const currency = getInvoiceCurrency(r);
                                      const amount = (
                                        parseInt(
                                          getField(
                                            r.recordPlaintext,
                                            "amount",
                                          ).replace(/u64$/, ""),
                                          10,
                                        ) / 1_000_000
                                      ).toFixed(6);
                                      return (
                                        <SelectItem
                                          key={selectionId}
                                          value={selectionId}
                                        >
                                          {hash.slice(0, 12)}… - {amount}{" "}
                                          {currency}
                                        </SelectItem>
                                      );
                                    })
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="partial-amount">
                                Optional Partial Amount (ALEO/USDCx)
                              </Label>
                              <Input
                                id="partial-amount"
                                type="number"
                                min="0"
                                step="0.000001"
                                placeholder="Leave empty to factor full invoice"
                                value={partialAmountInput}
                                onChange={(e) =>
                                  setPartialAmountInput(e.target.value)
                                }
                              />
                              {wantsPartial && (
                                <p
                                  className={cn(
                                    "text-xs",
                                    partialAmountValid
                                      ? "text-muted-foreground"
                                      : "text-destructive",
                                  )}
                                >
                                  {partialAmountValid
                                    ? "Remainder stays with the creditor as a new invoice record."
                                    : "Partial amount must be greater than 0 and less than invoice amount."}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="advance-rate">
                                Advance Rate (basis points,{" "}
                                {selectedFactor?.min_advance_rate || 5000}–
                                {selectedFactor?.max_advance_rate || 9900})
                              </Label>
                              <Input
                                id="advance-rate"
                                type="number"
                                placeholder={`e.g. ${selectedFactor?.max_advance_rate || 9000} for ${(selectedFactor?.max_advance_rate || 9000) / 100}%`}
                                min={selectedFactor?.min_advance_rate || 5000}
                                max={selectedFactor?.max_advance_rate || 9900}
                                value={advanceRateInput}
                                onChange={(e) =>
                                  setAdvanceRateInput(e.target.value)
                                }
                              />
                              {advanceRateInput && (
                                <p
                                  className={cn(
                                    "text-xs",
                                    advanceRateValid
                                      ? "text-muted-foreground"
                                      : "text-destructive",
                                  )}
                                >
                                  {advanceRateValid
                                    ? `${(advanceRateBps / 100).toFixed(2)}% advance rate`
                                    : "Rate must be between 5000 and 9900 basis points"}
                                </p>
                              )}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleFactorInvoice}
                              disabled={
                                !selectedInvoiceId ||
                                !advanceRateValid ||
                                !partialAmountValid ||
                                isFactoring ||
                                selectedInvoiceId === "_none"
                              }
                            >
                              {isFactoring ? "Processing…" : "Confirm"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Dialog open={poolDialogOpen} onOpenChange={setPoolDialogOpen}>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Pool Details</DialogTitle>
                <DialogDescription>
                  Pool participation is open to all active factors.
                </DialogDescription>
              </DialogHeader>

              {selectedPool && (
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-muted-foreground">Invoice Hash</p>
                      <p className="font-mono text-xs break-all">
                        {selectedPool.invoiceHash}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Target Amount</p>
                      <p>
                        {formatMicroToAleo(selectedPool.targetAmountMicro)} ALEO
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-muted-foreground mb-1">Pool Owner</p>
                    <AddressDisplay
                      address={selectedPool.owner}
                      chars={6}
                      showExplorer
                    />
                    {factorByAddress.get(selectedPool.owner) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Factored:{" "}
                        {factorByAddress
                          .get(selectedPool.owner)
                          ?.total_factored.toLocaleString()}{" "}
                        | Rate range:{" "}
                        {(
                          factorByAddress.get(selectedPool.owner)!
                            .min_advance_rate / 100
                        ).toFixed(2)}
                        % -{" "}
                        {(
                          factorByAddress.get(selectedPool.owner)!
                            .max_advance_rate / 100
                        ).toFixed(2)}
                        %
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-muted-foreground mb-2">
                      Contributing Factors
                    </p>
                    {selectedPool.participants.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No contributions recorded yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedPool.participants.map((participant) => {
                          const factor = factorByAddress.get(
                            participant.address,
                          );
                          return (
                            <div
                              key={`${selectedPool.invoiceHash}-${participant.address}`}
                              className="rounded-md border p-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <AddressDisplay
                                  address={participant.address}
                                  chars={5}
                                  showExplorer
                                />
                                <span className="font-medium">
                                  {formatMicroToAleo(
                                    participant.contributedMicro,
                                  )}{" "}
                                  ALEO
                                </span>
                              </div>
                              {factor && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Active factor | Factored:{" "}
                                  {factor.total_factored.toLocaleString()} |
                                  Range:{" "}
                                  {(factor.min_advance_rate / 100).toFixed(2)}%
                                  - {(factor.max_advance_rate / 100).toFixed(2)}
                                  %
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
