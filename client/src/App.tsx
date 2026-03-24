import React, { Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import Landing from "./pages/Landing";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Roadmap from "./pages/Roadmap";

// Lazy-load wallet infrastructure — @provablehq/sdk uses top-level await for WASM
// which blocks module evaluation. Dynamic import keeps it out of the main bundle
// so public pages render immediately without waiting for WASM to initialise.
const WalletApp = React.lazy(() => import("./WalletApp"));

const queryClient = new QueryClient();

function WalletLoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm">Loading wallet…</p>
      </div>
    </div>
  );
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public routes — render immediately, no wallet provider needed */}
            <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><About /></PublicLayout>} />
            <Route path="/terms" element={<PublicLayout><Terms /></PublicLayout>} />
            <Route path="/privacy" element={<PublicLayout><Privacy /></PublicLayout>} />
            <Route path="/roadmap" element={<PublicLayout><Roadmap /></PublicLayout>} />

            {/* Wallet-dependent routes — lazy-loaded to avoid WASM blocking initial render */}
            <Route
              path="/*"
              element={
                <Suspense fallback={<WalletLoadingScreen />}>
                  <WalletApp />
                </Suspense>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
