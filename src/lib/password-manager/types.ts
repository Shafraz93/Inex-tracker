export type PasswordEntry = {
  id: string;
  title: string;
  url: string | null;
  username: string | null;
  password: string;
  category: string | null;
  notes: string | null;
  logged_at: string;
};

export type PasswordManagerState = {
  entries: PasswordEntry[];
};
