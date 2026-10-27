import { registerMobileClient } from "@/lib/mobile-clients";

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
    const result = await registerMobileClient({
      full_name: String(body.full_name ?? ""),
      identity_number: String(body.identity_number ?? ""),
      email: String(body.email ?? ""),
      phone: String(body.phone ?? ""),
      address: String(body.address ?? ""),
      password: String(body.password ?? ""),
    });

    return Response.json(
      {
        ok: true,
        client: result.client,
        storage: result.storage,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo registrar el cliente.";
    const status = message.includes("Ya existe") ? 409 : 400;

    return Response.json(
      {
        ok: false,
        error: message,
      },
      {
        status,
        headers: corsHeaders,
      },
    );
  }
}
