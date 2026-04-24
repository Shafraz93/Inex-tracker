"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useVehicleLicense } from "@/contexts/vehicle-license-context";
import { formatMoney } from "@/lib/currency";
import {
  currentSalaryMonthRangeIso,
  salaryMonthLabel,
} from "@/lib/vehicle-license/salary-month";
import { getSalaryMonthBikeSpendBreakdown } from "@/lib/vehicle-license/summary";

export function VehicleLicenseHomeSummary() {
  const { state, hydrated } = useVehicleLicense();

  if (!hydrated) return null;

  const range = currentSalaryMonthRangeIso();
  const breakdown = getSalaryMonthBikeSpendBreakdown(state, range);

  return (
    <Card
      size="sm"
      className="w-full border-amber-500/45 ring-amber-500/25 dark:border-amber-400/65 dark:ring-amber-400/30"
    >
      <CardHeader className="border-b border-amber-500/25 dark:border-amber-400/40">
        <CardTitle>Bike spend (salary month)</CardTitle>
        <CardAction>
          <Link
            href="/vehicle-logs"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open logs
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-muted-foreground text-xs">
          {salaryMonthLabel(range.from, range.to)}
        </p>
        <p className="text-foreground mt-1 text-2xl font-semibold tabular-nums tracking-tight">
          {formatMoney(breakdown.total)}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-muted-foreground text-xs uppercase">Service</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(breakdown.service)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-muted-foreground text-xs uppercase">Upgrade</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(breakdown.upgrade)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-muted-foreground text-xs uppercase">Fuel</p>
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(breakdown.fuel)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
