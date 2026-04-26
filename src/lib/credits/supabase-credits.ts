import type { SupabaseClient } from "@supabase/supabase-js";

import {
  emptyCreditsState,
  normalizeCreditsState,
} from "@/lib/credits/local-storage";
import type { CreditsState } from "@/lib/credits/types";

function stateIsEmpty(state: CreditsState): boolean {
  return (
    !state.global_expense_category_id &&
    state.persons.length === 0 &&
    state.settlements.length === 0
  );
}

export async function fetchCreditsState(
  supabase: SupabaseClient,
  userId: string
): Promise<CreditsState> {
  const { data, error } = await supabase
    .from("credits_states")
    .select("state_json")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return emptyCreditsState();
  const row = data as { state_json?: unknown };
  return normalizeCreditsState(row.state_json ?? null);
}

export async function replaceCreditsState(
  supabase: SupabaseClient,
  userId: string,
  state: CreditsState
): Promise<CreditsState> {
  const normalized = normalizeCreditsState(state);

  if (stateIsEmpty(normalized)) {
    const { error: delErr } = await supabase
      .from("credits_states")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw new Error(delErr.message);
    return emptyCreditsState();
  }

  const { error: upErr } = await supabase.from("credits_states").upsert(
    {
      user_id: userId,
      state_json: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (upErr) throw new Error(upErr.message);

  return fetchCreditsState(supabase, userId);
}
