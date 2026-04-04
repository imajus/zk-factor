import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';

const ROLE_EXEMPT_PATHS = ['/select-role', '/register-factor'];

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isConnected, isInitializing, reconnecting, activeRole, resolvingRole } = useWallet();
  const location = useLocation();

  if (isInitializing || reconnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm">Reconnecting wallet…</p>
      </div>
    );
  }

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  if (isConnected && resolvingRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm">Checking your on-chain registration…</p>
      </div>
    );
  }

  if (!activeRole && !ROLE_EXEMPT_PATHS.includes(location.pathname)) {
    return <Navigate to="/select-role" replace />;
  }

  return <>{children}</>;
}
