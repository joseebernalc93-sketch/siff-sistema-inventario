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
  DollarSign,
  TrendingUp,
  Truck,
  Plus,
  Trash2,
  Edit,
  ShieldCheck,
  BadgeAlert,
  CheckCheck,
  Info
} from "lucide-react";
import { SIFF_PRODUCTS_DATA, SiffProduct } from "@/lib/siff-products";

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
    name: "Ing. José Bernal (Gerencia SIFF)",
    role: "gerencia",
    roleTitle: "Gerencia General & Administración",
    cedula: "0963671755",
    avatar: "👑",
    locationDefault: "Consolidado"
  },
  bodega: {
    id: "usr-bodega",
    name: "Wilson Caicedo",
    role: "bodega",
    roleTitle: "Jefe de Bodega & Logística",
    cedula: "0921458796",
    avatar: "📦",
    locationDefault: "Bodega Central"
  },
  tecnico: {
    id: "usr-tecnico",
    name: "Carlos Mendoza",
    role: "tecnico",
    roleTitle: "Técnico Especialista de Campo",
    cedula: "0954123687",
    avatar: "🛠️",
    locationDefault: "Bodega Central"
  },
  mostrador: {
    id: "usr-mostrador",
    name: "Andrea Solórzano",
    role: "mostrador",
    roleTitle: "Atención & Ventas Mostrador",
    cedula: "0945871236",
    avatar: "🛒",
    locationDefault: "Oficina Matriz"
  }
};

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
  costEstimate?: number;
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
    requestedBy: "Andrea Solórzano (Mostrador)"
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
    requestedBy: "Wilson Caicedo (Bodega)"
  }
];

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
    technician: "Carlos Mendoza (Técnico)",
    costEstimate: 45.0
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
    technician: "Wilson Caicedo (Bodega)",
    costEstimate: 320.0
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
    technician: "Wilson Caicedo (Bodega)",
    costEstimate: 55.0
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
    technician: "Wilson Caicedo (Bodega)",
    costEstimate: 85.0
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

  // Shared Inventory & Movement Data
  const [products, setProducts] = useState<SiffProduct[]>(SIFF_PRODUCTS_DATA);
  const [movements, setMovements] = useState<MovementRecord[]>(INITIAL_MOVEMENTS);
  const [transfers, setTransfers] = useState<TransferRecord[]>(INITIAL_TRANSFERS);

  // Show Financials toggle (exclusive to Gerencia)
  const [showFinancials, setShowFinancials] = useState<boolean>(true);

  // Filters for Products
  const [selectedLocation, setSelectedLocation] = useState<"TODAS" | "Bodega Central" | "Oficina Matriz">("Bodega Central");
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Quick Movement Modal
  const [selectedProduct, setSelectedProduct] = useState<SiffProduct | null>(null);
  const [movementType, setMovementType] = useState<"SALIDA" | "ENTRADA">("SALIDA");
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedReason, setSelectedReason] = useState<string>("Servicio Técnico a Cliente");
  const [referenceDetail, setReferenceDetail] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Scanner Simulator Modal
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Label Printing state (Bodega / Gerencia)
  const [selectedLabelProduct, setSelectedLabelProduct] = useState<SiffProduct>(products[0]);

  // Reception Form State (Bodega)
  const [receptionProductCode, setReceptionProductCode] = useState<string>("AKS5898");
  const [receptionQty, setReceptionQty] = useState<number>(5);
  const [receptionSupplier, setReceptionSupplier] = useState<string>("Danfoss Ecuador S.A.");
  const [receptionDoc, setReceptionDoc] = useState<string>("Guía #DF-9942");

  // Transfer Form State (Bodega / Mostrador)
  const [transferProductCode, setTransferProductCode] = useState<string>("ACO3818");
  const [transferQty, setTransferQty] = useState<number>(2);
  const [transferDestination, setTransferDestination] = useState<"Bodega Central" | "Oficina Matriz">("Oficina Matriz");

  // Add Product Form State (Gerencia)
  const [isAddProductOpen, setIsAddProductOpen] = useState<boolean>(false);
  const [newCode, setNewCode] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newLot, setNewLot] = useState<string>("LT035");
  const [newLocation, setNewLocation] = useState<"Bodega Central" | "Oficina Matriz">("Bodega Central");
  const [newStock, setNewStock] = useState<number>(5);
  const [newCategory, setNewCategory] = useState<string>("Válvulas & Controles");
  const [newBrand, setNewBrand] = useState<string>("Danfoss");

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
    setToastMessage(`Sesión cambiada a: ${user.name} (${user.roleTitle})`);
    setTimeout(() => setToastMessage(null), 4000);
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
    // Estimated valuation for Gerencia
    const estimatedValuation = totalStockUnits * 68.5;
    return { totalItems, bodegaCount, oficinaCount, lowStockCount, totalStockUnits, estimatedValuation };
  }, [products]);

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

    const newStock = movementType === "SALIDA" ? selectedProduct.stock - quantity : selectedProduct.stock + quantity;

    setProducts((prev) =>
      prev.map((item) => (item.id === selectedProduct.id ? { ...item, stock: newStock } : item))
    );

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
      technician: currentUser.name,
      costEstimate: quantity * 45.0
    };

    setMovements((prev) => [newMovement, ...prev]);

    setToastMessage(
      `✅ ${movementType === "SALIDA" ? "Salida" : "Entrada"} registrada: ${quantity}x ${selectedProduct.code} - ${selectedProduct.name} (${selectedProduct.location})`
    );
    setTimeout(() => setToastMessage(null), 5000);

    setSelectedProduct(null);
    setQuantity(1);
    setReferenceDetail("");
  };

  // Open modal for product
  const handleSelectProduct = (product: SiffProduct) => {
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

  // Reception submit (Bodega)
  const handleRegisterReception = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.code === receptionProductCode);
    if (!prod) return;

    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, stock: p.stock + receptionQty } : p))
    );

    const newMov: MovementRecord = {
      id: "mov-" + Date.now(),
      timestamp: "Hace un momento",
      productCode: prod.code,
      productName: prod.name,
      location: prod.location,
      type: "ENTRADA",
      quantity: receptionQty,
      lot: prod.lot,
      reason: "Recepción de Proveedor",
      referenceDetail: `${receptionSupplier} - ${receptionDoc}`,
      technician: currentUser?.name || "Jefe de Bodega"
    };

    setMovements((prev) => [newMov, ...prev]);
    setToastMessage(`✅ Recepción registrada: ${receptionQty}x ${prod.name} ingresadas a ${prod.location}`);
    setTimeout(() => setToastMessage(null), 4000);
    setReceptionQty(5);
  };

  // Transfer submit (Bodega / Mostrador)
  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => p.code === transferProductCode);
    if (!prod) return;

    if (prod.stock < transferQty) {
      alert(`Stock insuficiente en ${prod.location}. Solo hay ${prod.stock} unidades.`);
      return;
    }

    const newTransfer: TransferRecord = {
      id: "trf-" + Date.now().toString().slice(-4),
      date: "Hoy, recién solicitado",
      productCode: prod.code,
      productName: prod.name,
      from: prod.location,
      to: transferDestination,
      quantity: transferQty,
      status: "EN TRÁNSITO",
      requestedBy: currentUser?.name || "Personal SIFF"
    };

    setTransfers((prev) => [newTransfer, ...prev]);
    setToastMessage(`🔄 Solicitud de traspaso creada: ${transferQty}x ${prod.name} en tránsito hacia ${transferDestination}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Create new product (Gerencia)
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      alert("Por favor ingresa código y nombre.");
      return;
    }

    const created: SiffProduct = {
      id: "p-" + (products.length + 1),
      code: newCode.trim().toUpperCase(),
      name: newName.trim().toUpperCase(),
      lot: newLot.trim().toUpperCase() || "LT001",
      location: newLocation,
      stock: Number(newStock) || 0,
      minStock: 2,
      category: newCategory,
      brand: newBrand,
      lastMovement: new Date().toISOString().split("T")[0]
    };

    setProducts([created, ...products]);
    setIsAddProductOpen(false);
    setNewCode("");
    setNewName("");
    setToastMessage(`✅ Repuesto creado exitosamente: ${created.code} - ${created.name}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // =========================================================================
  // VIEW: LOGIN SCREEN (When not authenticated)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header */}
        <header className="p-6 max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-xl">
              SIFF
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white">
                SIFF <span className="text-cyan-400 font-light">Refrigeración Industrial</span>
              </span>
              <p className="text-[11px] text-slate-400">Sistema Centralizado de Inventario & Control de Salidas</p>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Versión Demo Beta (357 Repuestos)
          </span>
        </header>

        {/* Login Card */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Iniciar Sesión
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Selecciona tu perfil de acceso para ingresar a tus funciones asignadas
              </p>
            </div>

            {/* Role Tabs for Login */}
            <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-6">
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
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
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
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
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
                    ? "bg-blue-500 text-white shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span>🛒</span>
                <span>Ventas</span>
              </button>
            </div>

            {/* Error Message */}
            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Field 1: Cédula / Identificación */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono tracking-wider"
                  />
                </div>
              </div>

              {/* Field 2: Contraseña (para Gerencia y Mostrador) o PIN (para Bodega y Técnicos) */}
              {selectedLoginTab === "gerencia" || selectedLoginTab === "mostrador" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Contraseña de Acceso</span>
                    {selectedLoginTab === "gerencia" && (
                      <span className="text-[10px] text-amber-400 font-semibold">Clave: Gerencia123</span>
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>PIN de Acceso Rápido</span>
                    <span className="text-[10px] text-cyan-400">4 dígitos</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value)}
                      placeholder="****"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono tracking-widest text-center"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition-all mt-2"
              >
                Ingresar al Sistema
              </button>
            </form>

            {/* Quick Demo Access Bar (Instant 1-click for Meeting) */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
                ⚡ Acceso Directo de Demostración (1 clic):
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSwitchUser("gerencia")}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-amber-500/30 text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>👑</span> Gerencia General
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchUser("bodega")}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>📦</span> Jefe de Bodega
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchUser("tecnico")}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-emerald-500/30 text-emerald-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>🛠️</span> Técnico (Celular)
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchUser("mostrador")}
                  className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-blue-500/30 text-blue-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>🛒</span> Ventas Mostrador
                </button>
              </div>
            </div>
          </div>
        </main>

        <footer className="p-4 text-center text-xs text-slate-500">
          Prototipo de Titulación y Propuesta Comercial • SIFF Refrigeración Industrial
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW: AUTHENTICATED SYSTEM (Role-based Panel)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top App Header with User Info & Role Switcher */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl backdrop-blur-md bg-slate-900/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo and Role Indicator */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black tracking-wider text-xl">
                SIFF
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                    SIFF <span className="text-cyan-400 font-light">Inventario</span>
                  </h1>
                  {/* Dynamic Role Badge */}
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      currentUser.role === "gerencia"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : currentUser.role === "bodega"
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                        : currentUser.role === "tecnico"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    }`}
                  >
                    <span className="mr-1">{currentUser.avatar}</span>
                    {currentUser.role.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  <span>{currentUser.name}</span>
                  <span className="hidden sm:inline text-slate-600">•</span>
                  <span className="hidden sm:inline text-slate-400 font-mono text-[11px]">
                    CI: {currentUser.cedula}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Demo Role Switcher + Logout */}
            <div className="flex items-center gap-2">
              {/* Role Switcher Pill (Great for Meeting) */}
              <div className="hidden lg:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-500 uppercase font-bold px-2">Cambiar Rol:</span>
                <button
                  onClick={() => handleSwitchUser("gerencia")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    currentUser.role === "gerencia" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  👑 Gerencia
                </button>
                <button
                  onClick={() => handleSwitchUser("bodega")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    currentUser.role === "bodega" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  📦 Bodega
                </button>
                <button
                  onClick={() => handleSwitchUser("tecnico")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    currentUser.role === "tecnico" ? "bg-emerald-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  🛠️ Técnico
                </button>
                <button
                  onClick={() => handleSwitchUser("mostrador")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    currentUser.role === "mostrador" ? "bg-blue-500 text-white font-bold" : "text-slate-400 hover:text-white"
                  }`}
                >
                  🛒 Mostrador
                </button>
              </div>

              {/* Logout button */}
              <button
                onClick={() => setCurrentUser(null)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
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
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 border-2 border-emerald-500/60 rounded-xl p-4 shadow-2xl shadow-emerald-500/20 text-emerald-200 flex items-start gap-3 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold">{toastMessage}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ROLE 1: PANEL DE GERENCIA (Control Total, Costos, Kardex, Usuarios) */}
      {/* ========================================================================= */}
      {currentUser.role === "gerencia" && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Sub Navigation Bar for Gerencia */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setGerenciaSubTab("inventario")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  gerenciaSubTab === "inventario"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Package className="w-4 h-4" />
                Inventario Consolidado (357)
              </button>
              <button
                onClick={() => setGerenciaSubTab("kardex")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  gerenciaSubTab === "kardex"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Clock className="w-4 h-4" />
                Kardex & Auditoría
              </button>
              <button
                onClick={() => setGerenciaSubTab("usuarios")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  gerenciaSubTab === "usuarios"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Users className="w-4 h-4" />
                Personal & Roles (4)
              </button>
              <button
                onClick={() => setGerenciaSubTab("propuesta")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  gerenciaSubTab === "propuesta"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-cyan-400 hover:bg-cyan-500/10"
                }`}
              >
                <FileText className="w-4 h-4" />
                Plan Propuesta Martes
              </button>
            </div>

            {/* Toggle to see cost margins (Exclusive to Gerencia) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFinancials(!showFinancials)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  showFinancials
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-950 text-slate-500 border-slate-800"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                {showFinancials ? "Ocultar Costos $" : "Ver Costos & Márgenes $"}
              </button>
              <button
                onClick={() => setIsAddProductOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo Repuesto
              </button>
            </div>
          </div>

          {/* Gerencia KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
              <div className="text-slate-400 text-xs font-bold flex items-center justify-between mb-2">
                <span>TOTAL REPUESTOS</span>
                <Package className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{metrics.totalItems}</div>
              <p className="text-xs text-slate-500 mt-1">Bodega ({metrics.bodegaCount}) • Oficina ({metrics.oficinaCount})</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
              <div className="text-slate-400 text-xs font-bold flex items-center justify-between mb-2">
                <span>VALOR ESTIMADO INVENTARIO</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {showFinancials ? `$${metrics.estimatedValuation.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "••••••"}
              </div>
              <p className="text-xs text-slate-500 mt-1">{metrics.totalStockUnits} unidades físicas totales</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
              <div className="text-slate-400 text-xs font-bold flex items-center justify-between mb-2">
                <span>ALERTAS STOCK CRÍTICO</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-400">{metrics.lowStockCount}</div>
              <p className="text-xs text-slate-500 mt-1">Repuestos con &le; 2 unidades</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow">
              <div className="text-slate-400 text-xs font-bold flex items-center justify-between mb-2">
                <span>TRÁNSITOS ENTRE BODEGAS</span>
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-400">{transfers.length}</div>
              <p className="text-xs text-slate-500 mt-1">Traspasos registrados</p>
            </div>
          </div>

          {/* Subtab 1: Consolidated Inventory with Gerencia Privileges */}
          {gerenciaSubTab === "inventario" && (
            <div className="space-y-4">
              {/* Location and Category Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                  <button
                    onClick={() => setSelectedLocation("TODAS")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedLocation === "TODAS" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Todo el Inventario ({metrics.totalItems})
                  </button>
                  <button
                    onClick={() => setSelectedLocation("Bodega Central")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedLocation === "Bodega Central" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Bodega Central ({metrics.bodegaCount})
                  </button>
                  <button
                    onClick={() => setSelectedLocation("Oficina Matriz")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedLocation === "Oficina Matriz" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Oficina Matriz ({metrics.oficinaCount})
                  </button>
                </div>

                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por código, nombre o marca..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Products Table with Gerencia Financial Columns */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Descripción Técnica</th>
                        <th className="px-4 py-3">Lote</th>
                        <th className="px-4 py-3">Ubicación</th>
                        <th className="px-4 py-3">Stock Actual</th>
                        {showFinancials && (
                          <>
                            <th className="px-4 py-3">Costo Est.</th>
                            <th className="px-4 py-3">PVP Sugerido</th>
                          </>
                        )}
                        <th className="px-4 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredProducts.slice(0, 25).map((prod) => {
                        const isLow = prod.stock <= prod.minStock;
                        return (
                          <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-cyan-400">{prod.code}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-white">{prod.name}</div>
                              <div className="text-[11px] text-slate-400">{prod.category} • {prod.brand}</div>
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-400">{prod.lot}</td>
                            <td className="px-4 py-3 text-slate-300">{prod.location}</td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 font-bold text-xs px-2.5 py-0.5 rounded-full ${
                                  isLow ? "bg-rose-500/10 text-rose-400 border border-rose-500/30" : "bg-emerald-500/10 text-emerald-400"
                                }`}
                              >
                                {prod.stock} un.
                              </span>
                            </td>
                            {showFinancials && (
                              <>
                                <td className="px-4 py-3 font-mono text-slate-300">$45.00</td>
                                <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">$72.00</td>
                              </>
                            )}
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleSelectProduct(prod)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 text-xs font-semibold transition-all"
                              >
                                Ajustar / Mover
                              </button>
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

          {/* Subtab 2: Kardex Audit */}
          {gerenciaSubTab === "kardex" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Auditoría Total de Entradas y Salidas
              </h2>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Repuesto</th>
                      <th className="px-4 py-3">Ubicación</th>
                      <th className="px-4 py-3">Motivo Obligatorio</th>
                      <th className="px-4 py-3">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {movements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{m.timestamp}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              m.type === "SALIDA" ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"
                            }`}
                          >
                            {m.type}: {m.quantity} un.
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{m.productName}</div>
                          <div className="text-xs text-cyan-400 font-mono">{m.productCode}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{m.location}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-200">{m.reason}</div>
                          {m.referenceDetail && <div className="text-xs text-slate-400 italic">"{m.referenceDetail}"</div>}
                        </td>
                        <td className="px-4 py-3 text-slate-300">{m.technician}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subtab 3: Users and Roles Management */}
          {gerenciaSubTab === "usuarios" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    Personal Autorizado & Roles del Sistema
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Control de accesos y permisos por puesto de trabajo para evitar fugas y desorden.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.values(PRESET_USERS).map((user) => (
                  <div key={user.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                      {user.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{user.roleTitle}</p>
                      <div className="mt-2 text-[11px] text-slate-500 font-mono">
                        Cédula: <span className="text-slate-300">{user.cedula}</span> • Ubicación: {user.locationDefault}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 4: Plan Propuesta Martes */}
          {gerenciaSubTab === "propuesta" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <span className="text-xs font-bold uppercase text-cyan-400 tracking-wider">RESUMEN EJECUTIVO</span>
                <h2 className="text-2xl font-black text-white mt-1">Plan de Implementación en 2 Semanas</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Solución llave en mano para SIFF Refrigeración Industrial: digitalización de los 357 repuestos, retiro rápido en 3 segundos y trazabilidad total.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-amber-400 mb-2">Semana 1: Configuración y Datos</h4>
                  <ul className="text-slate-400 space-y-1.5 text-xs">
                    <li>• Carga y depuración de los 357 repuestos del Excel a Supabase.</li>
                    <li>• Configuración de los 4 roles de acceso (Gerencia, Bodega, Técnicos, Mostrador).</li>
                    <li>• Pruebas de escaneo con pistola lectora y cámara del teléfono.</li>
                  </ul>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="font-bold text-emerald-400 mb-2">Semana 2: Rotulación y Despliegue</h4>
                  <ul className="text-slate-400 space-y-1.5 text-xs">
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                onClick={() => setBodegaSubTab("perchas")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  bodegaSubTab === "perchas"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Warehouse className="w-4 h-4" />
                Perchas de Bodega Central ({metrics.bodegaCount})
              </button>
              <button
                onClick={() => setBodegaSubTab("recepcion")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  bodegaSubTab === "recepcion"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Truck className="w-4 h-4" />
                Recepción de Proveedores
              </button>
              <button
                onClick={() => setBodegaSubTab("traspasos")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  bodegaSubTab === "traspasos"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                Traspasos a Oficina ({transfers.length})
              </button>
              <button
                onClick={() => setBodegaSubTab("etiquetas")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                  bodegaSubTab === "etiquetas"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <QrCode className="w-4 h-4" />
                Imprimir Etiquetas QR
              </button>
            </div>

            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow active:scale-95"
            >
              <Scan className="w-4 h-4" />
              Lector Láser / Escanear
            </button>
          </div>

          {/* Bodega Subtab 1: Perchas Bodega */}
          {bodegaSubTab === "perchas" && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Mostrando inventario físico asignado a <strong>Bodega Central</strong>.
                </span>
                <span className="text-xs font-mono text-cyan-400">185 repuestos en perchas</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products
                  .filter((p) => p.location === "Bodega Central")
                  .slice(0, 16)
                  .map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="bg-slate-900 border border-slate-800 hover:border-cyan-500 rounded-2xl p-4 cursor-pointer transition-all"
                    >
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
                        <span className="text-cyan-400 font-bold">{p.code}</span>
                        <span>{p.lot}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-white line-clamp-2">{p.name}</h4>
                      <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                        <span className="text-slate-400">Stock: <strong className="text-white">{p.stock} un.</strong></span>
                        <span className="text-cyan-400 font-bold">Despachar →</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Bodega Subtab 2: Recepción de Proveedores */}
          {bodegaSubTab === "recepcion" && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow max-w-xl mx-auto space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-cyan-400" />
                  Recepción de Mercadería por Compra
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Ingresa los repuestos que llegan de proveedores a Bodega Central.</p>
              </div>

              <form onSubmit={handleRegisterReception} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Repuesto que ingresa:</label>
                  <select
                    value={receptionProductCode}
                    onChange={(e) => setReceptionProductCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">N° Guía / Factura:</label>
                    <input
                      type="text"
                      value={receptionDoc}
                      onChange={(e) => setReceptionDoc(e.target.value)}
                      placeholder="Ej: Guía #9942"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow transition-all"
                >
                  Confirmar Ingreso a Bodega
                </button>
              </form>
            </div>
          )}

          {/* Bodega Subtab 3: Traspasos */}
          {bodegaSubTab === "traspasos" && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
                  Traspasos Internos (Bodega Central ↔ Oficina Matriz)
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-3">Fecha</th>
                        <th className="px-4 py-3">Repuesto</th>
                        <th className="px-4 py-3">Origen → Destino</th>
                        <th className="px-4 py-3">Cantidad</th>
                        <th className="px-4 py-3">Estado</th>
                        <th className="px-4 py-3">Solicitante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {transfers.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/40">
                          <td className="px-4 py-3 text-slate-400 font-mono text-xs">{t.date}</td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-white">{t.productName}</span>
                            <span className="text-xs text-cyan-400 font-mono ml-2">({t.productCode})</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {t.from} → <strong className="text-cyan-400">{t.to}</strong>
                          </td>
                          <td className="px-4 py-3 font-bold text-white">{t.quantity} un.</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.status === "RECIBIDO"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-amber-500/10 text-amber-400 animate-pulse"
                              }`}
                            >
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
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
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white"
                >
                  {products.slice(0, 40).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name} ({p.location} - Lote: {p.lot})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs shadow flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Imprimir Etiqueta
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ========================================================================= */}
      {/* ROLE 3: PANEL DE TÉCNICO (Vista Celular: Escáner, Táctil 3 Segundos, Salidas) */}
      {/* ========================================================================= */}
      {currentUser.role === "tecnico" && (
        <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
          {/* Mobile Technician Header Card */}
          <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                VISTA MÓVIL DE CAMPO
              </span>
              <h3 className="text-base font-bold text-white">Retiro Rápido de Repuestos</h3>
              <p className="text-xs text-slate-400">Toca el repuesto o usa el escáner de cámara</p>
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex flex-col items-center gap-1"
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
              placeholder="Buscar repuesto (AKS-38, Bomba Vilter...)"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.slice(0, 5).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full font-medium transition-all ${
                  selectedCategory === cat ? "bg-emerald-500 text-slate-950 font-bold" : "bg-slate-900 text-slate-400 border border-slate-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Touch Grid optimized for thumbs */}
          <div className="space-y-2.5">
            {filteredProducts.slice(0, 15).map((prod) => (
              <div
                key={prod.id}
                onClick={() => handleSelectProduct(prod)}
                className="bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-3.5 cursor-pointer flex items-center justify-between active:scale-[0.98] transition-all"
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-emerald-400">{prod.code}</span>
                    <span className="text-[10px] font-mono text-slate-500">{prod.lot}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white mt-0.5 line-clamp-1">{prod.name}</h4>
                  <div className="text-[11px] text-slate-400 mt-0.5">{prod.location}</div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-white">{prod.stock} un.</div>
                  <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-[11px] mt-1">
                    Retirar →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* ROLE 4: PANEL DE MOSTRADOR / VENTAS (Oficina Matriz, Venta Rápida, Factura) */}
      {/* ========================================================================= */}
      {currentUser.role === "mostrador" && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase text-blue-400">MOSTRADOR & ATENCIÓN A CLIENTES</span>
              <h2 className="text-lg font-bold text-white">Ventas Directas & Stock en Oficina Matriz</h2>
              <p className="text-xs text-slate-400">Registra ventas con factura/nota de entrega o solicita piezas a Bodega.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedLocation("Oficina Matriz")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  selectedLocation === "Oficina Matriz" ? "bg-blue-500 text-white font-bold" : "bg-slate-950 text-slate-400"
                }`}
              >
                Oficina ({metrics.oficinaCount})
              </button>
              <button
                onClick={() => setSelectedLocation("Bodega Central")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  selectedLocation === "Bodega Central" ? "bg-blue-500 text-white font-bold" : "bg-slate-950 text-slate-400"
                }`}
              >
                Consultar Bodega ({metrics.bodegaCount})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.slice(0, 16).map((prod) => (
              <div
                key={prod.id}
                onClick={() => handleSelectProduct(prod)}
                className="bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-2xl p-4 cursor-pointer transition-all"
              >
                <div className="flex justify-between items-center text-xs font-mono mb-1">
                  <span className="text-blue-400 font-bold">{prod.code}</span>
                  <span className="text-slate-500">{prod.lot}</span>
                </div>
                <h4 className="text-sm font-semibold text-white line-clamp-2">{prod.name}</h4>
                <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Disponible: <strong className="text-white">{prod.stock} un.</strong></span>
                  <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">Vender →</span>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE MOVIMIENTO RÁPIDO CON MOTIVO OBLIGATORIO */}
      {/* ========================================================================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white bg-slate-800/60 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

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

            {/* Step 1: Type Selection */}
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

            {/* Step 3: Mandatory Reason */}
            <div className="mt-5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Paso 3: Motivo Obligatorio *</span>
                <span className="text-cyan-400 font-normal lowercase text-[11px]">(registrado a tu nombre)</span>
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
                        ? "bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Footer */}
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
      {/* MODAL: SIMULADOR DE ESCÁNER DE CÁMARA */}
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
              En celulares activa la cámara trasera; en la PC detecta el lector láser USB.
            </p>

            <div className="mt-5 relative w-60 h-60 mx-auto bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden flex items-center justify-center shadow-inner">
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

            <div className="mt-5 pt-4 border-t border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Prueba rápida para la reunión del Martes:
              </span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleApplySimulatedScan("AKS5898")}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-cyan-300 text-left flex items-center justify-between"
                >
                  <span>[Escanear] AKS5898 - Válvula Danfoss</span>
                  <Scan className="w-4 h-4 text-cyan-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleApplySimulatedScan("BOM5369")}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-cyan-300 text-left flex items-center justify-between"
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
      {/* MODAL: CREAR NUEVO REPUESTO (Solo Gerencia) */}
      {/* ========================================================================= */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddProductOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white bg-slate-800/60 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Crear Nuevo Repuesto en Inventario
            </h3>
            <p className="text-xs text-slate-400 mt-1">Función exclusiva de la Gerencia.</p>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Código del Repuesto:</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="Ej: VAL9940"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ubicación Inicial:</label>
                  <select
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white text-center font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Marca:</label>
                  <input
                    type="text"
                    value={newBrand}
                    onChange={(e) => setNewBrand(e.target.value)}
                    placeholder="Danfoss, Bitzer..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Lote:</label>
                  <input
                    type="text"
                    value={newLot}
                    onChange={(e) => setNewLot(e.target.value)}
                    placeholder="LT035"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow mt-2"
              >
                Guardar Repuesto en Inventario
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
