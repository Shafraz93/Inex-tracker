import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizePools } from "@/lib/seetu/local-storage";
import type { SeetuPoolRow } from "@/lib/seetu/types";

function isoDateOrNull(v: string | null | undefined): string | null {
  if (v == null || v === "") return null;
  return String(v).slice(0, 10);
}

function mapDbPoolToRow(raw: Record<string, unknown>): SeetuPoolRow {
  const roster = [...((raw.seetu_roster_rows as unknown[]) ?? [])] as Record<
    string,
    unknown
  >[];
  const cycles = [...((raw.seetu_cycles as unknown[]) ?? [])] as Record<
    string,
    unknown
  >[];

  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    start_month: isoDateOrNull(raw.start_month as string | null),
    contribution_per_slot: Number(raw.contribution_per_slot ?? 0),
    seetu_roster_rows: roster
      .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
      .map((r) => {
        const payers = [...((r.seetu_row_payers as unknown[]) ?? [])] as Record<
          string,
          unknown
        >[];
        return {
          id: String(r.id),
          sort_order: Number(r.sort_order ?? 0),
          seetu_row_payers: payers
            .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
            .map((p) => ({
              id: String(p.id),
              name: String(p.name ?? ""),
              sort_order: Number(p.sort_order ?? 0),
              contribution_amount:
                p.contribution_amount == null
                  ? null
                  : Number(p.contribution_amount),
            })),
        };
      }),
    seetu_cycles: cycles
      .sort((a, b) => Number(a.cycle_number) - Number(b.cycle_number))
      .map((c) => {
        const pays = [...((c.seetu_payments as unknown[]) ?? [])] as Record<
          string,
          unknown
        >[];
        return {
          id: String(c.id),
          cycle_number: Number(c.cycle_number ?? 0),
          month_start: isoDateOrNull(c.month_start as string | null),
          receiver_roster_row_id:
            c.receiver_roster_row_id == null
              ? null
              : String(c.receiver_roster_row_id),
          seetu_payments: pays.map((pay) => ({
            seetu_row_payer_id: String(pay.seetu_row_payer_id),
            paid: Boolean(pay.paid),
          })),
        };
      }),
  };
}

export async function fetchSeetuPools(
  supabase: SupabaseClient,
  userId: string
): Promise<SeetuPoolRow[]> {
  const { data, error } = await supabase
    .from("seetu_pools")
    .select(
      `
      id,
      title,
      start_month,
      contribution_per_slot,
      seetu_roster_rows (
        id,
        sort_order,
        seetu_row_payers (
          id,
          name,
          sort_order,
          contribution_amount
        )
      ),
      seetu_cycles (
        id,
        cycle_number,
        month_start,
        receiver_roster_row_id,
        seetu_payments (
          seetu_row_payer_id,
          paid
        )
      )
    `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return normalizePools(
    (data ?? []).map((row) => mapDbPoolToRow(row as Record<string, unknown>))
  );
}

/**
 * Replace all roster, payers, cycles, and payments for a pool to match `pool`.
 * Pool header is upserted. Caller must own the pool (RLS).
 */
export async function replacePoolSnapshot(
  supabase: SupabaseClient,
  userId: string,
  pool: SeetuPoolRow
): Promise<void> {
  const p = normalizePools([pool])[0];

  const { error: upErr } = await supabase.from("seetu_pools").upsert(
    {
      id: p.id,
      user_id: userId,
      title: p.title,
      start_month: p.start_month,
      contribution_per_slot: p.contribution_per_slot,
    },
    { onConflict: "id" }
  );
  if (upErr) throw new Error(upErr.message);

  const { error: delC } = await supabase
    .from("seetu_cycles")
    .delete()
    .eq("seetu_pool_id", p.id);
  if (delC) throw new Error(delC.message);

  const { error: delR } = await supabase
    .from("seetu_roster_rows")
    .delete()
    .eq("seetu_pool_id", p.id);
  if (delR) throw new Error(delR.message);

  if (p.seetu_roster_rows.length > 0) {
    const { error: insR } = await supabase.from("seetu_roster_rows").insert(
      p.seetu_roster_rows.map((r) => ({
        id: r.id,
        seetu_pool_id: p.id,
        sort_order: r.sort_order,
      }))
    );
    if (insR) throw new Error(insR.message);

    const payers = p.seetu_roster_rows.flatMap((r) =>
      r.seetu_row_payers.map((pay) => ({
        id: pay.id,
        seetu_roster_row_id: r.id,
        name: pay.name,
        sort_order: pay.sort_order,
        contribution_amount: pay.contribution_amount,
      }))
    );
    if (payers.length > 0) {
      const { error: insP } = await supabase.from("seetu_row_payers").insert(payers);
      if (insP) throw new Error(insP.message);
    }
  }

  if (p.seetu_cycles.length > 0) {
    const { error: insCy } = await supabase.from("seetu_cycles").insert(
      p.seetu_cycles.map((c) => ({
        id: c.id,
        seetu_pool_id: p.id,
        cycle_number: c.cycle_number,
        month_start: c.month_start,
        receiver_roster_row_id: c.receiver_roster_row_id,
      }))
    );
    if (insCy) throw new Error(insCy.message);

    const payments = p.seetu_cycles.flatMap((c) =>
      c.seetu_payments.map((pay) => ({
        seetu_cycle_id: c.id,
        seetu_row_payer_id: pay.seetu_row_payer_id,
        paid: pay.paid,
      }))
    );
    if (payments.length > 0) {
      const { error: insPay } = await supabase
        .from("seetu_payments")
        .insert(payments);
      if (insPay) throw new Error(insPay.message);
    }
  }
}
