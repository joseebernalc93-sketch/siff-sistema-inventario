import {
  forceChangeMobileClientPassword,
  InvalidMobileCredentialsError,
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
    const updatedClient = await forceChangeMobileClientPassword(
      String(body.identity_number ?? ""),
      String(body.current_password ?? ""),
      String(body.new_password ?? ""),
    );

    return Response.json(
      {
        ok: true,
        client: updatedClient,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const isUnauthorized = error instanceof InvalidMobileCredentialsError;

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cambiar la contrasena.",
      },
      {
        status: isUnauthorized ? 401 : 400,
        headers: corsHeaders,
      },
    );
  }
}
