import { useWallet } from '@/contexts/WalletContext';
import { BusinessDashboard } from '@/components/dashboard/BusinessDashboard';
import { FactorDashboard } from '@/components/dashboard/FactorDashboard';

export default function Dashboard() {
  const { activeRole } = useWallet();

  if (activeRole === 'factor') {
    return <FactorDashboard />;
  }

  return <BusinessDashboard />;
}
