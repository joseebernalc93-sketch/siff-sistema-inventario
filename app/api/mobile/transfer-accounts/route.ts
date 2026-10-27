import { getEnabledTransferAccounts } from "@/lib/transfer-accounts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getEnabledTransferAccounts();
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
            : "No se pudieron cargar las cuentas de transferencia.",
      },
      { status: 400 },
    );
  }
}
