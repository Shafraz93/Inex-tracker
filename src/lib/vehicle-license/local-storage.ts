import { newEntityId } from "@/lib/seetu/local-storage";

import type {
  BikeDetails,
  BikeFuelLog,
  BikeServiceLog,
  BikeUpgradeLog,
  VehicleLicenseState,
} from "./types";

export const VEHICLE_LICENSE_LOCAL_STORAGE_KEY =
  "inex-tracker.vehicle-license.v1";

function emptyDetails(): BikeDetails {
  return {
    bike_number: "",
    chassis_number: "",
    year_made: "",
    model: "",
  };
}

export function emptyVehicleLicenseState(): VehicleLicenseState {
  return {
    details: emptyDetails(),
    service_logs: [],
    upgrade_logs: [],
    fuel_logs: [],
  };
}

function normalizeServiceLog(raw: Record<string, unknown>): BikeServiceLog {
  return {
    id: String(raw.id ?? ""),
    service_date: String(raw.service_date ?? "").slice(0, 10),
    service_charge: Number(raw.service_charge ?? 0),
    parts_title: String(raw.parts_title ?? "").trim(),
    part_price: Math.max(
      0,
      Number(raw.part_price ?? raw.parts_fee ?? 0)
    ),
    part_assemble_fee: Math.max(0, Number(raw.part_assemble_fee ?? 0)),
    logged_at: raw.logged_at == null ? undefined : String(raw.logged_at),
  };
}

function normalizeUpgradeLog(raw: Record<string, unknown>): BikeUpgradeLog {
  return {
    id: String(raw.id ?? ""),
    upgrade_date: String(raw.upgrade_date ?? "").slice(0, 10),
    title: String(raw.title ?? "").trim(),
    part_price: Math.max(0, Number(raw.part_price ?? raw.fee ?? 0)),
    part_assemble_fee: Math.max(0, Number(raw.part_assemble_fee ?? 0)),
    logged_at: raw.logged_at == null ? undefined : String(raw.logged_at),
  };
}

function normalizeFuelLog(raw: Record<string, unknown>): BikeFuelLog {
  return {
    id: String(raw.id ?? ""),
    filled_on: String(raw.filled_on ?? "").slice(0, 10),
    liters: Math.max(0, Number(raw.liters ?? 0)),
    amount: Math.max(0, Number(raw.amount ?? 0)),
    logged_at: raw.logged_at == null ? undefined : String(raw.logged_at),
  };
}

function normalizeServiceLogs(list: unknown): BikeServiceLog[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((row) => normalizeServiceLog(row as Record<string, unknown>))
    .filter((row) => row.id && row.service_date)
    .sort((a, b) => {
      const d = b.service_date.localeCompare(a.service_date);
      if (d !== 0) return d;
      return (b.logged_at ?? "").localeCompare(a.logged_at ?? "");
    });
}

function normalizeUpgradeLogs(list: unknown): BikeUpgradeLog[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((row) => normalizeUpgradeLog(row as Record<string, unknown>))
    .filter((row) => row.id && row.upgrade_date)
    .sort((a, b) => {
      const d = b.upgrade_date.localeCompare(a.upgrade_date);
      if (d !== 0) return d;
      return (b.logged_at ?? "").localeCompare(a.logged_at ?? "");
    });
}

function normalizeFuelLogs(list: unknown): BikeFuelLog[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((row) => normalizeFuelLog(row as Record<string, unknown>))
    .filter((row) => row.id && row.filled_on)
    .sort((a, b) => {
      const d = b.filled_on.localeCompare(a.filled_on);
      if (d !== 0) return d;
      return (b.logged_at ?? "").localeCompare(a.logged_at ?? "");
    });
}

