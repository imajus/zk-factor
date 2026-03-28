import {
  Wallet,
  Shield,
  Zap,
  ArrowRight,
  ExternalLink,
  Mail,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWallet } from "@/contexts/WalletContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const SHIELD_WALLET_URL = "https://www.shield.app/";

const features = [
  {
    icon: Shield,
    title: "Zero-Knowledge Privacy",
    description: "Your invoice data remains private through ZK proofs",
  },
  {
    icon: Zap,
    title: "Instant Settlement",
    description: "Atomic transactions with instant finality on Aleo",
  },
  {
    icon: Wallet,
    title: "Non-Custodial",
    description: "You always maintain control of your assets",
  },
];

export function WalletConnect() {
  const navigate = useNavigate();
  const {
    wallets,
    connecting,
    connect,
    disconnect,
    isConnected,
    address,
    formatAddress,
    email,
    privyReady,
    loginWithPrivy,
    logoutPrivy,
  } = useWallet();

  const [isConnectPending, setIsConnectPending] = useState(false);
  const [ignoreAdapterConnecting, setIgnoreAdapterConnecting] = useState(false);
  const connectingTimeoutRef = useRef<number | null>(null);

  // Only show connecting state when user explicitly clicked — not on auto-connect
  const isConnectingUi = isConnectPending;

  useEffect(() => {
    if (isConnected) {
      setIgnoreAdapterConnecting(false);
      setIsConnectPending(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!connecting || isConnected || ignoreAdapterConnecting) {
      if (connectingTimeoutRef.current !== null) {
        window.clearTimeout(connectingTimeoutRef.current);
        connectingTimeoutRef.current = null;
      }
      return;
    }

    connectingTimeoutRef.current = window.setTimeout(() => {
      setIgnoreAdapterConnecting(true);
      setIsConnectPending(false);
      toast.error("Wallet connection timed out. Please try again.");
    }, 12000);

    return () => {
      if (connectingTimeoutRef.current !== null) {
        window.clearTimeout(connectingTimeoutRef.current);
        connectingTimeoutRef.current = null;
      }
    };
  }, [connecting, isConnected, ignoreAdapterConnecting]);

  const handleConnect = async () => {
    if (wallets.length === 0) {
      return;
    }

    setIgnoreAdapterConnecting(false);
    setIsConnectPending(true);

    try {
      await connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const wasCanceled = /cancel|rejected|denied/i.test(message);

      if (wasCanceled) {
        toast.message("Wallet connection canceled.");
      } else {
        toast.error(message || "Unable to connect wallet.");
      }
      setIgnoreAdapterConnecting(true);
    } finally {
      setIsConnectPending(false);
    }
  };

  const handleEmailLogin = () => {
    if (!privyReady) {
      toast.error("Email login is still initializing. Please try again.");
      return;
    }
    try {
      // Call with no args — PrivyProvider config already sets loginMethods: ["email"]
      loginWithPrivy();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to start email login.";
      toast.error(message);
    }
  };

  const handleContinue = () => {
    navigate("/select-role");
  };

  if (isConnected && address) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <img src="/logo-navbar.png" alt="ZK Factor" className="h-10 w-auto" />
              </div>
              <CardTitle className="text-2xl">Wallet Connected</CardTitle>
              <CardDescription className="font-mono text-sm break-all">
                {formatAddress(address, 8)}
              </CardDescription>
              {email && (
                <div className="flex justify-center mt-2">
                  <Badge variant="secondary" className="gap-1.5 text-xs">
                    <Mail className="h-3 w-3" />
                    {email}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {privyReady && !email && (
                <Button
                  onClick={handleEmailLogin}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Link Email for Notifications
                </Button>
              )}
              {email && (
                <div className="flex justify-center">
                  <Badge variant="secondary" className="gap-1.5 text-xs">
                    <Mail className="h-3 w-3" />
                    {email}
                  </Badge>
                </div>
              )}
              <Button
                onClick={handleContinue}
                className="w-full gap-2"
                size="lg"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="pt-2 border-t border-border/50">
                <Button
                  onClick={disconnect}
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                >
                  Disconnect Wallet
                </Button>
              </div>
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
              <img src="/logo-navbar.png" alt="ZK Factor" className="h-10 w-auto" />
            </div>
            <CardTitle className="text-2xl">Welcome to ZK Factor</CardTitle>
            <CardDescription className="text-base">
              Privacy-preserving invoice factoring on Aleo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              {wallets.length === 0 ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    size="lg"
                    asChild
                  >
                    <a
                      href={SHIELD_WALLET_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
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
                <Button
                  onClick={handleConnect}
                  disabled={isConnectingUi}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Wallet className="h-5 w-5" />
                  {isConnectingUi ? "Connecting..." : "Connect Shield Wallet"}
                  {!isConnectingUi && <ArrowRight className="h-4 w-4" />}
                </Button>
              )}

              {privyReady && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-card px-2 text-muted-foreground">
                        or
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={handleEmailLogin}
                    variant="outline"
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Mail className="h-5 w-5" />
                    Continue with Email
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Email login enables transaction notifications
                  </p>
                </>
              )}

              {!privyReady && (
                <p className="text-xs text-center text-muted-foreground">
                  Powered by Shield Wallet on Aleo testnet
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
