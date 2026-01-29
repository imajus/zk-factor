import { InvoiceStatus } from '@/components/ui/status-badge';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  debtorAddress: string;
  amount: number;
  dueDate: Date;
  createdAt: Date;
  status: InvoiceStatus;
  description?: string;
  factorAddress?: string;
  advanceRate?: number;
  advanceAmount?: number;
}

export interface Factor {
  id: string;
  address: string;
  name?: string;
  verified: boolean;
  minAdvanceRate: number;
  maxAdvanceRate: number;
  typicalFee: number;
  minInvoice: number;
  maxInvoice: number;
  totalVolume: number;
  invoicesFactored: number;
  successRate: number;
  avgProcessingTime: string;
  specializations: string[];
  recourse: 'offered' | 'not_offered' | 'case_by_case';
}

export interface Transaction {
  id: string;
  type: 'invoice_created' | 'invoice_factored' | 'invoice_settled' | 'payment_received' | 'payment_sent';
  status: 'success' | 'pending' | 'failed';
  amount?: number;
  timestamp: Date;
  blockHeight?: number;
  invoiceId?: string;
  counterparty?: string;
  gasUsed?: number;
}

export interface Activity {
  id: string;
  type: 'created' | 'factored' | 'settled' | 'request_sent';
  invoiceId: string;
  amount: number;
  timestamp: Date;
  status: InvoiceStatus;
}

// Mock Invoices
export const mockInvoices: Invoice[] = [
  {
    id: 'inv_001',
    invoiceNumber: 'INV-2026-001',
    debtorAddress: 'aleo1debtor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpgxkzj',
    amount: 15000,
    dueDate: new Date('2026-03-15'),
    createdAt: new Date('2026-01-15'),
    status: 'created',
    description: 'Software development services - Q1 2026',
  },
  {
    id: 'inv_002',
    invoiceNumber: 'INV-2026-002',
    debtorAddress: 'aleo1debtor2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqw8yk3m',
    amount: 28500,
    dueDate: new Date('2026-02-28'),
    createdAt: new Date('2026-01-10'),
    status: 'request_sent',
    description: 'Consulting services - February batch',
  },
  {
    id: 'inv_003',
    invoiceNumber: 'INV-2026-003',
    debtorAddress: 'aleo1debtor3qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqh5e4ft',
    amount: 42000,
    dueDate: new Date('2026-04-01'),
    createdAt: new Date('2026-01-05'),
    status: 'factored',
    description: 'Equipment rental - Annual contract',
    factorAddress: 'aleo1factor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcr5w8y',
    advanceRate: 90,
    advanceAmount: 37800,
  },
  {
    id: 'inv_004',
    invoiceNumber: 'INV-2025-098',
    debtorAddress: 'aleo1debtor4qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqz7xvhe',
    amount: 8750,
    dueDate: new Date('2026-01-20'),
    createdAt: new Date('2025-12-20'),
    status: 'settled',
    description: 'Marketing services - December',
  },
  {
    id: 'inv_005',
    invoiceNumber: 'INV-2026-004',
    debtorAddress: 'aleo1debtor5qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmn2p9l',
    amount: 63500,
    dueDate: new Date('2026-03-30'),
    createdAt: new Date('2026-01-25'),
    status: 'created',
    description: 'Cloud infrastructure - Q1 2026',
  },
];