export function normalizeVehicleLicenseState(data: unknown): VehicleLicenseState {
  if (!data || typeof data !== "object") return emptyVehicleLicenseState();
  const raw = data as Record<string, unknown>;
  const rawDetails = (raw.details ?? {}) as Record<string, unknown>;

  return {
    details: {
      bike_number: String(rawDetails.bike_number ?? "").trim(),
      chassis_number: String(rawDetails.chassis_number ?? "").trim(),
      year_made: String(rawDetails.year_made ?? "").trim(),
      model: String(rawDetails.model ?? "").trim(),
    },
    service_logs: normalizeServiceLogs(raw.service_logs),
    upgrade_logs: normalizeUpgradeLogs(raw.upgrade_logs),
    fuel_logs: normalizeFuelLogs(raw.fuel_logs),
  };
}

export function readVehicleLicenseStateFromLocal(): VehicleLicenseState {
  if (typeof window === "undefined") return emptyVehicleLicenseState();
  try {
    const raw = window.localStorage.getItem(VEHICLE_LICENSE_LOCAL_STORAGE_KEY);
    if (!raw) return emptyVehicleLicenseState();
    return normalizeVehicleLicenseState(JSON.parse(raw));
  } catch {
    return emptyVehicleLicenseState();
  }
}

export function writeVehicleLicenseStateToLocal(
  state: VehicleLicenseState
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      VEHICLE_LICENSE_LOCAL_STORAGE_KEY,
      JSON.stringify(normalizeVehicleLicenseState(state))
    );
  } catch {
    throw new Error("Could not save vehicle logs to this browser.");
  }
}

export function addServiceLogLocal(
  prev: VehicleLicenseState,
  input: Omit<BikeServiceLog, "id" | "logged_at">
): VehicleLicenseState {
  const next: BikeServiceLog = {
    id: newEntityId(),
    service_date: input.service_date.slice(0, 10),
    service_charge: Math.max(0, input.service_charge),
    parts_title: input.parts_title.trim(),
    part_price: Math.max(0, input.part_price),
    part_assemble_fee: Math.max(0, input.part_assemble_fee),
    logged_at: new Date().toISOString(),
  };
  return normalizeVehicleLicenseState({
    ...prev,
    service_logs: [next, ...prev.service_logs],
  });
}

export function addUpgradeLogLocal(
  prev: VehicleLicenseState,
  input: Omit<BikeUpgradeLog, "id" | "logged_at">
): VehicleLicenseState {
  const next: BikeUpgradeLog = {
    id: newEntityId(),
    upgrade_date: input.upgrade_date.slice(0, 10),
    title: input.title.trim(),
    part_price: Math.max(0, input.part_price),
    part_assemble_fee: Math.max(0, input.part_assemble_fee),
    logged_at: new Date().toISOString(),
  };
  return normalizeVehicleLicenseState({
    ...prev,
    upgrade_logs: [next, ...prev.upgrade_logs],
  });
}

export function addFuelLogLocal(
  prev: VehicleLicenseState,
  input: Omit<BikeFuelLog, "id" | "logged_at">
): VehicleLicenseState {
  const next: BikeFuelLog = {
    id: newEntityId(),
    filled_on: input.filled_on.slice(0, 10),
    liters: Math.max(0, input.liters),
    amount: Math.max(0, input.amount),
    logged_at: new Date().toISOString(),
  };
  return normalizeVehicleLicenseState({
    ...prev,
    fuel_logs: [next, ...prev.fuel_logs],
  });
}

export function removeServiceLogLocal(
  prev: VehicleLicenseState,
  logId: string
): VehicleLicenseState {
  return normalizeVehicleLicenseState({
    ...prev,
    service_logs: prev.service_logs.filter((log) => log.id !== logId),
  });
}

export function removeUpgradeLogLocal(
  prev: VehicleLicenseState,
  logId: string
): VehicleLicenseState {
  return normalizeVehicleLicenseState({
    ...prev,
    upgrade_logs: prev.upgrade_logs.filter((log) => log.id !== logId),
  });
}

export function removeFuelLogLocal(
  prev: VehicleLicenseState,
  logId: string
): VehicleLicenseState {
  return normalizeVehicleLicenseState({
    ...prev,
    fuel_logs: prev.fuel_logs.filter((log) => log.id !== logId),
  });
}
