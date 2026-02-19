import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarIcon,
  Plus,
  Trash2,
  Sparkles,
  FileText,
  Info,
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useWallet } from '@/contexts/WalletContext';
import { TransactionStatus } from '@provablehq/aleo-types';
import { PROGRAM_ID } from '@/lib/config';
const ALEO_FIELD_MODULUS = 8444461749428370424248824938781546531375899335154063827935233455917409239041n;

function computeInvoiceHash(invoiceNumber: string, debtor: string, amountMicrocredits: bigint): string {
  const canonical = `${invoiceNumber}:${debtor}:${amountMicrocredits}`;
  const bytes = new TextEncoder().encode(canonical);
  let value = 0n;
  for (let i = 0; i < Math.min(16, bytes.length); i++) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return `${value % ALEO_FIELD_MODULUS}field`;
}

function encodeMetadata(invoiceNumber: string): string {
  const bytes = new TextEncoder().encode(invoiceNumber);
  let value = 0n;
  for (let i = 0; i < Math.min(16, bytes.length); i++) {
    value = (value << 8n) | BigInt(bytes[i]);
  }
  return `${value}u128`;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export default function CreateInvoice() {
  const navigate = useNavigate();
  const { isConnected, executeTransaction, transactionStatus } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [debtorAddress, setDebtorAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [makeDebtorPublic, setMakeDebtorPublic] = useState(false);
  const [internalNotes, setInternalNotes] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const generateInvoiceNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    setInvoiceNumber(`INV-${new Date().getFullYear()}-${timestamp}`);
  };

  const addItem = () => {
    setItems([...items, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const itemsTotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !dueDate) return;

    setIsSubmitting(true);

    try {
      const amountMicrocredits = BigInt(Math.round(parseFloat(amount) * 1_000_000));
      const dueDateUnix = BigInt(Math.floor(dueDate.getTime() / 1000));
      const invoiceHash = computeInvoiceHash(invoiceNumber, debtorAddress, amountMicrocredits);
      const metadata = encodeMetadata(invoiceNumber);

      toast.loading('Generating proof…', { id: 'create-invoice' });

      const result = await executeTransaction({
        program: PROGRAM_ID,
        function: 'mint_invoice',
        inputs: [
          debtorAddress,
          `${amountMicrocredits}u64`,
          `${dueDateUnix}u64`,
          invoiceHash,
          metadata,
        ],
      });

      if (!result) {
        throw new Error('Transaction returned no result');
      }

      const { transactionId } = result;

      toast.loading('Broadcasting…', { id: 'create-invoice' });

      const poll = setInterval(async () => {
        try {
          const status = await transactionStatus(transactionId);
          if (status.status === TransactionStatus.ACCEPTED) {
            clearInterval(poll);
            toast.success('Invoice created successfully!', { id: 'create-invoice' });
            setIsSubmitting(false);
            navigate('/invoices');
          } else if (status.status === TransactionStatus.FAILED || status.status === TransactionStatus.REJECTED) {
            clearInterval(poll);
            throw new Error(status.error || 'Transaction failed');
          }
        } catch (err) {
          clearInterval(poll);
          toast.error(err instanceof Error ? err.message : 'Transaction failed', { id: 'create-invoice' });
          setIsSubmitting(false);
        }
      }, 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invoice', { id: 'create-invoice' });
      setIsSubmitting(false);
    }
  };

  const isValidAddress = (addr: string) => addr.startsWith('aleo1') && addr.length === 63;
  const isFormValid = isConnected && !!invoiceNumber && !!debtorAddress && !!amount && !!dueDate;

  return (
    <div className="container py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/invoices">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create Invoice</h1>
          <p className="text-muted-foreground">Mint a new invoice record on-chain</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Invoice Number */}
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="INV-2026-001"
                      maxLength={32}
                      required
                    />
                    <Button type="button" variant="outline" onClick={generateInvoiceNumber}>
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Internal reference number</p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
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

                {/* Debtor Address */}
                <div className="space-y-2">
                  <Label htmlFor="debtorAddress">Debtor Address *</Label>
                  <Input
                    id="debtorAddress"
                    value={debtorAddress}
                    onChange={(e) => setDebtorAddress(e.target.value)}
                    placeholder="aleo1..."
                    className="font-mono"
                    required
                  />
                  {debtorAddress && !isValidAddress(debtorAddress) && (
                    <p className="text-xs text-destructive">Invalid Aleo address format</p>
                  )}
                  <p className="text-xs text-muted-foreground">Customer who will pay this invoice</p>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Invoice Amount * (ALEO)</Label>
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
                      ≈ {(parseFloat(amount) * 1000000).toLocaleString()} microcredits
                    </p>
                  )}
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <div className="flex flex-wrap gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'justify-start text-left font-normal flex-1',
                            !dueDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dueDate ? format(dueDate, 'PPP') : 'Pick a date'}
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
                    <Button type="button" variant="outline" size="sm" onClick={() => setDueDate(addDays(new Date(), 30))}>
                      +30d
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setDueDate(addDays(new Date(), 60))}>
                      +60d
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setDueDate(addDays(new Date(), 90))}>
                      +90d
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Invoice Items */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Items (Optional)</CardTitle>
                <CardDescription>Add line items for detailed invoicing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.length > 0 && (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="Item description"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          />
                        </div>
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20"
                          min="1"
                        />
                        <Input
                          type="number"
                          placeholder="Price"
                          value={item.unitPrice || ''}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-28"
                          min="0"
                          step="0.01"
                        />
                        <div className="w-28 text-right font-mono text-sm py-2">
                          {(item.quantity * item.unitPrice).toLocaleString()} ALEO
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total</span>
                      <span className="font-mono font-semibold">{itemsTotal.toLocaleString()} ALEO</span>
                    </div>
                    {itemsTotal > 0 && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setAmount(itemsTotal.toString())}>
                        Use as Invoice Amount
                      </Button>
                    )}
                  </div>
                )}
                <Button type="button" variant="outline" onClick={addItem} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardContent>
            </Card>

            {/* Privacy & Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Metadata</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="makeDebtorPublic"
                    checked={makeDebtorPublic}
                    onCheckedChange={(checked) => setMakeDebtorPublic(checked as boolean)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="makeDebtorPublic" className="cursor-pointer">
                      Make debtor address public
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      If checked, debtor can see they owe this invoice
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internalNotes">Internal Notes (Optional)</Label>
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice #</span>
                    <span className="font-mono">{invoiceNumber || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono font-semibold">
                      {amount ? `${parseFloat(amount).toLocaleString()} ALEO` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date</span>
                    <span>{dueDate ? format(dueDate, 'MMM d, yyyy') : '—'}</span>
                  </div>
                </div>
                <Separator />
                <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
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
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting || !isFormValid}
                >
                  {!isConnected ? 'Connect Wallet' : isSubmitting ? 'Creating…' : 'Create Invoice'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/invoices')}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
