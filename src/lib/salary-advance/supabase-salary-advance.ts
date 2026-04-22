import type { SupabaseClient } from "@supabase/supabase-js";

import {
  normalizeSalaryAdvanceState,
  salaryAdvanceRowsToState,
} from "@/lib/salary-advance/local-storage-salary-advance";
import type {
  SalaryAdvanceLogEntry,
  SalaryAdvanceRow,
  SalaryAdvanceState,
} from "./types";

export {
  totalRepaid,
  remainingBalance,
  totalRepaidFromList,
  remainingFromStarting,
} from "./balance";

function mapRepayment(r: Record<string, unknown>) {
  const created = r.created_at == null ? undefined : String(r.created_at);
  return {
    id: String(r.id),
    salary_advance_id: String(r.salary_advance_id),
    amount: Number(r.amount),
    paid_on: String(r.paid_on).slice(0, 10),
    note: r.note == null ? null : String(r.note),
    created_at: created,
    logged_at: created,
  };
}

function mapAdvance(raw: Record<string, unknown>): SalaryAdvanceRow {
  const reps = [...((raw.salary_advance_repayments as unknown[]) ?? [])] as Record<
    string,
    unknown
  >[];
  return {
    id: String(raw.id),
    user_id: String(raw.user_id),
    title: String(raw.title ?? ""),
    principal_amount: Number(raw.principal_amount ?? 0),
    start_date:
      raw.start_date == null || raw.start_date === ""
        ? null
        : String(raw.start_date).slice(0, 10),
    notes: raw.notes == null ? null : String(raw.notes),
    created_at: raw.created_at == null ? undefined : String(raw.created_at),
    salary_advance_repayments: reps
      .map(mapRepayment)
      .sort(
        (a, b) =>
          new Date(b.paid_on).getTime() - new Date(a.paid_on).getTime()
      ),
  };
}

export async function fetchSalaryAdvances(
  supabase: SupabaseClient,
  userId: string
): Promise<SalaryAdvanceRow[]> {
  const { data, error } = await supabase
    .from("salary_advances")
    .select(
      `
      id,
      user_id,
      title,
      principal_amount,
      start_date,
      notes,
      created_at,
      salary_advance_repayments (
        id,
        salary_advance_id,
        amount,
        paid_on,
        note,
        created_at
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapAdvance(row as Record<string, unknown>));
}

export async function insertSalaryAdvance(
  supabase: SupabaseClient,
  userId: string,
  input: {
    title: string;
    principal_amount: number;
    start_date: string | null;
    notes: string | null;
  }
): Promise<SalaryAdvanceRow> {
  const { data, error } = await supabase
    .from("salary_advances")
    .insert({
      user_id: userId,
      title: input.title.trim() || "Salary advance",
      principal_amount: input.principal_amount,
      start_date: input.start_date,
      notes: input.notes?.trim() || null,
    })
    .select(
      `
      id,
      user_id,
      title,
      principal_amount,
      start_date,
      notes,
      created_at,
      salary_advance_repayments (
        id,
        salary_advance_id,
        amount,
        paid_on,
        note,
        created_at
      )
    `
    )
    .single();

  if (error) throw new Error(error.message);
  return mapAdvance(data as Record<string, unknown>);
}

export async function deleteSalaryAdvance(
  supabase: SupabaseClient,
  advanceId: string
): Promise<void> {
  const { error } = await supabase
    .from("salary_advances")
    .delete()
    .eq("id", advanceId);
  if (error) throw new Error(error.message);
}

export async function insertRepayment(
  supabase: SupabaseClient,
  input: {
    salary_advance_id: string;
    amount: number;
    paid_on: string;
    note: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("salary_advance_repayments").insert({
    salary_advance_id: input.salary_advance_id,
    amount: input.amount,
    paid_on: input.paid_on,
    note: input.note?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteRepayment(
  supabase: SupabaseClient,
  repaymentId: string
): Promise<void> {
  const { error } = await supabase
    .from("salary_advance_repayments")
    .delete()
    .eq("id", repaymentId);
  if (error) throw new Error(error.message);
}

/** Stored in `salary_advances.notes` for the single-track cloud snapshot. */
const ADVANCE_LOGS_NOTES_KEY = "inex_sa_logs_v1";

function parseAdvanceLogsFromNotes(
  notes: string | null
): SalaryAdvanceLogEntry[] | null {
  if (notes == null || notes === "") return null;
  const t = notes.trim();
  if (!t.startsWith("{")) return null;
  try {
    const o = JSON.parse(t) as {
      k?: string;
      advance_logs?: unknown;
    };
    if (o.k === ADVANCE_LOGS_NOTES_KEY && Array.isArray(o.advance_logs)) {
      return normalizeSalaryAdvanceState({
        starting_balance: 0,
        starting_balance_date: null,
        repayments: [],
        advance_logs: o.advance_logs,
      }).advance_logs;
    }
  } catch {
    return null;
  }
  return null;
}

function encodeAdvanceLogsNotes(logs: SalaryAdvanceLogEntry[]): string {
  return JSON.stringify({ k: ADVANCE_LOGS_NOTES_KEY, advance_logs: logs });
}

function stateIsEmpty(s: SalaryAdvanceState): boolean {
  return (
    s.starting_balance <= 0 &&
    s.repayments.length === 0 &&
    s.advance_logs.length === 0
  );
}

/** Load unified salary-advance state from Supabase (single-track snapshot or legacy rows). */
export async function fetchSalaryAdvanceState(
  supabase: SupabaseClient,
  userId: string
): Promise<SalaryAdvanceState> {
  const rows = await fetchSalaryAdvances(supabase, userId);
  if (rows.length === 0) {
    return normalizeSalaryAdvanceState(null);
  }
  if (rows.length === 1) {
    const r = rows[0]!;
    const logs = parseAdvanceLogsFromNotes(r.notes);
    if (logs != null) {
      return normalizeSalaryAdvanceState({
        starting_balance: Number(r.principal_amount),
        starting_balance_date: r.start_date,
        repayments: r.salary_advance_repayments,
        advance_logs: logs,
      });
    }
  }
  return salaryAdvanceRowsToState(rows);
}

/** Replace all cloud rows with one snapshot row + repayments (matches app single-track model). */
export async function replaceSalaryAdvanceState(
  supabase: SupabaseClient,
  userId: string,
  state: SalaryAdvanceState
): Promise<SalaryAdvanceState> {
  const normalized = normalizeSalaryAdvanceState(state);

  const { error: delErr } = await supabase
    .from("salary_advances")
    .delete()
    .eq("user_id", userId);
  if (delErr) throw new Error(delErr.message);

  if (stateIsEmpty(normalized)) {
    return normalizeSalaryAdvanceState(null);
  }

  const notes = encodeAdvanceLogsNotes(normalized.advance_logs);
  const { data, error: insErr } = await supabase
    .from("salary_advances")
    .insert({
      user_id: userId,
      title: "Salary advance",
      principal_amount: normalized.starting_balance,
      start_date: normalized.starting_balance_date,
      notes,
    })
    .select("id")
    .single();

  if (insErr) throw new Error(insErr.message);
  const advanceId = String((data as { id: string }).id);

  if (normalized.repayments.length > 0) {
    const { error: repErr } = await supabase
      .from("salary_advance_repayments")
      .insert(
        normalized.repayments.map((r) => ({
          salary_advance_id: advanceId,
          amount: r.amount,
          paid_on: r.paid_on,
          note: r.note,
        }))
      );
    if (repErr) throw new Error(repErr.message);
  }

  return fetchSalaryAdvanceState(supabase, userId);
}
