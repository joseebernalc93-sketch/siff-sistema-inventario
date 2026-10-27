alter table public.providers
  add column if not exists ruc text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists notes text;

create unique index if not exists providers_ruc_unique_idx
on public.providers (lower(btrim(ruc)))
where ruc is not null and btrim(ruc) <> '';
