import {
  deleteProductLot,
  updateProductLot,
  type ProductLotUpdateInput,
} from "@/lib/admin-data";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; lotId: string }> },
) {
  try {
    const { id, lotId } = await context.params;
    const payload = (await request.json()) as ProductLotUpdateInput;
    const result = await updateProductLot(id, lotId, payload);

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
            : "No se pudo actualizar la existencia.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; lotId: string }> },
) {
  try {
    const { id, lotId } = await context.params;
    const result = await deleteProductLot(id, lotId);

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
            : "No se pudo eliminar la existencia.",
      },
      { status: 400 },
    );
  }
}
