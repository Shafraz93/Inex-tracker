import type { SalaryAdvanceRow, SalaryAdvanceRepaymentRow } from "./types";

export function totalRepaidFromList(
  repayments: Pick<SalaryAdvanceRepaymentRow, "amount">[]
): number {
  return repayments.reduce((s, r) => s + r.amount, 0);
}

export function remainingFromStarting(
  startingBalance: number,
  repayments: Pick<SalaryAdvanceRepaymentRow, "amount">[]
): number {
  return Math.max(0, startingBalance - totalRepaidFromList(repayments));
}

/** @deprecated Use totalRepaidFromList with advance.salary_advance_repayments */
export function totalRepaid(advance: SalaryAdvanceRow): number {
  return totalRepaidFromList(advance.salary_advance_repayments);
}

/** @deprecated Use remainingFromStarting */
export function remainingBalance(advance: SalaryAdvanceRow): number {
  return remainingFromStarting(
    advance.principal_amount,
    advance.salary_advance_repayments
  );
}
