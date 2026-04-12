import * as React from "react";
import { Lock, Building2, Users, Globe } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type PrivacyLevel = "private" | "factor" | "debtor" | "public";

interface PrivacyBadgeProps {
  level: PrivacyLevel;
  className?: string;
}

const PRIVACY_CONFIG: Record<
  PrivacyLevel,
  {
    label: string;
    tooltip: string;
    icon: React.ElementType;
    colorClass: string;
  }
> = {
  private: {
    label: "Private",
    tooltip:
      "Encrypted in your Invoice record — only you (the creditor) can see this.",
    icon: Lock,
    colorClass:
      "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  },
  factor: {
    label: "Factor",
    tooltip:
      "Visible to the factor you offer this invoice to, via the FactoringOffer record.",
    icon: Building2,
    colorClass:
      "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
  },
  debtor: {
    label: "Debtor",
    tooltip:
      "Shared with your debtor at payment time, via the PaymentNotice record.",
    icon: Users,
    colorClass:
      "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  },
  public: {
    label: "Public",
    tooltip: "Visible to anyone on-chain.",
    icon: Globe,
    colorClass:
      "text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/30 border-slate-200 dark:border-slate-700",
  },
};

export function PrivacyBadge({ level, className }: PrivacyBadgeProps) {
  const config = PRIVACY_CONFIG[level];
  const Icon = config.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none cursor-default select-none",
              config.colorClass,
              className,
            )}
            aria-label={`Privacy level: ${config.label} — ${config.tooltip}`}
          >
            <Icon className="h-2.5 w-2.5" aria-hidden="true" />
            <span>{config.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px] text-center text-xs">
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
