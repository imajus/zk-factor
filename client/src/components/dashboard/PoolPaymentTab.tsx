/**
 * src/components/dashboard/PoolPaymentTab.tsx
 *
 * Drop this file into src/components/dashboard/.
 *
 * In BusinessDashboard.tsx add two things:
 *
 *   1. Import:
 *        import { PoolPaymentTab } from "@/components/dashboard/PoolPaymentTab";
 *
 *   2. Add a new tab inside the existing <Tabs> block:
 *
 *        <TabsTrigger value="pool-invoices">
 *          Pool Invoices
 *          {!isLoading && poolPaymentNoticeRecords.length > 0 && (
 *            <span className="ml-1.5 text-xs opacity-70">
 *              ({poolPaymentNoticeRecords.length})
 *            </span>
 *          )}
 *        </TabsTrigger>
 *
 *        <TabsContent value="pool-invoices" className="mt-4">
 *          <PoolPaymentTab
 *            records={poolPaymentNoticeRecords}
 *            isLoading={isLoading}
 *          />
 *        </TabsContent>
 *
 *   3. Add this one line to the existing records filter block in BusinessDashboard:
 *
 *        const poolPaymentNoticeRecords = ((records as AleoRecord[]) ?? []).filter(
 *          (r) => r.recordName === "PoolPaymentNotice" && !r.spent,
 *        );
 *
 * That's all — no other changes to BusinessDashboard.tsx.
 */

import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { useTransaction } from "@/hooks/use-transaction";
import { PROGRAM_ID, PROGRAM_ADDRESS } from "@/lib/config";
import { type AleoRecord, getField } from "@/lib/aleo-records";
import { buildPayPoolInvoiceInputs } from "@/lib/pool-chain";

interface PoolPaymentTabProps {
  records: AleoRecord[];
  isLoading: boolean;
}

export function PoolPaymentTab({ records, isLoading }: PoolPaymentTabProps) {
  const queryClient = useQueryClient();
  const { execute, status } = useTransaction();
  const isWorking = status !== "idle";

  const handlePay = async (record: AleoRecord) => {
    if (!PROGRAM_ADDRESS) {
      toast.error(
        "PROGRAM_ADDRESS is not set — cannot route payment to pool escrow.",
      );
      return;
    }

    const invoiceHash = getField(record.recordPlaintext, "invoice_hash");

    try {
      await execute({
        program: PROGRAM_ID,
        function: "pay_pool_invoice",
        inputs: buildPayPoolInvoiceInputs(
          record.recordPlaintext,
          PROGRAM_ADDRESS,
        ),
        fee: 100_000,
        privateFee: false,
      });
      queryClient.invalidateQueries({ queryKey: ["records", PROGRAM_ID] });
      toast.success("Payment sent to pool escrow!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="py-16 text-center">
        <CardContent className="space-y-4">
          <Layers className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <p className="font-medium">No pool payment requests</p>
            <p className="text-sm text-muted-foreground mt-1">
              When a pool-factored invoice reaches you, it appears here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {records.map((record) => {
        const invoiceHash = getField(record.recordPlaintext, "invoice_hash");
        const amountMicro = parseInt(
          getField(record.recordPlaintext, "amount").replace(/u64$/, ""),
          10,
        );
        const dueDateUnix = parseInt(
          getField(record.recordPlaintext, "due_date").replace(/u64$/, ""),
          10,
        );
        const dueDate = new Date(dueDateUnix * 1000).toLocaleDateString();
        const amountAleo = (amountMicro / 1_000_000).toLocaleString(undefined, {
          maximumFractionDigits: 6,
        });

        return (
          <Card
            key={invoiceHash}
            className="hover:border-primary/50 transition-colors"
          >
            <CardContent className="pt-4 space-y-3">
              <span className="font-mono text-sm text-muted-foreground">
                {invoiceHash.slice(0, 12)}…
              </span>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-mono font-medium">
                    {amountAleo} ALEO
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due</span>
                  <span>{dueDate}</span>
                </div>
              </div>

              <Badge
                variant="outline"
                className="w-full justify-center text-xs text-violet-700 border-violet-300"
              >
                Pool Invoice
              </Badge>

              <Button
                size="sm"
                className="w-full"
                onClick={() => handlePay(record)}
                disabled={isWorking}
              >
                {isWorking ? "Paying…" : "Pay Invoice"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
