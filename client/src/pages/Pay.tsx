// src/pages/Pay.tsx
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Wallet, Search, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AleoNetworkClient } from "@provablehq/sdk";
import { formatAleo } from "@/lib/format";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { PROGRAM_ID, API_ENDPOINT } from "@/lib/config";
import { useSearchParams } from "react-router-dom";

interface PaymentRequest {
  factor: string;
  amount: bigint;
  due_date: number;
  debtor: string;
}

// Parse the raw struct string returned by getProgramMappingValue
function parsePaymentRequest(raw: string): PaymentRequest | null {
  try {
    // Remove outer braces and split by comma
    const cleaned = raw.replace(/^\{/, "").replace(/\}$/, "").trim();

    const get = (field: string): string => {
      // Match "field: value" with optional type suffix and trailing comma
      const regex = new RegExp(`${field}\\s*:\\s*([^,}]+)`);
      const m = cleaned.match(regex);
      if (!m) return "";
      return m[1].trim().replace(/u64$/, "").replace(/u32$/, "").trim();
    };

    const amount = get("amount");
    const due_date = get("due_date");

    return {
      factor: get("factor"),
      amount: BigInt(amount || "0"),
      due_date: parseInt(due_date || "0", 10),
      debtor: get("debtor"),
    };
  } catch (e) {
    console.error("parsePaymentRequest failed:", e, "raw:", raw);
    return null;
  }
}

