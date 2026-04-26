import type { SupabaseClient } from "@supabase/supabase-js";

import {
  defaultAppSettings,
  normalizeAppSettings,
  type AppSettingsState,
} from "@/lib/app-settings/local-storage";

export async function fetchAppSettingsState(
  supabase: SupabaseClient,
  userId: string
): Promise<AppSettingsState> {
  const { data, error } = await supabase
    .from("app_settings_states")
    .select("state_json")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return defaultAppSettings();
  const row = data as { state_json?: unknown };
  return normalizeAppSettings(row.state_json ?? null);
}

export async function replaceAppSettingsState(
  supabase: SupabaseClient,
  userId: string,
  settings: AppSettingsState
): Promise<AppSettingsState> {
  const normalized = normalizeAppSettings(settings);

  const { error: upErr } = await supabase.from("app_settings_states").upsert(
    {
      user_id: userId,
      state_json: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upErr) throw new Error(upErr.message);
  return fetchAppSettingsState(supabase, userId);
}
