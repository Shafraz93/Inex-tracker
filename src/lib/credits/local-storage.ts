import { newEntityId } from "@/lib/seetu/local-storage";
import type {
  CreditPerson,
  CreditsState,
  CreditSettlement,
} from "@/lib/credits/types";

export const CREDITS_LOCAL_STORAGE_KEY = "inex-tracker.credits.v1";

export function emptyCreditsState(): CreditsState {
  return {
    global_expense_category_id: null,
    persons: [],
    settlements: [],
  };
}

function normalizePerson(raw: Record<string, unknown>): CreditPerson {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? "").trim(),
    opening_balance: Math.max(0, Number(raw.opening_balance ?? 0)),
    logged_at: raw.logged_at == null ? undefined : String(raw.logged_at),
  };
}

function normalizeSettlement(raw: Record<string, unknown>): CreditSettlement {
  return {
    id: String(raw.id ?? ""),
    credit_person_id: String(raw.credit_person_id ?? ""),
    settled_on: String(raw.settled_on ?? "").slice(0, 10),
    amount: Math.max(0, Number(raw.amount ?? 0)),
    logged_at: raw.logged_at == null ? undefined : String(raw.logged_at),
  };
}

export function normalizeCreditsState(data: unknown): CreditsState {
  if (!data || typeof data !== "object") return emptyCreditsState();
  const raw = data as Record<string, unknown>;

  const persons = Array.isArray(raw.persons)
    ? raw.persons
        .map((p) => normalizePerson(p as Record<string, unknown>))
        .filter((p) => p.id && p.name)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const personIds = new Set(persons.map((p) => p.id));

  const settlements = Array.isArray(raw.settlements)
    ? raw.settlements
        .map((s) => normalizeSettlement(s as Record<string, unknown>))
        .filter((s) => s.id && s.credit_person_id && s.settled_on && s.amount >= 0)
        .filter((s) => personIds.has(s.credit_person_id))
        .sort((a, b) => {
          const d = b.settled_on.localeCompare(a.settled_on);
          if (d !== 0) return d;
          return (b.logged_at ?? "").localeCompare(a.logged_at ?? "");
        })
    : [];

  return {
    global_expense_category_id:
      raw.global_expense_category_id == null ||
      String(raw.global_expense_category_id).trim() === ""
        ? null
        : String(raw.global_expense_category_id),
    persons,
    settlements,
  };
}

export function readCreditsStateFromLocal(): CreditsState {
  if (typeof window === "undefined") return emptyCreditsState();
  try {
    const raw = window.localStorage.getItem(CREDITS_LOCAL_STORAGE_KEY);
    if (!raw) return emptyCreditsState();
    return normalizeCreditsState(JSON.parse(raw));
  } catch {
    return emptyCreditsState();
  }
}

export function writeCreditsStateToLocal(state: CreditsState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CREDITS_LOCAL_STORAGE_KEY,
      JSON.stringify(normalizeCreditsState(state))
    );
  } catch {
    throw new Error("Could not save credits to this browser.");
  }
}

export function updateCreditsGlobalCategoryLocal(
  prev: CreditsState,
  categoryId: string | null
): CreditsState {
  return normalizeCreditsState({
    ...prev,
    global_expense_category_id: categoryId,
  });
}

export function addCreditPersonLocal(
  prev: CreditsState,
  input: { name: string; opening_balance: number }
): CreditsState {
  const next: CreditPerson = {
    id: newEntityId(),
    name: input.name.trim(),
    opening_balance: Math.max(0, input.opening_balance),
    logged_at: new Date().toISOString(),
  };
  return normalizeCreditsState({
    ...prev,
    persons: [next, ...prev.persons],
  });
}

export function updateCreditPersonLocal(
  prev: CreditsState,
  personId: string,
  input: { name: string; opening_balance: number }
): CreditsState {
  return normalizeCreditsState({
    ...prev,
    persons: prev.persons.map((p) =>
      p.id === personId
        ? {
            ...p,
            name: input.name.trim(),
            opening_balance: Math.max(0, input.opening_balance),
          }
        : p
    ),
  });
}

export function removeCreditPersonLocal(
  prev: CreditsState,
  personId: string
): CreditsState {
  return normalizeCreditsState({
    ...prev,
    persons: prev.persons.filter((p) => p.id !== personId),
    settlements: prev.settlements.filter((s) => s.credit_person_id !== personId),
  });
}

export function addCreditSettlementLocal(
  prev: CreditsState,
  input: Omit<CreditSettlement, "id" | "logged_at">
): CreditsState {
  const next: CreditSettlement = {
    id: newEntityId(),
    credit_person_id: input.credit_person_id,
    settled_on: input.settled_on.slice(0, 10),
    amount: Math.max(0, input.amount),
    logged_at: new Date().toISOString(),
  };
  return normalizeCreditsState({
    ...prev,
    settlements: [next, ...prev.settlements],
  });
}

export function updateCreditSettlementLocal(
  prev: CreditsState,
  settlementId: string,
  input: Omit<CreditSettlement, "id" | "logged_at">
): CreditsState {
  return normalizeCreditsState({
    ...prev,
    settlements: prev.settlements.map((s) =>
      s.id === settlementId
        ? {
            ...s,
            credit_person_id: input.credit_person_id,
            settled_on: input.settled_on.slice(0, 10),
            amount: Math.max(0, input.amount),
          }
        : s
    ),
  });
}

export function removeCreditSettlementLocal(
  prev: CreditsState,
  settlementId: string
): CreditsState {
  return normalizeCreditsState({
    ...prev,
    settlements: prev.settlements.filter((s) => s.id !== settlementId),
  });
}
