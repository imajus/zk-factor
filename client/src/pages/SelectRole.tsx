import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useWallet } from "@/contexts/WalletContext";
import { CreditorIcon, FactorIcon } from "@/components/icons/RoleIcons";

export default function SelectRole() {
  const navigate = useNavigate();
  const { setActiveRole, activeRole } = useWallet();

  const isRegisteredFactor = activeRole === "factor";

  const handleCreditor = () => {
    setActiveRole("business");
    navigate("/dashboard");
  };

  const handleFactor = () => {
    if (isRegisteredFactor) {
      setActiveRole("factor");
      navigate("/dashboard");
      return;
    }

    navigate("/register-factor");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold">ZK Factor</span>
      </div>

      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Choose your role</h1>
          <p className="text-muted-foreground">
            Select how you want to use ZK Factor. You can switch roles later.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Creditor card */}
          <Card className="group relative flex flex-col cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg">
            <CardHeader className="pb-4">
              <CreditorIcon size={56} className="text-primary mb-2" />
              <CardTitle className="text-xl">Creditor</CardTitle>
              <CardDescription>
                I have outstanding invoices and want to access immediate
                financing
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    ✓
                  </span>
                  Mint private invoice records on-chain
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    ✓
                  </span>
                  Sell invoices to factors for immediate cash
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    ✓
                  </span>
                  Keep debtor relationships fully private
                </li>
              </ul>
              <Button className="w-full gap-2" onClick={handleCreditor}>
                {isRegisteredFactor
                  ? "Continue as Business"
                  : "Continue as Creditor"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* Factor card */}
          <Card className="group relative flex flex-col cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg">
            <CardHeader className="pb-4">
              <FactorIcon size={56} className="text-primary mb-2" />
              <CardTitle className="text-xl">Factor</CardTitle>
              <CardDescription>
                I'm a factoring company looking to purchase verified invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    ✓
                  </span>
                  Browse the invoice marketplace
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    ✓
                  </span>
                  Cryptographic guarantee against double-factoring
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    ✓
                  </span>
                  Atomic settlement with no counterparty risk
                </li>
              </ul>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleFactor}
              >
                {isRegisteredFactor
                  ? "Continue as Factor"
                  : "Register as Factor"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
