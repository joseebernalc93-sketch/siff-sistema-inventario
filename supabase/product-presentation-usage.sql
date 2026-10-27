alter table public.product_presentations
  add column if not exists use_for_purchase boolean not null default true,
  add column if not exists use_for_sale boolean not null default true;

update public.product_presentations
set use_for_purchase = true,
    use_for_sale = true
where use_for_purchase is null
   or use_for_sale is null;
