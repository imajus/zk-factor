import { useEffect, useRef, useState } from 'react';
import { Shield, Zap, Ban, ArrowRight, CheckCircle, TrendingUp, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { platformStats, recentActivity } from '@/lib/mock-data';

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
      "Aleo's UTXO model makes re-factoring the same invoice cryptographically impossible. No central registry, no trust required.",
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
    icon: Lock,
    title: 'Mint Invoice',
    description: 'Register your invoice as a private encrypted record on Aleo. Only you hold the key.',
  },
  {
    step: '02',
    icon: Zap,
    title: 'Factor It',
    description: 'A factor purchases your invoice. The record is atomically consumed — double-factoring becomes impossible.',
  },
  {
    step: '03',
    icon: CheckCircle,
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

/** Animate a number from 0 to `target` over `duration` ms. */
function useCountUp(target: number, duration = 1400, active = false): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * ease));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, active]);
  return active ? value : 0;
}

/** Returns a ref + boolean: true once the element enters the viewport. */
function useInView(threshold = 0.2): [React.RefObject<HTMLElement>, boolean] {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/** Adds .reveal-visible to every .reveal child when the container enters view. */
function useRevealContainer(): React.RefObject<HTMLElement> {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll<HTMLElement>('.reveal').forEach((child) => child.classList.add('reveal-visible'));
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

export default function Landing() {
  const [statsRef, statsVisible] = useInView(0.3);
  const featuresRef = useRevealContainer();
  const stepsRef = useRevealContainer();
  const activityRef = useRevealContainer();

  const countInvoices = useCountUp(platformStats.totalInvoicesFactored, 1600, statsVisible);
  const countVolume = useCountUp(platformStats.totalVolume / 1_000_000, 1800, statsVisible);
  const countFactors = useCountUp(platformStats.activeFactors, 1200, statsVisible);

  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden isolate min-h-[88vh] flex items-center">

        {/* Dot-grid texture */}
        <div className="dot-grid absolute inset-0 -z-30" />

        {/* Animated grid */}
        <div className="hero-grid absolute inset-0 -z-20" />

        {/* Radial glow */}
        <div className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 55% at 50% 0%, hsl(var(--primary) / 0.18), transparent 70%)' }} />

        {/* Floating orbs */}
        <div className="animate-float-a absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none -z-10"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.22), transparent 70%)', filter: 'blur(48px)' }} />
        <div className="animate-float-b absolute -bottom-16 -right-16 w-80 h-80 rounded-full pointer-events-none -z-10"
          style={{ background: 'radial-gradient(circle, hsl(158 80% 65% / 0.18), transparent 70%)', filter: 'blur(56px)' }} />
        <div className="animate-float-a absolute top-1/3 right-1/4 w-48 h-48 rounded-full pointer-events-none -z-10"
          style={{ animationDelay: '3s', background: 'radial-gradient(circle, hsl(var(--primary) / 0.12), transparent 70%)', filter: 'blur(40px)' }} />

        {/* Content */}
        <div className="container py-24 text-center space-y-7 relative z-10">
          <Badge variant="secondary" className="stagger-in stagger-in-1 text-xs px-3 py-1 backdrop-blur-sm animate-pulse-ring">
            Built on Aleo · Powered by ZK Proofs
          </Badge>

          <h1 className="stagger-in stagger-in-2 text-shimmer text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
            Confidential Invoice Factoring on Aleo
          </h1>

          <p className="stagger-in stagger-in-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Sell your invoices for immediate cash. Cryptographically prevent double-factoring fraud.
            Keep every business relationship completely private.
          </p>

          <div className="stagger-in stagger-in-4 flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" className="gap-2 glow-primary" asChild>
              <Link to="/connect">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="gap-2 backdrop-blur-sm" asChild>
              <Link to="/about">Learn More</Link>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="stagger-in stagger-in-5 flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
            {['Zero-knowledge proofs', 'Non-custodial', 'Auditable on-chain'].map((label) => (
              <span key={label} className="flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-primary" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Stats ── */}
      <section ref={statsRef as React.RefObject<HTMLElement>} className="border-y border-border bg-muted/30 backdrop-blur-sm">
        <div className="container py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-1">
              <p className="text-4xl font-bold tabular-nums text-shimmer">
                {statsVisible ? countInvoices.toLocaleString() : '0'}
              </p>
              <p className="text-sm text-muted-foreground">Invoices Factored</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-4xl font-bold tabular-nums text-shimmer">
                ${statsVisible ? countVolume.toFixed(1) : '0'}M
              </p>
              <p className="text-sm text-muted-foreground">Total Volume</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-4xl font-bold tabular-nums text-shimmer">
                {statsVisible ? countFactors : '0'}
              </p>
              <p className="text-sm text-muted-foreground">Active Factors</p>
            </div>
            <div className="text-center space-y-1">
              <p className="text-4xl font-bold tabular-nums text-shimmer">
                {platformStats.avgSettlementHours}h
              </p>
              <p className="text-sm text-muted-foreground">Avg Settlement Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section ref={featuresRef as React.RefObject<HTMLElement>} className="container py-24 space-y-12">
        <div className="reveal text-center space-y-3">
          <h2 className="text-3xl font-bold">Why ZK Factor?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Traditional factoring exposes your business to fraud and privacy loss. We eliminate both.
          </p>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <Card key={f.title} className={`reveal reveal-delay-${i + 1} card-glow border-border/50`}>
              <CardHeader className="pb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4 transition-all duration-300 group-hover:bg-primary/20">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section ref={stepsRef as React.RefObject<HTMLElement>} className="border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 100%, hsl(var(--primary) / 0.08), transparent 70%)' }} />
        <div className="container py-24 space-y-12">
          <div className="reveal text-center space-y-3">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three steps from invoice to cash — all cryptographically guaranteed.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.step} className={`reveal reveal-delay-${i + 1} relative flex flex-col items-center text-center space-y-4`}>
                {/* Connecting line */}
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-8 left-[calc(50%+32px)] right-[calc(-50%+32px)] h-px"
                    style={{ background: 'linear-gradient(90deg, hsl(var(--primary) / 0.4), hsl(var(--border)))' }} />
                )}
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                    <s.icon className="h-7 w-7 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-semibold text-base">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Recent Activity ── */}
      <section ref={activityRef as React.RefObject<HTMLElement>} className="container py-24 space-y-6">
        <div className="reveal flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <Badge variant="secondary" className="text-xs relative">
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            Live
          </Badge>
        </div>
        <Card className="reveal reveal-delay-1 border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {recentActivity.map((tx, i) => (
                <li key={tx.id} className={`reveal reveal-delay-${Math.min(i + 2, 5)} flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/40`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 shrink-0">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
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

      {/* ── CTA Banner ── */}
      <section className="border-t border-border relative overflow-hidden">
        <div className="absolute inset-0 -z-10"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12) 0%, transparent 60%, hsl(158 80% 65% / 0.08) 100%)' }} />
        <div className="container py-20 text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Factor, Privately?</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Join the network of businesses and factors using cryptographic guarantees instead of trust.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" className="gap-2 glow-primary" asChild>
              <Link to="/connect">
                Launch App
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/roadmap">View Roadmap</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
