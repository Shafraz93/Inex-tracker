/** One repayment toward the salary advance (local: no advance grouping). */
export type SalaryAdvanceRepaymentRow = {
  id: string;
  amount: number;
  paid_on: string;
  note: string | null;
  /** Present when synced from Supabase multi-advance rows. */
  salary_advance_id?: string;
  created_at?: string;
  /** When this repayment was logged in the app (ISO). */
  logged_at?: string;
};

/** One recorded advance line (amount added on a date). */
export type SalaryAdvanceLogEntry = {
  id: string;
  amount: number;
  /** Calendar date the advance applies to (YYYY-MM-DD). */
  advance_on: string;
  /** When this row was saved (ISO). */
  logged_at?: string;
};

/** Single-track state: one starting balance for the whole page. */
export type SalaryAdvanceState = {
  starting_balance: number;
  starting_balance_date: string | null;
  repayments: SalaryAdvanceRepaymentRow[];
  /** Append-only log of each advance saved (newest first after normalize). */
  advance_logs: SalaryAdvanceLogEntry[];
};

/**
 * Legacy per-advance shape (localStorage v1 / Supabase).
 * Used for migration and server mapping only.
 */
export type SalaryAdvanceRow = {
  id: string;
  user_id?: string;
  title: string;
  principal_amount: number;
  start_date: string | null;
  notes: string | null;
  created_at?: string;
  salary_advance_repayments: SalaryAdvanceRepaymentRow[];
};
