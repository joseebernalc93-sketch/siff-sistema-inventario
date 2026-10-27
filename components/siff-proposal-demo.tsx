"use client";

import React, { useState, useMemo } from "react";
import {
  Package,
  Scan,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  Warehouse,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Printer,
  FileText,
  FileSpreadsheet,
  Upload,
  Smartphone,
  Laptop,
  Clock,
  User,
  Users,
  Layers,
  Wrench,
  ShoppingCart,
  ArrowRightLeft,
  ShieldAlert,
  PlusCircle,
  X,
  Camera,
  Download,
  Calendar,
  Sparkles,
  Check,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  TrendingUp,
  Truck,
  Plus,
  Trash2,
  Edit,
  ShieldCheck,
  LayoutGrid,
  List,
  Image as ImageIcon,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Pencil,
  FileCheck
} from "lucide-react";
import * as XLSX from "xlsx-js-style";
import { SIFF_PRODUCTS_DATA, SiffProduct } from "@/lib/siff-products";
import { SIFF_SAMPLE_EXCEL_B64 } from "@/lib/siff-sample-excel";

export type UserRole = "gerencia" | "bodega" | "tecnico" | "mostrador";

export interface SiffUser {
  id: string;
  name: string;
  role: UserRole;
  roleTitle: string;
  cedula: string;
  avatar: string;
  locationDefault: "Bodega Central" | "Oficina Matriz" | "Consolidado";
}

const PRESET_USERS: Record<UserRole, SiffUser> = {
  gerencia: {
    id: "usr-admin",
    name: "Gerencia General",
    role: "gerencia",
    roleTitle: "Administración & Control General SIFF",
    cedula: "0963671755",
    avatar: "👑",
    locationDefault: "Consolidado"
  },
  bodega: {
    id: "usr-bodega",
    name: "Jefe de Bodega",
    role: "bodega",
    roleTitle: "Custodia Física & Logística",
    cedula: "0921458796",
    avatar: "📦",
    locationDefault: "Bodega Central"
  },
  tecnico: {
    id: "usr-tecnico",
    name: "Técnico Especialista",
    role: "tecnico",
    roleTitle: "Servicios Técnicos & Reparaciones en Campo",
    cedula: "0954123687",
    avatar: "🛠️",
    locationDefault: "Bodega Central"
  },
  mostrador: {
    id: "usr-mostrador",
    name: "Ventas & Mostrador",
    role: "mostrador",
    roleTitle: "Atención al Cliente Oficina Matriz",
    cedula: "0945871236",
    avatar: "🛒",
    locationDefault: "Oficina Matriz"
  }
};

// Verified 200 OK high-resolution industrial refrigeration photos
const CATEGORY_IMAGES: Record<string, string> = {
  "Válvulas & Controles": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80",
  "Bombas, Aceites & Filtros": "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=400&q=80",
  "Mecánica & Compresores": "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=400&q=80",
  "Sellos, Empaques & O-Rings": "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=400&q=80",
  "Acoples & Bridas": "https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=400&q=80",
  "Repuestos Eléctricos & Varios": "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=400&q=80"
};

export function getProductImage(product: SiffProduct & { imageUrl?: string }): string {
  if (product.imageUrl !== undefined && product.imageUrl !== null) {
    if (product.imageUrl === "NO_IMAGE") {
      return "";
    }
    if (product.imageUrl.trim() !== "") {
      return product.imageUrl;
    }
  }
  return CATEGORY_IMAGES[product.category] || CATEGORY_IMAGES["Válvulas & Controles"];
}


// Smart Classifier for Category and Brand from technical description
function inferCategoryAndBrand(name: string): { category: string; brand: string } {
  const upper = (name || "").toUpperCase();
  let brand = "Multimarca / OEM";
  if (upper.includes("DANFOSS")) brand = "Danfoss";
  else if (upper.includes("BITZER")) brand = "Bitzer";
  else if (upper.includes("VILTER")) brand = "Vilter";
  else if (upper.includes("MYCOM")) brand = "Mycom";
  else if (upper.includes("FRICK")) brand = "Frick";
  else if (upper.includes("COPELAND")) brand = "Copeland";
  else if (upper.includes("CASTEL")) brand = "Castel";
  else if (upper.includes("SPORLAN")) brand = "Sporlan";
  else if (upper.includes("ALCO")) brand = "Alco";

  let category = "Mecánica & Compresores";
  if (
    upper.includes("VALV") ||
    upper.includes("VÁLV") ||
    upper.includes("EXPANSION") ||
    upper.includes("EXPANSIÓN") ||
    upper.includes("SOLENOIDE") ||
    upper.includes("PRESOSTATO") ||
    upper.includes("TERMOSTATO") ||
    upper.includes("AKS")
  ) {
    category = "Válvulas & Controles";
  } else if (
    upper.includes("ACEITE") ||
    upper.includes("BOMBA") ||
    upper.includes("FILTRO") ||
    upper.includes("LUBRICANTE") ||
    upper.includes("CARTRIDGE")
  ) {
    category = "Bombas, Aceites & Filtros";
  } else if (
    upper.includes("SELLO") ||
    upper.includes("EMPAQUE") ||
    upper.includes("O-RING") ||
    upper.includes("ORING") ||
    upper.includes("JUNTA") ||
    upper.includes("GASKET")
  ) {
    category = "Sellos, Empaques & O-Rings";
  } else if (
    upper.includes("ACOPLE") ||
    upper.includes("BRIDA") ||
    upper.includes("FLANGE") ||
    upper.includes("ARAÑA") ||
    upper.includes("ARAÑAS")
  ) {
    category = "Acoples & Bridas";
  } else if (
    upper.includes("BOBINA") ||
    upper.includes("SENSOR") ||
    upper.includes("CABLE") ||
    upper.includes("TERMIC") ||
    upper.includes("RELE") ||
    upper.includes("CONTACT")
  ) {
    category = "Repuestos Eléctricos & Varios";
  }

  return { category, brand };
}

// Parser for SIFF Excel Workbooks and generic spreadsheets
function parseSiffWorkbook(wb: XLSX.WorkBook): ExtendedProduct[] {
  const extracted: ExtendedProduct[] = [];
  let currentId = 1;

  function parseSheetRows(sheetName: string, defaultLocation: "Bodega Central" | "Oficina Matriz") {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
    const headerIdx = rows.findIndex((r) =>
      r && r.some((c) => typeof c === "string" && (c.toUpperCase().includes("CÓDIGO") || c.toUpperCase().includes("CODIGO")))
    );
    if (headerIdx === -1) return;
    const headers = rows[headerIdx].map((h) => String(h || "").trim().toUpperCase());

    const codeIdx = headers.findIndex((h) => h.includes("CÓDIGO") || h.includes("CODIGO"));
    let nameIdx = headers.findIndex(
      (h, idx) =>
        idx !== codeIdx &&
        (h.includes("DESCRIPCI") ||
          h.includes("NOMBRE") ||
          h.includes("DETALLE") ||
          (h.includes("PRODUCTO") && !h.includes("CÓDIGO") && !h.includes("CODIGO")))
    );
    if ((nameIdx === -1 || nameIdx === codeIdx) && headers.length > 1) {
      nameIdx = codeIdx === 0 ? 1 : 0;
    }
    const lotIdx = headers.findIndex((h) => h.includes("LOTE"));
    const stockIdx = headers.findIndex((h) => h.includes("STOCK"));
    const entradasIdx = headers.findIndex((h) => h.includes("ENTRADAS"));
    const salidasIdx = headers.findIndex((h) => h.includes("SALIDAS"));

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[codeIdx]) continue;
      const code = String(row[codeIdx] || "").trim().toUpperCase();
      if (!code || code === "TOTAL" || code.includes("CÓDIGO")) continue;

      const name = String(row[nameIdx] || "").trim();
      const lot = String(row[lotIdx] || "LT001").trim();
      let stock = 0;
      if (stockIdx !== -1 && row[stockIdx] !== undefined && row[stockIdx] !== null) {
        stock = Number(row[stockIdx]) || 0;
      } else if (entradasIdx !== -1 && salidasIdx !== -1) {
        stock = (Number(row[entradasIdx]) || 0) - (Number(row[salidasIdx]) || 0);
      }

      const { category, brand } = inferCategoryAndBrand(name);
      extracted.push({
        id: `excel-${currentId++}`,
        code,
        name,
        lot,
        location: defaultLocation,
        stock: Math.max(0, stock),
        minStock: 2,
        category,
        brand,
        lastMovement: new Date().toISOString().split("T")[0],
        imageUrl: CATEGORY_IMAGES[category]
      });
    }
  }

  // 1. Detect SIFF Bodega sheet
  const bodegaSheet = wb.SheetNames.find(
    (n) => n.trim().toUpperCase().includes("BODEGA") && !n.toUpperCase().includes("ENTRADA") && !n.toUpperCase().includes("SALIDA")
  );
  if (bodegaSheet) parseSheetRows(bodegaSheet, "Bodega Central");

  // 2. Detect SIFF Oficina sheet
  const oficinaSheet = wb.SheetNames.find(
    (n) => n.trim().toUpperCase().includes("OFICINA") && !n.toUpperCase().includes("ENTRADA") && !n.toUpperCase().includes("SALIDA")
  );
  if (oficinaSheet) parseSheetRows(oficinaSheet, "Oficina Matriz");

  // 3. Fallback: If neither was detected, parse first available sheet
  if (extracted.length === 0 && wb.SheetNames.length > 0) {
    parseSheetRows(wb.SheetNames[0], "Bodega Central");
  }

  return extracted;
}

interface ExtendedProduct extends SiffProduct {
  imageUrl?: string;
}

interface MovementRecord {
  id: string;
  folio: string;
  timestamp: string;
  fullDate: string;
  productCode: string;
  productName: string;
  location: string;
  type: "SALIDA" | "ENTRADA";
  quantity: number;
  previousStock: number;
  resultingStock: number;
  lot: string;
  reason: string;
  referenceDetail?: string;
  technician: string;
  technicianRole?: string;
  deviceMethod?: string;
  documentRef?: string;
  notes?: string;
}

interface TransferRecord {
  id: string;
  date: string;
  productCode: string;
  productName: string;
  from: "Bodega Central" | "Oficina Matriz";
  to: "Bodega Central" | "Oficina Matriz";
  quantity: number;
  status: "EN TRÁNSITO" | "RECIBIDO";
  requestedBy: string;
}

const INITIAL_TRANSFERS: TransferRecord[] = [
  {
    id: "trf-101",
    date: "Hoy, 11:30 AM",
    productCode: "AKS5898",
    productName: "AKS - 38 DANFOSS",
    from: "Bodega Central",
    to: "Oficina Matriz",
    quantity: 2,
    status: "EN TRÁNSITO",
    requestedBy: "Ventas Mostrador"
  },
  {
    id: "trf-100",
    date: "Ayer, 03:45 PM",
    productCode: "ACE5123",
    productName: "ACEITE BITZER 10 LTS",
    from: "Bodega Central",
    to: "Oficina Matriz",
    quantity: 3,
    status: "RECIBIDO",
    requestedBy: "Jefe de Bodega"
  }
];

const INITIAL_MOVEMENTS: MovementRecord[] = [
  {
    id: "mov-1",
    folio: "KDX-2026-0042",
    timestamp: "Hoy, 10:42 AM",
    fullDate: "27/10/2026 - 10:42:15 AM",
    productCode: "AKS5898",
    productName: "AKS - 38 DANFOSS",
    location: "Bodega Central",
    type: "SALIDA",
    quantity: 1,
    previousStock: 5,
    resultingStock: 4,
    lot: "LT032",
    reason: "Servicio Técnico a Cliente",
    referenceDetail: "Pesquera Mar del Sur - Mantenimiento Compresor 2",
    technician: "Técnico Especialista",
    technicianRole: "Servicios Técnicos & Reparaciones en Campo",
    deviceMethod: "Cámara Smartphone PWA (Escaneo QR)",
    documentRef: "Orden de Trabajo #OT-2026-8812",
    notes: "Retiro para mantenimiento correctivo urgente en planta pesquera."
  },
  {
    id: "mov-2",
    folio: "KDX-2026-0041",
    timestamp: "Hoy, 09:15 AM",
    fullDate: "27/10/2026 - 09:15:30 AM",
    productCode: "BOM5369",
    productName: "BOMBA DE ACEITE ORIGINAL VILTER",
    location: "Bodega Central",
    type: "SALIDA",
    quantity: 1,
    previousStock: 2,
    resultingStock: 1,
    lot: "LT029",
    reason: "Venta Mostrador",
    referenceDetail: "Factura N° 001-002-4521",
    technician: "Jefe de Bodega",
    technicianRole: "Custodia Física & Logística",
    deviceMethod: "Lector Barcode Pistola USB",
    documentRef: "Factura Comercial #001-002-4521",
    notes: "Despacho directo con verificación física de empaque original."
  },
  {
    id: "mov-3",
    folio: "KDX-2026-0040",
    timestamp: "Ayer, 04:30 PM",
    fullDate: "26/10/2026 - 04:30:00 PM",
    productCode: "ACE5123",
    productName: "ACEITE BITZER 10 LTS",
    location: "Oficina Matriz",
    type: "ENTRADA",
    quantity: 5,
    previousStock: 15,
    resultingStock: 20,
    lot: "LT028",
    reason: "Recepción de Proveedor",
    referenceDetail: "Guía Remisión Proveedor Danfoss/Bitzer #8841",
    technician: "Jefe de Bodega",
    technicianRole: "Custodia Física & Logística",
    deviceMethod: "Pantalla Táctil POS",
    documentRef: "Guía Remisión Proveedor #8841",
    notes: "Ingreso verificado por compra internacional de lubricante sintético."
  },
  {
    id: "mov-4",
    folio: "KDX-2026-0039",
    timestamp: "Ayer, 02:10 PM",
    fullDate: "26/10/2026 - 02:10:22 PM",
    productCode: "SEL6176",
    productName: "SELLO MECÁNICO 440 KT508",
    location: "Bodega Central",
    type: "SALIDA",
    quantity: 2,
    previousStock: 10,
    resultingStock: 8,
    lot: "LT003",
    reason: "Traspaso Interno",
    referenceDetail: "Envío a Oficina Matriz para exhibición",
    technician: "Jefe de Bodega",
    technicianRole: "Custodia Física & Logística",
    deviceMethod: "Lector Barcode Pistola USB",
    documentRef: "Guía Interna de Traspaso #TRF-101",
    notes: "Movimiento interno entre sedes para stock de mostrador matriz."
  }
];

