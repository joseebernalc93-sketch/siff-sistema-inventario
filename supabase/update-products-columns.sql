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
