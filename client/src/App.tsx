import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";
import { PrivyProvider } from "@privy-io/react-auth";
import { NETWORK, PRIVY_APP_ID, WHITELISTED_PROGRAMS } from "@/lib/config";
import { WalletProvider, useWallet } from "@/contexts/WalletContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { RequireAuth } from "@/components/layout/RequireAuth";
import { BusinessDashboard } from "@/components/dashboard/BusinessDashboard";
import { FactorDashboard } from "@/components/dashboard/FactorDashboard";
import CreateInvoice from "./pages/CreateInvoice";
import Marketplace from "./pages/Marketplace";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Pay from "./pages/Pay";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Roadmap from "./pages/Roadmap";
import Landing from "./pages/Landing";
import SelectRole from "./pages/SelectRole";
import RegisterFactor from "./pages/RegisterFactor";
import Pools from "./pages/Pools";
import { WalletConnect } from "@/components/wallet/WalletConnect";

function Dashboard() {
  const { activeRole } = useWallet();
  return activeRole === "factor" ? <FactorDashboard /> : <BusinessDashboard />;
}

const queryClient = new QueryClient();
const wallets = [new ShieldWalletAdapter()];
const hasPrivyAppId = PRIVY_APP_ID.trim().length > 0;

function OptionalPrivyProvider({ children }: { children: React.ReactNode }) {
  if (!hasPrivyAppId) return <>{children}</>;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["email"],
        appearance: { theme: "dark" },
      }}
    >
      {children}
    </PrivyProvider>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OptionalPrivyProvider>
          <AleoWalletProvider
            wallets={wallets}
            network={NETWORK}
            decryptPermission={DecryptPermission.OnChainHistory}
            programs={WHITELISTED_PROGRAMS}
            autoConnect
          >
            <WalletProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  {/* Public routes */}
                  <Route
                    path="/"
                    element={
                      <PublicLayout>
                        <Landing />
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
                    path="/about"
                    element={
                      <PublicLayout>
                        <About />
                      </PublicLayout>
                    }
                  />
                  <Route
                    path="/terms"
                    element={
                      <PublicLayout>
                        <Terms />
                      </PublicLayout>
                    }
                  />
                  <Route
                    path="/privacy"
                    element={
                      <PublicLayout>
                        <Privacy />
                      </PublicLayout>
                    }
                  />
                  <Route
                    path="/roadmap"
                    element={
                      <PublicLayout>
                        <Roadmap />
                      </PublicLayout>
                    }
                  />
                  <Route
                    path="/connect"
                    element={
                      <PublicLayout>
                        <WalletConnect />
                      </PublicLayout>
                    }
                  />

                  {/* Protected routes — role selection */}
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

                  {/* Protected routes */}
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
                        <AppLayout>
                          <Pools />
                        </AppLayout>
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

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </WalletProvider>
          </AleoWalletProvider>
        </OptionalPrivyProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
