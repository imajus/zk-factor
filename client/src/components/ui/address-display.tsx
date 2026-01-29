import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AddressDisplayProps {
  address: string;
  truncate?: boolean;
  chars?: number;
  showCopy?: boolean;
  showExplorer?: boolean;
  className?: string;
}

export function AddressDisplay({
  address,
  truncate = true,
  chars = 6,
  showCopy = true,
  showExplorer = false,
  className,
}: AddressDisplayProps) {
  const displayAddress = truncate
    ? `${address.slice(0, chars + 5)}...${address.slice(-chars)}`
    : address;

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="font-mono text-sm cursor-default">{displayAddress}</span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-mono text-xs">{address}</span>
        </TooltipContent>
      </Tooltip>
      {showCopy && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyAddress}>
          <Copy className="h-3 w-3" />
        </Button>
      )}
      {showExplorer && (
        <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
          <a href={`https://explorer.aleo.org/address/${address}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3 w-3" />
          </a>
        </Button>
      )}
    </div>
  );
}
