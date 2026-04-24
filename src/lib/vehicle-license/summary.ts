import type { VehicleLicenseState } from "./types";

export type UpgradeExpenseRow = {
  id: string;
  date: string;
  title: string;
  amount: number;
  source: "upgrade" | "service";
};

function inRange(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

export function getUpgradeRows(state: VehicleLicenseState): UpgradeExpenseRow[] {
  const fromService = state.service_logs
    .filter((row) => row.parts_fee > 0)
    .map((row) => ({
      id: `service:${row.id}`,
      date: row.service_date,
      title: row.parts_title || "Parts changed during service",
      amount: row.parts_fee,
      source: "service" as const,
    }));

  const direct = state.upgrade_logs.map((row) => ({
    id: `upgrade:${row.id}`,
    date: row.upgrade_date,
    title: row.title || "Upgrade / parts change",
    amount: row.fee,
    source: "upgrade" as const,
  }));

  return [...direct, ...fromService].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return b.id.localeCompare(a.id);
  });
}

export function getSalaryMonthBikeSpendBreakdown(
  state: VehicleLicenseState,
  range: { from: string; to: string }
): {
  service: number;
  upgrade: number;
  fuel: number;
  total: number;
} {
  const service = state.service_logs.reduce((sum, row) => {
    if (!inRange(row.service_date, range.from, range.to)) return sum;
    return sum + Math.max(0, row.service_charge);
  }, 0);

  const upgrade = getUpgradeRows(state).reduce((sum, row) => {
    if (!inRange(row.date, range.from, range.to)) return sum;
    return sum + Math.max(0, row.amount);
  }, 0);

  const fuel = state.fuel_logs.reduce((sum, row) => {
    if (!inRange(row.filled_on, range.from, range.to)) return sum;
    return sum + Math.max(0, row.amount);
  }, 0);

  return {
    service,
    upgrade,
    fuel,
    total: service + upgrade + fuel,
  };
}
