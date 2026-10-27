-- ============================================================
-- Base de datos completa - Minimarket
-- Generado desde los archivos SQL del proyecto
-- ============================================================


-- ============================================================
-- Archivo original: supabase/schema.sql
-- ============================================================

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



-- ============================================================
-- Archivo original: supabase/seed.sql
-- ============================================================

insert into public.categories (name, slug, description)
values
  ('Lacteos', 'lacteos', 'Leche, yogur, queso y productos refrigerados.'),
  ('Bebidas', 'bebidas', 'Agua, gaseosas, jugos y bebidas familiares.'),
  ('Canasta basica', 'canasta-basica', 'Productos de primera necesidad.')
on conflict (slug) do nothing;

insert into public.products (
  category_id,
  name,
  sku,
  description,
  purchase_cost,
  price,
  measurement_unit,
  stock,
  min_stock,
  image_url
)
select categories.id, products.name, products.sku, products.description,
  products.purchase_cost, products.price, products.measurement_unit,
  products.stock, products.min_stock, products.image_url
from (
  values
    ('lacteos', 'Leche entera 1L', 'LAC-001', 'Leche entera pasteurizada en funda de 1 litro.', 0.82, 1.15, 'unit', 24, 8, null),
    ('canasta-basica', 'Arroz por libra', 'BAS-002', 'Arroz blanco vendido e inventariado por libra.', 0.52, 0.68, 'lb', 100, 25, null),
    ('bebidas', 'Gaseosa cola 3L', 'BEB-003', 'Bebida gaseosa sabor cola botella familiar.', 1.95, 2.50, 'unit', 6, 8, null),
    ('canasta-basica', 'Aceite vegetal 1L', 'BAS-004', 'Aceite vegetal para cocina en botella de 1 litro.', 1.75, 2.25, 'unit', 18, 8, null)
) as products(category_slug, name, sku, description, purchase_cost, price, measurement_unit, stock, min_stock, image_url)
join public.categories on categories.slug = products.category_slug
on conflict (sku) do nothing;



-- ============================================================
-- Archivo original: supabase/product-providers.sql
-- ============================================================

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



-- ============================================================
-- Archivo original: supabase/mobile-clients.sql
-- ============================================================

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



-- ============================================================
-- Archivo original: supabase/product-presentations.sql
-- ============================================================

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



-- ============================================================
-- Archivo original: supabase/inventory-lots.sql
-- ============================================================

alter table public.products
  add column if not exists entry_date text,
  add column if not exists manufacture_date text,
  add column if not exists expiration_date text;

alter table if exists public.product_purchases
  alter column quantity type numeric(10, 3) using quantity::numeric(10, 3),
  alter column quantity_in_stock_unit type numeric(10, 3)
    using quantity_in_stock_unit::numeric(10, 3);

