import { mockProducts } from "@/lib/mock-data";
import {
  calculateProductLineTotal,
  getOrderStockQuantity,
  getProductPresentation,
  isWeightBasedProduct,
  normalizeMoney,
  normalizeProductPresentation,
} from "@/lib/pricing";
import { getServiceSupabase } from "@/lib/supabase-server";
import type {
  OrderItemInput,
  OrderRequest,
  OrderResult,
  Product,
  ProductLot,
  ProductPresentation,
} from "@/lib/types";

export async function createOrder(payload: OrderRequest): Promise<OrderResult> {
  validateOrder(payload);

  const supabase = getServiceSupabase();

  if (!supabase) {
    const total = payload.items.reduce((sum, item) => {
      const product = mockProducts.find(
        (entry) => entry.id === item.product_id,
      );
      if (!product) return sum;
      const lineTotal = calculateProductLineTotal(
        product,
        item.quantity,
        item.presentation_id,
      );
      const iva = product.has_iva && product.iva_rate ? (lineTotal * product.iva_rate) / 100 : 0;
      return sum + lineTotal + iva;
    }, 0);

    return {
      order_id: `demo-${Date.now()}`,
      order_code: `DEMO-${Math.floor(Math.random() * 9000) + 1000}`,
      total: Number(total.toFixed(2)),
    };
  }

  const products = await fetchOrderProducts(supabase, payload.items);
  const preparedItems = payload.items.map((item) => {
    const product = products.get(item.product_id);

    if (!product || !product.is_active) {
      throw new Error("Producto no disponible.");
    }

    const presentation = getProductPresentation(product, item.presentation_id);
    const stockQuantity = getOrderStockQuantity(
      product,
      item.quantity,
      presentation?.id,
    );

    if (stockQuantity <= 0) {
      throw new Error("Cantidad invalida en el pedido.");
    }

    if (Number(product.stock) < stockQuantity) {
      throw new Error(`Stock insuficiente para ${product.name}.`);
    }

    return {
      item,
      product,
      presentation,
      stockQuantity,
      unitPrice: normalizeMoney(presentation?.price ?? product.price),
      lineTotal: calculateProductLineTotal(
        product,
        item.quantity,
        presentation?.id,
      ),
    };
  });
  const subtotal = preparedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalIva = preparedItems.reduce((sum, item) => {
    if (item.product.has_iva && item.product.iva_rate) {
      return sum + Math.round((item.lineTotal * item.product.iva_rate / 100 + Number.EPSILON) * 100) / 100;
    }
    return sum;
  }, 0);
  const total = subtotal + totalIva;

  const customerId = await upsertOrderCustomer(supabase, payload);
  const orderCode = createOrderCode();
  
  let finalNotes = payload.notes ?? "";
  const hasTransferData = payload.payment_method === "transferencia" && payload.transfer_receipt_url;
  
  if (hasTransferData) {
    const transferNote = `METODO_PAGO: TRANSFERENCIA\nCOMPROBANTE: ${payload.transfer_receipt_url}`;
    finalNotes = finalNotes ? `${transferNote}\n\n${finalNotes}` : transferNote;
  }

  if (payload.customer_identity && !finalNotes.includes(`CLIENTE_CEDULA: ${payload.customer_identity}`)) {
    finalNotes = `CLIENTE_CEDULA: ${payload.customer_identity}\n${finalNotes}`;
  }

  if (finalNotes.includes("RETIRO EN LOCAL")) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .ilike("notes", "%RETIRO EN LOCAL%")
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString());

    const ticketNumber = String((count ?? 0) + 1).padStart(2, "0");
    finalNotes = finalNotes.replace("RETIRO EN LOCAL", `RETIRO EN LOCAL - TICKET: ${ticketNumber}`);
  }

  const baseOrderPayload = {
    order_code: orderCode,
    customer_id: customerId,
    channel: payload.channel ?? "android",
    notes: finalNotes || null,
    delivery_lat: payload.delivery_lat ?? null,
    delivery_lng: payload.delivery_lng ?? null,
    subtotal: Number(subtotal.toFixed(2)),
    discount: 0,
    total: Number(total.toFixed(2)),
  };

  let orderResult = await supabase
    .from("orders")
    .insert({
      ...baseOrderPayload,
      payment_method: payload.payment_method ?? 'efectivo',
      transfer_receipt_url: payload.transfer_receipt_url ?? null,
    })
    .select("id, order_code, total")
    .single();

  if (orderResult.error) {
    // Fallback if columns don't exist yet
    if (orderResult.error.message.includes("payment_method") || orderResult.error.message.includes("transfer_receipt_url") || orderResult.error.message.includes("column")) {
      orderResult = await supabase
        .from("orders")
        .insert({
          ...baseOrderPayload,
          notes: finalNotes || null,
        })
        .select("id, order_code, total")
        .single();
    }
  }

  if (orderResult.error) {
    throw new Error(orderResult.error.message);
  }

  for (const prepared of preparedItems) {
    await insertOrderItem(supabase, orderResult.data.id, prepared);
  }

  return {
    order_id: orderResult.data.id,
    order_code: orderResult.data.order_code,
    payment_method: payload.payment_method ?? "efectivo",
    total: Number(orderResult.data.total),
  };
}

