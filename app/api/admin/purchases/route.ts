import { getProductPurchaseHistory } from "@/lib/admin-data";

export async function GET() {
  try {
    const history = await getProductPurchaseHistory();
    return Response.json(history);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el historial de compras.",
      },
      { status: 500 },
    );
  }
}
