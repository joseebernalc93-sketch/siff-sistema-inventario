create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete cascade,
  name text not null,
  sku text not null unique,
  product_code text constraint products_product_code_format_check
    check (product_code is null or product_code ~ '^[0-9]{13}$'),
  description text,
  purchase_cost numeric(10, 2) not null default 0 check (purchase_cost >= 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  measurement_unit text not null default 'unit'
    check (measurement_unit in ('unit', 'lb')),
  stock numeric(10, 3) not null default 0 check (stock >= 0),
  min_stock numeric(10, 3) not null default 5 check (min_stock >= 0),
  max_stock numeric(10, 3) not null default 100 check (max_stock >= 0),
  image_url text,
  provider text,
  has_iva boolean not null default false,
  iva_rate numeric(5, 2) not null default 0 check (iva_rate >= 0),
  requires_dates boolean not null default false,
  entry_date text,
  manufacture_date text,
  expiration_date text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists purchase_cost numeric(10, 2) not null default 0,
  add column if not exists product_code text,
  add column if not exists measurement_unit text not null default 'unit',
  add column if not exists max_stock numeric(10, 3) not null default 100,
  add column if not exists provider text,
  add column if not exists has_iva boolean not null default false,
  add column if not exists iva_rate numeric(5, 2) not null default 0,
  add column if not exists requires_dates boolean not null default false,
  add column if not exists entry_date text,
  add column if not exists manufacture_date text,
  add column if not exists expiration_date text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_product_code_format_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_product_code_format_check
      check (product_code is null or product_code ~ '^[0-9]{13}$');
  end if;
end $$;

create unique index if not exists products_product_code_unique_idx
on public.products (product_code)
where product_code is not null and btrim(product_code) <> '';

alter table public.products
  drop constraint if exists products_purchase_cost_check,
  drop constraint if exists products_price_check,
  drop constraint if exists products_measurement_unit_check,
  drop constraint if exists products_stock_check,
  drop constraint if exists products_min_stock_check,
  drop constraint if exists products_max_stock_check,
  drop constraint if exists products_promo_price_check,
  drop constraint if exists products_bulk_min_quantity_check,
  drop constraint if exists products_bulk_price_check;

alter table public.products
  drop column if exists promo_price,
  drop column if exists bulk_min_quantity,
  drop column if exists bulk_price;

alter table public.products
  alter column stock type numeric(10, 3) using stock::numeric(10, 3),
  alter column min_stock type numeric(10, 3) using min_stock::numeric(10, 3),
  alter column max_stock type numeric(10, 3) using max_stock::numeric(10, 3);

update public.products
set purchase_cost = round(purchase_cost / 2.20462, 2),
    stock = round(stock * 2.20462, 3),
    min_stock = round(min_stock * 2.20462, 3),
    max_stock = round(max_stock * 2.20462, 3),
    measurement_unit = 'lb'
where measurement_unit = 'kg';

update public.products
set measurement_unit = 'unit'
where measurement_unit is null
   or measurement_unit not in ('unit', 'lb');

update public.products
set purchase_cost = 0
where purchase_cost is null;

alter table public.products
  alter column measurement_unit set not null,
  alter column measurement_unit set default 'unit';

alter table public.products
  add constraint products_purchase_cost_check check (purchase_cost >= 0),
  add constraint products_price_check check (price >= 0),
  add constraint products_measurement_unit_check
    check (measurement_unit in ('unit', 'lb')),
  add constraint products_stock_check check (stock >= 0),
  add constraint products_min_stock_check check (min_stock >= 0),
  add constraint products_max_stock_check check (max_stock >= 0);

alter table public.products
  drop constraint if exists products_category_id_fkey;

alter table public.products
  add constraint products_category_id_fkey
  foreign key (category_id)
  references public.categories(id)
  on delete cascade;

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
  purchase_code text,
  purchase_input_quantity numeric(10, 3),
  purchase_input_unit text,
  invoice_number text,
  invoice_date text,
  payment_method text,
  credit_days integer,
  iva_rate numeric(5, 2) not null default 0,
  iva_amount numeric(10, 2) not null default 0,
  line_subtotal numeric(10, 2),
  line_total numeric(10, 2),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.product_purchases
  add column if not exists purchase_code text,
  add column if not exists purchase_input_quantity numeric(10, 3),
  add column if not exists purchase_input_unit text,
  add column if not exists invoice_number text,
  add column if not exists invoice_date text,
  add column if not exists payment_method text,
  add column if not exists credit_days integer,
  add column if not exists iva_rate numeric(5, 2) not null default 0,
  add column if not exists iva_amount numeric(10, 2) not null default 0,
  add column if not exists line_subtotal numeric(10, 2),
  add column if not exists line_total numeric(10, 2);

create index if not exists product_purchases_purchase_code_idx
on public.product_purchases (purchase_code)
where purchase_code is not null and btrim(purchase_code) <> '';

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

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  identity_number text,
  phone text,
  created_at timestamptz not null default now(),
  unique (phone)
);

alter table public.customers
  add column if not exists identity_number text;

create unique index if not exists customers_identity_number_key
on public.customers (identity_number)
where identity_number is not null;

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

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled')),
  channel text not null default 'android'
    check (channel in ('android', 'chatbot', 'web')),
  subtotal numeric(10, 2) not null default 0,
  discount numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity numeric(10, 3) not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  line_total numeric(10, 2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

alter table public.order_items
  alter column quantity type numeric(10, 3) using quantity::numeric(10, 3);

alter table public.order_items
  alter column product_id drop not null;

alter table public.order_items
  drop constraint if exists order_items_product_id_fkey;

alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id)
  references public.products(id)
  on delete set null;

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'adjustment')),
  quantity numeric(10, 3) not null,
  reason text,
  order_id uuid references public.orders(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.stock_movements
  alter column quantity type numeric(10, 3) using quantity::numeric(10, 3);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  message text not null,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100),
  min_orders integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists providers_set_updated_at on public.providers;
