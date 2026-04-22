"use client";

import * as React from "react";
import { Banknote, Pencil, Plus, Trash2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  remainingFromStarting,
  totalRepaidFromList,
} from "@/lib/salary-advance/balance";
import { useSalaryAdvance } from "@/contexts/salary-advance-context";
import {
  addRepaymentLocal,
  recordNewAdvanceLocal,
  removeAdvanceLogLocal,
  removeRepaymentLocal,
  updateAdvanceLogLocal,
  updateRepaymentLocal,
} from "@/lib/salary-advance/local-storage-salary-advance";
import type {
  SalaryAdvanceLogEntry,
  SalaryAdvanceRepaymentRow,
} from "@/lib/salary-advance/types";
import { SalaryAdvanceSummaryPanel } from "@/components/salary-advance/salary-advance-summary-panel";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateToIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Salary period: 6th of one month through 5th of the next (local dates).
 * Before the 6th, the active period is the one that started on the 6th of the previous month.
 */
function currentSalaryPeriodRangeIso(): { from: string; to: string } {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = today.getDate();

  let start: Date;
  let end: Date;
  if (day >= 6) {
    start = new Date(y, m, 6);
    end = new Date(y, m + 1, 5);
  } else {
    start = new Date(y, m - 1, 6);
    end = new Date(y, m, 5);
  }
  return { from: dateToIsoLocal(start), to: dateToIsoLocal(end) };
}

type SalaryAdvanceTab = "track" | "advances" | "repayments";

