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
  Smartphone,
  Laptop,
  Clock,
  User,
  Layers,
  Wrench,
  ShoppingCart,
  ArrowRightLeft,
  ShieldAlert,
  PlusCircle,
  X,
  Camera,
  Download,
  Share2,
  Calendar,
  Sparkles,
  Check,
  Flame,
  Info
} from "lucide-react";
import { SIFF_PRODUCTS_DATA, SiffProduct } from "@/lib/siff-products";

interface MovementRecord {
  id: string;
  timestamp: string;
  productCode: string;
  productName: string;
  location: string;
  type: "SALIDA" | "ENTRADA";
  quantity: number;
  lot: string;
  reason: string;
  referenceDetail?: string;
  technician: string;
}

const INITIAL_MOVEMENTS: MovementRecord[] = [
  {
    id: "mov-1",
    timestamp: "Hoy, 10:42 AM",
    productCode: "AKS5898",
    productName: "AKS - 38 DANFOSS",
    location: "Bodega Central",
    type: "SALIDA",
    quantity: 1,
    lot: "LT032",
    reason: "Servicio Técnico a Cliente",
    referenceDetail: "Pesquera Mar del Sur - Mantenimiento Compresor 2",
    technician: "Carlos Mendoza (Técnico)"
  },
  {
    id: "mov-2",
    timestamp: "Hoy, 09:15 AM",
    productCode: "BOM5369",
    productName: "BOMBA DE ACEITE ORIGINAL VILTER",
    location: "Bodega Central",
    type: "SALIDA",
    quantity: 1,
    lot: "LT029",
    reason: "Venta Mostrador",
    referenceDetail: "Factura N° 001-002-4521",
    technician: "Wilson Caicedo (Bodega)"
  },
  {
    id: "mov-3",
    timestamp: "Ayer, 04:30 PM",
    productCode: "ACE5123",
    productName: "ACEITE BITZER 10 LTS",
    location: "Oficina Matriz",
    type: "ENTRADA",
    quantity: 5,
    lot: "LT028",
    reason: "Recepción de Proveedor",
    referenceDetail: "Guía Remisión Proveedor Danfoss/Bitzer #8841",
    technician: "Administración SIFF"
  },
  {
    id: "mov-4",
    timestamp: "Ayer, 02:10 PM",
    productCode: "SEL6176",
    productName: "SELLO MECÁNICO 440 KT508",
    location: "Bodega Central",
    type: "SALIDA",
    quantity: 2,
    lot: "LT003",
    reason: "Traspaso Interno",
    referenceDetail: "Envío a Oficina Matriz para exhibición",
    technician: "Wilson Caicedo (Bodega)"
  }
];

const TECHNICIANS = [
  "Carlos Mendoza (Técnico de Campo)",
  "Juan Carlos Pérez (Técnico Industrial)",
  "Wilson Caicedo (Jefe de Bodega)",
  "Roberto Zambrano (Técnico Refrigeración)",
  "Administración / Oficina"
];

const REASONS = [
  {
    id: "servicio",
    label: "Servicio Técnico a Cliente",
    icon: Wrench,
    color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    requiresDetail: true,
    placeholder: "Ej: Nombre del cliente, planta o N° orden de servicio"
  },
  {
    id: "venta",
    label: "Venta de Mostrador",
    icon: ShoppingCart,
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    requiresDetail: true,
    placeholder: "Ej: N° de Factura, Nota de Venta o Cliente"
  },
  {
    id: "traspaso",
    label: "Traspaso Bodega ↔ Oficina",
    icon: ArrowRightLeft,
    color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    requiresDetail: false
  },
  {
    id: "garantia",
    label: "Garantía / Repuesto Dañado",
    icon: ShieldAlert,
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    requiresDetail: true,
    placeholder: "Ej: Motivo de falla o repuesto defectuoso"
  },
  {
    id: "compra",
    label: "Ingreso / Compra a Proveedor",
    icon: PlusCircle,
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    requiresDetail: true,
    placeholder: "Ej: N° Guía de Remisión o Proveedor"
  }
];

