import { getServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type CashHandoverRow = {
  id: string;
  order_code: string;
  total: number | string | null;
  cash_handover_status: string | null;
  cash_handed_over_at: string | null;
  cash_confirmed_at: string | null;
  created_at: string;
  notes: string | null;
  customers: { full_name: string | null } | { full_name: string | null }[] | null;
  delivery:
    | { id: string; full_name: string | null; identity_number: string | null }
    | { id: string; full_name: string | null; identity_number: string | null }[]
    | null;
};

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const supabase = getServiceSupabase();
    if (!supabase) {
      return Response.json({ ok: false, error: "Supabase no config" }, { status: 500 });
    }

    let query = supabase
      .from("orders")
      .select(`
        id,
        order_code,
        status,
        total,
        payment_method,
        cash_handover_status,
        cash_handed_over_at,
        cash_confirmed_at,
        created_at,
        notes,
        customers(full_name, phone),
        delivery:mobile_clients!orders_delivery_user_id_fkey(id, full_name, identity_number)
      `)
      .eq("status", "delivered")
      .eq("payment_method", "efectivo")
      .eq("is_deleted_by_admin", false)
      .not("delivery_user_id", "is", null)
      .order("created_at", { ascending: false });

    // Mantener siempre los pendientes activos aunque el historial confirmado este filtrado por fecha.
    if (startDate && endDate) {
      query = query.or(`cash_handover_status.in.(pending,handed_over),cash_handover_status.is.null,and(cash_handover_status.eq.confirmed,cash_confirmed_at.gte.${startDate},cash_confirmed_at.lte.${endDate})`);
    } else if (startDate) {
      query = query.or(`cash_handover_status.in.(pending,handed_over),cash_handover_status.is.null,and(cash_handover_status.eq.confirmed,cash_confirmed_at.gte.${startDate})`);
    } else if (endDate) {
      query = query.or(`cash_handover_status.in.(pending,handed_over),cash_handover_status.is.null,and(cash_handover_status.eq.confirmed,cash_confirmed_at.lte.${endDate})`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const handovers = ((data ?? []) as CashHandoverRow[])
      .filter((row) => {
        const delivery = firstRelation(row.delivery);
        const isPickup = row.notes?.toUpperCase().includes("RETIRO EN LOCAL") ?? false;
        return Boolean(delivery?.id) && !isPickup;
      })
      .map((row) => {
      const customer = firstRelation(row.customers);
      const delivery = firstRelation(row.delivery);

      return {
        id: row.id,
        order_code: row.order_code,
        customer_name: customer?.full_name ?? "Consumidor final",
        total: Number(row.total),
        cash_handover_status: row.cash_handover_status || "pending",
        cash_handed_over_at: row.cash_handed_over_at,
        cash_confirmed_at: row.cash_confirmed_at,
        created_at: row.created_at,
        delivery_user_id: delivery?.id,
        delivery_user_name: delivery?.full_name ?? "Desconocido",
        delivery_user_identity: delivery?.identity_number ?? "",
      };
    });

    return Response.json({ ok: true, handovers });
  } catch (error) {
    console.error("Error in admin cash-handovers GET:", error);
    return Response.json({ ok: false, error: "Error del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orderIds, action } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return Response.json({ ok: false, error: "Se requieren orderIds" }, { status: 400 });
    }

    if (action !== "confirm" && action !== "reject") {
      return Response.json({ ok: false, error: "Acción no válida" }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    if (!supabase) {
      return Response.json({ ok: false, error: "Supabase no config" }, { status: 500 });
    }

    const updatePayload: {
      cash_handover_status?: "confirmed" | "pending";
      cash_confirmed_at?: string;
      cash_handed_over_at?: string | null;
    } = {};
    if (action === "confirm") {
      updatePayload.cash_handover_status = "confirmed";
      updatePayload.cash_confirmed_at = new Date().toISOString();
    } else {
      updatePayload.cash_handover_status = "pending";
      updatePayload.cash_handed_over_at = null; // Reiniciar
    }

    const { error } = await supabase
      .from("orders")
      .update(updatePayload)
      .in("id", orderIds)
      .eq("is_deleted_by_admin", false)
      .not("delivery_user_id", "is", null)
      .eq("cash_handover_status", "handed_over");

    if (error) {
      throw error;
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Error in admin cash-handovers POST:", error);
    return Response.json({ ok: false, error: "Error del servidor" }, { status: 500 });
  }
}
