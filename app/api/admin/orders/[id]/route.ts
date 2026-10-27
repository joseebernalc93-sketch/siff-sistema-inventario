import { cancelAdminInvoice } from "@/lib/admin-invoices";
import {
  notifyDeliveryProblem,
  notifyOrderStatusChanged,
  notifyTransferPaymentRejected,
} from "@/lib/push-notifications";
import {
  ORDER_DELIVERED_AT_LABEL,
  ORDER_DISPATCHED_AT_LABEL,
  upsertOrderTrackingNote,
} from "@/lib/order-tracking";
import { getServiceSupabase } from "@/lib/supabase-server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();
    if (!supabase) {
      throw new Error("No database connection");
    }
    const serviceSupabase = supabase;

    const {
      status,
      delivery_user_id,
      notes,
      employee_user_id,
      approve_payment,
    } = await request.json();

    if (
      !["pending", "confirmed", "preparing", "dispatched", "delivered", "cancelled"].includes(
        status,
      )
    ) {
      throw new Error("Invalid status");
    }

    const updatePayload: Record<string, unknown> = { status };
    if (delivery_user_id !== undefined) {
      updatePayload.delivery_user_id = delivery_user_id;
    }
    if (notes !== undefined) {
      updatePayload.notes = notes;
    }
    if (employee_user_id !== undefined) {
      updatePayload.employee_user_id = employee_user_id;
    }

    type CurrentOrderSnapshot = {
      status?: string | null;
      notes?: string | null;
      delivery_user_id?: string | null;
      employee_user_id?: string | null;
      payment_method?: string | null;
    };

    let currentOrderSnapshot: CurrentOrderSnapshot | null = null;
    async function loadCurrentOrder() {
      if (currentOrderSnapshot) {
        return currentOrderSnapshot;
      }

      const { data, error } = await serviceSupabase
        .from("orders")
        .select(
          "status, notes, delivery_user_id, employee_user_id, payment_method",
        )
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(error.message);
      }

      currentOrderSnapshot = data ?? {};
      return currentOrderSnapshot;
    }

    if (status === "cancelled") {
      const currentOrder = await loadCurrentOrder();
      const isTransferRejection =
        isTransferOrder(currentOrder) && !isPaymentApproved(currentOrder.notes);

      await cancelAdminInvoice(id);

      if (isTransferRejection) {
        const nextNotes = appendTransferRejectionNote(currentOrder.notes);
        const rejectionNoteResult = await serviceSupabase
          .from("orders")
          .update({ notes: nextNotes })
          .eq("id", id);

        if (rejectionNoteResult.error) {
          throw new Error(rejectionNoteResult.error.message);
        }

        const pushOrder = await fetchOrderPushDetails(serviceSupabase, id);
        await notifyTransferPaymentRejected({
          customerIdentity: pushOrder?.customer_identity,
          orderCode: pushOrder?.order_code,
          orderId: id,
        }).catch((error) => {
          console.error("Error sending transfer rejection push:", error);
        });
      }

      return Response.json({ ok: true });
    }

    if (status === "preparing" && employee_user_id !== undefined) {
      const currentOrder = await loadCurrentOrder();
      const currentEmployeeId = currentOrder.employee_user_id ?? null;

      if (currentEmployeeId && currentEmployeeId !== employee_user_id) {
        throw new Error("Este pedido ya esta siendo preparado por otro empleado.");
      }

      if (
        isTransferOrder(currentOrder) &&
        !isPaymentApproved(currentOrder.notes)
      ) {
        throw new Error(
          "Primero el administrador debe aprobar el pago por transferencia.",
        );
      }
    }

    const transitionTimestamp = new Date().toISOString();

    let deliveryProblem = false;
    let previousDeliveryUserId: string | null = null;

    if (status === "preparing" && delivery_user_id === undefined) {
      const currentOrder = await loadCurrentOrder();

      if (currentOrder?.status === "confirmed") {
        deliveryProblem = true;
        previousDeliveryUserId = currentOrder.delivery_user_id ?? null;
        updatePayload.delivery_user_id = null;
        const newNoteLine =
          "Alerta: Repartidor reporto que no pudo entregar el pedido.";
        const currentNotes = currentOrder.notes || "";
        if (!currentNotes.includes(newNoteLine)) {
          updatePayload.notes =
            currentNotes.trim() + (currentNotes ? "\n" : "") + newNoteLine;
        }
      }
    }

    if (approve_payment === true) {
      const currentOrder = await loadCurrentOrder();

      const currentNotes =
        currentOrder?.notes ??
        (typeof updatePayload.notes === "string" ? updatePayload.notes : "");
      if (!currentNotes.includes("[PAGO_APROBADO]")) {
        updatePayload.notes =
          currentNotes.trim() +
          (currentNotes ? "\n" : "") +
          "[PAGO_APROBADO]";
      }
    }

    if (status === "confirmed" && delivery_user_id !== undefined) {
      const currentOrder = await loadCurrentOrder();
      updatePayload.notes = upsertOrderTrackingNote(
        getPayloadNotes(updatePayload, currentOrder.notes),
        ORDER_DISPATCHED_AT_LABEL,
        transitionTimestamp,
      );
    }

    if (status === "delivered") {
      const currentOrder = await loadCurrentOrder();
      updatePayload.notes = upsertOrderTrackingNote(
        getPayloadNotes(updatePayload, currentOrder.notes),
        ORDER_DELIVERED_AT_LABEL,
        transitionTimestamp,
      );
    }

    let updateQuery = serviceSupabase
      .from("orders")
      .update(updatePayload)
      .eq("id", id);

    if (status === "preparing" && employee_user_id !== undefined) {
      updateQuery = updateQuery.or(
        `employee_user_id.is.null,employee_user_id.eq.${employee_user_id}`,
      );
    }

    const updateResult = await updateQuery.select().single();

    if (updateResult.error) {
      if (status === "preparing" && employee_user_id !== undefined) {
        throw new Error("Este pedido ya esta siendo preparado por otro empleado.");
      }
      throw new Error(updateResult.error.message);
    }

    const pushOrder = await fetchOrderPushDetails(serviceSupabase, id);
    if (deliveryProblem) {
      await notifyDeliveryProblem({
        customerIdentity: pushOrder?.customer_identity,
        deliveryUserId: previousDeliveryUserId,
        orderCode: pushOrder?.order_code,
        orderId: id,
      }).catch((error) => {
        console.error("Error sending delivery problem push:", error);
      });
    } else {
      await notifyOrderStatusChanged({
        customerIdentity: pushOrder?.customer_identity,
        deliveryUserId: updateResult.data.delivery_user_id,
        notes: pushOrder?.notes,
        orderCode: pushOrder?.order_code,
        orderId: id,
        paymentMethod: pushOrder?.payment_method,
        status,
        total: pushOrder?.total,
      }).catch((error) => {
        console.error("Error sending order status push:", error);
      });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Error updating order",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = getServiceSupabase();
    if (!supabase) {
      throw new Error("No database connection");
    }

    const deleteResult = await supabase
      .from("orders")
      .update({ is_deleted_by_admin: true })
      .eq("id", id);

    if (deleteResult.error) {
      throw new Error(deleteResult.error.message);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error deleting order",
      },
      { status: 400 },
    );
  }
}

