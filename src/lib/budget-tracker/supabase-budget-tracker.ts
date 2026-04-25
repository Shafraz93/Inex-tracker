import type { SupabaseClient } from "@supabase/supabase-js";

import {
  emptyBudgetTrackerState,
  normalizeBudgetTrackerState,
} from "@/lib/budget-tracker/local-storage";
import type { BudgetTrackerState } from "@/lib/budget-tracker/types";

function stateIsEmpty(state: BudgetTrackerState): boolean {
  return (
    state.categories.length === 0 &&
    state.income_entries.length === 0 &&
    state.expense_entries.length === 0 &&
    state.budget_entries.length === 0
  );
}

export async function fetchBudgetTrackerState(
  supabase: SupabaseClient,
  userId: string
): Promise<BudgetTrackerState> {
  const { data, error } = await supabase
    .from("budget_tracker_states")
    .select("state_json")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return emptyBudgetTrackerState();
  const row = data as { state_json?: unknown };
  return normalizeBudgetTrackerState(row.state_json ?? null);
}

export async function replaceBudgetTrackerState(
  supabase: SupabaseClient,
  userId: string,
  state: BudgetTrackerState
): Promise<BudgetTrackerState> {
  const normalized = normalizeBudgetTrackerState(state);

  if (stateIsEmpty(normalized)) {
    const { error: delErr } = await supabase
      .from("budget_tracker_states")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw new Error(delErr.message);
    return emptyBudgetTrackerState();
  }

  const { error: upErr } = await supabase.from("budget_tracker_states").upsert(
    {
      user_id: userId,
      state_json: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (upErr) throw new Error(upErr.message);

  return fetchBudgetTrackerState(supabase, userId);
}
