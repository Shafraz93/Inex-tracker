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
import { useAppSettings } from "@/contexts/app-settings-context";
import { useBudgetTracker } from "@/contexts/budget-tracker-context";
import { useVehicleLicense } from "@/contexts/vehicle-license-context";
import { formatMoney } from "@/lib/currency";
import {
  currentSalaryMonthRangeIso,
} from "@/lib/vehicle-license/salary-month";
import { getSalaryMonthBikeSpendBreakdown } from "@/lib/vehicle-license/summary";

export function VehicleLicenseHomeSummary() {
  const { state, hydrated } = useVehicleLicense();
  const { state: budgetState, hydrated: budgetHydrated } = useBudgetTracker();
  const { settings, hydrated: settingsHydrated } = useAppSettings();

  if (!hydrated || !settingsHydrated) return null;

  const range = currentSalaryMonthRangeIso(settings.month_start_day);
  const salaryMonth = range.from.slice(0, 7);
  const breakdown = getSalaryMonthBikeSpendBreakdown(state, range);
  const vehicleCategoryId = state.details.log_category_id;
  const allocatedBudget =
    budgetHydrated && vehicleCategoryId
      ? budgetState.budget_entries.reduce((sum, row) => {
          if (row.budget_month !== salaryMonth) return sum;
          if (row.category_id !== vehicleCategoryId) return sum;
          return sum + row.limit_amount;
        }, 0)
      : 0;
  const pendingBudget = allocatedBudget - breakdown.total;
  const budgetUsedPct =
    allocatedBudget > 0
      ? Math.min(100, Math.max(0, (breakdown.total / allocatedBudget) * 100))
      : 0;

  return (
    <Card size="sm" className="w-full">
      <CardHeader className="border-b border-border">
        <CardTitle>Vehicle log</CardTitle>
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
        <div className="space-y-2">
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
              style={{ width: `${budgetUsedPct}%` }}
            />
          </div>
          <p className="text-muted-foreground text-sm tabular-nums">
            {budgetUsedPct.toFixed(0)}% used
          </p>
        </div>
        <p className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
          {formatMoney(breakdown.total)}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-muted-foreground text-xs uppercase">
              Allocated budget
            </p>
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(allocatedBudget)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-muted-foreground text-xs uppercase">
              Pending budget
            </p>
            <p className="text-sm font-semibold tabular-nums">
              {formatMoney(pendingBudget)}
            </p>
          </div>
        </div>
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
