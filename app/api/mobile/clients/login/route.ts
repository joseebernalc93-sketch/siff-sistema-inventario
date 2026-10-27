import {
  InvalidMobileCredentialsError,
  loginMobileClient,
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
    const client = await loginMobileClient(
      String(body.identity_number ?? ""),
      String(body.password ?? ""),
    );

    return Response.json(
      {
        ok: true,
        client,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const isInvalidCredentials = error instanceof InvalidMobileCredentialsError;

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo iniciar sesion.",
      },
      {
        status: isInvalidCredentials ? 401 : 400,
        headers: corsHeaders,
      },
    );
  }
}
