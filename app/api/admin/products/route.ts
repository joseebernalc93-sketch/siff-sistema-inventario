import { createProduct, type ProductInput } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ProductInput;
    const result = await createProduct(payload);

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
            : "No se pudo crear el producto.",
      },
      { status: 400 },
    );
  }
}

