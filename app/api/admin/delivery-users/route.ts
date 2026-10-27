import { getServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getServiceSupabase();
    if (!supabase) {
      throw new Error("No database connection");
    }

    const { data, error } = await supabase
      .from("mobile_clients")
      .select("id, full_name, email, phone, role, status")
      .eq("role", "delivery")
      .eq("status", "active");

    if (error) {
      throw new Error(error.message);
    }

    const formattedData = (data || []).map(d => ({
      ...d,
      name: d.full_name,
    }));

    return Response.json({ deliveries: formattedData });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Error fetching deliveries" },
      { status: 500 }
    );
  }
}