export default function SiffProposalDemo() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<SiffUser | null>(null);

  // Login Form State
  const [selectedLoginTab, setSelectedLoginTab] = useState<UserRole>("gerencia");
  const [cedulaInput, setCedulaInput] = useState<string>("0963671755");
  const [passwordInput, setPasswordInput] = useState<string>("Gerencia123");
  const [pinInput, setPinInput] = useState<string>("1234");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Sub-Navigation Tabs inside logged view
  const [gerenciaSubTab, setGerenciaSubTab] = useState<"inventario" | "kardex" | "usuarios" | "propuesta">("inventario");
  const [bodegaSubTab, setBodegaSubTab] = useState<"perchas" | "recepcion" | "traspasos" | "etiquetas">("perchas");
  const [mostradorSubTab, setMostradorSubTab] = useState<"venta" | "stock" | "traspasos">("venta");

  // View Display Mode: "grid" (like the restaurant touch screen in image 1) vs "table"
  const [viewDisplayMode, setViewDisplayMode] = useState<"grid" | "table">("grid");

  // Shared Inventory & Movement Data
  const [products, setProducts] = useState<ExtendedProduct[]>(SIFF_PRODUCTS_DATA);
  const [movements, setMovements] = useState<MovementRecord[]>(INITIAL_MOVEMENTS);
  const [transfers, setTransfers] = useState<TransferRecord[]>(INITIAL_TRANSFERS);

  // Filters for Products
  const [selectedLocation, setSelectedLocation] = useState<"TODAS" | "Bodega Central" | "Oficina Matriz">("Bodega Central");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Quick Movement Modal
  const [selectedProduct, setSelectedProduct] = useState<ExtendedProduct | null>(null);
  const [movementType, setMovementType] = useState<"SALIDA" | "ENTRADA">("SALIDA");
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedReason, setSelectedReason] = useState<string>("Servicio Técnico a Cliente");
  const [referenceDetail, setReferenceDetail] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Scanner Simulator Modal
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Label Printing state (Bodega / Gerencia)
  const [selectedLabelProduct, setSelectedLabelProduct] = useState<ExtendedProduct>(products[0]);

  // Reception Form State (Bodega)
  const [receptionProductCode, setReceptionProductCode] = useState<string>("AKS5898");
  const [receptionQty, setReceptionQty] = useState<number>(5);
  const [receptionSupplier, setReceptionSupplier] = useState<string>("Danfoss Ecuador S.A.");
  const [receptionDoc, setReceptionDoc] = useState<string>("Guía #DF-9942");


  // Excel Upload State
  const [isUploadExcelOpen, setIsUploadExcelOpen] = useState<boolean>(false);
  const [excelFileName, setExcelFileName] = useState<string>("");
  const [isParsingExcel, setIsParsingExcel] = useState<boolean>(false);
  const [excelParsedProducts, setExcelParsedProducts] = useState<ExtendedProduct[] | null>(null);
  const [excelError, setExcelError] = useState<string | null>(null);
  // Add Product Form State (Gerencia) with Image Upload / URL support
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newLot, setNewLot] = useState<string>("LT035");
  const [newLocation, setNewLocation] = useState<"Bodega Central" | "Oficina Matriz">("Bodega Central");
  const [newStock, setNewStock] = useState<number>(5);
  const [newCategory, setNewCategory] = useState<string>("Válvulas & Controles");
  const [newBrand, setNewBrand] = useState<string>("Danfoss");
  const [newImageUrl, setNewImageUrl] = useState<string>("");

  // Edit Product State (Gerencia)
  const [editingProduct, setEditingProduct] = useState<ExtendedProduct | null>(null);
  const [isEditProductOpen, setIsEditProductOpen] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>("");
  const [editCode, setEditCode] = useState<string>("");
  const [editLot, setEditLot] = useState<string>("");
  const [editLocation, setEditLocation] = useState<"Bodega Central" | "Oficina Matriz">("Bodega Central");
  const [editStock, setEditStock] = useState<number>(0);
  const [editMinStock, setEditMinStock] = useState<number>(2);
  const [editCategory, setEditCategory] = useState<string>("Válvulas & Controles");
  const [editBrand, setEditBrand] = useState<string>("Danfoss");
  const [editImageUrl, setEditImageUrl] = useState<string>("");

  // Kardex Expansion, Filtering & Voucher Modal State
  const [expandedMovements, setExpandedMovements] = useState<Record<string, boolean>>({ "mov-1": true });
  const [kardexSearchQuery, setKardexSearchQuery] = useState<string>("");
  const [kardexFilterType, setKardexFilterType] = useState<"TODOS" | "SALIDA" | "ENTRADA">("TODOS");
  const [selectedVoucherMovement, setSelectedVoucherMovement] = useState<MovementRecord | null>(null);

  // Interactive KPI Card Filters & Modals
  const [activeKpiFilter, setActiveKpiFilter] = useState<"ALL" | "LOW_STOCK">("ALL");
  const [isStockBreakdownOpen, setIsStockBreakdownOpen] = useState<boolean>(false);
  const [isTransfersModalOpen, setIsTransfersModalOpen] = useState<boolean>(false);
  const [newTransferProductCode, setNewTransferProductCode] = useState<string>("AKS5898");
  const [newTransferFrom, setNewTransferFrom] = useState<"Bodega Central" | "Oficina Matriz">("Bodega Central");
  const [newTransferTo, setNewTransferTo] = useState<"Bodega Central" | "Oficina Matriz">("Oficina Matriz");
  const [newTransferQty, setNewTransferQty] = useState<number>(2);


  // Handle direct file upload from computer
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelError(null);
    setIsParsingExcel(true);
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buffer = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(buffer, { type: "array" });
        const extracted = parseSiffWorkbook(wb);
        if (extracted.length === 0) {
          setExcelError("No se encontraron registros de repuestos válidos en las hojas del archivo.");
          setExcelParsedProducts(null);
        } else {
          setExcelParsedProducts(extracted);
        }
      } catch (err: any) {
        console.error("Error parsing excel:", err);
        setExcelError("Error al procesar el archivo Excel. Asegúrate de que sea un formato .xlsx o .xls válido.");
      } finally {
        setIsParsingExcel(false);
      }
    };
    reader.onerror = () => {
      setExcelError("No se pudo leer el archivo seleccionado.");
      setIsParsingExcel(false);
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle 1-click test load of INVENTARIO SIFF ACTUALIZADO.xlsx
  const handleLoadDefaultExcel = () => {
    setExcelError(null);
    setIsParsingExcel(true);
    setExcelFileName("INVENTARIO SIFF ACTUALIZADO.xlsx");
    try {
      const binaryString = window.atob(SIFF_SAMPLE_EXCEL_B64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const wb = XLSX.read(bytes, { type: "array" });
      const extracted = parseSiffWorkbook(wb);
      if (extracted.length === 0) {
        setExcelError("No se encontraron productos en el documento.");
        setExcelParsedProducts(null);
      } else {
        setExcelParsedProducts(extracted);
      }
    } catch (err: any) {
      console.error(err);
      setExcelError("Error al procesar el archivo Excel.");
    } finally {
      setIsParsingExcel(false);
    }
  };

  // Apply parsed products replacing catalog
  const handleApplyExcelReplace = () => {
    if (!excelParsedProducts || excelParsedProducts.length === 0) return;
    setProducts(excelParsedProducts);
    setIsUploadExcelOpen(false);
    setToastMessage(`✅ ¡Catálogo actualizado con éxito! Se cargaron ${excelParsedProducts.length} repuestos desde el Excel.`);
    setExcelParsedProducts(null);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Apply parsed products merging with existing
  const handleApplyExcelMerge = () => {
    if (!excelParsedProducts || excelParsedProducts.length === 0) return;
    const existingCodes = new Set(products.map((p) => p.code));
    const newItems = excelParsedProducts.filter((p) => !existingCodes.has(p.code));
    const updated = products.map((p) => {
      const match = excelParsedProducts.find((ep) => ep.code === p.code && ep.location === p.location);
      return match ? { ...p, stock: match.stock, lot: match.lot } : p;
    });
    setProducts([...updated, ...newItems]);
    setIsUploadExcelOpen(false);
    setToastMessage(`✅ ¡Inventario combinado! ${newItems.length} repuestos nuevos agregados y existencias actualizadas.`);
    setExcelParsedProducts(null);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Login Authentication
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (selectedLoginTab === "gerencia") {
      if (cedulaInput.trim() === "0963671755" && passwordInput === "Gerencia123") {
        setCurrentUser(PRESET_USERS.gerencia);
        setSelectedLocation("TODAS");
      } else {
        setLoginError("Cédula o contraseña incorrecta para Gerencia. (Usa: 0963671755 / Gerencia123)");
      }
    } else if (selectedLoginTab === "bodega") {
      if (pinInput === "1234" || pinInput === "0000" || cedulaInput.length >= 6) {
        setCurrentUser(PRESET_USERS.bodega);
        setSelectedLocation("Bodega Central");
      } else {
        setLoginError("PIN incorrecto. Usa el PIN de demostración: 1234");
      }
    } else if (selectedLoginTab === "tecnico") {
      setCurrentUser(PRESET_USERS.tecnico);
      setSelectedLocation("Bodega Central");
    } else if (selectedLoginTab === "mostrador") {
      setCurrentUser(PRESET_USERS.mostrador);
      setSelectedLocation("Oficina Matriz");
    }
  };

  // Quick direct switch helper for live demo
  const handleSwitchUser = (role: UserRole) => {
    const user = PRESET_USERS[role];
    setCurrentUser(user);
    if (role === "gerencia") setSelectedLocation("TODAS");
    else if (role === "bodega" || role === "tecnico") setSelectedLocation("Bodega Central");
    else setSelectedLocation("Oficina Matriz");
    setToastMessage(`Sesión cambiada a: ${user.name}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["TODAS", ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchLocation = selectedLocation === "TODAS" || p.location === selectedLocation;
      const matchCategory = selectedCategory === "TODAS" || p.category === selectedCategory;
      const matchKpi = activeKpiFilter === "LOW_STOCK" ? p.stock <= p.minStock : true;
      const matchSearch =
        searchQuery === "" ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.lot.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLocation && matchCategory && matchSearch && matchKpi;
    });
  }, [products, selectedLocation, selectedCategory, searchQuery, activeKpiFilter]);

  // Dashboard Metrics
  const metrics = useMemo(() => {
    const totalItems = products.length;
    const bodegaCount = products.filter((p) => p.location === "Bodega Central").length;
    const oficinaCount = products.filter((p) => p.location === "Oficina Matriz").length;
    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
    const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
    return { totalItems, bodegaCount, oficinaCount, lowStockCount, totalStockUnits };
  }, [products]);

  // Analytical Breakdown of Stock Units
  const stockBreakdown = useMemo(() => {
    const bodegaUnits = products
      .filter((p) => p.location === "Bodega Central")
      .reduce((acc, p) => acc + p.stock, 0);
    const oficinaUnits = products
      .filter((p) => p.location === "Oficina Matriz")
      .reduce((acc, p) => acc + p.stock, 0);
    const totalUnits = bodegaUnits + oficinaUnits;

    // Breakdown by Category
    const categoryMap: Record<string, { count: number; units: number }> = {};
    products.forEach((p) => {
      if (!categoryMap[p.category]) {
        categoryMap[p.category] = { count: 0, units: 0 };
      }
      categoryMap[p.category].count += 1;
      categoryMap[p.category].units += p.stock;
    });

    const categoriesStats = Object.entries(categoryMap)
      .map(([cat, stat]) => ({
        name: cat,
        count: stat.count,
        units: stat.units,
        percentage: totalUnits > 0 ? Math.round((stat.units / totalUnits) * 100) : 0
      }))
      .sort((a, b) => b.units - a.units);

    // Top 5 products with highest physical stock
    const topProducts = [...products]
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 5);

    return { bodegaUnits, oficinaUnits, totalUnits, categoriesStats, topProducts };
  }, [products]);

  // Transfers handlers
  const handleConfirmTransferReceipt = (transferId: string) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, status: "RECIBIDO" } : t))
    );
    setToastMessage("✅ Traspaso recibido exitosamente en almacén de destino.");
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateNewTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.code === newTransferProductCode);
    if (!prod) return;
    if (newTransferFrom === newTransferTo) {
      alert("El origen y destino deben ser diferentes");
      return;
    }
    if (newTransferQty <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }

    const newTransfer: TransferRecord = {
      id: `trf-${Date.now().toString().slice(-3)}`,
      date: "Hoy, " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      productCode: prod.code,
      productName: prod.name,
      from: newTransferFrom,
      to: newTransferTo,
      quantity: newTransferQty,
      status: "EN TRÁNSITO",
      requestedBy: currentUser?.name || "Gerencia General"
    };

    setTransfers((prev) => [newTransfer, ...prev]);
    setToastMessage(`🚀 Traspaso iniciado: ${newTransferQty}x ${prod.code} (${newTransferFrom} → ${newTransferTo})`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle Movement submission
  const handleConfirmMovement = () => {
    if (!selectedProduct || !currentUser) return;

    if (quantity <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }

    if (movementType === "SALIDA" && quantity > selectedProduct.stock) {
      alert(`Stock insuficiente. Solo hay ${selectedProduct.stock} unidades disponibles.`);
      return;
    }

    if (!referenceDetail.trim() && selectedReason !== "Traspaso Bodega ↔ Oficina") {
      alert("Por favor indica el detalle obligatorio del motivo (Cliente, Factura o N° de Orden).");
      return;
    }

    const prevStock = selectedProduct.stock;
    const newStock = movementType === "SALIDA" ? prevStock - quantity : prevStock + quantity;

    setProducts((prev) =>
      prev.map((item) => (item.id === selectedProduct.id ? { ...item, stock: newStock } : item))
    );

    const now = new Date();
    const dateFormatted = `${now.toLocaleDateString("es-EC")} - ${now.toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;

    const newMovement: MovementRecord = {
      id: "mov-" + Date.now(),
      folio: `KDX-2026-${String(movements.length + 43).padStart(4, "0")}`,
      timestamp: "Hace unos segundos",
      fullDate: dateFormatted,
      productCode: selectedProduct.code,
      productName: selectedProduct.name,
      location: selectedProduct.location,
      type: movementType,
      quantity,
      previousStock: prevStock,
      resultingStock: newStock,
      lot: selectedProduct.lot,
      reason: selectedReason,
      referenceDetail: referenceDetail.trim() ? referenceDetail : undefined,
      technician: currentUser.name,
      technicianRole: currentUser.roleTitle,
      deviceMethod: isScannerOpen ? "Cámara Smartphone PWA (Escaneo QR)" : "Pantalla Táctil POS",
      documentRef: referenceDetail.trim() || "Vale Interno de Movimiento",
      notes: `Movimiento auditado y registrado con éxito por ${currentUser.name}.`
    };

    setMovements((prev) => [newMovement, ...prev]);

    setToastMessage(
      `✅ ${movementType === "SALIDA" ? "Salida" : "Entrada"} registrada: ${quantity}x ${selectedProduct.code} (${selectedProduct.location})`
    );
    setTimeout(() => setToastMessage(null), 4000);

    setSelectedProduct(null);
    setQuantity(1);
    setReferenceDetail("");
  };

  // Open modal for product
  const handleSelectProduct = (product: ExtendedProduct) => {
    setSelectedProduct(product);
    setMovementType("SALIDA");
    setQuantity(1);
    if (currentUser?.role === "tecnico") {
      setSelectedReason("Servicio Técnico a Cliente");
    } else if (currentUser?.role === "mostrador") {
      setSelectedReason("Venta de Mostrador");
    } else {
      setSelectedReason("Servicio Técnico a Cliente");
    }
    setReferenceDetail("");
  };

  // Handle simulated scan
  const handleApplySimulatedScan = (codeToScan: string) => {
    const found = products.find(
      (p) => p.code.toLowerCase() === codeToScan.toLowerCase() || p.id === codeToScan
    );
    if (found) {
      setIsScannerOpen(false);
      handleSelectProduct(found);
    } else {
      alert(`No se encontró ningún repuesto con el código ${codeToScan}`);
    }
  };

  // Create new product (Gerencia)
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      alert("Por favor ingresa código y nombre.");
      return;
    }

    const created: ExtendedProduct = {
      id: "p-" + (products.length + 1),
      code: newCode.trim().toUpperCase(),
      name: newName.trim().toUpperCase(),
      lot: newLot.trim().toUpperCase() || "LT001",
      location: newLocation,
      stock: Number(newStock) || 0,
      minStock: 2,
      category: newCategory,
      brand: newBrand,
      lastMovement: new Date().toISOString().split("T")[0],
      imageUrl: newImageUrl.trim() ? newImageUrl.trim() : CATEGORY_IMAGES[newCategory]
    };

    setProducts([created, ...products]);
    setIsAddProductOpen(false);
    setNewCode("");
    setNewName("");
    setNewImageUrl("");
    setToastMessage(`✅ Repuesto creado con foto: ${created.code} - ${created.name}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open edit modal for a product
  const handleOpenEditProduct = (product: ExtendedProduct) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCode(product.code);
    setEditLot(product.lot);
    setEditLocation(product.location);
    setEditStock(product.stock);
    setEditMinStock(product.minStock || 2);
    setEditCategory(product.category);
    setEditBrand(product.brand);
    setEditImageUrl(product.imageUrl || "");
    setIsEditProductOpen(true);
  };

  // Save edited product
  const handleSaveEditProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editName.trim() || !editCode.trim()) {
      alert("El nombre y código no pueden estar vacíos.");
      return;
    }

    const updated: ExtendedProduct = {
      ...editingProduct,
      name: editName.trim().toUpperCase(),
      code: editCode.trim().toUpperCase(),
      lot: editLot.trim().toUpperCase() || "LT001",
      location: editLocation,
      stock: Number(editStock) >= 0 ? Number(editStock) : 0,
      minStock: Number(editMinStock) >= 0 ? Number(editMinStock) : 2,
      category: editCategory,
      brand: editBrand.trim() || "Multimarca / OEM",
      imageUrl: editImageUrl
    };

    setProducts((prev) =>
      prev.map((p) => (p.id === editingProduct.id ? updated : p))
    );

    setIsEditProductOpen(false);
    setEditingProduct(null);
    setToastMessage(`✅ Repuesto ${updated.code} actualizado correctamente.`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Delete product from inventory
  const handleDeleteProduct = (productId: string) => {
    const found = products.find((p) => p.id === productId);
    if (!found) return;
    if (confirm(`¿Estás seguro de eliminar el repuesto "${found.code} - ${found.name}" del catálogo?`)) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setIsEditProductOpen(false);
      setEditingProduct(null);
      setToastMessage(`🗑️ Repuesto ${found.code} eliminado.`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  // Export full inventory to Excel matching SIFF format
  const handleExportInventoryExcel = () => {
    try {
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
        "ESTADO STOCK"
      ];
      const consolidadoRows = products.map((p) => [
        p.code,
        p.name,
        p.category,
        p.brand,
        p.location,
        p.lot,
        p.stock,
        p.minStock || 2,
        p.stock <= (p.minStock || 2) ? "STOCK CRÍTICO" : "ÓPTIMO"
      ]);
      const wsConsolidado = XLSX.utils.aoa_to_sheet([consolidadoHeaders, ...consolidadoRows]);
      XLSX.utils.book_append_sheet(wb, wsConsolidado, "INVENTARIO CONSOLIDADO");

      // Sheet 2: INVENTARIOBODEGA
      const bodegaItems = products.filter((p) => p.location === "Bodega Central");
      const bodegaHeaders = ["CÓDIGO PRODUCTO", "DESCRIPCIÓN", "TOTAL PRODUCTO", "LOTE", "CATEGORÍA", "MARCA"];
      const bodegaRows = bodegaItems.map((p) => [
        p.code,
        p.name,
        p.stock,
        p.lot,
        p.category,
        p.brand
      ]);
      const wsBodega = XLSX.utils.aoa_to_sheet([bodegaHeaders, ...bodegaRows]);
      XLSX.utils.book_append_sheet(wb, wsBodega, "INVENTARIOBODEGA");

      // Sheet 3: INVENTARIOOFICINA
      const oficinaItems = products.filter((p) => p.location === "Oficina Matriz");
      const oficinaHeaders = ["CÓDIGO PRODUCTO", "DESCRIPCIÓN", "TOTAL PRODUCTO", "LOTE", "CATEGORÍA", "MARCA"];
      const oficinaRows = oficinaItems.map((p) => [
        p.code,
        p.name,
        p.stock,
        p.lot,
        p.category,
        p.brand
      ]);
      const wsOficina = XLSX.utils.aoa_to_sheet([oficinaHeaders, ...oficinaRows]);
      XLSX.utils.book_append_sheet(wb, wsOficina, "INVENTARIOOFICINA");

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      saveWorkbookToBrowser(wb, `INVENTARIO_SIFF_ACTUALIZADO_${dateStr}.xlsx`);

      setToastMessage(`📥 Excel de inventario descargado (${products.length} repuestos).`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      console.error("Error al exportar inventario:", err);
      alert("Error al descargar Excel: " + err.message);
    }
  };

  // Helper to trigger browser download with correct filename and extension
  const saveWorkbookToBrowser = (wb: XLSX.WorkBook, filename: string) => {
    // Generate binary buffer using Uint8Array
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();

    // Critical: Do NOT revokeObjectURL immediately, otherwise Chrome fails to retrieve the filename and uses an internal UUID!
    setTimeout(() => {
      try {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      } catch (e) {
        // cleanup
      }
    }, 60000);
  };

  // Export Kardex to Excel
  const handleExportKardexExcel = () => {
    try {
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
        "OBSERVACIONES"
      ];
      const rows = movements.map((m) => [
        m.folio,
        m.fullDate,
        m.type,
        m.quantity,
        m.productCode,
        m.productName,
        m.location,
        m.lot,
        m.previousStock,
        m.resultingStock,
        m.reason,
        m.referenceDetail || m.documentRef || "-",
        m.technician,
        m.technicianRole || "-",
        m.deviceMethod || "Registro Digital",
        m.notes || "-"
      ]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "KARDEX_AUDITORIA");

      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      saveWorkbookToBrowser(wb, `KARDEX_AUDITORIA_SIFF_${dateStr}.xlsx`);

      setToastMessage(`📥 Kardex exportado a Excel (${movements.length} transacciones).`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err: any) {
      console.error("Error al exportar Kardex:", err);
      alert("Error al exportar Kardex: " + err.message);
    }
  };

  const toggleExpandMovement = (id: string) => {
    setExpandedMovements((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandAllMovements = () => {
    const allExpanded = movements.every((m) => expandedMovements[m.id]);
    const nextState: Record<string, boolean> = {};
    movements.forEach((m) => {
      nextState[m.id] = !allExpanded;
    });
    setExpandedMovements(nextState);
  };

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (kardexFilterType === "SALIDA" && m.type !== "SALIDA") return false;
      if (kardexFilterType === "ENTRADA" && m.type !== "ENTRADA") return false;
      if (kardexSearchQuery.trim()) {
        const q = kardexSearchQuery.toLowerCase();
        return (
          m.productCode.toLowerCase().includes(q) ||
          m.productName.toLowerCase().includes(q) ||
          m.folio.toLowerCase().includes(q) ||
          m.technician.toLowerCase().includes(q) ||
          m.reason.toLowerCase().includes(q) ||
          (m.referenceDetail && m.referenceDetail.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [movements, kardexFilterType, kardexSearchQuery]);

  // =========================================================================
  // VIEW: LOGIN SCREEN (When not authenticated)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-white relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <header className="p-6 max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl">
              SIFF
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900">
                SIFF <span className="text-cyan-600 font-medium">Refrigeración Industrial</span>
              </span>
              <p className="text-[11px] text-slate-500">Sistema Centralizado de Inventario & Control de Salidas</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Versión Demo Beta (357 Repuestos)
          </span>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 relative">
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Iniciar Sesión
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Selecciona tu perfil de acceso para ingresar al sistema
              </p>
            </div>

            <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 mb-6">
              <button
                type="button"
                onClick={() => {
                  setSelectedLoginTab("gerencia");
                  setCedulaInput("0963671755");
                  setPasswordInput("Gerencia123");
                  setLoginError(null);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  selectedLoginTab === "gerencia"
                    ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>👑</span>
                <span>Gerencia</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedLoginTab("bodega");
                  setCedulaInput("0921458796");
                  setPinInput("1234");
                  setLoginError(null);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  selectedLoginTab === "bodega"
                    ? "bg-cyan-600 text-white shadow font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>📦</span>
                <span>Bodega</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedLoginTab("tecnico");
                  setCedulaInput("0954123687");
                  setPinInput("0000");
                  setLoginError(null);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  selectedLoginTab === "tecnico"
                    ? "bg-emerald-600 text-white shadow font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🛠️</span>
                <span>Técnico</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedLoginTab("mostrador");
                  setCedulaInput("0945871236");
                  setPasswordInput("Mostrador123");
                  setLoginError(null);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  selectedLoginTab === "mostrador"
                    ? "bg-blue-600 text-white shadow font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🛒</span>
                <span>Ventas</span>
              </button>
            </div>

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Número de Cédula</span>
                  <span className="text-[10px] text-slate-500 font-mono">10 dígitos</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={cedulaInput}
                    onChange={(e) => setCedulaInput(e.target.value)}
                    placeholder="Ej: 0963671755"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/15 font-mono tracking-wider"
                  />
                </div>
              </div>

              {selectedLoginTab === "gerencia" || selectedLoginTab === "mostrador" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Contraseña de Acceso</span>
                    {selectedLoginTab === "gerencia" && (
                      <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Clave: Gerencia123</span>
                    )}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Contraseña"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>PIN de Acceso Rápido</span>
                    <span className="text-[10px] text-cyan-700 font-semibold">4 dígitos</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="****"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/15 font-mono tracking-widest text-center"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition-all mt-2"
              >
                Ingresar al Sistema
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200">
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center mb-2.5">
                ⚡ Acceso Directo de Demostración (1 clic):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSwitchUser("gerencia")}
                  className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-300 text-amber-900 font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>👑</span> Gerencia General
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchUser("bodega")}
                  className="p-2 rounded-xl bg-cyan-50 hover:bg-cyan-100/80 border border-cyan-300 text-cyan-900 font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>📦</span> Jefe de Bodega
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchUser("tecnico")}
                  className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 text-emerald-900 font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>🛠️</span> Técnico (Celular)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchUser("mostrador")}
                  className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-300 text-blue-900 font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>🛒</span> Ventas Mostrador
                </button>
              </div>
            </div>
          </div>
        </main>

        <footer className="p-4 text-center text-xs text-slate-500">
          SIFF Refrigeración Industrial
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW: AUTHENTICATED SYSTEM (Role-based Panel)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Top App Header - Cleaned without personal names or cédula */}
      <header className="bg-white/95 border-b border-slate-200 sticky top-0 z-40 shadow-xs backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo and Clean Role Indicator */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black tracking-wider text-xl">
                SIFF
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
                    SIFF <span className="text-cyan-600 font-medium">Inventario</span>
                  </h1>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      currentUser.role === "gerencia"
                        ? "bg-amber-50 text-amber-900 border-amber-300 font-bold"
                        : currentUser.role === "bodega"
                        ? "bg-cyan-50 text-cyan-900 border-cyan-300 font-bold"
                        : currentUser.role === "tecnico"
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300 font-bold"
                        : "bg-blue-50 text-blue-900 border-blue-300 font-bold"
                    }`}
                  >
                    <span className="mr-1">{currentUser.avatar}</span>
                    {currentUser.role.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {currentUser.roleTitle}
                </p>
              </div>
            </div>

            {/* Logout */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentUser(null)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-xs"
                title="Cerrar Sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-white border-2 border-emerald-500 rounded-xl p-4 shadow-xl shadow-emerald-500/15 text-slate-900 flex items-start gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{toastMessage}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROLE 1: PANEL DE GERENCIA (Clean Non-scrollable Header + Photos Grid) */}
      {/* ========================================================================= */}
      {currentUser.role === "gerencia" && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Sub Navigation Bar - Perfectly Aligned without Ugly Scrollbar (Image 3 fix) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
            {/* Segmented control tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setGerenciaSubTab("inventario")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  gerenciaSubTab === "inventario"
                    ? "bg-amber-500 text-slate-950 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Inventario (357)</span>
              </button>
              <button
                onClick={() => setGerenciaSubTab("kardex")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  gerenciaSubTab === "kardex"
                    ? "bg-amber-500 text-slate-950 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Kardex & Auditoría</span>
              </button>
              <button
                onClick={() => setGerenciaSubTab("usuarios")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  gerenciaSubTab === "usuarios"
                    ? "bg-amber-500 text-slate-950 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Personal & Roles</span>
              </button>
              <button
                onClick={() => setGerenciaSubTab("propuesta")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  gerenciaSubTab === "propuesta"
                    ? "bg-cyan-600 text-white shadow-xs font-bold"
                    : "text-cyan-700 hover:text-cyan-800"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Plan Propuesta</span>
              </button>
            </div>

            {/* Right Action buttons - Aligned and balanced */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportInventoryExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-xs hover:border-emerald-500 active:scale-95 transition-all"
                title="Descargar documento Excel con todo el inventario consolidado y por bodegas"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Descargar Excel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setExcelError(null);
                  setExcelParsedProducts(null);
                  setIsUploadExcelOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all"
                title="Subir documento Excel con inventario"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Subir Documento Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddProductOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-md active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Nuevo Repuesto</span>
              </button>
            </div>
          </div>

          {/* Gerencia Interactive KPI Buttons */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Total Repuestos -> Click to reset and show full catalog */}
            <button
              type="button"
              onClick={() => {
                setActiveKpiFilter("ALL");
                setSelectedLocation("TODAS");
                setSelectedCategory("TODAS");
                setSearchQuery("");
                setGerenciaSubTab("inventario");
                setToastMessage("Catálogo completo restablecido (357 repuestos).");
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className={`group relative text-left rounded-2xl p-5 shadow transition-all duration-200 transform hover:-translate-y-1 active:scale-[0.98] ${
                activeKpiFilter === "ALL" && selectedLocation === "TODAS" && selectedCategory === "TODAS" && !searchQuery
                  ? "bg-white border-2 border-amber-500 shadow-md ring-2 ring-amber-500/20"
                  : "bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md"
              }`}
            >
              <div className="text-slate-500 text-xs font-bold flex items-center justify-between mb-2">
                <span className="group-hover:text-amber-600 transition-colors">TOTAL REPUESTOS</span>
                <Package className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.totalItems}</div>
              <p className="text-xs text-slate-500 mt-1">Bodega ({metrics.bodegaCount}) • Oficina ({metrics.oficinaCount})</p>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-amber-600 font-medium">
                <span>Ver catálogo completo</span>
                <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
              </div>
            </button>

            {/* KPI 2: Total Unidades en Stock -> Click to open analytical breakdown */}
            <button
              type="button"
              onClick={() => setIsStockBreakdownOpen(true)}
              className="group relative text-left bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 active:scale-[0.98]"
            >
              <div className="text-slate-500 text-xs font-bold flex items-center justify-between mb-2">
                <span className="group-hover:text-emerald-600 transition-colors">TOTAL UNIDADES EN STOCK</span>
                <TrendingUp className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                {metrics.totalStockUnits.toLocaleString()} un.
              </div>
              <p className="text-xs text-slate-500 mt-1">Existencias físicas consolidadas</p>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-600 font-medium">
                <span>Ver desglose por bodega</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* KPI 3: Stock Crítico -> Click to instantly filter critical items */}
            <button
              type="button"
              onClick={() => {
                if (activeKpiFilter === "LOW_STOCK") {
                  setActiveKpiFilter("ALL");
                  setToastMessage("Filtro de stock crítico desactivado.");
                } else {
                  setActiveKpiFilter("LOW_STOCK");
                  setGerenciaSubTab("inventario");
                  setToastMessage("⚠️ Filtrando: Repuestos con stock crítico (≤ 2 un.)");
                }
                setTimeout(() => setToastMessage(null), 3500);
              }}
              className={`group relative text-left rounded-2xl p-5 shadow transition-all duration-200 transform hover:-translate-y-1 active:scale-[0.98] ${
                activeKpiFilter === "LOW_STOCK"
                  ? "bg-rose-50 border-2 border-rose-500 shadow-md ring-2 ring-rose-500/20"
                  : "bg-white border border-slate-200 hover:border-rose-400 hover:shadow-md"
              }`}
            >
              <div className="text-slate-500 text-xs font-bold flex items-center justify-between mb-2">
                <span className="group-hover:text-rose-600 transition-colors">ALERTAS STOCK CRÍTICO</span>
                <AlertTriangle className={`w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform ${activeKpiFilter === "LOW_STOCK" ? "animate-bounce" : ""}`} />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-600">{metrics.lowStockCount}</div>
              <p className="text-xs text-slate-500 mt-1">Repuestos con &le; 2 unidades</p>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-rose-600 font-medium">
                <span>{activeKpiFilter === "LOW_STOCK" ? "Quitar filtro activo" : "Filtrar por stock crítico"}</span>
                <span className="font-bold">{activeKpiFilter === "LOW_STOCK" ? "✕" : "↓"}</span>
              </div>
            </button>

            {/* KPI 4: Tránsitos -> Click to open transfers modal and management */}
            <button
              type="button"
              onClick={() => setIsTransfersModalOpen(true)}
              className="group relative text-left bg-white border border-slate-200 hover:border-cyan-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 transform hover:-translate-y-1 active:scale-[0.98]"
            >
              <div className="text-slate-500 text-xs font-bold flex items-center justify-between mb-2">
                <span className="group-hover:text-cyan-700 transition-colors">TRÁNSITOS ENTRE BODEGAS</span>
                <ArrowRightLeft className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-700">{transfers.length}</div>
              <p className="text-xs text-slate-500 mt-1">Traspasos registrados</p>
              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-cyan-700 font-medium">
                <span>Ver traspasos y guías</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          {/* Subtab 1: Inventory with Visual Photos Cards (Image 1 Style) */}
          {gerenciaSubTab === "inventario" && (
            <div className="space-y-4">
              {/* Active Low Stock KPI Filter Banner */}
              {activeKpiFilter === "LOW_STOCK" && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 shadow-sm animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-100 text-rose-600 shrink-0">
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="font-bold text-rose-950 text-sm block">
                        Filtro Activo: Repuestos con Stock Crítico (≤ 2 unidades)
                      </span>
                      <span className="text-xs text-rose-700">
                        Mostrando {filteredProducts.length} repuestos que requieren reposición inmediata o compra.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveKpiFilter("ALL");
                        setToastMessage("Filtro de stock crítico desactivado.");
                        setTimeout(() => setToastMessage(null), 2500);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 shadow active:scale-95 transition-all shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Quitar filtro (Ver todos)</span>
                    </button>
                  </div>
                </div>
              )}
              {/* Controls: Location filter + Search + View Switcher (Cuadrícula con Fotos vs Lista) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex bg-slate-200/70 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                  <button
                    onClick={() => setSelectedLocation("TODAS")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedLocation === "TODAS" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Todo ({metrics.totalItems})
                  </button>
                  <button
                    onClick={() => setSelectedLocation("Bodega Central")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedLocation === "Bodega Central" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Bodega ({metrics.bodegaCount})
                  </button>
                  <button
                    onClick={() => setSelectedLocation("Oficina Matriz")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedLocation === "Oficina Matriz" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Oficina ({metrics.oficinaCount})
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-lg">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por código, nombre o marca..."
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 shadow-xs"
                    />
                  </div>

                  {/* View Mode Switcher: Grid with photos vs Table (Like reference image 1) */}
                  <div className="flex bg-slate-200/70 p-1 rounded-xl border border-slate-200 shrink-0">
                    <button
                      onClick={() => setViewDisplayMode("grid")}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        viewDisplayMode === "grid"
                          ? "bg-white text-slate-900 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Vista Cuadrícula con Fotos"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden md:inline">Fotos</span>
                    </button>
                    <button
                      onClick={() => setViewDisplayMode("table")}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        viewDisplayMode === "table"
                          ? "bg-white text-slate-900 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                      title="Vista Lista Tabla"
                    >
                      <List className="w-4 h-4" />
                      <span className="hidden md:inline">Lista</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* VIEW 1: GRID WITH VISUAL PHOTOS (Modelled after Reference Image 1) */}
              {viewDisplayMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.slice(0, 24).map((prod) => {
                    const isLow = prod.stock <= prod.minStock;
                    const imageUrl = getProductImage(prod);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => handleOpenEditProduct(prod)}
                        className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-slate-200/60 group cursor-pointer"
                        title="Toca la cartilla para editar el repuesto o su imagen"
                      >
                        <div>
                          {/* Product Image Frame (Clean square photo container like in reference Image 1) */}
                          <div className="w-full h-44 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden relative mb-3 flex items-center justify-center p-2 group-hover:border-slate-200 transition-colors">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={prod.name}
                                className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-1.5 p-3 text-center border-2 border-dashed border-slate-200">
                                <ImageIcon className="w-8 h-8 text-slate-300" />
                                <span className="text-[11px] font-semibold text-slate-500">Sin foto asignada</span>
                                <span className="text-[9px] text-slate-400">Toca para agregar una imagen</span>
                              </div>
                            )}

                            {/* Stock badge overlay */}
                            <div className="absolute top-2 right-2">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full shadow ${
                                  isLow ? "bg-rose-500 text-white" : "bg-emerald-500 text-slate-950"
                                }`}
                              >
                                {prod.stock} un.
                              </span>
                            </div>
                            {/* Brand badge overlay */}
                            <div className="absolute bottom-2 left-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/95 text-slate-800 border border-slate-200 shadow-xs backdrop-blur-sm">
                                {prod.brand}
                              </span>
                            </div>
                          </div>

                          {/* Technical Details */}
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                {prod.code}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">{prod.lot}</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-amber-700 transition-colors">
                              {prod.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-1">{prod.category}</p>
                            <p className="text-[10px] text-slate-500">📍 {prod.location}</p>
                          </div>
                        </div>

                        {/* Stock & Action Buttons without prices */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isLow ? "bg-rose-500 animate-pulse" : "bg-emerald-400"}`}></span>
                            <span className="text-xs text-slate-600 font-semibold">{prod.stock} un. disponibles</span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectProduct(prod);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow active:scale-95"
                          >
                            Mover / Retirar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* VIEW 2: TABLE VIEW */
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3">Foto</th>
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3">Descripción Técnica</th>
                          <th className="px-4 py-3">Lote</th>
                          <th className="px-4 py-3">Ubicación</th>
                          <th className="px-4 py-3">Stock Actual</th>
                          <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredProducts.slice(0, 25).map((prod) => {
                          const isLow = prod.stock <= prod.minStock;
                          const imageUrl = getProductImage(prod);
                          return (
                            <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-2">
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={prod.name}
                                    className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                    <ImageIcon className="w-5 h-5 text-slate-300" />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono font-bold text-cyan-700">{prod.code}</td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-900">{prod.name}</div>
                                <div className="text-[11px] text-slate-400">{prod.category} • {prod.brand}</div>
                              </td>
                              <td className="px-4 py-3 font-mono text-slate-400">{prod.lot}</td>
                              <td className="px-4 py-3 text-slate-600">{prod.location}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-0.5 rounded-full ${
                                    isLow ? "bg-rose-500/10 text-rose-400 border border-rose-500/30" : "bg-emerald-500/10 text-emerald-400"
                                  }`}
                                >
                                  {prod.stock} un.
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditProduct(prod)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold flex items-center gap-1 transition-all"
                                    title="Modificar ficha y foto del repuesto"
                                  >
                                    <Pencil className="w-3 h-3 text-slate-500" />
                                    <span>Editar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectProduct(prod)}
                                    className="px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-600 hover:text-white border border-cyan-200 text-xs font-semibold transition-all"
                                  >
                                    Mover
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subtab 2: Kardex Audit con Desplegables de Detalle */}
          {gerenciaSubTab === "kardex" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
              {/* Header con título y acciones rápidas */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    Auditoría Total & Kardex Integral de Entradas y Salidas
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Cada registro cuenta con folio único, trazabilidad de stock previo/posterior y soporte documental. Haz clic en cualquier fila para ver todos sus detalles.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleExpandAllMovements}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Expandir / Colapsar Todos</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportKardexExcel}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
                    title="Descargar historial de Kardex completo en formato Excel"
                  >
                    <Download className="w-4 h-4" />
                    <span>Exportar Kardex a Excel</span>
                  </button>
                </div>
              </div>

              {/* Filters Bar: Search + Type selector */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={kardexSearchQuery}
                    onChange={(e) => setKardexSearchQuery(e.target.value)}
                    placeholder="Buscar por código, repuesto, folio, motivo o técnico..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-xs"
                  />
                  {kardexSearchQuery && (
                    <button
                      onClick={() => setKardexSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex bg-slate-200/70 p-1 rounded-xl border border-slate-200 text-xs font-semibold shrink-0">
                  <button
                    type="button"
                    onClick={() => setKardexFilterType("TODOS")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      kardexFilterType === "TODOS" ? "bg-white text-slate-900 font-bold shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Todos ({movements.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setKardexFilterType("SALIDA")}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                      kardexFilterType === "SALIDA" ? "bg-white text-rose-700 font-bold shadow-xs" : "text-slate-600 hover:text-rose-700"
                    }`}
                  >
                    <ArrowDownLeft className="w-3 h-3 text-rose-500" />
                    Salidas ({movements.filter((m) => m.type === "SALIDA").length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setKardexFilterType("ENTRADA")}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                      kardexFilterType === "ENTRADA" ? "bg-white text-emerald-700 font-bold shadow-xs" : "text-slate-600 hover:text-emerald-700"
                    }`}
                  >
                    <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                    Entradas ({movements.filter((m) => m.type === "ENTRADA").length})
                  </button>
                </div>
              </div>

              {/* Kardex Table with Expandable Accordion Rows */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-3 w-10 text-center">Detalle</th>
                      <th className="px-4 py-3">Folio</th>
                      <th className="px-4 py-3">Fecha & Hora</th>
                      <th className="px-4 py-3">Tipo Movimiento</th>
                      <th className="px-4 py-3">Repuesto & Código</th>
                      <th className="px-4 py-3">Ubicación</th>
                      <th className="px-4 py-3">Motivo Obligatorio</th>
                      <th className="px-4 py-3">Responsable</th>
                      <th className="px-4 py-3 text-right">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMovements.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                          No se encontraron movimientos registrados con el filtro actual.
                        </td>
                      </tr>
                    ) : (
                      filteredMovements.map((m) => {
                        const isExpanded = !!expandedMovements[m.id];
                        return (
                          <React.Fragment key={m.id}>
                            {/* Main Row - Clickable to expand */}
                            <tr
                              onClick={() => toggleExpandMovement(m.id)}
                              className={`cursor-pointer transition-colors ${
                                isExpanded ? "bg-amber-50/40" : "hover:bg-slate-50/80"
                              }`}
                            >
                              {/* Accordion Chevron Toggle */}
                              <td className="px-3 py-3.5 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpandMovement(m.id);
                                  }}
                                  className={`p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-transform duration-200 ${
                                    isExpanded ? "rotate-180 text-amber-600 bg-amber-100/60" : ""
                                  }`}
                                  title={isExpanded ? "Ocultar detalles" : "Ver detalles completos"}
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </td>

                              {/* Folio */}
                              <td className="px-4 py-3.5 font-mono text-xs font-bold text-amber-900 whitespace-nowrap">
                                <span className="bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                                  {m.folio}
                                </span>
                              </td>

                              {/* Date and time */}
                              <td className="px-4 py-3.5">
                                <div className="font-mono text-xs text-slate-700 font-semibold">{m.timestamp}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{m.fullDate}</div>
                              </td>

                              {/* Movement Type & Qty Badge */}
                              <td className="px-4 py-3.5">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                    m.type === "SALIDA"
                                      ? "bg-rose-500/10 text-rose-600 border border-rose-200"
                                      : "bg-emerald-500/10 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {m.type === "SALIDA" ? (
                                    <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
                                  ) : (
                                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                                  )}
                                  {m.type}: {m.quantity} un.
                                </span>
                              </td>

                              {/* Product Name & Code */}
                              <td className="px-4 py-3.5">
                                <div className="font-bold text-slate-900 line-clamp-1">{m.productName}</div>
                                <div className="text-xs text-cyan-700 font-mono font-bold">{m.productCode}</div>
                              </td>

                              {/* Location */}
                              <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1">
                                  📍 {m.location}
                                </span>
                              </td>

                              {/* Reason */}
                              <td className="px-4 py-3.5">
                                <div className="font-medium text-slate-800">{m.reason}</div>
                                {m.referenceDetail && (
                                  <div className="text-xs text-slate-500 italic line-clamp-1">
                                    "{m.referenceDetail}"
                                  </div>
                                )}
                              </td>

                              {/* Technician / Responsible */}
                              <td className="px-4 py-3.5 text-slate-700 whitespace-nowrap font-medium">
                                {m.technician}
                              </td>

                              {/* Voucher Action Button */}
                              <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVoucherMovement(m);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all inline-flex items-center gap-1 active:scale-95 shadow-xs"
                                  title="Ver e imprimir vale de entrega"
                                >
                                  <Printer className="w-3 h-3 text-slate-500" />
                                  <span>Vale</span>
                                </button>
                              </td>
                            </tr>

                            {/* Desplegable: Detalle Extendido Completo de Auditoría */}
                            {isExpanded && (
                              <tr className="bg-amber-50/20 border-b border-slate-200">
                                <td colSpan={9} className="p-3 sm:p-5">
                                  <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4 animate-in fade-in duration-200 text-slate-800">
                                    {/* Encabezado del Detalle */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                                          DETALLE COMPLETO DE AUDITORÍA: {m.folio}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                          Registro Sincronizado en Supabase
                                        </span>
                                      </div>
                                      <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        Fecha exacta: {m.fullDate}
                                      </span>
                                    </div>

                                    {/* 3 Tarjetas de Detalle Analítico */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
                                      {/* Tarjeta 1: Balances de Stock */}
                                      <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                                        <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                          <span>Balance Físico de Stock</span>
                                          <Package className="w-3.5 h-3.5 text-amber-500" />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                                          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                                            <span className="text-[10px] text-slate-400 block font-semibold">Stock Previo</span>
                                            <strong className="text-sm text-slate-800">{m.previousStock} un.</strong>
                                          </div>
                                          <div
                                            className={`p-2 rounded-lg border shadow-xs ${
                                              m.type === "SALIDA"
                                                ? "bg-rose-50 border-rose-200 text-rose-700"
                                                : "bg-emerald-50 border-emerald-200 text-emerald-700"
                                            }`}
                                          >
                                            <span className="text-[10px] block font-semibold">
                                              {m.type === "SALIDA" ? "Salida (-)" : "Entrada (+)"}
                                            </span>
                                            <strong className="text-sm font-black">{m.quantity} un.</strong>
                                          </div>
                                          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs">
                                            <span className="text-[10px] text-slate-400 block font-semibold">Saldo Posterior</span>
                                            <strong className="text-sm text-slate-900">{m.resultingStock} un.</strong>
                                          </div>
                                        </div>
                                        <div className="pt-2 text-[11px] text-slate-600 space-y-1 border-t border-slate-200/60">
                                          <div>• <strong>Lote Asignado:</strong> <span className="font-mono font-bold text-slate-800">{m.lot}</span></div>
                                          <div>• <strong>Ubicación Almacén:</strong> {m.location}</div>
                                        </div>
                                      </div>

                                      {/* Tarjeta 2: Justificación & Respaldo */}
                                      <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                                        <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                          <span>Justificación & Documento</span>
                                          <FileText className="w-3.5 h-3.5 text-cyan-600" />
                                        </div>
                                        <div className="space-y-1.5 pt-1">
                                          <div>
                                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Motivo Obligatorio:</span>
                                            <span className="font-bold text-slate-800 text-xs">{m.reason}</span>
                                          </div>
                                          <div>
                                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Detalle / Referencia:</span>
                                            <span className="italic text-slate-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 block mt-0.5 shadow-xs">
                                              "{m.referenceDetail || "Registro In Situ en Bodega"}"
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-600 pt-1">
                                            • <strong>Documento de Soporte:</strong> <span className="font-semibold text-slate-800">{m.documentRef || "Vale Interno de Movimiento"}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Tarjeta 3: Personal & Seguridad */}
                                      <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200 space-y-2.5">
                                        <div className="flex items-center justify-between text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                                          <span>Personal & Método</span>
                                          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                                        </div>
                                        <div className="space-y-1.5 pt-1">
                                          <div>
                                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Responsable que Ejecuta:</span>
                                            <span className="font-bold text-slate-900 text-xs">{m.technician}</span>
                                            <span className="text-[10px] text-slate-500 block">{m.technicianRole || "Personal SIFF Autorizado"}</span>
                                          </div>
                                          <div>
                                            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Canal de Captura:</span>
                                            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                                              <QrCode className="w-3 h-3 text-cyan-600" />
                                              {m.deviceMethod || "Registro Táctil POS"}
                                            </span>
                                          </div>
                                          <div className="text-[10px] text-slate-500 pt-1">
                                            • <strong>Observaciones:</strong> {m.notes || "Movimiento registrado y validado."}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Barra de Acciones del Desplegable */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                                      <div className="text-xs text-slate-600">
                                        Repuesto vinculado: <strong className="text-slate-900 font-mono">{m.productCode}</strong> — {m.productName}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedVoucherMovement(m)}
                                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                                        >
                                          <Printer className="w-3.5 h-3.5 text-slate-600" />
                                          <span>Imprimir Vale de Entrega</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const found = products.find((p) => p.code === m.productCode);
                                            if (found) {
                                              handleOpenEditProduct(found);
                                            } else {
                                              alert("El repuesto ya no se encuentra en el catálogo.");
                                            }
                                          }}
                                          className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-200 flex items-center gap-1.5 transition-all active:scale-95"
                                        >
                                          <Pencil className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Modificar Ficha de este Repuesto</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 3: Users and Roles Management */}
          {gerenciaSubTab === "usuarios" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Personal Autorizado & Roles del Sistema
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(PRESET_USERS).map((user) => (
                  <div key={user.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                      {user.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-900 truncate">{user.name}</h4>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white text-cyan-800 border border-slate-200 shadow-xs">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{user.roleTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 4: Plan Propuesta Martes */}
          {gerenciaSubTab === "propuesta" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <span className="text-xs font-bold uppercase text-cyan-700 tracking-wider">RESUMEN EJECUTIVO</span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">Plan de Implementación en 2 Semanas</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Solución llave en mano para SIFF: catálogo visual con fotos, retiro rápido en 3 segundos y trazabilidad total.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-amber-700 mb-2">Semana 1: Configuración y Datos</h4>
                  <ul className="text-slate-600 space-y-1.5 text-xs">
                    <li>• Carga y depuración de los 357 repuestos del Excel a Supabase.</li>
                    <li>• Configuración de los 4 roles de acceso (Gerencia, Bodega, Técnicos, Mostrador).</li>
                    <li>• Pruebas de escaneo con pistola lectora y cámara del teléfono.</li>
                  </ul>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-emerald-700 mb-2">Semana 2: Rotulación y Despliegue</h4>
                  <ul className="text-slate-600 space-y-1.5 text-xs">
                    <li>• Impresión de etiquetas QR para perchas y gavetas de Bodega y Oficina.</li>
                    <li>• Instalación de la PWA en los celulares de los técnicos.</li>
                    <li>• Capacitación virtual a gerencia y personal operativo.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* ROLE 2: PANEL DE BODEGUERO (Recepción Compras, Traspasos, Etiquetas, Perchas) */}
      {/* ========================================================================= */}
      {currentUser.role === "bodega" && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setBodegaSubTab("perchas")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  bodegaSubTab === "perchas"
                    ? "bg-cyan-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Warehouse className="w-4 h-4" />
                Perchas Bodega ({metrics.bodegaCount})
              </button>
              <button
                onClick={() => setBodegaSubTab("recepcion")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  bodegaSubTab === "recepcion"
                    ? "bg-cyan-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <Truck className="w-4 h-4" />
                Recepción Proveedores
              </button>
              <button
                onClick={() => setBodegaSubTab("traspasos")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  bodegaSubTab === "traspasos"
                    ? "bg-cyan-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                Traspasos a Oficina ({transfers.length})
              </button>
              <button
                onClick={() => setBodegaSubTab("etiquetas")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  bodegaSubTab === "etiquetas"
                    ? "bg-cyan-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <QrCode className="w-4 h-4" />
                Imprimir Etiquetas QR
              </button>
            </div>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs active:scale-95"
            >
              <Scan className="w-4 h-4" />
              Lector Láser / Escanear
            </button>
          </div>

          {/* Bodega Subtab 1: Perchas Bodega con Fotos */}
          {bodegaSubTab === "perchas" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center justify-between text-slate-600">
                <span className="text-xs text-slate-400">
                  Inventario físico en <strong>Bodega Central</strong> con fotos para identificación rápida.
                </span>
                <span className="text-xs font-mono text-cyan-400">185 repuestos</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products
                  .filter((p) => p.location === "Bodega Central")
                  .slice(0, 16)
                  .map((p) => {
                    const imageUrl = getProductImage(p);
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="bg-white border border-slate-200 hover:border-cyan-500 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between group shadow-xs hover:shadow-md"
                      >
                        <div>
                          <div className="w-full h-36 bg-slate-50 rounded-xl overflow-hidden mb-3 border border-slate-100">
                            <img
                              src={imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
                            <span className="text-cyan-400 font-bold">{p.code}</span>
                            <span>{p.lot}</span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-900 line-clamp-2">{p.name}</h4>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                          <span className="text-slate-500">Stock: <strong className="text-slate-900">{p.stock} un.</strong></span>
                          <span className="text-cyan-400 font-bold">Despachar →</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Bodega Subtab 2: Recepción Proveedores */}
          {bodegaSubTab === "recepcion" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-xl mx-auto space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-cyan-600" />
                  Recepción de Mercadería por Compra
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Ingresa los repuestos que llegan de proveedores a Bodega Central.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Repuesto que ingresa:</label>
                  <select
                    value={receptionProductCode}
                    onChange={(e) => setReceptionProductCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-cyan-600"
                  >
                    {products.slice(0, 40).map((p) => (
                      <option key={p.id} value={p.code}>
                        {p.code} - {p.name} ({p.brand})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Cantidad recibida:</label>
                    <input
                      type="number"
                      min={1}
                      value={receptionQty}
                      onChange={(e) => setReceptionQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 text-center font-bold focus:bg-white focus:border-cyan-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">N° Guía / Factura:</label>
                    <input
                      type="text"
                      value={receptionDoc}
                      onChange={(e) => setReceptionDoc(e.target.value)}
                      placeholder="Ej: Guía #9942"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-cyan-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Proveedor:</label>
                  <input
                    type="text"
                    value={receptionSupplier}
                    onChange={(e) => setReceptionSupplier(e.target.value)}
                    placeholder="Ej: Danfoss, Vilter, Mycom..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-cyan-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const prod = products.find((p) => p.code === receptionProductCode);
                    if (!prod) return;
                    setProducts(products.map((p) => (p.id === prod.id ? { ...p, stock: p.stock + receptionQty } : p)));
                    setToastMessage(`✅ Recepción registrada: +${receptionQty}x ${prod.name}`);
                    setTimeout(() => setToastMessage(null), 4000);
                  }}
                  className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm shadow-md transition-all"
                >
                  Confirmar Ingreso a Bodega
                </button>
              </div>
            </div>
          )}

          {/* Bodega Subtab 3: Traspasos */}
          {bodegaSubTab === "traspasos" && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-cyan-600" />
                  Traspasos Internos (Bodega Central ↔ Oficina Matriz)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-[10px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Repuesto</th>
                        <th className="px-4 py-3">Origen → Destino</th>
                        <th className="px-4 py-3">Cantidad</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Solicitante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transfers.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">{t.date}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-slate-900">{t.productName}</span>
                            <span className="text-xs text-cyan-700 font-mono font-bold ml-2">({t.productCode})</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {t.from} → <strong className="text-cyan-400">{t.to}</strong>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-900">{t.quantity} un.</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400">
                              {t.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">{t.requestedBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Bodega Subtab 4: Etiquetas */}
          {bodegaSubTab === "etiquetas" && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-600" />
                Impresión de Etiquetas para Perchas y Gavetas
              </h3>
              <p className="text-xs text-slate-400">
                Selecciona el repuesto para imprimir la etiqueta adhesiva con código QR.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <select
                  value={selectedLabelProduct.id}
                  onChange={(e) => {
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) setSelectedLabelProduct(p);
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-cyan-600"
                >
                  {products.slice(0, 40).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} ({p.location} - Lote: {p.lot})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimir Etiqueta
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* ROLE 3: PANEL DE TÉCNICO (Vista Celular: Pantalla Táctil con Fotos y Cámara) */}
      {/* ========================================================================= */}
      {currentUser.role === "tecnico" && (
        <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
          {/* Mobile Technician Header Card */}
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200 rounded-2xl p-4 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                PANTALLA TÁCTIL CON FOTOS (RESTAURANTE)
              </span>
              <h3 className="text-base font-bold text-slate-900">Retiro Rápido para Servicios</h3>
              <p className="text-xs text-slate-500">Toca la foto o usa el escáner de cámara</p>
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 transition-all flex flex-col items-center gap-1"
            >
              <Camera className="w-6 h-6" />
              <span className="text-[10px] font-black uppercase">Escanear</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar repuesto (Danfoss, Vilter, Válvula...)"
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 shadow-xs"
            />
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full font-medium transition-all ${
                  selectedCategory === cat ? "bg-emerald-600 text-white font-bold shadow-xs" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Touch Card Grid with Big Photos (Exactly like restaurant order POS in Image 1) */}
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.slice(0, 16).map((prod) => {
              const imageUrl = getProductImage(prod);
              return (
                <div
                  key={prod.id}
                  onClick={() => handleSelectProduct(prod)}
                  className="bg-white border border-slate-200 hover:border-emerald-500 rounded-2xl p-3 cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-all shadow-xs hover:shadow-md"
                >
                  <div>
                    <div className="w-full h-28 bg-slate-50 rounded-xl overflow-hidden mb-2 relative border border-slate-100">
                      <img src={imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                      <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded shadow">
                        {prod.stock} un.
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-700">{prod.code}</span>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight mt-0.5">{prod.name}</h4>
                  </div>

                  <button className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs mt-3 flex items-center justify-center gap-1 shadow-xs">
                    <span>Retirar</span>
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* ROLE 4: PANEL DE MOSTRADOR / VENTAS (Con Fotos de Repuestos) */}
      {/* ========================================================================= */}
      {currentUser.role === "mostrador" && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase text-blue-700">MOSTRADOR & ATENCIÓN A CLIENTES</span>
              <h2 className="text-lg font-bold text-slate-900">Ventas Directas & Stock en Oficina Matriz</h2>
              <p className="text-xs text-slate-500">Toca el repuesto con foto para registrar la venta de mostrador.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedLocation("Oficina Matriz")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  selectedLocation === "Oficina Matriz" ? "bg-blue-600 text-white font-bold shadow-xs" : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                Oficina ({metrics.oficinaCount})
              </button>
              <button
                onClick={() => setSelectedLocation("Bodega Central")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  selectedLocation === "Bodega Central" ? "bg-blue-600 text-white font-bold shadow-xs" : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                Consultar Bodega ({metrics.bodegaCount})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.slice(0, 16).map((prod) => {
              const imageUrl = getProductImage(prod);
              return (
                <div
                  key={prod.id}
                  onClick={() => handleSelectProduct(prod)}
                  className="bg-white border border-slate-200 hover:border-blue-500 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between group shadow-xs hover:shadow-md"
                >
                  <div>
                    <div className="w-full h-36 bg-slate-50 rounded-xl overflow-hidden mb-3 border border-slate-100">
                      <img src={imageUrl} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono mb-1">
                      <span className="text-blue-700 font-bold font-mono">{prod.code}</span>
                      <span className="text-slate-500">{prod.lot}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900 line-clamp-2">{prod.name}</h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-slate-500">Stock: <strong className="text-slate-900">{prod.stock} un.</strong></span>
                    <span className="text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">Vender →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}


      {/* ========================================================================= */}
      {/* MODAL: SUBIR E IMPORTAR DOCUMENTO EXCEL DE INVENTARIO */}
      {/* ========================================================================= */}
      {isUploadExcelOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 text-slate-800">
            <button
              onClick={() => {
                setIsUploadExcelOpen(false);
                setExcelParsedProducts(null);
                setExcelError(null);
              }}
              className="absolute right-5 top-5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  IMPORTADOR INTELIGENTE DE EXCEL
                </span>
                <h3 className="text-xl font-bold text-slate-900">Subir Documento Excel de Inventario</h3>
                <p className="text-xs text-slate-500">
                  Extrae automáticamente los repuestos, códigos, descripciones, lotes, ubicaciones y existencias desde tu archivo <strong>.xlsx / .xls</strong>.
                </p>
              </div>
            </div>

            {/* Content Area */}
            <div className="space-y-4 mt-5">
              {/* Dropzone / Upload area */}
              <div
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                  isParsingExcel
                    ? "border-emerald-400 bg-emerald-50/50"
                    : "border-slate-300 hover:border-emerald-500 bg-slate-50/80 hover:bg-slate-50"
                }`}
              >
                <input
                  type="file"
                  id="excel-file-input"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleExcelFileUpload}
                />
                <label htmlFor="excel-file-input" className="cursor-pointer block space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-800 block">
                      Haz clic para seleccionar o arrastra tu archivo Excel
                    </span>
                    <span className="text-xs text-slate-500">
                      Compatible con <strong>INVENTARIO SIFF ACTUALIZADO.xlsx</strong> y formatos de inventario estándar (.xlsx, .xls)
                    </span>
                  </div>
                </label>

                {/* 1-Click Load Official File Button */}
                <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">O prueba de inmediato con:</span>
                  <button
                    type="button"
                    onClick={handleLoadDefaultExcel}
                    disabled={isParsingExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-all shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Cargar archivo local INVENTARIO SIFF ACTUALIZADO.xlsx</span>
                  </button>
                </div>
              </div>

              {/* Parsing Indicator */}
              {isParsingExcel && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                  <span>Leyendo hojas de cálculo, identificando columnas y extrayendo repuestos...</span>
                </div>
              )}

              {/* Error Message */}
              {excelError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-800 text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{excelError}</span>
                </div>
              )}

              {/* Parsed Summary & Preview */}
              {excelParsedProducts && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                      Resultados de la Extracción ({excelFileName || "Excel"}):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Total Repuestos</div>
                        <div className="text-xl font-black text-slate-900">{excelParsedProducts.length}</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-[10px] uppercase font-bold text-emerald-700">Bodega Central</div>
                        <div className="text-xl font-black text-emerald-700">
                          {excelParsedProducts.filter((p) => p.location === "Bodega Central").length}
                        </div>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-[10px] uppercase font-bold text-cyan-700">Oficina Matriz</div>
                        <div className="text-xl font-black text-cyan-700">
                          {excelParsedProducts.filter((p) => p.location === "Oficina Matriz").length}
                        </div>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                        <div className="text-[10px] uppercase font-bold text-slate-500">Unidades Físicas</div>
                        <div className="text-xl font-black text-slate-900">
                          {excelParsedProducts.reduce((acc, p) => acc + p.stock, 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview Table (First 5 items) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 uppercase flex items-center justify-between border-b border-slate-200">
                      <span>Vista previa de repuestos extraídos</span>
                      <span className="text-slate-500 font-normal">Primeros 5 registros</span>
                    </div>
                    <div className="overflow-x-auto max-h-48">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2">Código</th>
                            <th className="px-3 py-2">Descripción Técnica</th>
                            <th className="px-3 py-2">Lote</th>
                            <th className="px-3 py-2">Ubicación</th>
                            <th className="px-3 py-2">Stock</th>
                            <th className="px-3 py-2">Categoría</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {excelParsedProducts.slice(0, 5).map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 font-mono font-bold text-cyan-700">{p.code}</td>
                              <td className="px-3 py-1.5 font-medium text-slate-900 truncate max-w-[200px]">{p.name}</td>
                              <td className="px-3 py-1.5 font-mono text-slate-500">{p.lot}</td>
                              <td className="px-3 py-1.5 text-slate-600">{p.location}</td>
                              <td className="px-3 py-1.5 font-bold text-emerald-700">{p.stock} un.</td>
                              <td className="px-3 py-1.5 text-slate-500 text-[11px]">{p.category}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Import Actions */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end">
                    <button
                      type="button"
                      onClick={handleApplyExcelReplace}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Reemplazar Inventario Completo ({excelParsedProducts.length} repuestos)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyExcelMerge}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Combinar / Agregar a Inventario Actual</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsUploadExcelOpen(false);
                  setExcelParsedProducts(null);
                  setExcelError(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE MOVIMIENTO RÁPIDO CON FOTO ENCABEZADO */}
      {/* ========================================================================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 text-slate-800">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-5 top-5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full z-10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Photo Thumbnail */}
            <div className="flex items-start gap-4 pr-8">
              <img
                src={getProductImage(selectedProduct)}
                alt={selectedProduct.name}
                className="w-20 h-20 object-cover rounded-2xl border border-slate-200 shrink-0 shadow-xs"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                  {selectedProduct.code} • LOTE: {selectedProduct.lot}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug line-clamp-2">
                  {selectedProduct.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>{selectedProduct.location}</span>
                  <span>•</span>
                  <span className="text-emerald-600 font-bold">{selectedProduct.stock} en stock</span>
                </div>
              </div>
            </div>

            {/* Step 1: Type Selection */}
            <div className="mt-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Paso 1: Tipo de Movimiento
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMovementType("SALIDA")}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border ${
                    movementType === "SALIDA"
                      ? "bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25 ring-2 ring-rose-500/50"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  REGISTRAR SALIDA
                </button>

                <button
                  type="button"
                  onClick={() => setMovementType("ENTRADA")}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border ${
                    movementType === "ENTRADA"
                      ? "bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/25"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  REGISTRAR ENTRADA
                </button>
              </div>
            </div>

            {/* Step 2: Quantity Selector */}
            <div className="mt-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Paso 2: Cantidad a {movementType === "SALIDA" ? "Retirar" : "Ingresar"}
              </label>
              <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 text-xl font-black flex items-center justify-center active:scale-95 shadow-xs"
                >
                  -
                </button>
                <div className="flex-1 text-center">
                  <input
                    type="number"
                    min={1}
                    max={movementType === "SALIDA" ? selectedProduct.stock : 9999}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-transparent text-center text-3xl font-black text-slate-900 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">unidades</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (movementType === "SALIDA" && quantity >= selectedProduct.stock) return;
                    setQuantity(quantity + 1);
                  }}
                  className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-slate-800 hover:bg-slate-100 text-xl font-black flex items-center justify-center active:scale-95 shadow-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Step 3: Mandatory Reason */}
            <div className="mt-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Paso 3: Motivo Obligatorio *</span>
                <span className="text-cyan-700 font-semibold lowercase text-[11px]">(registrado a tu nombre)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  "Servicio Técnico a Cliente",
                  "Venta de Mostrador",
                  "Traspaso Bodega ↔ Oficina",
                  "Garantía / Repuesto Dañado",
                  "Ingreso / Devolución de Servicio"
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setSelectedReason(reason)}
                    className={`p-2 rounded-xl border text-left text-xs font-medium transition-all ${
                      selectedReason === reason
                        ? "bg-cyan-50 text-cyan-900 border-cyan-400 font-bold shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <input
                  type="text"
                  value={referenceDetail}
                  onChange={(e) => setReferenceDetail(e.target.value)}
                  placeholder="Detalla obligatoriamente: Nombre de Cliente / Planta / N° Factura..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/15"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMovement}
                className="flex-2 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                CONFIRMAR REGISTRO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SIMULADOR DE ESCÁNER DE CÁMARA */}
      {/* ========================================================================= */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-center text-slate-800">
            <button
              onClick={() => setIsScannerOpen(false)}
              className="absolute right-5 top-5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
              <Camera className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Escáner de Código QR y Barra</h3>
            <p className="text-xs text-slate-500 mt-1">
              En celulares activa la cámara trasera; en la PC detecta el lector láser USB.
            </p>

            <div className="mt-5 relative w-60 h-60 mx-auto bg-slate-950 rounded-2xl border-2 border-slate-300 overflow-hidden flex items-center justify-center shadow-inner">
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br"></div>
              <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse"></div>

              <div className="text-center p-4">
                <QrCode className="w-14 h-14 text-slate-700 mx-auto mb-2 animate-bounce" />
                <span className="text-[11px] text-slate-500 font-mono">Apuntando cámara al código...</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Prueba rápida para la reunión del Martes:
              </span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleApplySimulatedScan("AKS5898")}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-cyan-800 text-left flex items-center justify-between"
                >
                  <span>[Escanear] AKS5898 - Válvula Danfoss</span>
                  <Scan className="w-4 h-4 text-cyan-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySimulatedScan("BOM5369")}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-mono font-bold text-cyan-800 text-left flex items-center justify-between"
                >
                  <span>[Escanear] BOM5369 - Bomba Vilter</span>
                  <Scan className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREAR NUEVO REPUESTO CON URL/FOTO (Solo Gerencia) */}
      {/* ========================================================================= */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 text-slate-800">
            <button
              onClick={() => setIsAddProductOpen(false)}
              className="absolute right-5 top-5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              Crear Nuevo Repuesto con Imagen
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Agrega una foto o URL de internet para que los técnicos reconozcan la pieza en pantalla táctil.
            </p>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 mt-4">
              {/* Product Photo Box & URL Input */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center justify-between">
                  <span>Foto del Repuesto</span>
                  <span className="text-[10px] text-cyan-400 lowercase font-normal">(puedes pegar una URL de Google o usar predeterminada)</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 bg-white rounded-xl border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={newImageUrl.trim() ? newImageUrl : CATEGORY_IMAGES[newCategory]}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://ejemplo.com/foto-valvula.jpg"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                    />
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold transition-all shadow-xs">
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        <span>Subir foto desde dispositivo</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (ev.target?.result) {
                                  setNewImageUrl(ev.target.result as string);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {newImageUrl && (
                        <button
                          type="button"
                          onClick={() => setNewImageUrl("")}
                          className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold"
                        >
                          Restablecer predeterminada
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Código del Repuesto:</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="Ej: VAL9940"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono uppercase focus:bg-white focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Descripción Técnica:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej: VÁLVULA DE EXPANSIÓN DANFOSS T2"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 uppercase focus:bg-white focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoría:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                  >
                    <option value="Válvulas & Controles">Válvulas & Controles</option>
                    <option value="Bombas, Aceites & Filtros">Bombas, Aceites & Filtros</option>
                    <option value="Mecánica & Compresores">Mecánica & Compresores</option>
                    <option value="Sellos, Empaques & O-Rings">Sellos, Empaques & O-Rings</option>
                    <option value="Acoples & Bridas">Acoples & Bridas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Marca:</label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="Danfoss, Bitzer..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ubicación:</label>
                  <select
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500"
                  >
                    <option value="Bodega Central">Bodega Central</option>
                    <option value="Oficina Matriz">Oficina Matriz</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Stock Inicial:</label>
                  <input
                    type="number"
                    min={0}
                    value={newStock}
                    onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 text-center font-bold focus:bg-white focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Lote:</label>
                  <input
                    type="text"
                    value={newLot}
                    onChange={(e) => setNewLot(e.target.value)}
                    placeholder="LT035"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:bg-white focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow mt-2"
              >
                Guardar Repuesto con Foto
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DESGLOSE ANALÍTICO DE UNIDADES FÍSICAS EN STOCK (KPI 2) */}
      {/* ========================================================================= */}
      {isStockBreakdownOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 text-slate-800">
            <button
              onClick={() => setIsStockBreakdownOpen(false)}
              className="absolute right-5 top-5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  ANALÍTICA EN TIEMPO REAL
                </span>
                <h3 className="text-xl font-bold text-slate-900">Balance Consolidado de Unidades Físicas</h3>
                <p className="text-xs text-slate-400">
                  Distribución exacta de las <strong>{metrics.totalStockUnits.toLocaleString()} existencias físicas</strong> registradas.
                </p>
              </div>
            </div>

            {/* Top 3 Location Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="text-[11px] text-slate-500 uppercase font-semibold">Total Consolidado</div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {metrics.totalStockUnits.toLocaleString()} <span className="text-xs font-normal text-slate-400">un.</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">357 repuestos distintos</div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="text-[11px] text-emerald-700 uppercase font-semibold flex items-center justify-between">
                  <span>Bodega Central</span>
                  <Warehouse className="w-3.5 h-3.5" />
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {stockBreakdown.bodegaUnits.toLocaleString()} <span className="text-xs font-normal text-slate-400">un.</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {Math.round((stockBreakdown.bodegaUnits / metrics.totalStockUnits) * 100)}% del volumen total
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="text-[11px] text-cyan-700 uppercase font-semibold flex items-center justify-between">
                  <span>Oficina Matriz</span>
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-2xl font-black text-cyan-400 mt-1">
                  {stockBreakdown.oficinaUnits.toLocaleString()} <span className="text-xs font-normal text-slate-400">un.</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {Math.round((stockBreakdown.oficinaUnits / metrics.totalStockUnits) * 100)}% del volumen total
                </div>
              </div>
            </div>

            {/* Distribution by Category */}
            <div className="mt-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase block tracking-wider">
                Distribución Física por Categorías Técnicas
              </span>
              <div className="space-y-2.5">
                {stockBreakdown.categoriesStats.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-700 font-medium">{cat.name} ({cat.count} ítems)</span>
                      <span className="font-mono font-bold text-slate-900">
                        {cat.units.toLocaleString()} un. <span className="text-emerald-400 text-[10px]">({cat.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 high stock items */}
            <div className="mt-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase block tracking-wider mb-2">
                Top 5 Repuestos con Mayor Volumen de Stock
              </span>
              <div className="divide-y divide-slate-200">
                {stockBreakdown.topProducts.map((p) => (
                  <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="font-mono text-cyan-400 font-bold mr-1.5">{p.code}</span>
                      <span className="text-slate-900 truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">({p.location})</span>
                    </div>
                    <span className="font-bold text-emerald-400 font-mono shrink-0">{p.stock} un.</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t border-slate-200 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedLocation("Bodega Central");
                  setIsStockBreakdownOpen(false);
                  setGerenciaSubTab("inventario");
                  setToastMessage("Filtrando: Solo Bodega Central");
                  setTimeout(() => setToastMessage(null), 2500);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Filtrar Bodega Central
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedLocation("Oficina Matriz");
                  setIsStockBreakdownOpen(false);
                  setGerenciaSubTab("inventario");
                  setToastMessage("Filtrando: Solo Oficina Matriz");
                  setTimeout(() => setToastMessage(null), 2500);
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Filtrar Oficina Matriz
              </button>
              <button
                type="button"
                onClick={() => setIsStockBreakdownOpen(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
              >
                Cerrar Balance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRASPASOS EN TRÁNSITO ENTRE BODEGAS (KPI 4) */}
      {/* ========================================================================= */}
      {isTransfersModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 text-slate-800">
            <button
              onClick={() => setIsTransfersModalOpen(false)}
              className="absolute right-5 top-5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  LOGÍSTICA INTERNA
                </span>
                <h3 className="text-xl font-bold text-slate-900">Traspasos entre Bodega Central y Oficina Matriz</h3>
                <p className="text-xs text-slate-400">
                  Control de envíos de repuestos para evitar pérdidas durante el traslado entre sucursales.
                </p>
              </div>
            </div>

            {/* List of current transfers */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Guías de Traspaso Activas ({transfers.length})
                </span>
                <span className="text-[11px] text-cyan-400 font-mono">
                  {transfers.filter((t) => t.status === "EN TRÁNSITO").length} en camino
                </span>
              </div>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {transfers.map((t) => (
                  <div
                    key={t.id}
                    className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-cyan-700 border border-slate-200">
                          {t.id}
                        </span>
                        <span className="text-[11px] text-slate-400">{t.date}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.status === "EN TRÁNSITO"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-900">
                        {t.quantity}x {t.productName} <span className="text-cyan-400 font-mono">({t.productCode})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{t.from}</span>
                        <span className="text-cyan-400">→</span>
                        <strong className="text-slate-900">{t.to}</strong>
                        <span className="text-slate-500">• Solicitado por: {t.requestedBy}</span>
                      </div>
                    </div>

                    {t.status === "EN TRÁNSITO" && (
                      <button
                        type="button"
                        onClick={() => handleConfirmTransferReceipt(t.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirmar Llegada</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick New Transfer Creator Form */}
            <form onSubmit={handleCreateNewTransfer} className="mt-5 bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
                + Despachar Nuevo Traspaso entre Almacenes
              </span>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Repuesto a enviar:</label>
                  <select
                    value={newTransferProductCode}
                    onChange={(e) => setNewTransferProductCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-cyan-600"
                  >
                    {products.slice(0, 35).map((p) => (
                      <option key={p.id} value={p.code}>
                        {p.code} - {p.name} (Stock: {p.stock} un. en {p.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Origen:</label>
                    <select
                      value={newTransferFrom}
                      onChange={(e) => {
                        const val = e.target.value as "Bodega Central" | "Oficina Matriz";
                        setNewTransferFrom(val);
                        setNewTransferTo(val === "Bodega Central" ? "Oficina Matriz" : "Bodega Central");
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-cyan-600"
                    >
                      <option value="Bodega Central">Bodega Central</option>
                      <option value="Oficina Matriz">Oficina Matriz</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Destino:</label>
                    <select
                      value={newTransferTo}
                      onChange={(e) => setNewTransferTo(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-cyan-600"
                    >
                      <option value="Oficina Matriz">Oficina Matriz</option>
                      <option value="Bodega Central">Bodega Central</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Cantidad:</label>
                    <input
                      type="number"
                      min={1}
                      value={newTransferQty}
                      onChange={(e) => setNewTransferQty(parseInt(e.target.value) || 1)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 text-center font-bold focus:border-cyan-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold text-xs shadow transition-all active:scale-95"
                >
                  Generar Guía y Enviar Repuesto en Tránsito
                </button>
              </div>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTransfersModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MODIFICAR / EDITAR REPUESTO Y FOTO */}
      {/* ========================================================================= */}
      {isEditProductOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-3xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 text-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsEditProductOpen(false);
                setEditingProduct(null);
              }}
              className="absolute right-5 top-5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-amber-500" />
              Editar Repuesto & Fotografía
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Modifica la descripción técnica, foto (quitar o cambiar), lote, ubicación, stock o categoría del repuesto.
            </p>

            <form onSubmit={handleSaveEditProduct} className="space-y-4 mt-5">
              {/* Product Photo Box: Preview, Remove, Upload, URL */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    Foto del Repuesto
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {editImageUrl === "NO_IMAGE"
                      ? "❌ Foto eliminada"
                      : editImageUrl.trim()
                      ? "📸 Foto personalizada activa"
                      : "Sugerida por categoría"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-28 h-28 bg-white rounded-2xl border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-xs relative">
                    {editImageUrl === "NO_IMAGE" ? (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                        <span className="text-[10px] font-bold text-rose-500 mt-1">Sin imagen</span>
                      </div>
                    ) : editImageUrl.trim() ? (
                      <img src={editImageUrl} alt="Vista previa" className="w-full h-full object-cover" />
                    ) : (
                      <img
                        src={CATEGORY_IMAGES[editCategory] || CATEGORY_IMAGES["Válvulas & Controles"]}
                        alt="Sugerida"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    {/* Action buttons for Image */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Button: Subir foto desde dispositivo */}
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold shadow-xs active:scale-95 transition-all">
                        <Camera className="w-3.5 h-3.5 text-slate-600" />
                        <span>Subir Foto (Cámara / Archivo)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                if (ev.target?.result) {
                                  setEditImageUrl(ev.target.result as string);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>

                      {/* Button: Quitar imagen */}
                      {editImageUrl !== "NO_IMAGE" && (
                        <button
                          type="button"
                          onClick={() => setEditImageUrl("NO_IMAGE")}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all active:scale-95"
                          title="Quitar la imagen de este producto"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Quitar Imagen</span>
                        </button>
                      )}

                      {/* Button: Restablecer sugerida */}
                      {editImageUrl !== "" && (
                        <button
                          type="button"
                          onClick={() => setEditImageUrl("")}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-slate-600 hover:text-slate-900 font-semibold"
                        >
                          <span>Foto por defecto</span>
                        </button>
                      )}
                    </div>

                    {/* URL Input */}
                    <div className="relative">
                      <input
                        type="url"
                        value={editImageUrl === "NO_IMAGE" ? "" : editImageUrl}
                        onChange={(e) => setEditImageUrl(e.target.value)}
                        placeholder="O pega una URL directa de imagen (https://...)"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Description / Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Descripción Técnica / Nombre del Repuesto *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Ej: ACOPLE DE MATRIMONIO 9H"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 shadow-xs"
                />
              </div>

              {/* Code and Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Código del Repuesto *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    placeholder="Ej: ACO3818"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-amber-900 uppercase focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Marca / Fabricante
                  </label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    placeholder="Ej: Danfoss, Vilter, Bitzer"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Category and Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Categoría
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                  >
                    <option value="Válvulas & Controles">Válvulas & Controles</option>
                    <option value="Bombas, Aceites & Filtros">Bombas, Aceites & Filtros</option>
                    <option value="Mecánica & Compresores">Mecánica & Compresores</option>
                    <option value="Sellos, Empaques & O-Rings">Sellos, Empaques & O-Rings</option>
                    <option value="Acoples & Bridas">Acoples & Bridas</option>
                    <option value="Repuestos Eléctricos & Varios">Repuestos Eléctricos & Varios</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ubicación Física
                  </label>
                  <select
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value as "Bodega Central" | "Oficina Matriz")}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                  >
                    <option value="Bodega Central">Bodega Central</option>
                    <option value="Oficina Matriz">Oficina Matriz</option>
                  </select>
                </div>
              </div>

              {/* Stock and Lot */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Stock Actual
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editStock}
                    onChange={(e) => setEditStock(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(Number(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Lote
                  </label>
                  <input
                    type="text"
                    value={editLot}
                    onChange={(e) => setEditLot(e.target.value)}
                    placeholder="LT001"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleDeleteProduct(editingProduct.id)}
                  className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Eliminar del Catálogo</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditProductOpen(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 text-xs font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMPROBANTE OFICIAL / VALE DE ENTREGA KARDEX */}
      {/* ========================================================================= */}
      {selectedVoucherMovement && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative my-6 text-slate-900">
            <button
              type="button"
              onClick={() => setSelectedVoucherMovement(null)}
              className="absolute right-5 top-5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Voucher Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm">
                    SIFF
                  </div>
                  <span className="font-black text-base text-slate-900">SIFF REFRIGERACIÓN INDUSTRIAL</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">RUC: 0992384756001 • Vía Daule Km 11.5, Guayaquil, Ecuador</p>
                <p className="text-[10px] text-slate-500">Telf: (+593) 04-288-9944 • Correo: operaciones@siff.com.ec</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">COMPROBANTE KARDEX</span>
                <span className="font-mono text-sm font-black text-cyan-800">{selectedVoucherMovement.folio}</span>
              </div>
            </div>

            {/* Date and Status Bar */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-2 gap-2 text-xs mb-4">
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">FECHA Y HORA:</span>
                <span className="font-mono font-bold text-slate-800">{selectedVoucherMovement.fullDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-semibold">TIPO DE OPERACIÓN:</span>
                <span className={`font-bold ${selectedVoucherMovement.type === "SALIDA" ? "text-rose-600" : "text-emerald-600"}`}>
                  {selectedVoucherMovement.type} FÍSICA ({selectedVoucherMovement.quantity} un.)
                </span>
              </div>
            </div>

            {/* Part details */}
            <div className="space-y-3 text-xs mb-4">
              <div className="border border-slate-200 rounded-xl p-3 bg-white">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">REPUESTO DESPACHADO / RECIBIDO</span>
                <h4 className="text-sm font-black text-slate-900">{selectedVoucherMovement.productName}</h4>
                <div className="grid grid-cols-3 gap-2 mt-2 font-mono text-[11px] text-slate-600">
                  <div><strong>CÓDIGO:</strong> {selectedVoucherMovement.productCode}</div>
                  <div><strong>LOTE:</strong> {selectedVoucherMovement.lot}</div>
                  <div><strong>UBICACIÓN:</strong> {selectedVoucherMovement.location}</div>
                </div>
              </div>

              {/* Balances */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Stock Previo</span>
                  <strong className="text-slate-800">{selectedVoucherMovement.previousStock} un.</strong>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Movimiento</span>
                  <strong className={selectedVoucherMovement.type === "SALIDA" ? "text-rose-600" : "text-emerald-600"}>
                    {selectedVoucherMovement.type === "SALIDA" ? `-${selectedVoucherMovement.quantity}` : `+${selectedVoucherMovement.quantity}`} un.
                  </strong>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block">Saldo Actual</span>
                  <strong className="text-slate-900">{selectedVoucherMovement.resultingStock} un.</strong>
                </div>
              </div>

              {/* Motivation */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">MOTIVO OBLIGATORIO:</span>
                  <span className="font-semibold text-slate-800">{selectedVoucherMovement.reason}</span>
                </div>
                {selectedVoucherMovement.referenceDetail && (
                  <div className="mt-1 text-slate-600 italic">
                    Referencia: "{selectedVoucherMovement.referenceDetail}"
                  </div>
                )}
                {selectedVoucherMovement.documentRef && (
                  <div className="mt-1 text-slate-500 text-[11px]">
                    Soporte: {selectedVoucherMovement.documentRef}
                  </div>
                )}
              </div>
            </div>

            {/* Signature blocks */}
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-200 mt-6 text-center text-xs">
              <div>
                <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
                <span className="font-bold text-slate-900 block">{selectedVoucherMovement.technician}</span>
                <span className="text-[10px] text-slate-500 block">{selectedVoucherMovement.technicianRole || "Responsable"}</span>
                <span className="text-[9px] text-slate-400">Entregado / Autorizado Conforme</span>
              </div>
              <div>
                <div className="h-12 border-b border-dashed border-slate-400 mb-2"></div>
                <span className="font-bold text-slate-900 block">Firma del Solicitante / Cliente</span>
                <span className="text-[10px] text-slate-500 block">Recepción en Campo o Mostrador</span>
                <span className="text-[9px] text-slate-400">Recibido Conforme</span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-2 print:hidden">
              <span className="text-[11px] font-mono text-slate-400">Hash: SIFF-SEC-{selectedVoucherMovement.id}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVoucherMovement(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md flex items-center gap-1.5 active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Comprobante</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
