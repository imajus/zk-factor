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
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import CreateInvoice from "./pages/CreateInvoice";
import Marketplace from "./pages/Marketplace";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const wallets = [new ShieldWalletAdapter()];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AleoWalletProvider
        wallets={wallets}
        network={NETWORK}
        decryptPermission={DecryptPermission.AutoDecrypt}
        programs={WHITELISTED_PROGRAMS}
        autoConnect
      >
        <WalletProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/create" element={<CreateInvoice />} />
                <Route path="/marketplace" element={<Marketplace />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/portfolio" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </WalletProvider>
      </AleoWalletProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
