-- Vehicle logs snapshot per user (bike details + service/upgrade/fuel logs as JSON).

create table public.vehicle_license_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index vehicle_license_states_user_idx
  on public.vehicle_license_states (user_id);

alter table public.vehicle_license_states enable row level security;

create policy "vehicle_license_states_select_own"
  on public.vehicle_license_states for select to authenticated
  using (auth.uid() = user_id);

create policy "vehicle_license_states_insert_own"
  on public.vehicle_license_states for insert to authenticated
  with check (auth.uid() = user_id);

create policy "vehicle_license_states_update_own"
  on public.vehicle_license_states for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vehicle_license_states_delete_own"
  on public.vehicle_license_states for delete to authenticated
  using (auth.uid() = user_id);
