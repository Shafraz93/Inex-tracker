export type SeetuPaymentRow = {
  seetu_row_payer_id: string;
  paid: boolean;
};

export type SeetuCycleRow = {
  id: string;
  cycle_number: number;
  month_start: string | null;
  receiver_roster_row_id: string | null;
  seetu_payments: SeetuPaymentRow[];
};

export type SeetuPayerRow = {
  id: string;
  name: string;
  sort_order: number;
  contribution_amount: number | null;
};

export type SeetuRosterRow = {
  id: string;
  sort_order: number;
  seetu_row_payers: SeetuPayerRow[];
};

export type SeetuPoolRow = {
  id: string;
  title: string;
  /** First month of the seetu (YYYY-MM-DD, usually day 1). Cycle 1 = this month, cycle 2 = next month, etc. */
  start_month: string | null;
  contribution_per_slot: number;
  seetu_roster_rows: SeetuRosterRow[];
  seetu_cycles: SeetuCycleRow[];
};
