import {
  monthLabelLong,
  monthStartForCycle,
  turnNumberForRow,
} from "@/lib/seetu/months";
import {
  allPayerIds,
  paymentMap,
  rowNamesJoined,
} from "@/lib/seetu/seetu-shared";
import type { SeetuCycleRow, SeetuPoolRow, SeetuRosterRow } from "@/lib/seetu/types";

export function isCycleFullyPaid(
  pool: SeetuPoolRow,
  cycle: SeetuCycleRow
): boolean {
  const ids = allPayerIds(pool);
  if (ids.length === 0) return false;
  const pm = paymentMap(cycle);
  return ids.every((id) => pm.get(id) === true);
}

/** YYYY-MM in local time (matches payout “calendar” month on this device). */
export function todayYearMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function addOneMonthYm(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoFirstDay(ym: string): string {
  return `${ym}-01`;
}

function cycleYearMonth(
  pool: SeetuPoolRow,
  cycle: SeetuCycleRow
): string | null {
  const iso =
    cycle.month_start ?? monthStartForCycle(pool, cycle.cycle_number);
  if (!iso) return null;
  return iso.slice(0, 7);
}

export function findCycleForYearMonth(
  pool: SeetuPoolRow,
  ym: string
): SeetuCycleRow | null {
  for (const c of pool.seetu_cycles) {
    const cYm = cycleYearMonth(pool, c);
    if (cYm === ym) return c;
  }
  return null;
}

function rosterRowById(
  pool: SeetuPoolRow,
  id: string | null
): SeetuRosterRow | null {
  if (!id) return null;
  return pool.seetu_roster_rows.find((r) => r.id === id) ?? null;
}

function receiverDisplay(
  pool: SeetuPoolRow,
  row: SeetuRosterRow | null
): string {
  if (!row) return "—";
  const names = rowNamesJoined(row).trim();
  if (names) return names;
  return `Turn #${turnNumberForRow(pool, row.id)}`;
}

/** Prefer a pool that actually has a cycle for this calendar month. */
function pickPoolForCalendarHome(pools: SeetuPoolRow[]): SeetuPoolRow | null {
  if (pools.length === 0) return null;
  const todayYm = todayYearMonth();
  const withThisMonth = pools.find((p) => findCycleForYearMonth(p, todayYm));
  if (withThisMonth) return withThisMonth;
  const withPending = pools.find((p) =>
    p.seetu_cycles.some((c) => !isCycleFullyPaid(p, c))
  );
  return withPending ?? pools[0];
}

type MonthTile = {
  label: string;
  receiver: string | null;
  turn: number | null;
  onSchedule: boolean;
  fullyPaid: boolean | null;
};

function buildMonthTile(pool: SeetuPoolRow, ym: string): MonthTile {
  const label = monthLabelLong(isoFirstDay(ym));
  const cycle = findCycleForYearMonth(pool, ym);
  if (!cycle) {
    return {
      label,
      receiver: null,
      turn: null,
      onSchedule: false,
      fullyPaid: null,
    };
  }
  const row = rosterRowById(pool, cycle.receiver_roster_row_id);
  return {
    label,
    receiver: receiverDisplay(pool, row),
    turn: cycle.cycle_number,
    onSchedule: true,
    fullyPaid: isCycleFullyPaid(pool, cycle),
  };
}

export type SeetuHomeCardModel =
  | { kind: "no_pools" }
  | {
      kind: "ready";
      pool: SeetuPoolRow;
      poolCount: number;
      noRoster: boolean;
      noCycles: boolean;
      thisMonthLabel: string | null;
      thisMonthReceiver: string | null;
      thisMonthTurn: number | null;
      thisMonthOnSchedule: boolean;
      thisMonthFullyPaid: boolean | null;
      nextMonthLabel: string | null;
      nextMonthReceiver: string | null;
      nextMonthTurn: number | null;
      nextMonthOnSchedule: boolean;
      nextMonthFullyPaid: boolean | null;
      scheduleAllPaid: boolean;
    };

export function buildSeetuHomeCardModel(
  pools: SeetuPoolRow[]
): SeetuHomeCardModel {
  if (pools.length === 0) return { kind: "no_pools" };
  const pool = pickPoolForCalendarHome(pools);
  if (!pool) return { kind: "no_pools" };

  const noRoster = pool.seetu_roster_rows.length === 0;
  const noCycles = pool.seetu_cycles.length === 0;

  const emptyCalendar = {
    thisMonthLabel: null,
    thisMonthReceiver: null,
    thisMonthTurn: null,
    thisMonthOnSchedule: false,
    thisMonthFullyPaid: null,
    nextMonthLabel: null,
    nextMonthReceiver: null,
    nextMonthTurn: null,
    nextMonthOnSchedule: false,
    nextMonthFullyPaid: null,
    scheduleAllPaid: false,
  };

  if (noRoster || noCycles) {
    return {
      kind: "ready",
      pool,
      poolCount: pools.length,
      noRoster,
      noCycles,
      ...emptyCalendar,
    };
  }

  const todayYm = todayYearMonth();
  const nextYm = addOneMonthYm(todayYm);
  const thisT = buildMonthTile(pool, todayYm);
  const nextT = buildMonthTile(pool, nextYm);

  const scheduleAllPaid = pool.seetu_cycles.every((c) =>
    isCycleFullyPaid(pool, c)
  );

  return {
    kind: "ready",
    pool,
    poolCount: pools.length,
    noRoster: false,
    noCycles: false,
    thisMonthLabel: thisT.label,
    thisMonthReceiver: thisT.receiver,
    thisMonthTurn: thisT.turn,
    thisMonthOnSchedule: thisT.onSchedule,
    thisMonthFullyPaid: thisT.fullyPaid,
    nextMonthLabel: nextT.label,
    nextMonthReceiver: nextT.receiver,
    nextMonthTurn: nextT.turn,
    nextMonthOnSchedule: nextT.onSchedule,
    nextMonthFullyPaid: nextT.fullyPaid,
    scheduleAllPaid,
  };
}
