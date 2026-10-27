import { getCatalog } from "@/lib/catalog";

export async function GET() {
  try {
    const catalog = await getCatalog();
    return Response.json(catalog);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo obtener el catalogo.",
      },
      { status: 500 },
    );
  }
}

