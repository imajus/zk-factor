import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Header } from './Header';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border py-6">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 ZK Factor. Built on Aleo.</p>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/roadmap" className="hover:text-foreground transition-colors">Roadmap</Link>
            <a href="/docs/" className="hover:text-foreground transition-colors">User Guide</a>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
