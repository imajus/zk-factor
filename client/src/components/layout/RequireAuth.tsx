import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';

const ROLE_EXEMPT_PATHS = ['/select-role', '/register-factor'];

interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isConnected, activeRole } = useWallet();
  const location = useLocation();

  if (!isConnected) {
    return <Navigate to="/" replace />;
  }

  if (!activeRole && !ROLE_EXEMPT_PATHS.includes(location.pathname)) {
    return <Navigate to="/select-role" replace />;
  }

  return <>{children}</>;
}
