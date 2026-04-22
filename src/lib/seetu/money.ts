import { formatMoney } from "@/lib/currency";
import type {
  SeetuCycleRow,
  SeetuPoolRow,
  SeetuPayerRow,
  SeetuRosterRow,
} from "@/lib/seetu/types";

export { formatMoney } from "@/lib/currency";

/** Per-payer amounts for one roster row; null share = equal split of remainder after fixed amounts. */
export function rowShareBreakdown(
  row: SeetuRosterRow,
  pool: SeetuPoolRow
): Map<string, number> {
  const slot = Number(pool.contribution_per_slot);
  const payers = row.seetu_row_payers;
  const m = new Map<string, number>();
  if (payers.length === 0 || !Number.isFinite(slot)) return m;

  let explicit = 0;
  const flexible: SeetuPayerRow[] = [];
  for (const p of payers) {
    const a = p.contribution_amount;
    if (a != null && Number.isFinite(Number(a))) {
      const v = Number(a);
      explicit += v;
      m.set(p.id, v);
    } else {
      flexible.push(p);
    }
  }

  const each = flexible.length > 0 ? (slot - explicit) / flexible.length : 0;
  for (const p of flexible) {
    m.set(p.id, each);
  }
  return m;
}

export function effectivePayerShare(
  payer: SeetuPayerRow,
  row: SeetuRosterRow,
  pool: SeetuPoolRow
): number {
  return rowShareBreakdown(row, pool).get(payer.id) ?? 0;
}

export function rowTotal(row: SeetuRosterRow, pool: SeetuPoolRow): number {
  let s = 0;
  for (const v of rowShareBreakdown(row, pool).values()) s += v;
  return s;
}

/** Sum of row totals — full pot when every row pays its slot. */
export function poolPayoutPerCycle(pool: SeetuPoolRow): number {
  return pool.seetu_roster_rows.reduce(
    (sum, r) => sum + rowTotal(r, pool),
    0
  );
}

/** Sum of shares for payers marked paid on this cycle (checked boxes). */
export function paidAmountCollectedForCycle(
  pool: SeetuPoolRow,
  cycle: SeetuCycleRow
): number {
  const paidIds = new Set(
    (cycle.seetu_payments ?? [])
      .filter((x) => x.paid)
      .map((x) => x.seetu_row_payer_id)
  );
  let sum = 0;
  for (const row of pool.seetu_roster_rows) {
    const breakdown = rowShareBreakdown(row, pool);
    for (const p of row.seetu_row_payers) {
      if (paidIds.has(p.id)) sum += breakdown.get(p.id) ?? 0;
    }
  }
  return sum;
}

/** Per-payer shares for a row, each formatted as LKR (e.g. Rs 10,000 + Rs 5,000). */
export function formatRowAmountParts(row: SeetuRosterRow, pool: SeetuPoolRow): string {
  const payers = [...row.seetu_row_payers].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  if (payers.length === 0) return "—";
  return payers
    .map((p) => formatMoney(Math.round(effectivePayerShare(p, row, pool))))
    .join(" + ");
}
