-- Budget tracker snapshot per user (categories, incomes, expenses, budgets).

create table public.budget_tracker_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index budget_tracker_states_user_idx
  on public.budget_tracker_states (user_id);

alter table public.budget_tracker_states enable row level security;

create policy "budget_tracker_states_select_own"
  on public.budget_tracker_states for select to authenticated
  using (auth.uid() = user_id);

create policy "budget_tracker_states_insert_own"
  on public.budget_tracker_states for insert to authenticated
  with check (auth.uid() = user_id);

create policy "budget_tracker_states_update_own"
  on public.budget_tracker_states for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "budget_tracker_states_delete_own"
  on public.budget_tracker_states for delete to authenticated
  using (auth.uid() = user_id);
