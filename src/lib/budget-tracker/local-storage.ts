import { newEntityId } from "@/lib/seetu/local-storage";
import type {
  BudgetCategory,
  BudgetCategoryKind,
  BudgetEntry,
  BudgetTrackerState,
  ExpenseEntry,
  IncomeEntry,
} from "@/lib/budget-tracker/types";

export const BUDGET_TRACKER_LOCAL_STORAGE_KEY = "inex-tracker.budget-tracker.v1";

export function emptyBudgetTrackerState(): BudgetTrackerState {
  return {
    categories: [],
    income_entries: [],
    expense_entries: [],
    budget_entries: [],
  };
}

function normalizeCategoryKind(raw: unknown): BudgetCategoryKind {
  return raw === "income" ? "income" : "expense";
}

function normalizeCategory(raw: Record<string, unknown>): BudgetCategory {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? "").trim(),
    kind: normalizeCategoryKind(raw.kind),
    logged_at: raw.logged_at == null ? undefined : String(raw.logged_at),
  };
}

function normalizeIncome(raw: Record<string, unknown>): IncomeEntry {
  return {
    id: String(raw.id ?? ""),
    earned_on: String(raw.earned_on ?? "").slice(0, 10),
    title: String(raw.title ?? "").trim(),
    amount: Math.max(0, Number(raw.amount ?? 0)),
    category_id:
      raw.category_id == null || String(raw.category_id).trim() === ""
        ? null
        : String(raw.category_id),
    note: raw.note == null ? null : String(raw.note).trim() || null,
    logged_at: raw.logged_at == null ? undefined : String(raw.logged_at),
  };
}

function normalizeExpense(raw: Record<string, unknown>): ExpenseEntry {
  return {
    id: String(raw.id ?? ""),
    spent_on: String(raw.spent_on ?? "").slice(0, 10),
    title: String(raw.title ?? "").trim(),
    amount: Math.max(0, Number(raw.amount ?? 0)),
    category_id:
      raw.category_id == null || String(raw.category_id).trim() === ""
        ? null
        : String(raw.category_id),
    note: raw.note == null ? null : String(raw.note).trim() || null,
    logged_at: raw.logged_at == null ? undefined : String(raw.logged_at),
  };
}

function normalizeBudget(raw: Record<string, unknown>): BudgetEntry {
  return {
    id: String(raw.id ?? ""),
    budget_month: String(raw.budget_month ?? "").slice(0, 7),
    category_id:
      raw.category_id == null || String(raw.category_id).trim() === ""
        ? null
        : String(raw.category_id),
    title: String(raw.title ?? "").trim(),
    limit_amount: Math.max(0, Number(raw.limit_amount ?? 0)),
    note: raw.note == null ? null : String(raw.note).trim() || null,
    logged_at: raw.logged_at == null ? undefined : String(raw.logged_at),
  };
}

export function normalizeBudgetTrackerState(data: unknown): BudgetTrackerState {
  if (!data || typeof data !== "object") return emptyBudgetTrackerState();
  const raw = data as Record<string, unknown>;

  const categories = Array.isArray(raw.categories)
    ? raw.categories
        .map((row) => normalizeCategory(row as Record<string, unknown>))
        .filter((row) => row.id && row.name)
        .sort((a, b) => {
          const k = a.kind.localeCompare(b.kind);
          if (k !== 0) return k;
          return a.name.localeCompare(b.name);
        })
    : [];

  const categoryIds = new Set(categories.map((c) => c.id));

  const income_entries = Array.isArray(raw.income_entries)
    ? raw.income_entries
        .map((row) => normalizeIncome(row as Record<string, unknown>))
        .filter((row) => row.id && row.earned_on && row.title && row.amount >= 0)
        .map((row) => ({
          ...row,
          category_id:
            row.category_id && categoryIds.has(row.category_id)
              ? row.category_id
              : null,
        }))
        .sort((a, b) => {
          const d = b.earned_on.localeCompare(a.earned_on);
          if (d !== 0) return d;
          return (b.logged_at ?? "").localeCompare(a.logged_at ?? "");
        })
    : [];

  const expense_entries = Array.isArray(raw.expense_entries)
    ? raw.expense_entries
        .map((row) => normalizeExpense(row as Record<string, unknown>))
        .filter((row) => row.id && row.spent_on && row.title && row.amount >= 0)
        .map((row) => ({
          ...row,
          category_id:
            row.category_id && categoryIds.has(row.category_id)
              ? row.category_id
              : null,
        }))
        .sort((a, b) => {
          const d = b.spent_on.localeCompare(a.spent_on);
          if (d !== 0) return d;
          return (b.logged_at ?? "").localeCompare(a.logged_at ?? "");
        })
    : [];

  const budget_entries = Array.isArray(raw.budget_entries)
    ? raw.budget_entries
        .map((row) => normalizeBudget(row as Record<string, unknown>))
        .filter((row) => row.id && row.budget_month && row.limit_amount >= 0)
        .map((row) => ({
          ...row,
          category_id:
            row.category_id && categoryIds.has(row.category_id)
              ? row.category_id
              : null,
        }))
        .sort((a, b) => {
          const m = b.budget_month.localeCompare(a.budget_month);
          if (m !== 0) return m;
          return (b.logged_at ?? "").localeCompare(a.logged_at ?? "");
        })
    : [];

  return {
    categories,
    income_entries,
    expense_entries,
    budget_entries,
  };
}

