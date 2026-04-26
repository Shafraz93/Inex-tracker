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
import { useVehicleLicense } from "@/contexts/vehicle-license-context";
import { formatMoney } from "@/lib/currency";
import {
  addBudgetEntryLocal,
  addCategoryLocal,
  addExpenseEntryLocal,
  addIncomeEntryLocal,
  removeBudgetEntryLocal,
  removeCategoryLocal,
  removeExpenseEntryLocal,
  removeIncomeEntryLocal,
  updateBudgetEntryLocal,
  updateCategoryLocal,
  updateExpenseEntryLocal,
  updateIncomeEntryLocal,
} from "@/lib/budget-tracker/local-storage";
import type { BudgetCategoryKind, ExpenseEntry } from "@/lib/budget-tracker/types";

export type BudgetTrackerView = "budget" | "income" | "expenses" | "categories";

type ExpenseListRow = ExpenseEntry & {
  source: "manual" | "vehicle";
  source_label?: string;
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthIso(): string {
  return todayIso().slice(0, 7);
}

function monthLabel(ym: string): string {
  if (!/^\d{4}-\d{2}$/.test(ym)) return ym;
  const [y, m] = ym.split("-");
  const idx = Number(m) - 1;
  const names = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${names[idx] ?? m} ${y}`;
}

function asNumber(input: string): number {
  return Number(input.replace(/,/g, "").trim());
}

export function BudgetTrackerDashboard({ view }: { view: BudgetTrackerView }) {
  const { state, setState, hydrated, error, setError } = useBudgetTracker();
  const { state: vehicleState } = useVehicleLicense();

  const [summaryMonth, setSummaryMonth] = React.useState(monthIso);

  const [categoryName, setCategoryName] = React.useState("");
  const [categoryKind, setCategoryKind] = React.useState<BudgetCategoryKind>("expense");
  const [editingCategoryId, setEditingCategoryId] = React.useState<string | null>(
    null
  );

  const [incomeDate, setIncomeDate] = React.useState(todayIso);
  const [incomeTitle, setIncomeTitle] = React.useState("");
  const [incomeAmount, setIncomeAmount] = React.useState("");
  const [incomeCategoryId, setIncomeCategoryId] = React.useState("");
  const [incomeNote, setIncomeNote] = React.useState("");
  const [editingIncomeId, setEditingIncomeId] = React.useState<string | null>(null);

  const [expenseDate, setExpenseDate] = React.useState(todayIso);
  const [expenseTitle, setExpenseTitle] = React.useState("");
  const [expenseAmount, setExpenseAmount] = React.useState("");
  const [expenseCategoryId, setExpenseCategoryId] = React.useState("");
  const [expenseNote, setExpenseNote] = React.useState("");
  const [editingExpenseId, setEditingExpenseId] = React.useState<string | null>(null);

  const [budgetMonth, setBudgetMonth] = React.useState(monthIso);
  const [budgetTitle, setBudgetTitle] = React.useState("");
  const [budgetAmount, setBudgetAmount] = React.useState("");
  const [budgetCategoryId, setBudgetCategoryId] = React.useState("");
  const [budgetNote, setBudgetNote] = React.useState("");
  const [editingBudgetId, setEditingBudgetId] = React.useState<string | null>(null);

  const incomeCategories = React.useMemo(
    () => state.categories.filter((c) => c.kind === "income"),
    [state.categories]
  );
  const expenseCategories = React.useMemo(
    () => state.categories.filter((c) => c.kind === "expense"),
    [state.categories]
  );

  const categoryNameById = React.useMemo(
    () =>
      new Map(
        state.categories.map((c) => [
          c.id,
          `${c.name}${c.kind === "income" ? " (Income)" : ""}`,
        ])
      ),
    [state.categories]
  );

  const vehicleExpenseEntries = React.useMemo<ExpenseListRow[]>(() => {
    const categoryId = vehicleState.details.log_category_id;
    if (!categoryId) return [];

    const fromService = vehicleState.service_logs.map((row) => {
      const total =
        Math.max(0, row.service_charge) +
        Math.max(0, row.part_price) +
        Math.max(0, row.part_assemble_fee);
      return {
        id: `vehicle:service:${row.id}`,
        spent_on: row.service_date,
        title: row.parts_title
          ? `Vehicle service - ${row.parts_title}`
          : "Vehicle service",
        amount: total,
        category_id: categoryId,
        note: null,
        logged_at: row.logged_at,
        source: "vehicle" as const,
        source_label: "Vehicle service",
      };
    });

    const fromUpgrade = vehicleState.upgrade_logs.map((row) => ({
      id: `vehicle:upgrade:${row.id}`,
      spent_on: row.upgrade_date,
      title: row.title ? `Vehicle upgrade - ${row.title}` : "Vehicle upgrade",
      amount: Math.max(0, row.part_price) + Math.max(0, row.part_assemble_fee),
      category_id: categoryId,
      note: null,
      logged_at: row.logged_at,
      source: "vehicle" as const,
      source_label: "Vehicle upgrade",
    }));

    const fromFuel = vehicleState.fuel_logs.map((row) => ({
      id: `vehicle:fuel:${row.id}`,
      spent_on: row.filled_on,
      title: "Vehicle fuel",
      amount: Math.max(0, row.amount),
      category_id: categoryId,
      note: null,
      logged_at: row.logged_at,
      source: "vehicle" as const,
      source_label: "Vehicle fuel",
    }));

    return [...fromService, ...fromUpgrade, ...fromFuel];
  }, [vehicleState]);

  const allExpenseRows = React.useMemo<ExpenseListRow[]>(() => {
    const manual: ExpenseListRow[] = state.expense_entries.map((row) => ({
      ...row,
      source: "manual",
    }));
    return [...manual, ...vehicleExpenseEntries].sort((a, b) => {
      const d = b.spent_on.localeCompare(a.spent_on);
      if (d !== 0) return d;
      return (b.logged_at ?? "").localeCompare(a.logged_at ?? "");
    });
  }, [state.expense_entries, vehicleExpenseEntries]);

  const monthlyIncome = React.useMemo(
    () =>
      state.income_entries.reduce((sum, row) => {
        if (!row.earned_on.startsWith(summaryMonth)) return sum;
        return sum + row.amount;
      }, 0),
    [state.income_entries, summaryMonth]
  );
  const monthlyExpense = React.useMemo(
    () =>
      allExpenseRows.reduce((sum, row) => {
        if (!row.spent_on.startsWith(summaryMonth)) return sum;
        return sum + row.amount;
      }, 0),
    [allExpenseRows, summaryMonth]
  );
  const monthlyBudget = React.useMemo(
    () =>
      state.budget_entries.reduce((sum, row) => {
        if (row.budget_month !== summaryMonth) return sum;
        return sum + row.limit_amount;
      }, 0),
    [state.budget_entries, summaryMonth]
  );

  const categoryUsage = React.useMemo(() => {
    const map = new Map<string, { entries: number; amount: number }>();
    for (const row of state.income_entries) {
      if (!row.category_id) continue;
      const prev = map.get(row.category_id) ?? { entries: 0, amount: 0 };
      map.set(row.category_id, {
        entries: prev.entries + 1,
        amount: prev.amount + row.amount,
      });
    }
    for (const row of allExpenseRows) {
      if (!row.category_id) continue;
      const prev = map.get(row.category_id) ?? { entries: 0, amount: 0 };
      map.set(row.category_id, {
        entries: prev.entries + 1,
        amount: prev.amount + row.amount,
      });
    }
    return map;
  }, [state.income_entries, allExpenseRows]);

  function resetCategoryForm() {
    setCategoryName("");
    setCategoryKind("expense");
    setEditingCategoryId(null);
  }

  function resetIncomeForm() {
    setIncomeDate(todayIso());
    setIncomeTitle("");
    setIncomeAmount("");
    setIncomeCategoryId("");
    setIncomeNote("");
    setEditingIncomeId(null);
  }

  function resetExpenseForm() {
    setExpenseDate(todayIso());
    setExpenseTitle("");
    setExpenseAmount("");
    setExpenseCategoryId("");
    setExpenseNote("");
    setEditingExpenseId(null);
  }

  function resetBudgetForm() {
    setBudgetMonth(monthIso());
    setBudgetTitle("");
    setBudgetAmount("");
    setBudgetCategoryId("");
    setBudgetNote("");
    setEditingBudgetId(null);
  }

  function onSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryName.trim()) {
      setError("Enter a category name.");
      return;
    }
    setState((prev) =>
      editingCategoryId
        ? updateCategoryLocal(prev, editingCategoryId, {
            name: categoryName,
            kind: categoryKind,
          })
        : addCategoryLocal(prev, { name: categoryName, kind: categoryKind })
    );
    resetCategoryForm();
  }

  function onSaveIncome(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = asNumber(incomeAmount);
    if (!incomeDate.trim()) {
      setError("Select income date.");
      return;
    }
    if (!incomeTitle.trim()) {
      setError("Enter income title.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid income amount.");
      return;
    }

    const payload = {
      earned_on: incomeDate,
      title: incomeTitle,
      amount,
      category_id: incomeCategoryId || null,
      note: incomeNote || null,
    };

    setState((prev) =>
      editingIncomeId
        ? updateIncomeEntryLocal(prev, editingIncomeId, payload)
        : addIncomeEntryLocal(prev, payload)
    );
    resetIncomeForm();
  }

  function onSaveExpense(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = asNumber(expenseAmount);
    if (!expenseDate.trim()) {
      setError("Select expense date.");
      return;
    }
    if (!expenseTitle.trim()) {
      setError("Enter expense title.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid expense amount.");
      return;
    }

    const payload = {
      spent_on: expenseDate,
      title: expenseTitle,
      amount,
      category_id: expenseCategoryId || null,
      note: expenseNote || null,
    };

    setState((prev) =>
      editingExpenseId
        ? updateExpenseEntryLocal(prev, editingExpenseId, payload)
        : addExpenseEntryLocal(prev, payload)
    );
    resetExpenseForm();
  }

  function onSaveBudget(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = asNumber(budgetAmount);
    if (!budgetMonth.trim()) {
      setError("Select budget month.");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid budget limit.");
      return;
    }

    const payload = {
      budget_month: budgetMonth,
      title: budgetTitle.trim() || "Budget limit",
      limit_amount: amount,
      category_id: budgetCategoryId || null,
      note: budgetNote || null,
    };

    setState((prev) =>
      editingBudgetId
        ? updateBudgetEntryLocal(prev, editingBudgetId, payload)
        : addBudgetEntryLocal(prev, payload)
    );
    resetBudgetForm();
  }

  if (!hydrated) {
    return <p className="text-muted-foreground text-sm">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl space-y-2">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
          {view === "budget"
            ? "Budget"
            : view === "income"
              ? "Income"
              : view === "expenses"
                ? "Expenses"
                : "Categories"}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Customizable tracker with edit and delete for every entry. Data syncs to
          cloud and stays shared across Budget, Income, Expenses, and Categories.
        </p>
      </header>

      {error ? (
        <p className="text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Month summary</CardTitle>
          <CardDescription>
            Track totals for income, expense, and budget usage for one month.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:w-52">
            <Label htmlFor="summary-month">Month</Label>
            <Input
              id="summary-month"
              type="month"
              value={summaryMonth}
              onChange={(e) => setSummaryMonth(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Income</p>
              <p className="font-semibold">{formatMoney(monthlyIncome)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Expenses</p>
              <p className="font-semibold">{formatMoney(monthlyExpense)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">Net</p>
              <p className="font-semibold">{formatMoney(monthlyIncome - monthlyExpense)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-muted-foreground text-xs">
                Budget left ({monthLabel(summaryMonth)})
              </p>
              <p className="font-semibold">{formatMoney(monthlyBudget - monthlyExpense)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {view === "categories" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {editingCategoryId ? "Edit category" : "Add category"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onSaveCategory}
                className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="grid w-full gap-2 sm:w-64">
                  <Label htmlFor="category-name">Name</Label>
                  <Input
                    id="category-name"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="Food, Salary, Transport..."
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="category-kind">Type</Label>
                  <select
                    id="category-kind"
                    className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                    value={categoryKind}
                    onChange={(e) =>
                      setCategoryKind(e.target.value as BudgetCategoryKind)
                    }
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    <Plus className="size-4" />
                    {editingCategoryId ? "Update" : "Add"}
                  </Button>
                  {editingCategoryId ? (
                    <Button type="button" variant="outline" onClick={resetCategoryForm}>
                      <X className="size-4" />
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-md text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-left">
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Category
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Type
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Entries
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Total
                  </th>
                  <th className="text-muted-foreground w-28 px-3 py-2.5 text-xs font-medium uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.categories.length > 0 ? (
                  state.categories.map((row) => {
                    const usage = categoryUsage.get(row.id) ?? {
                      entries: 0,
                      amount: 0,
                    };
                    return (
                    <tr key={row.id} className="bg-card">
                      <td className="px-3 py-2.5">{row.name}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-muted-foreground rounded bg-muted px-2 py-0.5 text-xs">
                          {row.kind}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{usage.entries}</td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {formatMoney(usage.amount)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Edit category"
                            onClick={() => {
                              setCategoryName(row.name);
                              setCategoryKind(row.kind);
                              setEditingCategoryId(row.id);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Delete category"
                            onClick={() =>
                              setState((prev) => removeCategoryLocal(prev, row.id))
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )})
                ) : (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-3 py-6 text-center">
                      No categories yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {view === "income" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{editingIncomeId ? "Edit income" : "Add income"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onSaveIncome}
                className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="income-date">Date</Label>
                  <Input
                    id="income-date"
                    type="date"
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-64">
                  <Label htmlFor="income-title">Title</Label>
                  <Input
                    id="income-title"
                    value={incomeTitle}
                    onChange={(e) => setIncomeTitle(e.target.value)}
                    placeholder="Salary, Freelance, Bonus..."
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="income-amount">Amount</Label>
                  <Input
                    id="income-amount"
                    inputMode="decimal"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-52">
                  <Label htmlFor="income-category">Category</Label>
                  <select
                    id="income-category"
                    className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                    value={incomeCategoryId}
                    onChange={(e) => setIncomeCategoryId(e.target.value)}
                  >
                    <option value="">Uncategorized</option>
                    {incomeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid w-full gap-2 sm:w-72">
                  <Label htmlFor="income-note">Note (optional)</Label>
                  <Input
                    id="income-note"
                    value={incomeNote}
                    onChange={(e) => setIncomeNote(e.target.value)}
                    placeholder="Payment reference or source detail"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    <Plus className="size-4" />
                    {editingIncomeId ? "Update" : "Add"}
                  </Button>
                  {editingIncomeId ? (
                    <Button type="button" variant="outline" onClick={resetIncomeForm}>
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
                    Title
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Category
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Amount
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Note
                  </th>
                  <th className="text-muted-foreground w-28 px-3 py-2.5 text-xs font-medium uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.income_entries.length > 0 ? (
                  state.income_entries.map((row) => (
                    <tr key={row.id} className="bg-card">
                      <td className="px-3 py-2.5 tabular-nums">{row.earned_on}</td>
                      <td className="px-3 py-2.5">{row.title}</td>
                      <td className="px-3 py-2.5">
                        {row.category_id ? (
                          categoryNameById.get(row.category_id) ?? "Unknown"
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.note || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Edit income entry"
                            onClick={() => {
                              setEditingIncomeId(row.id);
                              setIncomeDate(row.earned_on);
                              setIncomeTitle(row.title);
                              setIncomeAmount(String(row.amount));
                              setIncomeCategoryId(row.category_id ?? "");
                              setIncomeNote(row.note ?? "");
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Delete income entry"
                            onClick={() =>
                              setState((prev) => removeIncomeEntryLocal(prev, row.id))
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
                    <td colSpan={6} className="text-muted-foreground px-3 py-6 text-center">
                      No income entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {view === "expenses" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{editingExpenseId ? "Edit expense" : "Add expense"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onSaveExpense}
                className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="expense-date">Date</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-64">
                  <Label htmlFor="expense-title">Title</Label>
                  <Input
                    id="expense-title"
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    placeholder="Groceries, Fuel, Rent..."
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="expense-amount">Amount</Label>
                  <Input
                    id="expense-amount"
                    inputMode="decimal"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-52">
                  <Label htmlFor="expense-category">Category</Label>
                  <select
                    id="expense-category"
                    className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                    value={expenseCategoryId}
                    onChange={(e) => setExpenseCategoryId(e.target.value)}
                  >
                    <option value="">Uncategorized</option>
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid w-full gap-2 sm:w-72">
                  <Label htmlFor="expense-note">Note (optional)</Label>
                  <Input
                    id="expense-note"
                    value={expenseNote}
                    onChange={(e) => setExpenseNote(e.target.value)}
                    placeholder="Store, bill number, reason..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    <Plus className="size-4" />
                    {editingExpenseId ? "Update" : "Add"}
                  </Button>
                  {editingExpenseId ? (
                    <Button type="button" variant="outline" onClick={resetExpenseForm}>
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
                    Title
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Category
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Amount
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Note
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Source
                  </th>
                  <th className="text-muted-foreground w-28 px-3 py-2.5 text-xs font-medium uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allExpenseRows.length > 0 ? (
                  allExpenseRows.map((row) => (
                    <tr key={row.id} className="bg-card">
                      <td className="px-3 py-2.5 tabular-nums">{row.spent_on}</td>
                      <td className="px-3 py-2.5">{row.title}</td>
                      <td className="px-3 py-2.5">
                        {row.category_id ? (
                          categoryNameById.get(row.category_id) ?? "Unknown"
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {formatMoney(row.amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.note || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-muted-foreground rounded bg-muted px-2 py-0.5 text-xs">
                          {row.source === "vehicle"
                            ? row.source_label ?? "Vehicle logs"
                            : "Manual"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.source === "manual" ? (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label="Edit expense entry"
                              onClick={() => {
                                setEditingExpenseId(row.id);
                                setExpenseDate(row.spent_on);
                                setExpenseTitle(row.title);
                                setExpenseAmount(String(row.amount));
                                setExpenseCategoryId(row.category_id ?? "");
                                setExpenseNote(row.note ?? "");
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label="Delete expense entry"
                              onClick={() =>
                                setState((prev) => removeExpenseEntryLocal(prev, row.id))
                              }
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Edit in Vehicle logs
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-muted-foreground px-3 py-6 text-center">
                      No expense entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {view === "budget" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{editingBudgetId ? "Edit budget" : "Add budget"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={onSaveBudget}
                className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div className="grid w-full gap-2 sm:w-40">
                  <Label htmlFor="budget-month">Month</Label>
                  <Input
                    id="budget-month"
                    type="month"
                    value={budgetMonth}
                    onChange={(e) => setBudgetMonth(e.target.value)}
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-64">
                  <Label htmlFor="budget-title">Title</Label>
                  <Input
                    id="budget-title"
                    value={budgetTitle}
                    onChange={(e) => setBudgetTitle(e.target.value)}
                    placeholder="Overall budget or rent budget"
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-44">
                  <Label htmlFor="budget-amount">Limit amount</Label>
                  <Input
                    id="budget-amount"
                    inputMode="decimal"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="grid w-full gap-2 sm:w-52">
                  <Label htmlFor="budget-category">Category</Label>
                  <select
                    id="budget-category"
                    className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                    value={budgetCategoryId}
                    onChange={(e) => setBudgetCategoryId(e.target.value)}
                  >
                    <option value="">All expenses</option>
                    {expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid w-full gap-2 sm:w-72">
                  <Label htmlFor="budget-note">Note (optional)</Label>
                  <Input
                    id="budget-note"
                    value={budgetNote}
                    onChange={(e) => setBudgetNote(e.target.value)}
                    placeholder="Keep this under control"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">
                    <Plus className="size-4" />
                    {editingBudgetId ? "Update" : "Add"}
                  </Button>
                  {editingBudgetId ? (
                    <Button type="button" variant="outline" onClick={resetBudgetForm}>
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
                    Month
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Title
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Category
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Limit
                  </th>
                  <th className="text-muted-foreground px-3 py-2.5 text-xs font-medium uppercase">
                    Note
                  </th>
                  <th className="text-muted-foreground w-28 px-3 py-2.5 text-xs font-medium uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.budget_entries.length > 0 ? (
                  state.budget_entries.map((row) => (
                    <tr key={row.id} className="bg-card">
                      <td className="px-3 py-2.5 tabular-nums">{monthLabel(row.budget_month)}</td>
                      <td className="px-3 py-2.5">{row.title}</td>
                      <td className="px-3 py-2.5">
                        {row.category_id ? (
                          categoryNameById.get(row.category_id) ?? "Unknown"
                        ) : (
                          <span className="text-muted-foreground">All expenses</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium tabular-nums">
                        {formatMoney(row.limit_amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.note || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Edit budget entry"
                            onClick={() => {
                              setEditingBudgetId(row.id);
                              setBudgetMonth(row.budget_month);
                              setBudgetTitle(row.title);
                              setBudgetAmount(String(row.limit_amount));
                              setBudgetCategoryId(row.category_id ?? "");
                              setBudgetNote(row.note ?? "");
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Delete budget entry"
                            onClick={() =>
                              setState((prev) => removeBudgetEntryLocal(prev, row.id))
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
                    <td colSpan={6} className="text-muted-foreground px-3 py-6 text-center">
                      No budget entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
