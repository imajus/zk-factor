import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';

const ROLE_EXEMPT_PATHS = ['/select-role', '/register-factor'];

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const {
    isConnected,
    isInitializing,
    reconnecting,
    activeRole,
    resolvingRole,
    accountSwitchPending,
    pendingAddress,
    confirmAccountSwitch,
    rejectAccountSwitch,
    formatAddress,
  } = useWallet();
  const location = useLocation();

  if (isInitializing || reconnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm">Reconnecting wallet…</p>
      </div>
    );
  }

  if (accountSwitchPending && pendingAddress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <div className="w-full max-w-md rounded-lg border bg-card p-5 space-y-3">
          <h2 className="text-base font-semibold">Confirm Wallet Account</h2>
          <p className="text-sm text-muted-foreground">
            Your wallet account changed. Confirm to continue with {formatAddress(pendingAddress)}.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => void rejectAccountSwitch()}>
              Disconnect
            </Button>
            <Button onClick={confirmAccountSwitch}>Confirm account</Button>
          </div>
        </div>
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
