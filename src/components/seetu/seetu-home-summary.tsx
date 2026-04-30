"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CalendarDays, Lock } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSeetu } from "@/contexts/seetu-context";
import { buildSeetuHomeCardModel } from "@/lib/seetu/home-snapshot";
import { cn } from "@/lib/utils";

const statShell =
  "flex flex-col rounded-xl border border-border bg-muted/30 p-4 ring-1 ring-foreground/5";

function StatTile({
  icon: Icon,
  label,
  value,
  subline,
  turnNumber,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  subline?: ReactNode;
  /** Roster turn # for this month — shown top-right of the tile. */
  turnNumber?: number | null;
}) {
  return (
    <div className={statShell}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="bg-background/80 flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-foreground/10">
          <Icon className="text-muted-foreground size-4" aria-hidden />
        </div>
        {turnNumber != null ? (
          <span className="text-foreground pt-1 text-right text-lg font-semibold tabular-nums tracking-tight">
            Turn #{turnNumber}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      <p className="text-foreground mt-1 text-lg font-semibold tabular-nums tracking-tight">
        {value}
      </p>
      {subline ? (
        <div className="mt-1 text-xs leading-relaxed">{subline}</div>
      ) : null}
    </div>
  );
}

function MonthScheduleSubline({
  onSchedule,
  receiver,
  fullyPaid,
  offScheduleHint,
}: {
  onSchedule: boolean;
  receiver: string | null;
  fullyPaid: boolean | null;
  offScheduleHint: string;
}) {
  if (!onSchedule) {
    return (
      <p className="text-muted-foreground">{offScheduleHint}</p>
    );
  }

  const showName = Boolean(receiver && receiver !== "—");
  const highlightName = fullyPaid === false && showName;
  const hasPaid = fullyPaid === true;
  const hasAny = showName || hasPaid;

  if (!hasAny) {
    return <p className="text-muted-foreground">—</p>;
  }

  return (
    <p className="text-muted-foreground leading-relaxed">
      {showName ? (
        <>
          Receives pot:{" "}
          <span
            className={cn(
              highlightName ? "text-primary font-semibold" : "text-foreground"
            )}
          >
            {receiver}
          </span>
        </>
      ) : null}
      {showName && hasPaid ? " · " : null}
      {hasPaid ? <>All paid</> : null}
    </p>
  );
}

export function SeetuHomeSummary() {
  const { pools, hydrated } = useSeetu();

  if (!hydrated) return null;

  const model = buildSeetuHomeCardModel(pools);

  return (
    <Card size="sm" className="w-full">
      <CardHeader className="border-b border-border">
        <CardTitle>Seetu</CardTitle>
        <CardAction>
          <Link
            href="/seetu/payouts"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Payouts
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-4">
      {model.kind === "no_pools" ? (
        <div className={statShell}>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Rotating savings: add a pool, roster, and months to track who paid
            and whose turn it is to receive the pot.
          </p>
          <Link
            href="/seetu/pools"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "mt-3 w-fit"
            )}
          >
            Create a pool
          </Link>
        </div>
      ) : model.noRoster || model.noCycles ? (
        <div className={statShell}>
          <p className="text-foreground text-sm font-medium">
            {model.pool.title}
            {model.pool.is_locked ? (
              <span className="text-muted-foreground ml-2 inline-flex items-center gap-1 text-xs font-normal">
                <Lock className="size-3" aria-hidden />
                Locked
              </span>
            ) : null}
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {model.noRoster
              ? "Add roster rows (turns) on Pools, then generate payment months."
              : "Generate payment months from your roster on the Pools page."}
          </p>
          <Link
            href="/seetu/pools"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "mt-3 w-fit"
            )}
          >
            Open Pools
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-foreground text-sm font-medium">
              {model.pool.title}
            </p>
            {model.pool.is_locked ? (
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Lock className="size-3" aria-hidden />
                Locked
              </span>
            ) : null}
            {model.poolCount > 1 ? (
              <span className="text-muted-foreground text-xs">
                (+{model.poolCount - 1} other
                {model.poolCount === 2 ? " pool" : " pools"})
              </span>
            ) : null}
          </div>

          {model.scheduleAllPaid ? (
            <p className="text-muted-foreground text-sm">
              Every month on this schedule is marked fully collected.
            </p>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile
              icon={CalendarDays}
              label="This month"
              value={model.thisMonthLabel ?? "—"}
              turnNumber={
                model.thisMonthOnSchedule ? model.thisMonthTurn : null
              }
              subline={
                <MonthScheduleSubline
                  onSchedule={model.thisMonthOnSchedule}
                  receiver={model.thisMonthReceiver}
                  fullyPaid={model.thisMonthFullyPaid}
                  offScheduleHint="No payout month for this calendar month yet — add or extend months on Pools."
                />
              }
            />
            <StatTile
              icon={CalendarDays}
              label="Next month"
              value={model.nextMonthLabel ?? "—"}
              turnNumber={
                model.nextMonthOnSchedule ? model.nextMonthTurn : null
              }
              subline={
                <MonthScheduleSubline
                  onSchedule={model.nextMonthOnSchedule}
                  receiver={model.nextMonthReceiver}
                  fullyPaid={model.nextMonthFullyPaid}
                  offScheduleHint="Not on this pool’s schedule yet — generate more months on Pools."
                />
              }
            />
          </div>

          <p className="text-muted-foreground text-center text-xs leading-relaxed">
            Months follow your device date and each cycle’s calendar month (from
            Pools / Payouts).{" "}
            <Link href="/seetu/pools" className="text-primary underline">
              Pools
            </Link>
            {" · "}
            <Link href="/seetu/payouts" className="text-primary underline">
              Payouts
            </Link>
          </p>
        </>
      )}
      </CardContent>
    </Card>
  );
}
