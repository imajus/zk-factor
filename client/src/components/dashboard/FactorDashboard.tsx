import { Link } from 'react-router-dom';
import {
  Briefcase,
  TrendingUp,
  DollarSign,
  Percent,
  Search,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@/contexts/WalletContext';

const PROGRAM_ID = 'zk_factor_11765.aleo';

const statTemplates = [
  {
    title: 'Invoices Factored',
    icon: <Briefcase className="h-5 w-5 text-primary" />,
  },
  {
    title: 'Total Volume',
    icon: <TrendingUp className="h-5 w-5 text-primary" />,
  },
  {
    title: 'Active Portfolio',
    icon: <DollarSign className="h-5 w-5 text-primary" />,
  },
  {
    title: 'Average ROI',
    icon: <Percent className="h-5 w-5 text-primary" />,
  },
];

export function FactorDashboard() {
  const { requestRecords, isConnected } = useWallet();

  const { data: records, isLoading } = useQuery({
    queryKey: ['records', PROGRAM_ID, 'factor-dashboard'],
    queryFn: () => requestRecords(PROGRAM_ID, true),
    enabled: isConnected,
    staleTime: 60_000,
  });

  const factoredCount = (records as Array<{ recordName: string; spent: boolean }> ?? []).filter((r) => r.recordName === 'FactoredInvoice' && !r.spent).length;

  const dynamicStats = [
    { ...statTemplates[0], value: isLoading ? '…' : String(factoredCount) },
    { ...statTemplates[1], value: '—' },
    { ...statTemplates[2], value: isLoading ? '…' : String(factoredCount) },
    { ...statTemplates[3], value: '—' },
  ];

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Factor Dashboard</h1>
          <p className="text-muted-foreground">Manage your factoring portfolio</p>
        </div>
        <Button asChild>
          <Link to="/marketplace">
            <Search className="h-4 w-4 mr-2" />
            Browse Invoices
          </Link>
        </Button>
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
          <CardDescription>Common tasks for factor operations</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/marketplace">
              <Search className="h-4 w-4 mr-2" />
              Browse Invoices
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/invoices">
              <FileText className="h-4 w-4 mr-2" />
              View Portfolio
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/settings">
              Manage Registration
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
