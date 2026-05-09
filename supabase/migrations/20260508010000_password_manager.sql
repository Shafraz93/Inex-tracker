create table public.password_manager_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state_json jsonb not null default '{"entries":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.password_manager_states enable row level security;

create policy "pm_select_own"
  on public.password_manager_states for select to authenticated
  using (auth.uid() = user_id);

create policy "pm_insert_own"
  on public.password_manager_states for insert to authenticated
  with check (auth.uid() = user_id);

create policy "pm_update_own"
  on public.password_manager_states for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "pm_delete_own"
  on public.password_manager_states for delete to authenticated
  using (auth.uid() = user_id);