export default function Pay() {
  const { isConnected, address } = useWallet();
  const { execute, status, error: txError, reset } = useTransaction();

  const [invoiceHash, setInvoiceHash] = useState("");
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(
    null,
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLooking, setIsLooking] = useState(false);
  const [paid, setPaid] = useState(false);
  const [searchParams] = useSearchParams();

  // At the top of the component, auto-fill if hash is in URL
  useEffect(() => {
    const hash = searchParams.get("hash");
    if (hash) {
      setInvoiceHash(hash);
      // Auto-trigger lookup
      handleLookup(hash);
    }
  }, []);

  // Toast feedback during payment
  useEffect(() => {
    if (status === "submitting")
      toast.loading("Generating proof…", { id: "pay-invoice" });
    else if (status === "pending")
      toast.loading("Broadcasting payment…", { id: "pay-invoice" });
    else if (status === "accepted") {
      toast.success("Invoice paid successfully!", { id: "pay-invoice" });
      setPaid(true);
      reset();
    } else if (status === "failed") {
      console.error("pay_invoice failed:", txError);
      toast.error(txError || "Payment failed", { id: "pay-invoice" });
      reset();
    }
  }, [status, txError, reset]);

  const handleLookup = async (hashOverride?: string) => {
    const value = hashOverride ?? invoiceHash;
    if (!value.trim()) return;
    setIsLooking(true);
    setLookupError(null);
    setPaymentRequest(null);

    let raw: unknown;
    try {
      const client = new AleoNetworkClient(API_ENDPOINT);
      const hash = value.endsWith("field") ? value : `${value}field`;
      raw = await client.getProgramMappingValue(
        PROGRAM_ID,
        "payment_requests",
        hash,
      );

      const parsed = parsePaymentRequest(String(raw));
      if (!parsed || parsed.amount === 0n) {
        setLookupError(
          "Payment not ready yet. The factor hasn't requested payment for this invoice. " +
            "Contact the business or factor and ask them to publish the payment request first.",
        );
        return;
      }
      setPaymentRequest(parsed);
    } catch (err) {
      // Check what kind of failure this is
      const msg = err instanceof Error ? err.message : String(err);

      if (
        msg.includes("key not found") ||
        msg.includes("null") ||
        msg.includes("undefined")
      ) {
        // Mapping key doesn't exist at all — invoice hash unknown to contract
        setLookupError(
          "Invoice not found. Double-check the hash is correct and belongs to this network.",
        );
      } else if (msg.includes("not_found") || !raw) {
        // Key exists but payment request not published yet
        setLookupError(
          "Payment not ready yet. The factor hasn't requested payment for this invoice. " +
            "Contact the business or factor and ask them to publish the payment request first.",
        );
      } else {
        setLookupError("Something went wrong. Try again or contact support.");
      }
    }
  };

  const handlePay = async () => {
    if (!paymentRequest) return;

    const hash = invoiceHash.endsWith("field")
      ? invoiceHash
      : `${invoiceHash}field`;

    // Uses credits.aleo/transfer_public — debtor's public balance
    // is debited, factor receives the funds.
    await execute({
      program: PROGRAM_ID,
      function: "pay_invoice",
      inputs: [
        hash,
        `${paymentRequest.amount}u64`,
        paymentRequest.factor, // ← add this
      ],
      fee: 300_000,
      privateFee: false,
    });
  };

  const isOverdue = paymentRequest
    ? Date.now() > paymentRequest.due_date * 1000
    : false;

  const isPaying = status === "submitting" || status === "pending";

  if (paid) {
    return (
      <div className="container py-6 max-w-md mx-auto">
        <Card>
          <CardContent className="pt-8 pb-8 flex flex-col items-center text-center gap-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h2 className="text-xl font-bold">Payment Confirmed</h2>
            <p className="text-muted-foreground">
              Invoice{" "}
              <span className="font-mono">{invoiceHash.slice(0, 12)}…</span> has
              been paid and settled on-chain.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setPaid(false);
                setInvoiceHash("");
                setPaymentRequest(null);
              }}
            >
              Pay Another Invoice
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pay Invoice</h1>
        <p className="text-muted-foreground">
          Enter your invoice hash to look up and pay what you owe.
        </p>
      </div>

      {/* Lookup Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Look Up Invoice</CardTitle>
          <CardDescription>
            Find your invoice hash in the original invoice document you
            received.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invoice-hash">Invoice Hash</Label>
            <div className="flex gap-2">
              <Input
                id="invoice-hash"
                placeholder="123456field"
                value={invoiceHash}
                onChange={(e) => setInvoiceHash(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              />
              <Button
                onClick={() => handleLookup()}
                disabled={!invoiceHash.trim() || isLooking}
                variant="outline"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {lookupError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{lookupError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Payment Card — shown after successful lookup */}
      {paymentRequest && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount */}
            <div className="rounded-md bg-muted px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Amount Due</p>
              <p className="text-2xl font-bold font-mono">
                {formatAleo(paymentRequest.amount)}
              </p>
            </div>

            <Separator />

            {/* Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date</span>
                <span
                  className={isOverdue ? "text-destructive font-medium" : ""}
                >
                  {new Date(
                    paymentRequest.due_date * 1000,
                  ).toLocaleDateString()}
                  {isOverdue && " (Overdue)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pay To</span>
                <span className="font-mono text-xs truncate max-w-[200px]">
                  {paymentRequest.factor.slice(0, 12)}…
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="text-xs">credits.aleo (public)</span>
              </div>
            </div>

            {/* Wallet warning */}
            {!isConnected && (
              <Alert>
                <Wallet className="h-4 w-4" />
                <AlertDescription>
                  Connect your wallet to pay this invoice.
                </AlertDescription>
              </Alert>
            )}

            {/* Wrong debtor warning */}
            {isConnected && address && paymentRequest.debtor !== address && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This invoice is not addressed to your connected wallet.
                  Expected: {paymentRequest.debtor.slice(0, 12)}…
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handlePay}
              disabled={
                !isConnected ||
                isPaying ||
                (!!address && paymentRequest.debtor !== address)
              }
              className="w-full"
              size="lg"
            >
              {isPaying
                ? "Processing…"
                : `Pay ${formatAleo(paymentRequest.amount)}`}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Payment is final and settled on the Aleo blockchain. Powered by
              credits.aleo native payments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
