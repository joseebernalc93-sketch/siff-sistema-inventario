import { createProvider, deleteProviders, updateProvider } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: string;
      ruc?: string | null;
      email?: string | null;
      address?: string | null;
      phone?: string | null;
      notes?: string | null;
    };

    const result = await createProvider({
      name: payload.name ?? "",
      ruc: payload.ruc ?? null,
      email: payload.email ?? null,
      address: payload.address ?? null,
      phone: payload.phone ?? null,
      notes: payload.notes ?? null,
    });

    return Response.json(
      {
        ok: true,
        ...result,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el proveedor.",
      },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as {
      id?: string;
      name?: string;
      ruc?: string | null;
      email?: string | null;
      address?: string | null;
      phone?: string | null;
      notes?: string | null;
    };

    const result = await updateProvider(payload.id ?? "", {
      name: payload.name ?? "",
      ruc: payload.ruc ?? null,
      email: payload.email ?? null,
      address: payload.address ?? null,
      phone: payload.phone ?? null,
      notes: payload.notes ?? null,
    });

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
            : "No se pudo editar el proveedor.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      ids?: string[];
    };
    const result = await deleteProviders(payload.ids ?? []);

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
            : "No se pudieron eliminar los proveedores.",
      },
      { status: 400 },
    );
  }
}
