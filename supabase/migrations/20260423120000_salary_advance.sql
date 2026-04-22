-- Salary advance: borrowed amount + repayment log (per paycheck or ad-hoc).

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
