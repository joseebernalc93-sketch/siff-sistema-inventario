import { createCategory } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: string;
      description?: string | null;
    };

    const result = await createCategory({
      name: payload.name ?? "",
      description: payload.description ?? null,
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
            : "No se pudo crear la categoria.",
      },
      { status: 400 },
    );
  }
}

