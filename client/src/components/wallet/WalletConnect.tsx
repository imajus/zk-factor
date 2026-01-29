import { Wallet, Shield, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';

const features = [
  {
    icon: Shield,
    title: 'Zero-Knowledge Privacy',
    description: 'Your invoice data remains private through ZK proofs',
  },
  {
    icon: Zap,
    title: 'Instant Settlement',
    description: 'Atomic transactions with instant finality on Aleo',
  },
  {
    icon: Wallet,
    title: 'Non-Custodial',
    description: 'You always maintain control of your assets',
  },
];

export function WalletConnect() {
  const { connect, isSyncing, syncProgress } = useWallet();

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 glow-primary">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to ZK Factor</CardTitle>
            <CardDescription className="text-base">
              Privacy-preserving invoice factoring on Aleo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Features */}
            <div className="space-y-3">
              {features.map((feature) => (
                <div key={feature.title} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Connect Button */}
            <div className="space-y-3">
              {isSyncing ? (
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    Syncing wallet... {syncProgress}%
                  </p>
                </div>
              ) : (
                <>
                  <Button onClick={connect} className="w-full gap-2" size="lg">
                    <Wallet className="h-5 w-5" />
                    Connect Wallet
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Supports Leo Wallet and Puzzle Wallet
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
