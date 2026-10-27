alter table public.order_items
  alter column quantity type numeric(10, 3) using quantity::numeric(10, 3);
