import type { SupabaseClient } from "@supabase/supabase-js";

import {
  emptyVehicleLicenseState,
  normalizeVehicleLicenseState,
} from "@/lib/vehicle-license/local-storage";
import type { VehicleLicenseState } from "@/lib/vehicle-license/types";

function stateIsEmpty(state: VehicleLicenseState): boolean {
  return (
    !state.details.bike_number &&
    !state.details.chassis_number &&
    !state.details.year_made &&
    !state.details.model &&
    !state.details.log_category_id &&
    state.service_logs.length === 0 &&
    state.upgrade_logs.length === 0 &&
    state.fuel_logs.length === 0
  );
}

export async function fetchVehicleLicenseState(
  supabase: SupabaseClient,
  userId: string
): Promise<VehicleLicenseState> {
  const { data, error } = await supabase
    .from("vehicle_license_states")
    .select("state_json")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return emptyVehicleLicenseState();

  const row = data as { state_json?: unknown };
  return normalizeVehicleLicenseState(row.state_json ?? null);
}

export async function replaceVehicleLicenseState(
  supabase: SupabaseClient,
  userId: string,
  state: VehicleLicenseState
): Promise<VehicleLicenseState> {
  const normalized = normalizeVehicleLicenseState(state);

  if (stateIsEmpty(normalized)) {
    const { error: delErr } = await supabase
      .from("vehicle_license_states")
      .delete()
      .eq("user_id", userId);
    if (delErr) throw new Error(delErr.message);
    return emptyVehicleLicenseState();
  }

  const { error: upErr } = await supabase.from("vehicle_license_states").upsert(
    {
      user_id: userId,
      state_json: normalized,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    }
  );

  if (upErr) throw new Error(upErr.message);
  return fetchVehicleLicenseState(supabase, userId);
}
