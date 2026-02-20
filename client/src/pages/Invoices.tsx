import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Download,
  MoreHorizontal,
  ExternalLink,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AddressDisplay } from '@/components/ui/address-display';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@/contexts/WalletContext';
import { useTransaction } from '@/hooks/use-transaction';
import { formatDate, getDaysUntilDue } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PROGRAM_ID } from '@/lib/config';

interface AleoRecord {
  recordName: string;
  owner: string;
  programName: string;
  recordPlaintext: string;
  spent: boolean;
  sender?: string;
  blockHeight?: number;
  transactionId?: string;
  commitment?: string;
  tag?: string;
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

function microToAleo(microcredits: string): number {
  return parseInt(microcredits.replace(/u64$/, ''), 10) / 1_000_000;
}

function unixToDate(unixSeconds: string): Date {
  return new Date(parseInt(unixSeconds.replace(/u64$/, ''), 10) * 1000);
}

export default function Invoices() {
  const queryClient = useQueryClient();
  const { isConnected, address, requestRecords } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const [searchQuery, setSearchQuery] = useState('');
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('invoice');
  const [sortBy, setSortBy] = useState<string>('due');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const { data: records, isLoading, isError, refetch } = useQuery({
    queryKey: ['records', PROGRAM_ID, address],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 60_000,
  });

  const invoiceRecords = (records as AleoRecord[] ?? []).filter(
    (r) => r.recordName === 'Invoice' && !r.spent
  );

  const factoredRecords = (records as AleoRecord[] ?? []).filter(
    (r) => r.recordName === 'FactoredInvoice' && !r.spent
  );

  const filteredInvoices = invoiceRecords
    .filter((r) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        getField(r.recordPlaintext, 'debtor').toLowerCase().includes(q) ||
        getField(r.recordPlaintext, 'invoice_hash').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dueDateA = unixToDate(getField(a.recordPlaintext, 'due_date') || '0u64').getTime();
      const dueDateB = unixToDate(getField(b.recordPlaintext, 'due_date') || '0u64').getTime();
      const cmp = sortBy === 'amount'
        ? microToAleo(getField(a.recordPlaintext, 'amount') || '0u64') - microToAleo(getField(b.recordPlaintext, 'amount') || '0u64')
        : dueDateA - dueDateB;
      return sortOrder === 'desc' ? -cmp : cmp;
    });

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    if (status === 'pending') toast.loading('Broadcasting…', { id: 'settle-invoice' });
    if (status === 'accepted') {
      toast.success('Invoice settled successfully!', { id: 'settle-invoice' });
      queryClient.invalidateQueries({ queryKey: ['records', PROGRAM_ID] });
      setSettlingId(null);
      reset();
    }
    if (status === 'failed') {
      const msg = txError || 'Settlement failed';
      toast.error(msg.includes('already settled') ? 'Invoice already settled' : msg, { id: 'settle-invoice' });
      setSettlingId(null);
      reset();
    }
  }, [status, txError, queryClient, reset]);

  const handleSettle = async (record: AleoRecord) => {
    const invoiceHash = getField(record.recordPlaintext, 'invoice_hash');
    const recordId = record.commitment ?? invoiceHash;
    setSettlingId(recordId);
    toast.loading('Settling invoice…', { id: 'settle-invoice' });

    let creditsRecord: AleoRecord | undefined;
    try {
      const creditsRecords = await requestRecords('credits.aleo', true) as AleoRecord[];
      const requiredAmount = parseInt(getField(record.recordPlaintext, 'amount').replace(/u64$/, ''), 10);
      creditsRecord = creditsRecords.find(
        (r) => parseInt(getField(r.recordPlaintext, 'microcredits').replace(/u64$/, ''), 10) >= requiredAmount
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to fetch credits', { id: 'settle-invoice' });
      setSettlingId(null);
      return;
    }

    if (!creditsRecord) {
      toast.error('Insufficient balance for settlement', { id: 'settle-invoice' });
      setSettlingId(null);
      return;
    }

    await execute({
      program: PROGRAM_ID,
      function: 'settle_invoice',
      inputs: [record.recordPlaintext, creditsRecord.recordPlaintext],
    });
  };

  if (!isConnected) {
    return (
      <div className="container py-6">
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <p className="text-lg text-muted-foreground">Connect your wallet to view invoices</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-muted-foreground">Manage and track your invoices</p>
        </div>
        <Button asChild>
          <Link to="/invoices/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Link>
        </Button>
      </div>

      {/* Record Type Tabs */}
      <div className="flex gap-2">
        <Button
          variant={recordTypeFilter === 'invoice' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRecordTypeFilter('invoice')}
        >
          Invoices ({invoiceRecords.length})
        </Button>
        <Button
          variant={recordTypeFilter === 'factored' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRecordTypeFilter('factored')}
        >
          Factored ({factoredRecords.length})
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

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

      {/* Invoices Table */}
      {recordTypeFilter === 'invoice' && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice Records</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading…' : `${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? 's' : ''} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hash</TableHead>
                  <TableHead className="hidden md:table-cell">Debtor</TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-3 h-8 hover:bg-transparent" onClick={() => toggleSort('amount')}>
                      Amount <ArrowUpDown className="h-3 w-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    <Button variant="ghost" size="sm" className="-ml-3 h-8 hover:bg-transparent" onClick={() => toggleSort('due')}>
                      Due Date <ArrowUpDown className="h-3 w-3 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      No invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice, idx) => {
                    const invoiceHash = getField(invoice.recordPlaintext, 'invoice_hash');
                    const dueDate = unixToDate(getField(invoice.recordPlaintext, 'due_date') || '0u64');
                    const aleoAmount = microToAleo(getField(invoice.recordPlaintext, 'amount') || '0u64');
                    const debtor = getField(invoice.recordPlaintext, 'debtor');
                    const daysUntil = getDaysUntilDue(dueDate);
                    const shortHash = invoiceHash.slice(0, 12) + '…';
                    return (
                      <TableRow key={invoiceHash || idx}>
                        <TableCell>
                          <span className="font-mono text-sm">{shortHash}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <AddressDisplay address={debtor} chars={4} showExplorer />
                        </TableCell>
                        <TableCell className="font-mono">
                          {aleoAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ALEO
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-col">
                            <span>{formatDate(dueDate)}</span>
                            <span className={cn(
                              'text-xs',
                              daysUntil < 0 ? 'text-destructive' :
                              daysUntil < 7 ? 'text-warning' :
                              'text-muted-foreground'
                            )}>
                              {daysUntil > 0 ? `${daysUntil} days` : daysUntil === 0 ? 'Due today' : `${Math.abs(daysUntil)} days overdue`}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View on Explorer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Factored Invoices */}
      {recordTypeFilter === 'factored' && (
        <Card>
          <CardHeader>
            <CardTitle>Factored Invoice Records</CardTitle>
            <CardDescription>
              {isLoading ? 'Loading…' : `${factoredRecords.length} factored invoice${factoredRecords.length !== 1 ? 's' : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hash</TableHead>
                  <TableHead className="hidden md:table-cell">Creditor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden sm:table-cell">Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : factoredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No factored invoices found
                    </TableCell>
                  </TableRow>
                ) : (
                  factoredRecords.map((record, idx) => {
                    const invoiceHash = getField(record.recordPlaintext, 'invoice_hash');
                    const aleoAmount = microToAleo(getField(record.recordPlaintext, 'amount') || '0u64');
                    const rate = parseInt((getField(record.recordPlaintext, 'advance_rate') || '0u16').replace(/u16$/, ''), 10) / 100;
                    const originalCreditor = getField(record.recordPlaintext, 'original_creditor');
                    const recordId = record.commitment ?? invoiceHash;
                    const isSettling = settlingId === recordId;
                    return (
                      <TableRow key={invoiceHash || idx}>
                        <TableCell>
                          <span className="font-mono text-sm">{invoiceHash.slice(0, 12)}…</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <AddressDisplay address={originalCreditor} chars={4} showExplorer />
                        </TableCell>
                        <TableCell className="font-mono">
                          {aleoAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })} ALEO
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {rate.toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">Pending</Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleSettle(record)}
                                disabled={isSettling}
                              >
                                {isSettling ? 'Settling…' : 'Settle'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View on Explorer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
