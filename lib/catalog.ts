import { mockCategories, mockProducts } from "@/lib/mock-data";
import {
  getProductPresentations,
  normalizeMoney,
  normalizeProductMeasurementUnit,
  normalizeProductPresentation,
} from "@/lib/pricing";
import { getServiceSupabase } from "@/lib/supabase-server";
import type {
  CatalogResponse,
  Product,
  ProductLot,
  ProductPresentation,
} from "@/lib/types";

const PUBLIC_PRODUCT_SELECT = [
  "id",
  "category_id",
  "name",
  "sku",
  "description",
  "price",
  "has_iva",
  "iva_rate",
  "measurement_unit",
  "stock",
  "min_stock",
  "max_stock",
  "image_url",
  "provider",
  "entry_date",
  "manufacture_date",
  "expiration_date",
  "is_active",
  "created_at",
  "updated_at",
  "categories(name, slug)",
].join(", ");

const LEGACY_PUBLIC_PRODUCT_SELECT = PUBLIC_PRODUCT_SELECT
  .replace("measurement_unit, ", "")
  .replace("manufacture_date, ", "")
  .replace("expiration_date, ", "");

const PUBLIC_PRODUCT_LOT_SELECT = [
  "id",
  "product_id",
  "quantity_remaining",
  "expiration_date",
  "status",
].join(", ");

export async function getCatalog(): Promise<CatalogResponse> {
  const supabase = getServiceSupabase();

  if (!supabase) {
    const products = filterSellableCatalogProducts(normalizeProducts(mockProducts));

    return {
      categories: mockCategories,
      products: products.map(stripPrivateProductFields),
    };
  }

  const client = supabase;
  const categoriesPromise = client.from("categories").select("*").order("name");
  const presentationsPromise = client
    .from("product_presentations")
    .select("*")
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("unit_quantity", { ascending: true })
    .order("name", { ascending: true });
  let productsResult = await fetchProducts(PUBLIC_PRODUCT_SELECT);

  if (
    productsResult.error &&
    isMissingProductUnitColumnError(productsResult.error.message)
  ) {
    productsResult = await fetchProducts(LEGACY_PUBLIC_PRODUCT_SELECT);
  }

  const categoriesResult = await categoriesPromise;
  const presentationsResult = await presentationsPromise;

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  const normalizedProducts = normalizeProducts(
    (productsResult.data ?? []) as unknown as Product[],
  );
  const productLots = await fetchProductLots(normalizedProducts);
  const sellableProducts = filterSellableCatalogProducts(
    normalizedProducts,
    productLots,
  );

  return {
    categories: categoriesResult.data ?? [],
    products: attachProductPresentations(
      sellableProducts,
      presentationsResult.error
        ? []
        : ((presentationsResult.data ?? []) as ProductPresentation[]),
    ).map(stripPrivateProductFields),
  };

  function fetchProducts(selectColumns: string) {
    return client
      .from("products")
      .select(selectColumns)
      .eq("is_active", true)
      .order("name");
  }

  async function fetchProductLots(products: Product[]) {
    if (products.length === 0) {
      return [];
    }

    const lotsResult = await client
      .from("product_lots")
      .select(PUBLIC_PRODUCT_LOT_SELECT)
      .in(
        "product_id",
        products.map((product) => product.id),
      )
      .gt("quantity_remaining", 0)
      .eq("status", "available")
      .order("expiration_date", { ascending: true, nullsFirst: false });

    if (lotsResult.error) {
      if (isMissingProductLotsTableError(lotsResult.error.message)) {
        return [];
      }

      throw new Error(lotsResult.error.message);
    }

    return (lotsResult.data ?? []) as unknown as ProductLot[];
  }
}

function filterSellableCatalogProducts(products: Product[], lots: ProductLot[] = []) {
  const today = getCurrentEcuadorDateInput();
  const lotsByProduct = new Map<string, ProductLot[]>();

  for (const lot of lots) {
    const current = lotsByProduct.get(lot.product_id) ?? [];
    current.push(lot);
    lotsByProduct.set(lot.product_id, current);
  }

  return products.flatMap((product) => {
    const productLots = lotsByProduct.get(product.id) ?? product.lots ?? [];

    if (productLots.length > 0) {
      const sellableLots = productLots.filter((lot) =>
        isSellableProductLot(lot, today),
      );
      const sellableStock = Number(
        sellableLots
          .reduce(
            (sum, lot) => sum + Math.max(0, Number(lot.quantity_remaining) || 0),
            0,
          )
          .toFixed(3),
      );

      if (sellableStock <= 0) {
        return [];
      }

      return [
        {
          ...product,
          stock: sellableStock,
          expiration_date: getNearestExpirationDate(sellableLots),
        },
      ];
    }

    const expirationDate = normalizeDateInput(product.expiration_date);

    if (expirationDate && expirationDate < today) {
      return [];
    }

    return [product];
  });
}

function attachProductPresentations(
  products: Product[],
  presentations: ProductPresentation[],
) {
  const presentationsByProduct = new Map<string, ProductPresentation[]>();

  for (const presentation of presentations) {
    const current = presentationsByProduct.get(presentation.product_id) ?? [];
    current.push(normalizeProductPresentation(presentation));
    presentationsByProduct.set(presentation.product_id, current);
  }

  return products.map((product) => ({
    ...product,
    presentations: getProductPresentations({
      ...product,
      presentations: presentationsByProduct.get(product.id) ?? [],
    }),
  }));
}

function normalizeProducts(products: Product[]): Product[] {
  return products.map((product) => ({
    ...product,
    price: normalizeMoney(product.price),
    measurement_unit: normalizeProductMeasurementUnit(product.measurement_unit),
    stock: Number(product.stock),
    min_stock: Number(product.min_stock),
  }));
}

function stripPrivateProductFields(product: Product): Product {
  const publicProduct = { ...product };
  delete publicProduct.purchase_cost;
  delete publicProduct.lots;
  return publicProduct;
}

function isSellableProductLot(lot: ProductLot, today: string) {
  const quantity = Number(lot.quantity_remaining) || 0;
  const expirationDate = normalizeDateInput(lot.expiration_date);

  return (
    quantity > 0 &&
    (lot.status ?? "available") === "available" &&
    (!expirationDate || expirationDate >= today)
  );
}

function getNearestExpirationDate(lots: ProductLot[]) {
  return (
    lots
      .map((lot) => normalizeDateInput(lot.expiration_date))
      .filter((date): date is string => Boolean(date))
      .sort()[0] ?? null
  );
}

function normalizeDateInput(value: string | null | undefined) {
  const text = value?.trim();

  if (!text) {
    return null;
  }

  const dateOnly = text.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return dateOnly;
  }

  const date = new Date(text);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDateInputParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

function getCurrentEcuadorDateInput() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Guayaquil",
    year: "numeric",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function formatDateInputParts(year: number, month: number, day: number) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function isMissingProductUnitColumnError(message: string) {
  return (
    message.includes("measurement_unit") ||
    message.includes("manufacture_date") ||
    message.includes("expiration_date")
  );
}

function isMissingProductLotsTableError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("product_lots") &&
    (normalized.includes("does not exist") ||
      normalized.includes("schema cache") ||
      normalized.includes("could not find") ||
      normalized.includes("relation"))
  );
}
