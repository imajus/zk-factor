import { useState, useEffect } from 'react';
import {
  Search,
  Users,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AddressDisplay } from '@/components/ui/address-display';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/contexts/WalletContext';
import { useTransaction } from '@/hooks/use-transaction';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PROGRAM_ID, API_ENDPOINT, NETWORK } from '@/lib/config';

interface FactorInfo {
  address: string;
  is_active: boolean;
  min_advance_rate: number;
  max_advance_rate: number;
  total_factored: number;
  registration_date: number;
}

interface AleoRecord {
  recordName: string;
  recordPlaintext: string;
  spent: boolean;
  commitment: string;
  owner: string;
  sender: string;
  programName: string;
  blockHeight?: number;
  transactionId?: string;
}

function getField(plaintext: string, field: string): string {
  for (const line of plaintext.split('\n')) {
    const trimmed = line.trimStart();
    if (!trimmed.startsWith(`${field}:`)) continue;
    const m = trimmed.match(/^[^:]+:\s*(.+?)\.(?:private|public)/);
    if (m) return m[1].trim();
  }
  return '';
}

async function fetchActiveFactors(): Promise<FactorInfo[]> {
  const url = `${API_ENDPOINT}/${NETWORK}/program/${PROGRAM_ID}/mapping/active_factors`;
  const res = await fetch(url);
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`Explorer API error: ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data
    .map((entry: { key: string; value: Record<string, unknown> }) => ({
      address: entry.key,
      is_active: Boolean(entry.value?.is_active),
      min_advance_rate: parseInt(String(entry.value?.min_advance_rate ?? '0').replace(/u16$/, ''), 10),
      max_advance_rate: parseInt(String(entry.value?.max_advance_rate ?? '0').replace(/u16$/, ''), 10),
      total_factored: parseInt(String(entry.value?.total_factored ?? '0').replace(/u64$/, ''), 10),
      registration_date: parseInt(String(entry.value?.registration_date ?? '0').replace(/u64$/, ''), 10),
    }))
    .filter((f) => f.is_active);
}

export default function Marketplace() {
  const queryClient = useQueryClient();
  const { isConnected, requestRecords } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const isFactoring = status !== 'idle';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFactor, setSelectedFactor] = useState<FactorInfo | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
  const [advanceRateInput, setAdvanceRateInput] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: factors, isLoading: factorsLoading, isError: factorsError, refetch: refetchFactors } = useQuery({
    queryKey: ['active_factors'],
    queryFn: fetchActiveFactors,
    staleTime: 60_000,
    retry: false,
  });

  const { data: records } = useQuery({
    queryKey: ['records', PROGRAM_ID, 'invoices'],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 60_000,
  });

  const invoiceRecords = (records as AleoRecord[] ?? []).filter(
    (r) => r.recordName === 'Invoice' && !r.spent,
  );

  const filteredFactors = (factors ?? []).filter((f) => {
    if (!searchQuery) return true;
    return f.address.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const advanceRateBps = advanceRateInput ? parseInt(advanceRateInput, 10) : 0;
  const advanceRateValid = advanceRateBps >= 5000 && advanceRateBps <= 9900;

  useEffect(() => {
    if (status === 'pending') toast.loading('Broadcasting…', { id: 'factor-invoice' });
    if (status === 'accepted') {
      toast.success('Invoice factored successfully!', { id: 'factor-invoice' });
      queryClient.invalidateQueries({ queryKey: ['records', PROGRAM_ID] });
      setDialogOpen(false);
      reset();
    }
    if (status === 'failed') {
      toast.error(txError || 'Factoring failed', { id: 'factor-invoice' });
      reset();
    }
  }, [status, txError, queryClient, reset]);

  const handleFactorInvoice = async () => {
    if (!selectedFactor || !selectedInvoiceId || !advanceRateValid) return;

    const invoice = invoiceRecords.find((r) => r.commitment === selectedInvoiceId);
    if (!invoice) return;

    toast.loading('Generating proof…', { id: 'factor-invoice' });

    let creditsRecord: AleoRecord | undefined;
    try {
      const creditsRecords = (await requestRecords('credits.aleo', true) as AleoRecord[])
        .filter((r) => !r.spent);
      const invoiceAmount = parseInt(getField(invoice.recordPlaintext, 'amount').replace(/u64$/, ''), 10);
      const advanceAmount = Math.floor((invoiceAmount * advanceRateBps) / 10000);
      creditsRecord = creditsRecords.find(
        (r) => parseInt(getField(r.recordPlaintext, 'microcredits').replace(/u64$/, ''), 10) >= advanceAmount,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch credits', { id: 'factor-invoice' });
      return;
    }

    if (!creditsRecord) {
      toast.error('Insufficient credits balance to fund this factoring', { id: 'factor-invoice' });
      return;
    }

    await execute({
      program: PROGRAM_ID,
      function: 'factor_invoice',
      inputs: [
        invoice.recordPlaintext,
        selectedFactor.address,
        `${advanceRateBps}u16`,
        creditsRecord.recordPlaintext,
      ],
      fee: 100_000,
      privateFee: false,
    });
  };

  return (
    <div className="container py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Browse Factors</h1>
        <p className="text-muted-foreground">Find the best factoring terms for your invoices</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <Card className="lg:col-span-1 h-fit sticky top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">Filters</CardTitle>
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
            <Button variant="outline" className="w-full" onClick={() => refetchFactors()}>
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
                <p className="text-sm text-destructive">Failed to load factors from chain.</p>
                <Button variant="outline" size="sm" onClick={() => refetchFactors()}>Retry</Button>
              </CardContent>
            </Card>
          )}

          {/* Results Count */}
          <p className="text-sm text-muted-foreground">
            {factorsLoading ? 'Loading factors…' : `${filteredFactors.length} active factor${filteredFactors.length !== 1 ? 's' : ''}`}
          </p>

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
                <Card className="p-12 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active factors registered</h3>
                  <p className="text-muted-foreground">
                    No factors are currently registered on the network
                  </p>
                </Card>
              </div>
            ) : (
              filteredFactors.map((factor) => (
                <Card key={factor.address} className="hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="space-y-1">
                      <CardTitle className="text-base">Anonymous Factor</CardTitle>
                      <AddressDisplay address={factor.address} chars={4} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Min Rate</p>
                        <p className="font-semibold text-primary">{(factor.min_advance_rate / 100).toFixed(2)}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Max Rate</p>
                        <p className="font-semibold text-primary">{(factor.max_advance_rate / 100).toFixed(2)}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Invoices Factored</p>
                        <p className="font-semibold">{factor.total_factored.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge variant="outline" className="text-xs text-primary border-primary/30">Active</Badge>
                      </div>
                    </div>

                    {isConnected && (
                      <Dialog open={dialogOpen && selectedFactor?.address === factor.address} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (open) {
                          setSelectedFactor(factor);
                          setSelectedInvoiceId('');
                          setAdvanceRateInput('');
                        }
                      }}>
                        <DialogTrigger asChild>
                          <Button className="w-full">Factor Invoice</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Factor Invoice</DialogTitle>
                            <DialogDescription>
                              Sell your invoice to this factor at an agreed advance rate.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <Label>Factor</Label>
                              <AddressDisplay address={factor.address} showExplorer />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="invoice-select">Select Invoice</Label>
                              <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose an invoice…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {invoiceRecords.length === 0 ? (
                                    <SelectItem value="_none" disabled>No invoices available</SelectItem>
                                  ) : (
                                    invoiceRecords.map((r) => {
                                      const hash = getField(r.recordPlaintext, 'invoice_hash');
                                      const amount = (parseInt(getField(r.recordPlaintext, 'amount').replace(/u64$/, ''), 10) / 1_000_000).toFixed(6);
                                      return (
                                        <SelectItem key={r.commitment} value={r.commitment}>
                                          {hash.slice(0, 12)}… — {amount} ALEO
                                        </SelectItem>
                                      );
                                    })
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="advance-rate">
                                Advance Rate (basis points, 5000–9900)
                              </Label>
                              <Input
                                id="advance-rate"
                                type="number"
                                placeholder="e.g. 9000 for 90%"
                                value={advanceRateInput}
                                onChange={(e) => setAdvanceRateInput(e.target.value)}
                                min="5000"
                                max="9900"
                              />
                              {advanceRateInput && (
                                <p className={cn('text-xs', advanceRateValid ? 'text-muted-foreground' : 'text-destructive')}>
                                  {advanceRateValid
                                    ? `${(advanceRateBps / 100).toFixed(2)}% advance rate`
                                    : 'Rate must be between 5000 and 9900 basis points'}
                                </p>
                              )}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button
                              onClick={handleFactorInvoice}
                              disabled={!selectedInvoiceId || !advanceRateValid || isFactoring || selectedInvoiceId === '_none'}
                            >
                              {isFactoring ? 'Processing…' : 'Confirm'}
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
        </div>
      </div>
    </div>
  );
}
