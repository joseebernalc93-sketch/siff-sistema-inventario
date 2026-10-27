import { mockCategories, mockProducts } from "@/lib/mock-data";
import {
  findSimilarCategory,
  slugifyCategory,
} from "@/lib/category-matching";
import {
  findDuplicateProduct,
  PRODUCT_DUPLICATE_MESSAGE,
} from "@/lib/product-matching";
import {
  getOrderTrackingNote,
  ORDER_DELIVERED_AT_LABEL,
  ORDER_DISPATCHED_AT_LABEL,
} from "@/lib/order-tracking";
import {
  isWeightBasedProduct,
  normalizeMoney,
  normalizeOptionalMoney,
  normalizeProductPresentation,
  normalizeProductMeasurementUnit,
} from "@/lib/pricing";
import { getServiceSupabase } from "@/lib/supabase-server";
import type {
  Category,
  Product,
  ProductLot,
  ProductLotPurchaseInput,
  ProductMeasurementUnit,
  ProductPresentation,
  ProductPurchaseHistoryRecord,
  ProductProvider,
  Provider,
} from "@/lib/types";

export type StorageMode = "demo" | "supabase";

export type AdminCatalogResponse = {
  mode: StorageMode;
  categories: Category[];
  products: Product[];
  providers?: Provider[];
};

export type AdminPurchaseHistoryResponse = {
  mode: StorageMode;
  purchases: ProductPurchaseHistoryRecord[];
};

import type { AdminOrderRecord } from "@/lib/types";

export type AdminOrdersResponse = {
  mode: StorageMode;
  orders: AdminOrderRecord[];
};

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSupabase>>;

type ProviderIdentity = {
  id?: string | null;
  name?: string | null;
};

type JoinedProvider = Pick<Provider, "id" | "name"> | Pick<Provider, "id" | "name">[];
type JoinedCategory =
  | Pick<Category, "name" | "slug">
  | Pick<Category, "name" | "slug">[];

type JoinedPurchaseProduct =
  | (Pick<Product, "id" | "name" | "sku" | "measurement_unit" | "price" | "has_iva" | "iva_rate"> & {
      categories?: JoinedCategory | null;
      category?: JoinedCategory | null;
      product_presentations?: Pick<ProductPresentation, "id" | "name" | "unit_quantity" | "price">[] | null;
    })
  | Array<
      Pick<Product, "id" | "name" | "sku" | "measurement_unit" | "price" | "has_iva" | "iva_rate"> & {
        categories?: JoinedCategory | null;
        category?: JoinedCategory | null;
        product_presentations?: Pick<ProductPresentation, "id" | "name" | "unit_quantity" | "price">[] | null;
      }
    >;

type ProductProviderAssociation = {
  product_id: string;
  provider_id?: string | null;
  provider?: JoinedProvider | null;
  providers?: JoinedProvider | null;
};

type ProductLotAssociation = {
  id: string;
  product_id: string;
  provider_id?: string | null;
  quantity_remaining?: number | string | null;
  status?: string | null;
  provider?: JoinedProvider | null;
  providers?: JoinedProvider | null;
};

type ProductPurchaseHistoryAssociation = {
  id: string;
  product_id: string;
  provider_id?: string | null;
  quantity?: number | string | null;
  quantity_unit?: string | null;
  quantity_in_stock_unit?: number | string | null;
  unit_cost?: number | string | null;
  total_cost?: number | string | null;
  purchase_code?: string | null;
  purchase_input_quantity?: number | string | null;
  purchase_input_unit?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  payment_method?: string | null;
  credit_days?: number | string | null;
  iva_rate?: number | string | null;
  iva_amount?: number | string | null;
  line_subtotal?: number | string | null;
  line_total?: number | string | null;
  created_at?: string | null;
  product?: JoinedPurchaseProduct | null;
  products?: JoinedPurchaseProduct | null;
  provider?: JoinedProvider | null;
  providers?: JoinedProvider | null;
};

type ProductPurchaseLotAssociation = {
  id: string;
  purchase_id?: string | null;
  entry_date?: string | null;
  manufacture_date?: string | null;
  expiration_date?: string | null;
  status?: string | null;
  quantity_remaining?: number | string | null;
};

export type CategoryInput = {
  name: string;
  description?: string | null;
};

export type ProviderInput = {
  name: string;
  ruc?: string | null;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export type ProductInput = {
  category_id: string | null;
  name: string;
  sku: string;
  product_code?: string | null;
  description: string | null;
  purchase_cost?: number | null;
  price: number;
  measurement_unit?: ProductMeasurementUnit | null;
  stock: number;
  min_stock: number;
  max_stock?: number;
  image_url: string | null;
  provider?: string | null;
  is_active: boolean;
  has_iva?: boolean | null;
  iva_rate?: number | null;
  requires_dates?: boolean | null;
  entry_date?: string | null;
  manufacture_date?: string | null;
  expiration_date?: string | null;
  presentations?: ProductPresentationInput[];
};

export type ProductPurchaseInput = {
  provider: string;
  quantity: number;
  purchase_unit_quantity?: number | null;
  purchase_cost?: number | null;
  price?: number | null;
  purchase_input_quantity?: number | null;
  purchase_input_unit?: string | null;
  sale_presentation_id?: string | null;
  sale_presentation_name?: string | null;
  sale_presentation_unit_quantity?: number | null;
  sale_presentation_price?: number | null;
  purchase_code?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  payment_method?: string | null;
  credit_days?: number | null;
  iva_rate?: number | null;
  iva_amount?: number | null;
  line_subtotal?: number | null;
  line_total?: number | null;
  product_has_iva?: boolean | null;
  product_iva_rate?: number | null;
  inventory_unit_cost?: number | null;
  requires_dates?: boolean | null;
  entry_date?: string | null;
  manufacture_date?: string | null;
  expiration_date?: string | null;
};

type ProductPurchaseInvoicePayload = {
  credit_days?: number | null;
  invoice_date?: string | null;
  invoice_number?: string | null;
  iva_amount?: number | null;
  iva_rate?: number | null;
  line_subtotal?: number | null;
  line_total?: number | null;
  payment_method?: string | null;
  purchase_code?: string | null;
  purchase_input_quantity?: number | null;
  purchase_input_unit?: string | null;
};

export type ProductPresentationInput = {
  id?: string | null;
  name: string;
  unit_quantity: number;
  price: number;
  is_default?: boolean;
  is_active?: boolean;
  use_for_purchase?: boolean;
  use_for_sale?: boolean;
};

export type ProductLotUpdateInput = {
  provider?: string | null;
  quantity_received?: number;
  quantity_remaining?: number;
  entry_date?: string | null;
  manufacture_date?: string | null;
  expiration_date?: string | null;
  status?: string;
};

export async function getAdminCatalog(): Promise<AdminCatalogResponse> {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo",
      categories: mockCategories,
      products: mockProducts,
    };
  }

  const [
    categoriesResult,
    productsResult,
    providersResult,
    productProvidersResult,
    productLotsResult,
    productLotPurchasesResult,
    productPresentationsResult,
  ] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("products")
      .select("*, categories(name, slug)")
      .order("created_at", { ascending: false }),
    supabase.from("providers").select("*").order("name"),
    supabase
      .from("product_providers")
      .select("*, providers(id, name)")
      .order("last_purchase_at", { ascending: false }),
    supabase
      .from("product_lots")
      .select("*, providers(id, name)")
      .order("entry_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("expiration_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("product_purchases")
      .select("id, purchase_input_quantity, purchase_input_unit"),
    supabase
      .from("product_presentations")
      .select("*")
      .order("is_default", { ascending: false })
      .order("unit_quantity", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  const providers = providersResult.error
    ? []
    : ((providersResult.data ?? []) as Provider[]);
  const productProviders = productProvidersResult.error
    ? []
    : ((productProvidersResult.data ?? []) as ProductProvider[]);
  if (
    productLotsResult.error &&
    !isMissingInventoryTableError(productLotsResult.error.message)
  ) {
    throw new Error(productLotsResult.error.message);
  }
  if (
    productPresentationsResult.error &&
    !isMissingProductPresentationsTableError(
      productPresentationsResult.error.message,
    )
  ) {
    throw new Error(productPresentationsResult.error.message);
  }

  const productLots = productLotsResult.error
    ? []
    : ((productLotsResult.data ?? []) as unknown as ProductLot[]);
  const productLotPurchaseInputs =
    productLotPurchasesResult.error &&
    isMissingPurchaseInvoiceColumnError(productLotPurchasesResult.error.message)
      ? []
      : ((productLotPurchasesResult.data ?? []) as ProductLotPurchaseInput[]);
  const purchaseInputsById = new Map(
    productLotPurchaseInputs
      .filter((purchase) => purchase.id)
      .map((purchase) => [purchase.id as string, purchase]),
  );
  const productLotsWithPurchaseInputs = productLots.map((lot) => {
    const purchaseInput = lot.purchase_id
      ? purchaseInputsById.get(lot.purchase_id)
      : null;

    return purchaseInput
      ? {
          ...lot,
          purchase_input_quantity:
            purchaseInput.purchase_input_quantity === undefined ||
            purchaseInput.purchase_input_quantity === null
              ? null
              : Number(purchaseInput.purchase_input_quantity),
          purchase_input_unit: purchaseInput.purchase_input_unit ?? null,
        }
      : lot;
  });
  const productPresentations = productPresentationsResult.error
    ? []
    : ((productPresentationsResult.data ?? []) as ProductPresentation[]);

  return {
    mode: "supabase",
    categories: categoriesResult.data ?? [],
    products: attachProductInventoryDetails(
      normalizeProducts((productsResult.data ?? []) as Product[]).filter((p) => !p.name.startsWith("__DELETED__")),
      productProviders,
      productLotsWithPurchaseInputs,
      productPresentations,
    ),
    providers,
  };
}

export async function getProductPurchaseHistory(): Promise<AdminPurchaseHistoryResponse> {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo",
      purchases: buildDemoPurchaseHistory(mockProducts),
    };
  }

  const purchasesResult = await supabase
    .from("product_purchases")
    .select(
      [
        "id",
        "product_id",
        "provider_id",
        "quantity",
        "quantity_unit",
        "quantity_in_stock_unit",
        "unit_cost",
        "total_cost",
        "purchase_code",
        "purchase_input_quantity",
        "purchase_input_unit",
        "invoice_number",
        "invoice_date",
        "payment_method",
        "credit_days",
        "iva_rate",
        "iva_amount",
        "line_subtotal",
        "line_total",
        "created_at",
        "products(id, name, sku, measurement_unit, price, has_iva, iva_rate, categories(name, slug), product_presentations(id, name, unit_quantity, price))",
        "providers(id, name)",
      ].join(", "),
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (purchasesResult.error) {
    if (isMissingInventoryTableError(purchasesResult.error.message)) {
      return {
        mode: "supabase",
        purchases: [],
      };
    }

    throw new Error(purchasesResult.error.message);
  }

  const purchaseRows =
    (purchasesResult.data ?? []) as unknown as ProductPurchaseHistoryAssociation[];
  const purchaseIds = purchaseRows.map((purchase) => purchase.id).filter(Boolean);
  const lotsByPurchase = new Map<string, ProductPurchaseLotAssociation>();

  if (purchaseIds.length) {
    const lotsResult = await supabase
      .from("product_lots")
      .select(
        [
          "id",
          "purchase_id",
          "entry_date",
          "manufacture_date",
          "expiration_date",
          "status",
          "quantity_remaining",
        ].join(", "),
      )
      .in("purchase_id", purchaseIds);

    if (
      lotsResult.error &&
      !isMissingInventoryTableError(lotsResult.error.message)
    ) {
      throw new Error(lotsResult.error.message);
    } else if (!lotsResult.error) {
      for (const lot of
        (lotsResult.data ?? []) as unknown as ProductPurchaseLotAssociation[]) {
        if (lot.purchase_id) {
          lotsByPurchase.set(lot.purchase_id, lot);
        }
      }
    }
  }

  return {
    mode: "supabase",
    purchases: purchaseRows.map((purchase) =>
      normalizePurchaseHistoryRecord(purchase, lotsByPurchase.get(purchase.id)),
    ),
  };
}

export async function createCategory(input: CategoryInput) {
  const name = input.name.trim();

  if (!name) {
    throw new Error("El nombre de la categoria es obligatorio.");
  }

  const supabase = getServiceSupabase();
  const payload = {
    name,
    slug: slugifyCategory(name),
    description: input.description?.trim() || null,
  };

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      category: {
        id: `cat-${Date.now()}`,
        ...payload,
      } satisfies Category,
    };
  }

  const existingCategories = await supabase
    .from("categories")
    .select("id, name, slug");

  if (existingCategories.error) {
    throw new Error(existingCategories.error.message);
  }

  if (findSimilarCategory(existingCategories.data ?? [], name)) {
    throw new Error("Categoria Duplicada");
  }

  const { data, error } = await supabase
    .from("categories")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(getCategoryMutationErrorMessage(error.message));
  }

  return {
    mode: "supabase" as StorageMode,
    category: data as Category,
  };
}

export async function updateCategory(id: string, name: string) {
  if (!id) {
    throw new Error("El id de la categoria es obligatorio.");
  }
  if (!name || name.trim() === "") {
    throw new Error("El nombre de la categoria es obligatorio.");
  }

  const supabase = getServiceSupabase();

  const payload: Partial<Category> = {
    name: name.trim(),
  };

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      category: {
        id,
        ...payload,
      },
    };
  }

  const { data, error } = await supabase
    .from("categories")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(getCategoryMutationErrorMessage(error.message));
  }

  return {
    mode: "supabase" as StorageMode,
    category: data as Category,
  };
}

export async function deleteCategory(id: string) {
  if (!id) {
    throw new Error("El id de la categoria es obligatorio.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      categoryId: id,
    };
  }

  const productsResult = await supabase
    .from("products")
    .delete()
    .eq("category_id", id);

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  const categoryResult = await supabase.from("categories").delete().eq("id", id);

  if (categoryResult.error) {
    throw new Error(categoryResult.error.message);
  }

  return {
    mode: "supabase" as StorageMode,
    categoryId: id,
  };
}

