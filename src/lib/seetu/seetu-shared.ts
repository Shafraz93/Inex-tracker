import type { SeetuCycleRow, SeetuPoolRow, SeetuRosterRow } from "@/lib/seetu/types";

export function paymentMap(cycle: SeetuCycleRow): Map<string, boolean> {
  const m = new Map<string, boolean>();
  for (const r of cycle.seetu_payments ?? []) {
    m.set(r.seetu_row_payer_id, r.paid);
  }
  return m;
}

export function rowNamesJoined(row: SeetuRosterRow): string {
  return row.seetu_row_payers.map((p) => p.name.trim()).join(" / ");
}

export function monthLabelShort(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", year: "numeric" });
}

export function allPayerIds(pool: SeetuPoolRow): string[] {
  return pool.seetu_roster_rows.flatMap((r) =>
    r.seetu_row_payers.map((p) => p.id)
  );
}

export function seedPaymentsForNewPayer(
  pool: SeetuPoolRow,
  payerId: string
): SeetuPoolRow {
  return {
    ...pool,
    seetu_cycles: pool.seetu_cycles.map((c) => ({
      ...c,
      seetu_payments: [
        ...c.seetu_payments,
        { seetu_row_payer_id: payerId, paid: false },
      ],
    })),
  };
}

export function stripPayerFromCycles(
  pool: SeetuPoolRow,
  payerId: string
): SeetuPoolRow {
  return {
    ...pool,
    seetu_cycles: pool.seetu_cycles.map((c) => ({
      ...c,
      seetu_payments: c.seetu_payments.filter(
        (x) => x.seetu_row_payer_id !== payerId
      ),
    })),
  };
}
