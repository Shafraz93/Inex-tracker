import type { SeetuPoolRow } from "@/lib/seetu/types";

/** Add calendar months to an ISO date (YYYY-MM-DD). */
export function addMonthsIso(iso: string, monthsToAdd: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  d.setMonth(d.getMonth() + monthsToAdd);
  return d.toISOString().slice(0, 10);
}

/** First day of the month for `<input type="month">` value `YYYY-MM`. */
export function firstDayFromMonthInput(yyyyMm: string): string {
  const t = yyyyMm.trim();
  if (!/^\d{4}-\d{2}$/.test(t)) return `${t}-01`.slice(0, 10);
  return `${t}-01`;
}

/** Month calendar date for cycle 1, 2, 3… from pool.start_month (day 1 of that month). */
export function monthStartForCycle(
  pool: Pick<SeetuPoolRow, "start_month">,
  cycleNumber: number
): string | null {
  if (!pool.start_month) return null;
  return addMonthsIso(pool.start_month, cycleNumber - 1);
}

export function monthLabelLong(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

/** Turn #1, #2… by roster order (sort_order). */
export function turnNumberForRow(pool: SeetuPoolRow, rowId: string): number {
  const ordered = [...pool.seetu_roster_rows].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const idx = ordered.findIndex((r) => r.id === rowId);
  return idx >= 0 ? idx + 1 : 0;
}
