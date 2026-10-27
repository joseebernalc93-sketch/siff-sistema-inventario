create table if not exists public.product_presentations (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  unit_quantity numeric(10, 3) not null check (unit_quantity > 0),
  price numeric(10, 2) not null check (price >= 0),
  is_default boolean not null default false,
  is_active boolean not null default true,
  use_for_purchase boolean not null default true,
  use_for_sale boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_presentations
  add column if not exists unit_quantity numeric(10, 3) not null default 1,
  add column if not exists price numeric(10, 2) not null default 0,
  add column if not exists is_default boolean not null default false,
  add column if not exists is_active boolean not null default true,
  add column if not exists use_for_purchase boolean not null default true,
  add column if not exists use_for_sale boolean not null default true,
  add column if not exists updated_at timestamptz;

create index if not exists product_presentations_product_idx
on public.product_presentations (product_id, is_active, unit_quantity);

create unique index if not exists product_presentations_one_default_idx
on public.product_presentations (product_id)
where is_default = true and is_active = true;

drop trigger if exists product_presentations_set_updated_at on public.product_presentations;
create trigger product_presentations_set_updated_at
before update on public.product_presentations
for each row execute function public.set_updated_at();

alter table public.product_presentations enable row level security;

drop policy if exists "product presentations admin read" on public.product_presentations;
create policy "product presentations admin read"
on public.product_presentations for select
to authenticated
using (public.is_admin());

drop policy if exists "product presentations admin manage" on public.product_presentations;
create policy "product presentations admin manage"
on public.product_presentations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "product presentations public read active" on public.product_presentations;
create policy "product presentations public read active"
on public.product_presentations for select
to anon, authenticated
using (is_active = true);