function validateOrder(payload: OrderRequest) {
  if (!payload.customer_name?.trim()) {
    throw new Error("El nombre del cliente es obligatorio.");
  }

  if (!payload.items?.length) {
    throw new Error("El pedido debe incluir al menos un producto.");
  }

  for (const item of payload.items) {
    const quantity = Number(item.quantity);

    if (!item.product_id || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Cada item debe tener producto y cantidad valida.");
    }

    item.quantity = Number(quantity.toFixed(3));
  }
}

type OrderPreparedItem = {
  item: OrderItemInput;
  product: Product;
  presentation: ProductPresentation | null;
  stockQuantity: number;
  unitPrice: number;
  lineTotal: number;
};

async function fetchOrderProducts(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  items: OrderItemInput[],
) {
  const productIds = [...new Set(items.map((item) => item.product_id))];
  const today = getCurrentEcuadorDateInput();
  const [productsResult, lotsResult, presentationsResult] = await Promise.all([
    supabase.from("products").select("*").in("id", productIds),
    supabase
      .from("product_lots")
      .select("*")
      .in("product_id", productIds)
      .order("expiration_date", { ascending: true, nullsFirst: false })
      .order("entry_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("product_presentations")
      .select("*")
      .in("product_id", productIds)
      .eq("is_active", true),
  ]);

  if (productsResult.error) {
    throw new Error(productsResult.error.message);
  }

  const lots = lotsResult.error
    ? []
    : ((lotsResult.data ?? []) as ProductLot[]);
  const presentations = presentationsResult.error
    ? []
    : ((presentationsResult.data ?? []) as ProductPresentation[]);
  const lotsByProduct = new Map<string, ProductLot[]>();
  const presentationsByProduct = new Map<string, ProductPresentation[]>();

  lots.forEach((lot) => {
    const current = lotsByProduct.get(lot.product_id) ?? [];
    current.push(lot);
    lotsByProduct.set(lot.product_id, current);
  });
  presentations.forEach((presentation) => {
    const current = presentationsByProduct.get(presentation.product_id) ?? [];
    current.push(normalizeProductPresentation(presentation));
    presentationsByProduct.set(presentation.product_id, current);
  });

  return new Map(
    ((productsResult.data ?? []) as Product[]).map((product) => {
      const productLots = lotsByProduct.get(product.id) ?? [];
      const sellableLots = productLots.filter((lot) =>
        isSellableProductLot(lot, today),
      );
      const stock = productLots.length
        ? sumProductLotStock(sellableLots)
        : isExpiredDate(product.expiration_date, today)
          ? 0
          : Number(product.stock) || 0;

      return [
        product.id,
        {
          ...product,
          price: normalizeMoney(product.price),
          stock,
          expiration_date: productLots.length
            ? getNearestExpirationDate(sellableLots)
            : product.expiration_date,
          lots: sellableLots,
          presentations: presentationsByProduct.get(product.id) ?? [],
        } satisfies Product,
      ];
    }),
  );
}

async function upsertOrderCustomer(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  payload: OrderRequest,
) {
  const name = payload.customer_name.trim();
  const identity = payload.customer_identity?.trim() || null;
  const phone = payload.customer_phone?.trim() || null;
  const customerPayload = {
    full_name: name,
    identity_number: identity,
    phone,
  };
  const query = supabase
    .from("customers")
    .upsert(customerPayload, {
      onConflict: identity ? "identity_number" : phone ? "phone" : "full_name",
    })
    .select("id")
    .single();
  const { data, error } = await query;

  if (error) {
    if (isMissingCustomerIdentityColumnError(error.message)) {
      return upsertLegacyOrderCustomer(supabase, name, phone);
    }

    const fallback = await supabase
      .from("customers")
      .insert(customerPayload)
      .select("id")
      .single();

    if (fallback.error) {
      throw new Error(fallback.error.message);
    }

    return fallback.data.id as string;
  }

  return data.id as string;
}

async function upsertLegacyOrderCustomer(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  name: string,
  phone: string | null,
) {
  const lookup = phone
    ? supabase.from("customers").select("id").eq("phone", phone)
    : supabase.from("customers").select("id").eq("full_name", name);
  const existingResult = await lookup.limit(1).maybeSingle();

  if (existingResult.error) {
    throw new Error(existingResult.error.message);
  }

  if (existingResult.data?.id) {
    const updateResult = await supabase
      .from("customers")
      .update({ full_name: name, phone })
      .eq("id", existingResult.data.id)
      .select("id")
      .single();

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    return updateResult.data.id as string;
  }

  const insertResult = await supabase
    .from("customers")
    .insert({ full_name: name, phone })
    .select("id")
    .single();

  if (insertResult.error) {
    throw new Error(insertResult.error.message);
  }

  return insertResult.data.id as string;
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

async function insertOrderItem(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  orderId: string,
  prepared: OrderPreparedItem,
) {
  const itemResult = await supabase
    .from("order_items")
    .insert({
      order_id: orderId,
      product_id: prepared.product.id,
      product_name: getOrderItemProductName(prepared),
      quantity: prepared.item.quantity,
      unit_price: prepared.unitPrice,
      line_total: prepared.lineTotal,
    })
    .select("id")
    .single();

  if (itemResult.error) {
    throw new Error(itemResult.error.message);
  }

  await reduceProductStockForOrder(
    supabase,
    prepared.product,
    orderId,
    itemResult.data.id as string,
    prepared.stockQuantity,
  );
}

async function reduceProductStockForOrder(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  product: Product,
  orderId: string,
  orderItemId: string,
  stockQuantity: number,
) {
  let remaining = stockQuantity;

  for (const lot of product.lots ?? []) {
    if (remaining <= 0) {
      break;
    }

    const lotQuantity = Math.max(0, Number(lot.quantity_remaining) || 0);
    if ((lot.status ?? "available") !== "available" || lotQuantity <= 0) {
      continue;
    }

    const taken = Math.min(lotQuantity, remaining);
    const nextQuantity = Number((lotQuantity - taken).toFixed(3));
    const lotUpdate = await supabase
      .from("product_lots")
      .update({
        quantity_remaining: nextQuantity,
        status: nextQuantity <= 0 ? "depleted" : lot.status,
      })
      .eq("id", lot.id);

    if (lotUpdate.error) {
      throw new Error(lotUpdate.error.message);
    }

    const saleItemLotResult = await supabase.from("sale_item_lots").insert({
      order_item_id: orderItemId,
      product_id: product.id,
      lot_id: lot.id,
      quantity: taken,
    });

    if (saleItemLotResult.error) {
      throw new Error(saleItemLotResult.error.message);
    }

    const movementResult = await supabase.from("stock_movements").insert({
      product_id: product.id,
      lot_id: lot.id,
      movement_type: "out",
      quantity: taken * -1,
      reason: "Venta automatizada",
      order_id: orderId,
    });

    if (movementResult.error) {
      throw new Error(movementResult.error.message);
    }

    remaining = Number((remaining - taken).toFixed(3));
  }

  if (remaining > 0) {
    const movementResult = await supabase.from("stock_movements").insert({
      product_id: product.id,
      movement_type: "out",
      quantity: remaining * -1,
      reason: "Venta automatizada",
      order_id: orderId,
    });

    if (movementResult.error) {
      throw new Error(movementResult.error.message);
    }
  }

  const productUpdate = await supabase
    .from("products")
    .update({
      stock: Number(
        Math.max(0, Number(product.stock) - stockQuantity).toFixed(3),
      ),
    })
    .eq("id", product.id);

  if (productUpdate.error) {
    throw new Error(productUpdate.error.message);
  }
}

function getOrderItemProductName(prepared: OrderPreparedItem) {
  const productName = isWeightBasedProduct(prepared.product)
    ? prepared.product.name.replace(/\s+100\s*lb\s*$/i, "").trim()
    : prepared.product.name;

  if (
    !prepared.presentation ||
    prepared.presentation.unit_quantity === 1 ||
    prepared.presentation.name === "Unidad"
  ) {
    return productName;
  }

  const stockLabel = isWeightBasedProduct(prepared.product)
    ? ` (${prepared.stockQuantity} lb)`
    : "";
  return `${productName} - ${prepared.presentation.name}${stockLabel}`;
}

function createOrderCode() {
  const date = new Date();
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `ORD-${day}-${token}`;
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

function sumProductLotStock(lots: ProductLot[]) {
  return Number(
    lots
      .reduce((sum, lot) => sum + Math.max(0, Number(lot.quantity_remaining) || 0), 0)
      .toFixed(3),
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

function isExpiredDate(value: string | null | undefined, today: string) {
  const expirationDate = normalizeDateInput(value);

  return Boolean(expirationDate && expirationDate < today);
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