async function fetchOrderPushDetails(
  supabase: NonNullable<ReturnType<typeof getServiceSupabase>>,
  id: string,
) {
  const { data } = await supabase
    .from("orders")
    .select(
      `
        order_code,
        delivery_user_id,
        notes,
        payment_method,
        total,
        customers (
          identity_number
        )
      `,
    )
    .eq("id", id)
    .single();

  if (!data) {
    return null;
  }

  const customer = Array.isArray(data.customers)
    ? data.customers[0]
    : data.customers;

  return {
    customer_identity: customer?.identity_number ?? null,
    delivery_user_id: data.delivery_user_id ?? null,
    notes: data.notes ?? null,
    order_code: data.order_code ?? null,
    payment_method: data.payment_method ?? null,
    total: data.total == null ? null : Number(data.total),
  };
}

function isTransferOrder(order: {
  payment_method?: string | null;
  notes?: string | null;
}) {
  const method = order.payment_method?.toLowerCase().trim();
  if (method === "transferencia") {
    return true;
  }

  const notes = order.notes?.toLowerCase() ?? "";
  return (
    notes.includes("pago: transferencia") ||
    notes.includes("metodo_pago: transferencia") ||
    notes.includes("metodo de pago: transferencia") ||
    notes.includes("transferencia")
  );
}

function isPaymentApproved(notes?: string | null) {
  return notes?.includes("[PAGO_APROBADO]") ?? false;
}

function appendTransferRejectionNote(notes?: string | null) {
  const noteLine =
    "TRANSFERENCIA_RECHAZADA: Comprobante de pago no pudo ser validado";
  const currentNotes = notes?.trim() ?? "";

  if (currentNotes.includes(noteLine)) {
    return currentNotes;
  }

  return currentNotes ? `${currentNotes}\n${noteLine}` : noteLine;
}

function getPayloadNotes(
  updatePayload: Record<string, unknown>,
  currentNotes?: string | null,
) {
  return typeof updatePayload.notes === "string"
    ? updatePayload.notes
    : currentNotes ?? "";
}
