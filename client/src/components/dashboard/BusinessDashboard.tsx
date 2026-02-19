import { Link } from 'react-router-dom';
import {
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  Plus,
  Users,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/contexts/WalletContext';

const PROGRAM_ID = 'zk_factor_11765.aleo';

const stats = [
  {
    title: 'Total Invoices',
    value: '—',
    icon: <FileText className="h-5 w-5 text-primary" />,
  },
  {
    title: 'Total Factored',
    value: '—',
    icon: <TrendingUp className="h-5 w-5 text-primary" />,
  },
  {
    title: 'Pending Requests',
    value: '—',
    icon: <Clock className="h-5 w-5 text-primary" />,
  },
  {
    title: 'Available to Factor',
    value: '—',
    icon: <CheckCircle2 className="h-5 w-5 text-primary" />,
  },
];

export function BusinessDashboard() {
  const { requestRecords, isConnected } = useWallet();

  const { data: records, isLoading } = useQuery({
    queryKey: ['records', PROGRAM_ID, 'dashboard'],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 60_000,
  });

  const invoiceCount = (records as Array<{ type: string }> ?? []).filter((r) => r.type === 'Invoice').length;
  const factoredCount = (records as Array<{ type: string }> ?? []).filter((r) => r.type === 'FactoredInvoice').length;

  const dynamicStats = [
    { ...stats[0], value: isLoading ? '…' : String(invoiceCount) },
    { ...stats[1], value: isLoading ? '…' : String(factoredCount) },
    { ...stats[2], value: '—' },
    { ...stats[3], value: isLoading ? '…' : String(invoiceCount) },
  ];

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Manage your invoices and factoring requests</p>
        </div>
        <div className="flex gap-2">
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
        {dynamicStats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get started</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/invoices/create">
              <Plus className="h-4 w-4 mr-2" />
              Create New Invoice
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/invoices">
              <FileText className="h-4 w-4 mr-2" />
              View Invoices
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/marketplace">
              <Users className="h-4 w-4 mr-2" />
              Browse Factors
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
