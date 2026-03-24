import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";
import { PrivyProvider } from "@privy-io/react-auth";
import { Routes, Route } from "react-router-dom";
import { NETWORK, PRIVY_APP_ID, WHITELISTED_PROGRAMS } from "@/lib/config";
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

function Dashboard() {
  const { activeRole } = useWallet();
  return activeRole === "factor" ? <FactorDashboard /> : <BusinessDashboard />;
}

const wallets = [new ShieldWalletAdapter()];
const hasPrivyAppId = PRIVY_APP_ID.trim().length > 0;

function OptionalPrivyProvider({ children }: { children: React.ReactNode }) {
  if (!hasPrivyAppId) return <>{children}</>;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{ loginMethods: ["email"], appearance: { theme: "dark" } }}
    >
      {children}
    </PrivyProvider>
  );
}

export default function WalletApp() {
  return (
    <OptionalPrivyProvider>
      <AleoWalletProvider
        wallets={wallets}
        network={NETWORK}
        decryptPermission={DecryptPermission.OnChainHistory}
        programs={WHITELISTED_PROGRAMS}
        autoConnect
      >
        <WalletProvider>
          <Routes>
            <Route path="/connect" element={<PublicLayout><WalletConnect /></PublicLayout>} />
            <Route path="/pay" element={<PublicLayout><Pay /></PublicLayout>} />
            <Route path="/select-role" element={<RequireAuth><SelectRole /></RequireAuth>} />
            <Route path="/register-factor" element={<RequireAuth><RegisterFactor /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth><AppLayout><Dashboard /></AppLayout></RequireAuth>} />
            <Route path="/invoices/create" element={<RequireAuth><AppLayout><CreateInvoice /></AppLayout></RequireAuth>} />
            <Route path="/marketplace" element={<RequireAuth><AppLayout><Marketplace /></AppLayout></RequireAuth>} />
            <Route path="/pools" element={<RequireAuth><AppLayout><Pools /></AppLayout></RequireAuth>} />
            <Route path="/transactions" element={<RequireAuth><AppLayout><Transactions /></AppLayout></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><AppLayout><Settings /></AppLayout></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </WalletProvider>
      </AleoWalletProvider>
    </OptionalPrivyProvider>
  );
}
