import { mockProducts } from "@/lib/mock-data";
import {
  getOrderStockQuantity,
  normalizeProductMeasurementUnit,
} from "@/lib/pricing";
import {
  getOrderTrackingNote,
  ORDER_DELIVERED_AT_LABEL,
  ORDER_DISPATCHED_AT_LABEL,
} from "@/lib/order-tracking";
import { getServiceSupabase } from "@/lib/supabase-server";
import type { InvoiceItem, InvoiceRecord } from "@/lib/types";
import type { StorageMode } from "@/lib/admin-data";

export type AdminInvoicesResponse = {
  mode: StorageMode;
  invoices: InvoiceRecord[];
};

export type AdminInvoiceMutationResponse = {
  mode: StorageMode;
  invoiceId: string;
};

type InvoiceCustomerRow = {
  full_name: string;
  identity_number?: string | null;
  phone: string | null;
};

type InvoiceMobileClientRow = {
  id?: string | null;
  full_name: string;
  identity_number: string;
  phone: string | null;
};

type InvoiceItemRow = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  line_total: number | string;
  products?: {
    measurement_unit?: string | null;
    has_iva?: boolean | null;
    iva_rate?: number | null;
  } | null;
  sale_item_lots?: Array<{ quantity: number | string }> | null;
};

type InvoiceRow = {
  id: string;
  order_code: string;
  status: string;
  channel: string;
  subtotal: number | string;
  discount: number | string;
  total: number | string;
  notes: string | null;
  created_at: string;
  updated_at?: string | null;
  payment_method: string | null;
  transfer_receipt_url?: string | null;
  delivery_user_id?: string | null;
  employee_user_id?: string | null;
  delivery_lat?: number | string | null;
  delivery_lng?: number | string | null;
  customers: InvoiceCustomerRow | null;
  order_items: InvoiceItemRow[] | null;
};

type CancelInvoiceRow = {
  id: string;
  order_code: string;
  status: string;
  order_items: Array<{
    id: string;
    product_id: string | null;
    product_name: string;
    quantity: number;
  }> | null;
};

