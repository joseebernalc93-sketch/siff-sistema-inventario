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
  RefreshCw
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
  if (product.imageUrl && product.imageUrl.trim() !== "") {
    return product.imageUrl;
  }
  return CATEGORY_IMAGES[product.category] || CATEGORY_IMAGES["Válvulas & Controles"];
}

interface ExtendedProduct extends SiffProduct {
  imageUrl?: string;
}

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
    timestamp: "Hoy, 10:42 AM",
    productCode: "AKS5898",
    productName: "AKS - 38 DANFOSS",
    location: "Bodega Central",
    type: "SALIDA",
    quantity: 1,
    lot: "LT032",
    reason: "Servicio Técnico a Cliente",
    referenceDetail: "Pesquera Mar del Sur - Mantenimiento Compresor 2",
    technician: "Técnico de Campo"
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
    technician: "Jefe de Bodega"
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
    technician: "Jefe de Bodega"
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
    technician: "Jefe de Bodega"
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

  // Interactive KPI Card Filters & Modals
  const [activeKpiFilter, setActiveKpiFilter] = useState<"ALL" | "LOW_STOCK">("ALL");
  const [isStockBreakdownOpen, setIsStockBreakdownOpen] = useState<boolean>(false);
  const [isTransfersModalOpen, setIsTransfersModalOpen] = useState<boolean>(false);
  const [newTransferProductCode, setNewTransferProductCode] = useState<string>("AKS5898");
  const [newTransferFrom, setNewTransferFrom] = useState<"Bodega Central" | "Oficina Matriz">("Bodega Central");
  const [newTransferTo, setNewTransferTo] = useState<"Bodega Central" | "Oficina Matriz">("Oficina Matriz");
  const [newTransferQty, setNewTransferQty] = useState<number>(2);

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
      technician: currentUser.name
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

  // =========================================================================
  // VIEW: LOGIN SCREEN (When not authenticated)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-cyan-500 selection:text-black relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

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

        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative">
            <div className="text-center mb-6">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Iniciar Sesión
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Selecciona tu perfil de acceso para ingresar al sistema
              </p>
            </div>

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

            {loginError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
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

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 active:scale-95 transition-all mt-2"
              >
                Ingresar al Sistema
              </button>
            </form>

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

        <footer className="p-4 text-center text-xs text-slate-600">
          SIFF Refrigeración Industrial
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW: AUTHENTICATED SYSTEM (Role-based Panel)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top App Header - Cleaned without personal names or cédula */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl backdrop-blur-md bg-slate-900/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo and Clean Role Indicator */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black tracking-wider text-xl">
                SIFF
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                    SIFF <span className="text-cyan-400 font-light">Inventario</span>
                  </h1>
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
                <p className="text-xs text-slate-400">
                  {currentUser.roleTitle}
                </p>
              </div>
            </div>

            {/* Logout */}
            <div className="flex items-center gap-2">
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
      {/* ROLE 1: PANEL DE GERENCIA (Clean Non-scrollable Header + Photos Grid) */}
      {/* ========================================================================= */}
      {currentUser.role === "gerencia" && (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Sub Navigation Bar - Perfectly Aligned without Ugly Scrollbar (Image 3 fix) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
            {/* Segmented control tabs */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button
                onClick={() => setGerenciaSubTab("inventario")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  gerenciaSubTab === "inventario"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Inventario (357)</span>
              </button>
              <button
                onClick={() => setGerenciaSubTab("kardex")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  gerenciaSubTab === "kardex"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Kardex & Auditoría</span>
              </button>
              <button
                onClick={() => setGerenciaSubTab("usuarios")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  gerenciaSubTab === "usuarios"
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Personal & Roles</span>
              </button>
              <button
                onClick={() => setGerenciaSubTab("propuesta")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
                  gerenciaSubTab === "propuesta"
                    ? "bg-cyan-500 text-slate-950 shadow"
                    : "text-cyan-400 hover:text-cyan-300"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Plan Propuesta</span>
              </button>
            </div>

            {/* Right Action buttons - Aligned and balanced */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddProductOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nuevo Repuesto con Foto</span>
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
                  ? "bg-slate-900 border-2 border-amber-500/70 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/20"
                  : "bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5"
              }`}
            >
              <div className="text-slate-400 text-xs font-bold flex items-center justify-between mb-2">
                <span className="group-hover:text-amber-400 transition-colors">TOTAL REPUESTOS</span>
                <Package className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{metrics.totalItems}</div>
              <p className="text-xs text-slate-500 mt-1">Bodega ({metrics.bodegaCount}) • Oficina ({metrics.oficinaCount})</p>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-amber-400/90 font-medium">
                <span>Ver catálogo completo</span>
                <RefreshCw className="w-3 h-3 group-hover:rotate-180 transition-transform duration-500" />
              </div>
            </button>

            {/* KPI 2: Total Unidades en Stock -> Click to open analytical breakdown */}
            <button
              type="button"
              onClick={() => setIsStockBreakdownOpen(true)}
              className="group relative text-left bg-slate-900 border border-slate-800 hover:border-emerald-500/60 rounded-2xl p-5 shadow hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-200 transform hover:-translate-y-1 active:scale-[0.98]"
            >
              <div className="text-slate-400 text-xs font-bold flex items-center justify-between mb-2">
                <span className="group-hover:text-emerald-400 transition-colors">TOTAL UNIDADES EN STOCK</span>
                <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400">
                {metrics.totalStockUnits.toLocaleString()} un.
              </div>
              <p className="text-xs text-slate-500 mt-1">Existencias físicas consolidadas</p>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-medium">
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
                  ? "bg-rose-950/20 border-2 border-rose-500 shadow-xl shadow-rose-500/20 ring-2 ring-rose-500/30"
                  : "bg-slate-900 border border-slate-800 hover:border-rose-500/60 hover:shadow-lg hover:shadow-rose-500/10"
              }`}
            >
              <div className="text-slate-400 text-xs font-bold flex items-center justify-between mb-2">
                <span className="group-hover:text-rose-400 transition-colors">ALERTAS STOCK CRÍTICO</span>
                <AlertTriangle className={`w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform ${activeKpiFilter === "LOW_STOCK" ? "animate-bounce" : ""}`} />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-rose-400">{metrics.lowStockCount}</div>
              <p className="text-xs text-slate-500 mt-1">Repuestos con &le; 2 unidades</p>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-rose-400 font-medium">
                <span>{activeKpiFilter === "LOW_STOCK" ? "Quitar filtro activo" : "Filtrar por stock crítico"}</span>
                <span className="font-bold">{activeKpiFilter === "LOW_STOCK" ? "✕" : "↓"}</span>
              </div>
            </button>

            {/* KPI 4: Tránsitos -> Click to open transfers modal and management */}
            <button
              type="button"
              onClick={() => setIsTransfersModalOpen(true)}
              className="group relative text-left bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-5 shadow hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-200 transform hover:-translate-y-1 active:scale-[0.98]"
            >
              <div className="text-slate-400 text-xs font-bold flex items-center justify-between mb-2">
                <span className="group-hover:text-cyan-400 transition-colors">TRÁNSITOS ENTRE BODEGAS</span>
                <ArrowRightLeft className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-cyan-400">{transfers.length}</div>
              <p className="text-xs text-slate-500 mt-1">Traspasos registrados</p>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-cyan-400 font-medium">
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
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-300 shadow-lg shadow-rose-950/30 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                      <AlertTriangle className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm block">
                        Filtro Activo: Repuestos con Stock Crítico (≤ 2 unidades)
                      </span>
                      <span className="text-xs text-rose-300/80">
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
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                  <button
                    onClick={() => setSelectedLocation("TODAS")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedLocation === "TODAS" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Todo ({metrics.totalItems})
                  </button>
                  <button
                    onClick={() => setSelectedLocation("Bodega Central")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedLocation === "Bodega Central" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Bodega ({metrics.bodegaCount})
                  </button>
                  <button
                    onClick={() => setSelectedLocation("Oficina Matriz")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      selectedLocation === "Oficina Matriz" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* View Mode Switcher: Grid with photos vs Table (Like reference image 1) */}
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                    <button
                      onClick={() => setViewDisplayMode("grid")}
                      className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                        viewDisplayMode === "grid"
                          ? "bg-amber-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
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
                          ? "bg-amber-500 text-slate-950 shadow"
                          : "text-slate-400 hover:text-white"
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
                        className="bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-2xl p-4 flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-amber-500/5 group"
                      >
                        <div>
                          {/* Product Image Frame (Clean square photo container like in reference Image 1) */}
                          <div className="w-full h-44 bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden relative mb-3 flex items-center justify-center p-2 group-hover:border-slate-700 transition-colors">
                            <img
                              src={imageUrl}
                              alt={prod.name}
                              className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                            />
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
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-cyan-300 border border-white/10">
                                {prod.brand}
                              </span>
                            </div>
                          </div>

                          {/* Technical Details */}
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                {prod.code}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">{prod.lot}</span>
                            </div>
                            <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-amber-200 transition-colors">
                              {prod.name}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-1">{prod.category}</p>
                            <p className="text-[10px] text-slate-500">📍 {prod.location}</p>
                          </div>
                        </div>

                        {/* Stock & Action Button without prices */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isLow ? "bg-rose-500 animate-pulse" : "bg-emerald-400"}`}></span>
                            <span className="text-xs text-slate-300 font-semibold">{prod.stock} un. disponibles</span>
                          </div>

                          <button
                            onClick={() => handleSelectProduct(prod)}
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
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Foto</th>
                          <th className="px-4 py-3">Código</th>
                          <th className="px-4 py-3">Descripción Técnica</th>
                          <th className="px-4 py-3">Lote</th>
                          <th className="px-4 py-3">Ubicación</th>
                          <th className="px-4 py-3">Stock Actual</th>
                          <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredProducts.slice(0, 25).map((prod) => {
                          const isLow = prod.stock <= prod.minStock;
                          const imageUrl = getProductImage(prod);
                          return (
                            <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="px-4 py-2">
                                <img
                                  src={imageUrl}
                                  alt={prod.name}
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-800"
                                />
                              </td>
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
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => handleSelectProduct(prod)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 text-xs font-semibold transition-all"
                                >
                                  Mover
                                </button>
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
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Personal Autorizado & Roles del Sistema
              </h2>
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
                  Solución llave en mano para SIFF: catálogo visual con fotos, retiro rápido en 3 segundos y trazabilidad total.
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
                Perchas Bodega ({metrics.bodegaCount})
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
                Recepción Proveedores
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

          {/* Bodega Subtab 1: Perchas Bodega con Fotos */}
          {bodegaSubTab === "perchas" && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
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
                        className="bg-slate-900 border border-slate-800 hover:border-cyan-500 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="w-full h-36 bg-slate-950 rounded-xl overflow-hidden mb-3 border border-slate-800">
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
                          <h4 className="text-sm font-semibold text-white line-clamp-2">{p.name}</h4>
                        </div>
                        <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                          <span className="text-slate-400">Stock: <strong className="text-white">{p.stock} un.</strong></span>
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow max-w-xl mx-auto space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-cyan-400" />
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
                  type="button"
                  onClick={() => {
                    const prod = products.find((p) => p.code === receptionProductCode);
                    if (!prod) return;
                    setProducts(products.map((p) => (p.id === prod.id ? { ...p, stock: p.stock + receptionQty } : p)));
                    setToastMessage(`✅ Recepción registrada: +${receptionQty}x ${prod.name}`);
                    setTimeout(() => setToastMessage(null), 4000);
                  }}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm shadow transition-all"
                >
                  Confirmar Ingreso a Bodega
                </button>
              </div>
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
      {/* ROLE 3: PANEL DE TÉCNICO (Vista Celular: Pantalla Táctil con Fotos y Cámara) */}
      {/* ========================================================================= */}
      {currentUser.role === "tecnico" && (
        <main className="flex-1 max-w-lg w-full mx-auto p-4 space-y-4">
          {/* Mobile Technician Header Card */}
          <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                PANTALLA TÁCTIL CON FOTOS (RESTAURANTE)
              </span>
              <h3 className="text-base font-bold text-white">Retiro Rápido para Servicios</h3>
              <p className="text-xs text-slate-400">Toca la foto o usa el escáner de cámara</p>
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex flex-col items-center gap-1"
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

          {/* Touch Card Grid with Big Photos (Exactly like restaurant order POS in Image 1) */}
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.slice(0, 16).map((prod) => {
              const imageUrl = getProductImage(prod);
              return (
                <div
                  key={prod.id}
                  onClick={() => handleSelectProduct(prod)}
                  className="bg-slate-900 border border-slate-800 hover:border-emerald-500 rounded-2xl p-3 cursor-pointer flex flex-col justify-between active:scale-[0.98] transition-all shadow"
                >
                  <div>
                    <div className="w-full h-28 bg-slate-950 rounded-xl overflow-hidden mb-2 relative border border-slate-800">
                      <img src={imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                      <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded shadow">
                        {prod.stock} un.
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">{prod.code}</span>
                    <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight mt-0.5">{prod.name}</h4>
                  </div>

                  <button className="w-full py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs mt-3 flex items-center justify-center gap-1">
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase text-blue-400">MOSTRADOR & ATENCIÓN A CLIENTES</span>
              <h2 className="text-lg font-bold text-white">Ventas Directas & Stock en Oficina Matriz</h2>
              <p className="text-xs text-slate-400">Toca el repuesto con foto para registrar la venta de mostrador.</p>
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
            {filteredProducts.slice(0, 16).map((prod) => {
              const imageUrl = getProductImage(prod);
              return (
                <div
                  key={prod.id}
                  onClick={() => handleSelectProduct(prod)}
                  className="bg-slate-900 border border-slate-800 hover:border-blue-500 rounded-2xl p-4 cursor-pointer transition-all flex flex-col justify-between group shadow"
                >
                  <div>
                    <div className="w-full h-36 bg-slate-950 rounded-xl overflow-hidden mb-3 border border-slate-800">
                      <img src={imageUrl} alt={prod.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    </div>
                    <div className="flex justify-between items-center text-xs font-mono mb-1">
                      <span className="text-blue-400 font-bold">{prod.code}</span>
                      <span className="text-slate-500">{prod.lot}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-white line-clamp-2">{prod.name}</h4>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Stock: <strong className="text-white">{prod.stock} un.</strong></span>
                    <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded">Vender →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRO DE MOVIMIENTO RÁPIDO CON FOTO ENCABEZADO */}
      {/* ========================================================================= */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white bg-slate-800/60 p-2 rounded-full z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header with Photo Thumbnail */}
            <div className="flex items-start gap-4 pr-8">
              <img
                src={getProductImage(selectedProduct)}
                alt={selectedProduct.name}
                className="w-20 h-20 object-cover rounded-2xl border border-slate-700 shrink-0 shadow"
              />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  {selectedProduct.code} • LOTE: {selectedProduct.lot}
                </span>
                <h3 className="text-base font-bold text-white mt-1 leading-snug line-clamp-2">
                  {selectedProduct.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>{selectedProduct.location}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold">{selectedProduct.stock} en stock</span>
                </div>
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
      {/* MODAL: CREAR NUEVO REPUESTO CON URL/FOTO (Solo Gerencia) */}
      {/* ========================================================================= */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsAddProductOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white bg-slate-800/60 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Crear Nuevo Repuesto con Imagen
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Agrega una foto o URL de internet para que los técnicos reconozcan la pieza en pantalla táctil.
            </p>

            <form onSubmit={handleCreateProduct} className="space-y-3.5 mt-4">
              {/* Product Photo Box & URL Input */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <label className="block text-xs font-bold text-slate-300 uppercase mb-2 flex items-center justify-between">
                  <span>Foto del Repuesto</span>
                  <span className="text-[10px] text-cyan-400 lowercase font-normal">(puedes pegar una URL de Google o usar predeterminada)</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-20 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <div className="flex gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setNewImageUrl(CATEGORY_IMAGES["Válvulas & Controles"])}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                      >
                        Válvula
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewImageUrl(CATEGORY_IMAGES["Bombas, Aceites & Filtros"])}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                      >
                        Aceite / Bomba
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewImageUrl(CATEGORY_IMAGES["Mecánica & Compresores"])}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                      >
                        Compresor
                      </button>
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
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Categoría:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Ubicación:</label>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsStockBreakdownOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white bg-slate-800/60 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  ANALÍTICA EN TIEMPO REAL
                </span>
                <h3 className="text-xl font-bold text-white">Balance Consolidado de Unidades Físicas</h3>
                <p className="text-xs text-slate-400">
                  Distribución exacta de las <strong>{metrics.totalStockUnits.toLocaleString()} existencias físicas</strong> registradas.
                </p>
              </div>
            </div>

            {/* Top 3 Location Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Total Consolidado</div>
                <div className="text-2xl font-black text-white mt-1">
                  {metrics.totalStockUnits.toLocaleString()} <span className="text-xs font-normal text-slate-400">un.</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">357 repuestos distintos</div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div className="text-[11px] text-emerald-400 uppercase font-semibold flex items-center justify-between">
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

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <div className="text-[11px] text-cyan-400 uppercase font-semibold flex items-center justify-between">
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
            <div className="mt-5 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-300 uppercase block tracking-wider">
                Distribución Física por Categorías Técnicas
              </span>
              <div className="space-y-2.5">
                {stockBreakdown.categoriesStats.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">{cat.name} ({cat.count} ítems)</span>
                      <span className="font-mono font-bold text-white">
                        {cat.units.toLocaleString()} un. <span className="text-emerald-400 text-[10px]">({cat.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
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
            <div className="mt-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase block tracking-wider mb-2">
                Top 5 Repuestos con Mayor Volumen de Stock
              </span>
              <div className="divide-y divide-slate-800/80">
                {stockBreakdown.topProducts.map((p) => (
                  <div key={p.id} className="py-1.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="font-mono text-cyan-400 font-bold mr-1.5">{p.code}</span>
                      <span className="text-white truncate">{p.name}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">({p.location})</span>
                    </div>
                    <span className="font-bold text-emerald-400 font-mono shrink-0">{p.stock} un.</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t border-slate-800 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedLocation("Bodega Central");
                  setIsStockBreakdownOpen(false);
                  setGerenciaSubTab("inventario");
                  setToastMessage("Filtrando: Solo Bodega Central");
                  setTimeout(() => setToastMessage(null), 2500);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Filtrar Oficina Matriz
              </button>
              <button
                type="button"
                onClick={() => setIsStockBreakdownOpen(false)}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsTransfersModalOpen(false)}
              className="absolute right-5 top-5 text-slate-400 hover:text-white bg-slate-800/60 p-2 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                  LOGÍSTICA INTERNA
                </span>
                <h3 className="text-xl font-bold text-white">Traspasos entre Bodega Central y Oficina Matriz</h3>
                <p className="text-xs text-slate-400">
                  Control de envíos de repuestos para evitar pérdidas durante el traslado entre sucursales.
                </p>
              </div>
            </div>

            {/* List of current transfers */}
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
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
                    className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-cyan-400 border border-slate-800">
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
                      <div className="text-xs font-semibold text-white">
                        {t.quantity}x {t.productName} <span className="text-cyan-400 font-mono">({t.productCode})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{t.from}</span>
                        <span className="text-cyan-400">→</span>
                        <strong className="text-white">{t.to}</strong>
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
            <form onSubmit={handleCreateNewTransfer} className="mt-5 bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                + Despachar Nuevo Traspaso entre Almacenes
              </span>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Repuesto a enviar:</label>
                  <select
                    value={newTransferProductCode}
                    onChange={(e) => setNewTransferProductCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
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
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white text-center font-bold"
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

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTransfersModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
