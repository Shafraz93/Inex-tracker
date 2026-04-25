export type BudgetCategoryKind = "income" | "expense";

export type BudgetCategory = {
  id: string;
  name: string;
  kind: BudgetCategoryKind;
  logged_at?: string;
};

export type IncomeEntry = {
  id: string;
  earned_on: string;
  title: string;
  amount: number;
  category_id: string | null;
  note: string | null;
  logged_at?: string;
};

export type ExpenseEntry = {
  id: string;
  spent_on: string;
  title: string;
  amount: number;
  category_id: string | null;
  note: string | null;
  logged_at?: string;
};

export type BudgetEntry = {
  id: string;
  budget_month: string; // YYYY-MM
  category_id: string | null;
  title: string;
  limit_amount: number;
  note: string | null;
  logged_at?: string;
};

export type BudgetTrackerState = {
  categories: BudgetCategory[];
  income_entries: IncomeEntry[];
  expense_entries: ExpenseEntry[];
  budget_entries: BudgetEntry[];
};
