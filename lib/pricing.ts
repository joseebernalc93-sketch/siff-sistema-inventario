import type {
  Product,
  ProductMeasurementUnit,
  ProductPresentation,
} from "@/lib/types";

const COMMERCIAL_QUINTAL_TO_POUNDS = 100;

export type ProductPriceKind = "unit" | "pound";

export type ProductPriceResult = {
  kind: ProductPriceKind;
  label: string;
  unitPrice: number;
  presentation?: ProductPresentation;
};

export function getEffectiveProductPrice(
  product: Pick<Product, "price" | "measurement_unit" | "presentations">,
  presentationId?: string | null,
): ProductPriceResult {
  const presentation = getProductPresentation(product, presentationId);
  const unitPrice = normalizeMoney(presentation?.price ?? product.price);
  const isWeight = isWeightBasedProduct(product);

  return {
    kind: isWeight ? "pound" : "unit",
    label: presentation?.name ?? (isWeight ? "Libra" : "Unidad"),
    presentation,
    unitPrice,
  };
}

export function calculateProductLineTotal(
  product: Product,
  quantity: number,
  presentationId?: string | null,
) {
  const effectivePrice = getEffectiveProductPrice(product, presentationId);
  return Number((effectivePrice.unitPrice * quantity).toFixed(2));
}

export function calculateProductMargin(unitPrice: number, purchaseCost: number) {
  const profit = Number((unitPrice - purchaseCost).toFixed(2));
  const marginPercent =
    purchaseCost > 0 ? Number(((profit / purchaseCost) * 100).toFixed(1)) : 0;

  return {
    marginPercent,
    profit,
  };
}

export function normalizeMoney(value: unknown) {
  const number = parseMoneyNumber(value);
  return Number.isFinite(number) ? number : 0;
}

export function normalizeOptionalMoney(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = parseMoneyNumber(value);
  return Number.isFinite(number) ? number : null;
}

function parseMoneyNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  const text = String(value ?? "").trim();

  if (!text) {
    return Number.NaN;
  }

  const compactText = text.replace(/\s+/g, "");
  const lastCommaIndex = compactText.lastIndexOf(",");
  const lastDotIndex = compactText.lastIndexOf(".");

  if (lastCommaIndex >= 0 && lastDotIndex >= 0) {
    const decimalSeparator = lastCommaIndex > lastDotIndex ? "," : ".";
    const thousandsSeparator = decimalSeparator === "," ? "." : ",";
    return Number(
      compactText
        .split(thousandsSeparator)
        .join("")
        .replace(decimalSeparator, "."),
    );
  }

  return Number(compactText.replace(",", "."));
}

export function normalizeProductMeasurementUnit(
  value: unknown,
): ProductMeasurementUnit {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    normalized.includes("lb") ||
    normalized.includes("libra") ||
    normalized.includes("granel") ||
    normalized.includes("quintal") ||
    normalized.includes("kg") ||
    normalized.includes("kilo")
  ) {
    return "lb";
  }

  return "unit";
}

export function isWeightBasedProduct(
  product: Pick<Product, "measurement_unit">,
) {
  return normalizeProductMeasurementUnit(product.measurement_unit) === "lb";
}

export function getSaleValuePerInventoryUnit(
  unitPrice: number,
  measurementUnit: ProductMeasurementUnit,
) {
  void measurementUnit;
  return normalizeMoney(unitPrice);
}

export function getProductInventorySaleValue(
  product: Pick<Product, "price" | "stock" | "measurement_unit">,
) {
  const measurementUnit = normalizeProductMeasurementUnit(
    product.measurement_unit,
  );
  const saleValuePerInventoryUnit = getSaleValuePerInventoryUnit(
    product.price,
    measurementUnit,
  );

  return Number((saleValuePerInventoryUnit * Number(product.stock)).toFixed(2));
}

export function getProductUnitCost(
  product: Pick<Product, "purchase_cost"> &
    Partial<Pick<Product, "measurement_unit">>,
) {
  const purchaseCost = normalizeOptionalMoney(product.purchase_cost) ?? 0;
  return isWeightBasedProduct(product) && purchaseCost >= 10
    ? purchaseCost / COMMERCIAL_QUINTAL_TO_POUNDS
    : purchaseCost;
}

export function getProductInventoryCost(
  product: Pick<Product, "purchase_cost" | "stock"> &
    Partial<Pick<Product, "measurement_unit">>,
) {
  const unitCost = getProductUnitCost(product);

  return Number(
    (unitCost * Number(product.stock)).toFixed(2),
  );
}

