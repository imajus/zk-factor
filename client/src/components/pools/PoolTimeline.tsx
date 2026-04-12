/**
 * PoolTimeline
 *
 * Renders the pool lifecycle timeline as a vertical list.
 * Each phase has a circle indicator:
 *   - Green  (✓) = completed
 *   - Amber  (●) = current / in progress
 *   - Gray   (○) = not yet reached
 *
 * This version uses 7 explicit lifecycle checkpoints.
 *
 * Usage:
 *   <PoolTimeline pool={selectedPool} activeFactorCount={activeFactorCount} />
 *
 * The component is self-contained and derives all phase states from the
 * OnChainPoolState object — no extra fetching needed (settlement and proceeds
 * are already part of the object fetched by fetchPoolState).
 */

import { cn } from "@/lib/utils";
import {
  computePoolStats,
  getPoolCurrentFunds,
  type OnChainPoolState,
} from "@/lib/pool-chain";
import { CheckCircle2, Circle, Clock } from "lucide-react";

// ── Phase definitions ─────────────────────────────────────────────────────────

type PhaseStatus = "done" | "active" | "pending";

interface Phase {
  label: string;
  description: string;
  status: PhaseStatus;
  detail?: string;
}

function derivePhases(
  pool: OnChainPoolState,
  activeFactorCount: number,
): Phase[] {
  const stats = computePoolStats(pool, activeFactorCount);

  const hasFunds = pool.totalContributed > 0n;
  const invoiceSubmitted = pool.pendingOffer !== null;
  const votesDone = stats.allVotesCast;
  const advanceExecuted = pool.pendingOffer?.isExecuted === true;
  const debtorPaid = pool.isSettled;
  const distributionOpen = pool.proceeds !== null && pool.proceeds > 0n;
  const fullyDistributed =
    distributionOpen && pool.distributed >= pool.proceeds!;
  const currentFunds = getPoolCurrentFunds(pool);

  const funding: Phase = {
    label: "Funding",
    description: "Pool receives factor contributions.",
    status: hasFunds ? "done" : "active",
    detail: `${(Number(currentFunds) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ALEO current funds`,
  };

  const invoicePhase: Phase = {
    label: "Factoring Offer",
    description: "Business submits a factoring offer into this pool.",
    status: invoiceSubmitted
      ? "done"
      : hasFunds && !pool.isClosed
        ? "active"
        : "pending",
    detail: invoiceSubmitted
      ? `${(Number(pool.pendingOffer!.amount) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ALEO invoice`
      : undefined,
  };

  const votingPhase: Phase = {
    label: "Voting Complete",
    description: `All factors must vote (${stats.requiredVotes} total).`,
    status: votesDone ? "done" : invoiceSubmitted ? "active" : "pending",
    detail: invoiceSubmitted
      ? `Approve ${stats.approveCount} · Reject ${stats.rejectCount} (${stats.totalVotes}/${stats.requiredVotes})`
      : undefined,
  };

  const advancePhase: Phase = {
    label: "Advance Paid",
    description: "Pool executes and sends advance to the business.",
    status: advanceExecuted
      ? "done"
      : votesDone && stats.isApproved
        ? "active"
        : "pending",
    detail:
      advanceExecuted && pool.pendingOffer
        ? `${(Number(pool.pendingOffer.advanceAmount) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ALEO advanced`
        : undefined,
  };

  const debtorPaidPhase: Phase = {
    label: "Debtor Paid",
    description: "Debtor repayment is recognized for this pool.",
    status: debtorPaid ? "done" : advanceExecuted ? "active" : "pending",
    detail: debtorPaid ? "Settlement confirmed on-chain" : undefined,
  };

  const distributionPhase: Phase = {
    label: "Distribution Opened",
    description: "Proceeds are opened for share claims.",
    status: distributionOpen ? "done" : debtorPaid ? "active" : "pending",
    detail: distributionOpen
      ? `${(Number(pool.proceeds!) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ALEO available`
      : undefined,
  };

  const claimsPhase: Phase = {
    label: "Claims",
    description: "Factors claim their proportional pool proceeds.",
    status: fullyDistributed ? "done" : distributionOpen ? "active" : "pending",
    detail:
      distributionOpen && pool.distributed > 0n
        ? `${(Number(pool.distributed) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} ALEO claimed so far`
        : distributionOpen
          ? "Ready to claim"
          : undefined,
  };

  return [
    funding,
    invoicePhase,
    votingPhase,
    advancePhase,
    debtorPaidPhase,
    distributionPhase,
    claimsPhase,
  ];
}

// ── Icon ─────────────────────────────────────────────────────────────────────

function PhaseIcon({ status }: { status: PhaseStatus }) {
  if (status === "done") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
  }
  if (status === "active") {
    return <Clock className="h-5 w-5 text-amber-500 shrink-0 animate-pulse" />;
  }
  return <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface PoolTimelineProps {
  pool: OnChainPoolState;
  activeFactorCount: number;
  className?: string;
}

export function PoolTimeline({
  pool,
  activeFactorCount,
  className,
}: PoolTimelineProps) {
  const phases = derivePhases(pool, activeFactorCount);

  return (
    <div className={cn("space-y-3 w-full", className)}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Pool Lifecycle
      </p>

      <div className="space-y-2">
        {phases.map((phase, idx) => (
          <div key={idx} className="relative pl-8">
            {idx < phases.length - 1 && (
              <div className="absolute left-[12px] top-6 bottom-[-10px] w-px bg-border" />
            )}

            <div className="absolute left-0 top-0 z-10 bg-background rounded-full">
              <PhaseIcon status={phase.status} />
            </div>

            <div className="rounded-md border bg-card/60 px-2 py-1.5">
              <div className="flex flex-wrap items-start gap-1.5">
                <p
                  title={phase.description}
                  className={cn(
                    "text-sm font-semibold leading-tight",
                    phase.status === "done" && "text-foreground",
                    phase.status === "active" &&
                      "text-amber-700 dark:text-amber-400",
                    phase.status === "pending" && "text-muted-foreground",
                  )}
                >
                  {phase.label}
                </p>

                {phase.status === "active" && (
                  <span className="inline-flex items-center rounded-full border border-amber-300/80 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Now
                  </span>
                )}
              </div>

              {phase.detail && (
                <p
                  className={cn(
                    "text-xs font-mono mt-1.5 break-words",
                    phase.status === "done"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {phase.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