export async function deleteProduct(id: string) {
  if (!id) {
    throw new Error("El id del producto es obligatorio.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      productId: id,
    };
  }

  const productResult = await supabase
    .from("products")
    .select("id, category_id, provider")
    .eq("id", id)
    .maybeSingle();

  if (productResult.error) {
    throw new Error(getProductMutationErrorMessage(productResult.error.message));
  }

  const product = productResult.data as Pick<
    Product,
    "id" | "category_id" | "provider"
  > | null;
  const providerIdentities = product
    ? await fetchProductProviderIdentities(supabase, product.id, product.provider)
    : [];

  // Try to hard-delete first
  const result = await supabase.from("products").delete().eq("id", id);

  if (result.error) {
    // 23503 is the PostgreSQL error code for foreign_key_violation
    if (result.error.code === "23503") {
      // Soft delete fallback: rename and hide the product so it doesn't show up in the catalog,
      // but remains in the database to satisfy history table foreign keys.
      await supabase.from("products").update({ 
        name: `__DELETED__${id}`,
        is_active: false,
        stock: 0,
        min_stock: 0,
        price: 0
      }).eq("id", id);
    } else {
      throw new Error(result.error.message);
    }
  }

  const deletedCategoryIds = product?.category_id
    ? await deleteOrphanCategories(supabase, [product.category_id])
    : [];
  const deletedProviderIds = await deleteOrphanProviders(
    supabase,
    providerIdentities,
  );

  return {
    mode: "supabase" as StorageMode,
    productId: id,
    deletedCategoryIds,
    deletedProviderIds,
  };
}

export async function clearAdminCatalog() {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      deletedCategories: 0,
      deletedProducts: 0,
    };
  }

  const productsResult = await supabase
    .from("products")
    .delete({ count: "exact" })
    .neq("id", EMPTY_UUID);

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  const categoriesResult = await supabase
    .from("categories")
    .delete({ count: "exact" })
    .neq("id", EMPTY_UUID);

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  const providersResult = await supabase
    .from("providers")
    .delete({ count: "exact" })
    .neq("id", EMPTY_UUID);

  if (
    providersResult.error &&
    !isMissingProviderTableError(providersResult.error.message)
  ) {
    throw new Error(providersResult.error.message);
  }

  return {
    mode: "supabase" as StorageMode,
    deletedCategories: categoriesResult.count ?? 0,
    deletedProducts: productsResult.count ?? 0,
  };
}

export async function createProvider(input: ProviderInput) {
  const name = input.name.trim();
  const ruc = input.ruc?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const address = input.address?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";

  if (!name) {
    throw new Error("El nombre del proveedor es obligatorio.");
  }

  if (!ruc) {
    throw new Error("El RUC del proveedor es obligatorio.");
  }

  if (!address) {
    throw new Error("La direccion del proveedor es obligatoria.");
  }

  if (!phone) {
    throw new Error("El telefono del proveedor es obligatorio.");
  }

  const supabase = getServiceSupabase();
  const payload = {
    name,
    ruc,
    email: email || null,
    address,
    phone,
    notes: normalizeOptionalText(input.notes),
  };

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      provider: {
        id: `provider-${Date.now()}`,
        ...payload,
      } satisfies Provider,
    };
  }

  const existingProvider = await findProviderByName(supabase, name);

  if (existingProvider) {
    throw new Error("Ya existe un proveedor con ese nombre.");
  }

  const existingProviderByRuc = await findProviderByRuc(supabase, ruc);

  if (existingProviderByRuc) {
    throw new Error("Ya existe un proveedor con ese RUC.");
  }

  const { data, error } = await supabase
    .from("providers")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(getProviderMutationErrorMessage(error.message));
  }

  return {
    mode: "supabase" as StorageMode,
    provider: data as Provider,
  };
}

export async function updateProvider(id: string, input: ProviderInput) {
  const providerId = id.trim();
  const name = input.name?.trim();
  const ruc = input.ruc?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const address = input.address?.trim() ?? "";
  const phone = input.phone?.trim() ?? "";

  if (!providerId) {
    throw new Error("El id del proveedor es obligatorio.");
  }

  if (!name) {
    throw new Error("El nombre del proveedor es obligatorio.");
  }

  if (!ruc) {
    throw new Error("El RUC del proveedor es obligatorio.");
  }

  if (!address) {
    throw new Error("La direccion del proveedor es obligatoria.");
  }

  if (!phone) {
    throw new Error("El telefono del proveedor es obligatorio.");
  }

  const supabase = getServiceSupabase();
  const payload = {
    name,
    ruc,
    address,
    phone,
    notes: normalizeOptionalText(input.notes),
  };

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      provider: {
        id: providerId,
        ...payload,
      } satisfies Provider,
    };
  }

  const currentProviderResult = await supabase
    .from("providers")
    .select("*")
    .eq("id", providerId)
    .maybeSingle();

  if (currentProviderResult.error) {
    throw new Error(
      getProviderMutationErrorMessage(currentProviderResult.error.message),
    );
  }

  const currentProvider = currentProviderResult.data as Provider | null;

  if (!currentProvider) {
    throw new Error("No se encontro el proveedor para editar.");
  }

  const existingProvider = await findProviderByName(supabase, name);

  if (existingProvider && existingProvider.id !== providerId) {
    throw new Error("Ya existe un proveedor con ese nombre.");
  }

  const existingProviderByRuc = await findProviderByRuc(supabase, ruc);

  if (existingProviderByRuc && existingProviderByRuc.id !== providerId) {
    throw new Error("Ya existe un proveedor con ese RUC.");
  }

  const { data, error } = await supabase
    .from("providers")
    .update(payload)
    .eq("id", providerId)
    .select("*")
    .single();

  if (error) {
    throw new Error(getProviderMutationErrorMessage(error.message));
  }

  if (
    currentProvider.name.trim().toLocaleLowerCase("es-EC") !==
    name.toLocaleLowerCase("es-EC")
  ) {
    const legacyProviderUpdate = await supabase
      .from("products")
      .update({ provider: name })
      .ilike("provider", currentProvider.name);

    if (legacyProviderUpdate.error) {
      throw new Error(legacyProviderUpdate.error.message);
    }
  }

  return {
    mode: "supabase" as StorageMode,
    provider: data as Provider,
  };
}

export async function deleteProviders(providerIds: string[]) {
  const ids = [...new Set(providerIds.map((id) => id.trim()).filter(Boolean))];

  if (!ids.length) {
    throw new Error("Selecciona al menos un proveedor.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      providerIds: ids,
      deletedProviders: ids.length,
    };
  }

  const providersResult = await supabase
    .from("providers")
    .select("id, name")
    .in("id", ids);

  if (providersResult.error) {
    throw new Error(getProviderMutationErrorMessage(providersResult.error.message));
  }

  const providersToDelete = (providersResult.data ?? []) as Pick<
    Provider,
    "id" | "name"
  >[];
  const providerDeletion = await removeProvidersFromProducts(
    supabase,
    providersToDelete,
  );

  const deleteResult = await supabase
    .from("providers")
    .delete({ count: "exact" })
    .in("id", ids);

  if (deleteResult.error) {
    throw new Error(getProviderMutationErrorMessage(deleteResult.error.message));
  }

  return {
    mode: "supabase" as StorageMode,
    providerIds: ids,
    deletedProviders: deleteResult.count ?? ids.length,
    deletedProductIds: providerDeletion.deletedProductIds,
    updatedProductIds: providerDeletion.updatedProductIds,
    deletedCategoryIds: providerDeletion.deletedCategoryIds,
  };
}

export async function createProduct(input: ProductInput) {
  validateProduct(input);

  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      product: {
        ...input,
        id: `prod-${Date.now()}`,
        categories: null,
        presentations: [],
      } satisfies Product,
    };
  }

  const duplicateProduct = await findExistingProduct(supabase, input);

  if (duplicateProduct) {
    return mergeDuplicateProductPurchase(supabase, duplicateProduct, input);
  }

  const productPayload = getProductTablePayload(input);
  let productInsert = await supabase
    .from("products")
    .insert(productPayload)
    .select("*, categories(name, slug)")
    .single();

  if (
    productInsert.error &&
    isMissingOptionalProductColumnError(productInsert.error.message)
  ) {
    productInsert = await supabase
      .from("products")
      .insert(omitMissingOptionalProductFields(productPayload, productInsert.error.message))
      .select("*, categories(name, slug)")
      .single();
  }

  const { data, error } = productInsert;

  if (error) {
    throw new Error(getProductMutationErrorMessage(error.message));
  }

  await registerProductProviderPurchase(supabase, data as Product, input, {
    updateProductStock: false,
  });
  await syncProductPresentations(supabase, (data as Product).id, input);

  return {
    mode: "supabase" as StorageMode,
    product: normalizeProduct(data as Product),
    merged: false,
  };
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  if (!id) {
    throw new Error("El id del producto es obligatorio.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      product: {
        id,
        ...input,
      },
    };
  }

  if (input.name || input.sku) {
    await assertUniqueProduct(supabase, input, id);
  }

  if (
    input.product_code &&
    normalizeProductCodeValue(input.product_code)?.length !== 13
  ) {
    throw new Error("El codigo de producto debe tener 13 digitos.");
  }

  const currentProduct = input.stock === undefined
    ? null
    : await fetchProductForStockReconciliation(supabase, id);

  let productUpdate = await supabase
    .from("products")
    .update(getProductTablePayload(input))
    .eq("id", id)
    .select("*, categories(name, slug)")
    .single();

  if (
    productUpdate.error &&
    isMissingOptionalProductColumnError(productUpdate.error.message)
  ) {
    productUpdate = await supabase
      .from("products")
      .update(
        omitMissingOptionalProductFields(
          getProductTablePayload(input),
          productUpdate.error.message,
        ),
      )
      .eq("id", id)
      .select("*, categories(name, slug)")
      .single();
  }

  const { data, error } = productUpdate;

  if (error) {
    throw new Error(getProductMutationErrorMessage(error.message));
  }

  if (currentProduct && input.stock !== undefined) {
    await reconcileProductLotsWithStockChange(
      supabase,
      currentProduct,
      data as Product,
      Number(input.stock),
    );
  }
  await syncProductPresentations(supabase, id, input);
  if (input.provider !== undefined) {
    await setProductPrimaryProvider(supabase, id, (data as Product).provider);
  }

  return {
    mode: "supabase" as StorageMode,
    product: normalizeProduct(data as Product),
  };
}

export async function addProductPurchase(
  id: string,
  input: ProductPurchaseInput,
) {
  if (!id) {
    throw new Error("El id del producto es obligatorio.");
  }

  validateProductPurchase(input);

  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      product: null,
    };
  }

  const product = await fetchProductForStockReconciliation(supabase, id);
  const measurementUnit = normalizeProductMeasurementUnit(
    product.measurement_unit,
  );
  const quantity = Number(input.quantity) || 0;

  if (measurementUnit !== "lb" && !Number.isInteger(quantity)) {
    throw new Error("Los productos por unidad deben ingresar cantidades enteras.");
  }

  const currentStock = Number(product.stock) || 0;
  const nextStock = Number((currentStock + quantity).toFixed(3));
  const providerName = input.provider.trim();
  const purchaseCost = normalizeOptionalMoney(input.purchase_cost) ?? 0;
  const inventoryUnitCost =
    normalizeOptionalMoney(input.inventory_unit_cost) ?? purchaseCost;
  const presentationUnitQuantity = Math.max(
    1,
    Number(input.purchase_unit_quantity) || 1,
  );
  const salePrice = normalizeOptionalMoney(input.price) ?? normalizeMoney(product.price);
  const requiresDates = input.requires_dates ?? product.requires_dates ?? false;
  const registrationInput: ProductInput = {
    category_id: product.category_id ?? null,
    name: product.name,
    sku: product.sku,
    description: product.description ?? null,
    purchase_cost: inventoryUnitCost,
    price: salePrice,
    measurement_unit: measurementUnit,
    stock: quantity,
    min_stock: Number(product.min_stock) || 0,
    max_stock: product.max_stock,
    image_url: product.image_url ?? null,
    provider: providerName,
    is_active: product.is_active,
    has_iva: input.product_has_iva ?? product.has_iva ?? false,
    iva_rate: input.product_iva_rate ?? product.iva_rate ?? 0,
    requires_dates: requiresDates,
    entry_date: input.entry_date ?? null,
    manufacture_date: requiresDates ? input.manufacture_date ?? null : null,
    expiration_date: requiresDates ? input.expiration_date ?? null : null,
  };
  const updatePayload: Partial<ProductInput> = {
    stock: nextStock,
    purchase_cost: inventoryUnitCost,
    price: salePrice,
    provider: providerName,
    has_iva: input.product_has_iva ?? product.has_iva ?? false,
    iva_rate: input.product_iva_rate ?? product.iva_rate ?? 0,
    requires_dates: requiresDates,
    entry_date: input.entry_date ?? product.entry_date ?? null,
    expiration_date: requiresDates
      ? getMergedExpirationDate(product, registrationInput)
      : null,
    manufacture_date:
      requiresDates ? input.manufacture_date ?? product.manufacture_date ?? null : null,
  };

  let productUpdate = await supabase
    .from("products")
    .update(getProductTablePayload(updatePayload))
    .eq("id", id)
    .select("*, categories(name, slug)")
    .single();

  if (
    productUpdate.error &&
    isMissingOptionalProductColumnError(productUpdate.error.message)
  ) {
    productUpdate = await supabase
      .from("products")
      .update(
        omitMissingOptionalProductFields(
          getProductTablePayload(updatePayload),
          productUpdate.error.message,
        ),
      )
      .eq("id", id)
      .select("*, categories(name, slug)")
      .single();
  }

  const { data, error } = productUpdate;

  if (error) {
    throw new Error(getProductMutationErrorMessage(error.message));
  }

  await registerProductProviderPurchase(
    supabase,
    data as Product,
    registrationInput,
    {
      invoice: getProductPurchaseInvoicePayload(input),
      purchaseRecordCost: purchaseCost,
      quantity,
      updateProductStock: false,
    },
  );

  // Sync the default presentation's price with the new product base price
  await supabase
    .from("product_presentations")
    .update({ price: salePrice })
    .eq("product_id", id)
    .or("is_default.eq.true,unit_quantity.eq.1");

  await updateProductPresentationPrice(supabase, id, input);

  return {
    mode: "supabase" as StorageMode,
    product: normalizeProduct(data as Product),
  };
}