function formatLoggedAt(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function parseAdvanceDateRange(fromRaw: string, toRaw: string): {
  start: string | null;
  end: string | null;
} {
  let start = fromRaw.trim() || null;
  let end = toRaw.trim() || null;
  if (start && end && start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  return { start, end };
}

type SalaryEditModal =
  | { mode: "closed" }
  | {
      mode: "advance";
      id: string;
      amount: string;
      date: string;
      loggedAt?: string;
    }
  | {
      mode: "repayment";
      id: string;
      amount: string;
      paidOn: string;
      loggedAt?: string;
    };

export function SalaryAdvanceDashboard() {
  const { state, setState, hydrated, error, setError } = useSalaryAdvance();
  const [tab, setTab] = React.useState<SalaryAdvanceTab>("track");

  const [draftBalance, setDraftBalance] = React.useState("");
  const [draftDate, setDraftDate] = React.useState("");

  const [repayAmount, setRepayAmount] = React.useState("");
  const [repayDate, setRepayDate] = React.useState(todayIso);

  const [advanceFilterFrom, setAdvanceFilterFrom] = React.useState(
    () => currentSalaryPeriodRangeIso().from
  );
  const [advanceFilterTo, setAdvanceFilterTo] = React.useState(
    () => currentSalaryPeriodRangeIso().to
  );

  const [repaymentFilterFrom, setRepaymentFilterFrom] = React.useState(
    () => currentSalaryPeriodRangeIso().from
  );
  const [repaymentFilterTo, setRepaymentFilterTo] = React.useState(
    () => currentSalaryPeriodRangeIso().to
  );

  const [editModal, setEditModal] = React.useState<SalaryEditModal>({
    mode: "closed",
  });

  const { filteredAdvanceLogs, filteredAdvanceTotal } = React.useMemo(() => {
    const { start, end } = parseAdvanceDateRange(
      advanceFilterFrom,
      advanceFilterTo
    );
    const rows = state.advance_logs.filter((row) => {
      const d = row.advance_on.slice(0, 10);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return { filteredAdvanceLogs: rows, filteredAdvanceTotal: total };
  }, [state.advance_logs, advanceFilterFrom, advanceFilterTo]);

  const { filteredRepayments, filteredRepaymentTotal } = React.useMemo(() => {
    const { start, end } = parseAdvanceDateRange(
      repaymentFilterFrom,
      repaymentFilterTo
    );
    const rows = state.repayments.filter((r) => {
      const d = r.paid_on.slice(0, 10);
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return { filteredRepayments: rows, filteredRepaymentTotal: total };
  }, [state.repayments, repaymentFilterFrom, repaymentFilterTo]);

  function onSaveNewAdvance(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = parseFloat(draftBalance.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid advance amount greater than zero.");
      return;
    }
    const d = draftDate.trim();
    if (!d) {
      setError("Choose the date of this advance.");
      return;
    }
    setState((prev) => recordNewAdvanceLocal(prev, { amount, date: d }));
    setDraftBalance("");
    setDraftDate(todayIso());
  }

  function onAddRepayment() {
    setError(null);
    const remaining = remainingFromStarting(
      state.starting_balance,
      state.repayments
    );
    if (state.starting_balance <= 0) {
      setError("Record an advance first.");
      return;
    }
    if (remaining <= 0) return;
    const raw = repayAmount.replace(/,/g, "");
    const amount = parseFloat(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a repayment amount greater than zero.");
      return;
    }
    if (amount > remaining + 0.005) {
      setError(
        `Repayment cannot exceed remaining balance (${formatMoney(remaining)}).`
      );
      return;
    }
    const paidOn = repayDate.trim() || todayIso();
    setRepayAmount("");
    setRepayDate(todayIso());
    setState((prev) =>
      addRepaymentLocal(prev, {
        amount,
        paid_on: paidOn,
        note: null,
      })
    );
  }

  function closeEditModal() {
    setEditModal({ mode: "closed" });
  }

  function onDeleteRepayment(repaymentId: string) {
    if (!confirm("Remove this repayment entry?")) return;
    setError(null);
    closeEditModal();
    setState((prev) => removeRepaymentLocal(prev, repaymentId));
  }

  function beginEditAdvance(row: SalaryAdvanceLogEntry) {
    setError(null);
    setEditModal({
      mode: "advance",
      id: row.id,
      amount: String(row.amount),
      date: row.advance_on,
      loggedAt: row.logged_at,
    });
  }

  function saveEditModal() {
    if (editModal.mode === "closed") return;
    setError(null);

    if (editModal.mode === "advance") {
      const amount = parseFloat(editModal.amount.replace(/,/g, ""));
      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Enter a valid advance amount.");
        return;
      }
      const d = editModal.date.trim();
      if (!d) {
        setError("Choose the advance date.");
        return;
      }
      const id = editModal.id;
      setState((prev) =>
        updateAdvanceLogLocal(prev, id, {
          amount,
          advance_on: d,
        })
      );
      closeEditModal();
      return;
    }

    const amount = parseFloat(editModal.amount.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid repayment amount.");
      return;
    }
    const paidOn = editModal.paidOn.trim();
    if (!paidOn) {
      setError("Choose the payment date.");
      return;
    }
    const id = editModal.id;
    const others = state.repayments.filter((r) => r.id !== id);
    const otherTotal = totalRepaidFromList(others);
    const maxForRow = Math.max(0, state.starting_balance - otherTotal);
    if (amount > maxForRow + 0.02) {
      setError(
        `Repayment cannot exceed ${formatMoney(maxForRow)} (other repayments total ${formatMoney(otherTotal)}).`
      );
      return;
    }
    setState((prev) =>
      updateRepaymentLocal(prev, id, {
        amount,
        paid_on: paidOn,
      })
    );
    closeEditModal();
  }

  function onDeleteAdvanceLog(logId: string, amount: number) {
    if (
      !confirm(
        `Remove this advance of ${formatMoney(amount)}? Total advance will decrease by that amount.`
      )
    ) {
      return;
    }
    setError(null);
    closeEditModal();
    setState((prev) => removeAdvanceLogLocal(prev, logId));
  }

  function beginEditRepayment(row: SalaryAdvanceRepaymentRow) {
    setError(null);
    setEditModal({
      mode: "repayment",
      id: row.id,
      amount: String(row.amount),
      paidOn: row.paid_on,
      loggedAt: row.logged_at,
    });
  }

  if (!hydrated) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

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
  const hasStarting =
    state.starting_balance > 0 && state.starting_balance_date != null;

  function tabBtn(id: SalaryAdvanceTab, label: string) {
    const active = tab === id;
    return (
      <button
        type="button"
        key={id}
        onClick={() => {
          setEditModal({ mode: "closed" });
          setTab(id);
        }}
        className={cn(
          "border-b-2 pb-2 text-sm font-medium transition-colors",
          active
            ? "border-primary text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Salary advance
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          When you receive an advance, enter only the <strong>amount</strong>{" "}
          and <strong>date</strong>. When you repay, log just the{" "}
          <strong>payment amount</strong> and <strong>date</strong>. Extra
          advances add to what you still owe; repayments reduce it.
        </p>
      </header>

      <p className="text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
        Salary advance syncs to your account via Supabase, like Seetu—sign in
        on any device to see the same data.
      </p>

      {error ? (
        <p className="text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <nav
        className="flex flex-wrap gap-8 border-b border-border pb-px"
        aria-label="Salary advance sections"
      >
        {tabBtn("track", "Track")}
        {tabBtn("advances", "Advance logs")}
        {tabBtn("repayments", "Repayment logs")}
      </nav>

      {tab === "track" ? (
        <>
          {hasStarting ? (
            <SalaryAdvanceSummaryPanel
              startingBalance={state.starting_balance}
              startingBalanceDate={state.starting_balance_date}
              repaid={paid}
              remaining={remaining}
              percentRepaid={pct}
              paidOff={paidOff}
            />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="size-5" />
                New advance
              </CardTitle>
              <CardDescription>
                {hasStarting
                  ? "Adds this amount to your remaining balance. Repayment history is kept."
                  : "Enter the advance amount and the date you received it."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onSaveNewAdvance}
                className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="sa-advance-amount">Advance amount</Label>
                  <Input
                    id="sa-advance-amount"
                    inputMode="decimal"
                    placeholder="0"
                    value={draftBalance}
                    onChange={(e) => setDraftBalance(e.target.value)}
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-48">
                  <Label htmlFor="sa-advance-date">Date</Label>
                  <Input
                    id="sa-advance-date"
                    type="date"
                    value={draftDate}
                    onChange={(e) => setDraftDate(e.target.value)}
                  />
                </div>
                <Button type="submit">Save advance</Button>
              </form>
            </CardContent>
          </Card>

          {hasStarting ? (
            !paidOff ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="size-5" />
                    Repayment
                  </CardTitle>
                  <CardDescription>
                    Enter the amount repaid and the date—nothing else required.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onAddRepayment();
                    }}
                    className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
                  >
                    <div className="grid w-full gap-2 sm:w-44">
                      <Label htmlFor="sa-repay-amount">Repayment amount</Label>
                      <Input
                        id="sa-repay-amount"
                        inputMode="decimal"
                        placeholder="0"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                      />
                    </div>
                    <div className="grid w-full gap-2 sm:w-48">
                      <Label htmlFor="sa-repay-date">Date</Label>
                      <Input
                        id="sa-repay-date"
                        type="date"
                        value={repayDate}
                        onChange={(e) => setRepayDate(e.target.value)}
                      />
                    </div>
                    <Button type="submit">
                      <Plus className="size-4" />
                      Add repayment
                    </Button>
                  </form>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Remaining before this payment: {formatMoney(remaining)}.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <p className="text-muted-foreground text-sm">
                Advance is paid off. Add a new advance on this tab if you borrow
                again.
              </p>
            )
          ) : (
            <p className="text-muted-foreground text-sm">
              Save an advance amount and date above to see progress and log
              repayments.
            </p>
          )}
        </>
      ) : null}

      {tab === "advances" ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Every advance you save is listed here, newest first. By default the
            current salary period is selected (6th through 5th of the following
            month); change the range or show all entries.
          </p>
          {state.advance_logs.length > 0 ? (
            <>
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid gap-1.5 sm:w-44">
                    <Label htmlFor="sa-advance-filter-from">From</Label>
                    <Input
                      id="sa-advance-filter-from"
                      type="date"
                      value={advanceFilterFrom}
                      onChange={(e) => setAdvanceFilterFrom(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5 sm:w-44">
                    <Label htmlFor="sa-advance-filter-to">To</Label>
                    <Input
                      id="sa-advance-filter-to"
                      type="date"
                      value={advanceFilterTo}
                      onChange={(e) => setAdvanceFilterTo(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      const { from, to } = currentSalaryPeriodRangeIso();
                      setAdvanceFilterFrom(from);
                      setAdvanceFilterTo(to);
                    }}
                  >
                    This period
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      setAdvanceFilterFrom("");
                      setAdvanceFilterTo("");
                    }}
                  >
                    All dates
                  </Button>
                </div>
                <div className="border-border sm:border-l sm:pl-4">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Filtered total
                  </p>
                  <p className="text-foreground text-xl font-semibold tabular-nums tracking-tight">
                    {formatMoney(filteredAdvanceTotal)}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {filteredAdvanceLogs.length} of {state.advance_logs.length}{" "}
                    {filteredAdvanceLogs.length === 1 ? "entry" : "entries"}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-md text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-left">
                      <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                        Advance date
                      </th>
                    <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                      Amount
                    </th>
                    <th className="text-muted-foreground w-30 px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                      Actions
                    </th>
                    <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                      Logged
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                    {filteredAdvanceLogs.length > 0 ? (
                      filteredAdvanceLogs.map((row) => (
                        <tr key={row.id} className="bg-card">
                          <td className="text-foreground px-3 py-2.5 tabular-nums">
                            {row.advance_on}
                          </td>
                          <td className="text-foreground px-3 py-2.5 font-medium tabular-nums">
                            {formatMoney(row.amount)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground"
                                aria-label="Edit advance"
                                onClick={() => beginEditAdvance(row)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground"
                                aria-label="Delete advance"
                                onClick={() =>
                                  onDeleteAdvanceLog(row.id, row.amount)
                                }
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </td>
                          <td className="text-muted-foreground px-3 py-2.5 text-xs tabular-nums">
                            {formatLoggedAt(row.logged_at)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-sm">
                          <div className="text-muted-foreground flex flex-col items-center gap-3">
                            <p>No advances in this date range.</p>
                            {state.advance_logs.length > 0 ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAdvanceFilterFrom("");
                                  setAdvanceFilterTo("");
                                }}
                              >
                                Show all advances ({state.advance_logs.length})
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              No advance entries yet. Save an advance on the Track tab.
            </p>
          )}
        </div>
      ) : null}

      {tab === "repayments" ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Repayments you add appear here, newest first. By default the current
            salary period is selected (6th through 5th of the following month);
            change the range or show all entries.
          </p>
          {state.repayments.length > 0 ? (
            <>
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="grid gap-1.5 sm:w-44">
                    <Label htmlFor="sa-repay-filter-from">From</Label>
                    <Input
                      id="sa-repay-filter-from"
                      type="date"
                      value={repaymentFilterFrom}
                      onChange={(e) =>
                        setRepaymentFilterFrom(e.target.value)
                      }
                    />
                  </div>
                  <div className="grid gap-1.5 sm:w-44">
                    <Label htmlFor="sa-repay-filter-to">To</Label>
                    <Input
                      id="sa-repay-filter-to"
                      type="date"
                      value={repaymentFilterTo}
                      onChange={(e) => setRepaymentFilterTo(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      const { from, to } = currentSalaryPeriodRangeIso();
                      setRepaymentFilterFrom(from);
                      setRepaymentFilterTo(to);
                    }}
                  >
                    This period
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      setRepaymentFilterFrom("");
                      setRepaymentFilterTo("");
                    }}
                  >
                    All dates
                  </Button>
                </div>
                <div className="border-border sm:border-l sm:pl-4">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Filtered total
                  </p>
                  <p className="text-foreground text-xl font-semibold tabular-nums tracking-tight">
                    {formatMoney(filteredRepaymentTotal)}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {filteredRepayments.length} of {state.repayments.length}{" "}
                    {filteredRepayments.length === 1 ? "entry" : "entries"}
                  </p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-lg text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-left">
                    <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                      Paid on
                    </th>
                    <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                      Amount
                    </th>
                    <th className="text-muted-foreground w-30 px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                      Actions
                    </th>
                    <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium tracking-wide uppercase">
                      Logged
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRepayments.length > 0 ? (
                    filteredRepayments.map((r) => (
                      <tr key={r.id} className="bg-card">
                        <td className="text-foreground px-3 py-2.5 tabular-nums">
                          {r.paid_on}
                        </td>
                        <td className="text-foreground px-3 py-2.5 font-medium tabular-nums">
                          {formatMoney(r.amount)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground"
                              aria-label="Edit repayment"
                              onClick={() => beginEditRepayment(r)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground"
                              aria-label="Delete repayment"
                              onClick={() => onDeleteRepayment(r.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </td>
                        <td className="text-muted-foreground px-3 py-2.5 text-xs tabular-nums">
                          {formatLoggedAt(r.logged_at)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-sm">
                        <div className="text-muted-foreground flex flex-col items-center gap-3">
                          <p>No repayments in this date range.</p>
                          {state.repayments.length > 0 ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRepaymentFilterFrom("");
                                setRepaymentFilterTo("");
                              }}
                            >
                              Show all repayments ({state.repayments.length})
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              No repayments yet. Add one on the Track tab after you record an
              advance.
            </p>
          )}
        </div>
      ) : null}

      <Dialog
        open={editModal.mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) closeEditModal();
        }}
      >
        <DialogContent className="gap-0 p-0">
          {editModal.mode === "advance" ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit advance</DialogTitle>
                <DialogDescription>
                  Update the calendar date or amount. Saving adjusts your total
                  advance balance.
                </DialogDescription>
              </DialogHeader>
              <form
                className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-4 pb-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEditModal();
                }}
              >
                {editModal.loggedAt ? (
                  <p className="text-muted-foreground text-xs">
                    Previously logged: {formatLoggedAt(editModal.loggedAt)}{" "}
                    (updates when you save)
                  </p>
                ) : null}
                <div className="grid gap-2">
                  <Label htmlFor="sa-edit-advance-date">Advance date</Label>
                  <Input
                    id="sa-edit-advance-date"
                    type="date"
                    value={editModal.date}
                    onChange={(e) =>
                      setEditModal((m) =>
                        m.mode === "advance"
                          ? { ...m, date: e.target.value }
                          : m
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sa-edit-advance-amount">Amount</Label>
                  <Input
                    id="sa-edit-advance-amount"
                    inputMode="decimal"
                    value={editModal.amount}
                    onChange={(e) =>
                      setEditModal((m) =>
                        m.mode === "advance"
                          ? { ...m, amount: e.target.value }
                          : m
                      )
                    }
                  />
                </div>
              </form>
              <DialogFooter className="px-4 pb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditModal}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={() => saveEditModal()}>
                  Save
                </Button>
              </DialogFooter>
            </>
          ) : null}
          {editModal.mode === "repayment" ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit repayment</DialogTitle>
                <DialogDescription>
                  Update the payment date or amount. Total repaid cannot exceed
                  your advance total.
                </DialogDescription>
              </DialogHeader>
              <form
                className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-4 pb-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEditModal();
                }}
              >
                {editModal.loggedAt ? (
                  <p className="text-muted-foreground text-xs">
                    Previously logged: {formatLoggedAt(editModal.loggedAt)}{" "}
                    (updates when you save)
                  </p>
                ) : null}
                <div className="grid gap-2">
                  <Label htmlFor="sa-edit-repay-date">Paid on</Label>
                  <Input
                    id="sa-edit-repay-date"
                    type="date"
                    value={editModal.paidOn}
                    onChange={(e) =>
                      setEditModal((m) =>
                        m.mode === "repayment"
                          ? { ...m, paidOn: e.target.value }
                          : m
                      )
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sa-edit-repay-amount">Amount</Label>
                  <Input
                    id="sa-edit-repay-amount"
                    inputMode="decimal"
                    value={editModal.amount}
                    onChange={(e) =>
                      setEditModal((m) =>
                        m.mode === "repayment"
                          ? { ...m, amount: e.target.value }
                          : m
                      )
                    }
                  />
                </div>
              </form>
              <DialogFooter className="px-4 pb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditModal}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={() => saveEditModal()}>
                  Save
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
