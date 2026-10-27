import {
  MobileClientNotFoundError,
  requestMobileClientPasswordReset,
} from "@/lib/mobile-clients";

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
    const redirectTo = new URL("/mobile/reset-password", request.url).toString();
    const result = await requestMobileClientPasswordReset(
      String(body.identifier ?? body.identity_number ?? body.email ?? ""),
      redirectTo,
    );

    return Response.json(
      {
        ok: true,
        email: result.email,
        message: `Te enviamos un enlace de recuperacion a ${result.email}.`,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const isNotFound = error instanceof MobileClientNotFoundError;

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo enviar el correo de recuperacion.",
      },
      {
        status: isNotFound ? 404 : 400,
        headers: corsHeaders,
      },
    );
  }
}
