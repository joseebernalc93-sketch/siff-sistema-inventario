import {
  createAdminMobileClient,
  deleteAdminMobileClients,
  getAdminMobileClients,
} from "@/lib/mobile-clients";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createAdminMobileClient({
      full_name: String(body.full_name ?? ""),
      identity_number: String(body.identity_number ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      address: String(body.address ?? ""),
      role: body.role ? String(body.role) : "cliente",
    });

    return Response.json({
      ok: true,
      client: result.client,
      storage: result.storage,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo registrar el cliente.";
    const status = message.includes("Ya existe") ? 409 : 400;

    return Response.json(
      {
        ok: false,
        error: message,
      },
      {
        status,
      },
    );
  }
}

export async function GET() {
  try {
    const result = await getAdminMobileClients();

    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar los clientes.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as { ids?: string[] };
    const result = await deleteAdminMobileClients(payload.ids ?? []);

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
            : "No se pudieron eliminar los clientes.",
      },
      { status: 400 },
    );
  }
}