export default function SiffProposalDemo() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"kiosco" | "gerencia" | "etiquetas" | "propuesta">("kiosco");

  // Global inventory state (seeded from actual 357 products)
  const [products, setProducts] = useState<SiffProduct[]>(SIFF_PRODUCTS_DATA);
  const [movements, setMovements] = useState<MovementRecord[]>(INITIAL_MOVEMENTS);

  // Filters for Kiosco
  const [selectedLocation, setSelectedLocation] = useState<"TODAS" | "Bodega Central" | "Oficina Matriz">("Bodega Central");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal Movement State
  const [selectedProduct, setSelectedProduct] = useState<SiffProduct | null>(null);
  const [movementType, setMovementType] = useState<"SALIDA" | "ENTRADA">("SALIDA");
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedReason, setSelectedReason] = useState<string>("Servicio Técnico a Cliente");
  const [referenceDetail, setReferenceDetail] = useState<string>("");
  const [selectedTechnician, setSelectedTechnician] = useState<string>(TECHNICIANS[0]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Scanner Simulator Modal
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [simulatedScanCode, setSimulatedScanCode] = useState<string>("");

  // Label Printing state
  const [selectedLabelProduct, setSelectedLabelProduct] = useState<SiffProduct>(products[0]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ["TODAS", ...Array.from(set)];
  }, [products]);

  // Filtered products for touch screen
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchLocation = selectedLocation === "TODAS" || p.location === selectedLocation;
      const matchCategory = selectedCategory === "TODAS" || p.category === selectedCategory;
      const matchSearch =
        searchQuery === "" ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.lot.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLocation && matchCategory && matchSearch;
    });
  }, [products, selectedLocation, selectedCategory, searchQuery]);

  // Dashboard Metrics
  const metrics = useMemo(() => {
    const totalItems = products.length;
    const bodegaCount = products.filter((p) => p.location === "Bodega Central").length;
    const oficinaCount = products.filter((p) => p.location === "Oficina Matriz").length;
    const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
    const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);
    return { totalItems, bodegaCount, oficinaCount, lowStockCount, totalStockUnits };
  }, [products]);

  // Handle movement submission
  const handleConfirmMovement = () => {
    if (!selectedProduct) return;

    if (quantity <= 0) {
      alert("La cantidad debe ser mayor a 0");
      return;
    }

    if (movementType === "SALIDA" && quantity > selectedProduct.stock) {
      alert(`Stock insuficiente. Solo hay ${selectedProduct.stock} unidades disponibles.`);
      return;
    }

    const currentReasonObj = REASONS.find((r) => r.label === selectedReason);
    if (currentReasonObj?.requiresDetail && !referenceDetail.trim()) {
      alert("Por favor indica el detalle obligatorio del motivo (Cliente, Factura o N° de Orden).");
      return;
    }

    // Update stock
    const newStock = movementType === "SALIDA" ? selectedProduct.stock - quantity : selectedProduct.stock + quantity;

    setProducts((prev) =>
      prev.map((item) => (item.id === selectedProduct.id ? { ...item, stock: newStock } : item))
    );

    // Add to history
    const newMovement: MovementRecord = {
      id: "mov-" + Date.now(),
      timestamp: "Hace unos segundos",
      productCode: selectedProduct.code,
      productName: selectedProduct.name,
      location: selectedProduct.location,
      type: movementType,
      quantity,
      lot: selectedProduct.lot,
      reason: selectedReason,
      referenceDetail: referenceDetail.trim() ? referenceDetail : undefined,
      technician: selectedTechnician
    };

    setMovements((prev) => [newMovement, ...prev]);

    // Show toast
    setToastMessage(
      `✅ ${movementType === "SALIDA" ? "Salida" : "Entrada"} registrada: ${quantity}x ${selectedProduct.code} - ${selectedProduct.name} (${selectedProduct.location})`
    );
    setTimeout(() => setToastMessage(null), 5000);

    // Close modal
    setSelectedProduct(null);
    setQuantity(1);
    setReferenceDetail("");
  };

  // Open modal for product
  const handleSelectProduct = (product: SiffProduct) => {
    setSelectedProduct(product);
    setMovementType("SALIDA");
    setQuantity(1);
    setSelectedReason("Servicio Técnico a Cliente");
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Banner & Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl backdrop-blur-md bg-slate-900/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo & Subtitle */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black tracking-wider text-xl">
                SIFF
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                    SIFF <span className="text-cyan-400 font-light">Inventario & Salidas</span>
                  </h1>
                  <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
                    357 Repuestos Reales Cargados
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Refrigeración Industrial • Bodega Central & Oficina Matriz
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center bg-slate-950/70 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab("kiosco")}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === "kiosco"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden md:inline">Modo Rápido</span> Técnicos
              </button>

              <button
                onClick={() => setActiveTab("gerencia")}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === "gerencia"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span className="hidden md:inline">Panel</span> Gerencia
              </button>

              <button
                onClick={() => setActiveTab("etiquetas")}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === "etiquetas"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden md:inline">Generar</span> Etiquetas
              </button>

              <button
                onClick={() => setActiveTab("propuesta")}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  activeTab === "propuesta"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/25"
                    : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                }`}
              >
                <FileText className="w-4 h-4" />
                Propuesta Martes
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 border-2 border-emerald-500/60 rounded-xl p-4 shadow-2xl shadow-emerald-500/20 text-emerald-200 flex items-start gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{toastMessage}</p>
            <p className="text-xs text-slate-400 mt-0.5">El stock y Kardex fueron actualizados al instante.</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* ========================================================================= */}
        {/* TAB 1: MODO RÁPIDO TÉCNICOS (Pantalla Restaurante / Táctil + Escáner) */}
        {/* ========================================================================= */}
        {activeTab === "kiosco" && (
          <div className="space-y-6">
            {/* Top Control Bar: Location & Quick Scanner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Location Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-cyan-400" />
                  Ubicación:
                </span>
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs sm:text-sm font-semibold">
                  <button
                    onClick={() => setSelectedLocation("Bodega Central")}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      selectedLocation === "Bodega Central"
                        ? "bg-cyan-500 text-slate-950 font-bold shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Bodega Central ({metrics.bodegaCount})
                  </button>
                  <button
                    onClick={() => setSelectedLocation("Oficina Matriz")}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      selectedLocation === "Oficina Matriz"
                        ? "bg-cyan-500 text-slate-950 font-bold shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Oficina Matriz ({metrics.oficinaCount})
                  </button>
                  <button
                    onClick={() => setSelectedLocation("TODAS")}
                    className={`px-2.5 py-1.5 rounded-lg transition-all ${
                      selectedLocation === "TODAS"
                        ? "bg-cyan-500 text-slate-950 font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Ambas ({metrics.totalItems})
                  </button>
                </div>
              </div>

              {/* Action: Open Camera Scanner */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsScannerOpen(true)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Scan className="w-5 h-5" />
                  <span>Escanear QR / Barra</span>
                </button>
              </div>
            </div>

            {/* Search and Category Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por código (ej: AKS5898, BOM5369), nombre, lote o marca (Danfoss, Vilter, Bitzer)..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3.5 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedCategory === cat
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-sm"
                        : "bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Instruction banner for touch */}
            <div className="bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900 border border-cyan-800/40 rounded-xl p-3 sm:p-4 flex items-center justify-between text-xs sm:text-sm text-cyan-200">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  <strong>Pantalla táctil de retiro rápido:</strong> Toca cualquier repuesto para registrar la salida en 3 segundos o usa el escáner de cámara.
                </span>
              </div>
              <span className="text-slate-400 hidden lg:inline">
                Mostrando {filteredProducts.length} repuestos
              </span>
            </div>

            {/* GRID OF TOUCH CARDS (Restaurant POS Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.slice(0, 32).map((product) => {
                const isLow = product.stock <= product.minStock;
                return (
                  <div
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    className="group relative bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/10 active:scale-[0.98] flex flex-col justify-between"
                  >
                    {/* Top card bar: Brand & Lot */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                          {product.brand}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 border border-slate-800">
                          {product.lot}
                        </span>
                      </div>

                      {/* Code & Name */}
                      <div className="mb-3">
                        <p className="text-xs font-mono font-bold text-cyan-400">{product.code}</p>
                        <h3 className="text-sm font-semibold text-white group-hover:text-cyan-200 transition-colors line-clamp-2 leading-snug mt-0.5">
                          {product.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1">{product.category}</p>
                      </div>
                    </div>

                    {/* Stock and Quick Action Bar */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            isLow ? "bg-amber-500 animate-pulse" : "bg-emerald-400"
                          }`}
                        />
                        <div className="leading-none">
                          <span className={`text-base font-black ${isLow ? "text-amber-400" : "text-white"}`}>
                            {product.stock}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">en stock</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 bg-cyan-500/10 group-hover:bg-cyan-500 group-hover:text-slate-950 px-2.5 py-1 rounded-lg transition-all">
                        <span>Retirar</span>
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* Low stock tag */}
                    {isLow && (
                      <div className="absolute -top-2 -right-2 bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        Crítico
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredProducts.length > 32 && (
              <div className="text-center py-4 text-xs text-slate-500">
                Mostrando 32 de {filteredProducts.length} productos coincidentes. Usa el buscador para filtrar repuestos específicos.
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PANEL DE CONTROL Y KARDEX (Gerencia & Auditoría) */}
        {/* ========================================================================= */}
        {activeTab === "gerencia" && (
          <div className="space-y-6">
            {/* KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>TOTAL REPUESTOS SIFF</span>
                  <Package className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-white">{metrics.totalItems}</div>
                <p className="text-xs text-slate-500 mt-1">Repuestos activos catalogados</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>EN BODEGA CENTRAL</span>
                  <Warehouse className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-400">{metrics.bodegaCount}</div>
                <p className="text-xs text-slate-500 mt-1">Ítems disponibles en perchas</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>EN OFICINA MATRIZ</span>
                  <Building2 className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-purple-400">{metrics.oficinaCount}</div>
                <p className="text-xs text-slate-500 mt-1">Ítems en vitrinas y almacén</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                  <span>STOCK CRÍTICO (&le; 2)</span>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-400">{metrics.lowStockCount}</div>
                <p className="text-xs text-slate-500 mt-1">Requieren reposición urgente</p>
              </div>
            </div>

            {/* KARDEX / AUDIT TRAIL OF MOVEMENTS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    Kardex & Auditoría en Tiempo Real
                  </h2>
                  <p className="text-xs text-slate-400">
                    Registro inalterable con motivo obligatorio, técnico responsable y fecha/hora.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">
                    {movements.length} movimientos registrados
                  </span>
                </div>
              </div>

              {/* Movement table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Fecha / Hora</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Repuesto & Código</th>
                      <th className="px-4 py-3">Ubicación</th>
                      <th className="px-4 py-3">Motivo Obligatorio</th>
                      <th className="px-4 py-3">Técnico / Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                    {movements.map((mov) => {
                      const isExit = mov.type === "SALIDA";
                      return (
                        <tr key={mov.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap font-mono text-xs">
                            {mov.timestamp}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                isExit
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              }`}
                            >
                              {isExit ? (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                              {mov.type}: {mov.quantity} un.
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-white">{mov.productName}</div>
                            <div className="text-xs font-mono text-cyan-400 flex items-center gap-2">
                              <span>{mov.productCode}</span>
                              <span className="text-slate-500">• Lote {mov.lot}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                            {mov.location}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-200">{mov.reason}</div>
                            {mov.referenceDetail && (
                              <div className="text-xs text-slate-400 italic mt-0.5">
                                "{mov.referenceDetail}"
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-300 whitespace-nowrap flex items-center gap-1.5 pt-4">
                            <User className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{mov.technician}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: GENERADOR E IMPRESOR DE ETIQUETAS QR */}
        {/* ========================================================================= */}
        {activeTab === "etiquetas" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="max-w-3xl">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <QrCode className="w-6 h-6 text-cyan-400" />
                  Generador de Etiquetas con Código QR / Barras para Perchas
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Genera etiquetas adhesivas para pegar en cada gaveta, caja o percha de Bodega y Oficina. Al disparar con la pistola lectora o con la cámara del celular, el sistema identifica el repuesto al instante.
                </p>
              </div>

              {/* Selector de repuesto para previsualizar etiqueta */}
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                    Selecciona un repuesto para generar su etiqueta:
                  </label>
                  <select
                    value={selectedLabelProduct.id}
                    onChange={(e) => {
                      const p = products.find((x) => x.id === e.target.value);
                      if (p) setSelectedLabelProduct(p);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {products.slice(0, 50).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name} ({p.location} - Lote: {p.lot})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:self-end">
                  <button
                    onClick={() => window.print()}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Etiquetas
                  </button>
                </div>
              </div>

              {/* PREVIEW OF PRINTABLE LABEL */}
              <div className="mt-8 pt-8 border-t border-slate-800">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Vista Previa de la Etiqueta Adhesiva (Tamaño Estándar Gavetero / Percha)
                </h3>

                <div className="flex flex-wrap gap-6 items-start">
                  {/* Single Label Card */}
                  <div className="w-80 bg-white text-slate-900 p-4 rounded-xl shadow-2xl border-2 border-slate-300 font-sans relative overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 bg-slate-900 text-white rounded font-black text-xs flex items-center justify-center">
                          S
                        </div>
                        <span className="font-black text-xs tracking-wider">SIFF REFRIGERACIÓN</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                        {selectedLabelProduct.location === "Bodega Central" ? "BODEGA" : "OFICINA"}
                      </span>
                    </div>

                    {/* QR Code and Code info */}
                    <div className="flex items-center gap-3">
                      {/* SVG Simulated QR */}
                      <div className="w-24 h-24 bg-slate-100 border border-slate-300 rounded p-1 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v4h-4v-4zm-4 4h4v2h-4v-2zm-4-4h2v4h-2v-4zm6-2h2v2h-2v-2zm2-2h2v2h-2v-2zm-4 0h2v2h-2v-2zm-6 0h2v2h-2v-2z" />
                        </svg>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-xl font-black font-mono tracking-tight text-slate-900 leading-none">
                          {selectedLabelProduct.code}
                        </div>
                        <div className="text-[11px] font-bold text-slate-600 mt-1">
                          LOTE: <span className="font-mono text-slate-900">{selectedLabelProduct.lot}</span>
                        </div>
                        <div className="text-[10px] font-semibold text-cyan-800 uppercase mt-0.5">
                          {selectedLabelProduct.brand}
                        </div>
                      </div>
                    </div>

                    {/* Part Name */}
                    <div className="mt-3 pt-2 border-t border-slate-200">
                      <p className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {selectedLabelProduct.name}
                      </p>
                    </div>

                    {/* Barcode graphic footer */}
                    <div className="mt-2 text-center">
                      <div className="h-6 flex items-center justify-center gap-0.5 overflow-hidden">
                        {[4, 2, 6, 1, 3, 5, 2, 7, 3, 1, 4, 2, 6, 3, 5, 2, 4, 6, 1, 3, 5, 2].map((w, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-900 h-full"
                            style={{ width: `${w * 1.5}px` }}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] font-mono text-slate-500 tracking-widest">
                        *{selectedLabelProduct.code}*
                      </span>
                    </div>
                  </div>

                  {/* Advantages list */}
                  <div className="flex-1 bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                    <h4 className="text-sm font-bold text-cyan-400">
                      ¿Por qué esto resuelve el dolor de los técnicos apurados?
                    </h4>
                    <ul className="text-xs text-slate-300 space-y-2">
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Escaneo al paso:</strong> Al retirar el repuesto de la percha, apuntan la cámara del celular al código QR de la etiqueta y el sistema abre la pantalla de retiro automáticamente.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Cero confusión entre repuestos similares:</strong> Las válvulas Danfoss o bombas Vilter a veces se parecen físicamente. El código QR asegura que descuenten el ítem correcto.
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Generación masiva:</strong> Puedes imprimir las etiquetas de los 357 productos en hojas A4 adhesivas normales o en impresora térmica de etiquetas.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PROPUESTA COMERCIAL & PLAN DE TRABAJO (Para la llamada del Martes) */}
        {/* ========================================================================= */}
        {activeTab === "propuesta" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-blue-900/60 via-slate-900 to-cyan-900/40 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-3">
                  PROPUESTA TÉCNICA Y COMERCIAL • MARTES 10:00 AM
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Sistema de Gestión de Inventario Ágil & Salida Rápida para SIFF
                </h2>
                <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-2xl leading-relaxed">
                  Solución integral para digitalizar los 357 repuestos industriales de Bodega y Oficina, facilitando a los técnicos el retiro en segundos mediante códigos QR y garantizando el control administrativo total.
                </p>
              </div>
            </div>

            {/* Diagnostic: Current vs Proposed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Current Situation (The Pain) */}
              <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-6 shadow space-y-4">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  SITUACIÓN ACTUAL (Excel Desactualizado)
                </div>
                <ul className="text-xs sm:text-sm text-slate-300 space-y-2.5">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-black">•</span>
                    <span><strong>6 hojas separadas en Excel</strong> con fórmulas manuales y riesgo constante de borrado accidental.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-black">•</span>
                    <span><strong>Fechas inconsistentes y errores de digitación</strong> (años registrados como 2034 y 2035).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-black">•</span>
                    <span><strong>Sin campo de Motivo ni Responsable:</strong> No se sabe si un repuesto salió para un servicio de cliente, venta de mostrador o se perdió.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-500 font-black">•</span>
                    <span><strong>Fricción para los técnicos:</strong> Andan apurados y no tienen tiempo de abrir un Excel complejo desde el celular.</span>
                  </li>
                </ul>
              </div>

              {/* Proposed Solution (The Gain) */}
              <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-6 shadow space-y-4">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  SOLUCIÓN PROPUESTA (Sistema SIFF en la Nube)
                </div>
                <ul className="text-xs sm:text-sm text-slate-300 space-y-2.5">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Retiro en 3 toques:</strong> Escaneo con cámara del teléfono o toque en pantalla táctil con fotos.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Motivo 100% Obligatorio:</strong> Botones rápidos predefinidos (Servicio a Cliente, Venta, Garantía, etc.).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Control Multi-Ubicación:</strong> Bodega Central y Oficina Matriz sincronizadas en tiempo real.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Etiquetas QR imprimibles:</strong> Listas para pegar en estanterías o gaveteros.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Scope of Work / Entregables */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                Alcance y Entregables del Proyecto
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    1. Aplicación Móvil para Técnicos
                  </div>
                  <p className="text-slate-400 text-xs">
                    Instalable con 1 toque en celulares Android / iPhone de los técnicos. Escáner de cámara integrado y pantalla táctil con fotos.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="font-bold text-blue-300 mb-1 flex items-center gap-1.5">
                    <Laptop className="w-4 h-4" />
                    2. Panel Gerencial para PC
                  </div>
                  <p className="text-slate-400 text-xs">
                    Instalable en la PC de la oficina con acceso a métricas, alertas de stock mínimo, Kardex completo y traspasos Bodega ↔ Oficina.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="font-bold text-purple-300 mb-1 flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" />
                    3. Módulo Generador de Etiquetas
                  </div>
                  <p className="text-slate-400 text-xs">
                    Plantillas en PDF con QR, código de barras y datos del repuesto para imprimir en hojas adhesivas o impresoras térmicas.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="font-bold text-emerald-300 mb-1 flex items-center gap-1.5">
                    <Download className="w-4 h-4" />
                    4. Migración de los 357 Repuestos
                  </div>
                  <p className="text-slate-400 text-xs">
                    Carga inicial automatizada de toda su base de datos actual desde su archivo Excel para no empezar de cero.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    5. Auditoría & Bloqueo de Stock Negativo
                  </div>
                  <p className="text-slate-400 text-xs">
                    El sistema impide registrar salidas si no hay inventario disponible y guarda quién retiró cada pieza y para qué cliente.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="font-bold text-teal-300 mb-1 flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    6. Capacitación & Soporte
                  </div>
                  <p className="text-slate-400 text-xs">
                    Sesión de capacitación virtual para los técnicos y el personal administrativo, más 30 días de garantía y soporte directo.
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline: 2 Semanas de Implementación */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-400" />
                Cronograma de Entrega Ágil (2 Semanas)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-5 rounded-xl border-l-4 border-cyan-500 border-slate-800">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">SEMANA 1</span>
                  <h4 className="text-sm font-bold text-white mt-1">Configuración y Carga de Datos</h4>
                  <ul className="text-xs text-slate-400 space-y-1.5 mt-2">
                    <li>• Creación de la base de datos en la nube (PostgreSQL/Supabase).</li>
                    <li>• Carga y depuración de los 357 repuestos desde el Excel.</li>
                    <li>• Configuración de perfiles: Técnicos, Bodeguero y Gerencia.</li>
                    <li>• Primera prueba de escaneo con celular y pistola lectora.</li>
                  </ul>
                </div>

                <div className="bg-slate-950 p-5 rounded-xl border-l-4 border-emerald-500 border-slate-800">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">SEMANA 2</span>
                  <h4 className="text-sm font-bold text-white mt-1">Etiquetado, Pruebas Piloto y Salida a Producción</h4>
                  <ul className="text-xs text-slate-400 space-y-1.5 mt-2">
                    <li>• Impresión y pegado de etiquetas QR en perchas prioritarias.</li>
                    <li>• Instalación de la PWA en los teléfonos de los técnicos.</li>
                    <li>• Prueba de fuego con servicios técnicos reales del día.</li>
                    <li>• Entrega formal y puesta en marcha definitiva.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE MOVIMIENTO RÁPIDO EN 3 SEGUNDOS (Lo que pidió el cliente) */}
      {/* ========================================================================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white bg-slate-800/60 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Product Header */}
            <div className="pr-8">
              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {selectedProduct.code} • LOTE: {selectedProduct.lot}
              </span>
              <h3 className="text-lg font-bold text-white mt-2 leading-snug">
                {selectedProduct.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                <span>{selectedProduct.brand}</span>
                <span>•</span>
                <span>{selectedProduct.location}</span>
                <span>•</span>
                <span className="text-emerald-400 font-semibold">{selectedProduct.stock} unidades disponibles</span>
              </div>
            </div>

            {/* Step 1: Type Selection (Entrada vs Salida) */}
            <div className="mt-5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Paso 1: Tipo de Movimiento
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMovementType("SALIDA")}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border ${
                    movementType === "SALIDA"
                      ? "bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/25 ring-2 ring-rose-500/50"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
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
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-500/50"
                      : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  REGISTRAR ENTRADA
                </button>
              </div>
            </div>

            {/* Step 2: Quantity Selector */}
            <div className="mt-5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Paso 2: Cantidad a {movementType === "SALIDA" ? "Retirar" : "Ingresar"}
              </label>
              <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 rounded-xl bg-slate-800 text-white text-xl font-black flex items-center justify-center active:scale-95"
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
                    className="w-full bg-transparent text-center text-3xl font-black text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">unidades</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (movementType === "SALIDA" && quantity >= selectedProduct.stock) return;
                    setQuantity(quantity + 1);
                  }}
                  className="w-12 h-12 rounded-xl bg-slate-800 text-white text-xl font-black flex items-center justify-center active:scale-95"
                >
                  +
                </button>
              </div>

              {/* Quick pills for numbers */}
              <div className="flex items-center gap-2 mt-2">
                {[1, 2, 5, 10].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setQuantity(num)}
                    className="flex-1 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-300 font-semibold"
                  >
                    {num} un.
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Mandatory Reason Selector */}
            <div className="mt-5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Paso 3: Motivo Obligatorio *</span>
                <span className="text-cyan-400 font-normal lowercase text-[11px]">(requerido por gerencia)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REASONS.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedReason === r.label;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedReason(r.label)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-sm"
                          : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-cyan-400" : "text-slate-500"}`} />
                      <span className="truncate">{r.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Mandatory Reference detail field */}
              {REASONS.find((r) => r.label === selectedReason)?.requiresDetail && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={referenceDetail}
                    onChange={(e) => setReferenceDetail(e.target.value)}
                    placeholder={
                      REASONS.find((r) => r.label === selectedReason)?.placeholder ||
                      "Detalla el cliente, N° orden o factura..."
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              )}
            </div>

            {/* Technician Selector */}
            <div className="mt-4">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Técnico o Responsable:
              </label>
              <select
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {TECHNICIANS.map((tech) => (
                  <option key={tech} value={tech}>
                    {tech}
                  </option>
                ))}
              </select>
            </div>

            {/* Confirm Button */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMovement}
                className="flex-2 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                CONFIRMAR REGISTRO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SIMULADOR DE ESCÁNER DE CÁMARA / LECTOR FÍSICO */}
      {/* ========================================================================= */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-center">
            <button
              onClick={() => setIsScannerOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white bg-slate-800/60 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
              <Camera className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-white">Escáner de Código QR y Barra</h3>
            <p className="text-xs text-slate-400 mt-1">
              En el celular activa la cámara trasera; en la PC detecta automáticamente cualquier lector láser USB.
            </p>

            {/* Scanner Viewfinder graphic */}
            <div className="mt-5 relative w-64 h-64 mx-auto bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl"></div>
              <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr"></div>
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl"></div>
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br"></div>

              {/* Animated scanning laser line */}
              <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse"></div>

              <div className="text-center p-4">
                <QrCode className="w-16 h-16 text-slate-700 mx-auto mb-2 animate-bounce" />
                <span className="text-[11px] text-slate-500 font-mono">
                  Apuntando lente al código QR...
                </span>
              </div>
            </div>

            {/* Quick Simulation buttons to show on Google Meet */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Simulación en vivo para la demostración:
              </span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleApplySimulatedScan("AKS5898")}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-cyan-300 text-left flex items-center justify-between"
                >
                  <span>[Escanear] AKS5898 - Válvula AKS-38 Danfoss</span>
                  <Scan className="w-4 h-4 text-cyan-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySimulatedScan("BOM5369")}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-cyan-300 text-left flex items-center justify-between"
                >
                  <span>[Escanear] BOM5369 - Bomba Aceite Vilter</span>
                  <Scan className="w-4 h-4 text-cyan-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySimulatedScan("ACO3818")}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-cyan-300 text-left flex items-center justify-between"
                >
                  <span>[Escanear] ACO3818 - Acople Matrimonio 9H</span>
                  <Scan className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
