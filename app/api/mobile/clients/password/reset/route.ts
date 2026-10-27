import {
  InvalidPasswordRecoveryTokenError,
  MobileClientNotFoundError,
  updateMobileClientPasswordFromRecovery,
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
    await updateMobileClientPasswordFromRecovery(
      String(body.access_token ?? ""),
      String(body.password ?? ""),
      String(body.reset_request ?? body.reset_token ?? ""),
    );

    return Response.json(
      {
        ok: true,
        message: "Contrasena actualizada. Ya puedes entrar en la app.",
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const isUnauthorized = error instanceof InvalidPasswordRecoveryTokenError;
    const isNotFound = error instanceof MobileClientNotFoundError;

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar la contrasena.",
      },
      {
        status: isUnauthorized ? 401 : isNotFound ? 404 : 400,
        headers: corsHeaders,
      },
    );
  }
}
