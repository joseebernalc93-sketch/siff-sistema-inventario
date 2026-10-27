const ADMIN_CEDULA = process.env.ADMIN_CEDULA ?? "0963671755";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Amada123@";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      cedula?: string;
      password?: string;
    };

    const cedula = payload.cedula?.trim() ?? "";
    const password = payload.password ?? "";

    if (cedula === ADMIN_CEDULA && password === ADMIN_PASSWORD) {
      return Response.json({
        ok: true,
        role: "admin",
      });
    }

    return Response.json(
      {
        ok: false,
        error: "Cedula o contrasena incorrecta.",
      },
      { status: 401 },
    );
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Solicitud invalida.",
      },
      { status: 400 },
    );
  }
}

