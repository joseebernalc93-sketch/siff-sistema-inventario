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
