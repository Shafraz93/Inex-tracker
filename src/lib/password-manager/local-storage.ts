import type { PasswordEntry, PasswordManagerState } from "./types";

export const PM_LOCAL_STORAGE_KEY = "inex-tracker.password-manager.v1";

export function emptyPmState(): PasswordManagerState {
  return { entries: [] };
}

export function newPmId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  );
}

function normalizeEntry(raw: Record<string, unknown>): PasswordEntry {
  return {
    id: String(raw.id ?? newPmId()),
    title: String(raw.title ?? ""),
    url: raw.url != null ? String(raw.url) : null,
    username: raw.username != null ? String(raw.username) : null,
    password: String(raw.password ?? ""),
    category: raw.category != null ? String(raw.category) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    logged_at: String(raw.logged_at ?? new Date().toISOString()),
  };
}

export function normalizePmState(data: unknown): PasswordManagerState {
  if (!data || typeof data !== "object") return emptyPmState();
  const raw = data as Record<string, unknown>;
  const entries = Array.isArray(raw.entries)
    ? (raw.entries as Record<string, unknown>[]).map(normalizeEntry)
    : [];
  return { entries };
}

export function readPmStateFromLocal(): PasswordManagerState {
  if (typeof window === "undefined") return emptyPmState();
  try {
    const raw = window.localStorage.getItem(PM_LOCAL_STORAGE_KEY);
    if (!raw) return emptyPmState();
    return normalizePmState(JSON.parse(raw));
  } catch {
    return emptyPmState();
  }
}

export function writePmStateToLocal(state: PasswordManagerState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PM_LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    throw new Error("Could not save password manager to browser storage.");
  }
}
