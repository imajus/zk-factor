import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Info, CheckCircle2 } from "lucide-react";
import { FactorIcon } from "@/components/icons/RoleIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { fetchFactorStatus } from "@/lib/aleo-factors";
import { toast } from "sonner";
import { PROGRAM_ID } from "@/lib/config";

export default function RegisterFactor() {
  const navigate = useNavigate();
  const { address, setActiveRole } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();
  const [minRate, setMinRate] = useState("");
  const [maxRate, setMaxRate] = useState("");
  const { data: factorStatus, isLoading: checkingStatus } = useQuery({
    queryKey: ["factor_status", address],
    queryFn: () => fetchFactorStatus(address!),
    enabled: !!address,
    staleTime: 30_000,
  });
  const alreadyRegistered = !!factorStatus?.is_active;

  const minRateBps = minRate ? parseInt(minRate, 10) : 0;
  const maxRateBps = maxRate ? parseInt(maxRate, 10) : 0;
  const registrationValid =
    minRateBps >= 5000 &&
    minRateBps <= 9900 &&
    maxRateBps >= 5000 &&
    maxRateBps <= 9900 &&
    minRateBps <= maxRateBps;

  const isSubmitting = status !== "idle";
  const formDisabled = isSubmitting || alreadyRegistered;

  useEffect(() => {
    if (status === "submitting") {
      toast.loading("Generating proof…", { id: "register-factor" });
    } else if (status === "pending") {
      toast.loading("Broadcasting…", { id: "register-factor" });
    } else if (status === "accepted") {
      toast.success("Registered as factor!", { id: "register-factor" });
      setActiveRole("factor");
      reset();
      navigate("/dashboard");
    } else if (status === "failed") {
      const msg = txError || "Registration failed";
      toast.error(
         msg.includes("already") || msg.includes("active")
          ? "Already registered as factor"
          : msg,
        { id: "register-factor" },
      );
      reset();
    }
  }, [status, txError, setActiveRole, navigate, reset]);

  const handleRegister = async () => {
    if (!registrationValid) return;
    await execute({
      program: PROGRAM_ID,
      function: "register_factor",
      inputs: [`${minRateBps}u16`, `${maxRateBps}u16`],
      fee: 100_000,
      privateFee: false,
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <img src="/logo-navbar.png" alt="ZK Factor" className="h-10 w-auto" />
        <span className="text-2xl font-bold">ZK Factor</span>
      </div>

      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <FactorIcon size={64} className="text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Register as Factor</h1>
          <p className="text-muted-foreground flex flex-wrap justify-center items-center gap-2">
            Set your advance rates to appear in the marketplace. Registration
            requires an on-chain transaction.
            <a href="/docs/factor/register" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
               <Info className="h-3 w-3" /> Learn more
            </a>
          </p>
        </div>

        {alreadyRegistered && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Already registered</AlertTitle>
            <AlertDescription>
              You are already registered as a factor with advance rates{" "}
              {(factorStatus!.min_advance_rate / 100).toFixed(0)}%–
              {(factorStatus!.max_advance_rate / 100).toFixed(0)}%.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Advance Rate Configuration</CardTitle>
            <CardDescription>
              Advance rate is the percentage of invoice value you pay upfront
              (50%–99%). Set the range you&apos;re willing to offer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min-rate">Min Advance Rate (basis points)</Label>
                <Input
                  id="min-rate"
                  type="number"
                  placeholder="e.g. 7000 for 70%"
                  value={minRate}
                  onChange={(e) => setMinRate(e.target.value)}
                  min="5000"
                  max="9900"
                  disabled={formDisabled}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-rate">Max Advance Rate (basis points)</Label>
                <Input
                  id="max-rate"
                  type="number"
                  placeholder="e.g. 9500 for 95%"
                  value={maxRate}
                  onChange={(e) => setMaxRate(e.target.value)}
                  min="5000"
                  max="9900"
                  disabled={formDisabled}
                />
              </div>
            </div>

            {(minRate || maxRate) && !registrationValid && (
              <p className="text-xs text-destructive">
                Rates must be between 5000–9900 basis points, and min ≤ max
              </p>
            )}

            {minRate && maxRate && registrationValid && (
              <p className="text-xs text-muted-foreground">
                You will advance {(minRateBps / 100).toFixed(0)}%–
                {(maxRateBps / 100).toFixed(0)}% of invoice value upfront.
              </p>
            )}

            <Button
              onClick={handleRegister}
              disabled={!registrationValid || formDisabled}
              className="w-full"
            >
              {checkingStatus
                ? "Checking registration…"
                : isSubmitting
                  ? "Registering…"
                  : alreadyRegistered
                    ? "Already registered"
                    : "Register on-chain"}
            </Button>
          </CardContent>
        </Card>

        <Button
          variant="ghost"
          className="w-full gap-2"
          onClick={() => navigate("/select-role")}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to role selection
        </Button>
      </div>
    </div>
  );
}
