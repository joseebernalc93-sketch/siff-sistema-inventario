import {
  addProductPurchase,
  type ProductPurchaseInput,
} from "@/lib/admin-data";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as ProductPurchaseInput;
    const result = await addProductPurchase(id, payload);

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
            : "No se pudo ingresar la compra.",
      },
      { status: 400 },
    );
  }
}