create trigger providers_set_updated_at
before update on public.providers
for each row execute function public.set_updated_at();

drop trigger if exists product_providers_set_updated_at on public.product_providers;
create trigger product_providers_set_updated_at
before update on public.product_providers
for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists mobile_clients_set_updated_at on public.mobile_clients;
create trigger mobile_clients_set_updated_at
before update on public.mobile_clients
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.providers enable row level security;
alter table public.product_providers enable row level security;
alter table public.product_purchases enable row level security;
alter table public.customers enable row level security;
alter table public.mobile_clients enable row level security;
alter table public.mobile_password_reset_requests enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.complaints enable row level security;
alter table public.promotions enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles admin manage" on public.profiles;
create policy "profiles admin manage"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "categories public read" on public.categories;
create policy "categories public read"
on public.categories for select
to anon, authenticated
using (true);

drop policy if exists "categories admin manage" on public.categories;
create policy "categories admin manage"
on public.categories for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products public read active" on public.products;
drop policy if exists "products admin read" on public.products;
create policy "products admin read"
on public.products for select
to authenticated
using (public.is_admin());

drop policy if exists "products admin manage" on public.products;
create policy "products admin manage"
on public.products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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

drop policy if exists "customers admin read" on public.customers;
create policy "customers admin read"
on public.customers for select
to authenticated
using (public.is_admin());

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

drop policy if exists "orders admin read" on public.orders;
create policy "orders admin read"
on public.orders for select
to authenticated
using (public.is_admin());

drop policy if exists "order items admin read" on public.order_items;
create policy "order items admin read"
on public.order_items for select
to authenticated
using (public.is_admin());

drop policy if exists "stock movements admin read" on public.stock_movements;
create policy "stock movements admin read"
on public.stock_movements for select
to authenticated
using (public.is_admin());

drop policy if exists "complaints admin read" on public.complaints;
create policy "complaints admin read"
on public.complaints for select
to authenticated
using (public.is_admin());

drop policy if exists "promotions public read active" on public.promotions;
create policy "promotions public read active"
on public.promotions for select
to anon, authenticated
using (is_active = true or public.is_admin());

drop policy if exists "promotions admin manage" on public.promotions;
create policy "promotions admin manage"
on public.promotions for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "product images admin write" on storage.objects;
create policy "product images admin write"
on storage.objects for all
to authenticated
using (bucket_id = 'product-images' and public.is_admin())
with check (bucket_id = 'product-images' and public.is_admin());

create or replace function public.create_order(
  p_customer_name text,
  p_customer_identity text,
  p_customer_phone text,
  p_channel text,
  p_notes text,
  p_items jsonb
)
returns table(order_id uuid, order_code text, total numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_customer_identity text := nullif(trim(coalesce(p_customer_identity, '')), '');
  v_customer_phone text := nullif(trim(coalesce(p_customer_phone, '')), '');
  v_order_id uuid;
  v_order_code text;
  v_subtotal numeric(10, 2) := 0;
  v_item jsonb;
  v_product products%rowtype;
  v_quantity numeric(10, 3);
  v_stock_quantity numeric(10, 3);
  v_unit_price numeric(10, 2);
  v_line_total numeric(10, 2);
begin
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'El nombre del cliente es obligatorio.';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido debe incluir productos.';
  end if;

  if v_customer_identity is not null then
    insert into public.customers (full_name, identity_number, phone)
    values (trim(p_customer_name), v_customer_identity, v_customer_phone)
    on conflict (identity_number) where identity_number is not null
    do update set
      full_name = excluded.full_name,
      phone = coalesce(excluded.phone, public.customers.phone)
    returning id into v_customer_id;
  elsif v_customer_phone is not null then
    insert into public.customers (full_name, phone)
    values (trim(p_customer_name), v_customer_phone)
    on conflict (phone) do update set full_name = excluded.full_name
    returning id into v_customer_id;
  else
    insert into public.customers (full_name)
    values (trim(p_customer_name))
    returning id into v_customer_id;
  end if;

  v_order_code := 'ORD-' || to_char(now(), 'YYYYMMDD') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.orders (order_code, customer_id, channel, notes)
  values (
    v_order_code,
    v_customer_id,
    coalesce(nullif(p_channel, ''), 'android'),
    p_notes
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);

    if v_quantity <= 0 then
      raise exception 'Cantidad invalida en el pedido.';
    end if;

    select *
    into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid
      and is_active = true
    for update;

    if not found then
      raise exception 'Producto no disponible.';
    end if;

    v_stock_quantity := v_quantity;

    if v_product.stock < v_stock_quantity then
      raise exception 'Stock insuficiente para %.', v_product.name;
    end if;

    v_unit_price := v_product.price;

    v_line_total := round(v_unit_price * v_quantity, 2);
    v_subtotal := v_subtotal + v_line_total;

    insert into public.order_items (
      order_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      line_total
    )
    values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_quantity,
      v_unit_price,
      v_line_total
    );

    update public.products
    set stock = round(stock - v_stock_quantity, 3)
    where id = v_product.id;

    insert into public.stock_movements (
      product_id,
      movement_type,
      quantity,
      reason,
      order_id
    )
    values (
      v_product.id,
      'out',
      v_stock_quantity * -1,
      'Venta automatizada',
      v_order_id
    );
  end loop;

  update public.orders
  set subtotal = v_subtotal,
      total = v_subtotal,
      status = 'confirmed'
  where id = v_order_id;

  return query
  select v_order_id, v_order_code, v_subtotal;
end;
$$;
