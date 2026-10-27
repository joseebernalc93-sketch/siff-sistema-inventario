import { createOrder } from "@/lib/orders";
import { notifyOrderCreated } from "@/lib/push-notifications";
import type { OrderRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as OrderRequest;
    const order = await createOrder(payload);
    await notifyOrderCreated(order).catch((error) => {
      console.error("Error sending new order push:", error);
    });

    return Response.json(
      {
        ok: true,
        order,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "No se pudo crear el pedido.",
      },
      { status: 400 },
    );
  }
}