create table if not exists public.product_lots (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  purchase_id uuid references public.product_purchases(id) on delete set null,
  quantity_received numeric(10, 3) not null check (quantity_received > 0),
  quantity_remaining numeric(10, 3) not null check (quantity_remaining >= 0),
  quantity_unit text not null default 'unit'
    check (quantity_unit in ('unit', 'lb')),
  unit_cost numeric(10, 2) not null default 0 check (unit_cost >= 0),
  entry_date text,
  manufacture_date text,
  expiration_date text,
  status text not null default 'available'
    check (status in ('available', 'depleted', 'returned', 'adjusted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_lots
  add column if not exists provider_id uuid references public.providers(id) on delete set null,
  add column if not exists purchase_id uuid references public.product_purchases(id) on delete set null,
  add column if not exists quantity_received numeric(10, 3) not null default 0,
  add column if not exists quantity_remaining numeric(10, 3) not null default 0,
  add column if not exists quantity_unit text not null default 'unit',
  add column if not exists unit_cost numeric(10, 2) not null default 0,
  add column if not exists entry_date text,
  add column if not exists manufacture_date text,
  add column if not exists expiration_date text,
  add column if not exists status text not null default 'available',
  add column if not exists updated_at timestamptz;

alter table public.product_lots
  alter column quantity_received type numeric(10, 3)
    using quantity_received::numeric(10, 3),
  alter column quantity_remaining type numeric(10, 3)
    using quantity_remaining::numeric(10, 3);

create index if not exists product_lots_product_status_idx
on public.product_lots (product_id, status, expiration_date, entry_date);

create index if not exists product_lots_provider_idx
on public.product_lots (provider_id);

create table if not exists public.sale_item_lots (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  lot_id uuid references public.product_lots(id) on delete set null,
  quantity numeric(10, 3) not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists sale_item_lots_order_item_idx
on public.sale_item_lots (order_item_id);

create index if not exists sale_item_lots_lot_idx
on public.sale_item_lots (lot_id);

alter table public.stock_movements
  add column if not exists lot_id uuid references public.product_lots(id) on delete set null;

alter table public.stock_movements
  alter column quantity type numeric(10, 3) using quantity::numeric(10, 3);

create index if not exists stock_movements_lot_idx
on public.stock_movements (lot_id);

create table if not exists public.customer_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  order_item_id uuid references public.order_items(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  quantity numeric(10, 3) not null check (quantity > 0),
  condition text not null default 'review'
    check (condition in ('resellable', 'damaged', 'expired', 'review')),
  resolution text not null default 'restock'
    check (resolution in ('restock', 'supplier_return', 'discard', 'review')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.supplier_returns (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.providers(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  lot_id uuid references public.product_lots(id) on delete set null,
  customer_return_id uuid references public.customer_returns(id) on delete set null,
  quantity numeric(10, 3) not null check (quantity > 0),
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

insert into public.product_lots (
  product_id,
  provider_id,
  quantity_received,
  quantity_remaining,
  quantity_unit,
  unit_cost,
  entry_date,
  manufacture_date,
  expiration_date,
  status,
  created_at,
  updated_at
)
select
  products.id,
  primary_provider.provider_id,
  products.stock,
  products.stock,
  products.measurement_unit,
  products.purchase_cost,
  products.entry_date,
  products.manufacture_date,
  products.expiration_date,
  case when products.stock > 0 then 'available' else 'depleted' end,
  coalesce(products.created_at, now()),
  coalesce(products.updated_at, now())
from public.products
left join lateral (
  select product_providers.provider_id
  from public.product_providers
  where product_providers.product_id = products.id
  order by product_providers.is_primary desc,
           product_providers.last_purchase_at desc nulls last
  limit 1
) as primary_provider on true
where products.stock > 0
  and not exists (
    select 1
    from public.product_lots existing_lots
    where existing_lots.product_id = products.id
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

drop trigger if exists product_lots_set_updated_at on public.product_lots;
create trigger product_lots_set_updated_at
before update on public.product_lots
for each row execute function public.set_updated_at();

alter table public.product_lots enable row level security;
alter table public.sale_item_lots enable row level security;
alter table public.customer_returns enable row level security;
alter table public.supplier_returns enable row level security;

drop policy if exists "product lots admin read" on public.product_lots;
create policy "product lots admin read"
on public.product_lots for select
to authenticated
using (public.is_admin());

drop policy if exists "product lots admin manage" on public.product_lots;
create policy "product lots admin manage"
on public.product_lots for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "sale item lots admin read" on public.sale_item_lots;
create policy "sale item lots admin read"
on public.sale_item_lots for select
to authenticated
using (public.is_admin());

drop policy if exists "sale item lots admin manage" on public.sale_item_lots;
create policy "sale item lots admin manage"
on public.sale_item_lots for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "customer returns admin read" on public.customer_returns;
create policy "customer returns admin read"
on public.customer_returns for select
to authenticated
using (public.is_admin());

drop policy if exists "customer returns admin manage" on public.customer_returns;
create policy "customer returns admin manage"
on public.customer_returns for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "supplier returns admin read" on public.supplier_returns;
create policy "supplier returns admin read"
on public.supplier_returns for select
to authenticated
using (public.is_admin());

drop policy if exists "supplier returns admin manage" on public.supplier_returns;
create policy "supplier returns admin manage"
on public.supplier_returns for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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
  v_order_item_id uuid;
  v_order_code text;
  v_subtotal numeric(10, 2) := 0;
  v_item jsonb;
  v_lot record;
  v_product products%rowtype;
  v_quantity numeric(10, 3);
  v_remaining numeric(10, 3);
  v_stock_quantity numeric(10, 3);
  v_take numeric(10, 3);
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
    )
    returning id into v_order_item_id;

    v_remaining := v_stock_quantity;

    for v_lot in
      select product_lots.id, product_lots.quantity_remaining
      from public.product_lots
      where product_lots.product_id = v_product.id
        and product_lots.status = 'available'
        and product_lots.quantity_remaining > 0
      order by nullif(product_lots.expiration_date, '') asc nulls last,
               nullif(product_lots.entry_date, '') asc nulls last,
               product_lots.created_at asc
      for update
    loop
      exit when v_remaining <= 0;

      v_take := least(v_lot.quantity_remaining, v_remaining);

      update public.product_lots
      set quantity_remaining = round(quantity_remaining - v_take, 3),
          status = case
            when round(quantity_remaining - v_take, 3) <= 0
            then 'depleted'
            else status
          end
      where id = v_lot.id;

      insert into public.sale_item_lots (
        order_item_id,
        product_id,
        lot_id,
        quantity
      )
      values (
        v_order_item_id,
        v_product.id,
        v_lot.id,
        v_take
      );

      insert into public.stock_movements (
        product_id,
        lot_id,
        movement_type,
        quantity,
        reason,
        order_id
      )
      values (
        v_product.id,
        v_lot.id,
        'out',
        v_take * -1,
        'Venta automatizada',
        v_order_id
      );

      v_remaining := round(v_remaining - v_take, 3);
    end loop;

    if v_remaining > 0 then
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
        v_remaining * -1,
        'Venta automatizada',
        v_order_id
      );
    end if;

    update public.products
    set stock = round(stock - v_stock_quantity, 3)
    where id = v_product.id;
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



-- ============================================================
-- Archivo original: supabase/update-products-columns.sql
-- ============================================================

alter table public.products
  add column if not exists purchase_cost numeric(10, 2) not null default 0,
  add column if not exists measurement_unit text not null default 'unit',
  add column if not exists max_stock numeric(10, 3) not null default 100,
  add column if not exists provider text,
  add column if not exists requires_dates boolean not null default false,
  add column if not exists entry_date text,
  add column if not exists manufacture_date text,
  add column if not exists expiration_date text;

alter table public.products
  drop constraint if exists products_purchase_cost_check,
  drop constraint if exists products_price_check,
  drop constraint if exists products_measurement_unit_check,
  drop constraint if exists products_stock_check,
  drop constraint if exists products_min_stock_check,
  drop constraint if exists products_max_stock_check;

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

update public.products
set max_stock = 100
where max_stock is null;

alter table public.products
  alter column purchase_cost set not null,
  alter column purchase_cost set default 0,
  alter column measurement_unit set not null,
  alter column measurement_unit set default 'unit',
  alter column max_stock set not null,
  alter column max_stock set default 100;

alter table public.products
  add constraint products_purchase_cost_check check (purchase_cost >= 0),
  add constraint products_price_check check (price >= 0),
  add constraint products_measurement_unit_check
    check (measurement_unit in ('unit', 'lb')),
  add constraint products_stock_check check (stock >= 0),
  add constraint products_min_stock_check check (min_stock >= 0),
  add constraint products_max_stock_check check (max_stock >= 0);



-- ============================================================
-- Archivo original: supabase/product-code-field.sql
-- ============================================================

alter table public.products
  add column if not exists product_code text;

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



-- ============================================================
-- Archivo original: supabase/product-date-fields.sql
-- ============================================================

alter table public.products
  add column if not exists requires_dates boolean not null default false;

update public.products
set requires_dates = true
where coalesce(manufacture_date, '') <> ''
   or coalesce(expiration_date, '') <> '';



-- ============================================================
-- Archivo original: supabase/product-presentation-usage.sql
-- ============================================================

alter table public.product_presentations
  add column if not exists use_for_purchase boolean not null default true,
  add column if not exists use_for_sale boolean not null default true;

update public.product_presentations
set use_for_purchase = true,
    use_for_sale = true
where use_for_purchase is null
   or use_for_sale is null;



-- ============================================================
-- Archivo original: supabase/purchase-invoice-iva-fields.sql
-- ============================================================

alter table public.products
  add column if not exists has_iva boolean not null default false,
  add column if not exists iva_rate numeric(5, 2) not null default 0;

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



-- ============================================================
-- Archivo original: supabase/provider-contact-fields.sql
-- ============================================================

alter table public.providers
  add column if not exists ruc text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists notes text;

create unique index if not exists providers_ruc_unique_idx
on public.providers (lower(btrim(ruc)))
where ruc is not null and btrim(ruc) <> '';



-- ============================================================
-- Archivo original: supabase/order-items-quantity-numeric.sql
-- ============================================================

alter table public.order_items
  alter column quantity type numeric(10, 3) using quantity::numeric(10, 3);



-- ============================================================
-- Archivo original: supabase/fill-profiles-from-mobile-clients.sql
-- ============================================================

-- Fill public.profiles from the users already linked in public.mobile_clients.
-- This keeps public.mobile_clients as the source of truth for the app.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'customer', 'cliente', 'empleado', 'delivery'));

insert into public.profiles (id, full_name, phone, role, created_at)
select
  mobile_clients.auth_user_id,
  mobile_clients.full_name,
  mobile_clients.phone,
  coalesce(nullif(mobile_clients.role, ''), 'cliente'),
  coalesce(mobile_clients.created_at, now())
from public.mobile_clients
where mobile_clients.auth_user_id is not null
on conflict (id) do update
set
  full_name = excluded.full_name,
  phone = excluded.phone,
  role = excluded.role;

create or replace function public.sync_profile_from_mobile_client()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.auth_user_id is null then
    return new;
  end if;

  insert into public.profiles (id, full_name, phone, role, created_at)
  values (
    new.auth_user_id,
    new.full_name,
    new.phone,
    coalesce(nullif(new.role, ''), 'cliente'),
    coalesce(new.created_at, now())
  )
  on conflict (id) do update
  set
    full_name = excluded.full_name,
    phone = excluded.phone,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists mobile_clients_sync_profile on public.mobile_clients;
create trigger mobile_clients_sync_profile
after insert or update of auth_user_id, full_name, phone, role
on public.mobile_clients
for each row
execute function public.sync_profile_from_mobile_client();



-- ============================================================
-- Archivo original: recaudacion.sql
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_handover_status varchar DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_handed_over_at timestamp with time zone;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cash_confirmed_at timestamp with time zone;


