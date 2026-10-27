import { deleteProductPurchasesBulk } from "@/lib/admin-data";

export async function DELETE(request: Request) {
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "No se proporcionaron identificadores válidos" }, { status: 400 });
    }
    
    await deleteProductPurchasesBulk(ids);
    
    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Error al eliminar facturas" },
      { status: 500 }
    );
  }
}
