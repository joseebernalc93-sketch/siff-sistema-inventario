import { lookupMobileClientPasswordRecovery } from "@/lib/mobile-clients";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await lookupMobileClientPasswordRecovery(
      String(body.identifier ?? ""),
    );

    return Response.json(
      {
        ok: true,
        exists: result.exists,
        email: result.email,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        exists: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo validar la cuenta.",
      },
      {
        status: 400,
        headers: corsHeaders,
      },
    );
  }
}
