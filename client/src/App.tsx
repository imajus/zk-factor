import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import { DecryptPermission } from "@provablehq/aleo-wallet-adaptor-core";
import { NETWORK, WHITELISTED_PROGRAMS } from "@/lib/config";
import { WalletProvider } from "@/contexts/WalletContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { RequireAuth } from "@/components/layout/RequireAuth";
import Dashboard from "./pages/Dashboard";
import CreateInvoice from "./pages/CreateInvoice";
import Marketplace from "./pages/Marketplace";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Pay from "./pages/Pay";

const queryClient = new QueryClient();
const wallets = [new ShieldWalletAdapter()];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
                    <Dashboard />
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
