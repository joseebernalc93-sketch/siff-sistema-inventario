import {
  createTransferAccount,
  getAdminTransferAccounts,
  type TransferAccountInput,
} from "@/lib/transfer-accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getAdminTransferAccounts();
    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron cargar las cuentas bancarias.",
      },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as TransferAccountInput;
    const account = await createTransferAccount(payload);
    return Response.json({ account });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la cuenta bancaria.",
      },
      { status: 400 },
    );
  }
}
