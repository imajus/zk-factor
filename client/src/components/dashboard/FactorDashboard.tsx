import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Percent,
  Search,
  RefreshCw,
  ExternalLink,
  MoreHorizontal,
  Receipt,
  CheckCircle,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { AddressDisplay } from "@/components/ui/address-display";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AleoNetworkClient } from "@provablehq/sdk";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PROGRAM_ID, API_ENDPOINT } from "@/lib/config";
import {
  type AleoRecord,
  getPersistedInvoiceCurrency,
  persistInvoiceCurrency,
  getField,
  microToAleo,
} from "@/lib/aleo-records";

export function FactorDashboard() {
  const queryClient = useQueryClient();
  const { isConnected, requestRecords } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settledHashes, setSettledHashes] = useState<Set<string>>(new Set());
  const pendingAcceptedCurrencyRef = useRef<{
    invoiceHash: string;
    currency: "ALEO" | "USDCx";
  } | null>(null);

  const {
    data: records,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["records", PROGRAM_ID, "factor-dashboard"],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 60_000,
  });

  const factoredRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "FactoredInvoice" && !r.spent,
  );
  const offerRecords = ((records as AleoRecord[]) ?? []).filter(
    (r) => r.recordName === "FactoringOffer" && !r.spent,
  );

  const getOfferCurrency = (record: AleoRecord): "ALEO" | "USDCx" => {
    return getField(record.recordPlaintext, "use_token") === "true"
      ? "USDCx"
      : "ALEO";
  };

  const getFactoredCurrency = (record: AleoRecord): "ALEO" | "USDCx" => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    return getPersistedInvoiceCurrency(invoiceHash) ?? "ALEO";
  };

  const portfolioValue = factoredRecords.reduce((sum, r) => {
    return sum + microToAleo(getField(r.recordPlaintext, "amount") || "0u64");
  }, 0);
  const activeCount = factoredRecords.filter(
    (r) => !settledHashes.has(getField(r.recordPlaintext, "invoice_hash")),
  ).length;

  // Check settled status for each factored record
  useEffect(() => {
    if (!factoredRecords.length) return;
    const client = new AleoNetworkClient(API_ENDPOINT);
    factoredRecords.forEach(async (record) => {
      const hash = getField(record.recordPlaintext, "invoice_hash");
      try {
        const result = await client.getProgramMappingValue(
          PROGRAM_ID,
          "settled_invoices",
          hash,
        );
        if (result) {
          setSettledHashes((prev) => new Set([...prev, hash]));
        }
      } catch {
        // not settled yet
      }
    });
  }, [factoredRecords.length]);

  useEffect(() => {
    if (status === "submitting")
      toast.loading("Generating proof…", { id: "tx-op" });
    else if (status === "pending")
      toast.loading("Broadcasting…", { id: "tx-op" });
    else if (status === "accepted") {
      if (pendingAcceptedCurrencyRef.current) {
        persistInvoiceCurrency(
          pendingAcceptedCurrencyRef.current.invoiceHash,
          pendingAcceptedCurrencyRef.current.currency,
        );
        pendingAcceptedCurrencyRef.current = null;
      }
      toast.success("Transaction confirmed!", { id: "tx-op" });
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
      setSettlingId(null);
      reset();
    } else if (status === "failed") {
      pendingAcceptedCurrencyRef.current = null;
      const msg = txError || "Transaction failed";
      toast.error(
        msg.includes("already settled") ? "Invoice already settled" : msg,
        { id: "tx-op" },
      );
      setSettlingId(null);
      reset();
    }
  }, [status, txError, queryClient, reset]);

  const handleSettle = async (record: AleoRecord) => {
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    const recordId = record.commitment ?? invoiceHash;
    setSettlingId(recordId);
    try {
      await execute({
        program: PROGRAM_ID,
        function: "settle_invoice",
        inputs: [record.recordPlaintext],
        fee: 100_000,
        privateFee: false,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Settlement failed", {
        id: "tx-op",
      });
      setSettlingId(null);
    }
  };

  const handleRequestPayment = async (record: AleoRecord) => {
    try {
      await execute({
        program: PROGRAM_ID,
        function: "create_payment_request",
        inputs: [record.recordPlaintext],
        fee: 50_000,
        privateFee: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already exists in the ledger")) {
        toast.error(
          "Already published - copy the link and send it to your debtor.",
        );
      } else {
        toast.error("Could not publish payment request. Try again.");
      }
    }
  };

  const handleAcceptOffer = async (record: AleoRecord) => {
    const recordId =
      record.commitment ?? getField(record.recordPlaintext, "invoice_hash");
    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
    const currency = getOfferCurrency(record);
    setSettlingId(recordId);

    pendingAcceptedCurrencyRef.current = { invoiceHash, currency };

    if (currency === "USDCx") {
      await execute({
        program: PROGRAM_ID,
        function: "execute_factoring_token",
        inputs: [record.recordPlaintext],
        fee: 100_000,
        privateFee: false,
      });
      return;
    }

    let creditsRecord: AleoRecord | undefined;
    try {
      const creditsRecords = (await requestRecords(
        "credits.aleo",
        true,
      )) as AleoRecord[];
      const offerAmount = parseInt(
        getField(record.recordPlaintext, "amount").replace(/u64$/, ""),
        10,
      );
      const advanceRateBps = parseInt(
        getField(record.recordPlaintext, "advance_rate").replace(/u16$/, ""),
        10,
      );
      const advanceAmount = Math.floor((offerAmount * advanceRateBps) / 10000);
      creditsRecord = creditsRecords
        .filter((r) => !r.spent)
        .find(
          (r) =>
            parseInt(
              getField(r.recordPlaintext, "microcredits").replace(/u64$/, ""),
              10,
            ) >= advanceAmount,
        );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch credits",
      );
      setSettlingId(null);
      return;
    }
    if (!creditsRecord) {
      toast.error("Insufficient credits to fund this factoring");
      setSettlingId(null);
      pendingAcceptedCurrencyRef.current = null;
      return;
    }
    await execute({
      program: PROGRAM_ID,
      function: "execute_factoring",
      inputs: [record.recordPlaintext, creditsRecord.recordPlaintext],
      fee: 100_000,
      privateFee: false,
    });
  };

  const dynamicStats = [
    {
      title: "Invoices Factored",
      value: isLoading ? "…" : String(factoredRecords.length),
      icon: <Briefcase className="h-5 w-5 text-primary" />,
    },
    {
      title: "Portfolio Value",
      value: isLoading
        ? "…"
        : portfolioValue.toLocaleString(undefined, {
            maximumFractionDigits: 2,
          }) + " Mixed",
      icon: <TrendingUp className="h-5 w-5 text-primary" />,
    },
    {
      title: "Active",
      value: isLoading ? "…" : String(activeCount),
      icon: <DollarSign className="h-5 w-5 text-primary" />,
    },
    {
      title: "Avg ROI",
      value: "-",
      icon: <Percent className="h-5 w-5 text-primary" />,
    },
  ];

  const renderPortfolioCards = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (factoredRecords.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent className="space-y-4">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">No factored invoices yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Browse the marketplace and accept offers to build your portfolio
              </p>
            </div>
            <Button asChild>
              <Link to="/marketplace">
                <Search className="h-4 w-4 mr-2" />
                Browse Invoices
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {factoredRecords.map((record, idx) => {
          const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
          const currency = getFactoredCurrency(record);
          const aleoAmount = microToAleo(
            getField(record.recordPlaintext, "amount") || "0u64",
          );
          const rate =
            parseInt(
              (
                getField(record.recordPlaintext, "advance_rate") || "0u16"
              ).replace(/u16$/, ""),
              10,
            ) / 100;
          const originalCreditor = getField(
            record.recordPlaintext,
            "original_creditor",
          );
          const recordId = record.commitment ?? invoiceHash;
          const isSettling = settlingId === recordId;
          const isSettled = settledHashes.has(invoiceHash);
          return (
            <Card
              key={invoiceHash || idx}
              className="hover:border-primary/50 transition-colors"
            >
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <span className="font-mono text-sm text-muted-foreground">
                    {invoiceHash.slice(0, 12)}…
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 -mt-1 -mr-1"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleRequestPayment(record)}
                        disabled={isSettled}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Request Payment from Debtor
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleSettle(record)}
                        disabled={isSettling || isSettled}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isSettling ? "Settling…" : "Settle"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          window.open(
                            `${import.meta.env.VITE_ALEO_EXPLORER}/transaction/${record.transactionId}`,
                            "_blank",
                          )
                        }
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Explorer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Creditor</span>
                    <AddressDisplay
                      address={originalCreditor}
                      chars={4}
                      showExplorer
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono font-medium">
                      {aleoAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      {currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span>{rate.toFixed(2)}%</span>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    isSettled
                      ? "text-green-600 border-green-300"
                      : "text-yellow-600 border-yellow-300",
                  )}
                >
                  {isSettled ? "Settled" : "Active"}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  const renderOfferCards = () => {
    if (isLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (offerRecords.length === 0) {
      return (
        <Card className="py-16 text-center">
          <CardContent>
            <p className="font-medium">No pending offers</p>
            <p className="text-sm text-muted-foreground mt-1">
              Businesses will send you factoring offers from the marketplace
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offerRecords.map((record, idx) => {
          const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
          const currency = getOfferCurrency(record);
          const aleoAmount = microToAleo(
            getField(record.recordPlaintext, "amount") || "0u64",
          );
          const rate =
            parseInt(
              getField(record.recordPlaintext, "advance_rate").replace(
                /u16$/,
                "",
              ),
              10,
            ) / 100;
          const originalCreditor = getField(
            record.recordPlaintext,
            "original_creditor",
          );
          const recordId = record.commitment ?? invoiceHash;
          const isAccepting = settlingId === recordId;
          return (
            <Card
              key={invoiceHash || idx}
              className="hover:border-primary/50 transition-colors"
            >
              <CardContent className="pt-4 space-y-3">
                <span className="font-mono text-sm text-muted-foreground">
                  {invoiceHash.slice(0, 12)}…
                </span>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Business</span>
                    <AddressDisplay
                      address={originalCreditor}
                      chars={4}
                      showExplorer
                    />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono font-medium">
                      {aleoAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 6,
                      })}{" "}
                      {currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate</span>
                    <span>{rate.toFixed(2)}%</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => handleAcceptOffer(record)}
                  disabled={isAccepting}
                >
                  <FileCheck className="h-4 w-4 mr-2" />
                  {isAccepting ? "Processing…" : "Accept Offer"}
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
          <h1 className="text-2xl font-bold">Factor Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your factoring portfolio
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/marketplace">
              <Search className="h-4 w-4 mr-2" />
              Browse Invoices
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dynamicStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Error state */}
      {isError && !records && (
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

      {/* Tabbed Sections */}
      <Tabs defaultValue="portfolio">
        <TabsList>
          <TabsTrigger value="portfolio">
            Portfolio
            {!isLoading && factoredRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({factoredRecords.length})
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="offers">
            Pending Offers
            {!isLoading && offerRecords.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                ({offerRecords.length})
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="mt-4">
          {renderPortfolioCards()}
        </TabsContent>

        <TabsContent value="offers" className="mt-4">
          {renderOfferCards()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
