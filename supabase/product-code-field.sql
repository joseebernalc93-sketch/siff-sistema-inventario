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
