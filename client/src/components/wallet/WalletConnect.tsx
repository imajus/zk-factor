import { Wallet, Shield, Zap, ArrowRight, ExternalLink } from "lucide-react";
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
    isConnected,
    activeRole,
    resolvingRole,
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
    if (!isConnected || resolvingRole) return;

    if (activeRole === "factor" || activeRole === "business") {
      navigate("/dashboard", { replace: true });
      return;
    }

    navigate("/select-role", { replace: true });
  }, [isConnected, resolvingRole, activeRole, navigate]);

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

              <p className="text-xs text-center text-muted-foreground">
                Powered by Shield Wallet on Aleo testnet
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
