import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Palette,
  ExternalLink,
  Download,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddressDisplay } from "@/components/ui/address-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { toast } from "sonner";
import { PROGRAM_ID } from "@/lib/config";
import { fetchFactorStatus } from "@/lib/aleo-factors";

export default function Settings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { address, network, disconnect, isConnected } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const [isDeregistering, setIsDeregistering] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("dark");

  const { data: factorStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["factor_status", address],
    queryFn: () => fetchFactorStatus(address!),
    enabled: isConnected && !!address,
    staleTime: 60_000,
  });

  const handleThemeChange = (value: "light" | "dark" | "system") => {
    setTheme(value);
    if (value === "dark") {
      document.documentElement.classList.add("dark");
    } else if (value === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
    toast.success(`Theme changed to ${value}`);
  };

  useEffect(() => {
    if (!isDeregistering) return;
    if (status === "submitting") {
      toast.loading("Generating proof…", { id: "deregister-factor" });
    } else if (status === "pending") {
      toast.loading("Broadcasting…", { id: "deregister-factor" });
    } else if (status === "accepted") {
      toast.success("Deregistered from factor network!", {
        id: "deregister-factor",
      });
      queryClient.invalidateQueries({ queryKey: ["factor_status", address] });
      setIsDeregistering(false);
      reset();
    } else if (status === "failed") {
      toast.error(txError || "Deregistration failed", {
        id: "deregister-factor",
      });
      setIsDeregistering(false);
      reset();
    }
  }, [status, txError, isDeregistering, queryClient, address, reset]);

  const handleDeregister = async () => {
    setIsDeregistering(true);
    await execute({
      program: PROGRAM_ID,
      function: "deregister_factor",
      inputs: [],
      fee: 100_000,
      privateFee: false,
    });
  };

  return (
    <div className="container py-6 max-w-4xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Inline Factor Registration Status */}
      {isConnected && !statusLoading && (
        <Card className="mb-6">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Factor Registration</p>
                  <p className="text-xs text-muted-foreground">
                    {factorStatus?.is_active
                      ? `Min ${(factorStatus.min_advance_rate / 100).toFixed(2)}% · Max ${(factorStatus.max_advance_rate / 100).toFixed(2)}%`
                      : "Not registered as a factor"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={factorStatus?.is_active ? "default" : "outline"}>
                  {factorStatus?.is_active ? "Active" : "Inactive"}
                </Badge>
                {factorStatus?.is_active && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeregister}
                    disabled={isDeregistering || !isConnected}
                    className="text-destructive hover:text-destructive"
                  >
                    {isDeregistering ? "Deregistering…" : "Deregister"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="wallet" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="wallet" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Wallet</span>
          </TabsTrigger>
          <TabsTrigger value="factor" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Factor</span>
          </TabsTrigger>
          <TabsTrigger value="display" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Display</span>
          </TabsTrigger>
        </TabsList>

        {/* Wallet Settings */}
        <TabsContent value="wallet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Wallet</CardTitle>
              <CardDescription>
                Your wallet connection information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  {address && (
                    <AddressDisplay
                      address={address}
                      truncate={false}
                      showExplorer
                    />
                  )}
                </div>
                <Badge variant="outline" className="gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  {network === "mainnet" ? "Mainnet" : "Testnet"}
                </Badge>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
                <Button variant="destructive" onClick={disconnect}>
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Factor Registration */}
        <TabsContent value="factor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Factor Registration</CardTitle>
              <CardDescription>
                Register your address as a factoring company on the network
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current status */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="font-medium text-sm">Registration Status</p>
                  <p className="text-xs text-muted-foreground">
                    {statusLoading
                      ? "Checking…"
                      : factorStatus?.is_active
                        ? "Registered and active"
                        : "Not registered"}
                  </p>
                </div>
                <Badge
                  variant={factorStatus?.is_active ? "default" : "outline"}
                >
                  {factorStatus?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {factorStatus?.is_active && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Min Advance Rate</p>
                    <p className="font-semibold">
                      {(factorStatus.min_advance_rate / 100).toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max Advance Rate</p>
                    <p className="font-semibold">
                      {(factorStatus.max_advance_rate / 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Register redirect */}
              {!factorStatus?.is_active && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Register as Factor</h3>
                  <p className="text-xs text-muted-foreground">
                    Register your address on the factor network to appear in the
                    marketplace and purchase invoices.
                  </p>
                  <Button
                    onClick={() => navigate("/register-factor")}
                    className="w-full"
                  >
                    Register as Factor
                  </Button>
                </div>
              )}

              {/* Deregister */}
              {factorStatus?.is_active && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Deregister</h3>
                  <p className="text-xs text-muted-foreground">
                    Remove yourself from the active factors registry. Existing
                    factored invoices are unaffected.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleDeregister}
                    disabled={isDeregistering || !isConnected}
                    className="w-full"
                  >
                    {isDeregistering ? "Deregistering…" : "Deregister"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Display */}
        <TabsContent value="display" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how ZK Factor looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ].map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      variant={theme === value ? "default" : "outline"}
                      className="justify-start"
                      onClick={() =>
                        handleThemeChange(value as "light" | "dark" | "system")
                      }
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Date Format</Label>
                <Select defaultValue="mdy">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                    <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                    <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Export</CardTitle>
              <CardDescription>Download your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export All Invoices (JSON)
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="h-4 w-4 mr-2" />
                Export Transactions (CSV)
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Local Data
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
