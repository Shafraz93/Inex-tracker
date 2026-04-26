export type CreditPerson = {
  id: string;
  name: string;
  opening_balance: number;
  logged_at?: string;
};

export type CreditSettlement = {
  id: string;
  credit_person_id: string;
  settled_on: string;
  amount: number;
  logged_at?: string;
};

export type CreditsState = {
  global_expense_category_id: string | null;
  persons: CreditPerson[];
  settlements: CreditSettlement[];
};
