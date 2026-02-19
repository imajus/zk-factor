import { useState } from 'react';
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
import { formatDate, getDaysUntilDue } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TransactionStatus } from '@provablehq/aleo-types';
import { PROGRAM_ID } from '@/lib/config';

interface InvoiceRecord {
  type: string;
  owner: string;
  data: {
    debtor: string;
    amount: string;
    due_date: string;
    invoice_hash: string;
    nonce: string;
    metadata: string;
  };
  plaintext: string;
  id?: string;
}

interface FactoredInvoiceRecord {
  type: string;
  owner: string;
  data: {
    original_creditor: string;
    debtor: string;
    amount: string;
    advance_amount: string;
    advance_rate: string;
    due_date: string;
    invoice_hash: string;
    recourse: string;
  };
  plaintext: string;
  id?: string;
}

function microToAleo(microcredits: string): number {
  return parseInt(microcredits.replace(/u64$/, ''), 10) / 1_000_000;
}

function unixToDate(unixSeconds: string): Date {
  return new Date(parseInt(unixSeconds.replace(/u64$/, ''), 10) * 1000);
}

export default function Invoices() {
  const queryClient = useQueryClient();
  const { isConnected, address, requestRecords, executeTransaction, transactionStatus } = useWallet();
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

  const invoiceRecords = (records as InvoiceRecord[] ?? []).filter(
    (r) => r.type === 'Invoice'
  );

  const factoredRecords = (records as FactoredInvoiceRecord[] ?? []).filter(
    (r) => r.type === 'FactoredInvoice'
  );

  const filteredInvoices = invoiceRecords
    .filter((r) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.data?.debtor?.toLowerCase().includes(q) ||
        r.data?.invoice_hash?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dueDateA = unixToDate(a.data?.due_date ?? '0u64').getTime();
      const dueDateB = unixToDate(b.data?.due_date ?? '0u64').getTime();
      const cmp = sortBy === 'amount'
        ? microToAleo(a.data?.amount ?? '0u64') - microToAleo(b.data?.amount ?? '0u64')
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

  const handleSettle = async (record: FactoredInvoiceRecord) => {
    const recordId = record.id ?? record.data.invoice_hash;
    setSettlingId(recordId);
    toast.loading('Settling invoice…', { id: 'settle-invoice' });

    try {
      const creditsRecords = await requestRecords('credits.aleo', true) as Array<{ data: { microcredits: string }; plaintext: string }>;
      const requiredAmount = parseInt(record.data.amount.replace(/u64$/, ''), 10);
      const creditsRecord = creditsRecords.find(
        (r) => parseInt((r.data?.microcredits ?? '0u64').replace(/u64$/, ''), 10) >= requiredAmount
      );

      if (!creditsRecord) {
        throw new Error('Insufficient balance for settlement');
      }

      const result = await executeTransaction({
        program: PROGRAM_ID,
        function: 'settle_invoice',
        inputs: [record.plaintext, creditsRecord.plaintext],
      });

      if (!result) throw new Error('Transaction returned no result');

      const { transactionId } = result;
      toast.loading('Broadcasting…', { id: 'settle-invoice' });

      const poll = setInterval(async () => {
        try {
          const status = await transactionStatus(transactionId);
          if (status.status === TransactionStatus.ACCEPTED) {
            clearInterval(poll);
            toast.success('Invoice settled successfully!', { id: 'settle-invoice' });
            queryClient.invalidateQueries({ queryKey: ['records', PROGRAM_ID] });
            setSettlingId(null);
          } else if (status.status === TransactionStatus.FAILED || status.status === TransactionStatus.REJECTED) {
            clearInterval(poll);
            throw new Error(status.error || 'Transaction failed');
          }
        } catch (err) {
          clearInterval(poll);
          const msg = err instanceof Error ? err.message : 'Settlement failed';
          toast.error(msg.includes('already settled') ? 'Invoice already settled' : msg, { id: 'settle-invoice' });
          setSettlingId(null);
        }
      }, 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Settlement failed', { id: 'settle-invoice' });
      setSettlingId(null);
    }
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
                    const dueDate = unixToDate(invoice.data?.due_date ?? '0u64');
                    const aleoAmount = microToAleo(invoice.data?.amount ?? '0u64');
                    const daysUntil = getDaysUntilDue(dueDate);
                    const shortHash = invoice.data?.invoice_hash?.slice(0, 12) + '…';
                    return (
                      <TableRow key={invoice.data?.invoice_hash ?? idx}>
                        <TableCell>
                          <span className="font-mono text-sm">{shortHash}</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <AddressDisplay address={invoice.data?.debtor ?? ''} chars={4} showExplorer />
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
                    const aleoAmount = microToAleo(record.data?.amount ?? '0u64');
                    const rate = parseInt((record.data?.advance_rate ?? '0u16').replace(/u16$/, ''), 10) / 100;
                    const recordId = record.id ?? record.data.invoice_hash;
                    const isSettling = settlingId === recordId;
                    return (
                      <TableRow key={record.data?.invoice_hash ?? idx}>
                        <TableCell>
                          <span className="font-mono text-sm">{record.data?.invoice_hash?.slice(0, 12)}…</span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <AddressDisplay address={record.data?.original_creditor ?? ''} chars={4} showExplorer />
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
