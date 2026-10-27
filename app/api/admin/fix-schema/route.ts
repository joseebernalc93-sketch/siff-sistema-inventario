import { getServiceSupabase } from "@/lib/supabase-server";

export async function GET() {
  const supabase = getServiceSupabase();
  if (!supabase) return Response.json({ ok: false });
  
  const sql = `
    ALTER TABLE stock_movements ALTER COLUMN quantity TYPE numeric(10,3);
    ALTER TABLE sale_item_lots ALTER COLUMN quantity TYPE numeric(10,3);
    ALTER TABLE order_items ALTER COLUMN quantity TYPE numeric(10,3);
  `;

  const { data, error } = await supabase.rpc("execute_sql", { query: sql });

  return Response.json({ ok: true, error: error?.message, data });
}
