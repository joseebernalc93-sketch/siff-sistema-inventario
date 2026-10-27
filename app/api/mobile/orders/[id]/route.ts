import { notifyClientDeliveryConfirmation } from "@/lib/push-notifications";
import { getServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();
    if (!supabase) {
      return Response.json(
        { ok: false, error: "Database error" },
        { status: 500 },
      );
    }
    const { data: order, error } = await supabase
      .from("orders")
      .select("status, notes, delivery_user_id")
      .eq("id", id)
      .single();

    if (error || !order) {
      return Response.json(
        { ok: false, error: "Not found" },
        { status: 404 },
      );
    }

    let deliveryUser = null;
    if (order.delivery_user_id) {
      const { data: delivery } = await supabase
        .from("mobile_clients")
        .select("full_name, identity_number")
        .eq("id", order.delivery_user_id)
        .single();
      if (delivery) {
        deliveryUser = {
          identity_number: delivery.identity_number,
          name: delivery.full_name,
        };
      }
    }

    return Response.json({
      delivery_user: deliveryUser,
      notes: order.notes,
      ok: true,
      status: order.status,
    });
  } catch {
    return Response.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { action } = await request.json();
    const supabase = getServiceSupabase();
    if (!supabase) {
      return Response.json(
        { ok: false, error: "Database error" },
        { status: 500 },
      );
    }

    if (action === "confirm_delivery" || action === "reject_delivery") {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("notes, order_code, delivery_user_id")
        .eq("id", id)
        .single();

      if (orderError || !order) {
        return Response.json(
          { ok: false, error: "Not found" },
          { status: 404 },
        );
      }

      if (isPickupOrder(order.notes)) {
        return Response.json({ ok: true, skipped: "pickup_order" });
      }

      const statusText = action === "confirm_delivery" ? "Si" : "No";
      const newNoteLine = `Confirmacion de entrega: Cliente confirmo que recibio el pedido: ${statusText}`;

      let currentNotes = order.notes || "";
      const searchString =
        "Confirmacion de entrega: Cliente confirmo que recibio el pedido: ";

      if (currentNotes.includes(searchString)) {
        currentNotes = currentNotes.replace(
          new RegExp(searchString + "(Si|No)"),
          searchString + statusText,
        );
      } else {
        currentNotes =
          currentNotes.trim() + (currentNotes ? "\n" : "") + newNoteLine;
      }

      if (action === "confirm_delivery") {
        currentNotes = currentNotes
          .replace(
            "Alerta: Repartidor reporto que no pudo entregar el pedido.",
            "",
          )
          .replace(
            "Alerta: Repartidor reportó que no pudo entregar el pedido.",
            "",
          )
          .replace(
            "Alerta: Repartidor reportÃ³ que no pudo entregar el pedido.",
            "",
          )
          .trim();
      }

      const updatePayload: Record<string, unknown> = { notes: currentNotes };

      if (action === "reject_delivery") {
        updatePayload.status = "preparing";
        updatePayload.delivery_user_id = null;
      }

      await supabase.from("orders").update(updatePayload).eq("id", id);

      await notifyClientDeliveryConfirmation({
        action,
        deliveryUserId: order.delivery_user_id,
        orderCode: order.order_code,
        orderId: id,
      }).catch((error) => {
        console.error("Error sending client confirmation push:", error);
      });

      return Response.json({ ok: true });
    }

    return Response.json(
      { ok: false, error: "Invalid action" },
      { status: 400 },
    );
  } catch {
    return Response.json(
      { ok: false, error: "Server error" },
      { status: 500 },
    );
  }
}

export const PUT = PATCH;

function isPickupOrder(notes?: string | null) {
  return notes?.toUpperCase().includes("RETIRO EN LOCAL") ?? false;
}
