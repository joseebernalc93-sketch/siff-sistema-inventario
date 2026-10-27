import { bulkDeleteAdminInvoices } from "@/lib/admin-invoices";

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json(
        {
          ok: false,
          error: "No se proporcionaron comprobantes para eliminar.",
        },
        { status: 400 },
      );
    }

    const result = await bulkDeleteAdminInvoices(ids);

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
            : "No se pudo eliminar los comprobantes.",
      },
      { status: 400 },
    );
  }
}
