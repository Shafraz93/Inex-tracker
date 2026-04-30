"use client";

import * as React from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBudgetTracker } from "@/contexts/budget-tracker-context";
import { addExpenseEntryLocal } from "@/lib/budget-tracker/local-storage";
import { formatMoney } from "@/lib/currency";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function FoodGroceriesHomeCard() {
  const { state, setState, hydrated } = useBudgetTracker();

  const [date, setDate] = React.useState(todayIso);
  const [amount, setAmount] = React.useState("");
  const [title, setTitle] = React.useState("Groceries");
  const [categoryId, setCategoryId] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);

  const expenseCategories = React.useMemo(
    () => state.categories.filter((c) => c.kind === "expense"),
    [state.categories]
  );

  const suggestedCategory = React.useMemo(
    () =>
      expenseCategories.find((c) => /food|grocery|grocer/i.test(c.name))?.id ?? "",
    [expenseCategories]
  );
  const foodCategoryIds = React.useMemo(
    () =>
      new Set(
        expenseCategories
          .filter((c) => /food|grocery|grocer/i.test(c.name))
          .map((c) => c.id)
      ),
    [expenseCategories]
  );

  React.useEffect(() => {
    if (!categoryId && suggestedCategory) setCategoryId(suggestedCategory);
  }, [categoryId, suggestedCategory]);

  const monthKey = date.slice(0, 7);
  const monthTotal = React.useMemo(
    () =>
      state.expense_entries.reduce((sum, row) => {
        if (!row.spent_on.startsWith(monthKey)) return sum;
        const byCategory =
          row.category_id != null && foodCategoryIds.has(row.category_id);
        const byTitle = /food|grocery|grocer/i.test(row.title);
        if (!byCategory && !byTitle) return sum;
        return sum + row.amount;
      }, 0),
    [state.expense_entries, monthKey, foodCategoryIds]
  );

  if (!hydrated) return null;

  return (
    <Card size="sm" className="w-full">
      <CardHeader className="border-b border-border">
        <CardTitle>Food & groceries</CardTitle>
        <CardAction>
          <Link
            href="/expenses"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open expenses
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <p className="text-muted-foreground text-sm">
          This month total:{" "}
          <span className="text-foreground font-semibold tabular-nums">
            {formatMoney(monthTotal)}
          </span>
        </p>

        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage(null);
            const parsedAmount = Number(amount.replace(/,/g, "").trim());
            if (!date) {
              setMessage("Select a date.");
              return;
            }
            if (!title.trim()) {
              setMessage("Enter a title.");
              return;
            }
            if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
              setMessage("Enter a valid amount.");
              return;
            }

            setState((prev) =>
              addExpenseEntryLocal(prev, {
                spent_on: date,
                title: title.trim(),
                amount: parsedAmount,
                category_id: categoryId || null,
                note: null,
              })
            );
            setAmount("");
            setMessage("Expense added.");
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="home-food-date">Date</Label>
            <Input
              id="home-food-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="home-food-title">Title</Label>
            <Input
              id="home-food-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Groceries"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="home-food-amount">Amount</Label>
            <Input
              id="home-food-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="home-food-category">Category</Label>
            <select
              id="home-food-category"
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Uncategorized</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" className="w-full sm:w-auto">
              Add food expense
            </Button>
          </div>
        </form>

        {message ? (
          <p className="text-muted-foreground text-xs">{message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
