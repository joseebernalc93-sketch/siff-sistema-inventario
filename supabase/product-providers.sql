create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ruc text,
  address text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.providers
  add column if not exists ruc text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists notes text;

create unique index if not exists providers_name_unique_idx
on public.providers (lower(btrim(name)));

create unique index if not exists providers_ruc_unique_idx
on public.providers (lower(btrim(ruc)))
where ruc is not null and btrim(ruc) <> '';

create table if not exists public.product_providers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  is_primary boolean not null default false,
  last_purchase_cost numeric(10, 2) not null default 0 check (last_purchase_cost >= 0),
  last_purchase_quantity numeric(10, 3) not null default 0 check (last_purchase_quantity >= 0),
  last_purchase_unit text not null default 'unit'
    check (last_purchase_unit in ('unit', 'lb')),
  last_purchase_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, provider_id)
);

create unique index if not exists product_providers_one_primary_idx
on public.product_providers (product_id)
where is_primary;

create table if not exists public.product_purchases (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  quantity numeric(10, 3) not null check (quantity > 0),
  quantity_unit text not null default 'unit'
    check (quantity_unit in ('unit', 'lb')),
  quantity_in_stock_unit numeric(10, 3) not null check (quantity_in_stock_unit > 0),
  unit_cost numeric(10, 2) not null default 0 check (unit_cost >= 0),
  total_cost numeric(10, 2) not null default 0 check (total_cost >= 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.product_providers
  alter column last_purchase_quantity type numeric(10, 3)
  using last_purchase_quantity::numeric(10, 3);

alter table public.product_purchases
  alter column quantity type numeric(10, 3) using quantity::numeric(10, 3),
  alter column quantity_in_stock_unit type numeric(10, 3)
    using quantity_in_stock_unit::numeric(10, 3);

insert into public.providers (name)
select distinct btrim(provider)
from public.products
where provider is not null
  and btrim(provider) <> ''
on conflict do nothing;

insert into public.product_providers (
  product_id,
  provider_id,
  is_primary,
  last_purchase_cost,
  last_purchase_quantity,
  last_purchase_unit,
  last_purchase_at
)
select
  products.id,
  providers.id,
  true,
  products.purchase_cost,
  products.stock,
  products.measurement_unit,
  products.updated_at
from public.products
join public.providers
  on lower(btrim(providers.name)) = lower(btrim(products.provider))
where products.provider is not null
  and btrim(products.provider) <> ''
on conflict (product_id, provider_id) do update
set is_primary = excluded.is_primary,
    last_purchase_cost = excluded.last_purchase_cost,
    last_purchase_quantity = excluded.last_purchase_quantity,
    last_purchase_unit = excluded.last_purchase_unit,
    last_purchase_at = excluded.last_purchase_at;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists providers_set_updated_at on public.providers;
create trigger providers_set_updated_at
before update on public.providers
for each row execute function public.set_updated_at();

drop trigger if exists product_providers_set_updated_at on public.product_providers;
create trigger product_providers_set_updated_at
before update on public.product_providers
for each row execute function public.set_updated_at();

alter table public.providers enable row level security;
alter table public.product_providers enable row level security;
alter table public.product_purchases enable row level security;

drop policy if exists "providers admin read" on public.providers;
create policy "providers admin read"
on public.providers for select
to authenticated
using (public.is_admin());

drop policy if exists "providers admin manage" on public.providers;
create policy "providers admin manage"
on public.providers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "product providers admin read" on public.product_providers;
create policy "product providers admin read"
on public.product_providers for select
to authenticated
using (public.is_admin());

drop policy if exists "product providers admin manage" on public.product_providers;
create policy "product providers admin manage"
on public.product_providers for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "product purchases admin read" on public.product_purchases;
create policy "product purchases admin read"
on public.product_purchases for select
to authenticated
using (public.is_admin());

drop policy if exists "product purchases admin manage" on public.product_purchases;
create policy "product purchases admin manage"
on public.product_purchases for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
