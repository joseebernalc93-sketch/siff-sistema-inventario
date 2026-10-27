alter table public.products
  add column if not exists requires_dates boolean not null default false;

update public.products
set requires_dates = true
where coalesce(manufacture_date, '') <> ''
   or coalesce(expiration_date, '') <> '';