export function readBudgetTrackerStateFromLocal(): BudgetTrackerState {
  if (typeof window === "undefined") return emptyBudgetTrackerState();
  try {
    const raw = window.localStorage.getItem(BUDGET_TRACKER_LOCAL_STORAGE_KEY);
    if (!raw) return emptyBudgetTrackerState();
    return normalizeBudgetTrackerState(JSON.parse(raw));
  } catch {
    return emptyBudgetTrackerState();
  }
}

export function writeBudgetTrackerStateToLocal(state: BudgetTrackerState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      BUDGET_TRACKER_LOCAL_STORAGE_KEY,
      JSON.stringify(normalizeBudgetTrackerState(state))
    );
  } catch {
    throw new Error("Could not save budget tracker to this browser.");
  }
}

export function addCategoryLocal(
  prev: BudgetTrackerState,
  input: { name: string; kind: BudgetCategoryKind }
): BudgetTrackerState {
  const next: BudgetCategory = {
    id: newEntityId(),
    name: input.name.trim(),
    kind: input.kind,
    logged_at: new Date().toISOString(),
  };
  return normalizeBudgetTrackerState({
    ...prev,
    categories: [next, ...prev.categories],
  });
}

export function updateCategoryLocal(
  prev: BudgetTrackerState,
  categoryId: string,
  input: { name: string; kind: BudgetCategoryKind }
): BudgetTrackerState {
  return normalizeBudgetTrackerState({
    ...prev,
    categories: prev.categories.map((c) =>
      c.id === categoryId
        ? {
            ...c,
            name: input.name.trim(),
            kind: input.kind,
            logged_at: c.logged_at ?? new Date().toISOString(),
          }
        : c
    ),
  });
}

export function removeCategoryLocal(
  prev: BudgetTrackerState,
  categoryId: string
): BudgetTrackerState {
  return normalizeBudgetTrackerState({
    ...prev,
    categories: prev.categories.filter((c) => c.id !== categoryId),
    income_entries: prev.income_entries.map((r) =>
      r.category_id === categoryId ? { ...r, category_id: null } : r
    ),
    expense_entries: prev.expense_entries.map((r) =>
      r.category_id === categoryId ? { ...r, category_id: null } : r
    ),
    budget_entries: prev.budget_entries.map((r) =>
      r.category_id === categoryId ? { ...r, category_id: null } : r
    ),
  });
}

export function addIncomeEntryLocal(
  prev: BudgetTrackerState,
  input: Omit<IncomeEntry, "id" | "logged_at">
): BudgetTrackerState {
  const next: IncomeEntry = {
    id: newEntityId(),
    earned_on: input.earned_on.slice(0, 10),
    title: input.title.trim(),
    amount: Math.max(0, input.amount),
    category_id: input.category_id,
    note: input.note?.trim() || null,
    logged_at: new Date().toISOString(),
  };
  return normalizeBudgetTrackerState({
    ...prev,
    income_entries: [next, ...prev.income_entries],
  });
}

export function updateIncomeEntryLocal(
  prev: BudgetTrackerState,
  entryId: string,
  input: Omit<IncomeEntry, "id" | "logged_at">
): BudgetTrackerState {
  return normalizeBudgetTrackerState({
    ...prev,
    income_entries: prev.income_entries.map((r) =>
      r.id === entryId
        ? {
            ...r,
            earned_on: input.earned_on.slice(0, 10),
            title: input.title.trim(),
            amount: Math.max(0, input.amount),
            category_id: input.category_id,
            note: input.note?.trim() || null,
          }
        : r
    ),
  });
}