export async function deleteProductLot(productId: string, lotId: string) {
  if (!productId || !lotId) {
    throw new Error("El producto y la existencia son obligatorios.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      productId,
      lotId,
    };
  }

  const lotResult = await supabase
    .from("product_lots")
    .select("*")
    .eq("id", lotId)
    .eq("product_id", productId)
    .single();

  if (lotResult.error) {
    if (isMissingInventoryTableError(lotResult.error.message)) {
      throw new Error("Ejecuta primero el SQL de inventario en Supabase.");
    }

    throw new Error(lotResult.error.message);
  }

  const lot = lotResult.data as ProductLot;
  const product = await fetchProductForStockReconciliation(supabase, productId);
  const remainingQuantity = getAvailableLotStockQuantity(lot);
  const nextStock = Number(
    Math.max(0, (Number(product.stock) || 0) - remainingQuantity).toFixed(3),
  );

  const productUpdate = await supabase
    .from("products")
    .update({ stock: nextStock })
    .eq("id", productId)
    .select("*, categories(name, slug)")
    .single();

  if (productUpdate.error) {
    throw new Error(getProductMutationErrorMessage(productUpdate.error.message));
  }

  const deleteResult = await supabase
    .from("product_lots")
    .delete()
    .eq("id", lotId)
    .eq("product_id", productId);

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  if (remainingQuantity > 0) {
    await insertStockMovement(supabase, {
      productId,
      movementType: "adjustment",
      quantity: Number((remainingQuantity * -1).toFixed(3)),
      reason: "Eliminacion de existencia",
    });
  }

  return {
    mode: "supabase" as StorageMode,
    product: normalizeProduct(productUpdate.data as Product),
    lotId,
    removedQuantity: remainingQuantity,
  };
}

export async function updateProductLot(
  productId: string,
  lotId: string,
  input: ProductLotUpdateInput,
) {
  if (!productId || !lotId) {
    throw new Error("El producto y la existencia son obligatorios.");
  }

  validateProductLotUpdate(input);

  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo" as StorageMode,
      productId,
      lotId,
    };
  }

  const lotResult = await supabase
    .from("product_lots")
    .select("*, providers(id, name)")
    .eq("id", lotId)
    .eq("product_id", productId)
    .single();

  if (lotResult.error) {
    if (isMissingInventoryTableError(lotResult.error.message)) {
      throw new Error("Ejecuta primero el SQL de inventario en Supabase.");
    }

    throw new Error(lotResult.error.message);
  }

  const product = await fetchProductForStockReconciliation(supabase, productId);
  const currentLot = normalizeProductLot(lotResult.data as ProductLot);
  const previousAvailableQuantity = getAvailableLotStockQuantity(currentLot);
  const nextReceived =
    input.quantity_received ?? Number(currentLot.quantity_received) ?? 0;
  const nextRemaining =
    input.quantity_remaining ?? Number(currentLot.quantity_remaining) ?? 0;
  const nextStatus = normalizeProductLotStatus(
    input.status ?? currentLot.status ?? "available",
  );

  if (nextRemaining > nextReceived) {
    throw new Error("La cantidad disponible no puede superar la ingresada.");
  }

  const provider =
    input.provider !== undefined
      ? await resolveProductLotProvider(supabase, currentLot, input.provider)
      : currentLot.provider ?? null;
  const nextLotForStock: Pick<ProductLot, "quantity_remaining" | "status"> = {
    quantity_remaining: nextRemaining,
    status: nextStatus,
  };
  const nextAvailableQuantity = getAvailableLotStockQuantity(nextLotForStock);
  const stockDelta = Number(
    (nextAvailableQuantity - previousAvailableQuantity).toFixed(3),
  );
  const nextStock = Number(
    Math.max(0, (Number(product.stock) || 0) + stockDelta).toFixed(3),
  );

  const lotUpdatePayload = {
    provider_id: provider?.id ?? null,
    quantity_received: nextReceived,
    quantity_remaining: nextRemaining,
    entry_date:
      input.entry_date === undefined
        ? currentLot.entry_date ?? null
        : input.entry_date,
    manufacture_date:
      input.manufacture_date === undefined
        ? currentLot.manufacture_date ?? null
        : input.manufacture_date,
    expiration_date:
      input.expiration_date === undefined
        ? currentLot.expiration_date ?? null
        : input.expiration_date,
    status: nextStatus,
  };
  const lotUpdate = await supabase
    .from("product_lots")
    .update(lotUpdatePayload)
    .eq("id", lotId)
    .eq("product_id", productId);

  if (lotUpdate.error) {
    throw new Error(lotUpdate.error.message);
  }

  const productPayload: Partial<ProductInput> = {
    stock: nextStock,
  };

  if (provider && !product.provider?.trim()) {
    productPayload.provider = provider.name;
  }

  const productUpdate = await supabase
    .from("products")
    .update(productPayload)
    .eq("id", productId)
    .select("*, categories(name, slug)")
    .single();

  if (productUpdate.error) {
    throw new Error(getProductMutationErrorMessage(productUpdate.error.message));
  }

  if (provider) {
    await upsertProductProvider(supabase, {
      isPrimary:
        !product.provider?.trim() ||
        product.provider.trim().toLocaleLowerCase("es-EC") ===
          provider.name.trim().toLocaleLowerCase("es-EC"),
      productId,
      provider,
      purchaseCost: normalizeOptionalMoney(currentLot.unit_cost) ?? 0,
      quantity: nextReceived,
      purchaseUnit: normalizeProductMeasurementUnit(currentLot.quantity_unit),
    });
  }

  if (stockDelta) {
    await insertStockMovement(supabase, {
      productId,
      movementType: "adjustment",
      quantity: stockDelta,
      reason: "Edicion de existencia",
    });
  }

  return {
    mode: "supabase" as StorageMode,
    product: normalizeProduct(productUpdate.data as Product),
    lotId,
  };
}

function getProductTablePayload<T extends Partial<ProductInput>>(input: T) {
  const {
    presentations: omittedPresentations,
    ...payload
  } = input;
  void omittedPresentations;

  if ("product_code" in payload) {
    payload.product_code = normalizeProductCodeValue(payload.product_code);
  }

  return payload;
}

function omitMissingOptionalProductFields<T extends Partial<ProductInput>>(
  input: T,
  message: string,
) {
  const payload: Partial<ProductInput> = { ...input };

  if (isMissingProductIvaColumnError(message)) {
    delete payload.has_iva;
    delete payload.iva_rate;
  }

  if (isMissingProductRequiresDatesColumnError(message)) {
    delete payload.requires_dates;
  }

  return payload;
}

function getProductPurchaseInvoicePayload(
  input: ProductPurchaseInput,
): ProductPurchaseInvoicePayload {
  return {
    credit_days: input.credit_days ?? null,
    invoice_date: input.invoice_date ?? input.entry_date ?? null,
    invoice_number: normalizeOptionalText(input.invoice_number),
    iva_amount: normalizeOptionalMoney(input.iva_amount) ?? 0,
    iva_rate: normalizeOptionalMoney(input.iva_rate) ?? 0,
    line_subtotal: normalizeOptionalMoney(input.line_subtotal) ?? null,
    line_total: normalizeOptionalMoney(input.line_total) ?? null,
    payment_method: normalizeOptionalText(input.payment_method),
    purchase_code: normalizeOptionalText(input.purchase_code),
    purchase_input_quantity: Number.isFinite(Number(input.purchase_input_quantity))
      ? Number(input.purchase_input_quantity)
      : null,
    purchase_input_unit: normalizeOptionalText(input.purchase_input_unit),
  };
}

async function syncProductPresentations(
  supabase: ServiceSupabase,
  productId: string,
  input: Partial<ProductInput>,
) {
  if (!input.presentations) {
    return;
  }

  const presentations = normalizePresentationInputs(
    input.presentations,
    input.price,
    input.measurement_unit,
  );
  const requiresPresentationTable = hasCustomProductPresentations(
    presentations,
    input,
  );

  const deleteResult = await supabase
    .from("product_presentations")
    .delete()
    .eq("product_id", productId);

  if (deleteResult.error) {
    if (isMissingProductPresentationsTableError(deleteResult.error.message)) {
      if (requiresPresentationTable) {
        throw new Error(getMissingProductPresentationsTableMessage());
      }

      return;
    }

    throw new Error(deleteResult.error.message);
  }

  if (!presentations.length) {
    return;
  }

  const presentationRows = presentations.map((presentation) => ({
      product_id: productId,
      name: presentation.name,
      unit_quantity: presentation.unit_quantity,
      price: presentation.price,
      is_default: presentation.is_default,
      is_active: presentation.is_active,
      use_for_purchase: presentation.use_for_purchase,
      use_for_sale: presentation.use_for_sale,
    }));
  let insertResult = await supabase
    .from("product_presentations")
    .insert(presentationRows);

  if (
    insertResult.error &&
    isMissingPresentationUsageColumnError(insertResult.error.message)
  ) {
    insertResult = await supabase.from("product_presentations").insert(
      presentationRows.map(
        ({ use_for_purchase: omittedPurchase, use_for_sale: omittedSale, ...row }) => {
          void omittedPurchase;
          void omittedSale;
          return row;
        },
      ),
    );
  }

  if (insertResult.error) {
    if (isMissingProductPresentationsTableError(insertResult.error.message)) {
      if (requiresPresentationTable) {
        throw new Error(getMissingProductPresentationsTableMessage());
      }

      return;
    }

    throw new Error(insertResult.error.message);
  }
}

async function updateProductPresentationPrice(
  supabase: ServiceSupabase,
  productId: string,
  input: ProductPurchaseInput,
) {
  const presentationId = input.sale_presentation_id?.trim();
  const presentationName = input.sale_presentation_name?.trim() ?? "";
  const rawPresentationUnitQuantity = Number(
    input.sale_presentation_unit_quantity ?? input.purchase_unit_quantity,
  );
  const presentationUnitQuantity =
    Number.isFinite(rawPresentationUnitQuantity) &&
    rawPresentationUnitQuantity > 0
      ? rawPresentationUnitQuantity
      : 1;
  const presentationPrice = normalizeOptionalMoney(input.sale_presentation_price);

  if (presentationPrice === null) {
    return;
  }

  if (presentationId && !presentationId.startsWith("default-")) {
    const result = await supabase
      .from("product_presentations")
      .update({
        ...(presentationName ? { name: presentationName } : {}),
        unit_quantity: presentationUnitQuantity,
        price: presentationPrice,
      })
      .eq("id", presentationId)
      .eq("product_id", productId);

    if (result.error) {
      if (isMissingProductPresentationsTableError(result.error.message)) {
        throw new Error(getMissingProductPresentationsTableMessage());
      }

      throw new Error(result.error.message);
    }

    return;
  }

  if (!presentationName || presentationUnitQuantity <= 0) {
    return;
  }

  const existingResult = await supabase
    .from("product_presentations")
    .select("id, name, unit_quantity")
    .eq("product_id", productId)
    .eq("is_active", true);

  if (existingResult.error) {
    if (isMissingProductPresentationsTableError(existingResult.error.message)) {
      throw new Error(getMissingProductPresentationsTableMessage());
    }

    throw new Error(existingResult.error.message);
  }

  const existingPresentation = (
    (existingResult.data ?? []) as Pick<
      ProductPresentation,
      "id" | "name" | "unit_quantity"
    >[]
  ).find(
    (presentation) =>
      normalizePresentationLookupText(presentation.name) ===
      normalizePresentationLookupText(presentationName),
  );

  if (existingPresentation) {
    const updateResult = await supabase
      .from("product_presentations")
      .update({
        name: presentationName,
        unit_quantity: presentationUnitQuantity,
        price: presentationPrice,
      })
      .eq("id", existingPresentation.id)
      .eq("product_id", productId);

    if (updateResult.error) {
      if (isMissingProductPresentationsTableError(updateResult.error.message)) {
        throw new Error(getMissingProductPresentationsTableMessage());
      }

      throw new Error(updateResult.error.message);
    }

    return;
  }

  const insertResult = await supabase.from("product_presentations").insert({
    product_id: productId,
    name: presentationName,
    unit_quantity: presentationUnitQuantity,
    price: presentationPrice,
    is_default: false,
    is_active: true,
  });

  if (insertResult.error) {
    if (isMissingProductPresentationsTableError(insertResult.error.message)) {
      throw new Error(getMissingProductPresentationsTableMessage());
    }

    throw new Error(insertResult.error.message);
  }
}

function normalizePresentationLookupText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es-EC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function hasCustomProductPresentations(
  presentations: ReturnType<typeof normalizePresentationInputs>,
  product: Partial<ProductInput>,
) {
  const measurementUnit = normalizeProductMeasurementUnit(
    product.measurement_unit,
  );
  const defaultName = measurementUnit === "lb" ? "Libra" : "Unidad";
  const productPrice = normalizeMoney(product.price ?? 0);

  return presentations.some(
    (presentation) =>
      presentation.unit_quantity !== 1 ||
      presentation.name.trim().toLocaleLowerCase("es-EC") !==
        defaultName.toLocaleLowerCase("es-EC") ||
      normalizeMoney(presentation.price) !== productPrice ||
      !presentation.use_for_purchase ||
      !presentation.use_for_sale,
  );
}

function getMissingProductPresentationsTableMessage() {
  return (
    "Para guardar presentaciones de venta primero ejecuta " +
    "supabase/product-presentations.sql en Supabase."
  );
}

