import { getServiceSupabase } from "@/lib/supabase-server";
import type { ComplaintRequest, ComplaintResult } from "@/lib/types";

export async function createComplaint(
  payload: ComplaintRequest,
): Promise<ComplaintResult> {
  validateComplaint(payload);

  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      complaint_id: `demo-complaint-${Date.now()}`,
      status: "open",
    };
  }

  let customerId: string | null = null;
  const customerName = payload.customer_name.trim();
  const customerPhone = payload.customer_phone?.trim() || null;

  if (customerPhone) {
    const { data, error } = await supabase
      .from("customers")
      .upsert(
        {
          full_name: customerName,
          phone: customerPhone,
        },
        { onConflict: "phone" },
      )
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    customerId = data.id;
  } else {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        full_name: customerName,
      })
      .select("id")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    customerId = data.id;
  }

  const { data, error } = await supabase
    .from("complaints")
    .insert({
      customer_id: customerId,
      order_id: payload.order_id || null,
      message: payload.message.trim(),
      status: "open",
    })
    .select("id, status")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    complaint_id: data.id,
    status: data.status,
  };
}

function validateComplaint(payload: ComplaintRequest) {
  if (!payload.customer_name?.trim()) {
    throw new Error("El nombre del cliente es obligatorio.");
  }

  if (!payload.message?.trim()) {
    throw new Error("El mensaje de queja o devolucion es obligatorio.");
  }
}

