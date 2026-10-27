export const PRODUCT_DUPLICATE_MESSAGE = "Producto Duplicado";

type ProductIdentity = {
  id?: string | null;
  name?: string | null;
  sku?: string | null;
};

export function findDuplicateProduct<T extends ProductIdentity>(
  products: T[],
  product: ProductIdentity,
) {
  const targetName = normalizeProductName(product.name ?? "");
  const targetSku = normalizeProductSku(product.sku ?? "");

  return (
    products.find((entry) => {
      if (product.id && entry.id === product.id) {
        return false;
      }

      const entryName = normalizeProductName(entry.name ?? "");
      const entrySku = normalizeProductSku(entry.sku ?? "");

      return (
        (targetName && entryName === targetName) ||
        (targetSku && entrySku === targetSku)
      );
    }) ?? null
  );
}

export function normalizeProductName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeProductSku(value: string) {
  return value.trim().toLowerCase();
}
