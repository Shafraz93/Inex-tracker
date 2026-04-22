-- Seetu (rotating savings): pools → roster rows → payers; cycles + per-payer payments.
-- Replaces legacy chit_fund_* and earlier seetu_* objects.

-- Legacy chit fund
drop table if exists public.chit_period_round_received cascade;
drop table if exists public.chit_period_participant_status cascade;
drop table if exists public.chit_periods cascade;
drop table if exists public.chit_participants cascade;
drop table if exists public.chit_rounds cascade;
drop table if exists public.chit_funds cascade;

-- Seetu (any prior version)
drop table if exists public.seetu_payments cascade;
drop table if exists public.seetu_cycles cascade;
drop table if exists public.seetu_row_payers cascade;
drop table if exists public.seetu_roster_rows cascade;
drop table if exists public.seetu_members cascade;
drop table if exists public.seetu_pools cascade;

-- --- New schema ---

create table public.seetu_pools (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  start_month date,
  contribution_per_slot numeric not null check (contribution_per_slot > 0),
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

comment on column public.seetu_row_payers.contribution_amount is
  'Fixed share; null = equal split of the pool slot among payers in this row.';

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
