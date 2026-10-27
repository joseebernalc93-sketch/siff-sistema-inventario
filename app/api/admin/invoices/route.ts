import { getAdminInvoices } from "@/lib/admin-invoices";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const invoices = await getAdminInvoices();
    return Response.json(invoices);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los comprobantes.",
      },
      { status: 500 },
    );
  }
}
