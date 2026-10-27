create extension if not exists pgcrypto;

create table if not exists public.mobile_clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  identity_number text not null unique,
  email text not null unique,
  phone text not null,
  address text not null,
  password_hash text not null,
  status text not null default 'active'
    check (status in ('active', 'blocked', 'pending_review')),
  source text not null default 'android',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mobile_clients
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists password_hash text,
  add column if not exists status text not null default 'active',
  add column if not exists source text not null default 'android',
  add column if not exists last_login_at timestamptz,
  add column if not exists updated_at timestamptz;

create unique index if not exists mobile_clients_identity_number_key
on public.mobile_clients (identity_number);

create unique index if not exists mobile_clients_email_key
on public.mobile_clients (email);

create unique index if not exists mobile_clients_full_name_key
on public.mobile_clients (lower(btrim(full_name)));

create table if not exists public.mobile_password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.mobile_clients(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mobile_password_reset_requests_client_idx
on public.mobile_password_reset_requests (client_id, used_at, expires_at);

alter table public.mobile_password_reset_requests enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mobile_clients_set_updated_at on public.mobile_clients;
create trigger mobile_clients_set_updated_at
before update on public.mobile_clients
for each row execute function public.set_updated_at();

alter table public.mobile_clients enable row level security;

drop policy if exists "mobile clients admin read" on public.mobile_clients;
create policy "mobile clients admin read"
on public.mobile_clients for select
to authenticated
using (public.is_admin());

drop policy if exists "mobile clients admin manage" on public.mobile_clients;
create policy "mobile clients admin manage"
on public.mobile_clients for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
