"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBudgetTracker } from "@/contexts/budget-tracker-context";
import { useCredits } from "@/contexts/credits-context";
import { formatMoney } from "@/lib/currency";
import {
  addCreditPersonLocal,
  addCreditSettlementLocal,
  removeCreditPersonLocal,
  removeCreditSettlementLocal,
  updateCreditPersonLocal,
  updateCreditsGlobalCategoryLocal,
  updateCreditSettlementLocal,
} from "@/lib/credits/local-storage";
import { normalizeBudgetTrackerState } from "@/lib/budget-tracker/local-storage";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function expenseIdForSettlement(settlementId: string): string {
  return `credit:settlement:${settlementId}`;
}

function asNumber(input: string): number {
  return Number(input.replace(/,/g, "").trim());
}

export function CreditsDashboard() {
  const {
    state,
    setState,
    hydrated,
    error: cloudError,
    setError: setCloudError,
  } = useCredits();
  const { state: budgetState, setState: setBudgetState, hydrated: budgetHydrated } =
    useBudgetTracker();
  const [error, setError] = React.useState<string | null>(null);

  const [personName, setPersonName] = React.useState("");
  const [openingBalance, setOpeningBalance] = React.useState("");
  const [editingPersonId, setEditingPersonId] = React.useState<string | null>(null);

  const [settlementPersonId, setSettlementPersonId] = React.useState("");
  const [settlementDate, setSettlementDate] = React.useState(todayIso);
  const [settlementAmount, setSettlementAmount] = React.useState("");
  const [editingSettlementId, setEditingSettlementId] = React.useState<string | null>(
    null
  );

  const expenseCategories = React.useMemo(
    () => budgetState.categories.filter((c) => c.kind === "expense"),
    [budgetState.categories]
  );
  const personNameById = React.useMemo(
    () => new Map(state.persons.map((p) => [p.id, p.name])),
    [state.persons]
  );

  const personSettledById = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const s of state.settlements) {
      map.set(s.credit_person_id, (map.get(s.credit_person_id) ?? 0) + s.amount);
    }
    return map;
  }, [state.settlements]);

  const totalOpening = React.useMemo(
    () => state.persons.reduce((sum, p) => sum + p.opening_balance, 0),
    [state.persons]
  );
  const totalSettled = React.useMemo(
    () => state.settlements.reduce((sum, s) => sum + s.amount, 0),
    [state.settlements]
  );

  React.useEffect(() => {
    if (!hydrated || !budgetHydrated) return;

    const globalCategoryId = state.global_expense_category_id;
    const desiredExpenseEntries =
      globalCategoryId == null
        ? []
        : state.settlements.map((s) => ({
            id: expenseIdForSettlement(s.id),
            spent_on: s.settled_on,
            title: `Credit settlement - ${personNameById.get(s.credit_person_id) ?? "Unknown person"}`,
            amount: s.amount,
            category_id: globalCategoryId,
            note: null,
            logged_at: s.logged_at,
          }));

    setBudgetState((prev) => {
      const withoutCreditLinked = prev.expense_entries.filter(
        (e) => !e.id.startsWith("credit:settlement:")
      );
      const next = normalizeBudgetTrackerState({
        ...prev,
        expense_entries: [...withoutCreditLinked, ...desiredExpenseEntries],
      });

      const prevSnapshot = JSON.stringify(prev.expense_entries);
      const nextSnapshot = JSON.stringify(next.expense_entries);
      if (prevSnapshot === nextSnapshot) return prev;
      return next;
    });
  }, [
    hydrated,
    budgetHydrated,
    setBudgetState,
    state.global_expense_category_id,
    state.settlements,
    personNameById,
  ]);

  function resetPersonForm() {
    setPersonName("");
    setOpeningBalance("");
    setEditingPersonId(null);
  }

  function resetSettlementForm() {
    setSettlementPersonId("");
    setSettlementDate(todayIso());
    setSettlementAmount("");
    setEditingSettlementId(null);
  }

  function onSavePerson(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCloudError(null);
    const amount = asNumber(openingBalance);

    if (!personName.trim()) {
      setError("Enter person name.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter valid opening balance.");
      return;
    }

    setState((prev) =>
      editingPersonId
        ? updateCreditPersonLocal(prev, editingPersonId, {
            name: personName,
            opening_balance: amount,
          })
        : addCreditPersonLocal(prev, {
            name: personName,
            opening_balance: amount,
          })
    );
    resetPersonForm();
  }

  function onSaveSettlement(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCloudError(null);
    const amount = asNumber(settlementAmount);

    if (!state.global_expense_category_id) {
      setError("Choose global expense category first.");
      return;
    }
    if (!settlementPersonId) {
      setError("Choose person.");
      return;
    }
    if (!settlementDate.trim()) {
      setError("Choose settlement date.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter valid settlement amount.");
      return;
    }

    const payload = {
      credit_person_id: settlementPersonId,
      settled_on: settlementDate,
      amount,
    };

    setState((prev) =>
      editingSettlementId
        ? updateCreditSettlementLocal(prev, editingSettlementId, payload)
        : addCreditSettlementLocal(prev, payload)
    );
    resetSettlementForm();
  }

  if (!hydrated) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          Credits
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Record money you owe and log repayments. Settlements are automatically synced to your Expenses.
        </p>
      </header>

      {error || cloudError ? (
        <p className="text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-sm">
          {error ?? cloudError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Global expense category</CardTitle>
          <CardDescription>
            All settlement logs will be sent to Expenses under this category.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:max-w-sm">
          <Label htmlFor="credits-global-category">Category</Label>
          <select
            id="credits-global-category"
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            value={state.global_expense_category_id ?? ""}
            onChange={(e) =>
              setState((prev) =>
                updateCreditsGlobalCategoryLocal(
                  prev,
                  e.target.value ? e.target.value : null
                )
              )
            }
          >
            <option value="">Select category</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{editingPersonId ? "Edit person credit" : "Add opening credit"}</CardTitle>
          <CardDescription>
            Add person borrowed from and opening credit amount.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onSavePerson}
            className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div className="grid w-full gap-2 sm:w-72">
              <Label htmlFor="credit-person-name">Person</Label>
              <Input
                id="credit-person-name"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="Person borrowed from"
              />
            </div>
            <div className="grid w-full gap-2 sm:w-44">
              <Label htmlFor="credit-opening-balance">Opening balance</Label>
              <Input
                id="credit-opening-balance"
                inputMode="decimal"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                <Plus className="size-4" />
                {editingPersonId ? "Update" : "Add"}
              </Button>
              {editingPersonId ? (
                <Button type="button" variant="outline" onClick={resetPersonForm}>
                  <X className="size-4" />
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-lg text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-left">
              <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                Person
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                Opening
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                Settled
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                Remaining
              </th>
              <th className="text-muted-foreground w-28 px-3 py-2.5 text-xs font-medium uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.persons.length > 0 ? (
              state.persons.map((p) => {
                const settled = personSettledById.get(p.id) ?? 0;
                const remaining = Math.max(0, p.opening_balance - settled);
                return (
                  <tr key={p.id} className="bg-card">
                    <td className="px-3 py-2.5">{p.name}</td>
                    <td className="px-3 py-2.5 font-medium tabular-nums">
                      {formatMoney(p.opening_balance)}
                    </td>
                    <td className="px-3 py-2.5 font-medium tabular-nums">
                      {formatMoney(settled)}
                    </td>
                    <td className="px-3 py-2.5 font-medium tabular-nums">
                      {formatMoney(remaining)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Edit person"
                          onClick={() => {
                            setEditingPersonId(p.id);
                            setPersonName(p.name);
                            setOpeningBalance(String(p.opening_balance));
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Delete person"
                          onClick={() =>
                            setState((prev) => removeCreditPersonLocal(prev, p.id))
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-3 py-6 text-center">
                  No credit persons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingSettlementId ? "Edit settlement" : "Add settlement log"}</CardTitle>
          <CardDescription>
            Select person, settlement date, and amount. This is synced to Expenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={onSaveSettlement}
            className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div className="grid w-full gap-2 sm:w-64">
              <Label htmlFor="settlement-person">Person</Label>
              <select
                id="settlement-person"
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                value={settlementPersonId}
                onChange={(e) => setSettlementPersonId(e.target.value)}
              >
                <option value="">Select person</option>
                {state.persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid w-full gap-2 sm:w-44">
              <Label htmlFor="settlement-date">Settlement date</Label>
              <Input
                id="settlement-date"
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
              />
            </div>
            <div className="grid w-full gap-2 sm:w-44">
              <Label htmlFor="settlement-amount">Settlement amount</Label>
              <Input
                id="settlement-amount"
                inputMode="decimal"
                value={settlementAmount}
                onChange={(e) => setSettlementAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit">
                <Plus className="size-4" />
                {editingSettlementId ? "Update" : "Add"}
              </Button>
              {editingSettlementId ? (
                <Button type="button" variant="outline" onClick={resetSettlementForm}>
                  <X className="size-4" />
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-lg text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border text-left">
              <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                Date
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                Person
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                Amount
              </th>
              <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                Expense sync
              </th>
              <th className="text-muted-foreground w-28 px-3 py-2.5 text-xs font-medium uppercase">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {state.settlements.length > 0 ? (
              state.settlements.map((s) => (
                <tr key={s.id} className="bg-card">
                  <td className="px-3 py-2.5 tabular-nums">{s.settled_on}</td>
                  <td className="px-3 py-2.5">
                    {personNameById.get(s.credit_person_id) ?? "Unknown"}
                  </td>
                  <td className="px-3 py-2.5 font-medium tabular-nums">
                    {formatMoney(s.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {state.global_expense_category_id
                      ? "Synced to Expenses"
                      : "Select global category"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Edit settlement"
                        onClick={() => {
                          setEditingSettlementId(s.id);
                          setSettlementPersonId(s.credit_person_id);
                          setSettlementDate(s.settled_on);
                          setSettlementAmount(String(s.amount));
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Delete settlement"
                        onClick={() =>
                          setState((prev) => removeCreditSettlementLocal(prev, s.id))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-3 py-6 text-center">
                  No settlement logs yet.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 border-t border-border">
              <td className="px-3 py-2.5 text-xs text-muted-foreground">Totals</td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">-</td>
              <td className="px-3 py-2.5 font-semibold tabular-nums">
                {formatMoney(totalSettled)}
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                Opening: {formatMoney(totalOpening)}
              </td>
              <td className="px-3 py-2.5 text-xs text-muted-foreground">
                Remaining: {formatMoney(Math.max(0, totalOpening - totalSettled))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
