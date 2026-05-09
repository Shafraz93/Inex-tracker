import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizePmState } from "./local-storage";
import type { PasswordManagerState } from "./types";

export async function fetchPmState(
  supabase: SupabaseClient,
  userId: string
): Promise<PasswordManagerState> {
  const { data, error } = await supabase
    .from("password_manager_states")
    .select("state_json")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return normalizePmState({});
  return normalizePmState(data.state_json);
}

export async function replacePmState(
  supabase: SupabaseClient,
  userId: string,
  state: PasswordManagerState
): Promise<PasswordManagerState> {
  const { error } = await supabase
    .from("password_manager_states")
    .upsert(
      { user_id: userId, state_json: state, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) throw new Error(error.message);
  return state;
}
