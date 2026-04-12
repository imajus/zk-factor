import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarIcon,
  Sparkles,
  FileText,
  Info,
  Paperclip,
  X,
  Loader2,
  ExternalLink,
  ChevronDown,
  Lock,
  Building2,
  Users,
  Globe,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { useWallet } from "@/contexts/WalletContext";
import { useTransaction } from "@/hooks/use-transaction";
import { PROGRAM_ID, PaymentCurrency } from "@/lib/config";
import {
  encodeInvoiceMetadata,
  persistInvoiceCurrency,
} from "@/lib/aleo-records";
import { uploadToIPFS, type IPFSUploadResult } from "@/lib/ipfs";

const ALEO_FIELD_MODULUS =
  8444461749428370424248824938781546531375899335154063827935233455917409239041n;

// Zero field — used when no document is attached
const EMPTY_CID_FIELD = "0field";

async function computeInvoiceHash(
  invoiceNumber: string,
  debtor: string,
  amountMicrocredits: bigint,
): Promise<string> {
  const canonical = `${invoiceNumber}:${debtor}:${amountMicrocredits}`;
  const encoded = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashBytes = new Uint8Array(hashBuffer);

  // Pack all 32 bytes into a BigInt
  let value = 0n;
  for (const byte of hashBytes) {
    value = (value << 8n) | BigInt(byte);
  }

  return `${value % ALEO_FIELD_MODULUS}field`;
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { isConnected } = useWallet();
  const { execute, status, error: txError } = useTransaction();
  const isSubmitting = status === "submitting" || status === "pending";

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [description, setDescription] = useState("");
  const [debtorAddress, setDebtorAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState<Date>();
  const [internalNotes, setInternalNotes] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [currency, setCurrency] = useState<PaymentCurrency>("ALEO");
  const pendingInvoiceRef = useRef<{
    hash: string;
    currency: PaymentCurrency;
  } | null>(null);

  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [ipfsResult, setIpfsResult] = useState<IPFSUploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showVisibilityGuide, setShowVisibilityGuide] = useState(false);

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    setInvoiceNumber(`INV-${new Date().getFullYear()}-${timestamp}`);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedFile(file);
    setIpfsResult(null);
    setIsUploading(true);

    try {
      const result = await uploadToIPFS(file);
      setIpfsResult(result);
      toast.success("Document uploaded to IPFS");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "IPFS upload failed");
      setAttachedFile(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    setIpfsResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Transaction status ─────────────────────────────────────────────────────

  useEffect(() => {
    if (status === "submitting") {
      toast.loading("Generating proof...", { id: "create-invoice" });
    } else if (status === "pending") {
      toast.loading("Broadcasting...", { id: "create-invoice" });
    } else if (status === "accepted") {
      let createdInvoiceHash: string | null = null;
      if (pendingInvoiceRef.current) {
        persistInvoiceCurrency(
          pendingInvoiceRef.current.hash,
          pendingInvoiceRef.current.currency,
        );
        createdInvoiceHash = pendingInvoiceRef.current.hash;
        pendingInvoiceRef.current = null;
      }
      toast.success("Invoice created successfully!", { id: "create-invoice" });
      if (createdInvoiceHash) {
        navigate(
          `/invoices/pending?hash=${encodeURIComponent(createdInvoiceHash)}`,
        );
      } else {
        navigate("/dashboard");
      }
    } else if (status === "failed") {
      pendingInvoiceRef.current = null;
      toast.error(txError || "Failed to create invoice", {
        id: "create-invoice",
      });
    }
  }, [status, txError, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !dueDate) return;

    if (attachedFile && isUploading) {
      toast.error("Please wait for document upload to complete");
      return;
    }

    try {
      const amountMicrocredits = BigInt(
        Math.round(parseFloat(amount) * 1_000_000),
      );
      const dueDateUnix = BigInt(Math.floor(dueDate.getTime() / 1000));
      const invoiceHash = await computeInvoiceHash(
        invoiceNumber,
        debtorAddress,
        amountMicrocredits,
      );
      const metadata = encodeInvoiceMetadata(invoiceNumber, currency);
      const documentCid = ipfsResult?.cidField ?? EMPTY_CID_FIELD;

      pendingInvoiceRef.current = { hash: invoiceHash, currency };

      await execute({
        program: PROGRAM_ID,
        function: "mint_invoice",
        inputs: [
          debtorAddress,
          `${amountMicrocredits}u64`,
          `${dueDateUnix}u64`,
          invoiceHash,
          metadata,
          documentCid,
        ],
        fee: 100_000,
        privateFee: false,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create invoice",
        { id: "create-invoice" },
      );
    }
  };

  const isValidAddress = (addr: string) =>
    addr.startsWith("aleo1") && addr.length === 63;

  const isFormValid =
    isConnected &&
    !!invoiceNumber &&
    !!debtorAddress &&
    !!amount &&
    !!dueDate &&
    !isUploading;

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Invoice</h1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-2">
            Mint a new invoice record on-chain
            <a href="/docs/business/create-invoice" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
               <Info className="h-3 w-3" /> Learn more
            </a>
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                    <PrivacyBadge level="private" />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="INV-2026-001"
                      maxLength={32}
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateInvoiceNumber}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Internal reference number
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="description">Description *</Label>
                    <PrivacyBadge level="private" />
                  </div>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of goods/services"
                    maxLength={500}
                    rows={3}
                    required
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length}/500 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="debtorAddress">Debtor Address *</Label>
                    <PrivacyBadge level="factor" />
                    <PrivacyBadge level="debtor" />
                  </div>
                  <Input
                    id="debtorAddress"
                    value={debtorAddress}
                    onChange={(e) => setDebtorAddress(e.target.value)}
                    placeholder="aleo1..."
                    className="font-mono"
                    required
                  />
                  {debtorAddress && !isValidAddress(debtorAddress) && (
                    <p className="text-xs text-destructive">
                      Invalid Aleo address format
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Customer who will pay this invoice
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Payment Currency</Label>
                    <PrivacyBadge level="factor" />
                  </div>
                  <div className="flex gap-2">
                    {(["ALEO", "USDCx"] as PaymentCurrency[]).map((c) => (
                      <Button
                        key={c}
                        type="button"
                        variant={currency === c ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrency(c)}
                      >
                        {c}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currency === "USDCx"
                      ? "Factor pays in USDCx stablecoin — no price volatility"
                      : "Factor pays in native ALEO credits"}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="amount">Invoice Amount * ({currency})</Label>
                    <PrivacyBadge level="factor" />
                    <PrivacyBadge level="debtor" />
                  </div>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.000001"
                    required
                  />
                  {amount && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {(parseFloat(amount) * 1000000).toLocaleString()}{" "}
                      microcredits
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Due Date *</Label>
                    <PrivacyBadge level="factor" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal flex-1",
                            !dueDate && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={setDueDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDueDate(addDays(new Date(), 30))}
                    >
                      +30d
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDueDate(addDays(new Date(), 60))}
                    >
                      +60d
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDueDate(addDays(new Date(), 90))}
                    >
                      +90d
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attach Document (Optional)
                  <PrivacyBadge level="factor" />
                </CardTitle>
                <CardDescription>
                  Upload supporting documents — stored on IPFS, CID recorded
                  on-chain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!attachedFile ? (
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const syntheticEvent = {
                          target: { files: e.dataTransfer.files },
                        } as unknown as React.ChangeEvent<HTMLInputElement>;
                        handleFileSelect(syntheticEvent);
                      }
                    }}
                  >
                    <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">
                      Click or drag to attach a file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Any file type — PDF, images, spreadsheets, contracts
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-8 w-8 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {attachedFile.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachedFile.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={removeAttachment}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {isUploading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading to IPFS...
                      </div>
                    )}

                    {ipfsResult && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-green-600 dark:text-green-400">
                            ✓ Uploaded to IPFS
                          </span>
                          <a
                            href={ipfsResult.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            View <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {ipfsResult.cid}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />

                <p className="text-xs text-muted-foreground">
                  The IPFS content hash (CID) is stored privately in your
                  invoice record. Only parties with access to the record can
                  retrieve the document.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy & Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="internalNotes">
                      Internal Notes (Optional)
                    </Label>
                    <PrivacyBadge level="private" />
                  </div>
                  <Textarea
                    id="internalNotes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Private notes, not recorded on-chain"
                    maxLength={1000}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice #</span>
                    <span className="font-mono">{invoiceNumber || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono font-semibold">
                      {amount
                        ? `${parseFloat(amount).toLocaleString()} ${currency}`
                        : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date</span>
                    <span>
                      {dueDate ? format(dueDate, "MMM d, yyyy") : "-"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Document</span>
                    <span className="text-xs">
                      {ipfsResult
                        ? "✓ Attached"
                        : attachedFile && isUploading
                          ? "Uploading..."
                          : "None"}
                    </span>
                  </div>
                </div>
                <Separator />
                <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between"
                    >
                      Technical Details
                      <Info className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2 text-xs text-muted-foreground pt-2">
                    <div className="flex justify-between">
                      <span>Estimated gas</span>
                      <span className="font-mono">~0.005 ALEO</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Proving time</span>
                      <span>30-60 seconds</span>
                    </div>
                    {ipfsResult && (
                      <div className="flex justify-between">
                        <span>CID field</span>
                        <span className="font-mono truncate max-w-[120px]">
                          {ipfsResult.cidField}
                        </span>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting || !isFormValid}
                >
                  {!isConnected
                    ? "Connect Wallet"
                    : isSubmitting
                      ? "Creating..."
                      : "Create Invoice"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/dashboard")}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <Collapsible
                  open={showVisibilityGuide}
                  onOpenChange={setShowVisibilityGuide}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between text-sm font-semibold hover:text-foreground/80 transition-colors"
                      aria-expanded={showVisibilityGuide}
                    >
                      Data visibility guide
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-200",
                          showVisibilityGuide && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-3 text-xs text-muted-foreground">
                    <p>
                      Each badge shows who can see that field and via which
                      on-chain record.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none shrink-0 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                          <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                          Private
                        </span>
                        <span>
                          Only you (the creditor). Encrypted in the Invoice
                          record; never shared.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none shrink-0 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                          <Building2
                            className="h-2.5 w-2.5"
                            aria-hidden="true"
                          />
                          Factor
                        </span>
                        <span>
                          Visible to the factor you offer this invoice to, via
                          the FactoringOffer record.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none shrink-0 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                          <Users className="h-2.5 w-2.5" aria-hidden="true" />
                          Debtor
                        </span>
                        <span>
                          Shared with your debtor at payment time, via the
                          PaymentNotice record.
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none shrink-0 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-700">
                          <Globe className="h-2.5 w-2.5" aria-hidden="true" />
                          Public
                        </span>
                        <span>Visible to anyone on-chain.</span>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </CardHeader>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
