import { getAdminOrders } from "@/lib/admin-data";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const data = await getAdminOrders();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      {
        mode: "demo",
        orders: [],
      },
      { status: 500 },
    );
  }
}