function normalizePresentationInputs(
  presentations: ProductPresentationInput[],
  productPrice?: number | null,
  measurementUnitValue?: ProductMeasurementUnit | null,
) {
  const measurementUnit = normalizeProductMeasurementUnit(measurementUnitValue);
  const isBulk = measurementUnit === "lb";
  const normalized = presentations
    .map((presentation) => ({
      name: presentation.name.trim(),
      unit_quantity: Number(presentation.unit_quantity),
      price: normalizeMoney(presentation.price),
      is_default: isBulk ? false : Boolean(presentation.is_default),
      is_active: presentation.is_active !== false,
      use_for_purchase: presentation.use_for_purchase !== false,
      use_for_sale: presentation.use_for_sale !== false,
    }))
    .filter(
      (presentation) =>
        presentation.name &&
        Number.isFinite(presentation.unit_quantity) &&
        presentation.unit_quantity > 0 &&
        Number.isFinite(presentation.price) &&
        presentation.price >= 0,
    );

  const firstActiveSaleIndex = normalized.findIndex(
    (presentation) =>
      presentation.is_active &&
      presentation.use_for_sale &&
      presentation.unit_quantity === 1,
  );
  const defaultIndex = normalized.findIndex(
    (presentation) =>
      presentation.is_active &&
      presentation.use_for_sale &&
      presentation.unit_quantity === 1 &&
      presentation.is_default,
  );

  normalized.forEach((presentation, index) => {
    presentation.is_default =
      !isBulk &&
      presentation.use_for_sale &&
      presentation.unit_quantity === 1 &&
      index ===
        (defaultIndex >= 0 ? defaultIndex : Math.max(firstActiveSaleIndex, 0));
  });

  const normalizedProductPrice = normalizeOptionalMoney(productPrice);

  if (!isBulk && normalizedProductPrice !== null) {
    const resolvedDefaultIndex = normalized.findIndex(
      (presentation) =>
        presentation.is_active &&
        presentation.use_for_sale &&
        presentation.unit_quantity === 1 &&
        presentation.is_default,
    );

    if (resolvedDefaultIndex >= 0) {
      normalized[resolvedDefaultIndex].price = normalizedProductPrice;
    }
  }

  return normalized;
}

async function assertUniqueProduct(
  supabase: ServiceSupabase,
  product: {
    id?: string | null;
    name?: string | null;
    sku?: string | null;
  },
  ignoredProductId?: string,
) {
  const existingProducts = await supabase
    .from("products")
    .select("id, name, sku");

  if (existingProducts.error) {
    throw new Error(existingProducts.error.message);
  }

  const duplicateProduct = findDuplicateProduct(existingProducts.data ?? [], {
    id: ignoredProductId ?? product.id ?? null,
    name: product.name ?? null,
    sku: product.sku ?? null,
  });

  if (duplicateProduct) {
    throw new Error(PRODUCT_DUPLICATE_MESSAGE);
  }
}

async function findExistingProduct(
  supabase: ServiceSupabase,
  product: {
    id?: string | null;
    name?: string | null;
    sku?: string | null;
  },
) {
  const existingProducts = await supabase
    .from("products")
    .select("*, categories(name, slug)");

  if (existingProducts.error) {
    throw new Error(existingProducts.error.message);
  }

  return findDuplicateProduct((existingProducts.data ?? []) as Product[], {
    id: product.id ?? null,
    name: product.name ?? null,
    sku: product.sku ?? null,
  }) as Product | null;
}

async function mergeDuplicateProductPurchase(
  supabase: ServiceSupabase,
  product: Product,
  input: ProductInput,
) {
  const currentStock = Number(product.stock) || 0;
  const incomingStock = Number(input.stock) || 0;
  const nextStock = Number((currentStock + incomingStock).toFixed(3));
  const nextPurchaseCost = getMergedPurchaseCost(product, input, incomingStock);
  const incomingPrice = normalizeOptionalMoney(input.price);
  const requiresDates = input.requires_dates ?? product.requires_dates ?? false;
  const updatePayload: Partial<ProductInput> = {
    stock: nextStock,
    purchase_cost: nextPurchaseCost,
    price:
      incomingStock > 0 && incomingPrice !== null && incomingPrice > 0
        ? incomingPrice
        : normalizeMoney(product.price),
    provider: product.provider?.trim() || input.provider?.trim() || null,
    has_iva: input.has_iva ?? product.has_iva ?? false,
    iva_rate: input.iva_rate ?? product.iva_rate ?? 0,
    requires_dates: requiresDates,
    entry_date: input.entry_date ?? product.entry_date ?? null,
    expiration_date: requiresDates ? getMergedExpirationDate(product, input) : null,
    ...(input.manufacture_date !== undefined
      ? {
          manufacture_date:
            requiresDates ? input.manufacture_date ?? product.manufacture_date ?? null : null,
        }
      : requiresDates
        ? {}
        : { manufacture_date: null }),
    ...(product.name.startsWith("__DELETED__")
      ? {
          name: input.name ?? product.name.replace(/^__DELETED__/, ""),
          is_active: true,
        }
      : {}),
  };

  let productUpdate = await supabase
    .from("products")
    .update(getProductTablePayload(updatePayload))
    .eq("id", product.id)
    .select("*, categories(name, slug)")
    .single();

  if (
    productUpdate.error &&
    isMissingOptionalProductColumnError(productUpdate.error.message)
  ) {
    productUpdate = await supabase
      .from("products")
      .update(
        omitMissingOptionalProductFields(
          getProductTablePayload(updatePayload),
          productUpdate.error.message,
        ),
      )
      .eq("id", product.id)
      .select("*, categories(name, slug)")
      .single();
  }

  const { data, error } = productUpdate;

  if (error) {
    throw new Error(getProductMutationErrorMessage(error.message));
  }

  await registerProductProviderPurchase(supabase, data as Product, input, {
    quantity: incomingStock,
    updateProductStock: false,
  });
  await syncProductPresentations(supabase, product.id, input);

  return {
    mode: "supabase" as StorageMode,
    product: normalizeProduct(data as Product),
    merged: true,
  };
}

function getMergedPurchaseCost(
  product: Product,
  input: ProductInput,
  incomingStock: number,
) {
  const incomingCost = normalizeOptionalMoney(input.purchase_cost);

  if (!incomingCost || incomingStock <= 0) {
    return normalizeOptionalMoney(product.purchase_cost) ?? 0;
  }

  const currentStock = Number(product.stock) || 0;
  const currentCost = normalizeOptionalMoney(product.purchase_cost) ?? 0;
  const nextStock = currentStock + incomingStock;

  if (nextStock <= 0) {
    return incomingCost;
  }

  return Number(
    (
      (currentStock * currentCost + incomingStock * incomingCost) /
      nextStock
    ).toFixed(2),
  );
}

function getMergedExpirationDate(product: Product, input: ProductInput) {
  if (!input.expiration_date) {
    return product.expiration_date ?? null;
  }

  if (!product.expiration_date) {
    return input.expiration_date;
  }

  return input.expiration_date < product.expiration_date
    ? input.expiration_date
    : product.expiration_date;
}

async function registerProductProviderPurchase(
  supabase: ServiceSupabase,
  product: Product,
  input: ProductInput,
  options: {
    invoice?: ProductPurchaseInvoicePayload;
    purchaseRecordCost?: number;
    quantity?: number;
    updateProductStock: boolean;
  },
) {
  const providerName = input.provider?.trim();
  const provider = providerName
    ? await ensureProvider(supabase, providerName)
    : null;

  const quantity = Number(options.quantity ?? input.stock) || 0;
  const purchaseCost = normalizeOptionalMoney(input.purchase_cost) ?? 0;
  const purchaseRecordCost =
    normalizeOptionalMoney(options.purchaseRecordCost) ?? purchaseCost;
  const purchaseUnit = isWeightBasedProduct(input) ? "lb" : "unit";

  if (provider) {
    const isPrimary =
      !product.provider?.trim() ||
      product.provider.trim().toLocaleLowerCase("es-EC") ===
        provider.name.trim().toLocaleLowerCase("es-EC");

    await upsertProductProvider(supabase, {
      isPrimary,
      productId: product.id,
      provider,
      purchaseCost,
      quantity,
      purchaseUnit,
    });
  }

  if (quantity > 0) {
    const purchaseId = await insertProductPurchase(supabase, {
      productId: product.id,
      providerId: provider?.id ?? null,
      quantity,
      purchaseUnit,
      purchaseCost: purchaseRecordCost,
      invoice: options.invoice,
    });
    const lotId = await insertProductLot(supabase, {
      productId: product.id,
      providerId: provider?.id ?? null,
      purchaseId,
      quantity,
      purchaseUnit,
      purchaseCost,
      entryDate: input.entry_date ?? null,
      manufactureDate: input.manufacture_date ?? null,
      expirationDate: input.expiration_date ?? null,
    });

    await insertStockMovement(supabase, {
      productId: product.id,
      lotId,
      movementType: "in",
      quantity,
      reason: provider ? `Compra a ${provider.name}` : "Compra sin proveedor",
    });
  }
}

async function insertProductPurchase(
  supabase: ServiceSupabase,
  input: {
    productId: string;
    providerId: string | null;
    quantity: number;
    purchaseUnit: string;
    purchaseCost: number;
    invoice?: ProductPurchaseInvoicePayload;
  },
) {
  const payload = {
    product_id: input.productId,
    provider_id: input.providerId,
    quantity: input.quantity,
    quantity_unit: input.purchaseUnit,
    quantity_in_stock_unit: input.quantity,
    unit_cost: input.purchaseCost,
    total_cost:
      normalizeOptionalMoney(input.invoice?.line_total) ??
      Number((input.quantity * input.purchaseCost).toFixed(2)),
    ...(input.invoice ?? {}),
  };
  const { data, error } = await supabase
    .from("product_purchases")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    if (isMissingPurchaseInvoiceColumnError(error.message) && input.invoice) {
      const fallbackPayload = {
        product_id: input.productId,
        provider_id: input.providerId,
        quantity: input.quantity,
        quantity_unit: input.purchaseUnit,
        quantity_in_stock_unit: input.quantity,
        unit_cost: input.purchaseCost,
        total_cost:
          normalizeOptionalMoney(input.invoice?.line_total) ??
          Number((input.quantity * input.purchaseCost).toFixed(2)),
      };
      const fallbackResult = await supabase
        .from("product_purchases")
        .insert(fallbackPayload)
        .select("id")
        .single();

      if (!fallbackResult.error) {
        return (fallbackResult.data as { id?: string } | null)?.id ?? null;
      }

      if (
        isMissingInventoryTableError(fallbackResult.error.message) ||
        isDecimalInventorySchemaError(fallbackResult.error.message)
      ) {
        return null;
      }

      throw new Error(fallbackResult.error.message);
    }

    if (
      isMissingInventoryTableError(error.message) ||
      isDecimalInventorySchemaError(error.message)
    ) {
      return null;
    }

    throw new Error(error.message);
  }

  return (data as { id?: string } | null)?.id ?? null;
}

async function insertProductLot(
  supabase: ServiceSupabase,
  input: {
    productId: string;
    providerId: string | null;
    purchaseId: string | null;
    quantity: number;
    purchaseUnit: string;
    purchaseCost: number;
    entryDate: string | null;
    manufactureDate: string | null;
    expirationDate: string | null;
  },
) {
  const payload = {
    product_id: input.productId,
    provider_id: input.providerId,
    purchase_id: input.purchaseId,
    quantity_received: input.quantity,
    quantity_remaining: input.quantity,
    quantity_unit: input.purchaseUnit,
    unit_cost: input.purchaseCost,
    entry_date: input.entryDate,
    manufacture_date: input.manufactureDate,
    expiration_date: input.expirationDate,
    status: "available",
  };
  const { data, error } = await supabase
    .from("product_lots")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    if (
      isMissingInventoryTableError(error.message) ||
      isDecimalInventorySchemaError(error.message)
    ) {
      return null;
    }

    throw new Error(error.message);
  }

  return (data as { id?: string } | null)?.id ?? null;
}

async function insertStockMovement(
  supabase: ServiceSupabase,
  input: {
    productId: string;
    lotId?: string | null;
    movementType: "in" | "out" | "adjustment";
    quantity: number;
    reason: string;
    orderId?: string | null;
  },
) {
  const payload = {
    product_id: input.productId,
    lot_id: input.lotId ?? null,
    movement_type: input.movementType,
    quantity: input.quantity,
    reason: input.reason,
    order_id: input.orderId ?? null,
  };

  const result = await supabase.from("stock_movements").insert(payload);

  if (
    result.error &&
    input.lotId &&
    isMissingStockMovementLotColumnError(result.error.message)
  ) {
    const fallbackResult = await supabase.from("stock_movements").insert({
      product_id: input.productId,
      movement_type: input.movementType,
      quantity: input.quantity,
      reason: input.reason,
      order_id: input.orderId ?? null,
    });

    if (
      fallbackResult.error &&
      !isDecimalInventorySchemaError(fallbackResult.error.message)
    ) {
      throw new Error(fallbackResult.error.message);
    }

    return;
  }

  if (
    result.error &&
    !isMissingInventoryTableError(result.error.message) &&
    !isDecimalInventorySchemaError(result.error.message)
  ) {
    throw new Error(result.error.message);
  }
}

async function fetchProductForStockReconciliation(
  supabase: ServiceSupabase,
  id: string,
) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(getProductMutationErrorMessage(error.message));
  }

  return data as Product;
}

