import { Wallet, Shield, Zap, ArrowRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/contexts/WalletContext';

const SHIELD_WALLET_URL = 'https://www.shield.app/';

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
  const { wallets, connecting, connect, disconnect, isConnected, address, formatAddress, selectWallet } = useWallet();

  const handleConnect = async () => {
    if (wallets.length > 0) {
      selectWallet(wallets[0].adapter.name);
    }
    await connect();
  };

  if (isConnected && address) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Wallet Connected</CardTitle>
              <CardDescription className="font-mono text-sm break-all">
                {formatAddress(address, 8)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={disconnect} variant="outline" className="w-full">
                Disconnect
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <div className="space-y-3">
              {wallets.length === 0 ? (
                <>
                  <Button variant="outline" className="w-full gap-2" size="lg" asChild>
                    <a href={SHIELD_WALLET_URL} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-5 w-5" />
                      Install Shield Wallet
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Shield Wallet extension is required to use ZK Factor
                  </p>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Wallet className="h-5 w-5" />
                    {connecting ? 'Connecting…' : 'Connect Shield Wallet'}
                    {!connecting && <ArrowRight className="h-4 w-4" />}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Powered by Shield Wallet on Aleo testnet
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
