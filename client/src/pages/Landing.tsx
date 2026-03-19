import { Shield, Zap, Ban, ArrowRight, ExternalLink, CheckCircle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/contexts/WalletContext';
import { platformStats, recentActivity } from '@/lib/mock-data';

const SHIELD_WALLET_URL = 'https://www.shield.app/';

const features = [
  {
    icon: Shield,
    title: 'ZK Privacy',
    description:
      'Invoice amounts, debtor identities, and business relationships stay encrypted. Zero-knowledge proofs ensure only you can see your data.',
  },
  {
    icon: Ban,
    title: 'Anti-Double-Factor',
    description:
      'Aleo\'s UTXO model makes re-factoring the same invoice cryptographically impossible. No central registry, no trust required.',
  },
  {
    icon: Zap,
    title: 'Instant Settlement',
    description:
      'Atomic swaps execute factoring and payment transfer in a single transaction. No counterparty risk, no escrow delays.',
  },
];

const steps = [
  {
    step: '01',
    title: 'Mint Invoice',
    description: 'Register your invoice as a private encrypted record on Aleo. Only you hold the key.',
  },
  {
    step: '02',
    title: 'Factor It',
    description: 'A factor purchases your invoice. The record is atomically consumed — double-factoring becomes impossible.',
  },
  {
    step: '03',
    title: 'Get Paid',
    description: 'Receive immediate cash advance. The factor collects from your debtor when the invoice matures.',
  },
];

function formatVolume(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function Landing() {
  const { wallets, connecting, connect, selectWallet } = useWallet();

  const handleConnect = async () => {
    if (wallets.length > 0) {
      selectWallet(wallets[0].adapter.name);
    }
    await connect();
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="container py-20 text-center space-y-6">
        <Badge variant="secondary" className="text-xs px-3 py-1">
          Built on Aleo · Powered by ZK Proofs
        </Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
          Confidential Invoice Factoring on Aleo
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Sell your invoices for immediate cash. Cryptographically prevent double-factoring fraud.
          Keep every business relationship completely private.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {wallets.length === 0 ? (
            <Button size="lg" className="gap-2" asChild>
              <a href={SHIELD_WALLET_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Install Shield Wallet
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          ) : (
            <Button size="lg" className="gap-2" onClick={handleConnect} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect Wallet to Start'}
              {!connecting && <ArrowRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </section>

      {/* Platform Stats */}
      <section className="border-y border-border bg-muted/30">
        <div className="container py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-1">
              <p className="text-3xl font-bold">{platformStats.totalInvoicesFactored.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Invoices Factored</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-3xl font-bold">{formatVolume(platformStats.totalVolume)}</p>
              <p className="text-sm text-muted-foreground">Total Volume</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-3xl font-bold">{platformStats.activeFactors}</p>
              <p className="text-sm text-muted-foreground">Active Factors</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-3xl font-bold">{platformStats.avgSettlementHours}h</p>
              <p className="text-sm text-muted-foreground">Avg Settlement Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold">Why ZK Factor?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Traditional factoring exposes your business to fraud and privacy loss. We eliminate both.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((f) => (
            <Card key={f.title} className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-border bg-muted/20">
        <div className="container py-20 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three steps from invoice to cash — all cryptographically guaranteed.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className="relative flex flex-col items-center text-center space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {s.step}
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-6 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-px bg-border" />
                )}
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="container py-20 space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <Badge variant="secondary" className="text-xs">Live</Badge>
        </div>
        <Card className="border-border/50">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {recentActivity.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium capitalize">{tx.type}</p>
                      <p className="text-xs text-muted-foreground font-mono">{tx.hash}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatVolume(tx.amount)}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(tx.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