async function reconcileProductLotsWithStockChange(
  supabase: ServiceSupabase,
  previousProduct: Product,
  savedProduct: Product,
  nextStock: number,
) {
  const previousStock = Number(previousProduct.stock) || 0;
  const delta = Number((nextStock - previousStock).toFixed(3));

  if (!delta) {
    return;
  }

  if (delta > 0) {
    const providerName =
      savedProduct.provider?.trim() || previousProduct.provider?.trim() || "";
    const provider = providerName
      ? await ensureProvider(supabase, providerName)
      : null;
    const mergedIntoExistingLot = await increaseSingleAvailableProductLot(
      supabase,
      savedProduct,
      delta,
    );

    if (mergedIntoExistingLot) {
      await insertStockMovement(supabase, {
        productId: savedProduct.id,
        movementType: "adjustment",
        quantity: delta,
        reason: "Ajuste manual de stock",
      });
      return;
    }

    await insertProductLot(supabase, {
      productId: savedProduct.id,
      providerId: provider?.id ?? null,
      purchaseId: null,
      quantity: delta,
      purchaseUnit: isWeightBasedProduct(savedProduct) ? "lb" : "unit",
      purchaseCost: normalizeOptionalMoney(savedProduct.purchase_cost) ?? 0,
      entryDate: savedProduct.entry_date ?? previousProduct.entry_date ?? null,
      manufactureDate:
        savedProduct.manufacture_date ?? previousProduct.manufacture_date ?? null,
      expirationDate:
        savedProduct.expiration_date ?? previousProduct.expiration_date ?? null,
    });
    await insertStockMovement(supabase, {
      productId: savedProduct.id,
      movementType: "adjustment",
      quantity: delta,
      reason: "Ajuste manual de stock",
    });
    return;
  }

  await reduceProductLots(supabase, savedProduct.id, Math.abs(delta));
  await insertStockMovement(supabase, {
    productId: savedProduct.id,
    movementType: "adjustment",
    quantity: delta,
    reason: "Ajuste manual de stock",
  });
}

async function increaseSingleAvailableProductLot(
  supabase: ServiceSupabase,
  product: Product,
  delta: number,
) {
  const lotsResult = await supabase
    .from("product_lots")
    .select("id, quantity_received, quantity_remaining, status")
    .eq("product_id", product.id)
    .gt("quantity_remaining", 0)
    .eq("status", "available");

  if (lotsResult.error) {
    if (isMissingInventoryTableError(lotsResult.error.message)) {
      return false;
    }

    throw new Error(lotsResult.error.message);
  }

  const lots = (lotsResult.data ?? []) as Array<{
    id: string;
    quantity_received: number | string;
    quantity_remaining: number | string;
    status?: string | null;
  }>;

  if (lots.length !== 1) {
    return false;
  }

  const lot = lots[0];
  const nextReceived = Number(
    ((Number(lot.quantity_received) || 0) + delta).toFixed(3),
  );
  const nextRemaining = Number(
    ((Number(lot.quantity_remaining) || 0) + delta).toFixed(3),
  );
  const updateResult = await supabase
    .from("product_lots")
    .update({
      quantity_received: nextReceived,
      quantity_remaining: nextRemaining,
      status: "available",
    })
    .eq("id", lot.id)
    .eq("product_id", product.id);

  if (updateResult.error) {
    throw new Error(updateResult.error.message);
  }

  return true;
}

async function reduceProductLots(
  supabase: ServiceSupabase,
  productId: string,
  quantityToReduce: number,
) {
  const lotsResult = await supabase
    .from("product_lots")
    .select("id, quantity_remaining")
    .eq("product_id", productId)
    .gt("quantity_remaining", 0)
    .eq("status", "available")
    .order("expiration_date", { ascending: true, nullsFirst: false })
    .order("entry_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (lotsResult.error) {
    if (isMissingInventoryTableError(lotsResult.error.message)) {
      return;
    }

    throw new Error(lotsResult.error.message);
  }

  let remaining = quantityToReduce;

  for (const lot of (lotsResult.data ?? []) as Array<{
    id: string;
    quantity_remaining: number | string;
  }>) {
    if (remaining <= 0) {
      break;
    }

    const currentQuantity = Number(lot.quantity_remaining) || 0;
    const consumedQuantity = Math.min(currentQuantity, remaining);
    const nextQuantity = Number((currentQuantity - consumedQuantity).toFixed(3));
    const updateResult = await supabase
      .from("product_lots")
      .update({
        quantity_remaining: nextQuantity,
        status: nextQuantity <= 0 ? "depleted" : "available",
      })
      .eq("id", lot.id);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    remaining = Number((remaining - consumedQuantity).toFixed(3));
  }
}

async function fetchProductProviderIdentities(
  supabase: ServiceSupabase,
  productId: string,
  legacyProviderName?: string | null,
) {
  const identities = new Map<string, ProviderIdentity>();
  const linksResult = await supabase
    .from("product_providers")
    .select("provider_id, providers(id, name)")
    .eq("product_id", productId);

  if (
    linksResult.error &&
    !isMissingProviderTableError(linksResult.error.message)
  ) {
    throw new Error(linksResult.error.message);
  }

  for (const link of (linksResult.data ?? []) as unknown as ProductProviderAssociation[]) {
    addProviderIdentity(identities, getAssociationProviderIdentity(link));
  }

  const lotsResult = await supabase
    .from("product_lots")
    .select("provider_id, providers(id, name)")
    .eq("product_id", productId);

  if (
    lotsResult.error &&
    !isMissingInventoryTableError(lotsResult.error.message)
  ) {
    throw new Error(lotsResult.error.message);
  }

  for (const lot of (lotsResult.data ?? []) as unknown as ProductLotAssociation[]) {
    addProviderIdentity(identities, getAssociationProviderIdentity(lot));
  }

  addProviderIdentity(identities, { name: legacyProviderName ?? null });

  return [...identities.values()];
}

async function removeProvidersFromProducts(
  supabase: ServiceSupabase,
  providersToDelete: Pick<Provider, "id" | "name">[],
) {
  if (!providersToDelete.length) {
    return {
      deletedProductIds: [] as string[],
      updatedProductIds: [] as string[],
      deletedCategoryIds: [] as string[],
    };
  }

  const providerIds = providersToDelete.map((provider) => provider.id);
  const providerIdSet = new Set(providerIds);
  const providerNameKeySet = new Set(
    providersToDelete
      .map((provider) => getProviderNameKey(provider.name))
      .filter(Boolean),
  );
  const affectedProductIds = new Set<string>();

  const selectedLinksResult = await supabase
    .from("product_providers")
    .select("product_id, provider_id")
    .in("provider_id", providerIds);

  if (
    selectedLinksResult.error &&
    !isMissingProviderTableError(selectedLinksResult.error.message)
  ) {
    throw new Error(selectedLinksResult.error.message);
  }

  const selectedLinks = (selectedLinksResult.data ??
    []) as ProductProviderAssociation[];

  selectedLinks.forEach((link) => affectedProductIds.add(link.product_id));

  const selectedLotsResult = await supabase
    .from("product_lots")
    .select("id, product_id, provider_id, quantity_remaining, status")
    .in("provider_id", providerIds);

  if (
    selectedLotsResult.error &&
    !isMissingInventoryTableError(selectedLotsResult.error.message)
  ) {
    throw new Error(selectedLotsResult.error.message);
  }

  const selectedLots = (selectedLotsResult.error
    ? []
    : (selectedLotsResult.data ?? [])) as ProductLotAssociation[];

  selectedLots.forEach((lot) => affectedProductIds.add(lot.product_id));

  const legacyProductsResult = await supabase
    .from("products")
    .select("id, provider")
    .not("provider", "is", null);

  if (legacyProductsResult.error) {
    throw new Error(legacyProductsResult.error.message);
  }

  for (const product of (legacyProductsResult.data ?? []) as Pick<
    Product,
    "id" | "provider"
  >[]) {
    if (providerNameKeySet.has(getProviderNameKey(product.provider))) {
      affectedProductIds.add(product.id);
    }
  }

  if (!affectedProductIds.size) {
    return {
      deletedProductIds: [] as string[],
      updatedProductIds: [] as string[],
      deletedCategoryIds: [] as string[],
    };
  }

  const affectedIds = [...affectedProductIds];
  const productsResult = await supabase
    .from("products")
    .select("id, category_id, provider, stock")
    .in("id", affectedIds);

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  const allLinksResult = await supabase
    .from("product_providers")
    .select("product_id, provider_id, providers(id, name)")
    .in("product_id", affectedIds);

  if (
    allLinksResult.error &&
    !isMissingProviderTableError(allLinksResult.error.message)
  ) {
    throw new Error(allLinksResult.error.message);
  }

  const allLotsResult = await supabase
    .from("product_lots")
    .select(
      "id, product_id, provider_id, quantity_remaining, status, providers(id, name)",
    )
    .in("product_id", affectedIds);

  if (
    allLotsResult.error &&
    !isMissingInventoryTableError(allLotsResult.error.message)
  ) {
    throw new Error(allLotsResult.error.message);
  }

  const linksByProduct = groupProductProviderAssociations(
    (allLinksResult.data ?? []) as unknown as ProductProviderAssociation[],
  );
  const lotsByProduct = groupProductLotAssociations(
    allLotsResult.error
      ? []
      : ((allLotsResult.data ?? []) as unknown as ProductLotAssociation[]),
  );
  const productsToDelete: string[] = [];
  const categoryIdsToCheck: string[] = [];
  const sharedProductUpdates: Array<{
    product: Pick<Product, "id" | "category_id" | "provider" | "stock">;
    nextProviderName: string | null;
    removedLotIds: string[];
    removedQuantity: number;
  }> = [];

  for (const product of (productsResult.data ?? []) as Pick<
    Product,
    "id" | "category_id" | "provider" | "stock"
  >[]) {
    const productLinks = linksByProduct.get(product.id) ?? [];
    const productLots = lotsByProduct.get(product.id) ?? [];
    const structuredAssociations = new Map<string, ProviderIdentity>();
    const remainingAssociations = new Map<string, ProviderIdentity>();
    const removedLotIds: string[] = [];
    let hasSelectedProvider = false;
    let removedQuantity = 0;

    for (const link of productLinks) {
      const identity = getAssociationProviderIdentity(link);

      if (isSelectedProvider(identity, providerIdSet, providerNameKeySet)) {
        hasSelectedProvider = true;
      } else {
        addProviderIdentity(remainingAssociations, identity);
      }

      addProviderIdentity(structuredAssociations, identity);
    }

    for (const lot of productLots) {
      const identity = getAssociationProviderIdentity(lot);

      if (isSelectedProvider(identity, providerIdSet, providerNameKeySet)) {
        hasSelectedProvider = true;
        removedLotIds.push(lot.id);
        removedQuantity = Number(
          (
            removedQuantity +
            getAvailableLotStockQuantity({
              quantity_remaining: Number(lot.quantity_remaining) || 0,
              status: lot.status ?? "available",
            })
          ).toFixed(3),
        );
      } else {
        addProviderIdentity(remainingAssociations, identity);
      }

      addProviderIdentity(structuredAssociations, identity);
    }

    const legacyProviderKey = getProviderNameKey(product.provider);

    if (!structuredAssociations.size && legacyProviderKey) {
      if (providerNameKeySet.has(legacyProviderKey)) {
        hasSelectedProvider = true;
      } else {
        addProviderIdentity(remainingAssociations, {
          name: product.provider ?? null,
        });
      }
    }

    if (!hasSelectedProvider) {
      continue;
    }

    if (!remainingAssociations.size) {
      productsToDelete.push(product.id);
      if (product.category_id) {
        categoryIdsToCheck.push(product.category_id);
      }
      continue;
    }

    sharedProductUpdates.push({
      product,
      nextProviderName: getNextProductProviderName(
        product.provider,
        remainingAssociations,
      ),
      removedLotIds,
      removedQuantity,
    });
  }

  if (productsToDelete.length) {
    const deleteProductsResult = await supabase
      .from("products")
      .delete()
      .in("id", productsToDelete);

    if (deleteProductsResult.error) {
      throw new Error(deleteProductsResult.error.message);
    }
  }

  if (sharedProductUpdates.length) {
    const sharedProductIds = sharedProductUpdates.map((entry) => entry.product.id);
    const linkDeleteResult = await supabase
      .from("product_providers")
      .delete()
      .in("product_id", sharedProductIds)
      .in("provider_id", providerIds);

    if (
      linkDeleteResult.error &&
      !isMissingProviderTableError(linkDeleteResult.error.message)
    ) {
      throw new Error(linkDeleteResult.error.message);
    }

    const removedLotIds = sharedProductUpdates.flatMap(
      (entry) => entry.removedLotIds,
    );

    if (removedLotIds.length) {
      const lotDeleteResult = await supabase
        .from("product_lots")
        .delete()
        .in("id", removedLotIds);

      if (
        lotDeleteResult.error &&
        !isMissingInventoryTableError(lotDeleteResult.error.message)
      ) {
        throw new Error(lotDeleteResult.error.message);
      }
    }

    for (const update of sharedProductUpdates) {
      const nextStock = Number(
        Math.max(
          0,
          (Number(update.product.stock) || 0) - update.removedQuantity,
        ).toFixed(3),
      );
      const productUpdateResult = await supabase
        .from("products")
        .update({
          provider: update.nextProviderName,
          stock: nextStock,
        })
        .eq("id", update.product.id);

      if (productUpdateResult.error) {
        throw new Error(productUpdateResult.error.message);
      }
    }
  }

  const deletedCategoryIds = await deleteOrphanCategories(
    supabase,
    categoryIdsToCheck,
  );

  return {
    deletedProductIds: productsToDelete,
    updatedProductIds: sharedProductUpdates.map((entry) => entry.product.id),
    deletedCategoryIds,
  };
}

async function deleteOrphanCategories(
  supabase: ServiceSupabase,
  categoryIds: Array<string | null | undefined>,
) {
  const ids = [...new Set(categoryIds.filter(Boolean) as string[])];

  if (!ids.length) {
    return [] as string[];
  }

  const productsResult = await supabase
    .from("products")
    .select("category_id")
    .in("category_id", ids);

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  const categoriesWithProducts = new Set(
    (productsResult.data ?? [])
      .map((product) => product.category_id as string | null)
      .filter(Boolean) as string[],
  );
  const orphanCategoryIds = ids.filter(
    (categoryId) => !categoriesWithProducts.has(categoryId),
  );

  if (!orphanCategoryIds.length) {
    return [] as string[];
  }

  const deleteResult = await supabase
    .from("categories")
    .delete()
    .in("id", orphanCategoryIds)
    .select("id");

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  return ((deleteResult.data ?? []) as Pick<Category, "id">[]).map(
    (category) => category.id,
  );
}

