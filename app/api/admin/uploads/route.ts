import { deleteProductImage, uploadProductImage } from "@/lib/admin-data";

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

    const publicUrl = await uploadProductImage(file);

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

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      imageUrl?: string;
    };
    const result = await deleteProductImage(payload.imageUrl ?? "");

    return Response.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar la imagen.",
      },
      { status: 400 },
    );
  }
}
