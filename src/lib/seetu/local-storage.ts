import type { SeetuPoolRow } from "@/lib/seetu/types";

export const SEETU_LOCAL_STORAGE_KEY = "inex-tracker.seetu.v1";

export function newEntityId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
  );
}

export function normalizePools(data: unknown): SeetuPoolRow[] {
  if (!Array.isArray(data)) return [];
  const rows = data as SeetuPoolRow[];
  return rows.map((row) => ({
    ...row,
    start_month: row.start_month ?? null,
    contribution_per_slot: Number(row.contribution_per_slot ?? 20000),
    seetu_roster_rows: [...(row.seetu_roster_rows ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((r) => ({
        ...r,
        seetu_row_payers: [...(r.seetu_row_payers ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((p) => ({
            ...p,
            contribution_amount:
              p.contribution_amount != null
                ? Number(p.contribution_amount)
                : null,
          })),
      })),
    seetu_cycles: [...(row.seetu_cycles ?? [])].sort(
      (a, b) => a.cycle_number - b.cycle_number
    ),
  }));
}

export function readSeetuPoolsFromLocal(): SeetuPoolRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SEETU_LOCAL_STORAGE_KEY);
    if (!raw) return [];
    return normalizePools(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeSeetuPoolsToLocal(pools: SeetuPoolRow[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEETU_LOCAL_STORAGE_KEY, JSON.stringify(pools));
  } catch {
    throw new Error("Could not save to browser storage (quota or blocked).");
  }
}