async function deleteOrphanProviders(
  supabase: ServiceSupabase,
  identities: ProviderIdentity[],
) {
  const identitiesByKey = new Map<string, ProviderIdentity>();

  identities.forEach((identity) => addProviderIdentity(identitiesByKey, identity));

  if (!identitiesByKey.size) {
    return [] as string[];
  }

  const initialProviderNameKeys = new Set(
    [...identitiesByKey.values()]
      .map((identity) => getProviderNameKey(identity.name))
      .filter(Boolean),
  );

  if (initialProviderNameKeys.size) {
    const providersResult = await supabase.from("providers").select("id, name");

    if (
      providersResult.error &&
      !isMissingProviderTableError(providersResult.error.message)
    ) {
      throw new Error(providersResult.error.message);
    }

    for (const provider of (providersResult.data ?? []) as Pick<
      Provider,
      "id" | "name"
    >[]) {
      if (initialProviderNameKeys.has(getProviderNameKey(provider.name))) {
        addProviderIdentity(identitiesByKey, provider);
      }
    }
  }

  const providerIds = [...identitiesByKey.values()]
    .map((identity) => identity.id?.trim())
    .filter(Boolean) as string[];
  const providerNameKeys = new Set(
    [...identitiesByKey.values()]
      .map((identity) => getProviderNameKey(identity.name))
      .filter(Boolean),
  );
  const usedProviderIds = new Set<string>();
  const usedProviderNameKeys = new Set<string>();

  if (providerIds.length) {
    const linksResult = await supabase
      .from("product_providers")
      .select("provider_id")
      .in("provider_id", providerIds);

    if (
      linksResult.error &&
      !isMissingProviderTableError(linksResult.error.message)
    ) {
      throw new Error(linksResult.error.message);
    }

    for (const link of (linksResult.data ?? []) as ProductProviderAssociation[]) {
      if (link.provider_id) {
        usedProviderIds.add(link.provider_id);
      }
    }

    const lotsResult = await supabase
      .from("product_lots")
      .select("provider_id")
      .in("provider_id", providerIds);

    if (
      lotsResult.error &&
      !isMissingInventoryTableError(lotsResult.error.message)
    ) {
      throw new Error(lotsResult.error.message);
    }

    for (const lot of (lotsResult.data ?? []) as ProductLotAssociation[]) {
      if (lot.provider_id) {
        usedProviderIds.add(lot.provider_id);
      }
    }
  }

  if (providerNameKeys.size) {
    const productsResult = await supabase
      .from("products")
      .select("provider")
      .not("provider", "is", null);

    if (productsResult.error) {
      throw new Error(productsResult.error.message);
    }

    for (const product of (productsResult.data ?? []) as Pick<
      Product,
      "provider"
    >[]) {
      const key = getProviderNameKey(product.provider);

      if (providerNameKeys.has(key)) {
        usedProviderNameKeys.add(key);
      }
    }
  }

  const providerIdsToDelete = [...identitiesByKey.values()]
    .filter((identity) => {
      const id = identity.id?.trim();
      const nameKey = getProviderNameKey(identity.name);

      return (
        id &&
        !usedProviderIds.has(id) &&
        (!nameKey || !usedProviderNameKeys.has(nameKey))
      );
    })
    .map((identity) => identity.id as string);

  if (!providerIdsToDelete.length) {
    return [] as string[];
  }

  const deleteResult = await supabase
    .from("providers")
    .delete()
    .in("id", providerIdsToDelete)
    .select("id");

  if (
    deleteResult.error &&
    !isMissingProviderTableError(deleteResult.error.message)
  ) {
    throw new Error(deleteResult.error.message);
  }

  return ((deleteResult.data ?? []) as Pick<Provider, "id">[]).map(
    (provider) => provider.id,
  );
}

function groupProductProviderAssociations(
  associations: ProductProviderAssociation[],
) {
  const groups = new Map<string, ProductProviderAssociation[]>();

  for (const association of associations) {
    const entries = groups.get(association.product_id) ?? [];
    entries.push(association);
    groups.set(association.product_id, entries);
  }

  return groups;
}

function groupProductLotAssociations(lots: ProductLotAssociation[]) {
  const groups = new Map<string, ProductLotAssociation[]>();

  for (const lot of lots) {
    const entries = groups.get(lot.product_id) ?? [];
    entries.push(lot);
    groups.set(lot.product_id, entries);
  }

  return groups;
}

function getAssociationProviderIdentity(
  association: ProductProviderAssociation | ProductLotAssociation,
): ProviderIdentity {
  const joinedProvider =
    getJoinedProvider(association.provider) ??
    getJoinedProvider(association.providers);

  return {
    id: association.provider_id ?? joinedProvider?.id ?? null,
    name: joinedProvider?.name ?? null,
  };
}

function getJoinedProvider(provider?: JoinedProvider | null) {
  if (Array.isArray(provider)) {
    return provider[0] ?? null;
  }

  return provider ?? null;
}

function getJoinedCategory(category?: JoinedCategory | null) {
  if (Array.isArray(category)) {
    return category[0] ?? null;
  }

  return category ?? null;
}

function getJoinedPurchaseProduct(product?: JoinedPurchaseProduct | null) {
  if (Array.isArray(product)) {
    return product[0] ?? null;
  }

  return product ?? null;
}

function getProductLotProviderName(lot: Pick<ProductLot, "provider" | "providers">) {
  return getJoinedProvider(lot.provider)?.name ??
    getJoinedProvider(lot.providers)?.name ??
    "";
}

function addProviderIdentity(
  identities: Map<string, ProviderIdentity>,
  identity: ProviderIdentity,
) {
  const id = identity.id?.trim();
  const name = identity.name?.trim();
  const key = id ? `id:${id}` : name ? `name:${getProviderNameKey(name)}` : "";

  if (!key) {
    return;
  }

  identities.set(key, {
    id: id || null,
    name: name || null,
  });
}

function isSelectedProvider(
  identity: ProviderIdentity,
  providerIds: Set<string>,
  providerNameKeys: Set<string>,
) {
  const id = identity.id?.trim();
  const nameKey = getProviderNameKey(identity.name);

  return Boolean(
    (id && providerIds.has(id)) ||
      (nameKey && providerNameKeys.has(nameKey)),
  );
}

function getNextProductProviderName(
  currentProviderName: string | null | undefined,
  identities: Map<string, ProviderIdentity>,
) {
  const currentProviderKey = getProviderNameKey(currentProviderName);
  const providerNames = [...identities.values()]
    .map((identity) => identity.name?.trim())
    .filter(Boolean) as string[];

  if (
    currentProviderKey &&
    providerNames.some(
      (providerName) => getProviderNameKey(providerName) === currentProviderKey,
    )
  ) {
    return currentProviderName?.trim() || providerNames[0] || null;
  }

  return (
    providerNames.sort((first, second) =>
      first.localeCompare(second, "es-EC", { sensitivity: "base" }),
    )[0] ?? null
  );
}

function getProviderNameKey(providerName?: string | null) {
  return providerName?.trim().toLocaleLowerCase("es-EC") ?? "";
}

async function ensureProvider(
  supabase: ServiceSupabase,
  providerName: string,
): Promise<Provider | null> {
  const name = providerName.trim();

  if (!name) {
    return null;
  }

  const existing = await findProviderByName(supabase, name, {
    returnNullWhenMissingTable: true,
  });

  if (existing) {
    return existing;
  }

  if (!existing) {
    const created = await supabase
      .from("providers")
      .insert({ name })
      .select("*")
      .single();

    if (created.error) {
      if (isMissingProviderTableError(created.error.message)) {
        return null;
      }

      throw new Error(created.error.message);
    }

    return created.data as Provider;
  }

  return null;
}

async function resolveProductLotProvider(
  supabase: ServiceSupabase,
  lot: ProductLot,
  providerNameInput?: string | null,
): Promise<Provider | null> {
  const providerName = providerNameInput?.trim() ?? "";

  if (!providerName) {
    return null;
  }

  if (!lot.provider_id) {
    return ensureProvider(supabase, providerName);
  }

  const currentProviderResult = await supabase
    .from("providers")
    .select("*")
    .eq("id", lot.provider_id)
    .maybeSingle();

  if (currentProviderResult.error) {
    if (isMissingProviderTableError(currentProviderResult.error.message)) {
      return null;
    }

    throw new Error(
      getProviderMutationErrorMessage(currentProviderResult.error.message),
    );
  }

  const currentProvider = currentProviderResult.data as Provider | null;

  if (!currentProvider) {
    return ensureProvider(supabase, providerName);
  }

  if (
    currentProvider.name.trim().toLocaleLowerCase("es-EC") ===
    providerName.toLocaleLowerCase("es-EC")
  ) {
    return currentProvider;
  }

  const existingProvider = await findProviderByName(supabase, providerName, {
    returnNullWhenMissingTable: true,
  });

  if (existingProvider && existingProvider.id !== currentProvider.id) {
    return existingProvider;
  }

  const renamedProvider = await supabase
    .from("providers")
    .update({ name: providerName })
    .eq("id", currentProvider.id)
    .select("*")
    .single();

  if (renamedProvider.error) {
    throw new Error(getProviderMutationErrorMessage(renamedProvider.error.message));
  }

  const legacyProviderUpdate = await supabase
    .from("products")
    .update({ provider: providerName })
    .ilike("provider", currentProvider.name);

  if (
    legacyProviderUpdate.error &&
    !isMissingProviderTableError(legacyProviderUpdate.error.message)
  ) {
    throw new Error(legacyProviderUpdate.error.message);
  }

  return renamedProvider.data as Provider;
}

async function findProviderByName(
  supabase: ServiceSupabase,
  providerName: string,
  options: { returnNullWhenMissingTable?: boolean } = {},
): Promise<Provider | null> {
  const name = providerName.trim();

  if (!name) {
    return null;
  }

  const existing = await supabase
    .from("providers")
    .select("*")
    .ilike("name", name)
    .maybeSingle();

  if (existing.error) {
    if (
      options.returnNullWhenMissingTable &&
      isMissingProviderTableError(existing.error.message)
    ) {
      return null;
    }

    throw new Error(getProviderMutationErrorMessage(existing.error.message));
  }

  return (existing.data as Provider | null) ?? null;
}

async function findProviderByRuc(
  supabase: ServiceSupabase,
  providerRuc: string,
): Promise<Provider | null> {
  const ruc = providerRuc.trim();

  if (!ruc) {
    return null;
  }

  const existing = await supabase
    .from("providers")
    .select("*")
    .eq("ruc", ruc)
    .maybeSingle();

  if (existing.error) {
    throw new Error(getProviderMutationErrorMessage(existing.error.message));
  }

  return (existing.data as Provider | null) ?? null;
}

async function upsertProductProvider(
  supabase: ServiceSupabase,
  input: {
    productId: string;
    provider: Provider;
    isPrimary: boolean;
    purchaseCost: number;
    quantity: number;
    purchaseUnit: string;
  },
) {
  if (input.isPrimary) {
    const primaryReset = await supabase
      .from("product_providers")
      .update({ is_primary: false })
      .eq("product_id", input.productId)
      .neq("provider_id", input.provider.id);

    if (
      primaryReset.error &&
      !isMissingProviderTableError(primaryReset.error.message)
    ) {
      throw new Error(primaryReset.error.message);
    }
  }

  const payload = {
    product_id: input.productId,
    provider_id: input.provider.id,
    is_primary: input.isPrimary,
    last_purchase_cost: input.purchaseCost,
    last_purchase_quantity: input.quantity,
    last_purchase_unit: input.purchaseUnit,
    last_purchase_at: new Date().toISOString(),
  };

  const result = await supabase
    .from("product_providers")
    .upsert(payload, { onConflict: "product_id,provider_id" });

  if (
    result.error &&
    !isMissingProviderTableError(result.error.message) &&
    !isDecimalInventorySchemaError(result.error.message)
  ) {
    throw new Error(result.error.message);
  }
}

async function setProductPrimaryProvider(
  supabase: ServiceSupabase,
  productId: string,
  providerName?: string | null,
) {
  const normalizedProviderName = providerName?.trim() ?? "";

  if (!normalizedProviderName) {
    const reset = await supabase
      .from("product_providers")
      .update({ is_primary: false })
      .eq("product_id", productId);

    if (
      reset.error &&
      !isMissingProviderTableError(reset.error.message) &&
      !isDecimalInventorySchemaError(reset.error.message)
    ) {
      throw new Error(reset.error.message);
    }

    return;
  }

  let provider: Provider | null;

  try {
    provider = await ensureProvider(supabase, normalizedProviderName);
  } catch (error) {
    if (
      error instanceof Error &&
      isMissingProviderTableError(error.message)
    ) {
      return;
    }

    throw error;
  }

  if (!provider) {
    return;
  }

  const primaryReset = await supabase
    .from("product_providers")
    .update({ is_primary: false })
    .eq("product_id", productId)
    .neq("provider_id", provider.id);

  if (
    primaryReset.error &&
    !isMissingProviderTableError(primaryReset.error.message) &&
    !isDecimalInventorySchemaError(primaryReset.error.message)
  ) {
    throw new Error(primaryReset.error.message);
  }

  const primarySet = await supabase
    .from("product_providers")
    .upsert(
      {
        product_id: productId,
        provider_id: provider.id,
        is_primary: true,
      },
      { onConflict: "product_id,provider_id" },
    );

  if (
    primarySet.error &&
    !isMissingProviderTableError(primarySet.error.message) &&
    !isDecimalInventorySchemaError(primarySet.error.message)
  ) {
    throw new Error(primarySet.error.message);
  }
}

