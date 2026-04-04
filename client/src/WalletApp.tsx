import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";
import { Navigate, Routes, Route } from "react-router-dom";
import { NETWORK, WHITELISTED_PROGRAMS } from "@/lib/config";
import { WalletProvider, useWallet } from "@/contexts/WalletContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { BusinessDashboard } from "@/components/dashboard/BusinessDashboard";
import { FactorDashboard } from "@/components/dashboard/FactorDashboard";
import { WalletConnect } from "@/components/wallet/WalletConnect";
import CreateInvoice from "./pages/CreateInvoice";
import Marketplace from "./pages/Marketplace";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import Pay from "./pages/Pay";
import SelectRole from "./pages/SelectRole";
import RegisterFactor from "./pages/RegisterFactor";
import Pools from "./pages/Pools";
import NotFound from "./pages/NotFound";
import InvoicePending from "./pages/InvoicePending";

function Dashboard() {
  const { activeRole } = useWallet();
  return activeRole === "factor" ? <FactorDashboard /> : <BusinessDashboard />;
}

function RequireFactor({ children }: { children: JSX.Element }) {
  const { activeRole } = useWallet();
  if (activeRole !== "factor") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

const wallets = [new ShieldWalletAdapter()];

export default function WalletApp() {
  return (
    <AleoWalletProvider
      wallets={wallets}
      network={NETWORK}
      decryptPermission={DecryptPermission.OnChainHistory}
      programs={WHITELISTED_PROGRAMS}
      autoConnect
    >
      <WalletProvider>
        <Routes>
          <Route
            path="/connect"
            element={
              <PublicLayout>
                <WalletConnect />
              </PublicLayout>
            }
          />
          <Route
            path="/pay"
            element={
              <PublicLayout>
                <Pay />
              </PublicLayout>
            }
          />
          <Route
            path="/select-role"
            element={
              <RequireAuth>
                <SelectRole />
              </RequireAuth>
            }
          />
          <Route
            path="/register-factor"
            element={
              <RequireAuth>
                <RegisterFactor />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/invoices/create"
            element={
              <RequireAuth>
                <AppLayout>
                  <CreateInvoice />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/invoices/pending"
            element={
              <RequireAuth>
                <AppLayout>
                  <InvoicePending />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/marketplace"
            element={
              <RequireAuth>
                <AppLayout>
                  <Marketplace />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/pools"
            element={
              <RequireAuth>
                <RequireFactor>
                  <AppLayout>
                    <Pools />
                  </AppLayout>
                </RequireFactor>
              </RequireAuth>
            }
          />
          <Route
            path="/transactions"
            element={
              <RequireAuth>
                <AppLayout>
                  <Transactions />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <AppLayout>
                  <Settings />
                </AppLayout>
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </WalletProvider>
    </AleoWalletProvider>
  );
}
