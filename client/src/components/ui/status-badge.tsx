import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type InvoiceStatus = 'created' | 'request_sent' | 'factored' | 'settled' | 'cancelled';
export type TransactionStatus = 'success' | 'pending' | 'failed';

interface StatusBadgeProps {
  status: InvoiceStatus | TransactionStatus;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  created: {
    label: 'Created',
    className: 'bg-info/10 text-info border-info/20',
  },
  request_sent: {
    label: 'Request Sent',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  factored: {
    label: 'Factored',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  settled: {
    label: 'Settled',
    className: 'bg-muted text-muted-foreground border-border',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  success: {
    label: 'Success',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  pending: {
    label: 'Pending',
    className: 'bg-warning/10 text-warning border-warning/20',
  },
  failed: {
    label: 'Failed',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, className: '' };

  return (
    <Badge 
      variant="outline" 
      className={cn('font-medium', config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
