"use client";

import * as React from "react";

import {
  emptyVehicleLicenseState,
  readVehicleLicenseStateFromLocal,
  writeVehicleLicenseStateToLocal,
} from "@/lib/vehicle-license/local-storage";
import type { VehicleLicenseState } from "@/lib/vehicle-license/types";

type VehicleLicenseContextValue = {
  state: VehicleLicenseState;
  setState: React.Dispatch<React.SetStateAction<VehicleLicenseState>>;
  hydrated: boolean;
};

const VehicleLicenseContext =
  React.createContext<VehicleLicenseContextValue | null>(null);

export function VehicleLicenseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<VehicleLicenseState>(
    emptyVehicleLicenseState
  );
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = readVehicleLicenseStateFromLocal();
      if (cancelled) return;
      setState(next);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      writeVehicleLicenseStateToLocal(state);
    } catch (e) {
      console.error("Could not save vehicle logs.", e);
    }
  }, [state, hydrated]);

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
