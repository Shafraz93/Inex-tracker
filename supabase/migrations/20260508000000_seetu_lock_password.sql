alter table public.seetu_pools
  add column if not exists lock_password text;
