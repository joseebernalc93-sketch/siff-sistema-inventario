import {
  deleteTransferAccount,
  updateTransferAccount,
  type TransferAccountInput,
} from "@/lib/transfer-accounts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const payload = (await request.json()) as TransferAccountInput;
    const account = await updateTransferAccount(id, payload);
    return Response.json({ account });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la cuenta bancaria.",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteTransferAccount(id);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la cuenta bancaria.",
      },
      { status: 400 },
    );
  }
}
