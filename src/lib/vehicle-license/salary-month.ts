export function dateToIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Salary month: 6th of one month through 5th of the next.
 */
export function currentSalaryMonthRangeIso(startDay = 6): { from: string; to: string } {
  const s = Math.min(28, Math.max(1, Math.trunc(startDay)));
  const prevEnd = s === 1 ? 1 : s - 1;
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = today.getDate();

  if (day >= s) {
    return {
      from: dateToIsoLocal(new Date(y, m, s)),
      to: dateToIsoLocal(new Date(y, m + 1, prevEnd)),
    };
  }

  return {
    from: dateToIsoLocal(new Date(y, m - 1, s)),
    to: dateToIsoLocal(new Date(y, m, prevEnd)),
  };
}

export function salaryMonthLabel(fromIso: string, toIso: string): string {
  return `${fromIso} to ${toIso}`;
}

export function salaryMonthRangeForYm(ym: string, startDay: number): { from: string; to: string } {
  const s = Math.min(28, Math.max(1, Math.trunc(startDay)));
  const prevEnd = s === 1 ? 1 : s - 1;
  const [y, m] = ym.split("-").map(Number);
  return {
    from: `${ym}-${String(s).padStart(2, "0")}`,
    to: dateToIsoLocal(new Date(y, m, prevEnd)),
  };
}
