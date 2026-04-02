import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Zap, Lock, Users, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react';

export default function About() {
  return (
    <div className="container py-16 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Built on Aleo</Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Privacy-Preserving Invoice Factoring
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            ZK Factor cryptographically prevents double-factoring fraud while keeping invoice amounts,
            business relationships, and transaction details completely private.
          </p>
        </div>

        {/* What is Invoice Factoring */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">What is Invoice Factoring?</h2>
          <p className="text-muted-foreground mb-4">
            Invoice factoring is when a business sells its unpaid invoices to a third party (the
            "factor") at a discount to get immediate cash instead of waiting 30–90 days for customers
            to pay.
          </p>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Example</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex gap-2"><span className="text-muted-foreground">1.</span><span>Supplier delivers $100,000 of goods to Retailer</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground">2.</span><span>Retailer issues invoice with 60-day payment terms</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground">3.</span><span>Supplier needs cash now → sells invoice to Factor for $95,000 (5% discount)</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground">4.</span><span>Factor collects $100,000 from Retailer after 60 days → keeps $5,000 profit</span></div>
            </CardContent>
          </Card>
        </section>

        {/* Financing Comparison */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-2">Not All Capital Is Created Equal</h2>
          <p className="text-muted-foreground mb-6">
            Banks want collateral, credit history, and time. Factoring wants one thing: a customer who pays.
            Here's how the three main options actually differ when you need working capital.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground w-[30%]"></th>
                  <th className="text-left py-3 px-4 font-semibold text-primary">Invoice Factoring</th>
                  <th className="text-left py-3 px-4 font-semibold">Bank Line of Credit</th>
                  <th className="text-left py-3 px-4 font-semibold">Term Loan</th>
                </tr>
              </thead>
              <tbody>
                {([
                  {
                    label: 'Cash in hand',
                    values: ['24–48 hours', 'Weeks to months', 'Weeks to months'],
                    highlight: 0,
                  },
                  {
                    label: 'What they check',
                    values: ["Your customer's credit", 'Your credit', 'Your credit'],
                    highlight: 0,
                  },
                  {
                    label: 'Adds to your debt?',
                    values: ['No', 'Yes', 'Yes'],
                    highlight: 0,
                  },
                  {
                    label: 'Grows with you?',
                    values: ['Yes — tied to invoices', 'Fixed ceiling', 'Fixed amount'],
                    highlight: 0,
                  },
                  {
                    label: 'Chases payments',
                    values: ['Included', 'On you', 'On you'],
                    highlight: 0,
                  },
                  {
                    label: 'What it costs',
                    values: ['1–3% per 30 days', 'Prime rate +', 'Fixed rate'],
                    highlight: -1,
                  },
                ] as { label: string; values: string[]; highlight: number }[]).map(({ label, values, highlight }, rowIdx) => (
                  <tr key={label} className={rowIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="py-3 px-4 font-medium text-muted-foreground">{label}</td>
                    {values.map((val, i) => (
                      <td
                        key={i}
                        className={i === highlight ? 'py-3 px-4 text-primary font-medium' : 'py-3 px-4'}
                      >
                        {val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            If your business has strong credit and a predictable billing cycle, a line of credit likely
            wins on total cost. Factoring earns its premium when speed matters, banking history is thin,
            or revenue is growing faster than your credit limit can follow.
          </p>
        </section>

        {/* Double-Factoring Fraud */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <h2 className="text-2xl font-bold">The Double-Factoring Problem</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Double-factoring fraud occurs when a company sells the same invoice to more than one
            factoring company. Industry reports indicate that up to 15% of submitted invoices may
            contain errors or fraudulent elements, costing factors millions annually.
          </p>
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">How the fraud works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex gap-2"><span className="text-muted-foreground">1.</span><span>Supplier creates Invoice #1234 for $100,000</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground">2.</span><span>Sells it to Factor A for $95,000 ✓</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground">3.</span><span>Sells the <strong>same invoice</strong> to Factor B for $95,000 ✓</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground">4.</span><span>Sells it again to Factor C for $95,000 ✓</span></div>
              <div className="flex gap-2"><span className="text-muted-foreground">5.</span><span>Retailer pays $100,000 → only ONE factor gets paid</span></div>
              <div className="flex gap-2 text-destructive"><span>6.</span><span>Two factors lose $95,000 each</span></div>
            </CardContent>
          </Card>
          <p className="text-sm text-muted-foreground mt-4">
            Current solutions are siloed, require trust in a central operator, aren't real-time, and
            compromise privacy by revealing business relationships.
          </p>
        </section>

        {/* Why Aleo */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Why Aleo Solves This</h2>
          </div>
          <p className="text-muted-foreground mb-6">
            When a business factors an invoice on Aleo, the invoice record is <strong>consumed</strong>.
            It literally cannot be double-factored because of the UTXO model:
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-medium text-sm">Invoice exists as a private record</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-medium text-sm">Factoring consumes the record, publishing its serial number</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-medium text-sm">Re-factoring fails: serial number already spent</p>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            No central database needed. No trust required. Cryptographically impossible to double-factor.
          </p>
        </section>

        {/* Tech Stack */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'mint_invoice()', desc: 'Creates an encrypted invoice record owned by the business' },
              { title: 'authorize_factoring()', desc: 'Consumes Invoice → FactoringOffer sent to chosen factor' },
              { title: 'execute_factoring()', desc: 'Atomic swap: FactoringOffer consumed, advance paid to business' },
              { title: 'create_payment_request()', desc: 'Sends private PaymentNotice record to debtor — nothing public' },
              { title: 'pay_invoice()', desc: 'Debtor consumes PaymentNotice, marks invoice settled on-chain' },
              { title: 'settle_invoice()', desc: 'Factor finalizes after debtor payment is confirmed' },
            ].map(({ title, desc }) => (
              <Card key={title}>
                <CardContent className="pt-4">
                  <code className="text-xs text-primary font-mono">{title}</code>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {['Aleo Blockchain', 'Leo Language', 'React + TypeScript', 'Shield Wallet', 'zkSNARKs', 'Poseidon Hashing'].map((tech) => (
              <Badge key={tech} variant="secondary">{tech}</Badge>
            ))}
          </div>
        </section>

        {/* Who it's for */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Who It's For</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'SME Business Owners', desc: 'Want fast cash, value privacy, hate paperwork' },
              { title: 'Factoring Companies', desc: 'Need fraud prevention and fast verification without exposing competitive data' },
              { title: 'International Traders', desc: 'Cross-border verification and trust without a central authority' },
              { title: 'Corporate Treasury', desc: 'Managing receivables across multiple factors with full privacy' },
            ].map(({ title, desc }) => (
              <Card key={title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Revenue */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Revenue Model</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: 'Protocol Fee', desc: '0.3–0.7% of factored amount collected automatically via smart contract' },
              { title: 'Factor Subscriptions', desc: 'Monthly fee for unlimited verifications and premium analytics' },
              { title: 'ZK Credit Scoring', desc: 'Fee-based proof generation for payment history attestations' },
              { title: 'White-label Licensing', desc: 'Private instance deployments for banks and fintechs' },
            ].map(({ title, desc }) => (
              <Card key={title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 text-center rounded-lg border border-border bg-muted/30 py-12 px-6">
          <BookOpen className="h-10 w-10 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Read the User Guide to learn how to mint invoices, find factors, and settle payments.
          </p>
          <Button asChild size="lg">
            <Link to="/docs">Open User Guide</Link>
          </Button>
        </section>
      </div>
  );
}
