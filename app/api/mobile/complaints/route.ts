import { createComplaint } from "@/lib/complaints";
import type { ComplaintRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ComplaintRequest;
    const complaint = await createComplaint(payload);

    return Response.json(
      {
        ok: true,
        complaint,
      },
      { status: 201 },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo registrar la queja.",
      },
      { status: 400 },
    );
  }
}
