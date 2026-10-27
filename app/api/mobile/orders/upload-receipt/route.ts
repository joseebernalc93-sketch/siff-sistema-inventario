import { uploadTransferReceipt } from "@/lib/admin-data";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        {
          ok: false,
          error: "Selecciona una imagen valida.",
        },
        { status: 400 },
      );
    }

    const publicUrl = await uploadTransferReceipt(file);

    return Response.json({
      ok: true,
      publicUrl,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "No se pudo subir la imagen.",
      },
      { status: 400 },
    );
  }
}
