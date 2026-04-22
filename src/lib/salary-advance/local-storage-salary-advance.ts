import { newEntityId } from "@/lib/seetu/local-storage";

import { remainingFromStarting, totalRepaidFromList } from "./balance";
import type {
  SalaryAdvanceLogEntry,
  SalaryAdvanceRepaymentRow,
  SalaryAdvanceRow,
  SalaryAdvanceState,
} from "./types";

export const SALARY_ADVANCE_LOCAL_STORAGE_KEY =
  "inex-tracker.salary-advance.v1";

const LEGACY_OPENING_ADVANCE_LOG_ID = "legacy-opening-balance";

function emptyState(): SalaryAdvanceState {
  return {
    starting_balance: 0,
    starting_balance_date: null,
    repayments: [],
    advance_logs: [],
  };
}

function normalizeRepayment(
  r: Record<string, unknown>
): SalaryAdvanceRepaymentRow {
  return {
    id: String(r.id),
    amount: Number(r.amount ?? 0),
    paid_on: String(r.paid_on ?? "").slice(0, 10),
    note: r.note == null ? null : String(r.note),
    salary_advance_id:
      r.salary_advance_id == null
        ? undefined
        : String(r.salary_advance_id),
    created_at:
      r.created_at == null ? undefined : String(r.created_at),
    logged_at:
      r.logged_at == null ? undefined : String(r.logged_at),
  };
}

function normalizeAdvanceLog(
  r: Record<string, unknown>
): SalaryAdvanceLogEntry {
  const on = r.advance_on ?? r.date;
  return {
    id: String(r.id),
    amount: Number(r.amount ?? 0),
    advance_on: String(on ?? "").slice(0, 10),
    logged_at: r.logged_at == null ? undefined : String(r.logged_at),
  };
}

function normalizeAdvanceLogsList(
  list: unknown
): SalaryAdvanceLogEntry[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((r) => normalizeAdvanceLog(r as Record<string, unknown>))
    .filter((e) => e.advance_on.length >= 8 && e.amount > 0)
    .sort((a, b) => {
      const da = new Date(a.advance_on).getTime();
      const db = new Date(b.advance_on).getTime();
      if (db !== da) return db - da;
      const ta = a.logged_at ? new Date(a.logged_at).getTime() : 0;
      const tb = b.logged_at ? new Date(b.logged_at).getTime() : 0;
      return tb - ta;
    });
}

function normalizeRepaymentsList(
  list: unknown
): SalaryAdvanceRepaymentRow[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((r) => normalizeRepayment(r as Record<string, unknown>))
    .sort(
      (a, b) =>
        new Date(b.paid_on).getTime() - new Date(a.paid_on).getTime()
    );
}

function coerceState(s: SalaryAdvanceState): SalaryAdvanceState {
  return {
    starting_balance: Math.max(0, Number(s.starting_balance ?? 0)),
    starting_balance_date:
      s.starting_balance_date == null || s.starting_balance_date === ""
        ? null
        : String(s.starting_balance_date).slice(0, 10),
    repayments: normalizeRepaymentsList(s.repayments),
    advance_logs: normalizeAdvanceLogsList(s.advance_logs),
  };
}

function lastAdvanceOnFromLogs(logs: SalaryAdvanceLogEntry[]): string | null {
  if (logs.length === 0) return null;
  return logs
    .reduce(
      (max, L) => (L.advance_on > max ? L.advance_on : max),
      logs[0]!.advance_on
    )
    .slice(0, 10);
}

function parseLegacyAdvanceRow(raw: Record<string, unknown>): SalaryAdvanceRow {
  return {
    id: String(raw.id),
    user_id: raw.user_id != null ? String(raw.user_id) : undefined,
    title: String(raw.title ?? "Salary advance"),
    principal_amount: Number(raw.principal_amount ?? 0),
    start_date:
      raw.start_date == null || raw.start_date === ""
        ? null
        : String(raw.start_date).slice(0, 10),
    notes: raw.notes == null ? null : String(raw.notes),
    created_at: raw.created_at == null ? undefined : String(raw.created_at),
    salary_advance_repayments: normalizeRepaymentsList(
      raw.salary_advance_repayments
    ),
  };
}