function attachProductInventoryDetails(
  products: Product[],
  productProviders: ProductProvider[],
  productLots: ProductLot[],
  productPresentations: ProductPresentation[] = [],
) {
  const linksByProduct = new Map<string, ProductProvider[]>();
  const lotsByProduct = new Map<string, ProductLot[]>();
  const presentationsByProduct = new Map<string, ProductPresentation[]>();

  for (const link of productProviders) {
    const links = linksByProduct.get(link.product_id) ?? [];
    links.push({
      ...link,
      last_purchase_cost:
        link.last_purchase_cost === undefined || link.last_purchase_cost === null
          ? null
          : Number(link.last_purchase_cost),
      last_purchase_quantity:
        link.last_purchase_quantity === undefined ||
        link.last_purchase_quantity === null
          ? null
          : Number(link.last_purchase_quantity),
      provider: link.provider ?? link.providers ?? null,
    });
    linksByProduct.set(link.product_id, links);
  }

  for (const lot of productLots) {
    const lots = lotsByProduct.get(lot.product_id) ?? [];
    lots.push(normalizeProductLot(lot));
    lotsByProduct.set(lot.product_id, lots);
  }

  for (const presentation of productPresentations) {
    const presentations =
      presentationsByProduct.get(presentation.product_id) ?? [];
    presentations.push(normalizeProductPresentation(presentation));
    presentationsByProduct.set(presentation.product_id, presentations);
  }

  return products.map((product) => ({
    ...product,
    provider_links: linksByProduct.get(product.id) ?? [],
    lots: lotsByProduct.get(product.id) ?? [],
    presentations: presentationsByProduct.get(product.id) ?? [],
  }));
}

function isMissingProductPresentationsTableError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("product_presentations") &&
    (normalized.includes("does not exist") ||
      normalized.includes("schema cache") ||
      normalized.includes("could not find"))
  );
}

function isMissingPresentationUsageColumnError(message: string) {
  const normalized = message.toLowerCase();

  return (
    (normalized.includes("use_for_purchase") ||
      normalized.includes("use_for_sale")) &&
    (normalized.includes("schema cache") ||
      normalized.includes("could not find") ||
      normalized.includes("column"))
  );
}

function isMissingProviderTableError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("providers") &&
    (normalized.includes("does not exist") ||
      normalized.includes("schema cache") ||
      normalized.includes("could not find"))
  );
}

function isMissingProviderContactColumnError(message: string) {
  const normalized = message.toLowerCase();

  return (
    ["address", "notes", "phone", "ruc"].some((column) =>
      normalized.includes(column),
    ) &&
    (normalized.includes("schema cache") ||
      normalized.includes("could not find") ||
      normalized.includes("column"))
  );
}

function isMissingInventoryTableError(message: string) {
  const normalized = message.toLowerCase();

  return (
    (normalized.includes("product_lots") ||
      normalized.includes("sale_item_lots") ||
      normalized.includes("product_purchases") ||
      normalized.includes("stock_movements")) &&
    (normalized.includes("does not exist") ||
      normalized.includes("schema cache") ||
      normalized.includes("could not find"))
  );
}

function isDecimalInventorySchemaError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("invalid input syntax for type integer") ||
    normalized.includes("is of type integer")
  );
}

function isMissingStockMovementLotColumnError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("lot_id") &&
    (normalized.includes("schema cache") ||
      normalized.includes("could not find") ||
      normalized.includes("column"))
  );
}

function isMissingPurchaseInvoiceColumnError(message: string) {
  const normalized = message.toLowerCase();

  return (
    [
      "credit_days",
      "invoice_date",
      "invoice_number",
      "iva_amount",
      "iva_rate",
      "line_subtotal",
      "line_total",
      "payment_method",
      "purchase_code",
      "purchase_input_quantity",
      "purchase_input_unit",
    ].some((column) => normalized.includes(column)) &&
    (normalized.includes("schema cache") ||
      normalized.includes("could not find") ||
      normalized.includes("column"))
  );
}

function isMissingProductIvaColumnError(message: string) {
  const normalized = message.toLowerCase();

  return (
    (normalized.includes("has_iva") || normalized.includes("iva_rate")) &&
    (normalized.includes("schema cache") ||
      normalized.includes("could not find") ||
      normalized.includes("column"))
  );
}

function isMissingProductRequiresDatesColumnError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("requires_dates") &&
    (normalized.includes("schema cache") ||
      normalized.includes("could not find") ||
      normalized.includes("column"))
  );
}

function isMissingOptionalProductColumnError(message: string) {
  return (
    isMissingProductIvaColumnError(message) ||
    isMissingProductRequiresDatesColumnError(message)
  );
}

function isMissingProductCodeColumnError(message: string) {
  const normalized = message.toLowerCase();

  return (
    normalized.includes("product_code") &&
    (normalized.includes("schema cache") ||
      normalized.includes("could not find") ||
      normalized.includes("column"))
  );
}

function normalizeProductCodeValue(value?: string | null) {
  const normalized = value?.replace(/\D/g, "").slice(0, 13) ?? "";
  return normalized || null;
}

function normalizeOptionalText(value?: string | null) {
  return value?.trim() || null;
}

function getProviderMutationErrorMessage(message: string) {
  const normalized = message.toLowerCase();

  if (isMissingProviderContactColumnError(message)) {
    return "La tabla de proveedores no tiene todos los campos de contacto. Ejecuta supabase/provider-contact-fields.sql.";
  }

  if (isMissingProviderTableError(message)) {
    return "La tabla de proveedores no esta disponible. Ejecuta supabase/product-providers.sql.";
  }

  if (normalized.includes("providers_ruc_unique_idx")) {
    return "Ya existe un proveedor con ese RUC.";
  }

  if (
    normalized.includes("duplicate") ||
    normalized.includes("unique") ||
    normalized.includes("providers_name_unique_idx")
  ) {
    return "Ya existe un proveedor con ese nombre.";
  }

  return message;
}

