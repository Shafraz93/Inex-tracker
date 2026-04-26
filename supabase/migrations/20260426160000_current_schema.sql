-- Consolidated schema migration for current app structure.
-- Includes: Seetu, salary advance, vehicle logs snapshot, budget tracker snapshot, credits snapshot.

-- Drop legacy / previous objects to rebuild from a single migration.
drop table if exists public.credits_states cascade;
drop table if exists public.budget_tracker_states cascade;
drop table if exists public.vehicle_license_states cascade;
drop table if exists public.salary_advance_repayments cascade;
drop table if exists public.salary_advances cascade;
drop table if exists public.seetu_payments cascade;
drop table if exists public.seetu_cycles cascade;
drop table if exists public.seetu_row_payers cascade;
drop table if exists public.seetu_roster_rows cascade;
drop table if exists public.seetu_pools cascade;

drop table if exists public.chit_period_round_received cascade;
drop table if exists public.chit_period_participant_status cascade;
drop table if exists public.chit_periods cascade;
drop table if exists public.chit_participants cascade;
drop table if exists public.chit_rounds cascade;
drop table if exists public.chit_funds cascade;

-- Seetu
create table public.seetu_pools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  start_month date,
  contribution_per_slot numeric not null check (contribution_per_slot > 0),
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seetu_roster_rows (
  id uuid primary key default gen_random_uuid(),
  seetu_pool_id uuid not null references public.seetu_pools (id) on delete cascade,
  sort_order integer not null default 0
);

create index seetu_roster_rows_pool_idx on public.seetu_roster_rows (seetu_pool_id);

create table public.seetu_row_payers (
  id uuid primary key default gen_random_uuid(),
  seetu_roster_row_id uuid not null references public.seetu_roster_rows (id) on delete cascade,
  name text not null default '',
  sort_order integer not null default 0,
  contribution_amount numeric
);

create index seetu_row_payers_row_idx on public.seetu_row_payers (seetu_roster_row_id);

create table public.seetu_cycles (
  id uuid primary key default gen_random_uuid(),
  seetu_pool_id uuid not null references public.seetu_pools (id) on delete cascade,
  cycle_number integer not null check (cycle_number >= 1),
  month_start date,
  receiver_roster_row_id uuid references public.seetu_roster_rows (id) on delete set null,
  unique (seetu_pool_id, cycle_number)
);

create index seetu_cycles_pool_idx on public.seetu_cycles (seetu_pool_id);

create table public.seetu_payments (
  seetu_cycle_id uuid not null references public.seetu_cycles (id) on delete cascade,
  seetu_row_payer_id uuid not null references public.seetu_row_payers (id) on delete cascade,
  paid boolean not null default false,
  primary key (seetu_cycle_id, seetu_row_payer_id)
);

create index seetu_payments_payer_idx on public.seetu_payments (seetu_row_payer_id);

alter table public.seetu_pools enable row level security;
alter table public.seetu_roster_rows enable row level security;
alter table public.seetu_row_payers enable row level security;
alter table public.seetu_cycles enable row level security;
alter table public.seetu_payments enable row level security;

create policy "seetu_pools_select_own"
  on public.seetu_pools for select to authenticated
  using (auth.uid() = user_id);

create policy "seetu_pools_insert_own"
  on public.seetu_pools for insert to authenticated
  with check (auth.uid() = user_id);

create policy "seetu_pools_update_own"
  on public.seetu_pools for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "seetu_pools_delete_own"
  on public.seetu_pools for delete to authenticated
  using (auth.uid() = user_id);

create policy "seetu_roster_rows_all_own_pool"
  on public.seetu_roster_rows for all to authenticated
  using (
    exists (
      select 1 from public.seetu_pools p
      where p.id = seetu_pool_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.seetu_pools p
      where p.id = seetu_pool_id and p.user_id = auth.uid()
    )
  );

create policy "seetu_row_payers_all_own_pool"
  on public.seetu_row_payers for all to authenticated
  using (
    exists (
      select 1 from public.seetu_roster_rows r
      join public.seetu_pools p on p.id = r.seetu_pool_id
      where r.id = seetu_roster_row_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.seetu_roster_rows r
      join public.seetu_pools p on p.id = r.seetu_pool_id
      where r.id = seetu_roster_row_id and p.user_id = auth.uid()
    )
  );

create policy "seetu_cycles_all_own_pool"
  on public.seetu_cycles for all to authenticated
  using (
    exists (
      select 1 from public.seetu_pools p
      where p.id = seetu_pool_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.seetu_pools p
      where p.id = seetu_pool_id and p.user_id = auth.uid()
    )
  );

create policy "seetu_payments_all_own_pool"
  on public.seetu_payments for all to authenticated
  using (
    exists (
      select 1 from public.seetu_cycles c
      join public.seetu_pools p on p.id = c.seetu_pool_id
      where c.id = seetu_cycle_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.seetu_cycles c
      join public.seetu_pools p on p.id = c.seetu_pool_id
      where c.id = seetu_cycle_id and p.user_id = auth.uid()
    )
  );

-- Salary advance
create table public.salary_advances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Salary advance',
  principal_amount numeric(14, 2) not null check (principal_amount > 0),
  start_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index salary_advances_user_idx on public.salary_advances (user_id);

create table public.salary_advance_repayments (
  id uuid primary key default gen_random_uuid(),
  salary_advance_id uuid not null references public.salary_advances (id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  paid_on date not null default (current_date),
  note text,
  created_at timestamptz not null default now()
);

create index salary_advance_repayments_advance_idx
  on public.salary_advance_repayments (salary_advance_id);

alter table public.salary_advances enable row level security;
alter table public.salary_advance_repayments enable row level security;

create policy "salary_advances_select_own"
  on public.salary_advances for select to authenticated
  using (auth.uid() = user_id);

create policy "salary_advances_insert_own"
  on public.salary_advances for insert to authenticated
  with check (auth.uid() = user_id);

create policy "salary_advances_update_own"
  on public.salary_advances for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "salary_advances_delete_own"
  on public.salary_advances for delete to authenticated
  using (auth.uid() = user_id);

create policy "salary_advance_repayments_all_own_advance"
  on public.salary_advance_repayments for all to authenticated
  using (
    exists (
      select 1 from public.salary_advances a
      where a.id = salary_advance_id and a.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.salary_advances a
      where a.id = salary_advance_id and a.user_id = auth.uid()
    )
  );

-- Vehicle log snapshot
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

-- Budget tracker snapshot
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

-- Credits snapshot
create table public.credits_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  state_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index credits_states_user_idx on public.credits_states (user_id);

alter table public.credits_states enable row level security;

create policy "credits_states_select_own"
  on public.credits_states for select to authenticated
  using (auth.uid() = user_id);

create policy "credits_states_insert_own"
  on public.credits_states for insert to authenticated
  with check (auth.uid() = user_id);

create policy "credits_states_update_own"
  on public.credits_states for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "credits_states_delete_own"
  on public.credits_states for delete to authenticated
  using (auth.uid() = user_id);
