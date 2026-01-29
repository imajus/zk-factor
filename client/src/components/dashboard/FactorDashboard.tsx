import { Link } from 'react-router-dom';
import { 
  Briefcase, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Search, 
  RefreshCw,
  ArrowRight,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  DollarSign,
  Percent
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { AddressDisplay } from '@/components/ui/address-display';
import { Badge } from '@/components/ui/badge';
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
import { useWallet } from '@/contexts/WalletContext';
import { formatAleo, formatDate, getDaysUntilDue } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const stats = [
  { 
    title: 'Invoices Factored', 
    value: '47', 
    icon: <Briefcase className="h-5 w-5 text-primary" />,
    trend: { value: 8, label: 'this month' }
  },
  { 
    title: 'Total Volume', 
    value: '1.25M ALEO', 
    icon: <TrendingUp className="h-5 w-5 text-primary" />,
    trend: { value: 15 }
  },
  { 
    title: 'Active Portfolio', 
    value: '285,400 ALEO', 
    subtitle: '12 invoices',
    icon: <DollarSign className="h-5 w-5 text-primary" />
  },
  { 
    title: 'Average ROI', 
    value: '11.2%', 
    icon: <Percent className="h-5 w-5 text-primary" />,
    trend: { value: 2.3 }
  },
];

// Mock incoming requests
const incomingRequests = [
  {
    id: 'req_001',
    businessAddress: 'aleo1business1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqr8mxwp',
    invoiceAmount: 25000,
    requestedRate: 90,
    dueDate: new Date('2026-03-15'),
    estimatedROI: 11.1,
    riskScore: 'Low',
  },
  {
    id: 'req_002',
    businessAddress: 'aleo1business2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqt5vk3n',
    invoiceAmount: 48000,
    requestedRate: 88,
    dueDate: new Date('2026-04-01'),
    estimatedROI: 13.6,
    riskScore: 'Medium',
  },
  {
    id: 'req_003',
    businessAddress: 'aleo1business3qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqz7mv2w',
    invoiceAmount: 12500,
    requestedRate: 92,
    dueDate: new Date('2026-02-28'),
    estimatedROI: 8.7,
    riskScore: 'Low',
  },
];

// Mock active portfolio
const activePortfolio = [
  {
    id: 'pf_001',
    invoiceNumber: 'INV-2026-003',
    originalCreditor: 'aleo1creditor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq5xye8m',
    amount: 42000,
    advancePaid: 37800,
    expectedReturn: 42000,
    profit: 4200,
    profitPercent: 11.1,
    dueDate: new Date('2026-04-01'),
    status: 'active' as const,
  },
  {
    id: 'pf_002',
    invoiceNumber: 'INV-2026-007',
    originalCreditor: 'aleo1creditor2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq8nptk6',
    amount: 85000,
    advancePaid: 76500,
    expectedReturn: 85000,
    profit: 8500,
    profitPercent: 11.1,
    dueDate: new Date('2026-02-15'),
    status: 'due_soon' as const,
  },
  {
    id: 'pf_003',
    invoiceNumber: 'INV-2026-012',
    originalCreditor: 'aleo1creditor3qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq2wxvp4',
    amount: 28500,
    advancePaid: 25650,
    expectedReturn: 28500,
    profit: 2850,
    profitPercent: 11.1,
    dueDate: new Date('2026-01-20'),
    status: 'overdue' as const,
  },
];

const riskColors = {
  'Low': 'bg-primary/10 text-primary',
  'Medium': 'bg-warning/10 text-warning',
  'High': 'bg-destructive/10 text-destructive',
};

const portfolioStatusColors = {
  'active': 'text-muted-foreground',
  'due_soon': 'text-warning',
  'overdue': 'text-destructive',
};

export function FactorDashboard() {
  const { syncWallet, isSyncing } = useWallet();

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Factor Dashboard</h1>
          <p className="text-muted-foreground">Manage your factoring portfolio and requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncWallet} disabled={isSyncing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isSyncing && 'animate-spin')} />
            Sync Wallet
          </Button>
          <Button asChild>
            <Link to="/marketplace">
              <Search className="h-4 w-4 mr-2" />
              Browse Invoices
            </Link>
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
          <AlertTriangle className="h-3 w-3" />
          2 invoices overdue
        </Badge>
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1">
          <Clock className="h-3 w-3" />
          3 due within 7 days
        </Badge>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1">
          <Briefcase className="h-3 w-3" />
          5 new requests pending
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Incoming Requests */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Incoming Requests</CardTitle>
              <CardDescription>Factoring requests awaiting review</CardDescription>
            </div>
            <Badge variant="secondary">{incomingRequests.length} pending</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incomingRequests.map((request) => {
                const daysUntil = getDaysUntilDue(request.dueDate);
                return (
                  <div 
                    key={request.id} 
                    className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AddressDisplay address={request.businessAddress} chars={4} showCopy={false} />
                        <Badge variant="outline" className={riskColors[request.riskScore as keyof typeof riskColors]}>
                          {request.riskScore}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-mono">{formatAleo(request.invoiceAmount)}</span>
                        <span>•</span>
                        <span>{request.requestedRate}% rate</span>
                        <span>•</span>
                        <span className="text-primary font-medium">{request.estimatedROI}% ROI</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Due: {formatDate(request.dueDate)} ({daysUntil} days)
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm">
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Active Portfolio */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Portfolio</CardTitle>
              <CardDescription>Your factored invoices</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/portfolio">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activePortfolio.map((item) => {
                  const daysUntil = getDaysUntilDue(item.dueDate);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.invoiceNumber}</p>
                          <AddressDisplay 
                            address={item.originalCreditor} 
                            chars={3} 
                            showCopy={false}
                            className="text-xs text-muted-foreground"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAleo(item.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="font-mono text-primary">+{formatAleo(item.profit)}</p>
                          <p className="text-xs text-muted-foreground">{item.profitPercent}%</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'text-sm',
                          portfolioStatusColors[item.status]
                        )}>
                          {daysUntil > 0 ? `${daysUntil}d` : `${Math.abs(daysUntil)}d overdue`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Contact Creditor</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {item.status === 'overdue' && (
                              <DropdownMenuItem className="text-destructive">
                                Initiate Recourse
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>Settle Invoice</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
