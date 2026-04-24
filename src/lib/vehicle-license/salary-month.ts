export function dateToIsoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Salary month: 6th of one month through 5th of the next.
 */
export function currentSalaryMonthRangeIso(): { from: string; to: string } {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = today.getDate();

  if (day >= 6) {
    return {
      from: dateToIsoLocal(new Date(y, m, 6)),
      to: dateToIsoLocal(new Date(y, m + 1, 5)),
    };
  }

  return {
    from: dateToIsoLocal(new Date(y, m - 1, 6)),
    to: dateToIsoLocal(new Date(y, m, 5)),
  };
}

export function salaryMonthLabel(fromIso: string, toIso: string): string {
  return `${fromIso} to ${toIso}`;
}
