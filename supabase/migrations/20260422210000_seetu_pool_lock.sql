-- Optional read-only mode when a pool is finished (no roster/payout edits).

alter table public.seetu_pools
  add column if not exists is_locked boolean not null default false;

comment on column public.seetu_pools.is_locked is
  'When true, clients should not allow editing roster, settings, or payment rows.';
