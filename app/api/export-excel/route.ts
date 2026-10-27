import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let filename = "INVENTARIO_SIFF_ACTUALIZADO.xlsx";
    let base64 = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      filename = (formData.get("filename") as string) || filename;
      base64 = (formData.get("base64") as string) || "";
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      filename = body.filename || filename;
      base64 = body.base64 || "";
    }

    if (!base64) {
      return NextResponse.json({ error: "No Excel payload provided" }, { status: 400 });
    }

    // Clean filename of unsafe characters
    const cleanFilename = filename.replace(/[/\\?%*:|"<>]/g, "_");

    const buffer = Buffer.from(base64, "base64");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${cleanFilename}"; filename*=UTF-8''${encodeURIComponent(cleanFilename)}`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error: any) {
    console.error("Error in export-excel route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
