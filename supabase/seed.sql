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
