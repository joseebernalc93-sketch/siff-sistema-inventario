import { getServiceSupabase } from "@/lib/supabase-server";

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
    const identityNumber = String(body.identity_number ?? "").trim();

    if (!identityNumber || identityNumber.length < 8) {
      return Response.json(
        { ok: true, hasTemporaryPassword: false },
        { headers: corsHeaders }
      );
    }

    const supabase = getServiceSupabase();
    if (!supabase) {
      return Response.json(
        { ok: true, hasTemporaryPassword: false },
        { headers: corsHeaders }
      );
    }

    const result = await supabase
      .from("mobile_clients")
      .select("source")
      .eq("identity_number", identityNumber)
      .maybeSingle();

    if (result.error || !result.data) {
      return Response.json(
        { ok: true, hasTemporaryPassword: false },
        { headers: corsHeaders }
      );
    }

    return Response.json(
      {
        ok: true,
        hasTemporaryPassword: result.data.source === "admin_pending",
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      { ok: true, hasTemporaryPassword: false },
      { headers: corsHeaders }
    );
  }
}
