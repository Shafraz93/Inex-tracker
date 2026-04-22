import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Scale, Wallet } from "lucide-react";

import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

export type SalaryAdvanceSummaryPanelProps = {
  startingBalance: number;
  startingBalanceDate: string | null;
  repaid: number;
  remaining: number;
  percentRepaid: number;
  paidOff: boolean;
  className?: string;
};

const statShell =
  "flex flex-col rounded-xl border border-border bg-muted/30 p-4 ring-1 ring-foreground/5";

function StatTile({
  icon: Icon,
  label,
  value,
  subline,
  highlight,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  subline?: string | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        statShell,
        highlight && "border-primary/40 bg-primary/10 ring-primary/20"
      )}
    >
      <div className="bg-background/80 mb-3 flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-foreground/10">
        <Icon className="text-muted-foreground size-4" aria-hidden />
      </div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1 text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {subline ? (
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {subline}
        </p>
      ) : null}
    </div>
  );
}

export function SalaryAdvanceSummaryPanel({
  startingBalance,
  startingBalanceDate,
  repaid,
  remaining,
  percentRepaid,
  paidOff,
  className,
}: SalaryAdvanceSummaryPanelProps) {
  const pct = Math.min(100, Math.max(0, percentRepaid));

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="space-y-2">
        <div className="bg-muted h-2 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-muted-foreground text-sm tabular-nums">
          {pct.toFixed(0)}% repaid
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Wallet}
          label="Total advance"
          value={formatMoney(startingBalance)}
          subline={
            startingBalanceDate
              ? `Last advance date ${startingBalanceDate}`
              : null
          }
        />
        <StatTile
          icon={BadgeCheck}
          label="Repaid"
          value={formatMoney(repaid)}
        />
        <StatTile
          icon={Scale}
          label="Remaining"
          value={paidOff ? "Paid off" : formatMoney(remaining)}
          highlight={paidOff}
        />
      </div>
    </div>
  );
}