export function getStockAdjustmentStep(
  product: Pick<Product, "measurement_unit">,
) {
  return isWeightBasedProduct(product) ? 1 : 1;
}

export function getOrderStockQuantity(
  product: Pick<Product, "measurement_unit" | "presentations">,
  orderQuantity: number,
  presentationId?: string | null,
) {
  const quantity = Number(orderQuantity);

  if (!Number.isFinite(quantity)) {
    return 0;
  }

  const presentation = getProductPresentation(product, presentationId);

  if (isWeightBasedProduct(product)) {
    return Number((quantity * (presentation?.unit_quantity ?? 1)).toFixed(3));
  }

  return Number((quantity * (presentation?.unit_quantity ?? 1)).toFixed(3));
}

export function getProductPresentations(
  product: Pick<Product, "measurement_unit" | "presentations"> &
    Partial<Pick<Product, "price">> & {
      id?: string;
    },
  usage: "sale" | "purchase" | "all" = "sale",
) {
  const allSavedPresentations = (product.presentations ?? [])
    .map(normalizeProductPresentation)
    .filter((presentation) => presentation.is_active !== false);

  const hasStockUnitPresentation = allSavedPresentations.some(
    (presentation) => presentation.unit_quantity === 1,
  );

  const basePresentations = hasStockUnitPresentation
    ? allSavedPresentations
    : [getDefaultProductPresentation(product), ...allSavedPresentations];

  return basePresentations
    .filter((presentation) =>
      usage === "purchase"
        ? presentation.use_for_purchase !== false
        : usage === "sale"
          ? presentation.use_for_sale !== false
          : true,
    )
    .sort((first, second) => {
      if (Boolean(first.is_default) !== Boolean(second.is_default)) {
        return first.is_default ? -1 : 1;
      }

      return (
        first.unit_quantity - second.unit_quantity ||
        first.name.localeCompare(second.name, "es-EC")
      );
    });
}

export function getProductPresentation(
  product: Pick<Product, "measurement_unit" | "presentations"> &
    Partial<Pick<Product, "price">> & {
      id?: string;
    },
  presentationId?: string | null,
) {
  const presentations = getProductPresentations(product);

  return (
    presentations.find((presentation) => presentation.id === presentationId) ??
    presentations.find((presentation) => presentation.is_default) ??
    presentations[0] ??
    null
  );
}

export function normalizeProductPresentation(
  presentation: ProductPresentation,
): ProductPresentation {
  return {
    ...presentation,
    name: presentation.name?.trim() || "Unidad",
    unit_quantity:
      Number.isFinite(Number(presentation.unit_quantity)) &&
      Number(presentation.unit_quantity) > 0
        ? Number(presentation.unit_quantity)
        : 1,
    price: normalizeMoney(presentation.price),
    is_default: Boolean(presentation.is_default),
    is_active: presentation.is_active !== false,
    use_for_purchase: presentation.use_for_purchase !== false,
    use_for_sale: presentation.use_for_sale !== false,
  };
}

function getDefaultProductPresentation(
  product: Pick<Product, "measurement_unit"> &
    Partial<Pick<Product, "price">> & { id?: string },
): ProductPresentation {
  const isWeight = isWeightBasedProduct(product);

  return {
    id: `default-${product.id ?? "product"}`,
    product_id: product.id ?? "",
    name: isWeight ? "Libra" : "Unidad",
    unit_quantity: 1,
    price: normalizeMoney(product.price ?? 0),
    is_default: true,
    is_active: true,
    use_for_purchase: true,
    use_for_sale: true,
  };
}

export function formatProductStock(
  product: Pick<Product, "stock" | "measurement_unit">,
) {
  const unit = normalizeProductMeasurementUnit(product.measurement_unit);
  return `${formatProductQuantity(product.stock)} ${unit === "lb" ? "lb" : "und"}`;
}

export function formatProductMinimumStock(
  product: Pick<Product, "min_stock" | "measurement_unit">,
) {
  const unit = normalizeProductMeasurementUnit(product.measurement_unit);
  return `${formatProductQuantity(product.min_stock)} ${
    unit === "lb" ? "lb" : "und"
  }`;
}

export function formatProductQuantity(value: unknown) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity)) {
    return "0";
  }

  return Number(quantity.toFixed(3))
    .toString()
    .replace(/\.0+$/, "");
}
