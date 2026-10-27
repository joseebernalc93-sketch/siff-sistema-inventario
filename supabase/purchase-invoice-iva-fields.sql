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