export async function uploadProductImage(file: File) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Configura Supabase para subir imagenes.");
  }

  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `products/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, buffer, {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadTransferReceipt(file: File) {
  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Configura Supabase para subir imagenes.");
  }

  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `transfers/${crypto.randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("product-images")
    .upload(path, buffer, {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}


export async function deleteProductImage(imageUrl: string) {
  const path = getProductImageStoragePath(imageUrl);

  if (!path) {
    return {
      deleted: false,
      path: null,
    };
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Configura Supabase para eliminar imagenes.");
  }

  const { error } = await supabase.storage
    .from("product-images")
    .remove([path]);

  if (error) {
    throw new Error(error.message);
  }

  return {
    deleted: true,
    path,
  };
}

function getProductImageStoragePath(imageUrl: string) {
  const marker = "/storage/v1/object/public/product-images/";

  try {
    const url = new URL(imageUrl);
    const pathname = decodeURIComponent(url.pathname);
    const markerIndex = pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const path = pathname.slice(markerIndex + marker.length);

    if (!path || path.includes("..")) {
      return null;
    }

    return path;
  } catch {
    return null;
  }
}

export function normalizeProducts(products: Product[]) {
  return products.map(normalizeProduct);
}

export function normalizeProduct(product: Product) {
  const stock = Number(product.stock) || 0;

  return {
    ...product,
    product_code: product.product_code ?? null,
    purchase_cost: stock > 0 ? (normalizeOptionalMoney(product.purchase_cost) ?? 0) : 0,
    price: stock > 0 ? normalizeMoney(product.price) : 0,
    measurement_unit: normalizeProductMeasurementUnit(product.measurement_unit),
    stock,
    min_stock: Number(product.min_stock),
    max_stock:
      product.max_stock === undefined || product.max_stock === null
        ? undefined
        : Number(product.max_stock),
    has_iva: Boolean(product.has_iva),
    iva_rate: normalizeOptionalMoney(product.iva_rate) ?? 0,
    requires_dates:
      product.requires_dates === undefined || product.requires_dates === null
        ? Boolean(product.manufacture_date || product.expiration_date)
        : Boolean(product.requires_dates),
    entry_date: stock > 0 ? (product.entry_date ?? null) : null,
    manufacture_date: stock > 0 ? (product.manufacture_date ?? null) : null,
    expiration_date: stock > 0 ? (product.expiration_date ?? null) : null,
    lots: (product.lots ?? []).map(normalizeProductLot),
    presentations: (product.presentations ?? []).map(p => {
      const normalized = normalizeProductPresentation(p);
      return {
        ...normalized,
        price: stock > 0 ? normalized.price : 0,
      };
    }),
  };
}

function normalizeProductLot(lot: ProductLot): ProductLot {
  const purchaseInput = getProductLotPurchaseInput(lot);

  return {
    ...lot,
    provider: lot.provider ?? lot.providers ?? null,
    purchase_input_quantity: purchaseInput.quantity,
    purchase_input_unit: purchaseInput.unit,
    quantity_received: Number(lot.quantity_received) || 0,
    quantity_remaining: Number(lot.quantity_remaining) || 0,
    quantity_unit: normalizeProductMeasurementUnit(lot.quantity_unit),
    unit_cost: normalizeOptionalMoney(lot.unit_cost) ?? 0,
    entry_date: lot.entry_date ?? null,
    manufacture_date: lot.manufacture_date ?? null,
    expiration_date: lot.expiration_date ?? null,
    status: normalizeProductLotStatus(lot.status),
  };
}

function getProductLotPurchaseInput(lot: ProductLot) {
  const joinedPurchase = Array.isArray(lot.product_purchases)
    ? lot.product_purchases[0] ?? null
    : lot.product_purchases ?? null;
  const quantity =
    lot.purchase_input_quantity === undefined ||
    lot.purchase_input_quantity === null
      ? Number(joinedPurchase?.purchase_input_quantity)
      : Number(lot.purchase_input_quantity);
  const unit =
    lot.purchase_input_unit?.trim() ||
    joinedPurchase?.purchase_input_unit?.trim() ||
    null;

  return {
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    unit,
  };
}

function normalizePurchaseHistoryRecord(
  purchase: ProductPurchaseHistoryAssociation,
  lot?: ProductPurchaseLotAssociation,
): ProductPurchaseHistoryRecord {
  const product = getJoinedPurchaseProduct(purchase.products) ??
    getJoinedPurchaseProduct(purchase.product);
  const provider =
    getJoinedProvider(purchase.providers) ?? getJoinedProvider(purchase.provider);
  const category =
    getJoinedCategory(product?.categories) ?? getJoinedCategory(product?.category);
  const quantity = Number(purchase.quantity) || 0;
  const quantityInStockUnit = Number(purchase.quantity_in_stock_unit) || quantity;
  const unitCost = normalizeOptionalMoney(purchase.unit_cost) ?? 0;

  let basePrice = normalizeOptionalMoney(product?.price) ?? 0;
  const purchaseInputUnit = normalizeOptionalText(purchase.purchase_input_unit);
  const presentation = product?.product_presentations?.find((p: any) => p.name === purchaseInputUnit);
  if (presentation) {
    if (presentation.price !== undefined && presentation.price !== null) {
      basePrice = normalizeOptionalMoney(presentation.price) ?? basePrice;
    }
  }

  const ivaRateForPvp = product?.has_iva ? (normalizeOptionalMoney(product?.iva_rate) ?? 0) : 0;
  const retailPrice = product?.has_iva ? normalizeMoney(basePrice * (1 + ivaRateForPvp / 100)) : 0;

  const unitBasePrice = normalizeOptionalMoney(product?.price) ?? 0;
  const unitRetailPrice = product?.has_iva ? normalizeMoney(unitBasePrice * (1 + ivaRateForPvp / 100)) : 0;

  return {
    id: purchase.id,
    product_id: purchase.product_id,
    product_name: product?.name ?? "Producto no disponible",
    product_sku: product?.sku ?? "",
    product_measurement_unit: normalizeProductMeasurementUnit(
      product?.measurement_unit,
    ),
    category_name: category?.name ?? null,
    provider_id: purchase.provider_id ?? provider?.id ?? null,
    provider_name: provider?.name ?? null,
    quantity,
    quantity_unit:
      purchase.quantity_unit ?? normalizeProductMeasurementUnit(product?.measurement_unit),
    quantity_in_stock_unit: quantityInStockUnit,
    unit_cost: unitCost,
    total_cost:
      normalizeOptionalMoney(purchase.total_cost) ??
      normalizeMoney(quantityInStockUnit * unitCost),
    purchase_code: normalizeOptionalText(purchase.purchase_code),
    purchase_input_quantity:
      purchase.purchase_input_quantity === undefined ||
      purchase.purchase_input_quantity === null
        ? null
        : Number(purchase.purchase_input_quantity),
    purchase_input_unit: purchaseInputUnit,
    invoice_number: normalizeOptionalText(purchase.invoice_number),
    invoice_date: normalizeOptionalText(purchase.invoice_date),
    payment_method: normalizeOptionalText(purchase.payment_method),
    credit_days:
      purchase.credit_days === undefined || purchase.credit_days === null
        ? null
        : Number(purchase.credit_days),
    iva_rate: normalizeOptionalMoney(purchase.iva_rate) ?? 0,
    iva_amount: normalizeOptionalMoney(purchase.iva_amount) ?? 0,
    line_subtotal: normalizeOptionalMoney(purchase.line_subtotal),
    line_total: normalizeOptionalMoney(purchase.line_total),
    entry_date: lot?.entry_date ?? null,
    manufacture_date: lot?.manufacture_date ?? null,
    expiration_date: lot?.expiration_date ?? null,
    lot_status: lot?.status ?? null,
    quantity_remaining:
      lot?.quantity_remaining === undefined || lot.quantity_remaining === null
        ? null
        : Number(lot.quantity_remaining),
    base_price: basePrice,
    retail_price: retailPrice,
    unit_base_price: unitBasePrice,
    unit_retail_price: unitRetailPrice,
    created_at: purchase.created_at ?? new Date().toISOString(),
  };
}

function buildDemoPurchaseHistory(
  products: Product[],
): ProductPurchaseHistoryRecord[] {
  return normalizeProducts(products)
    .flatMap((product) => {
      const lots = product.lots ?? [];

      if (lots.length) {
        return lots.map((lot) => {
          const quantity = Number(lot.quantity_received) || 0;
          const unitCost = normalizeOptionalMoney(lot.unit_cost) ?? 0;

          return {
            id: `demo-purchase-${lot.id}`,
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            product_measurement_unit: product.measurement_unit,
            category_name: product.categories?.name ?? null,
            provider_id: lot.provider_id ?? null,
            provider_name: getProductLotProviderName(lot) || product.provider || null,
            quantity,
            quantity_unit: lot.quantity_unit ?? product.measurement_unit,
            quantity_in_stock_unit: quantity,
            unit_cost: unitCost,
            total_cost: normalizeMoney(quantity * unitCost),
            entry_date: lot.entry_date ?? product.entry_date ?? null,
            manufacture_date:
              lot.manufacture_date ?? product.manufacture_date ?? null,
            expiration_date:
              lot.expiration_date ?? product.expiration_date ?? null,
            lot_status: lot.status ?? null,
            quantity_remaining: Number(lot.quantity_remaining) || 0,
            created_at: lot.created_at ?? product.created_at ?? new Date().toISOString(),
          } satisfies ProductPurchaseHistoryRecord;
        });
      }

      if (product.stock <= 0) {
        return [];
      }

      const quantity = Number(product.stock) || 0;
      const unitCost = normalizeOptionalMoney(product.purchase_cost) ?? 0;

      return [
        {
          id: `demo-purchase-${product.id}`,
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          product_measurement_unit: product.measurement_unit,
          category_name: product.categories?.name ?? null,
          provider_id: null,
          provider_name: product.provider ?? null,
          quantity,
          quantity_unit: product.measurement_unit,
          quantity_in_stock_unit: quantity,
          unit_cost: unitCost,
          total_cost: normalizeMoney(quantity * unitCost),
          entry_date: Number(product.stock) > 0 ? (product.entry_date ?? null) : null,
          manufacture_date: Number(product.stock) > 0 ? (product.manufacture_date ?? null) : null,
          expiration_date: Number(product.stock) > 0 ? (product.expiration_date ?? null) : null,
          lot_status: "available",
          quantity_remaining: quantity,
          created_at: product.created_at ?? new Date().toISOString(),
        } satisfies ProductPurchaseHistoryRecord,
      ];
    })
    .sort(
      (first, second) =>
        new Date(second.created_at).getTime() - new Date(first.created_at).getTime(),
    );
}

function normalizeProductLotStatus(status: unknown) {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();

  if (
    normalized === "depleted" ||
    normalized === "returned" ||
    normalized === "adjusted"
  ) {
    return normalized;
  }

  return "available";
}

function getAvailableLotStockQuantity(
  lot: Pick<ProductLot, "quantity_remaining" | "status">,
) {
  return normalizeProductLotStatus(lot.status) === "available"
    ? Math.max(0, Number(lot.quantity_remaining) || 0)
    : 0;
}

function validateProduct(input: ProductInput) {
  if (!input.name.trim()) {
    throw new Error("El nombre del producto es obligatorio.");
  }

  if (!input.sku.trim()) {
    throw new Error("El SKU es obligatorio.");
  }

  if (
    input.product_code &&
    normalizeProductCodeValue(input.product_code)?.length !== 13
  ) {
    throw new Error("El codigo de producto debe tener 13 digitos.");
  }

  if (Number.isNaN(input.price) || input.price < 0) {
    throw new Error("El precio debe ser valido.");
  }

  if (
    input.purchase_cost !== undefined &&
    input.purchase_cost !== null &&
    (Number.isNaN(input.purchase_cost) || input.purchase_cost < 0)
  ) {
    throw new Error("El costo de compra debe ser valido.");
  }

  if (
    input.has_iva &&
    (input.iva_rate === undefined ||
      input.iva_rate === null ||
      !Number.isFinite(input.iva_rate) ||
      input.iva_rate < 0 ||
      input.iva_rate > 100)
  ) {
    throw new Error("El porcentaje de IVA debe ser valido.");
  }

  const measurementUnit = normalizeProductMeasurementUnit(
    input.measurement_unit,
  );
  const productForValidation = { measurement_unit: measurementUnit };

  if (!Number.isFinite(input.stock) || input.stock < 0) {
    throw new Error("El stock debe ser valido.");
  }

  if (!Number.isFinite(input.min_stock) || input.min_stock < 0) {
    throw new Error("El stock minimo debe ser valido.");
  }

  if (
    input.max_stock !== undefined &&
    input.max_stock !== null &&
    (!Number.isFinite(input.max_stock) || input.max_stock < 0)
  ) {
    throw new Error("El stock maximo debe ser valido.");
  }

  if (
    !isWeightBasedProduct(productForValidation) &&
    (!Number.isInteger(input.stock) ||
      !Number.isInteger(input.min_stock) ||
      (input.max_stock !== undefined &&
        input.max_stock !== null &&
        !Number.isInteger(input.max_stock)))
  ) {
    throw new Error("Los productos por unidad deben tener stock entero.");
  }
}

function validateProductPurchase(input: ProductPurchaseInput) {
  const effectiveSalePrice = input.sale_presentation_id
    ? input.sale_presentation_price
    : input.price;

  if (!input.provider.trim()) {
    throw new Error("El proveedor es obligatorio para ingresar la compra.");
  }

  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new Error("La cantidad comprada debe ser mayor a cero.");
  }

  if (
    input.purchase_cost === undefined ||
    input.purchase_cost === null ||
    !Number.isFinite(input.purchase_cost) ||
    input.purchase_cost <= 0
  ) {
    throw new Error("El costo de compra debe ser mayor a cero.");
  }

  if (
    input.inventory_unit_cost !== undefined &&
    input.inventory_unit_cost !== null &&
    (!Number.isFinite(input.inventory_unit_cost) ||
      input.inventory_unit_cost < 0)
  ) {
    throw new Error("El costo unitario de inventario debe ser valido.");
  }

  if (
    effectiveSalePrice === undefined ||
    effectiveSalePrice === null ||
    !Number.isFinite(effectiveSalePrice) ||
    effectiveSalePrice <= 0
  ) {
    throw new Error("El precio de venta debe ser mayor a cero.");
  }

  if (
    input.sale_presentation_unit_quantity !== undefined &&
    input.sale_presentation_unit_quantity !== null &&
    (!Number.isFinite(input.sale_presentation_unit_quantity) ||
      input.sale_presentation_unit_quantity <= 0)
  ) {
    throw new Error("La cantidad de la presentacion debe ser valida.");
  }

  if (
    input.iva_rate !== undefined &&
    input.iva_rate !== null &&
    (!Number.isFinite(input.iva_rate) || input.iva_rate < 0 || input.iva_rate > 100)
  ) {
    throw new Error("El porcentaje de IVA debe ser valido.");
  }
}

function validateProductLotUpdate(input: ProductLotUpdateInput) {
  if (
    input.quantity_received !== undefined &&
    (!Number.isFinite(input.quantity_received) || input.quantity_received <= 0)
  ) {
    throw new Error("La cantidad ingresada debe ser mayor a cero.");
  }

  if (
    input.quantity_remaining !== undefined &&
    (!Number.isFinite(input.quantity_remaining) || input.quantity_remaining < 0)
  ) {
    throw new Error("La cantidad disponible debe ser valida.");
  }

  if (
    input.status !== undefined &&
    !["available", "depleted", "returned", "adjusted"].includes(input.status)
  ) {
    throw new Error("El estado de la existencia no es valido.");
  }
}

function getProductMutationErrorMessage(message: string) {
  if (isMissingProductCodeColumnError(message)) {
    return "Ejecuta primero supabase/product-code-field.sql en Supabase para guardar el codigo de producto.";
  }

  if (
    message.includes("products_product_code_unique_idx") ||
    message.includes("products_product_code_key")
  ) {
    return "El codigo de producto ya existe.";
  }

  if (
    message.includes("products_product_code_format_check") ||
    message.includes("product_code")
  ) {
    return "El codigo de producto debe tener 13 digitos.";
  }

  if (
    message.includes("measurement_unit") ||
    message.includes("manufacture_date") ||
    message.includes("expiration_date") ||
    message.includes("requires_dates") ||
    isDecimalInventorySchemaError(message)
  ) {
    return "Ejecuta primero el SQL actualizado en Supabase para permitir granel por libra, fechas de producto y stock con decimales.";
  }

  if (
    message.includes("products_sku_key") ||
    message.includes("duplicate key value")
  ) {
    return PRODUCT_DUPLICATE_MESSAGE;
  }

  return message;
}

function getCategoryMutationErrorMessage(message: string) {
  if (
    message.includes("categories_slug_key") ||
    message.includes("duplicate key value")
  ) {
    return "Categoria Duplicada";
  }

  return message;
}

export async function deleteProductPurchasesBulk(purchaseIds: string[]): Promise<void> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from("product_purchases")
    .delete()
    .in("id", purchaseIds);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAdminOrders(): Promise<AdminOrdersResponse> {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo",
      orders: [],
    };
  }
  const client = supabase;

  let ordersResult = await fetchOrders(true);

  if (
    ordersResult.error &&
    isMissingCustomerIdentityColumnError(ordersResult.error.message)
  ) {
    ordersResult = await fetchOrders(false);
  }

  const { data, error } = ordersResult;

  if (error) {
    console.error("Error fetching admin orders:", error);
    return {
      mode: "supabase",
      orders: [],
    };
  }

  const { data: mobileClients } = await client
    .from("mobile_clients")
    .select("id, full_name, phone, identity_number");

  const identitiesByPhone = new Map<string, string>();
  const identitiesByName = new Map<string, string>();
  const mobileClientsById = new Map<string, {
    full_name?: string | null;
    identity_number?: string | null;
    phone?: string | null;
  }>();

  for (const client of mobileClients || []) {
    if (client.id) {
      mobileClientsById.set(client.id, client);
    }

    const identity = client.identity_number;
    if (!identity) continue;
    const phoneKey = client.phone?.trim() || "";
    const nameKey = client.full_name?.toLowerCase().trim() || "";
    if (phoneKey) identitiesByPhone.set(phoneKey, identity);
    if (nameKey) identitiesByName.set(nameKey, identity);
  }

  return {
    mode: "supabase",
    orders: (data as any[]).map((order) => {
      const employeeUser = order.employee_user_id
        ? mobileClientsById.get(order.employee_user_id)
        : null;
      const deliveryUser = order.delivery_user_id
        ? mobileClientsById.get(order.delivery_user_id)
        : null;

      return {
        id: order.id,
        order_code: order.order_code,
        customer_name: order.customers?.full_name ?? "Desconocido",
        customer_identity:
          order.customers?.identity_number ||
          extractCedulaFromNotes(order.notes) ||
          identitiesByPhone.get(order.customers?.phone?.trim() || "") ||
          identitiesByName.get(order.customers?.full_name?.toLowerCase().trim() || ""),
        customer_phone: order.customers?.phone,
        status: order.status,
        channel: order.channel,
        payment_method: order.payment_method,
        transfer_receipt_url: order.transfer_receipt_url,
        subtotal: (order.order_items || []).reduce((sum: number, item: any) => sum + Number(item.line_total), 0),
        discount: Number(order.discount),
        total: (order.order_items || []).reduce((sum: number, item: any) => sum + Number(item.line_total) + (item.products?.has_iva ? Math.round((Number(item.line_total) * (item.products?.iva_rate || 15) / 100 + Number.EPSILON) * 100) / 100 : 0), 0) - Number(order.discount),
        notes: order.notes,
        delivery_lat: order.delivery_lat != null ? Number(order.delivery_lat) : null,
        delivery_lng: order.delivery_lng != null ? Number(order.delivery_lng) : null,
        delivery_user_id: order.delivery_user_id,
        employee_user_id: order.employee_user_id ?? null,
        delivery_user_name: deliveryUser?.full_name ?? null,
        delivery_user_identity: deliveryUser?.identity_number ?? null,
        delivery_user_phone: deliveryUser?.phone ?? null,
        employee_user_name: employeeUser?.full_name ?? null,
        employee_user_identity: employeeUser?.identity_number ?? null,
        employee_user_phone: employeeUser?.phone ?? null,
        dispatched_at:
          order.dispatched_at ??
          getOrderTrackingNote(order.notes, ORDER_DISPATCHED_AT_LABEL),
        delivered_at:
          order.delivered_at ??
          getOrderTrackingNote(order.notes, ORDER_DELIVERED_AT_LABEL),
        created_at: order.created_at,
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          line_total: Number(item.line_total),
          has_iva: item.products?.has_iva ?? false,
          iva_rate: item.products?.iva_rate ?? null,
        })),
      };
    }),
  };

  function fetchOrders(includeIdentity: boolean) {
    return client
      .from("orders")
      .select(`
      *,
      customers (
        id,
        full_name,
        ${includeIdentity ? "identity_number," : ""}
        phone
      ),
      order_items (
        id,
        product_id,
        product_name,
        quantity,
        unit_price,
        line_total,
        products (has_iva, iva_rate)
      )
      `)
      .eq("is_deleted_by_admin", false)
      .order("created_at", { ascending: false });
  }
}

function isMissingCustomerIdentityColumnError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("identity_number") &&
    (normalized.includes("customers") ||
      normalized.includes("schema cache") ||
      normalized.includes("column"))
  );
}

function extractCedulaFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const clientMatch = notes.match(/CLIENTE_CEDULA:\s*([A-Za-z0-9\-]+)/i);
  if (clientMatch) return clientMatch[1];
  
  const match = notes.match(/Cedula\/RUC:\s*([A-Za-z0-9\-]+)/i);
  if (match) {
    const cedula = match[1];
    if (cedula === "0963671755" && notes.includes("Titular: MONTAÑO RONDON JOELYS")) {
      return null;
    }
    return cedula;
  }
  return null;
}
