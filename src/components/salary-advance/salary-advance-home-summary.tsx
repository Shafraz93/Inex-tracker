"use client";

import * as React from "react";
import Link from "next/link";

import { useSalaryAdvance } from "@/contexts/salary-advance-context";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  remainingFromStarting,
  totalRepaidFromList,
} from "@/lib/salary-advance/balance";
import { SalaryAdvanceSummaryPanel } from "@/components/salary-advance/salary-advance-summary-panel";

export function SalaryAdvanceHomeSummary() {
  const { state, hydrated } = useSalaryAdvance();

  if (!hydrated) return null;

  const hasStarting =
    state.starting_balance > 0 && state.starting_balance_date != null;
  if (!hasStarting) return null;

  const paid = totalRepaidFromList(state.repayments);
  const remaining = remainingFromStarting(
    state.starting_balance,
    state.repayments
  );
  const pct =
    state.starting_balance > 0
      ? Math.min(100, (paid / state.starting_balance) * 100)
      : 0;
  const paidOff = state.starting_balance > 0 && remaining < 0.01;

  return (
    <Card
      size="sm"
      className={cn(
        "w-full border-emerald-500/40 ring-emerald-500/25",
        "dark:border-emerald-400/65 dark:ring-emerald-400/30"
      )}
    >
      <CardHeader className="border-b border-emerald-500/25 dark:border-emerald-400/40">
        <CardTitle>Salary advance</CardTitle>
        <CardAction>
          <Link
            href="/salary-advance"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Manage
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-4">
        <SalaryAdvanceSummaryPanel
          startingBalance={state.starting_balance}
          startingBalanceDate={state.starting_balance_date}
          repaid={paid}
          remaining={remaining}
          percentRepaid={pct}
          paidOff={paidOff}
        />
      </CardContent>
    </Card>
  );
}