// Mock Factors
export const mockFactors: Factor[] = [
  {
    id: 'factor_001',
    address: 'aleo1factor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcr5w8y',
    name: 'Alpha Capital',
    verified: true,
    minAdvanceRate: 85,
    maxAdvanceRate: 95,
    typicalFee: 2.5,
    minInvoice: 5000,
    maxInvoice: 500000,
    totalVolume: 12500000,
    invoicesFactored: 847,
    successRate: 98.5,
    avgProcessingTime: '24 hours',
    specializations: ['Technology', 'Services'],
    recourse: 'offered',
  },
  {
    id: 'factor_002',
    address: 'aleo1factor2qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqt8fjn4',
    name: 'BlockFin Partners',
    verified: true,
    minAdvanceRate: 80,
    maxAdvanceRate: 92,
    typicalFee: 3.0,
    minInvoice: 1000,
    maxInvoice: 100000,
    totalVolume: 4800000,
    invoicesFactored: 523,
    successRate: 97.2,
    avgProcessingTime: '12 hours',
    specializations: ['Manufacturing', 'Retail'],
    recourse: 'case_by_case',
  },
  {
    id: 'factor_003',
    address: 'aleo1factor3qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqp7rx5k',
    name: 'DeFi Factors',
    verified: false,
    minAdvanceRate: 88,
    maxAdvanceRate: 98,
    typicalFee: 1.5,
    minInvoice: 10000,
    maxInvoice: 1000000,
    totalVolume: 28900000,
    invoicesFactored: 1234,
    successRate: 99.1,
    avgProcessingTime: '6 hours',
    specializations: ['Technology', 'Healthcare'],
    recourse: 'not_offered',
  },
];

// Mock Transactions
export const mockTransactions: Transaction[] = [
  {
    id: 'tx_001',
    type: 'invoice_created',
    status: 'success',
    amount: 15000,
    timestamp: new Date('2026-01-28T10:30:00'),
    blockHeight: 1234567,
    invoiceId: 'inv_001',
    gasUsed: 0.005,
  },
  {
    id: 'tx_002',
    type: 'invoice_factored',
    status: 'success',
    amount: 37800,
    timestamp: new Date('2026-01-27T14:15:00'),
    blockHeight: 1234540,
    invoiceId: 'inv_003',
    counterparty: 'aleo1factor1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcr5w8y',
    gasUsed: 0.012,
  },
  {
    id: 'tx_003',
    type: 'payment_received',
    status: 'success',
    amount: 8750,
    timestamp: new Date('2026-01-26T09:00:00'),
    blockHeight: 1234500,
    invoiceId: 'inv_004',
    gasUsed: 0.003,
  },
  {
    id: 'tx_004',
    type: 'invoice_settled',
    status: 'success',
    amount: 8750,
    timestamp: new Date('2026-01-26T09:05:00'),
    blockHeight: 1234501,
    invoiceId: 'inv_004',
    gasUsed: 0.008,
  },
  {
    id: 'tx_005',
    type: 'invoice_created',
    status: 'pending',
    amount: 63500,
    timestamp: new Date('2026-01-25T16:45:00'),
    invoiceId: 'inv_005',
  },
];

// Mock Activities
export const mockActivities: Activity[] = [
  {
    id: 'act_001',
    type: 'created',
    invoiceId: 'inv_001',
    amount: 15000,
    timestamp: new Date('2026-01-28T10:30:00'),
    status: 'created',
  },
  {
    id: 'act_002',
    type: 'request_sent',
    invoiceId: 'inv_002',
    amount: 28500,
    timestamp: new Date('2026-01-27T15:00:00'),
    status: 'request_sent',
  },
  {
    id: 'act_003',
    type: 'factored',
    invoiceId: 'inv_003',
    amount: 42000,
    timestamp: new Date('2026-01-27T14:15:00'),
    status: 'factored',
  },
  {
    id: 'act_004',
    type: 'settled',
    invoiceId: 'inv_004',
    amount: 8750,
    timestamp: new Date('2026-01-26T09:05:00'),
    status: 'settled',
  },
  {
    id: 'act_005',
    type: 'created',
    invoiceId: 'inv_005',
    amount: 63500,
    timestamp: new Date('2026-01-25T16:45:00'),
    status: 'created',
  },
];

// Helper functions
export function formatAleo(amount: number): string {
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 }) + ' ALEO';
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

export function getDaysUntilDue(date: Date): number {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
