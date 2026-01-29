import { Link } from 'react-router-dom';
import { 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Users, 
  RefreshCw,
  ArrowRight,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { AddressDisplay } from '@/components/ui/address-display';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWallet } from '@/contexts/WalletContext';
import { 
  mockInvoices, 
  mockActivities, 
  formatAleo, 
  formatDate, 
  formatRelativeTime,
  getDaysUntilDue 
} from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const stats = [
  { 
    title: 'Total Invoices', 
    value: '24', 
    icon: <FileText className="h-5 w-5 text-primary" />,
    trend: { value: 12, label: 'this month' }
  },
  { 
    title: 'Total Factored', 
    value: '157,250 ALEO', 
    subtitle: '12 invoices',
    icon: <TrendingUp className="h-5 w-5 text-primary" />
  },
  { 
    title: 'Pending Requests', 
    value: '3', 
    icon: <Clock className="h-5 w-5 text-primary" />
  },
  { 
    title: 'Available to Factor', 
    value: '5', 
    icon: <CheckCircle2 className="h-5 w-5 text-primary" />
  },
];

const activityIcons = {
  created: FileText,
  factored: TrendingUp,
  settled: CheckCircle2,
  request_sent: Clock,
};

export function BusinessDashboard() {
  const { lastSyncTime, syncWallet, isSyncing } = useWallet();

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Manage your invoices and factoring requests</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncWallet} disabled={isSyncing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isSyncing && 'animate-spin')} />
            Sync Wallet
          </Button>
          <Button asChild>
            <Link to="/invoices/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Invoices Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Invoices</CardTitle>
              <CardDescription>Your recent invoice activity</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/invoices">
                View All <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead className="hidden sm:table-cell">Debtor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockInvoices.slice(0, 5).map((invoice) => {
                  const daysUntil = getDaysUntilDue(invoice.dueDate);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link 
                          to={`/invoices/${invoice.id}`} 
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <AddressDisplay address={invoice.debtorAddress} chars={4} />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAleo(invoice.amount)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col">
                          <span>{formatDate(invoice.dueDate)}</span>
                          <span className={cn(
                            'text-xs',
                            daysUntil < 7 ? 'text-destructive' : 
                            daysUntil < 30 ? 'text-warning' : 
                            'text-muted-foreground'
                          )}>
                            {daysUntil > 0 ? `${daysUntil} days` : 'Overdue'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/invoices/${invoice.id}`}>View Details</Link>
                            </DropdownMenuItem>
                            {invoice.status === 'created' && (
                              <DropdownMenuItem>Request Factoring</DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View on Explorer
                            </DropdownMenuItem>
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

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" asChild>
                <Link to="/invoices/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Invoice
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/marketplace">
                  <Users className="h-4 w-4 mr-2" />
                  Browse Factors
                </Link>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={syncWallet}
                disabled={isSyncing}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isSyncing && 'animate-spin')} />
                Sync Wallet
              </Button>
              {lastSyncTime && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Last synced: {formatRelativeTime(lastSyncTime)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockActivities.slice(0, 5).map((activity) => {
                  const Icon = activityIcons[activity.type];
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">
                          Invoice {activity.type.replace('_', ' ')}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{formatAleo(activity.amount)}</span>
                          <span>•</span>
                          <span>{formatRelativeTime(activity.timestamp)}</span>
                        </div>
                      </div>
                      <StatusBadge status={activity.status} className="shrink-0" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
