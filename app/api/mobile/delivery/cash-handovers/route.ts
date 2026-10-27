import { getServiceSupabase } from "@/lib/supabase-server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

type DeliveryCashOrderRow = {
  id: string;
  order_code: string;
  total: number | string | null;
  cash_handover_status: string | null;
  cash_confirmed_at: string | null;
  created_at: string;
  notes: string | null;
  customers: { full_name: string | null } | { full_name: string | null }[] | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// GET: Consultar facturas en efectivo pendientes de entregar
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

    // Buscar el cliente movil (repartidor)
    const { data: mobileClient } = await supabase
      .from("mobile_clients")
      .select("id, role")
      .eq("identity_number", identity)
      .maybeSingle();

    if (!mobileClient || mobileClient.role !== "delivery") {
      return Response.json(
        { ok: false, error: "Repartidor no encontrado o sin permisos" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Buscar órdenes entregadas ('delivered') con pago en efectivo ('efectivo')
    // y cuyo cash_handover_status no sea 'confirmed' (puede ser 'pending' o 'handed_over' para que vea el estado)
    // Pero si queremos mostrar solo los que el repartidor DEBE entregar, filtramos por 'pending'.
    // Si queremos mostrar el historial, traeríamos todos. Vamos a traer 'pending' y 'handed_over'.
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = supabase
      .from("orders")
      .select(`
        id,
        order_code,
        status,
        total,
        payment_method,
        cash_handover_status,
        cash_confirmed_at,
        created_at,
        notes,
        customers(full_name, phone)
      `)
      .eq("delivery_user_id", mobileClient.id)
      .eq("status", "delivered")
      .eq("payment_method", "efectivo")
      .eq("is_deleted_by_admin", false)
      .order("created_at", { ascending: false });

    query = query.or(
      "cash_handover_status.in.(pending,handed_over,confirmed),cash_handover_status.is.null",
    );

    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data: orders, error } = await query;

    if (error) {
      throw error;
    }

    const cashOrders = ((orders ?? []) as DeliveryCashOrderRow[])
      .filter((row) => {
        return !(row.notes?.toUpperCase().includes("RETIRO EN LOCAL") ?? false);
      })
      .map((row) => {
        const customer = firstRelation(row.customers);

        return {
          id: row.id,
          order_code: row.order_code,
          customer_name: customer?.full_name ?? "Consumidor final",
          total: Number(row.total),
          cash_handover_status: row.cash_handover_status || "pending",
          cash_confirmed_at: row.cash_confirmed_at,
          created_at: row.created_at,
        };
      });

    return Response.json({ ok: true, cashOrders }, { headers: corsHeaders });
  } catch (error) {
    console.error("API Error in delivery cash handovers GET:", error);
    return Response.json(
      { ok: false, error: "Error del servidor" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST: Marcar facturas como entregadas al administrador
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identity, orderIds, action } = body;

    if (!identity) {
      return Response.json(
        { ok: false, error: "Identidad requerida" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return Response.json(
        { ok: false, error: "Se requieren orderIds" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (action !== "hand_over") {
      return Response.json(
        { ok: false, error: "Acción no válida" },
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

    const { data: mobileClient } = await supabase
      .from("mobile_clients")
      .select("id, role")
      .eq("identity_number", identity)
      .maybeSingle();

    if (!mobileClient || mobileClient.role !== "delivery") {
      return Response.json(
        { ok: false, error: "Repartidor no encontrado o sin permisos" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Actualizar los pedidos para que queden como 'handed_over'
    const { error } = await supabase
      .from("orders")
      .update({
        cash_handover_status: "handed_over",
        cash_handed_over_at: new Date().toISOString(),
      })
      .in("id", orderIds)
      .eq("delivery_user_id", mobileClient.id)
      .eq("status", "delivered")
      .eq("payment_method", "efectivo")
      .eq("is_deleted_by_admin", false)
      .or("cash_handover_status.eq.pending,cash_handover_status.is.null");

    if (error) {
      throw error;
    }

    return Response.json({ ok: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("API Error in delivery cash handovers POST:", error);
    return Response.json(
      { ok: false, error: "Error del servidor" },
      { status: 500, headers: corsHeaders }
    );
  }
}