export async function getAdminInvoices(): Promise<AdminInvoicesResponse> {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo",
      invoices: getMockInvoices(),
    };
  }

  const client = supabase;
  let { data, error } = await fetchInvoiceRows(true);

  if (error?.message.includes("identity_number")) {
    const fallbackResult = await fetchInvoiceRows(false);
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  const invoiceRows = (data ?? []) as unknown as InvoiceRow[];
  const mobileClientRows = await fetchMatchingMobileClients(invoiceRows);

  return {
    mode: "supabase",
    invoices: normalizeInvoices(invoiceRows, mobileClientRows),
  };

  async function fetchInvoiceRows(includeIdentity: boolean) {
    const customerColumns = includeIdentity
      ? "full_name, identity_number, phone"
      : "full_name, phone";

    return client
      .from("orders")
      .select(
        `
        id,
        order_code,
        status,
        channel,
        subtotal,
        discount,
        total,
        notes,
        created_at,
        updated_at,
        payment_method,
        transfer_receipt_url,
        delivery_user_id,
        employee_user_id,
        delivery_lat,
        delivery_lng,
        customers(${customerColumns}),
        order_items(
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          line_total,
          products(measurement_unit, has_iva, iva_rate),
          sale_item_lots(quantity)
        )
        `,
      )
      .in("status", ["delivered", "cancelled"])
      .eq("is_deleted_by_admin", false)
      .order("created_at", { ascending: false });
  }

  async function fetchMatchingMobileClients(rows: InvoiceRow[]) {
    const phones = [
      ...new Set(
        rows
          .map((row) => row.customers?.phone?.trim())
          .filter((phone): phone is string => Boolean(phone)),
      ),
    ];
    const names = [
      ...new Set(
        rows
          .map((row) => row.customers?.full_name?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    const userIds = [
      ...new Set(
        rows
          .flatMap((row) => [row.employee_user_id, row.delivery_user_id])
          .map((id) => id?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const results = await Promise.all([
      phones.length
        ? client
            .from("mobile_clients")
            .select("id, full_name, identity_number, phone")
            .in("phone", phones)
        : Promise.resolve({ data: [], error: null }),
      names.length
        ? client
            .from("mobile_clients")
            .select("id, full_name, identity_number, phone")
            .in("full_name", names)
        : Promise.resolve({ data: [], error: null }),
      userIds.length
        ? client
            .from("mobile_clients")
            .select("id, full_name, identity_number, phone")
            .in("id", userIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    return results.flatMap((result) =>
      result.error
        ? []
        : ((result.data ?? []) as unknown as InvoiceMobileClientRow[]),
    );
  }
}

export async function cancelAdminInvoice(
  id: string,
): Promise<AdminInvoiceMutationResponse> {
  if (!id) {
    throw new Error("El id del comprobante es obligatorio.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo",
      invoiceId: id,
    };
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("orders")
    .select("id, order_code, status, order_items(id, product_id, product_name, quantity)")
    .eq("id", id)
    .single();

  if (invoiceError) {
    throw new Error(invoiceError.message);
  }

  const invoiceRow = invoice as unknown as CancelInvoiceRow;

  if (invoiceRow.status === "cancelled") {
    return {
      mode: "supabase",
      invoiceId: id,
    };
  }

  for (const item of invoiceRow.order_items ?? []) {
    if (!item.product_id) {
      continue;
    }

    const restoredFromLots = await restoreInvoiceItemLots(
      supabase,
      item.id,
      item.product_id,
      invoiceRow.order_code,
      id,
    );

    if (restoredFromLots > 0) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("id", item.product_id)
        .single();

      if (productError) {
        throw new Error(productError.message);
      }

      const nextStock = Number(product.stock) + restoredFromLots;
      const updateProductResult = await supabase
        .from("products")
        .update({ stock: nextStock })
        .eq("id", item.product_id);

      if (updateProductResult.error) {
        throw new Error(updateProductResult.error.message);
      }

      continue;
    }

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("stock, measurement_unit")
      .eq("id", item.product_id)
      .single();

    if (productError) {
      throw new Error(productError.message);
    }

    const restoredStock = getOrderStockQuantity(
      product,
      Number(item.quantity),
    );
    const nextStock = Number(product.stock) + restoredStock;
    const updateResult = await supabase
      .from("products")
      .update({ stock: nextStock })
      .eq("id", item.product_id);

    if (updateResult.error) {
      throw new Error(updateResult.error.message);
    }

    const movementResult = await supabase.from("stock_movements").insert({
      product_id: item.product_id,
      movement_type: "in",
      quantity: restoredStock,
      reason: `Cancelacion de comprobante ${invoiceRow.order_code}`,
      order_id: id,
    });

    if (movementResult.error) {
      throw new Error(movementResult.error.message);
    }
  }

  const updateOrderResult = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (updateOrderResult.error) {
    throw new Error(updateOrderResult.error.message);
  }

  return {
    mode: "supabase",
    invoiceId: id,
  };
}

async function restoreInvoiceItemLots(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  orderItemId: string,
  productId: string,
  orderCode: string,
  orderId: string,
) {
  const allocationsResult = await supabase
    .from("sale_item_lots")
    .select("lot_id, quantity")
    .eq("order_item_id", orderItemId);

  if (allocationsResult.error) {
    if (isMissingInventoryLotTableError(allocationsResult.error.message)) {
      return 0;
    }

    throw new Error(allocationsResult.error.message);
  }

  const allocations = (allocationsResult.data ?? []) as Array<{
    lot_id: string | null;
    quantity: number | string;
  }>;

  if (!allocations.length) {
    return 0;
  }

  let restoredQuantity = 0;

  for (const allocation of allocations) {
    if (!allocation.lot_id) {
      continue;
    }

    const quantity = Number(allocation.quantity) || 0;

    if (quantity <= 0) {
      continue;
    }

    const lotResult = await supabase
      .from("product_lots")
      .select("quantity_remaining")
      .eq("id", allocation.lot_id)
      .single();

    if (lotResult.error) {
      if (isMissingInventoryLotTableError(lotResult.error.message)) {
        return 0;
      }

      throw new Error(lotResult.error.message);
    }

    const currentQuantity =
      Number(
        (lotResult.data as { quantity_remaining?: number | string } | null)
          ?.quantity_remaining,
      ) || 0;
    const nextQuantity = Number((currentQuantity + quantity).toFixed(3));
    const updateLotResult = await supabase
      .from("product_lots")
      .update({
        quantity_remaining: nextQuantity,
        status: "available",
      })
      .eq("id", allocation.lot_id);

    if (updateLotResult.error) {
      throw new Error(updateLotResult.error.message);
    }

    const movementResult = await supabase.from("stock_movements").insert({
      product_id: productId,
      lot_id: allocation.lot_id,
      movement_type: "in",
      quantity,
      reason: `Cancelacion de comprobante ${orderCode}`,
      order_id: orderId,
    });

    if (movementResult.error) {
      if (isMissingStockMovementLotColumnError(movementResult.error.message)) {
        const fallbackMovementResult = await supabase
          .from("stock_movements")
          .insert({
            product_id: productId,
            movement_type: "in",
            quantity,
            reason: `Cancelacion de comprobante ${orderCode}`,
            order_id: orderId,
          });

        if (fallbackMovementResult.error) {
          throw new Error(fallbackMovementResult.error.message);
        }
      } else {
        throw new Error(movementResult.error.message);
      }
    }

    restoredQuantity = Number((restoredQuantity + quantity).toFixed(3));
  }

  return restoredQuantity;
}

function isMissingInventoryLotTableError(message: string) {
  const normalized = message.toLowerCase();

  return (
    (normalized.includes("product_lots") ||
      normalized.includes("sale_item_lots")) &&
    (normalized.includes("does not exist") ||
      normalized.includes("schema cache") ||
      normalized.includes("could not find"))
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

export async function deleteAdminInvoice(
  id: string,
): Promise<AdminInvoiceMutationResponse> {
  if (!id) {
    throw new Error("El id del comprobante es obligatorio.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo",
      invoiceId: id,
    };
  }

  const invoiceResult = await supabase
    .from("orders")
    .select("status")
    .eq("id", id)
    .single();

  if (invoiceResult.error) {
    throw new Error(invoiceResult.error.message);
  }

  // Remove the restriction that invoice must be cancelled
  // User explicitly requested to delete history without altering stock
  // Update: use soft delete to hide from admin but keep for clients
  
  const { error } = await supabase
    .from("orders")
    .update({ is_deleted_by_admin: true })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    mode: "supabase",
    invoiceId: id,
  };
}

function normalizeInvoices(
  rows: InvoiceRow[],
  mobileClients: InvoiceMobileClientRow[] = [],
): InvoiceRecord[] {
  const identitiesByPhone = new Map<string, string>();
  const identitiesByName = new Map<string, string>();
  const mobileClientsById = new Map<string, InvoiceMobileClientRow>();

  for (const client of mobileClients) {
    if (client.id) {
      mobileClientsById.set(client.id, client);
    }

    const identity = client.identity_number?.trim();
    if (!identity) {
      continue;
    }

    const phoneKey = normalizeCustomerLookupPhone(client.phone);
    const nameKey = normalizeCustomerLookupName(client.full_name);
    if (phoneKey) {
      identitiesByPhone.set(phoneKey, identity);
    }
    if (nameKey) {
      identitiesByName.set(nameKey, identity);
    }
  }

  return rows.map((row) => {
    const employeeUser = row.employee_user_id
      ? mobileClientsById.get(row.employee_user_id)
      : null;
    const deliveryUser = row.delivery_user_id
      ? mobileClientsById.get(row.delivery_user_id)
      : null;

    return {
      id: row.id,
      invoice_number: row.order_code,
      customer_name: row.customers?.full_name ?? "Consumidor final",
      customer_identity:
        row.customers?.identity_number ??
        extractCedulaFromNotes(row.notes) ??
        identitiesByPhone.get(normalizeCustomerLookupPhone(row.customers?.phone)) ??
        identitiesByName.get(
          normalizeCustomerLookupName(row.customers?.full_name),
        ) ??
        null,
      customer_phone: row.customers?.phone ?? null,
      status: row.status,
      channel: row.channel,
      subtotal: (row.order_items || []).reduce((sum: number, item: any) => sum + Number(item.line_total), 0),
      discount: Number(row.discount),
      total: (row.order_items || []).reduce((sum: number, item: any) => {
        const lineTotal = Number(item.line_total);
        const ivaRate = item.products?.has_iva ? (item.products?.iva_rate || 15) : 0;
        const ivaAmount = ivaRate > 0 ? Math.round((lineTotal * ivaRate / 100 + Number.EPSILON) * 100) / 100 : 0;
        return sum + lineTotal + ivaAmount;
      }, 0) - Number(row.discount),
      notes: row.notes,
      created_at: row.created_at,
      payment_method: row.payment_method ?? null,
      transfer_receipt_url: row.transfer_receipt_url ?? null,
      delivery_user_id: row.delivery_user_id ?? null,
      employee_user_id: row.employee_user_id ?? null,
      delivery_user_name: deliveryUser?.full_name ?? null,
      delivery_user_identity: deliveryUser?.identity_number ?? null,
      delivery_user_phone: deliveryUser?.phone ?? null,
      employee_user_name: employeeUser?.full_name ?? null,
      employee_user_identity: employeeUser?.identity_number ?? null,
      employee_user_phone: employeeUser?.phone ?? null,
      dispatched_at: getOrderTrackingNote(
        row.notes,
        ORDER_DISPATCHED_AT_LABEL,
      ),
      delivered_at:
        getOrderTrackingNote(row.notes, ORDER_DELIVERED_AT_LABEL) ??
        (row.status === "delivered" ? row.updated_at ?? row.created_at : null),
      delivery_lat: row.delivery_lat != null ? Number(row.delivery_lat) : null,
      delivery_lng: row.delivery_lng != null ? Number(row.delivery_lng) : null,
      items: normalizeInvoiceItems(row.order_items ?? []),
    };
  });
}

function normalizeCustomerLookupPhone(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeCustomerLookupName(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase("es-EC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeInvoiceItems(items: InvoiceItemRow[]): InvoiceItem[] {
  return items.map((item) => {
    const quantity = Number(item.quantity);
    const stockUnit = normalizeProductMeasurementUnit(
      item.products?.measurement_unit,
    );
    const presentationName = getInvoiceItemPresentationName(item.product_name);
    const allocatedStock = (item.sale_item_lots ?? []).reduce(
      (sum, allocation) => sum + Number(allocation.quantity),
      0,
    );
    const stockQuantity =
      allocatedStock > 0
        ? Number(allocatedStock.toFixed(3))
        : inferInvoiceItemStockQuantity(
            quantity,
            stockUnit,
            presentationName,
          );

    return {
      id: item.id,
      product_id: item.product_id,
      product_name: formatInvoiceItemProductName(
        item.product_name,
        presentationName,
        stockQuantity,
        stockUnit,
      ),
      quantity,
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
      presentation_name: presentationName,
      stock_quantity: stockQuantity,
      stock_unit: stockUnit,
      has_iva: item.products?.has_iva ?? false,
      iva_rate: item.products?.iva_rate ?? null,
    };
  });
}

function getInvoiceItemPresentationName(productName: string) {
  const separatorIndex = productName.lastIndexOf(" - ");
  if (separatorIndex < 0) {
    return null;
  }

  return productName
    .slice(separatorIndex + 3)
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim() || null;
}

function inferInvoiceItemStockQuantity(
  quantity: number,
  stockUnit: "unit" | "lb",
  presentationName: string | null,
) {
  if (stockUnit !== "lb") {
    return quantity;
  }

  const normalizedPresentation = presentationName
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalizedPresentation?.includes("medio quintal")) {
    return Number((quantity * 50).toFixed(3));
  }
  if (normalizedPresentation?.includes("quintal")) {
    return Number((quantity * 100).toFixed(3));
  }

  return quantity;
}

function formatInvoiceItemProductName(
  storedName: string,
  presentationName: string | null,
  stockQuantity: number,
  stockUnit: "unit" | "lb",
) {
  const separatorIndex = storedName.lastIndexOf(" - ");
  const baseName = (separatorIndex >= 0
    ? storedName.slice(0, separatorIndex)
    : storedName
  )
    .replace(stockUnit === "lb" ? /\s+100\s*lb\s*$/i : /$^/, "")
    .trim();

  if (presentationName && stockUnit === "lb") {
    return `${presentationName} ${baseName} ${formatStockQuantity(stockQuantity)} lb`;
  }

  return baseName;
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

function formatStockQuantity(quantity: number) {
  return Number(quantity.toFixed(3)).toString();
}

function getMockInvoices(): InvoiceRecord[] {
  const [milk, rice, soda] = mockProducts;
  const items: InvoiceItem[] = [
    {
      id: "demo-item-leche",
      product_id: milk.id,
      product_name: milk.name,
      quantity: 2,
      unit_price: milk.price,
      line_total: milk.price * 2,
    },
    {
      id: "demo-item-arroz",
      product_id: rice.id,
      product_name: rice.name,
      quantity: 1,
      unit_price: rice.price,
      line_total: rice.price,
    },
    {
      id: "demo-item-cola",
      product_id: soda.id,
      product_name: soda.name,
      quantity: 1,
      unit_price: soda.price,
      line_total: soda.price,
    },
  ];
  const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);

  return [
    {
      id: "demo-invoice-1",
      invoice_number: "COMP-DEMO-0001",
      customer_name: "Cliente de ejemplo",
      customer_identity: "0912345678",
      customer_phone: "0990001111",
      status: "confirmed",
      channel: "web",
      subtotal: Number(subtotal.toFixed(2)),
      discount: 0,
      total: Number(subtotal.toFixed(2)),
      notes: "Comprobante demo para visualizar el modulo.",
      created_at: new Date().toISOString(),
      payment_method: "efectivo",
      items,
    },
  ];
}

export async function bulkDeleteAdminInvoices(
  ids: string[],
): Promise<{ mode: StorageMode; count: number }> {
  if (!ids || ids.length === 0) {
    throw new Error("No ids provided.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    return { mode: "demo", count: ids.length };
  }

  const { error } = await supabase
    .from("orders")
    .update({ is_deleted_by_admin: true })
    .in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  return {
    mode: "supabase",
    count: ids.length,
  };
}