export function salaryAdvanceRowsToState(
  advances: SalaryAdvanceRow[]
): SalaryAdvanceState {
  if (advances.length === 0) return emptyState();
  const starting_balance = advances.reduce(
    (s, a) => s + Number(a.principal_amount ?? 0),
    0
  );
  const dates = advances
    .map((a) => a.start_date)
    .filter((d): d is string => d != null && d !== "");
  const starting_balance_date =
    dates.length > 0 ? dates.sort()[0]!.slice(0, 10) : null;
  const repayments = normalizeRepaymentsList(
    advances.flatMap((a) => a.salary_advance_repayments ?? [])
  );
  const advance_logs = advances
    .filter((a) => a.principal_amount > 0)
    .map((a) => {
      const on =
        (a.start_date && String(a.start_date).slice(0, 10)) ||
        (a.created_at ? String(a.created_at).slice(0, 10) : "");
      return {
        id: a.id,
        amount: a.principal_amount,
        advance_on: on,
        logged_at: a.created_at,
      } satisfies SalaryAdvanceLogEntry;
    })
    .filter((e) => e.advance_on.length >= 8);
  let advanceLogsFinal = advance_logs;
  if (
    advanceLogsFinal.length === 0 &&
    starting_balance > 0 &&
    starting_balance_date
  ) {
    advanceLogsFinal = [
      {
        id: LEGACY_OPENING_ADVANCE_LOG_ID,
        amount: starting_balance,
        advance_on: starting_balance_date,
        logged_at: undefined,
      },
    ];
  }
  return coerceState({
    starting_balance,
    starting_balance_date,
    repayments,
    advance_logs: advanceLogsFinal,
  });
}

export function normalizeSalaryAdvanceState(data: unknown): SalaryAdvanceState {
  if (data == null) return emptyState();
  if (Array.isArray(data)) {
    const advances = (data as Record<string, unknown>[]).map(
      parseLegacyAdvanceRow
    );
    return salaryAdvanceRowsToState(advances);
  }
  const obj = data as Record<string, unknown>;
  if ("starting_balance" in obj || "repayments" in obj) {
    const dateRaw = obj.starting_balance_date ?? obj.start_date;
    const starting_balance = Number(obj.starting_balance ?? 0);
    const starting_balance_date =
      dateRaw == null || dateRaw === ""
        ? null
        : String(dateRaw).slice(0, 10);
    let advance_logs = normalizeAdvanceLogsList(obj.advance_logs);
    if (
      advance_logs.length === 0 &&
      starting_balance > 0 &&
      starting_balance_date
    ) {
      advance_logs = [
        {
          id: LEGACY_OPENING_ADVANCE_LOG_ID,
          amount: starting_balance,
          advance_on: starting_balance_date,
        },
      ];
    }
    return coerceState({
      starting_balance,
      starting_balance_date,
      repayments: normalizeRepaymentsList(obj.repayments),
      advance_logs,
    });
  }
  return emptyState();
}

export function readSalaryAdvanceStateFromLocal(): SalaryAdvanceState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(SALARY_ADVANCE_LOCAL_STORAGE_KEY);
    if (!raw) return emptyState();
    return normalizeSalaryAdvanceState(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

export function writeSalaryAdvanceStateToLocal(
  state: SalaryAdvanceState
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SALARY_ADVANCE_LOCAL_STORAGE_KEY,
      JSON.stringify(coerceState(state))
    );
  } catch {
    throw new Error("Could not save salary advance data to this browser.");
  }
}

export function addRepaymentLocal(
  prev: SalaryAdvanceState,
  input: { amount: number; paid_on: string; note: string | null }
): SalaryAdvanceState {
  const loggedAt = new Date().toISOString();
  return coerceState({
    ...prev,
    repayments: [
      {
        id: newEntityId(),
        amount: input.amount,
        paid_on: input.paid_on,
        note: input.note,
        logged_at: loggedAt,
      },
      ...prev.repayments,
    ],
  });
}

export function removeRepaymentLocal(
  prev: SalaryAdvanceState,
  repaymentId: string
): SalaryAdvanceState {
  return coerceState({
    ...prev,
    repayments: prev.repayments.filter((r) => r.id !== repaymentId),
  });
}

