import {
  cancelAdminInvoice,
  deleteAdminInvoice,
} from "@/lib/admin-invoices";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as { action?: string, notes?: string };

    if (payload.action === "resolve_alert" && payload.notes) {
      const { getServiceSupabase } = await import("@/lib/supabase-server");
      const supabase = getServiceSupabase();
      if (!supabase) throw new Error("No database connection");
      
      const { error } = await supabase.from("invoices").update({ notes: payload.notes }).eq("id", id);
      if (error) throw new Error(error.message);
      
      return Response.json({ ok: true });
    }

    if (payload.action !== "cancel") {
      return Response.json(
        {
          ok: false,
          error: "Accion no soportada.",
        },
        { status: 400 },
      );
    }

    const result = await cancelAdminInvoice(id);

    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cancelar el comprobante.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteAdminInvoice(id);

    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el comprobante.",
      },
      { status: 400 },
    );
  }
}
