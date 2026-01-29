import { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download,
  ExternalLink,
  FileText,
  TrendingUp,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { AddressDisplay } from '@/components/ui/address-display';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { mockTransactions, formatAleo, formatDate, formatRelativeTime } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'invoice_created', label: 'Invoice Created' },
  { value: 'invoice_factored', label: 'Invoice Factored' },
  { value: 'invoice_settled', label: 'Invoice Settled' },
  { value: 'payment_received', label: 'Payment Received' },
  { value: 'payment_sent', label: 'Payment Sent' },
];

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'success', label: 'Success' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
];

const typeIcons = {
  invoice_created: FileText,
  invoice_factored: TrendingUp,
  invoice_settled: CheckCircle2,
  payment_received: ArrowDownLeft,
  payment_sent: ArrowUpRight,
};

const typeLabels = {
  invoice_created: 'Invoice Created',
  invoice_factored: 'Invoice Factored',
  invoice_settled: 'Invoice Settled',
  payment_received: 'Payment Received',
  payment_sent: 'Payment Sent',
};

export default function Transactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const filteredTransactions = mockTransactions.filter(tx => {
    if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
    if (statusFilter !== 'all' && tx.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tx.id.toLowerCase().includes(query) ||
        tx.invoiceId?.toLowerCase().includes(query) ||
        tx.counterparty?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">View your complete transaction history</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Transaction type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No transactions found
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const Icon = typeIcons[tx.type];
                const isExpanded = expandedTx === tx.id;
                
                return (
                  <Collapsible 
                    key={tx.id} 
                    open={isExpanded} 
                    onOpenChange={() => setExpandedTx(isExpanded ? null : tx.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className={cn(
                        'flex items-center justify-between p-4 rounded-lg border border-border cursor-pointer transition-colors',
                        'hover:bg-muted/50',
                        isExpanded && 'bg-muted/50 border-primary/30'
                      )}>
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                            tx.type === 'payment_received' ? 'bg-primary/10' : 'bg-muted'
                          )}>
                            <Icon className={cn(
                              'h-5 w-5',
                              tx.type === 'payment_received' ? 'text-primary' : 'text-muted-foreground'
                            )} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{typeLabels[tx.type]}</p>
                              <StatusBadge status={tx.status} />
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{formatRelativeTime(tx.timestamp)}</span>
                              {tx.invoiceId && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">{tx.invoiceId}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {tx.amount && (
                            <p className={cn(
                              'font-mono font-semibold',
                              tx.type === 'payment_received' || tx.type === 'invoice_factored'
                                ? 'text-primary'
                                : ''
                            )}>
                              {tx.type === 'payment_received' && '+'}
                              {tx.type === 'payment_sent' && '-'}
                              {formatAleo(tx.amount)}
                            </p>
                          )}
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-2 ml-14 space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-muted-foreground">Transaction ID</p>
                            <p className="font-mono">{tx.id}</p>
                          </div>
                          {tx.blockHeight && (
                            <div>
                              <p className="text-muted-foreground">Block Height</p>
                              <p className="font-mono">#{tx.blockHeight.toLocaleString()}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-muted-foreground">Timestamp</p>
                            <p>{formatDate(tx.timestamp)}</p>
                          </div>
                          {tx.gasUsed && (
                            <div>
                              <p className="text-muted-foreground">Gas Used</p>
                              <p className="font-mono">{tx.gasUsed} ALEO</p>
                            </div>
                          )}
                        </div>
                        {tx.counterparty && (
                          <div>
                            <p className="text-muted-foreground mb-1">Counterparty</p>
                            <AddressDisplay address={tx.counterparty} showExplorer />
                          </div>
                        )}
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View on Explorer
                          </Button>
                          {tx.invoiceId && (
                            <Button variant="outline" size="sm">
                              View Invoice
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
