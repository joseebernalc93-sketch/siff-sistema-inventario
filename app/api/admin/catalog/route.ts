import { clearAdminCatalog, getAdminCatalog } from "@/lib/admin-data";

export async function GET() {
  try {
    const catalog = await getAdminCatalog();
    return Response.json(catalog);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el catalogo administrativo.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const result = await clearAdminCatalog();

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
            : "No se pudo eliminar el catalogo administrativo.",
      },
      { status: 400 },
    );
  }
}
