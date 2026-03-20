import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoadmapItem {
  label: string;
  done: boolean;
}

interface Phase {
  number: number;
  title: string;
  current?: boolean;
  items: RoadmapItem[];
}

const phases: Phase[] = [
  {
    number: 1,
    title: 'MVP Launch (Testnet)',
    current: true,
    items: [
      { label: 'Invoice creation (mint_invoice)', done: true },
      { label: 'Fraud prevention via UTXO consumption model', done: false },
      { label: 'Two-step factoring (authorize_factoring → execute_factoring)', done: true },
      { label: 'Private debtor payment (create_payment_request → pay_invoice)', done: true },
      { label: 'Factor marketplace (discovery and browsing)', done: true },
      { label: 'Settlement (settle_invoice)', done: true },
      { label: 'Basic web UI for business, factor, and debtor roles', done: true },
      { label: 'Shield Wallet integration', done: true },
    ],
  },
  {
    number: 2,
    title: 'Enhanced Features',
    items: [
      { label: 'USDCx stablecoin payments integration', done: false },
      { label: 'Partial factoring (sell portion of invoice, retain the rest)', done: false },
      { label: 'Recourse tracking (handle debtor non-payment)', done: false },
      { label: 'Multi-factor syndication (large invoices split across factors)', done: false },
      { label: 'Mobile wallet support', done: false },
      { label: 'API integration for accounting software (QuickBooks, Xero, Sage)', done: false },
      { label: 'ZK credit scoring based on payment history', done: false },
    ],
  },
  {
    number: 3,
    title: 'Mainnet Launch',
    items: [
      { label: 'Smart contract security audit', done: false },
      { label: 'Economic audit (tokenomics and fee structure)', done: false },
      { label: 'Bug bounty program', done: false },
      { label: 'Factor partnerships (onboard 5–10 progressive factors)', done: false },
      { label: 'Production monitoring infrastructure', done: false },
      { label: 'Cross-border factoring with oracle integration', done: false },
      { label: 'Automated settlement verification', done: false },
      { label: 'Delegated proving infrastructure', done: false },
    ],
  },
  {
    number: 4,
    title: 'Enterprise Scale',
    items: [
      { label: 'ZK credit scoring (prove payment history without revealing details)', done: false },
      { label: 'Privacy-preserving analytics dashboard', done: false },
      { label: 'Cross-border factoring with multi-currency support', done: false },
      { label: 'White-label licensing for banks and fintechs', done: false },
      { label: 'Compliance framework (KYC/AML integration points)', done: false },
      { label: 'Institutional API integration', done: false },
    ],
  },
  {
    number: 5,
    title: 'Ecosystem Expansion',
    items: [
      { label: 'Supply chain integration (auto-generate invoices from delivery)', done: false },
      { label: 'Banking partnerships', done: false },
      { label: 'Multi-chain bridge support', done: false },
      { label: 'Debtor notification system (privacy-preserving payment instructions)', done: false },
      { label: 'White-label deployment options for enterprise factoring companies', done: false },
      { label: 'Enterprise sales team and dedicated support', done: false },
    ],
  },
];

export default function Roadmap() {
  return (
    <div className="container py-16 max-w-4xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Product Roadmap</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            From testnet MVP to a global privacy-preserving invoice factoring ecosystem.
          </p>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border hidden sm:block" />

          <div className="space-y-8">
            {phases.map((phase) => (
              <div key={phase.number} className="relative sm:pl-16">
                {/* Phase number bubble */}
                <div
                  className={cn(
                    'absolute left-0 top-0 hidden sm:flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-bold',
                    phase.current
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground',
                  )}
                >
                  {phase.number}
                </div>

                <Card className={cn(phase.current && 'border-primary/40 bg-primary/5')}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Mobile phase number */}
                      <span
                        className={cn(
                          'sm:hidden flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold',
                          phase.current
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground',
                        )}
                      >
                        {phase.number}
                      </span>
                      <CardTitle className="text-lg">{phase.title}</CardTitle>
                      {phase.current && (
                        <Badge className="bg-primary text-primary-foreground">Current Phase</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {phase.items.map((item) => (
                        <li key={item.label} className="flex items-start gap-2 text-sm">
                          {item.done ? (
                            <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                          )}
                          <span className={cn(item.done ? 'text-foreground' : 'text-muted-foreground')}>
                            {item.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {phase.current && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          {phase.items.filter((i) => i.done).length} of {phase.items.length} items complete
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
  );
}
