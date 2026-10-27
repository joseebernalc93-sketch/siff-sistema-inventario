import { NextRequest, NextResponse } from "next/server";
import XLSX from "xlsx-js-style";
import { SIFF_PRODUCTS_DATA } from "@/lib/siff-products";

export const dynamic = "force-dynamic";

// GET handler: Directly downloads the real Excel file via standard HTTP link/navigation
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "inventory";

    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;

    if (type === "kardex") {
      const wb = XLSX.utils.book_new();
      const headers = [
        "FOLIO AUDITORÍA",
        "FECHA Y HORA",
        "TIPO MOVIMIENTO",
        "CANTIDAD",
        "CÓDIGO REPUESTO",
        "DESCRIPCIÓN TÉCNICA",
        "UBICACIÓN",
        "LOTE",
        "STOCK ANTERIOR",
        "STOCK RESULTANTE",
        "MOTIVO OBLIGATORIO",
        "DOCUMENTO DE RESPALDO",
        "RESPONSABLE",
        "CARGO / ROL",
        "DISPOSITIVO DE REGISTRO",
        "OBSERVACIONES",
      ];
      const initialMovements = [
        [
          "MOV-2026-004",
          "2026-10-27 10:45:00",
          "SALIDA DE STOCK",
          2,
          "AKS5898",
          "AKS - 38 DANFOSS",
          "Bodega Central",
          "LT032",
          6,
          4,
          "Mantenimiento Preventivo Planta Frío",
          "OT-2026-4412",
          "Ing. Carlos Vega",
          "Técnico de Refrigeración",
          "Escaner Handheld Honeywell",
          "Repuesto instalado en compresor 1",
        ],
        [
          "MOV-2026-003",
          "2026-10-27 09:15:00",
          "ENTRADA DE STOCK",
          3,
          "ACO3818",
          "ACOPLE DE MATRIMONIO 9H",
          "Bodega Central",
          "LT013",
          0,
          3,
          "Recepción de Proveedor",
          "FAC-99120",
          "Ing. Carlos Vega",
          "Técnico de Refrigeración",
          "Lector Cámara Celular",
          "Ingreso verificado en bodega",
        ],
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, ...initialMovements]);
      XLSX.utils.book_append_sheet(wb, ws, "KARDEX_AUDITORIA");

      const filename = `KARDEX_AUDITORIA_SIFF_${dateStr}.xlsx`;
      const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": buffer.length.toString(),
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    // Default: INVENTORY (3 sheets matching SIFF layout)
    const wb = XLSX.utils.book_new();

    // Sheet 1: CONSOLIDADO
    const consolidadoHeaders = [
      "CÓDIGO PRODUCTO",
      "DESCRIPCIÓN TÉCNICA",
      "CATEGORÍA",
      "MARCA",
      "UBICACIÓN",
      "LOTE",
      "TOTAL PRODUCTO (STOCK)",
      "STOCK MÍNIMO",
      "ESTADO STOCK",
    ];
    const consolidadoRows = SIFF_PRODUCTS_DATA.map((p) => [
      p.code,
      p.name,
      p.category,
      p.brand,
      p.location,
      p.lot,
      p.stock,
      p.minStock || 2,
      p.stock <= (p.minStock || 2) ? "STOCK CRÍTICO" : "ÓPTIMO",
    ]);
    const wsConsolidado = XLSX.utils.aoa_to_sheet([consolidadoHeaders, ...consolidadoRows]);
    XLSX.utils.book_append_sheet(wb, wsConsolidado, "INVENTARIO CONSOLIDADO");

    // Sheet 2: INVENTARIOBODEGA
    const bodegaItems = SIFF_PRODUCTS_DATA.filter((p) => p.location === "Bodega Central");
    const bodegaHeaders = ["CÓDIGO PRODUCTO", "DESCRIPCIÓN", "TOTAL PRODUCTO", "LOTE", "CATEGORÍA", "MARCA"];
    const bodegaRows = bodegaItems.map((p) => [p.code, p.name, p.stock, p.lot, p.category, p.brand]);
    const wsBodega = XLSX.utils.aoa_to_sheet([bodegaHeaders, ...bodegaRows]);
    XLSX.utils.book_append_sheet(wb, wsBodega, "INVENTARIOBODEGA");

    // Sheet 3: INVENTARIOOFICINA
    const oficinaItems = SIFF_PRODUCTS_DATA.filter((p) => p.location === "Oficina Matriz");
    const oficinaHeaders = ["CÓDIGO PRODUCTO", "DESCRIPCIÓN", "TOTAL PRODUCTO", "LOTE", "CATEGORÍA", "MARCA"];
    const oficinaRows = oficinaItems.map((p) => [p.code, p.name, p.stock, p.lot, p.category, p.brand]);
    const wsOficina = XLSX.utils.aoa_to_sheet([oficinaHeaders, ...oficinaRows]);
    XLSX.utils.book_append_sheet(wb, wsOficina, "INVENTARIOOFICINA");

    const filename = `INVENTARIO_SIFF_ACTUALIZADO_${dateStr}.xlsx`;
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Error in GET export-excel:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST handler: accepts custom base64 or products from client
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

    const cleanFilename = filename.replace(/[/\\?%*:|"<>]/g, "_");
    const buffer = Buffer.from(base64, "base64");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${cleanFilename}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Error in POST export-excel:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
