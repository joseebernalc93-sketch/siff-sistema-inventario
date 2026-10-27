import { getServiceSupabase } from "@/lib/supabase-server";
import { normalizeProductMeasurementUnit } from "@/lib/pricing";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identity = searchParams.get("identity")?.trim();

    if (!identity) {
      return Response.json(
        { ok: false, error: "Identidad requerida" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getServiceSupabase();
    if (!supabase) {
      return Response.json(
        { ok: false, error: "Supabase no configurado" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Buscar el cliente movil
    const { data: mobileClient } = await supabase
      .from("mobile_clients")
      .select("phone, full_name")
      .eq("identity_number", identity)
      .maybeSingle();

    if (!mobileClient) {
      return Response.json(
        { ok: true, invoices: [] },
        { headers: corsHeaders }
      );
    }

    const phone = mobileClient.phone?.trim();
    const fullName = mobileClient.full_name?.trim();

    // Consultar customers
    let customerQuery = supabase.from("customers").select("id");
    if (phone) {
      customerQuery = customerQuery.eq("phone", phone);
    } else if (fullName) {
      customerQuery = customerQuery.eq("full_name", fullName);
    } else {
      return Response.json(
        { ok: true, invoices: [] },
        { headers: corsHeaders }
      );
    }

    const { data: customers } = await customerQuery;
    const customerIds = (customers ?? []).map((c) => c.id);

    if (!customerIds.length) {
      return Response.json(
        { ok: true, invoices: [] },
        { headers: corsHeaders }
      );
    }

    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id,
        order_code,
        status,
        channel,
        subtotal,
        discount,
        total,
        notes,
        created_at,
        customers(full_name, phone),
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
      `)
      .in("customer_id", customerIds)
      .in("status", ["delivered", "cancelled", "confirmed", "preparing"])
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const invoices = (orders ?? []).map((row: any) => {
      const items = (row.order_items ?? []).map((item: any) => {
        const presentationName = getInvoiceItemPresentationName(item.product_name);
        return {
          id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          line_total: Number(item.line_total),
          presentation_name: presentationName,
          has_iva: item.products?.has_iva ?? false,
          iva_rate: item.products?.iva_rate ?? null,
        };
      });

      return {
        id: row.id,
        invoice_number: row.order_code,
        customer_name: row.customers?.full_name ?? "Consumidor final",
        customer_phone: row.customers?.phone ?? "",
        customer_identity: identity ?? "",
        status: row.status,
        channel: row.channel,
        subtotal: Number(row.subtotal),
        discount: Number(row.discount),
        total: Number(row.total),
        notes: row.notes,
        created_at: row.created_at,
        items,
      };
    });

    return Response.json(
      { ok: true, invoices },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("API Error in mobile clients invoices:", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error del servidor",
      },
      { status: 500, headers: corsHeaders }
    );
  }
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