export function setStartingPositionLocal(
  prev: SalaryAdvanceState,
  input: { starting_balance: number; starting_balance_date: string | null }
): SalaryAdvanceState {
  return coerceState({
    ...prev,
    starting_balance: input.starting_balance,
    starting_balance_date: input.starting_balance_date,
  });
}

/**
 * First advance sets principal; later advances add to what you still owe
 * (remaining + new amount). Date is when that advance applies.
 */
export function recordNewAdvanceLocal(
  prev: SalaryAdvanceState,
  input: { amount: number; date: string }
): SalaryAdvanceState {
  const hasOpening =
    prev.starting_balance > 0 && prev.starting_balance_date != null;
  const newStarting = hasOpening
    ? remainingFromStarting(prev.starting_balance, prev.repayments) +
      input.amount
    : input.amount;
  const advanceOn = String(input.date).slice(0, 10);
  const loggedAt = new Date().toISOString();
  const entry: SalaryAdvanceLogEntry = {
    id: newEntityId(),
    amount: input.amount,
    advance_on: advanceOn,
    logged_at: loggedAt,
  };
  const logs = normalizeAdvanceLogsList(prev.advance_logs ?? []);
  const combined = normalizeAdvanceLogsList([entry, ...logs]);
  const lastOn = lastAdvanceOnFromLogs(combined) ?? advanceOn;
  return coerceState({
    ...prev,
    starting_balance: newStarting,
    starting_balance_date: lastOn,
    advance_logs: combined,
  });
}

export function removeAdvanceLogLocal(
  prev: SalaryAdvanceState,
  logId: string
): SalaryAdvanceState {
  const row = prev.advance_logs.find((l) => l.id === logId);
  if (!row) return coerceState(prev);
  const nextLogs = prev.advance_logs.filter((l) => l.id !== logId);
  const normalized = normalizeAdvanceLogsList(nextLogs);
  const nextBalance = Math.max(0, prev.starting_balance - row.amount);
  const lastOn = lastAdvanceOnFromLogs(normalized);
  return coerceState({
    ...prev,
    advance_logs: normalized,
    starting_balance: nextBalance,
    starting_balance_date: lastOn,
  });
}

export function updateAdvanceLogLocal(
  prev: SalaryAdvanceState,
  logId: string,
  patch: { amount: number; advance_on: string }
): SalaryAdvanceState {
  const row = prev.advance_logs.find((l) => l.id === logId);
  if (!row) return coerceState(prev);
  const amt = Number(patch.amount);
  if (!Number.isFinite(amt) || amt <= 0) return coerceState(prev);
  const on = String(patch.advance_on).trim().slice(0, 10);
  if (on.length < 8) return coerceState(prev);
  const delta = amt - row.amount;
  const nextBalance = Math.max(0, prev.starting_balance + delta);
  const nextLogs = prev.advance_logs.map((l) =>
    l.id === logId
      ? {
          ...l,
          amount: amt,
          advance_on: on,
          logged_at: new Date().toISOString(),
        }
      : l
  );
  const normalized = normalizeAdvanceLogsList(nextLogs);
  const lastOn = lastAdvanceOnFromLogs(normalized);
  return coerceState({
    ...prev,
    advance_logs: normalized,
    starting_balance: nextBalance,
    starting_balance_date: lastOn,
  });
}

export function updateRepaymentLocal(
  prev: SalaryAdvanceState,
  repaymentId: string,
  patch: { amount: number; paid_on: string }
): SalaryAdvanceState {
  const row = prev.repayments.find((r) => r.id === repaymentId);
  if (!row) return coerceState(prev);
  const amt = Number(patch.amount);
  if (!Number.isFinite(amt) || amt <= 0) return coerceState(prev);
  const paidOn = String(patch.paid_on).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return coerceState(prev);
  const others = prev.repayments.filter((r) => r.id !== repaymentId);
  const otherTotal = totalRepaidFromList(others);
  const maxForRow = Math.max(0, prev.starting_balance - otherTotal);
  if (amt > maxForRow + 0.02) return coerceState(prev);
  const nextRepayments = prev.repayments.map((r) =>
    r.id === repaymentId
      ? {
          ...r,
          amount: amt,
          paid_on: paidOn,
          logged_at: new Date().toISOString(),
        }
      : r
  );
  return coerceState({ ...prev, repayments: nextRepayments });
}
