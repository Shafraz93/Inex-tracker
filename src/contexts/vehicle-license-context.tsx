"use client";

import * as React from "react";

import {
  emptyVehicleLicenseState,
  readVehicleLicenseStateFromLocal,
  VEHICLE_LICENSE_LOCAL_STORAGE_KEY,
  writeVehicleLicenseStateToLocal,
} from "@/lib/vehicle-license/local-storage";
import {
  fetchVehicleLicenseState,
  replaceVehicleLicenseState,
} from "@/lib/vehicle-license/supabase-vehicle-license";
import { createClient } from "@/lib/supabase/client";
import type { VehicleLicenseState } from "@/lib/vehicle-license/types";

type VehicleLicenseContextValue = {
  state: VehicleLicenseState;
  setState: React.Dispatch<React.SetStateAction<VehicleLicenseState>>;
  hydrated: boolean;
};

const VehicleLicenseContext =
  React.createContext<VehicleLicenseContextValue | null>(null);

function stateMeaningful(s: VehicleLicenseState): boolean {
  return (
    !!s.details.bike_number ||
    !!s.details.chassis_number ||
    !!s.details.year_made ||
    !!s.details.model ||
    !!s.details.log_category_id ||
    s.service_logs.length > 0 ||
    s.upgrade_logs.length > 0 ||
    s.fuel_logs.length > 0
  );
}

export function VehicleLicenseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = React.useMemo(() => createClient(), []);
  const lastSyncedRef = React.useRef<string>("");

  const [userId, setUserId] = React.useState<string | null>(null);
  const [state, setState] = React.useState<VehicleLicenseState>(
    emptyVehicleLicenseState
  );
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      let user: { id: string } | null = null;
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw new Error(error.message);
        user = data.user;
      } catch (e) {
        const local = readVehicleLicenseStateFromLocal();
        if (cancelled) return;
        setUserId(null);
        setState(local);
        lastSyncedRef.current = JSON.stringify(local);
        setHydrated(true);
        console.error("Could not read auth user for vehicle logs.", e);
        return;
      }
      if (cancelled) return;

      if (!user) {
        const next = readVehicleLicenseStateFromLocal();
        setUserId(null);
        setState(next);
        lastSyncedRef.current = JSON.stringify(next);
        setHydrated(true);
        return;
      }

      setUserId(user.id);

      try {
        let next = await fetchVehicleLicenseState(supabase, user.id);
        if (!stateMeaningful(next)) {
          const local = readVehicleLicenseStateFromLocal();
          if (stateMeaningful(local)) {
            next = await replaceVehicleLicenseState(supabase, user.id, local);
            try {
              localStorage.removeItem(VEHICLE_LICENSE_LOCAL_STORAGE_KEY);
            } catch {
              /* ignore */
            }
          }
        }

        if (cancelled) return;
        setState(next);
        lastSyncedRef.current = JSON.stringify(next);
        setHydrated(true);
      } catch (e) {
        const local = readVehicleLicenseStateFromLocal();
        if (cancelled) return;
        setState(local);
        lastSyncedRef.current = JSON.stringify(local);
        setHydrated(true);
        console.error("Could not load vehicle logs from cloud.", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      writeVehicleLicenseStateToLocal(state);
    } catch (e) {
      console.error("Could not save vehicle logs.", e);
    }
  }, [state, hydrated]);

  React.useEffect(() => {
    if (!hydrated || !userId) return;

    const snapshot = JSON.stringify(state);
    if (snapshot === lastSyncedRef.current) return;

    const timer = window.setTimeout(async () => {
      try {
        const fresh = await replaceVehicleLicenseState(supabase, userId, state);
        lastSyncedRef.current = JSON.stringify(fresh);
        setState(fresh);
      } catch (e) {
        console.error("Could not save vehicle logs to cloud.", e);
      }
    }, 500);

    return () => window.clearTimeout(timer);
  }, [state, hydrated, userId, supabase]);

  const fetchLatestFromCloud = React.useCallback(async () => {
    if (!userId) return;
    try {
      const fresh = await fetchVehicleLicenseState(supabase, userId);
      lastSyncedRef.current = JSON.stringify(fresh);
      setState(fresh);
    } catch (e) {
      console.error("Could not sync vehicle logs from cloud.", e);
    }
  }, [supabase, userId]);

  React.useEffect(() => {
    function onSync() {
      void fetchLatestFromCloud();
    }
    window.addEventListener("inex-tracker:sync-request", onSync);
    return () => window.removeEventListener("inex-tracker:sync-request", onSync);
  }, [fetchLatestFromCloud]);

  const value = React.useMemo(() => ({ state, setState, hydrated }), [state, hydrated]);

  return (
    <VehicleLicenseContext.Provider value={value}>
      {children}
    </VehicleLicenseContext.Provider>
  );
}

export function useVehicleLicense(): VehicleLicenseContextValue {
  const ctx = React.useContext(VehicleLicenseContext);
  if (!ctx) {
    throw new Error("useVehicleLicense must be used within VehicleLicenseProvider");
  }
  return ctx;
}
