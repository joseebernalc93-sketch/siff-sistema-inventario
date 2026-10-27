import { getServiceSupabase } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const supabase = getServiceSupabase();
    if (!supabase) {
      throw new Error("No database connection");
    }

    const { ids } = await request.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("No order IDs provided");
    }

    // Soft delete: keep the orders for the clients, but hide from admin
    const deleteResult = await supabase
      .from("orders")
      .update({ is_deleted_by_admin: true })
      .in("id", ids);
    
    if (deleteResult.error) {
      throw new Error(deleteResult.error.message);
    }

    return Response.json({ ok: true, count: ids.length });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Error deleting orders",
      },
      { status: 400 },
    );
  }
}