export function removeIncomeEntryLocal(
  prev: BudgetTrackerState,
  entryId: string
): BudgetTrackerState {
  return normalizeBudgetTrackerState({
    ...prev,
    income_entries: prev.income_entries.filter((r) => r.id !== entryId),
  });
}

export function addExpenseEntryLocal(
  prev: BudgetTrackerState,
  input: Omit<ExpenseEntry, "id" | "logged_at">
): BudgetTrackerState {
  const next: ExpenseEntry = {
    id: newEntityId(),
    spent_on: input.spent_on.slice(0, 10),
    title: input.title.trim(),
    amount: Math.max(0, input.amount),
    category_id: input.category_id,
    note: input.note?.trim() || null,
    logged_at: new Date().toISOString(),
  };
  return normalizeBudgetTrackerState({
    ...prev,
    expense_entries: [next, ...prev.expense_entries],
  });
}

export function updateExpenseEntryLocal(
  prev: BudgetTrackerState,
  entryId: string,
  input: Omit<ExpenseEntry, "id" | "logged_at">
): BudgetTrackerState {
  return normalizeBudgetTrackerState({
    ...prev,
    expense_entries: prev.expense_entries.map((r) =>
      r.id === entryId
        ? {
            ...r,
            spent_on: input.spent_on.slice(0, 10),
            title: input.title.trim(),
            amount: Math.max(0, input.amount),
            category_id: input.category_id,
            note: input.note?.trim() || null,
          }
        : r
    ),
  });
}

export function removeExpenseEntryLocal(
  prev: BudgetTrackerState,
  entryId: string
): BudgetTrackerState {
  return normalizeBudgetTrackerState({
    ...prev,
    expense_entries: prev.expense_entries.filter((r) => r.id !== entryId),
  });
}

export function addBudgetEntryLocal(
  prev: BudgetTrackerState,
  input: Omit<BudgetEntry, "id" | "logged_at">
): BudgetTrackerState {
  const next: BudgetEntry = {
    id: newEntityId(),
    budget_month: input.budget_month.slice(0, 7),
    category_id: input.category_id,
    title: input.title.trim(),
    limit_amount: Math.max(0, input.limit_amount),
    note: input.note?.trim() || null,
    logged_at: new Date().toISOString(),
  };
  return normalizeBudgetTrackerState({
    ...prev,
    budget_entries: [next, ...prev.budget_entries],
  });
}

export function updateBudgetEntryLocal(
  prev: BudgetTrackerState,
  entryId: string,
  input: Omit<BudgetEntry, "id" | "logged_at">
): BudgetTrackerState {
  return normalizeBudgetTrackerState({
    ...prev,
    budget_entries: prev.budget_entries.map((r) =>
      r.id === entryId
        ? {
            ...r,
            budget_month: input.budget_month.slice(0, 7),
            category_id: input.category_id,
            title: input.title.trim(),
            limit_amount: Math.max(0, input.limit_amount),
            note: input.note?.trim() || null,
          }
        : r
    ),
  });
}

export function removeBudgetEntryLocal(
  prev: BudgetTrackerState,
  entryId: string
): BudgetTrackerState {
  return normalizeBudgetTrackerState({
    ...prev,
    budget_entries: prev.budget_entries.filter((r) => r.id !== entryId),
  });
}

export function copyBudgetMonthLocal(
  prev: BudgetTrackerState,
  fromMonth: string,
  toMonth: string
): BudgetTrackerState {
  const from = fromMonth.slice(0, 7);
  const to = toMonth.slice(0, 7);
  if (!from || !to || from === to) return normalizeBudgetTrackerState(prev);

  const source = prev.budget_entries.filter((r) => r.budget_month === from);
  if (source.length === 0) return normalizeBudgetTrackerState(prev);

  const nowIso = new Date().toISOString();
  const copied = source.map((r) => ({
    ...r,
    id: newEntityId(),
    budget_month: to,
    logged_at: nowIso,
  }));

  return normalizeBudgetTrackerState({
    ...prev,
    budget_entries: [
      ...copied,
      ...prev.budget_entries.filter((r) => r.budget_month !== to),
    ],
  });
}
