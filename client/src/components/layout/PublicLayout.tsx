import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo-navbar.png" alt="ZK Factor" className="h-8 w-auto" />
            <span className="text-xl font-bold">ZK Factor</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/pay">Pay an Invoice</Link>
            </Button>
            <Button asChild className="gap-2">
              <Link to="/connect">
                <Wallet className="h-4 w-4" />
                Connect or Login
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-6">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 ZK Factor. Built on Aleo.</p>
          <div className="flex items-center gap-4">
            <Link
              to="/about"
              className="hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link
              to="/roadmap"
              className="hover:text-foreground transition-colors"
            >
              Roadmap
            </Link>
            <a
              href="/docs/"
              className="hover:text-foreground transition-colors"
            >
              Guide
            </a>
            <Link
              to="/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
