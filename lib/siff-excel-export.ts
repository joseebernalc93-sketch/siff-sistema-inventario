import XLSX from "xlsx-js-style";
import { ORIGINAL_SIFF_EXCEL_BASE64 } from "./siff-excel-template";

export interface SiffExportProduct {
  id?: string;
  code: string;
  name: string;
  lot: string;
  location: "Bodega Central" | "Oficina Matriz" | string;
  stock: number;
  minStock?: number;
  category?: string;
  brand?: string;
}

export interface SiffExportMovement {
  folio?: string;
  fullDate?: string;
  type: string; // "ENTRADA DE STOCK" or "SALIDA DE STOCK"
  quantity: number;
  productCode: string;
  productName: string;
  location: string;
  lot: string;
  reason?: string;
}

export function buildOriginalSiffWorkbook(
  products: SiffExportProduct[],
  movements: SiffExportMovement[] = []
): XLSX.WorkBook {
  // 1. Read the original base64 template with cellStyles: true
  // This preserves all 6 sheets, the buttons, the colors, borders, titles and formats
  let wb: XLSX.WorkBook;
  try {
    let bytes: Uint8Array;
    if (typeof Buffer !== "undefined") {
      bytes = Buffer.from(ORIGINAL_SIFF_EXCEL_BASE64, "base64");
    } else {
      const binary = atob(ORIGINAL_SIFF_EXCEL_BASE64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
    }
    wb = XLSX.read(bytes, { type: "array", cellStyles: true });
  } catch (err) {
    console.error("Error reading original SIFF Excel template:", err);
    throw err;
  }

  // Map products by code + location
  const bodegaMap = new Map<string, SiffExportProduct>();
  const oficinaMap = new Map<string, SiffExportProduct>();

  for (const p of products) {
    if (p.location === "Bodega Central") {
      bodegaMap.set(p.code.trim().toUpperCase(), p);
    } else if (p.location === "Oficina Matriz") {
      oficinaMap.set(p.code.trim().toUpperCase(), p);
    }
  }

  // 2. Update ' INVENTARIOBODEGA'
  const wsBodega = wb.Sheets[" INVENTARIOBODEGA"] || wb.Sheets["INVENTARIOBODEGA"];
  if (wsBodega) {
    updateSheetProducts(wsBodega, bodegaMap);
  }

  // 3. Update 'INVENTARIOOFICINA'
  const wsOficina = wb.Sheets["INVENTARIOOFICINA"] || wb.Sheets[" INVENTARIOOFICINA"];
  if (wsOficina) {
    updateSheetProducts(wsOficina, oficinaMap);
  }

  return wb;
}

function updateSheetProducts(ws: XLSX.WorkSheet, productMap: Map<string, SiffExportProduct>) {
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:H200");
  for (let r = 3; r <= range.e.r; r++) {
    const cellA = ws["A" + (r + 1)];
    if (!cellA || !cellA.v) continue;
    const code = String(cellA.v).trim().toUpperCase();
    const prod = productMap.get(code);
    if (prod) {
      // Update Description if edited
      if (ws["B" + (r + 1)]) {
        ws["B" + (r + 1)].v = prod.name;
      }
      // Update Lote if edited
      if (ws["C" + (r + 1)] && prod.lot) {
        ws["C" + (r + 1)].v = prod.lot;
      }
      // Update Stock Actual
      if (ws["F" + (r + 1)]) {
        ws["F" + (r + 1)].v = prod.stock;
        ws["F" + (r + 1)].t = "n"; // numeric type
      }
    }
  }
}
