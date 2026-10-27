import {
  registerPushToken,
  type PushTokenInput,
} from "@/lib/push-notifications";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PushTokenInput;
    const result = await registerPushToken(payload);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el token push.",
      },
      { status: 400 },
    );
  }
}
