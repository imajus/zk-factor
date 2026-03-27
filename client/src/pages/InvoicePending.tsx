import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Clock3, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/contexts/WalletContext";
import { PROGRAM_ID } from "@/lib/config";
import { type AleoRecord, getField } from "@/lib/aleo-records";

export default function InvoicePending() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { requestRecords } = useWallet();

  const invoiceHash = searchParams.get("hash")?.trim() ?? "";

  const { data: isVisible, isLoading } = useQuery({
    queryKey: ["invoice-visible", PROGRAM_ID, invoiceHash],
    enabled: !!invoiceHash,
    queryFn: async () => {
      const records = (await requestRecords(PROGRAM_ID, true)) as AleoRecord[];
      return records.some(
        (record) =>
          record.recordName === "Invoice" &&
          !record.spent &&
          getField(record.recordPlaintext, "invoice_hash") === invoiceHash,
      );
    },
    refetchInterval: (query) => (query.state.data ? false : 3000),
    retry: false,
    staleTime: 0,
  });

  useEffect(() => {
    if (isVisible) {
      toast.success("Invoice is now visible in your dashboard.");
      const redirectTimer = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 1200);

      return () => clearTimeout(redirectTimer);
    }
  }, [isVisible, navigate]);

  const settled = !!isVisible;

  return (
    <div className="container max-w-2xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Publishing Invoice to Your Wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={
              settled
                ? "rounded-md border border-emerald-300 bg-emerald-50 p-4"
                : "rounded-md border border-amber-300 bg-amber-50 p-4"
            }
          >
            <div className="flex items-start gap-3">
              {settled ? (
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-emerald-600" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin mt-0.5 text-amber-600" />
              )}
              <div className="space-y-1">
                <p className="font-medium">
                  {settled ? "Invoice settled" : "Waiting for record sync"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {settled
                    ? "Your invoice has settled and is now visible. Redirecting to your invoice dashboard..."
                    : "Your transaction is accepted. We are waiting for the new invoice record to appear in your wallet."}
                </p>
              </div>
            </div>
          </div>

          {invoiceHash && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Invoice Hash</p>
              <p className="font-mono text-xs break-all">{invoiceHash}</p>
            </div>
          )}

          <div className="rounded-md border p-3 text-sm text-muted-foreground flex items-center gap-2">
            <Clock3 className="h-4 w-4" />
            {isLoading || !isVisible
              ? "This can take up to ~30 seconds depending on network and wallet sync."
              : "Invoice synced. Taking you to dashboard..."}
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/dashboard")}
          >
            Skip and Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
