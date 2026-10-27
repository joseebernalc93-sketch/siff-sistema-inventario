"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Banknote,
  BarChart3,
  DollarSign,
  Boxes,
  CalendarClock,
  ChevronDown,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  FileUp,
  Folder,
  FolderOpen,
  History,
  ImagePlus,
  Info,
  KeyRound,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  Loader2,
  LogIn,
  LogOut,
  Mail,
  MessageSquareText,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tags,
  Trash2,
  Truck,
  Users,
  X,
  Settings,
} from "lucide-react";
import ProjectInfoPanel from "@/components/project-info-panel";
import OrdersModule from "@/components/orders-module";
import CashHandoversModule from "@/components/cash-handovers-module";
import SettingsModule from "@/components/settings-module";
import {
  findSimilarCategory,
  slugifyCategory,
} from "@/lib/category-matching";
import { mockCategories, mockProducts } from "@/lib/mock-data";
import {
  findDuplicateProduct,
  normalizeProductName,
  normalizeProductSku,
  PRODUCT_DUPLICATE_MESSAGE,
} from "@/lib/product-matching";
import {
  calculateProductMargin,
  formatProductMinimumStock,
  formatProductQuantity,
  formatProductStock,
  getProductInventoryCost,
  getProductUnitCost,
  getProductInventorySaleValue,
  getProductPresentation,
  getProductPresentations,
  getSaleValuePerInventoryUnit,
  getStockAdjustmentStep,
  isWeightBasedProduct,
  normalizeMoney,
  normalizeOptionalMoney,
  normalizeProductMeasurementUnit,
} from "@/lib/pricing";
import { validateIdentity, validatePhone, getEcuadorianProvinceFromPhone, validateEmail } from "@/lib/validations";
import type {
  Category,
  InvoiceRecord,
  MobileClientRecord,
  Product,
  ProductLot,
  ProductMeasurementUnit,
  ProductPresentation,
  ProductPurchaseHistoryRecord,
  ProductProvider,
  Provider,
  AdminOrderRecord,
} from "@/lib/types";
import * as XLSX from "xlsx-js-style";

const ADMIN_SESSION_KEY = "minimarket_admin_session";
const ADMIN_NAV_ORDER_KEY = "minimarket_admin_nav_order_v2";
const ADMIN_ACTIVE_SECTION_KEY = "minimarket_admin_active_section";
const ADMIN_SELECTED_CATEGORY_KEY = "minimarket_admin_selected_category";
const ADMIN_SELECTED_PROVIDER_KEY = "minimarket_admin_selected_provider";
const ADMIN_SELECTED_INVOICE_KEY = "minimarket_admin_selected_invoice";
const ADMIN_SCROLL_POSITIONS_KEY = "minimarket_admin_scroll_positions";
const ADMIN_CATALOG_PRODUCTS_OPEN_KEY = "minimarket_admin_catalog_products_open";
const ADMIN_SEARCH_KEY = "minimarket_admin_search";
const ADMIN_CATEGORY_SEARCH_KEY = "minimarket_admin_category_search";
const ADMIN_PROVIDER_SEARCH_KEY = "minimarket_admin_provider_search";
const ADMIN_INVOICE_SEARCH_KEY = "minimarket_admin_invoice_search";
const ADMIN_SALES_TAB_KEY = "minimarket_admin_sales_tab";
const ADMIN_PRODUCT_FORM_KEY = "minimarket_admin_product_form";
const BULK_DELETE_CATEGORY_ID = "__bulk_categories__";
const BULK_DELETE_PRODUCT_ID = "__bulk_products__";
const BULK_DELETE_PROVIDER_ID = "__bulk_providers__";
const CATEGORY_DUPLICATE_MESSAGE = "Categoria Duplicada";
const COMMERCIAL_QUINTAL_TO_POUNDS = 100;
const KILOGRAM_TO_POUNDS = 2.20462;
const DEFAULT_BULK_STOCK_INPUT_UNIT: BulkStockInputUnit = "qq";
const DEFAULT_STOCK_PRESENTATION_ID = "__stock_unit__";
const SHOW_CATALOG_FILE_ACTIONS = false;

const PRODUCT_MEASUREMENT_OPTIONS: Array<{
  value: ProductMeasurementUnit;
  label: string;
}> = [
  { value: "unit", label: "Individual" },
  { value: "lb", label: "Al Granel" },
];

const BULK_STOCK_INPUT_UNIT_OPTIONS: Array<{
  value: BulkStockInputUnit;
  label: string;
}> = [
  { value: "qq", label: "Quintales" },
  { value: "kg", label: "Kilos" },
  { value: "lb", label: "Libras" },
];

const MOBILE_CLIENT_STATUS_OPTIONS = [
  { value: "active", label: "Activo" },
  { value: "blocked", label: "Bloqueado" },
  { value: "pending_review", label: "Pendiente" },
];

function LoginMarketLogo() {
  return (
    <img 
      src="/logo.png" 
      alt="Minimarket Logo" 
      className="login-market-logo-svg" 
      style={{ objectFit: 'contain', width: '100%', height: '100%' }}
    />
  );
}

type AdminSection =
  | "overview"
  | "information"
  | "categories"
  | "product"
  | "catalog"
  | "create-product"
  | "purchases"
  | "history"
  | "channels"
  | "billing"
  | "providers"
  | "customers"
  | "orders"
  | "settings";

const DEFAULT_ADMIN_NAV_ORDER: AdminSection[] = [
  "overview",
  "information",
  "categories",
  "catalog",
  "create-product",
  "purchases",
  "history",
  "providers",
  "customers",
  "orders",
  "settings",
];

const ALL_ADMIN_SECTIONS: AdminSection[] = [
  ...DEFAULT_ADMIN_NAV_ORDER,
  "channels",
  "billing",
  "product",
];

type StorageMode = "demo" | "supabase";
type BulkStockInputUnit = "qq" | "kg" | "lb";
type ViewMode = "list" | "grid";
type SortDirection = "asc" | "desc";
type ProductLotStatus = "available" | "depleted" | "returned" | "adjusted";

type InventoryHistoryConcept = "compra" | "venta";
type InventoryHistoryMovementFilter = "all" | InventoryHistoryConcept;
type InventoryHistoryPeriodFilter = "all" | "day" | "month" | "range";
type InvoicePeriodFilter = "all" | "day" | "month" | "range";
type InvoicePaymentFilter = "all" | "efectivo" | "transferencia";
type InvoiceDeliveryFilter = "all" | "pickup" | "delivery" | "cancelled";
type InventoryHistorySortableColumn = "product_name" | "registered_at" | "sold_at";
type InventoryHistorySortKey = InventoryHistorySortableColumn | "movement_time";
type InventoryHistorySort = {
  key: InventoryHistorySortKey;
  direction: SortDirection;
};

type InventoryHistoryRow = {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  provider_name: string | null;
  registered_at: string | null;
  sold_at: string | null;
  concept: InventoryHistoryConcept;
  measurement_unit: ProductMeasurementUnit;
  entry_quantity: number | null;
  entry_unit_value: number | null;
  entry_total: number | null;
  entry_total_with_iva?: number | null;
  entry_presentation_unit?: string | null;
  entry_base_price?: number | null;
  entry_retail_price?: number | null;
  entry_unit_base_price?: number | null;
  entry_unit_retail_price?: number | null;
  exit_quantity: number | null;
  exit_unit_cost?: number | null;
  exit_total_cost?: number | null;
  exit_unit_value: number | null;
  exit_unit_value_with_iva?: number | null;
  exit_total: number | null;
  exit_total_with_iva?: number | null;
  exit_presentation_unit?: string | null;
  sort_time: number;
};

type PurchaseInvoiceHistoryGroup = {
  id: string;
  purchase_code: string | null;
  invoice_number: string | null;
  purchase_date: string | null;
  created_at: string;
  provider_id: string | null;
  provider_name: string | null;
  payment_method: string | null;
  credit_days: number | null;
  gross_subtotal: number;
  discount_amount: number;
  subtotal: number;
  iva_amount: number;
  total: number;
  lines: ProductPurchaseHistoryRecord[];
};

type AdminComboboxOption = {
  id: string;
  label: string;
  description?: string;
  badge?: string;
};

type ProductForm = {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  sku: string;
  product_code: string;
  description: string;
  purchase_cost: string;
  purchase_cost_input_unit: BulkStockInputUnit;
  price: string;
  measurement_unit: ProductMeasurementUnit;
  stock: string;
  stock_presentation_id: string;
  stock_input_unit: BulkStockInputUnit;
  min_stock: string;
  min_stock_presentation_id: string;
  min_stock_input_unit: BulkStockInputUnit;
  max_stock: string;
  max_stock_presentation_id: string;
  max_stock_input_unit: BulkStockInputUnit;
  image_url: string;
  provider: string;
  is_active: boolean;
  has_iva: boolean;
  iva_rate: string;
  requires_dates: boolean;
  entry_date: string;
  manufacture_date: string;
  expiration_date: string;
  presentations: ProductPresentationDraft[];
};

type ProductPurchaseForm = {
  provider: string;
  purchase_presentation_id: string;
  purchase_presentation_name: string;
  purchase_presentation_unit_quantity: string;
  quantity: string;
  quantity_input_unit: BulkStockInputUnit;
  purchase_cost: string;
  price: string;
  entry_date: string;
  manufacture_date: string;
  expiration_date: string;
};

type ProductPresentationDraft = {
  id: string;
  name: string;
  unit_quantity: string;
  price: string;
  is_default: boolean;
  is_active: boolean;
  use_for_purchase: boolean;
  use_for_sale: boolean;
};

type ProductPresentationPayload = {
  id?: string | null;
  name: string;
  unit_quantity: number;
  price: number;
  is_default: boolean;
  is_active: boolean;
  use_for_purchase: boolean;
  use_for_sale: boolean;
};

type ProductStockPresentationOption = {
  id: string;
  name: string;
  unitQuantity: number;
};

type ProviderForm = {
  name: string;
  ruc: string;
  email: string;
  address: string;
  phone: string;
  notes: string;
};

type MobileClientForm = {
  full_name: string;
  identity_number: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  role: string;
  password: string;
  confirm_password: string;
};

type ExcelProductValue = string | number | boolean | Date | null | undefined;

type ExcelProductRow = Record<string, ExcelProductValue>;

type CatalogExcelRow = {
  __categoryId?: string;
  __rowType: "product" | "category";
  Nombre: string;
  "Codigo Interno": string;
  Descripcion: string;
  "Costo Compra": number | "";
  Precio: number | "";
  "Unidad Medida": string;
  Stock: number | "";
  "Stock Minimo": number | "";
  "Stock Maximo": number | "";
  Categoria: string;
  Proveedor: string;
  "Fecha Ingreso": string;
  "Fecha Fabricacion": string;
  "Fecha Caducidad": string;
  Imagen: string;
};

type CatalogExcelColumn = Exclude<
  keyof CatalogExcelRow,
  "__categoryId" | "__rowType"
>;

const CATALOG_EXCEL_COLUMNS: CatalogExcelColumn[] = [
  "Nombre",
  "Codigo Interno",
  "Descripcion",
  "Costo Compra",
  "Precio",
  "Unidad Medida",
  "Stock",
  "Stock Minimo",
  "Stock Maximo",
  "Categoria",
  "Proveedor",
  "Fecha Ingreso",
  "Fecha Fabricacion",
  "Fecha Caducidad",
  "Imagen",
];

type ProviderSummary = {
  id?: string;
  name: string;
  ruc?: string | null;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
  products: Product[];
  activeCount: number;
  lowStockCount: number;
  inventoryValue: number;
  lastPurchaseCost: number | null;
  lastPurchaseAt: string | null;
};

type SavedProductPrompt = Pick<Product, "category_id" | "name" | "provider" | "sku">;

type PurchasePaymentMethod = "cash" | "credit";

type PurchaseInvoiceLineDraft = {
  id: string;
  product_id: string;
  product_search: string;
  purchase_presentation_id: string;
  custom_presentation_name: string;
  custom_presentation_quantity: string;
  quantity: string;
  quantity_input_unit: BulkStockInputUnit;
  cost: string;
  discount_rate: string;
  iva_rate: string;
  pvp_without_iva: string;
  base_price_without_iva: string;
  manufacture_date: string;
  expiration_date: string;
};

const emptyProductForm: ProductForm = {
  id: "",
  category_id: "",
  category_name: "",
  name: "",
  sku: "",
  product_code: "",
  description: "",
  purchase_cost: "",
  purchase_cost_input_unit: DEFAULT_BULK_STOCK_INPUT_UNIT,
  price: "",
  measurement_unit: "unit",
  stock: "0",
  stock_presentation_id: DEFAULT_STOCK_PRESENTATION_ID,
  stock_input_unit: DEFAULT_BULK_STOCK_INPUT_UNIT,
  min_stock: "5",
  min_stock_presentation_id: DEFAULT_STOCK_PRESENTATION_ID,
  min_stock_input_unit: "lb",
  max_stock: "100",
  max_stock_presentation_id: DEFAULT_STOCK_PRESENTATION_ID,
  max_stock_input_unit: DEFAULT_BULK_STOCK_INPUT_UNIT,
  image_url: "",
  provider: "",
  is_active: true,
  has_iva: false,
  iva_rate: "15",
  requires_dates: false,
  entry_date: "",
  manufacture_date: "",
  expiration_date: "",
  presentations: [],
};

const emptyProviderForm: ProviderForm = {
  name: "",
  ruc: "",
  email: "",
  address: "",
  phone: "",
  notes: "",
};

export default function AdminDashboard() {
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [productForm, setProductForm] =
    useState<ProductForm>(emptyProductForm);
  const [purchaseProduct, setPurchaseProduct] = useState<Product | null>(null);
  const [purchaseForm, setPurchaseForm] = useState<ProductPurchaseForm>(() =>
    createProductPurchaseForm(),
  );
  const [purchaseInvoiceCode, setPurchaseInvoiceCode] = useState(() =>
    createPurchaseCode(),
  );
  const [purchaseInvoiceProvider, setPurchaseInvoiceProvider] = useState("");
  const [purchaseInvoiceDate, setPurchaseInvoiceDate] = useState(
    () => getTodayInputDate(),
  );
  const [purchaseInvoiceNumber, setPurchaseInvoiceNumber] = useState("");
  const [purchasePaymentMethod, setPurchasePaymentMethod] =
    useState<PurchasePaymentMethod>("cash");
  const [purchaseCreditIssueDate, setPurchaseCreditIssueDate] = useState(
    () => getTodayInputDate(),
  );
  const [purchaseCreditDueDate, setPurchaseCreditDueDate] = useState("");
  const [purchaseInvoiceLines, setPurchaseInvoiceLines] = useState<
    PurchaseInvoiceLineDraft[]
  >(() => [createPurchaseInvoiceLine()]);
  const [providerForm, setProviderForm] =
    useState<ProviderForm>(emptyProviderForm);
  const [newCategory, setNewCategory] = useState("");
  const [search, setSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [overviewStockAlertsOpen, setOverviewStockAlertsOpen] = useState(false);
  const [overviewExpiringProductsOpen, setOverviewExpiringProductsOpen] =
    useState(false);
  const [overviewRecentProductsOpen, setOverviewRecentProductsOpen] =
    useState(false);
  const [catalogProductViewMode, setCatalogProductViewMode] =
    useState<ViewMode>("list");
  const [categoryViewMode, setCategoryViewMode] =
    useState<ViewMode>("grid");
  const [providerViewMode, setProviderViewMode] =
    useState<ViewMode>("list");
  const [historyInvoicesOpen, setHistoryInvoicesOpen] = useState(false);
  const [historyMovementsOpen, setHistoryMovementsOpen] = useState(false);
  const [historyOrder, setHistoryOrder] = useState<string[]>([
    "invoices",
    "movements",
  ]);
  const [draggingHistoryItem, setDraggingHistoryItem] = useState<string | null>(
    null,
  );
  const [dragOverHistoryItem, setDragOverHistoryItem] = useState<string | null>(
    null,
  );
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [stockAlertMessage, setStockAlertMessage] = useState<string | null>(null);

  async function loadRemoteOrders() {
    try {
      const response = await fetch("/api/admin/orders");
      const data = await response.json();
      const orders = Array.isArray(data.orders)
        ? (data.orders as Array<{ status?: string }>)
        : [];
      const pendingCount = orders.filter((order) => order.status === "pending").length;
      setPendingOrdersCount(pendingCount);
    } catch (error) {
      console.error("Failed to load orders", error);
    }
  }
  const [catalogProductsOpen, setCatalogProductsOpen] = useState(false);
  const [savedProductPrompt, setSavedProductPrompt] =
    useState<SavedProductPrompt | null>(null);
  const [nextProductCategoryId, setNextProductCategoryId] = useState("");
  const [nextProductProviderName, setNextProductProviderName] = useState("");
  const [activeSection, setActiveSection] =
    useState<AdminSection>("overview");
  const [salesTab, setSalesTab] = useState<"orders" | "billing" | "transfers" | "cash-handovers">("orders");
  const [navOrder, setNavOrder] = useState<AdminSection[]>(
    DEFAULT_ADMIN_NAV_ORDER,
  );
  const [draggingNavItem, setDraggingNavItem] =
    useState<AdminSection | null>(null);
  const [dragOverNavItem, setDragOverNavItem] =
    useState<AdminSection | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedCategoryProductIds, setSelectedCategoryProductIds] = useState<
    string[]
  >([]);
  const [selectedCatalogProductIds, setSelectedCatalogProductIds] = useState<
    string[]
  >([]);
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [selectedProviderName, setSelectedProviderName] = useState("");
  const [providerSearch, setProviderSearch] = useState("");
  const [providerFormOpen, setProviderFormOpen] = useState(false);
  const [providerEmailTouched, setProviderEmailTouched] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [editingProviderOriginalName, setEditingProviderOriginalName] =
    useState("");
  const [creatingProvider, setCreatingProvider] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [purchaseHistory, setPurchaseHistory] = useState<
    ProductPurchaseHistoryRecord[]
  >([]);
  const [mobileClients, setMobileClients] = useState<MobileClientRecord[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [billingFilter, setBillingFilter] = useState<InvoicePaymentFilter>("all");
  const [invoiceDeliveryFilter, setInvoiceDeliveryFilter] =
    useState<InvoiceDeliveryFilter>("all");
  const [invoicePeriodFilter, setInvoicePeriodFilter] = useState<InvoicePeriodFilter>("all");
  const [invoiceDateFilter, setInvoiceDateFilter] = useState("");
  const [invoiceEndDateFilter, setInvoiceEndDateFilter] = useState("");
  const [historyProductSearch, setHistoryProductSearch] = useState("");
  const [historyProviderSearch, setHistoryProviderSearch] = useState("");
  const [purchaseInvoiceHistorySearch, setPurchaseInvoiceHistorySearch] =
    useState("");
  const [purchaseInvoicePeriodFilter, setPurchaseInvoicePeriodFilter] = useState<InvoicePeriodFilter>("all");
  const [purchaseInvoiceDateFilter, setPurchaseInvoiceDateFilter] = useState("");
  const [purchaseInvoiceEndDateFilter, setPurchaseInvoiceEndDateFilter] = useState("");
  const [selectedInvoiceGroupIds, setSelectedInvoiceGroupIds] = useState<
    string[]
  >([]);
  const [deletingInvoices, setDeletingInvoices] = useState(false);
  const [
    selectedPurchaseHistoryInvoice,
    setSelectedPurchaseHistoryInvoice,
  ] = useState<PurchaseInvoiceHistoryGroup | null>(null);
  const [historyMovementFilter, setHistoryMovementFilter] =
    useState<InventoryHistoryMovementFilter>("all");
  const [historyDateFilter, setHistoryDateFilter] = useState("");
  const [historyEndDateFilter, setHistoryEndDateFilter] = useState("");
  const [historyPeriodFilter, setHistoryPeriodFilter] =
    useState<InventoryHistoryPeriodFilter>("all");
  const [inventoryHistorySort, setInventoryHistorySort] =
    useState<InventoryHistorySort>({
      key: "movement_time",
      direction: "asc",
    });
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedSalesInvoiceIds, setSelectedSalesInvoiceIds] = useState<string[]>([]);
  const [deletingSalesInvoices, setDeletingSalesInvoices] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingPurchaseHistory, setLoadingPurchaseHistory] = useState(false);
  const [loadingMobileClients, setLoadingMobileClients] = useState(false);
  const [invoiceActionId, setInvoiceActionId] = useState("");
  const [generatingReceiptPdfId, setGeneratingReceiptPdfId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState("");
  const [deletingImage, setDeletingImage] = useState(false);
  const previewObjectUrlRef = useRef("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPurchase, setSavingPurchase] = useState(false);
  const [pendingPurchaseConfirmation, setPendingPurchaseConfirmation] = useState<{
    purchaseCode: string;
    providerName: string;
    productCount: number;
  } | null>(null);
  const [clearingCatalog, setClearingCatalog] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  );
  const [deletingProductLotId, setDeletingProductLotId] = useState<string | null>(
    null,
  );
  const [deletingProviderId, setDeletingProviderId] = useState<string | null>(
    null,
  );
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [storageMode, setStorageMode] = useState<StorageMode>("demo");
  const restoredScrollRef = useRef(false);
  const canRememberScrollRef = useRef(false);

  const isDemo = storageMode === "demo";

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const visibleProducts = term
      ? products.filter((product) =>
          [
            product.name,
            product.sku,
            product.product_code ?? "",
            product.description ?? "",
          ]
            .join(" ")
            .toLowerCase()
            .includes(term),
        )
      : products;

    return sortCatalogProductsByName(visibleProducts);
  }, [products, search]);

  const filteredCategories = useMemo(() => {
    const term = categorySearch.trim().toLowerCase();

    if (!term) {
      return categories;
    }

    return categories.filter((category) =>
      category.name.toLowerCase().includes(term),
    );
  }, [categories, categorySearch]);

  const totals = useMemo(() => {
    const active = products.filter((product) => product.is_active);
    const lowStock = active.filter(
      (product) => product.stock <= product.min_stock,
    );
    const inventoryValue = active.reduce(
      (sum, product) => sum + getProductInventorySaleValue(product),
      0,
    );
    const inventoryCost = active.reduce(
      (sum, product) => sum + getProductInventoryCost(product),
      0,
    );

    return {
      active: active.length,
      inventoryCost,
      lowStock: lowStock.length,
      potentialGrossProfit: inventoryValue - inventoryCost,
      inventoryValue,
    };
  }, [products]);

  const todaySales = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeToday = invoices.filter((invoice) => {
      if (invoice.status === "cancelled") return false;
      const date = new Date(invoice.created_at);
      date.setHours(0, 0, 0, 0);
      return date.getTime() === today.getTime();
    });

    const productsSold = activeToday.reduce(
      (sum, invoice) =>
        sum + invoice.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );

    const totalSales = activeToday.reduce(
      (sum, invoice) => sum + invoice.total,
      0,
    );

    return { productsSold, totalSales };
  }, [invoices]);

  const lowStockProducts = useMemo(
    () =>
      products
        .filter((product) => product.is_active && product.stock <= product.min_stock)
        .sort((first, second) => {
          const missingDifference =
            getLowStockMissingQuantity(second) - getLowStockMissingQuantity(first);

          return missingDifference || first.name.localeCompare(second.name);
        }),
    [products],
  );
  const expirationAlertProducts = useMemo(
    () => getExpirationAlertProducts(products),
    [products],
  );
  const expiredProductCount = useMemo(
    () => expirationAlertProducts.filter((entry) => entry.isExpired).length,
    [expirationAlertProducts],
  );
  const upcomingExpirationCount =
    expirationAlertProducts.length - expiredProductCount;

  const latestProducts = useMemo(() => products.slice(0, 12), [products]);
  const latestPurchases = useMemo(() => purchaseHistory.slice(0, 12), [purchaseHistory]);
  const [overviewRecentPurchasesOpen, setOverviewRecentPurchasesOpen] =
    useState(false);
  const catalogExcelRows = useMemo(
    () => buildCatalogExcelRows(products, categories),
    [categories, products],
  );
  const selectedCategory = useMemo(
    () =>
      categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );
  const selectedCategoryProducts = useMemo(
    () =>
      selectedCategory
        ? products.filter((product) => product.category_id === selectedCategory.id)
        : [],
    [products, selectedCategory],
  );
  const selectedCategoryProductIdsSet = useMemo(
    () => new Set(selectedCategoryProductIds),
    [selectedCategoryProductIds],
  );
  const selectedCatalogProductIdsSet = useMemo(
    () => new Set(selectedCatalogProductIds),
    [selectedCatalogProductIds],
  );
  const selectedCategorySelectedProducts = useMemo(
    () =>
      selectedCategoryProducts.filter((product) =>
        selectedCategoryProductIdsSet.has(product.id),
      ),
    [selectedCategoryProductIdsSet, selectedCategoryProducts],
  );
  const selectedCatalogProducts = useMemo(
    () =>
      products.filter((product) => selectedCatalogProductIdsSet.has(product.id)),
    [products, selectedCatalogProductIdsSet],
  );
  const selectedVisibleCatalogProducts = useMemo(
    () =>
      filteredProducts.filter((product) =>
        selectedCatalogProductIdsSet.has(product.id),
      ),
    [filteredProducts, selectedCatalogProductIdsSet],
  );
  const allCategoryProductsSelected =
    selectedCategoryProducts.length > 0 &&
    selectedCategorySelectedProducts.length === selectedCategoryProducts.length;
  const allVisibleCatalogProductsSelected =
    filteredProducts.length > 0 &&
    selectedVisibleCatalogProducts.length === filteredProducts.length;
  const selectedCategoryIdsSet = useMemo(
    () => new Set(selectedCategoryIds),
    [selectedCategoryIds],
  );
  const selectedCategories = useMemo(
    () =>
      categories.filter((category) => selectedCategoryIdsSet.has(category.id)),
    [categories, selectedCategoryIdsSet],
  );
  const allCategoriesSelected =
    filteredCategories.length > 0 &&
    filteredCategories.every((category) =>
      selectedCategoryIdsSet.has(category.id),
    );
  const productFormCategory = useMemo(
    () =>
      categories.find((category) => category.id === productForm.category_id) ??
      null,
    [categories, productForm.category_id],
  );
  const productCategoryInputValue =
    productForm.category_name || productFormCategory?.name || "";
  const productCategoryComboboxOptions = useMemo(
    () => buildCategoryComboboxOptions(categories, productCategoryInputValue),
    [categories, productCategoryInputValue],
  );
  const isCreateProductSection = activeSection === "create-product";
  const isPurchasesSection = activeSection === "purchases";
  const isProductCreationSection = isProductCreationAdminSection(activeSection);
  const isPurchasesProductCreation =
    isPurchasesSection && !productForm.id;
  const productNameCandidateProducts = useMemo(
    () =>
      isPurchasesProductCreation && productForm.category_id
        ? products.filter(
            (product) => product.category_id === productForm.category_id,
          )
        : products,
    [isPurchasesProductCreation, productForm.category_id, products],
  );
  const productNameComboboxOptions = useMemo(
    () =>
      buildProductComboboxOptions(
        productNameCandidateProducts,
        productForm.name,
      ),
    [productForm.name, productNameCandidateProducts],
  );
  const generatedProductSku = useMemo(
    () =>
      generateUniqueProductSku(products, {
        categoryName: productFormCategory?.name ?? "",
        currentProductId: productForm.id,
        productName: productForm.name,
      }),
    [productForm.id, productForm.name, productFormCategory?.name, products],
  );
  const isProductSkuAuto = !productForm.id;
  const productSkuDisplayValue = isProductSkuAuto
    ? generatedProductSku
    : productForm.sku;
  const productSkuDuplicate = useMemo(
    () =>
      findProductSkuDuplicate(products, productSkuDisplayValue, productForm.id),
    [productForm.id, productSkuDisplayValue, products],
  );
  const hasProductSkuConflict = Boolean(
    productSkuDisplayValue && productSkuDuplicate,
  );
  const imagePreviewUrl = localImagePreviewUrl || productForm.image_url.trim();
  const productPricingPreview = useMemo(
    () => buildProductPricingPreview(productForm),
    [productForm],
  );
  const productFormMeasurementUnit = normalizeProductMeasurementUnit(
    productForm.measurement_unit,
  );
  const productUnitCopy = getProductUnitCopy(productFormMeasurementUnit);
  const isBulkProductForm = productFormMeasurementUnit === "lb";
  const isEditingProductForm = Boolean(productForm.id);
  const productStockLabel = "Stock";
  const productStockInputUnit = normalizeBulkStockInputUnit(
    productForm.stock_input_unit,
  );
  const productMinStockInputUnit = normalizeBulkStockInputUnit(
    productForm.min_stock_input_unit,
  );
  const productMaxStockInputUnit = normalizeBulkStockInputUnit(
    productForm.max_stock_input_unit,
  );
  const productStockPoundsInfo = isBulkProductForm
    ? getBulkStockPoundsInfo(productForm.stock, productStockInputUnit)
    : "";
  const productMinStockPoundsInfo = isBulkProductForm
    ? getBulkStockPoundsInfo(productForm.min_stock, productMinStockInputUnit)
    : "";
  const productMaxStockPoundsInfo = isBulkProductForm
    ? getBulkStockPoundsInfo(productForm.max_stock, productMaxStockInputUnit)
    : "";
  const purchaseProductMeasurementUnit = normalizeProductMeasurementUnit(
    purchaseProduct?.measurement_unit,
  );
  const purchaseUnitCopy = getProductUnitCopy(purchaseProductMeasurementUnit);
  const isBulkPurchaseProduct =
    Boolean(purchaseProduct) && purchaseProductMeasurementUnit === "lb";
  const purchaseProductRequiresDates = doesProductRequireDates(purchaseProduct);
  const purchaseQuantityInputUnit = normalizeBulkStockInputUnit(
    purchaseForm.quantity_input_unit,
  );
  const purchaseQuantityPoundsInfo = isBulkPurchaseProduct
    ? getBulkStockPoundsInfo(purchaseForm.quantity, purchaseQuantityInputUnit)
    : "";
  const productFormPresentations = useMemo(
    () => getProductPresentationDrafts(productForm),
    [productForm],
  );
  const editingProduct = useMemo(
    () =>
      productForm.id
        ? products.find((product) => product.id === productForm.id) ?? null
        : null,
    [productForm.id, products],
  );
  const editingProductLots = useMemo(
    () => (editingProduct ? getProductLots(editingProduct) : []),
    [editingProduct],
  );
  const productStockPresentationOptions = useMemo(
    () => getProductFormStockPresentationOptions(productForm),
    [productForm],
  );
  const selectedProductStockPresentation = useMemo(
    () => getSelectedProductFormStockPresentation(productForm),
    [productForm],
  );
  const selectedProductMinStockPresentation = useMemo(
    () => getSelectedProductFormMinStockPresentation(productForm),
    [productForm],
  );
  const selectedProductMaxStockPresentation = useMemo(
    () => getSelectedProductFormMaxStockPresentation(productForm),
    [productForm],
  );
  const productStockPresentationInfo =
    !isBulkProductForm && selectedProductStockPresentation.unitQuantity > 1
      ? getPresentationStockInfo(
          productForm.stock,
          selectedProductStockPresentation.unitQuantity,
        )
      : "";
  const productMinStockPresentationInfo =
    !isBulkProductForm && selectedProductMinStockPresentation.unitQuantity > 1
      ? getPresentationStockInfo(
          productForm.min_stock,
          selectedProductMinStockPresentation.unitQuantity,
        )
      : "";
  const productMaxStockPresentationInfo =
    !isBulkProductForm && selectedProductMaxStockPresentation.unitQuantity > 1
      ? getPresentationStockInfo(
          productForm.max_stock,
          selectedProductMaxStockPresentation.unitQuantity,
        )
      : "";
  const purchaseProductPresentations = useMemo(
    () =>
      purchaseProduct
        ? getProductPresentations(purchaseProduct, "purchase")
        : [],
    [purchaseProduct],
  );
  const purchasePresentationComboboxOptions = useMemo(
    () =>
      buildProductPresentationComboboxOptions(
        purchaseProductPresentations,
        purchaseForm.purchase_presentation_name,
      ),
    [purchaseForm.purchase_presentation_name, purchaseProductPresentations],
  );
  const selectedPurchasePresentation = useMemo(
    () => {
      if (!purchaseProduct) {
        return null;
      }

      if (purchaseForm.purchase_presentation_id) {
        return getProductPresentation(
          purchaseProduct,
          purchaseForm.purchase_presentation_id,
        );
      }

      return (
        getExactComboboxItem(
          purchaseProductPresentations,
          purchaseForm.purchase_presentation_name,
          (presentation) => presentation.name,
        ) ?? null
      );
    },
    [
      purchaseForm.purchase_presentation_id,
      purchaseForm.purchase_presentation_name,
      purchaseProduct,
      purchaseProductPresentations,
    ],
  );
  const customPurchasePresentationUnitQuantity = getFiniteNumberInput(
    purchaseForm.purchase_presentation_unit_quantity,
    Number(selectedPurchasePresentation?.unit_quantity) || 1,
  );
  const purchasePresentationUnitQuantity =
    isBulkPurchaseProduct
      ? getBulkStockUnitPounds(purchaseQuantityInputUnit)
      : !isBulkPurchaseProduct
      ? Math.max(1, Number(customPurchasePresentationUnitQuantity) || 1)
      : 1;
  const purchasePresentationStockInfo =
    !isBulkPurchaseProduct && purchasePresentationUnitQuantity > 1
      ? getPresentationStockInfo(
          purchaseForm.quantity,
          purchasePresentationUnitQuantity,
        )
      : "";
  const purchasePresentationLabel =
    isBulkPurchaseProduct
      ? getBulkStockInputUnitLabel(purchaseQuantityInputUnit)
      : !isBulkPurchaseProduct && selectedPurchasePresentation
      ? selectedPurchasePresentation.name
      : !isBulkPurchaseProduct && purchaseForm.purchase_presentation_name.trim()
        ? purchaseForm.purchase_presentation_name.trim()
      : "";
  const purchaseCostInputLabel = purchasePresentationLabel
    ? `Costo al distribuidor (${purchasePresentationLabel})`
    : purchaseUnitCopy.purchaseCostLabel;
  const purchaseSalePriceInputLabel = purchasePresentationLabel
    ? `Precio de venta (${purchasePresentationLabel})`
    : purchaseUnitCopy.salePriceLabel;
  const purchaseProductProviderOptions = useMemo(
    () => (purchaseProduct ? getProductLinkedProviderNames(purchaseProduct) : []),
    [purchaseProduct],
  );
  const filteredInvoices = useMemo(() => {
    const term = invoiceSearch.trim().toLowerCase();
    
    let filtered = invoices;

    if (invoicePeriodFilter !== "all" && invoiceDateFilter) {
      filtered = filtered.filter((i) => {
        const dateString = i.created_at;
        if (!dateString) return false;
        const targetDate = new Date(dateString);
        if (Number.isNaN(targetDate.getTime())) return false;
        const filterDateStr = invoiceDateFilter.length === 7 ? `${invoiceDateFilter}-01T00:00:00` : `${invoiceDateFilter}T00:00:00`;
        const filterDate = new Date(filterDateStr);
        if (Number.isNaN(filterDate.getTime())) return true;
        
        const targetY = targetDate.getFullYear();
        const targetM = targetDate.getMonth();
        const targetD = targetDate.getDate();
        const filterY = filterDate.getFullYear();
        const filterM = filterDate.getMonth();
        const filterD = filterDate.getDate();
        
        if (invoicePeriodFilter === "day") {
          return targetY === filterY && targetM === filterM && targetD === filterD;
        }
        if (invoicePeriodFilter === "month") {
          return targetY === filterY && targetM === filterM;
        }
        if (invoicePeriodFilter === "range") {
          const start = new Date(invoiceDateFilter + "T00:00:00");
          let end: Date;
          if (invoiceEndDateFilter) {
            end = new Date(invoiceEndDateFilter + "T23:59:59");
          } else {
            end = new Date();
          }
          return targetDate >= start && targetDate <= end;
        }
        return true;
      });
    }

    if (billingFilter === "efectivo") {
      filtered = filtered.filter(i => {
        const isTransfer = i.payment_method === "transferencia" || i.notes?.includes("METODO_PAGO: TRANSFERENCIA");
        return !isTransfer;
      });
    } else if (billingFilter === "transferencia") {
      filtered = filtered.filter(i => {
        const isTransfer = i.payment_method === "transferencia" || i.notes?.includes("METODO_PAGO: TRANSFERENCIA");
        return isTransfer;
      });
    }

    if (invoiceDeliveryFilter === "pickup") {
      filtered = filtered.filter((invoice) => isPickupInvoice(invoice));
    } else if (invoiceDeliveryFilter === "delivery") {
      filtered = filtered.filter((invoice) => !isPickupInvoice(invoice));
    } else if (invoiceDeliveryFilter === "cancelled") {
      filtered = filtered.filter((invoice) => invoice.status === "cancelled");
    }

    if (!term) {
      return filtered;
    }

    return filtered.filter((invoice) =>
      [
        invoice.invoice_number,
        invoice.customer_name,
        invoice.customer_identity ?? "",
        invoice.customer_phone ?? "",
        invoice.status,
        invoice.channel,
        invoice.items.map((item) => item.product_name).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [invoiceSearch, invoices, billingFilter, invoiceDeliveryFilter, invoicePeriodFilter, invoiceDateFilter, invoiceEndDateFilter]);

  const selectedInvoice = useMemo(
    () =>
      filteredInvoices.find((invoice) => invoice.id === selectedInvoiceId) ??
      filteredInvoices[0] ??
      null,
    [filteredInvoices, selectedInvoiceId],
  );
  const invoiceTotals = useMemo(() => {
    const invoiceCount = filteredInvoices.length;
    const activeInvoices = filteredInvoices.filter(
      (invoice) => invoice.status !== "cancelled",
    );
    const itemCount = activeInvoices.reduce(
      (sum, invoice) =>
        sum + invoice.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    const billedTotal = activeInvoices.reduce(
      (sum, invoice) => sum + invoice.total,
      0,
    );

    return {
      billedTotal,
      invoiceCount,
      itemCount,
    };
  }, [filteredInvoices]);

  const providerSummaries = useMemo<ProviderSummary[]>(() => {
    const providerMap = new Map<
      string,
      {
        id?: string;
        name: string;
        ruc?: string | null;
        address?: string | null;
        phone?: string | null;
        notes?: string | null;
        products: Map<string, Product>;
        lastPurchaseAt: string | null;
        lastPurchaseCost: number | null;
      }
    >();

    providers.forEach((provider) => {
      const providerName = provider.name.trim();
      const key = providerName.toLocaleLowerCase("es-EC");

      if (!key) {
        return;
      }

      providerMap.set(key, {
        id: provider.id,
        name: providerName,
        ruc: provider.ruc ?? null,
        address: provider.address ?? null,
        phone: provider.phone ?? null,
        notes: provider.notes ?? null,
        products: new Map<string, Product>(),
        lastPurchaseAt: null,
        lastPurchaseCost: null,
      });
    });

    products.forEach((product) => {
      const productProviders = getProductLinkedProviderNames(product);

      productProviders.forEach((providerName) => {
        const key = providerName.toLocaleLowerCase("es-EC");
        const current = providerMap.get(key) ?? {
          name: providerName,
          ruc: null,
          address: null,
          phone: null,
          notes: null,
          products: new Map<string, Product>(),
          lastPurchaseAt: null,
          lastPurchaseCost: null,
        };
        const providerLink = getProductProviderLink(product, providerName);

        current.products.set(product.id, product);
        if (
          providerLink?.last_purchase_at &&
          (!current.lastPurchaseAt ||
            providerLink.last_purchase_at > current.lastPurchaseAt)
        ) {
          current.lastPurchaseAt = providerLink.last_purchase_at;
          current.lastPurchaseCost =
            providerLink.last_purchase_cost === undefined ||
            providerLink.last_purchase_cost === null
              ? null
              : Number(providerLink.last_purchase_cost);
        }
        providerMap.set(key, current);
      });
    });

    return Array.from(providerMap.values())
      .map((provider) => {
        const providerProducts = [...provider.products.values()].sort((first, second) =>
          first.name.localeCompare(second.name),
        );
        const activeCount = providerProducts.filter(
          (product) => product.is_active,
        ).length;
        const lowStockCount = providerProducts.filter(
          (product) => product.is_active && product.stock <= product.min_stock,
        ).length;
        const inventoryValue = providerProducts.reduce(
          (sum, product) =>
            sum + getProductProviderInventorySaleValue(product, provider.name),
          0,
        );

        return {
          ...provider,
          products: providerProducts,
          activeCount,
          lowStockCount,
          inventoryValue,
          lastPurchaseAt: provider.lastPurchaseAt,
          lastPurchaseCost: provider.lastPurchaseCost,
        };
      })
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [products, providers]);

  const productProviderComboboxOptions = useMemo(
    () => buildProviderComboboxOptions(providerSummaries, productForm.provider),
    [productForm.provider, providerSummaries],
  );
  const purchaseProviderComboboxOptions = useMemo(
    () =>
      buildProviderComboboxOptions(
        providerSummaries,
        purchaseForm.provider,
        purchaseProductProviderOptions,
      ),
    [providerSummaries, purchaseForm.provider, purchaseProductProviderOptions],
  );
  const purchaseInvoiceProviderComboboxOptions = useMemo(
    () =>
      buildProviderComboboxOptions(
        providerSummaries,
        purchaseInvoiceProvider,
        [],
        providerSummaries.length || 8,
      ),
    [providerSummaries, purchaseInvoiceProvider],
  );
  const purchaseInvoiceAllProviderComboboxOptions = useMemo(
    () =>
      buildProviderComboboxOptions(
        providerSummaries,
        "",
        [],
        providerSummaries.length || 8,
      ),
    [providerSummaries],
  );
  const selectedPurchaseInvoiceProvider = useMemo(
    () =>
      getResolvedComboboxItem(
        providerSummaries,
        purchaseInvoiceProvider,
        (provider) => provider.name,
      ) ?? null,
    [providerSummaries, purchaseInvoiceProvider],
  );
  const calculatedPurchaseCreditDays = useMemo(
    () =>
      purchasePaymentMethod === "credit"
        ? getDateInputDayDifference(
            purchaseCreditIssueDate,
            purchaseCreditDueDate,
          )
        : 0,
    [purchaseCreditDueDate, purchaseCreditIssueDate, purchasePaymentMethod],
  );
  const isPurchaseInvoiceProviderLocked = useMemo(
    () =>
      Boolean(purchaseInvoiceProvider.trim()) &&
      isPurchaseInvoiceInProgress({
        creditDueDate: purchaseCreditDueDate,
        invoiceNumber: purchaseInvoiceNumber,
        lines: purchaseInvoiceLines,
        paymentMethod: purchasePaymentMethod,
      }),
    [
      purchaseCreditDueDate,
      purchaseInvoiceLines,
      purchaseInvoiceNumber,
      purchaseInvoiceProvider,
      purchasePaymentMethod,
    ],
  );
  const purchaseInvoiceProviderProductOptions = useMemo(
    () => products,
    [products],
  );
  const purchaseInvoiceAllProductComboboxOptions = useMemo(
    () =>
      buildProductComboboxOptions(
        purchaseInvoiceProviderProductOptions,
        "",
        purchaseInvoiceProviderProductOptions.length || 8,
      ),
    [purchaseInvoiceProviderProductOptions],
  );
  const purchaseInvoiceTotals = useMemo(
    () => buildPurchaseInvoiceTotals(purchaseInvoiceLines, products),
    [products, purchaseInvoiceLines],
  );
  const shouldShowPurchaseInvoiceIvaColumns = useMemo(
    () =>
      purchaseInvoiceLines.some((line) => {
        const product = products.find((entry) => entry.id === line.product_id);

        return isPurchaseInvoiceIvaProduct(product);
      }),
    [products, purchaseInvoiceLines],
  );
  const shouldShowPurchaseInvoiceDateColumns = useMemo(
    () =>
      purchaseInvoiceLines.some((line) => {
        const product = products.find((entry) => entry.id === line.product_id);

        return doesProductRequireDates(product);
      }),
    [products, purchaseInvoiceLines],
  );
  const shouldShowPurchaseInvoiceProductCode = useMemo(
    () =>
      purchaseInvoiceLines.some((line) => {
        const product = products.find((entry) => entry.id === line.product_id);

        return Boolean(product?.product_code?.trim());
      }),
    [products, purchaseInvoiceLines],
  );
  const shouldShowPurchaseInvoiceSalePriceColumn = useMemo(
    () =>
      !shouldShowPurchaseInvoiceIvaColumns ||
      purchaseInvoiceLines.some((line) => {
        const product = products.find((entry) => entry.id === line.product_id);

        return product ? !isPurchaseInvoiceIvaProduct(product) : true;
      }),
    [products, purchaseInvoiceLines, shouldShowPurchaseInvoiceIvaColumns],
  );
  const historyProductComboboxOptions = useMemo(
    () => buildProductComboboxOptions(products, historyProductSearch, products.length),
    [historyProductSearch, products],
  );
  const historyProviderComboboxOptions = useMemo(
    () => buildProviderComboboxOptions(providerSummaries, historyProviderSearch, [], providerSummaries.length),
    [historyProviderSearch, providerSummaries],
  );
  const selectedHistoryProduct = useMemo(
    () =>
      getExactComboboxItem(products, historyProductSearch, (product) => product.name)
        ?? null,
    [historyProductSearch, products],
  );
  const resolvedHistoryProviderName = useMemo(
    () => getResolvedProviderName(providerSummaries, historyProviderSearch),
    [historyProviderSearch, providerSummaries],
  );
  const selectedHistoryProviderName =
    resolvedHistoryProviderName ?? historyProviderSearch.trim();
  const handleInventoryHistorySort = useCallback(
    (key: InventoryHistorySortableColumn) => {
      setInventoryHistorySort((current) =>
        current.key === key
          ? {
              key,
              direction: current.direction === "asc" ? "desc" : "asc",
            }
          : { key, direction: "asc" },
      );
    },
    [],
  );
  const handleHistoryMovementFilterChange = useCallback((value: string) => {
    const nextFilter = normalizeInventoryHistoryMovementFilter(value);

    setHistoryMovementFilter(nextFilter);
    setInventoryHistorySort((current) => {
      if (nextFilter === "compra" && current.key === "sold_at") {
        return { ...current, key: "registered_at" };
      }

      if (nextFilter === "venta" && current.key === "registered_at") {
        return { ...current, key: "sold_at" };
      }

      return current;
    });
  }, []);
  const inventoryHistoryBaseRows = useMemo(
    () =>
      buildInventoryHistoryRows({
        invoices,
        movementFilter: historyMovementFilter,
        productSearch: historyProductSearch,
        products,
        providerSearch: historyProviderSearch,
        purchases: purchaseHistory,
        dateFilter: historyDateFilter,
        endDateFilter: historyEndDateFilter,
        periodFilter: historyPeriodFilter,
      }),
    [
      historyProductSearch,
      historyProviderSearch,
      historyMovementFilter,
      historyDateFilter,
      historyEndDateFilter,
      historyPeriodFilter,
      invoices,
      products,
      purchaseHistory,
    ],
  );
  const inventoryHistoryRows = useMemo(
    () => sortInventoryHistoryRows(inventoryHistoryBaseRows, inventoryHistorySort),
    [inventoryHistoryBaseRows, inventoryHistorySort],
  );
  const inventoryHistoryTotals = useMemo(
    () => getInventoryHistoryTotals(inventoryHistoryRows),
    [inventoryHistoryRows],
  );
  const purchaseInvoiceHistoryGroups = useMemo(
    () => buildPurchaseInvoiceHistoryGroups(purchaseHistory),
    [purchaseHistory],
  );
  const filteredPurchaseInvoiceHistoryGroups = useMemo(
    () =>
      filterPurchaseInvoiceHistoryGroups(
        purchaseInvoiceHistoryGroups,
        purchaseInvoiceHistorySearch,
        purchaseInvoicePeriodFilter,
        purchaseInvoiceDateFilter,
        purchaseInvoiceEndDateFilter
      ),
    [purchaseInvoiceHistoryGroups, purchaseInvoiceHistorySearch, purchaseInvoicePeriodFilter, purchaseInvoiceDateFilter, purchaseInvoiceEndDateFilter],
  );
  const purchaseInvoiceHistoryTotals = useMemo(
    () => getPurchaseInvoiceHistoryTotals(filteredPurchaseInvoiceHistoryGroups),
    [filteredPurchaseInvoiceHistoryGroups],
  );
  const showInventoryHistoryEntries = historyMovementFilter !== "venta";
  const showInventoryHistoryExits = historyMovementFilter !== "compra";
  const showInventoryHistoryRegisteredAt = historyMovementFilter !== "venta";
  const showInventoryHistorySoldAt = historyMovementFilter !== "compra";
  const selectedHistoryProductProviderStock =
    selectedHistoryProduct && resolvedHistoryProviderName
      ? getProductLotQuantity(selectedHistoryProduct, resolvedHistoryProviderName)
      : null;

  const filteredProviderSummaries = useMemo(() => {
    const term = normalizeCatalogSearchText(providerSearch);

    if (!term) {
      return providerSummaries;
    }

    return providerSummaries.filter((provider) => {
      const providerText = normalizeCatalogSearchText(
        [
          provider.name,
          provider.ruc ?? "",
          provider.address ?? "",
          provider.phone ?? "",
          provider.notes ?? "",
        ].join(" "),
      );

      return providerText.includes(term);
    });
  }, [providerSearch, providerSummaries]);
  const selectedProviderIdsSet = useMemo(
    () => new Set(selectedProviderIds),
    [selectedProviderIds],
  );
  const visibleSelectableProviders = useMemo(
    () => filteredProviderSummaries.filter((provider) => provider.id),
    [filteredProviderSummaries],
  );
  const selectedProviders = useMemo(
    () =>
      providerSummaries.filter(
        (provider) => provider.id && selectedProviderIdsSet.has(provider.id),
      ),
    [providerSummaries, selectedProviderIdsSet],
  );
  const selectedVisibleProviders = useMemo(
    () =>
      visibleSelectableProviders.filter(
        (provider) => provider.id && selectedProviderIdsSet.has(provider.id),
      ),
    [selectedProviderIdsSet, visibleSelectableProviders],
  );
  const allVisibleProvidersSelected =
    visibleSelectableProviders.length > 0 &&
    selectedVisibleProviders.length === visibleSelectableProviders.length;

  const selectedProvider = useMemo(
    () =>
      providerSummaries.find(
        (provider) => provider.name === selectedProviderName,
      ) ?? null,
    [providerSummaries, selectedProviderName],
  );

  const loadRemoteData = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/catalog", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        mode?: StorageMode;
        categories?: Category[];
        products?: Product[];
        providers?: Provider[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el catalogo.");
      }

      setStorageMode(data.mode ?? "demo");
      setCategories(data.categories ?? []);
      setProducts(normalizeProducts(data.products ?? []));
      setProviders(data.providers ?? []);
      // Evitar mostrar el banner inicial "Conectado a Supabase" para no estorbar visualmente
      // setMessage(...)
    } catch (error) {
      setStorageMode("demo");
      setCategories(mockCategories);
      setProducts(mockProducts);
      setProviders([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar el catalogo administrativo.",
      );
    }
  }, []);

  const loadRemoteInvoices = useCallback(async () => {
    setLoadingInvoices(true);

    try {
      const response = await fetch("/api/admin/invoices", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        mode?: StorageMode;
        invoices?: InvoiceRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los comprobantes.");
      }

      setStorageMode(data.mode ?? "demo");
      setInvoices(normalizeInvoices(data.invoices ?? []));
    } catch (error) {
      setInvoices([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los comprobantes.",
      );
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  const loadRemotePurchaseHistory = useCallback(async () => {
    setLoadingPurchaseHistory(true);

    try {
      const response = await fetch("/api/admin/purchases", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        mode?: StorageMode;
        purchases?: ProductPurchaseHistoryRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudo cargar el historial.");
      }

      setStorageMode(data.mode ?? "demo");
      setPurchaseHistory(normalizeProductPurchaseHistory(data.purchases ?? []));
    } catch (error) {
      setPurchaseHistory([]);
      setMessage(
        error instanceof Error ? error.message : "No se pudo cargar el historial.",
      );
    } finally {
      setLoadingPurchaseHistory(false);
    }
  }, []);

  const handleBulkDeleteInvoices = async () => {
    if (selectedInvoiceGroupIds.length === 0) return;

    if (
      !confirm(
        `¿Estás seguro de eliminar ${selectedInvoiceGroupIds.length} factura(s) permanentemente? Esta acción solo limpiará el historial y no afectará el inventario actual.`,
      )
    ) {
      return;
    }

    setDeletingInvoices(true);
    try {
      const allPurchaseIdsToDelete: string[] = [];
      for (const groupId of selectedInvoiceGroupIds) {
        const group = purchaseInvoiceHistoryGroups.find(
          (g) => g.id === groupId,
        );
        if (group) {
          allPurchaseIdsToDelete.push(...group.lines.map((line) => line.id));
        }
      }

      const response = await fetch("/api/admin/purchases/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: allPurchaseIdsToDelete }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "No se pudieron eliminar las facturas.");
      }

      setSelectedInvoiceGroupIds([]);
      await loadRemotePurchaseHistory();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error al eliminar facturas.",
      );
    } finally {
      setDeletingInvoices(false);
    }
  };

  const loadRemoteMobileClients = useCallback(async () => {
    setLoadingMobileClients(true);

    try {
      const response = await fetch("/api/admin/mobile-clients", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        mode?: StorageMode;
        clients?: MobileClientRecord[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "No se pudieron cargar los clientes.");
      }

      setStorageMode(data.mode ?? "demo");
      setMobileClients(data.clients ?? []);
    } catch (error) {
      setMobileClients([]);
      setMessage(
        error instanceof Error ? error.message : "No se pudieron cargar los clientes.",
      );
    } finally {
      setLoadingMobileClients(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }

      setAdminAuthenticated(getStoredAdminSession());
      setNavOrder(getStoredAdminNavOrder());
      setSelectedCategoryId(getStoredAdminValue(ADMIN_SELECTED_CATEGORY_KEY));
      setSelectedProviderName(getStoredAdminValue(ADMIN_SELECTED_PROVIDER_KEY));
      setSelectedInvoiceId(getStoredAdminValue(ADMIN_SELECTED_INVOICE_KEY));
      setSearch(getStoredAdminValue(ADMIN_SEARCH_KEY));
      setCategorySearch(getStoredAdminValue(ADMIN_CATEGORY_SEARCH_KEY));
      setProviderSearch(getStoredAdminValue(ADMIN_PROVIDER_SEARCH_KEY));
      setInvoiceSearch(getStoredAdminValue(ADMIN_INVOICE_SEARCH_KEY));
      setSalesTab(getStoredAdminSalesTab());
      setProductForm(getStoredAdminProductForm() ?? emptyProductForm);
      setCatalogProductsOpen(getStoredAdminBoolean(ADMIN_CATALOG_PRODUCTS_OPEN_KEY));

      setActiveSection(
        getRequestedAdminSection() ?? getStoredAdminActiveSection() ?? "overview",
      );
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    restoredScrollRef.current = false;
    canRememberScrollRef.current = false;
    storeAdminActiveSection(activeSection);
  }, [activeSection, adminAuthenticated]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    storeAdminValue(ADMIN_SELECTED_CATEGORY_KEY, selectedCategoryId);
  }, [adminAuthenticated, selectedCategoryId]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    storeAdminValue(ADMIN_SELECTED_PROVIDER_KEY, selectedProviderName);
  }, [adminAuthenticated, selectedProviderName]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    storeAdminValue(ADMIN_SELECTED_INVOICE_KEY, selectedInvoiceId);
  }, [adminAuthenticated, selectedInvoiceId]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    storeAdminValue(ADMIN_SEARCH_KEY, search);
  }, [adminAuthenticated, search]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    storeAdminValue(ADMIN_CATEGORY_SEARCH_KEY, categorySearch);
  }, [adminAuthenticated, categorySearch]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    storeAdminValue(ADMIN_PROVIDER_SEARCH_KEY, providerSearch);
  }, [adminAuthenticated, providerSearch]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    storeAdminValue(ADMIN_INVOICE_SEARCH_KEY, invoiceSearch);
  }, [adminAuthenticated, invoiceSearch]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    storeAdminValue(ADMIN_SALES_TAB_KEY, salesTab);
  }, [adminAuthenticated, salesTab]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    if (hasProductFormDraft(productForm)) {
      storeAdminProductForm(productForm);
      return;
    }

    clearStoredAdminProductForm();
  }, [adminAuthenticated, productForm]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    storeAdminBoolean(ADMIN_CATALOG_PRODUCTS_OPEN_KEY, catalogProductsOpen);
  }, [adminAuthenticated, catalogProductsOpen]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    function rememberScrollPosition() {
      if (!canRememberScrollRef.current) {
        return;
      }

      storeAdminScrollPosition(activeSection, window.scrollY);
    }

    function rememberVisibleScrollPosition() {
      if (
        document.visibilityState === "hidden" &&
        canRememberScrollRef.current
      ) {
        storeAdminScrollPosition(activeSection, window.scrollY);
      }
    }

    window.addEventListener("scroll", rememberScrollPosition, {
      passive: true,
    });
    window.addEventListener("pagehide", rememberScrollPosition);
    window.addEventListener("beforeunload", rememberScrollPosition);
    document.addEventListener("visibilitychange", rememberVisibleScrollPosition);

    return () => {
      if (canRememberScrollRef.current) {
        storeAdminScrollPosition(activeSection, window.scrollY);
      }

      window.removeEventListener("scroll", rememberScrollPosition);
      window.removeEventListener("pagehide", rememberScrollPosition);
      window.removeEventListener("beforeunload", rememberScrollPosition);
      document.removeEventListener(
        "visibilitychange",
        rememberVisibleScrollPosition,
      );
    };
  }, [activeSection, adminAuthenticated]);

  useEffect(() => {
    if (!adminAuthenticated || loading || restoredScrollRef.current) {
      return;
    }

    const scrollY = getStoredAdminScrollPosition(activeSection);
    if (scrollY <= 0) {
      restoredScrollRef.current = true;
      canRememberScrollRef.current = true;
      return;
    }

    canRememberScrollRef.current = false;
    const delays = [0, 120, 320, 700, 1200];
    const timers = delays.map((delay, index) =>
      window.setTimeout(() => {
        window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });

        if (index === delays.length - 1) {
          restoredScrollRef.current = true;
          canRememberScrollRef.current = true;
        }
      }, delay),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [
    activeSection,
    adminAuthenticated,
    catalogProductsOpen,
    loading,
    products.length,
  ]);

  useEffect(() => {
    if (!adminAuthenticated) {
      return;
    }

    let mounted = true;

    async function initialize() {
      setLoading(true);
      await Promise.all([
        loadRemoteData(),
        loadRemoteInvoices(),
        loadRemoteMobileClients(),
        loadRemoteOrders(),
      ]);
      if (!mounted) return;
      setLoading(false);
    }

    void initialize();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadRemoteData();
        void loadRemoteInvoices();
        void loadRemoteOrders();
      }
    }, 15000);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
    };
  }, [
    adminAuthenticated,
    loadRemoteData,
    loadRemoteInvoices,
    loadRemoteMobileClients,
  ]);

  useEffect(() => {
    if (!adminAuthenticated || (activeSection !== "history" && activeSection !== "overview")) {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadRemotePurchaseHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeSection, adminAuthenticated, loadRemotePurchaseHistory]);

  useEffect(
    () => () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!getDuplicateMessageType(message)) {
      return;
    }

    const dismissDuplicateAlert = () => setMessage("");
    window.addEventListener("keydown", dismissDuplicateAlert);

    return () => {
      window.removeEventListener("keydown", dismissDuplicateAlert);
    };
  }, [message]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cedula,
          password,
        }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        setMessage(data.error ?? "No se pudo iniciar sesion.");
        return;
      }

      window.sessionStorage.setItem(ADMIN_SESSION_KEY, "admin");
      setAdminAuthenticated(true);
      setPassword("");
      setShowPassword(false);
      setMessage("Sesion de administrador iniciada.");
    } catch {
      setMessage("No se pudo conectar con el servidor local.");
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminAuthenticated(false);
    setPassword("");
    setShowPassword(false);
    setMessage("");
  }

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCategory.trim();
    if (!name) {
      return;
    }

    if (findSimilarCategory(categories, name)) {
      setMessage(CATEGORY_DUPLICATE_MESSAGE);
      return;
    }

    setSaving(true);
    setMessage("");

    if (isDemo) {
      const category: Category = {
        id: `cat-${Date.now()}`,
        name,
        slug: slugifyCategory(name),
        description: null,
      };
      setCategories((current) => [...current, category]);
      setNewCategory("");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        mode?: StorageMode;
        category?: Category;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.category) {
        throw new Error(data.error ?? "No se pudo crear la categoria.");
      }

      setStorageMode(data.mode ?? "supabase");
      setNewCategory("");
      await loadRemoteData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo crear la categoria.",
      );
    }

    setSaving(false);
  }

  async function ensureProductFormCategory() {
    const selectedCategory = productForm.category_id
      ? categories.find((category) => category.id === productForm.category_id) ??
        null
      : null;

    if (selectedCategory) {
      return selectedCategory;
    }

    const categoryName = productForm.category_name.trim();

    if (!categoryName) {
      return null;
    }

    const matchedCategory = getResolvedComboboxItem(
      categories,
      categoryName,
      (category) => category.name,
    );

    if (matchedCategory) {
      setProductForm((current) => ({
        ...current,
        category_id: matchedCategory.id,
        category_name: matchedCategory.name,
      }));
      return matchedCategory;
    }

    if (isDemo) {
      const category: Category = {
        id: `cat-${Date.now()}`,
        name: categoryName,
        slug: slugifyCategory(categoryName),
        description: null,
        created_at: new Date().toISOString(),
      };
      setCategories((current) => [...current, category]);
      setProductForm((current) => ({
        ...current,
        category_id: category.id,
        category_name: category.name,
      }));
      return category;
    }

    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: categoryName }),
    });
    const data = (await response.json()) as {
      ok: boolean;
      mode?: StorageMode;
      category?: Category;
      error?: string;
    };

    if (!response.ok || !data.ok || !data.category) {
      throw new Error(data.error ?? "No se pudo crear la categoria.");
    }

    setStorageMode(data.mode ?? "supabase");
    setCategories((current) =>
      current.some((category) => category.id === data.category?.id)
        ? current
        : [...current, data.category as Category],
    );
    setProductForm((current) => ({
      ...current,
      category_id: data.category?.id ?? "",
      category_name: data.category?.name ?? categoryName,
    }));
    return data.category;
  }

  async function handleDeleteCategory(category: Category) {
    const productCount = products.filter(
      (product) => product.category_id === category.id,
    ).length;
    const confirmation =
      productCount > 0
        ? `Eliminar "${category.name}" tambien borrara ${productCount} producto(s).`
        : `Eliminar "${category.name}" del catalogo.`;

    if (!window.confirm(`${confirmation}\n\nDeseas continuar?`)) {
      return;
    }

    setDeletingCategoryId(category.id);
    setMessage("");

    if (isDemo) {
      setCategories((current) =>
        current.filter((entry) => entry.id !== category.id),
      );
      setProducts((current) =>
        current.filter((product) => product.category_id !== category.id),
      );
      setSelectedCategoryIds((current) =>
        current.filter((categoryId) => categoryId !== category.id),
      );
      if (productForm.category_id === category.id) {
        handleProductCategoryInput("");
      }
      if (selectedCategoryId === category.id) {
        setSelectedCategoryId("");
      }
      setDeletingCategoryId(null);
      setMessage("Categoria y productos eliminados en modo demo.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        ok: boolean;
        mode?: StorageMode;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo eliminar la categoria.");
      }

      setStorageMode(data.mode ?? "supabase");
      if (productForm.category_id === category.id) {
        handleProductCategoryInput("");
      }
      if (selectedCategoryId === category.id) {
        setSelectedCategoryId("");
      }
      setSelectedCategoryIds((current) =>
        current.filter((categoryId) => categoryId !== category.id),
      );
      await loadRemoteData();
      setMessage("Categoria y productos eliminados de Supabase.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la categoria.",
      );
    }

    setDeletingCategoryId(null);
  }

  function handleToggleCategorySelection(categoryId: string) {
    setSelectedCategoryIds((current) =>
      current.includes(categoryId)
        ? current.filter((entry) => entry !== categoryId)
        : [...current, categoryId],
    );
  }

  function handleToggleAllCategories() {
    const visibleCategoryIds = filteredCategories.map((category) => category.id);

    if (!visibleCategoryIds.length) {
      return;
    }

    setSelectedCategoryIds((current) => {
      const visibleCategoryIdsSet = new Set(visibleCategoryIds);
      const hiddenSelectedIds = current.filter(
        (categoryId) => !visibleCategoryIdsSet.has(categoryId),
      );

      return allCategoriesSelected
        ? hiddenSelectedIds
        : [...hiddenSelectedIds, ...visibleCategoryIds];
    });
  }

  async function handleDeleteSelectedCategories() {
    if (!selectedCategories.length) {
      return;
    }

    const selectedIds = new Set(selectedCategories.map((category) => category.id));
    const productCount = products.filter(
      (product) => product.category_id && selectedIds.has(product.category_id),
    ).length;
    const confirmation =
      productCount > 0
        ? `Eliminar ${selectedCategories.length} categoria(s) tambien borrara ${productCount} producto(s).`
        : `Eliminar ${selectedCategories.length} categoria(s) del catalogo.`;

    if (!window.confirm(`${confirmation}\n\nDeseas continuar?`)) {
      return;
    }

    setDeletingCategoryId(BULK_DELETE_CATEGORY_ID);
    setMessage("");

    if (isDemo) {
      setCategories((current) =>
        current.filter((category) => !selectedIds.has(category.id)),
      );
      setProducts((current) =>
        current.filter(
          (product) => !product.category_id || !selectedIds.has(product.category_id),
        ),
      );
      if (productForm.category_id && selectedIds.has(productForm.category_id)) {
        handleProductCategoryInput("");
      }
      if (selectedCategoryId && selectedIds.has(selectedCategoryId)) {
        setSelectedCategoryId("");
      }
      setSelectedCategoryIds([]);
      setDeletingCategoryId(null);
      setMessage("Categorias y productos eliminados en modo demo.");
      return;
    }

    try {
      await Promise.all(
        selectedCategories.map(async (category) => {
          const response = await fetch(`/api/admin/categories/${category.id}`, {
            method: "DELETE",
          });
          const data = (await response.json()) as {
            ok: boolean;
            mode?: StorageMode;
            error?: string;
          };

          if (!response.ok || !data.ok) {
            throw new Error(
              data.error ?? `No se pudo eliminar "${category.name}".`,
            );
          }

          setStorageMode(data.mode ?? "supabase");
        }),
      );

      if (productForm.category_id && selectedIds.has(productForm.category_id)) {
        handleProductCategoryInput("");
      }
      if (selectedCategoryId && selectedIds.has(selectedCategoryId)) {
        setSelectedCategoryId("");
      }
      setSelectedCategoryIds([]);
      await loadRemoteData();
      setMessage("Categorias y productos eliminados de Supabase.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron eliminar las categorias.",
      );
    }

    setDeletingCategoryId(null);
  }

  async function handleUpdateCategoryName(categoryId: string) {
    if (!editingCategoryName.trim()) {
      setMessage("El nombre no puede estar vacio.");
      return;
    }

    setUpdatingCategoryId(categoryId);
    setMessage("");

    if (isDemo) {
      setCategories((current) =>
        current.map((category) =>
          category.id === categoryId
            ? { ...category, name: editingCategoryName.trim() }
            : category,
        ),
      );
      setEditingCategoryId(null);
      setUpdatingCategoryId(null);
      setMessage("Categoria actualizada en modo demo.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCategoryName }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        mode?: StorageMode;
        category?: Category;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.category) {
        throw new Error(data.error ?? "No se pudo actualizar la categoria.");
      }

      setStorageMode(data.mode ?? "supabase");
      setCategories((current) =>
        current.map((category) =>
          category.id === categoryId ? data.category! : category,
        ),
      );
      setEditingCategoryId(null);
      setMessage("Categoria actualizada en Supabase.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error al actualizar.",
      );
    } finally {
      setUpdatingCategoryId(null);
    }
  }

  async function handleSaveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedSku = isProductSkuAuto
      ? generatedProductSku
      : productForm.sku.trim();

    if (!productForm.name.trim() || !submittedSku) {
      setMessage("Nombre y codigo interno son obligatorios.");
      return;
    }

    const duplicateSkuProduct = findProductSkuDuplicate(
      products,
      submittedSku,
      productForm.id,
    );

    if (duplicateSkuProduct) {
      setMessage("El codigo ya existe.");
      return;
    }

    const submittedProductCode = normalizeProductCodeInput(
      productForm.product_code,
    );

    if (!isValidOptionalProductCode(submittedProductCode)) {
      setMessage("El codigo de producto debe tener 13 digitos.");
      return;
    }

    const duplicateProductCode = findProductCodeDuplicate(
      products,
      submittedProductCode,
      productForm.id,
    );

    if (duplicateProductCode) {
      setMessage("El codigo de producto ya existe.");
      return;
    }

    if (productForm.sku !== submittedSku) {
      setProductForm((current) => ({ ...current, sku: submittedSku }));
    }

    if (productForm.product_code !== submittedProductCode) {
      setProductForm((current) => ({
        ...current,
        product_code: submittedProductCode,
      }));
    }

    const basePurchaseCost = getStoredProductPurchaseCostValue(productForm);
    const basePrice = parseFloat(productForm.price || "0");
    if (basePrice > 0 && basePrice < basePurchaseCost) {
      setMessage("Error: El precio de venta base no puede ser menor al costo de compra unitario.");
      return;
    }

    const invalidPresentation = productFormPresentations.find((p) => {
      if (!p.use_for_sale) return false;
      const pCost = basePurchaseCost * parseFloat(p.unit_quantity || "0");
      const pPrice = parseFloat(p.price || "0");
      return pPrice > 0 && pPrice < pCost;
    });

    if (invalidPresentation) {
      setMessage(`Error: La presentación "${invalidPresentation.name || 'Sin nombre'}" tiene un precio de venta menor a su costo estimado de compra. Ajusta los valores para evitar pérdidas.`);
      return;
    }

    setSaving(true);
    setMessage("");
    const isEditingProduct = Boolean(productForm.id);
    const measurementUnit = normalizeProductMeasurementUnit(
      productForm.measurement_unit,
    );
    const presentationPayload = getProductPresentationPayloads(productForm);
    const submittedPurchaseCost = getStoredProductPurchaseCostValue(productForm);
    const submittedPrice = normalizeMoney(productForm.price || 0);
    const submittedStock = getStoredProductStockValue(
      productForm.stock,
      measurementUnit,
      productForm.stock_input_unit,
      getProductFormStockUnitQuantity(productForm),
    );
    const currentPurchaseCost = editingProduct
      ? measurementUnit === "lb"
        ? getBulkInventoryUnitCostValue(editingProduct) ?? 0
        : normalizeMoney(editingProduct.purchase_cost ?? 0)
      : 0;
    const shouldUpdatePurchaseCost =
      !isEditingProduct ||
      !editingProduct ||
      !areProductNumericValuesEqual(submittedPurchaseCost, currentPurchaseCost);
    const shouldUpdatePrice =
      !isEditingProduct ||
      !editingProduct ||
      !areProductNumericValuesEqual(submittedPrice, editingProduct.price);
    const shouldUpdateStock =
      !isEditingProduct ||
      !editingProduct ||
      !areProductNumericValuesEqual(submittedStock, editingProduct.stock);
    let selectedProductCategory: Category | null = productFormCategory;
    const resolvedProviderName =
      getResolvedProviderName(providerSummaries, productForm.provider) ??
      productForm.provider.trim();

    let payload = {
      category_id: productForm.category_id || null,
      name: productForm.name.trim(),
      sku: submittedSku,
      ...(submittedProductCode ? { product_code: submittedProductCode } : {}),
      description: productForm.description.trim() || null,
      purchase_cost: isEditingProduct
        ? shouldUpdatePurchaseCost
          ? submittedPurchaseCost
          : normalizeMoney(editingProduct?.purchase_cost ?? 0)
        : 0,
      price: isEditingProduct
        ? shouldUpdatePrice
          ? submittedPrice
          : normalizeMoney(editingProduct?.price ?? 0)
        : 0,
      measurement_unit: measurementUnit,
      stock: isEditingProduct
        ? shouldUpdateStock
          ? submittedStock
          : Number(editingProduct?.stock) || 0
        : 0,
      min_stock: getStoredProductMinStockValue(
        productForm.min_stock,
        measurementUnit,
        productForm.min_stock_input_unit,
        getProductFormMinStockUnitQuantity(productForm),
      ),
      max_stock: getStoredProductMaxStockValue(
        productForm.max_stock,
        measurementUnit,
        productForm.max_stock_input_unit,
        getProductFormMaxStockUnitQuantity(productForm),
      ),
      image_url: productForm.image_url.trim() || null,
      provider: resolvedProviderName || null,
      is_active: true,
      has_iva: productForm.has_iva,
      iva_rate: productForm.has_iva
        ? normalizeMoney(productForm.iva_rate || 0)
        : 0,
      requires_dates: productForm.requires_dates,
      presentations: presentationPayload,
    };

    const duplicateProduct = findDuplicateProduct(products, {
      id: productForm.id || null,
      name: payload.name,
      sku: payload.sku,
    });

    if (duplicateProduct && isEditingProduct) {
      setMessage(PRODUCT_DUPLICATE_MESSAGE);
      setSaving(false);
      return;
    }

    if (Number.isNaN(payload.price) || payload.price < 0) {
      setMessage("El precio debe ser un numero valido.");
      setSaving(false);
      return;
    }

    const stockError = getProductStockError(payload);
    if (stockError) {
      setMessage(stockError);
      setSaving(false);
      return;
    }

    const pricingError = getProductPricingError(payload);
    if (pricingError) {
      setMessage(pricingError);
      setSaving(false);
      return;
    }

    const ivaError = getProductIvaError(payload);
    if (ivaError) {
      setMessage(ivaError);
      setSaving(false);
      return;
    }

    const presentationsError = getProductPresentationError(
      presentationPayload,
      measurementUnit,
    );
    if (presentationsError) {
      setMessage(presentationsError);
      setSaving(false);
      return;
    }

    try {
      selectedProductCategory = await ensureProductFormCategory();
      payload = {
        ...payload,
        category_id:
          selectedProductCategory?.id ?? (productForm.category_id || null),
      };
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo preparar la categoria.",
      );
      setSaving(false);
      return;
    }

    if (isDemo) {
      const category =
        selectedProductCategory ??
        categories.find((entry) => entry.id === payload.category_id);
      if (duplicateProduct) {
        const mergedProduct = mergeLocalDuplicateProduct(
          duplicateProduct,
          payload,
        );
        setProducts((current) =>
          current.map((entry) =>
            entry.id === mergedProduct.id ? mergedProduct : entry,
          ),
        );
        resetProductForm();
        showSavedProductInCatalog(mergedProduct);
        setMessage(
          `Producto existente actualizado: se sumo ${formatProductStock({
            stock: payload.stock,
            measurement_unit: payload.measurement_unit,
          })} y se registro el proveedor de esta compra.`,
        );
        setSaving(false);
        return;
      }

      const localProductId = productForm.id || `prod-${Date.now()}`;
      const product: Product = {
        ...payload,
        id: localProductId,
        categories: category
          ? { name: category.name, slug: category.slug }
          : null,
        presentations: createLocalProductPresentations(
          localProductId,
          presentationPayload,
        ),
        lots: createLocalProductLots({
          productId: localProductId,
          providerName: payload.provider,
          quantity: payload.stock,
          measurementUnit: payload.measurement_unit,
          purchaseCost: payload.purchase_cost,
          entryDate: null,
          manufactureDate: null,
          expirationDate: null,
        }),
      };
      setProducts((current) =>
        productForm.id
          ? current.map((entry) => (entry.id === product.id ? product : entry))
          : [product, ...current],
      );
      resetProductForm();
      if (isEditingProduct) {
        showSavedProductInCatalog(product);
      } else {
        showSavedProductPrompt(product);
      }
      setMessage("Producto guardado correctamente.");
      setSaving(false);
      return;
    }

    let imageUrl = payload.image_url;
    if (imageFile) {
      try {
        imageUrl = await uploadImage(imageFile);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "No se pudo subir la imagen.",
        );
        setSaving(false);
        return;
      }
    }

    const productPayload: Record<string, unknown> = {
      ...payload,
      image_url: imageUrl,
    };

    if (isEditingProduct) {
      if (!shouldUpdatePurchaseCost) {
        delete productPayload.purchase_cost;
      }

      if (!shouldUpdatePrice) {
        delete productPayload.price;
      }

      if (!shouldUpdateStock) {
        delete productPayload.stock;
      }
    }

    try {
      const response = await fetch(
        productForm.id
          ? `/api/admin/products/${productForm.id}`
          : "/api/admin/products",
        {
          method: productForm.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(productPayload),
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        mode?: StorageMode;
        product?: Product;
        merged?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo guardar el producto.");
      }

      setStorageMode(data.mode ?? "supabase");
      const savedProduct = {
        category_id: data.product?.category_id ?? payload.category_id,
        name: data.product?.name ?? payload.name,
        provider: data.product?.provider ?? payload.provider,
        sku: data.product?.sku ?? payload.sku,
      };
      resetProductForm();
      await loadRemoteData();
      if (data.merged) {
        showSavedProductInCatalog(savedProduct);
      } else if (isEditingProduct) {
        showSavedProductInCatalog(savedProduct);
      } else {
        showSavedProductPrompt(savedProduct);
      }
      setMessage(
        data.merged
          ? "Producto existente actualizado: se sumo stock y se registro el proveedor de esta compra."
          : "Producto guardado correctamente.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo guardar el producto.",
      );
    }

    setSaving(false);
  }

  async function handleExcelUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setMessage("Procesando archivo Excel...");

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const json = getWorkbookProductRows(workbook);
      const legacyCatalogImageUrls = getWorkbookImageUrlMap(workbook);

      let successCount = 0;
      let categoryImportCount = 0;
      let createdProductCount = 0;
      let updatedProductCount = 0;
      let removedProductCount = 0;
      const initialProducts = [...products];
      const importedProductNames = new Set<string>();
      const importedProductSkus = new Set<string>();
      const localCategories = [...categories];
      const localProducts = [...products];

      async function ensureImportedCategory(rawName: string) {
        const name = rawName.trim();
        if (!name) return null;

        const existingCategory = findSimilarCategory(localCategories, name);

        if (existingCategory) {
          return existingCategory;
        }

        if (isDemo) {
          const category: Category = {
            id: `cat-${Date.now()}-${Math.random()}`,
            name,
            slug: slugifyCategory(name),
            description: "Creada en modo demo",
            created_at: new Date().toISOString(),
          };
          localCategories.push(category);
          categoryImportCount++;
          setCategories((current) => [...current, category]);
          return category;
        }

        try {
          const response = await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              description: "Creada desde importacion masiva",
            }),
          });
          const categoryData = (await response.json()) as {
            ok: boolean;
            category?: Category;
          };

          if (response.ok && categoryData.category) {
            localCategories.push(categoryData.category);
            categoryImportCount++;
            return categoryData.category;
          }
        } catch (error) {
          console.error("No se pudo autocompletar la categoria", error);
        }

        return null;
      }

      for (const row of json) {
        const rawCatName = normalizeStringExcelValue(
          getExcelValue(row, ["Categoria", "categoria"]),
        );
        const importedCategory = await ensureImportedCategory(
          rawCatName,
        );

        const name = normalizeStringExcelValue(
          getExcelValue(row, ["Nombre", "nombre", "Producto", "producto"]),
        );
        const sku = normalizeStringExcelValue(
          getExcelValue(row, [
            "Codigo Interno",
            "Codigo de Producto",
            "Codigo",
            "codigo_interno",
            "Codigo de Barras",
            "Codigo Barras",
            "codigo_barras",
            "SKU",
            "sku",
          ]),
        );
        const entryDate =
          normalizeDateInput(
            getExcelValue(row, [
              "Fecha Ingreso",
              "Fecha de Ingreso",
              "fecha_ingreso",
              "entry_date",
            ]),
          ) ?? getTodayInputDate();
        const manufactureDate = normalizeDateInput(
          getExcelValue(row, [
            "Fecha Expedicion",
            "Fecha de Expedicion",
            "Fecha Fabricacion",
            "Fecha de Fabricacion",
            "fecha_expedicion",
            "fecha_fabricacion",
            "manufacture_date",
          ]),
        );
        const expirationDate = normalizeDateInput(
          getExcelValue(row, [
            "Fecha Caducidad",
            "Fecha Vencimiento",
            "Fecha de Caducidad",
            "Fecha de Vencimiento",
            "fecha_caducidad",
            "fecha_vencimiento",
            "expiration_date",
          ]),
        );
        const measurementUnit = normalizeExcelMeasurementUnit(
          getExcelValue(row, [
            "Unidad Medida",
            "Unidad de Medida",
            "Unidad",
            "Tipo Producto",
            "measurement_unit",
          ]),
        );
        const importedImageValue = normalizeStringExcelValue(
          getExcelValue(row, ["Imagen", "imagen", "URL Imagen"]),
        );
        const imageUrlFromLegacyImagesSheet = getCatalogImageUrlForProduct(
          legacyCatalogImageUrls,
          { name, sku },
        );
        const imageUrlFromProductSheet = getPublicCatalogImageUrl(
          importedImageValue,
        );
        const preserveExistingImage =
          Boolean(importedImageValue) &&
          !imageUrlFromProductSheet &&
          !imageUrlFromLegacyImagesSheet;
        const importedImageUrl =
          imageUrlFromLegacyImagesSheet || imageUrlFromProductSheet || null;

        const payload = {
          category_id: "",
          name,
          sku,
          description:
            normalizeStringExcelValue(
              getExcelValue(row, ["Descripcion", "descripcion"]),
            ) || null,
          purchase_cost: normalizeNumberExcelValue(
            getExcelValue(row, [
              "Costo Compra",
              "Costo de Compra",
              "costo_compra",
              "purchase_cost",
            ]),
            0,
          ),
          price: normalizeNumberExcelValue(
            getExcelValue(row, [
              "Precio Venta",
              "Precio de Venta",
              "Precio",
              "precio",
              "PVP",
            ]),
            0,
          ),
          measurement_unit: measurementUnit,
          stock: normalizeNumberExcelValue(
            getExcelValue(row, ["Stock", "stock"]),
            0,
          ),
          min_stock: normalizeNumberExcelValue(
            getExcelValue(row, ["Stock Minimo", "stock_minimo"]),
            5,
          ),
          max_stock: normalizeNumberExcelValue(
            getExcelValue(row, ["Stock Maximo", "stock_maximo"]),
            100,
          ),
          image_url: preserveExistingImage ? null : importedImageUrl,
          provider:
            normalizeStringExcelValue(
              getExcelValue(row, ["Proveedor", "proveedor"]),
            ) || null,
          is_active: true,
          requires_dates: Boolean(manufactureDate || expirationDate),
          entry_date: entryDate,
          expiration_date: expirationDate,
          ...(manufactureDate ? { manufacture_date: manufactureDate } : {}),
        };

        if (importedCategory) {
          payload.category_id = importedCategory.id;
        }

        if (!payload.name || !payload.sku) continue;

        importedProductNames.add(normalizeProductName(payload.name));
        importedProductSkus.add(normalizeProductSku(payload.sku));

        const duplicateProduct = findDuplicateProduct(localProducts, {
          name: payload.name,
          sku: payload.sku,
        });

        if (
          !payload.image_url &&
          preserveExistingImage &&
          duplicateProduct?.image_url
        ) {
          payload.image_url = duplicateProduct.image_url;
        }

        const legacyCategoryImportDisabled = false;
        const catName = rawCatName.toLowerCase();
        if (legacyCategoryImportDisabled) {
          let category = localCategories.find(c => c.name.toLowerCase() === catName);

          if (!category) {
            if (isDemo) {
              category = {
                id: `cat-${Date.now()}-${Math.random()}`,
                name: rawCatName,
                slug: rawCatName.toLowerCase().replace(/\s+/g, '-'),
                description: "Creada en modo demo",
                created_at: new Date().toISOString(),
              };
              localCategories.push(category);
              setCategories(current => [...current, category!]);
            } else {
              try {
                const res = await fetch("/api/admin/categories", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: rawCatName, description: "Creada desde importación masiva" }),
                });
                const data = (await res.json()) as { ok: boolean, category?: Category };
                if (res.ok && data.category) {
                  category = data.category;
                  localCategories.push(category);
                }
              } catch (err) {
                console.error("No se pudo autocompletar la categoria", err);
              }
            }
          }

          if (category) {
            payload.category_id = category.id;
          }
        }

        if (isDemo) {
           if (duplicateProduct) {
             const mergedProduct: Product = {
               ...mergeLocalDuplicateProduct(duplicateProduct, payload),
               updated_at: new Date().toISOString(),
             };
             const productIndex = localProducts.findIndex(
               (product) => product.id === mergedProduct.id,
             );

             if (productIndex >= 0) {
               localProducts[productIndex] = mergedProduct;
             }
             setProducts((current) =>
               current.map((product) =>
                 product.id === mergedProduct.id ? mergedProduct : product,
               ),
             );
             updatedProductCount++;
             successCount++;
             continue;
           }

           const category = localCategories.find(c => c.id === payload.category_id);
           const localProductId = `prod-${Date.now()}-${Math.random()}`;
           const product: Product = {
             ...payload,
             id: localProductId,
             category_id: payload.category_id || null,
             categories: category ? { name: category.name, slug: category.slug } : null,
             lots: createLocalProductLots({
               productId: localProductId,
               providerName: payload.provider,
               quantity: payload.stock,
               measurementUnit: payload.measurement_unit,
               purchaseCost: payload.purchase_cost,
               entryDate: payload.entry_date,
               manufactureDate: payload.manufacture_date ?? null,
               expirationDate: payload.expiration_date,
             }),
           };
           setProducts(current => [product, ...current]);
           localProducts.unshift(product);
           createdProductCount++;
           successCount++;
        } else {
           const productPayload = {
               ...payload,
               category_id: payload.category_id || null,
               image_url: payload.image_url,
               description: payload.description || null
           };
           const response = await fetch(
             "/api/admin/products",
             {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify(productPayload),
             },
           );
           const data = (await response.json()) as {
             ok: boolean;
             product?: Product;
             merged?: boolean;
             error?: string;
           };

           if (!response.ok || !data.ok) {
             throw new Error(
               data.error
                 ? `No se pudo sincronizar "${payload.name}": ${data.error}`
                 : `No se pudo sincronizar "${payload.name}".`,
             );
           }

           if (data.product) {
             const productIndex = localProducts.findIndex(
               (product) => product.id === data.product?.id,
             );

             if (productIndex >= 0) {
               localProducts[productIndex] = data.product;
             } else {
               localProducts.unshift(data.product);
             }
           }

           if (duplicateProduct || data.merged) {
             updatedProductCount++;
           } else {
             createdProductCount++;
           }
           successCount++;
        }
      }

      const missingProducts = initialProducts.filter((product) => {
        const sku = normalizeProductSku(product.sku ?? "");
        const name = normalizeProductName(product.name ?? "");

        return !(
          (sku && importedProductSkus.has(sku)) ||
          (name && importedProductNames.has(name))
        );
      });

      if (successCount > 0 && missingProducts.length) {
        const missingProductIds = new Set(
          missingProducts.map((product) => product.id),
        );

        if (isDemo) {
          const nextProducts = products.filter(
            (product) => !missingProductIds.has(product.id),
          );
          setProducts(nextProducts);
          setCategories((current) =>
            pruneLocalOrphanCategories(current, nextProducts),
          );
          setProviders((current) =>
            pruneLocalOrphanProviders(current, nextProducts),
          );
          removedProductCount = missingProducts.length;
        } else {
          await Promise.all(
            missingProducts.map(async (product) => {
              const response = await fetch(`/api/admin/products/${product.id}`, {
                method: "DELETE",
              });
              const data = (await response.json()) as {
                ok: boolean;
                error?: string;
              };

              if (!response.ok || !data.ok) {
                throw new Error(
                  data.error ?? `No se pudo eliminar "${product.name}".`,
                );
              }
            }),
          );
          removedProductCount = missingProducts.length;
        }

        setSelectedCategoryProductIds((current) =>
          current.filter((productId) => !missingProductIds.has(productId)),
        );
        setSelectedCatalogProductIds((current) =>
          current.filter((productId) => !missingProductIds.has(productId)),
        );
      }

      if (!isDemo) {
        await loadRemoteData();
      }
      const createdMessage = createdProductCount
        ? ` ${createdProductCount} producto(s) nuevo(s).`
        : "";
      const updatedMessage = updatedProductCount
        ? ` ${updatedProductCount} producto(s) actualizado(s).`
        : "";
      const removedMessage = removedProductCount
        ? ` ${removedProductCount} producto(s) eliminado(s) porque ya no estan en el Excel.`
        : "";
      setMessage(
        `Se sincronizaron ${successCount} producto(s) y ${categoryImportCount} categoria(s).${createdMessage}${updatedMessage}${removedMessage} El catalogo ahora coincide con el Excel cargado.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Error al procesar el archivo Excel. Asegurate de que tenga el formato correcto.",
      );
    } finally {
      setSaving(false);
      event.target.value = '';
    }
  }

  function handleDownloadCatalogExcel() {
    if (!catalogExcelRows.length) {
      setMessage("No hay productos ni categorias para descargar en el Excel.");
      return;
    }

    const workbook = buildCatalogExcelWorkbook(catalogExcelRows, {
      activeCount: totals.active,
      categoryCount: categories.length,
      generatedAt: new Date(),
      inventoryCost: totals.inventoryCost,
      inventoryValue: totals.inventoryValue,
      lowStockCount: totals.lowStock,
      productCount: products.length,
    });
    XLSX.writeFile(workbook, getCatalogExcelDownloadFilename());
    setMessage(`Excel actualizado con ${catalogExcelRows.length} fila${catalogExcelRows.length === 1 ? "" : "s"} descargado correctamente.`);
  }

  async function handleDeleteCatalogFile() {
    if (!catalogExcelRows.length) {
      setMessage("No hay categorias ni productos para eliminar.");
      return;
    }

    const confirmation = window.prompt(
      `Esto eliminara permanentemente ${categories.length} categoria(s) y ${products.length} producto(s) del sistema y de la base de datos.\n\nPara confirmar, escribe ELIMINAR.`,
    );

    if (confirmation !== "ELIMINAR") {
      setMessage("Eliminacion cancelada. No se borro el catalogo.");
      return;
    }

    setClearingCatalog(true);
    setMessage("Eliminando catalogo completo...");

    if (isDemo) {
      clearCatalogState();
      setClearingCatalog(false);
      setMessage("Archivo, categorias y productos eliminados en modo demo.");
      return;
    }

    try {
      const response = await fetch("/api/admin/catalog", {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        ok: boolean;
        mode?: StorageMode;
        deletedCategories?: number;
        deletedProducts?: number;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo eliminar el catalogo.");
      }

      setStorageMode(data.mode ?? "supabase");
      clearCatalogState();
      await loadRemoteData();
      setMessage(
        `Catalogo eliminado definitivamente: ${data.deletedCategories ?? categories.length} categoria(s) y ${data.deletedProducts ?? products.length} producto(s).`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el catalogo completo.",
      );
    } finally {
      setClearingCatalog(false);
    }
  }

  function clearCatalogState() {
    setCategories([]);
    setProducts([]);
    setProviders([]);
    setSearch("");
    setCategorySearch("");
    setSelectedCategoryId("");
    setSelectedCategoryIds([]);
    setSelectedCategoryProductIds([]);
    setSelectedProviderIds([]);
    setSelectedProviderName("");
    setProviderSearch("");
    setProviderForm(emptyProviderForm);
    setProviderFormOpen(false);
    setEditingProviderId(null);
    setEditingProviderOriginalName("");
    resetProductForm();
  }

  function resetProviderFormState() {
    setProviderForm(emptyProviderForm);
    setEditingProviderId(null);
    setEditingProviderOriginalName("");
  }

  function handleCloseProviderForm() {
    resetProviderFormState();
    setProviderFormOpen(false);
  }

  function handleToggleProviderForm() {
    if (providerFormOpen) {
      handleCloseProviderForm();
      return;
    }

    resetProviderFormState();
    setProviderFormOpen(true);
  }

  function handleStartProviderEdit(provider: ProviderSummary) {
    if (!provider.id) {
      setMessage("Este proveedor no se puede editar porque no tiene registro propio.");
      return;
    }

    setProviderForm({
      name: provider.name,
      ruc: provider.ruc ?? "",
      email: provider.email ?? "",
      address: provider.address ?? "",
      phone: provider.phone ?? "",
      notes: provider.notes ?? "",
    });
    setEditingProviderId(provider.id);
    setEditingProviderOriginalName(provider.name);
    setProviderFormOpen(true);
    setSelectedProviderName(provider.name);
    setMessage("");
  }

  function handleProviderField<K extends keyof ProviderForm>(
    field: K,
    value: ProviderForm[K],
  ) {
    setProviderForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = providerForm.name.trim();
    const ruc = providerForm.ruc.trim();
    const address = providerForm.address.trim();
    const phone = providerForm.phone.trim();
    const isEditing = Boolean(editingProviderId);

    if (!name) {
      setMessage("El nombre del proveedor es obligatorio.");
      return;
    }

    if (!ruc) {
      setMessage("El RUC del proveedor es obligatorio.");
      return;
    }

    if (!validateIdentity(ruc)) {
      setMessage("El RUC o Cédula del proveedor no es válido.");
      return;
    }

    if (!address) {
      setMessage("La direccion del proveedor es obligatoria.");
      return;
    }

    if (!phone) {
      setMessage("El telefono del proveedor es obligatorio.");
      return;
    }

    if (!validatePhone(phone)) {
      setMessage("Teléfono inválido. Formatos: 09.., 02.., +593.., 1800..");
      return;
    }

    const providerKey = name.toLocaleLowerCase("es-EC");
    const existingProvider = providerSummaries.some(
      (provider) =>
        provider.name.trim().toLocaleLowerCase("es-EC") === providerKey &&
        (!isEditing || provider.id !== editingProviderId),
    );

    if (existingProvider) {
      setMessage("Ya existe un proveedor con ese nombre.");
      return;
    }

    const rucKey = normalizeCatalogSearchText(ruc);
    const existingProviderByRuc = providerSummaries.some(
      (provider) =>
        normalizeCatalogSearchText(provider.ruc ?? "") === rucKey &&
        (!isEditing || provider.id !== editingProviderId),
    );

    if (existingProviderByRuc) {
      setMessage("Ya existe un proveedor con ese RUC.");
      return;
    }

    const payload = {
      name,
      ruc,
      address,
      phone,
      notes: providerForm.notes.trim() || null,
    };

    const addProviderToState = (provider: Provider) => {
      const nextKey = provider.name.trim().toLocaleLowerCase("es-EC");

      setProviders((current) => {
        const providerExists = current.some(
          (entry) =>
            entry.name.trim().toLocaleLowerCase("es-EC") === nextKey,
        );

        if (providerExists) {
          return current.map((entry) =>
            entry.name.trim().toLocaleLowerCase("es-EC") === nextKey
              ? provider
              : entry,
          );
        }

        return [...current, provider];
      });
    };

    const updateProviderInState = (provider: Provider, previousName: string) => {
      const previousKey = previousName.trim().toLocaleLowerCase("es-EC");
      const nextKey = provider.name.trim().toLocaleLowerCase("es-EC");

      setProviders((current) => {
        let providerExists = false;
        const nextProviders = current.map((entry) => {
          const entryKey = entry.name.trim().toLocaleLowerCase("es-EC");
          const matchesProvider =
            entry.id === provider.id ||
            (previousKey && entryKey === previousKey) ||
            (nextKey && entryKey === nextKey);

          if (!matchesProvider) {
            return entry;
          }

          providerExists = true;
          return provider;
        });

        return providerExists ? nextProviders : [...nextProviders, provider];
      });
      setProducts((current) =>
        updateLocalProviderInProducts(current, previousName, provider),
      );
    };

    if (providerForm.email && !validateEmail(providerForm.email)) {
      setMessage("El correo electrónico no es válido.");
      return;
    }

    setCreatingProvider(true);
    setMessage("");

    if (isDemo) {
      if (isEditing && editingProviderId) {
        const provider: Provider = {
          id: editingProviderId,
          ...payload,
        };

        updateProviderInState(
          provider,
          editingProviderOriginalName || provider.name,
        );
        handleCloseProviderForm();
        setProviderSearch("");
        setSelectedProviderName(provider.name);
        setMessage(`Proveedor "${provider.name}" actualizado en modo demo.`);
        setCreatingProvider(false);
        return;
      }

      const provider: Provider = {
        id: `provider-${Date.now()}`,
        ...payload,
      };

      addProviderToState(provider);
      handleCloseProviderForm();
      setProviderSearch("");
      setSelectedProviderName(provider.name);
      setMessage(`Proveedor "${provider.name}" creado en modo demo.`);
      setCreatingProvider(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/providers", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? {
                id: editingProviderId,
                ...payload,
              }
            : payload,
        ),
      });
      const data = (await response.json()) as {
        ok: boolean;
        mode?: StorageMode;
        provider?: Provider;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.provider) {
        throw new Error(data.error ?? "No se pudo crear el proveedor.");
      }

      setStorageMode(data.mode ?? "supabase");
      if (isEditing) {
        updateProviderInState(
          data.provider,
          editingProviderOriginalName || data.provider.name,
        );
      } else {
        addProviderToState(data.provider);
      }
      handleCloseProviderForm();
      setProviderSearch("");
      setSelectedProviderName(data.provider.name);
      setMessage(
        `Proveedor "${data.provider.name}" ${
          isEditing ? "actualizado" : "creado"
        } correctamente.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : `No se pudo ${isEditing ? "editar" : "crear"} el proveedor.`,
      );
    } finally {
      setCreatingProvider(false);
    }
  }

  function handleToggleProviderSelection(providerId: string) {
    setSelectedProviderIds((current) =>
      current.includes(providerId)
        ? current.filter((entry) => entry !== providerId)
        : [...current, providerId],
    );
  }

  function handleToggleAllVisibleProviders() {
    const visibleProviderIds = visibleSelectableProviders
      .map((provider) => provider.id)
      .filter(Boolean) as string[];

    if (!visibleProviderIds.length) {
      return;
    }

    const visibleProviderIdsSet = new Set(visibleProviderIds);

    setSelectedProviderIds((current) => {
      const hiddenSelectedIds = current.filter(
        (providerId) => !visibleProviderIdsSet.has(providerId),
      );

      return allVisibleProvidersSelected
        ? hiddenSelectedIds
        : [...hiddenSelectedIds, ...visibleProviderIds];
    });
  }

  async function handleDeleteSelectedProviders() {
    if (!selectedProviders.length) {
      return;
    }

    const selectedIds = selectedProviders
      .map((provider) => provider.id)
      .filter(Boolean) as string[];
    const selectedNames = selectedProviders.map((provider) => provider.name);
    const productCount = selectedProviders.reduce(
      (sum, provider) => sum + provider.products.length,
      0,
    );
    const confirmation = `Eliminar ${selectedProviders.length} proveedor(es) seleccionado(s). Se borraran los productos exclusivos de esos proveedores; en productos compartidos solo se quitara el stock y la asociacion del proveedor correspondiente${
      productCount ? ` (${productCount} producto(s) relacionado(s)).` : "."
    }`;

    if (!window.confirm(`${confirmation}\n\nDeseas continuar?`)) {
      return;
    }

    setDeletingProviderId(BULK_DELETE_PROVIDER_ID);
    setMessage("");

    if (isDemo) {
      const selectedIdsSet = new Set(selectedIds);
      const selectedNameKeys = new Set(
        selectedNames.map((name) => name.trim().toLocaleLowerCase("es-EC")),
      );

      const nextProducts = removeLocalProvidersFromProducts(
        products,
        selectedIdsSet,
        selectedNameKeys,
      );
      setProviders((current) =>
        pruneLocalOrphanProviders(
          current.filter((provider) => !selectedIdsSet.has(provider.id)),
          nextProducts,
        ),
      );
      setProducts(nextProducts);
      setCategories((current) =>
        pruneLocalOrphanCategories(current, nextProducts),
      );
      setSelectedProviderIds([]);
      if (
        selectedProviderName &&
        selectedNameKeys.has(selectedProviderName.trim().toLocaleLowerCase("es-EC"))
      ) {
        setSelectedProviderName("");
      }
      setDeletingProviderId(null);
      setMessage("Proveedores seleccionados eliminados en modo demo.");
      return;
    }

    try {
      const response = await fetch("/api/admin/providers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        mode?: StorageMode;
        deletedProviders?: number;
        deletedProductIds?: string[];
        updatedProductIds?: string[];
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudieron eliminar los proveedores.");
      }

      setStorageMode(data.mode ?? "supabase");
      setSelectedProviderIds([]);
      if (selectedNames.includes(selectedProviderName)) {
        setSelectedProviderName("");
      }
      await loadRemoteData();
      setMessage(
        `${data.deletedProviders ?? selectedIds.length} proveedor(es) eliminado(s). ${data.deletedProductIds?.length ?? 0} producto(s) exclusivo(s) borrado(s) y ${data.updatedProductIds?.length ?? 0} producto(s) compartido(s) actualizado(s).`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron eliminar los proveedores seleccionados.",
      );
    } finally {
      setDeletingProviderId(null);
    }
  }

  async function handleDeleteProvider(provider: {
    id?: string | null;
    name: string;
    products: Product[];
  }) {
    if (!provider.id) {
      setMessage("Este proveedor no se puede eliminar individualmente.");
      return;
    }

    const confirmation = `Eliminar proveedor "${provider.name}". Se borraran sus productos exclusivos; si un producto tambien lo venden otros proveedores, solo se quitara la parte de "${provider.name}"${
      provider.products.length
        ? ` (${provider.products.length} producto(s) relacionado(s)).`
        : "."
    }`;

    if (!window.confirm(`${confirmation}\n\nDeseas continuar?`)) {
      return;
    }

    const providerId = provider.id;
    const providerNameKey = provider.name.trim().toLocaleLowerCase("es-EC");

    setDeletingProviderId(providerId);
    setMessage("");

    if (isDemo) {
      const nextProducts = removeLocalProvidersFromProducts(
        products,
        new Set([providerId]),
        new Set([providerNameKey]),
      );
      setProviders((current) =>
        pruneLocalOrphanProviders(
          current.filter((entry) => entry.id !== providerId),
          nextProducts,
        ),
      );
      setProducts(nextProducts);
      setCategories((current) =>
        pruneLocalOrphanCategories(current, nextProducts),
      );
      setSelectedProviderIds((current) =>
        current.filter((entry) => entry !== providerId),
      );
      if (selectedProviderName === provider.name) {
        setSelectedProviderName("");
      }
      setDeletingProviderId(null);
      setMessage(`Proveedor "${provider.name}" eliminado en modo demo.`);
      return;
    }

    try {
      const response = await fetch("/api/admin/providers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [providerId] }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        mode?: StorageMode;
        deletedProviders?: number;
        deletedProductIds?: string[];
        updatedProductIds?: string[];
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo eliminar el proveedor.");
      }

      setStorageMode(data.mode ?? "supabase");
      setSelectedProviderIds((current) =>
        current.filter((entry) => entry !== providerId),
      );
      if (selectedProviderName === provider.name) {
        setSelectedProviderName("");
      }
      await loadRemoteData();
      setMessage(
        `Proveedor "${provider.name}" eliminado: ${data.deletedProductIds?.length ?? 0} producto(s) exclusivo(s) borrado(s) y ${data.updatedProductIds?.length ?? 0} compartido(s) actualizado(s).`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el proveedor.",
      );
    } finally {
      setDeletingProviderId(null);
    }
  }

  async function handleStockChange(product: Product, delta: number) {
    const step = getStockAdjustmentStep(product);
    const nextStock = Number(
      Math.max(product.stock + delta * step, 0).toFixed(3),
    );

    if (isDemo) {
      setProducts((current) =>
        current.map((entry) =>
          entry.id === product.id ? { ...entry, stock: nextStock } : entry,
        ),
      );
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock: nextStock }),
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo actualizar el stock.");
      }

      await loadRemoteData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo actualizar el stock.",
      );
    }
  }

  function handleOpenProductPurchase(product: Product, providerName = "") {
    setPurchaseProduct(product);
    setPurchaseForm(createProductPurchaseForm(product, providerName));
    setMessage("");
  }

  function handleSelectPurchaseInvoiceProvider(option: AdminComboboxOption) {
    if (isPurchaseInvoiceProviderLocked) {
      return;
    }

    setPurchaseInvoiceProvider(option.label);
    setPurchaseInvoiceLines([createPurchaseInvoiceLine()]);
  }

  function handlePurchaseInvoicePaymentMethod(value: string) {
    const method: PurchasePaymentMethod = value === "credit" ? "credit" : "cash";
    const today = purchaseInvoiceDate || getTodayInputDate();
    setPurchasePaymentMethod(method);

    if (method === "cash") {
      setPurchaseCreditIssueDate(today);
      setPurchaseCreditDueDate("");
      return;
    }

    setPurchaseCreditIssueDate((current) => current || today);
  }

  function handlePurchaseInvoiceLineField<K extends keyof PurchaseInvoiceLineDraft>(
    lineId: string,
    field: K,
    value: PurchaseInvoiceLineDraft[K],
  ) {
    setPurchaseInvoiceLines((current) => {
      const updatedLines = current.map((line) =>
        line.id === lineId ? { ...line, [field]: value } : line,
      );

      if (field === "quantity" || field === "purchase_presentation_id") {
        const updatedLine = updatedLines.find((line) => line.id === lineId);
        if (updatedLine && updatedLine.product_id) {
          const product = products.find((entry) => entry.id === updatedLine.product_id);
          if (product && product.max_stock !== undefined && product.max_stock !== null) {
            const totals = buildPurchaseInvoiceLineTotals(updatedLine, product);
            const addedStock = totals.quantity;
            const currentStock = product.stock;
            const maxStock = product.max_stock;
            const newTotal = currentStock + addedStock;
            
            if (addedStock > 0 && newTotal > maxStock) {
              let maxStockLabel = "";
              let newTotalLabel = "";
              let currentStockLabel = "";

              if (normalizeProductMeasurementUnit(product.measurement_unit) === "lb") {
                const formatBulk = (val: number) => {
                  const unit = getPreferredBulkStockInputUnit(val);
                  const formatted = formatBulkStockInputValue(val, unit);
                  const label = BULK_STOCK_INPUT_UNIT_OPTIONS.find(opt => opt.value === unit)?.label || "lb";
                  return `${formatted} ${label}`;
                };
                maxStockLabel = formatBulk(maxStock);
                newTotalLabel = formatBulk(newTotal);
                currentStockLabel = formatBulk(currentStock);
              } else {
                const formatUnit = (val: number) => {
                  const display = getProductPresentationStockDisplay(product, val);
                  if (display.presentationId !== DEFAULT_STOCK_PRESENTATION_ID) {
                    const p = getProductPresentations(product).find(x => x.id === display.presentationId);
                    if (p) return `${display.quantity} ${p.name}`;
                  }
                  return `${val} unidades`;
                };
                maxStockLabel = formatUnit(maxStock);
                newTotalLabel = formatUnit(newTotal);
                currentStockLabel = formatUnit(currentStock);
              }

              setTimeout(() => {
                setStockAlertMessage(`¡Atención! El ingreso de esta cantidad elevará tu inventario a un total de ${newTotalLabel} (ya contabas con: ${currentStockLabel}). Esta cifra excede el tope máximo configurado de ${maxStockLabel}. Sugerimos ajustar la cantidad para evitar el sobrestock.`);
              }, 10);
            }
          }
        }
      }

      return updatedLines;
    });
  }

  function handlePurchaseInvoiceLineUnitChange(lineId: string, value: string) {
    const nextUnit = normalizeBulkStockInputUnit(value);

    setPurchaseInvoiceLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        const product = products.find((entry) => entry.id === line.product_id);
        const currentQuantity = buildPurchaseInvoiceLineTotals(
          line,
          product,
        ).quantity;
        const historicalUnitCost = product
          ? getLatestSupplierUnitPrice(
              purchaseHistory,
              product.id,
              getBulkStockInputUnitLabel(nextUnit),
              purchaseInvoiceProvider,
            )
          : null;
        const defaultLineCost =
          historicalUnitCost ??
          (product
            ? getPurchaseUnitCostValue(
              product,
              normalizeProductMeasurementUnit(product.measurement_unit),
              getBulkStockUnitPounds(nextUnit),
              product.price,
            )
            : null);

        return {
          ...line,
          purchase_presentation_id: "",
          quantity_input_unit: nextUnit,
          quantity: formatBulkStockInputValue(currentQuantity, nextUnit),
          cost:
            defaultLineCost !== null && defaultLineCost > 0
              ? formatMoneyInputValue(defaultLineCost)
              : line.cost,
        };
      }),
    );
  }

  function handlePurchaseInvoiceLinePurchaseUnitChange(
    lineId: string,
    value: string,
  ) {
    if (value.startsWith("presentation:")) {
      handlePurchaseInvoiceLinePresentationChange(
        lineId,
        value.replace("presentation:", ""),
      );
      return;
    }

    handlePurchaseInvoiceLineUnitChange(
      lineId,
      value.replace("bulk:", ""),
    );
  }

  function handlePurchaseInvoiceLinePresentationChange(
    lineId: string,
    presentationId: string,
  ) {
    setPurchaseInvoiceLines((current) =>
      current.map((line) => {
        if (line.id !== lineId) {
          return line;
        }

        const product = products.find((entry) => entry.id === line.product_id);
        const presentation = getPurchaseInvoicePresentationById(
          product,
          presentationId,
        );
        const measurementUnit = normalizeProductMeasurementUnit(
          product?.measurement_unit,
        );
        const unitQuantity =
          measurementUnit === "lb"
            ? getPositiveUnitQuantity(presentation?.unit_quantity, 1)
            : presentationId === "custom"
            ? Math.max(1, Number(line.custom_presentation_quantity) || 1)
            : Math.max(1, Number(presentation?.unit_quantity) || 1);
        const historicalUnitCost = product
          ? getLatestSupplierUnitPrice(
              purchaseHistory,
              product.id,
              presentationId === "custom" ? (line.custom_presentation_name || "Unidad") : (presentation?.name ?? "Unidad"),
              purchaseInvoiceProvider,
            )
          : null;
        const defaultLineCost =
          historicalUnitCost ??
          (product
            ? getPresentationPurchaseCostValue(
              product,
              unitQuantity,
              presentation?.price,
            )
            : null);
        const currentQuantity = buildPurchaseInvoiceLineTotals(
          line,
          product,
        ).quantity;
        const productUsesIva = isPurchaseInvoiceIvaProduct(product);
        const ivaRate = productUsesIva
          ? normalizeMoney(line.iva_rate || String(product?.iva_rate ?? 0))
          : 0;
        const presentationPrice = getPurchasePresentationPublicPrice(
          presentation,
          product,
        );
        const pvpWithoutIva =
          productUsesIva && ivaRate > 0
            ? normalizeMoney(presentationPrice / (1 + ivaRate / 100))
            : presentationPrice;

        return {
          ...line,
          purchase_presentation_id: presentation?.id ?? presentationId,
          quantity:
            measurementUnit === "lb" && unitQuantity > 0
              ? formatDecimalInputValue(currentQuantity / unitQuantity)
              : line.quantity,
          cost:
            defaultLineCost !== null && defaultLineCost > 0
              ? formatMoneyInputValue(defaultLineCost)
              : line.cost,
          pvp_without_iva:
            pvpWithoutIva > 0
              ? formatMoneyInputValue(pvpWithoutIva)
              : line.pvp_without_iva,
        };
      }),
    );
  }

  function handlePurchaseInvoiceProductInput(lineId: string, value: string) {
    setPurchaseInvoiceLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? {
              ...line,
              product_id: "",
              product_search: value,
              purchase_presentation_id: "",
              iva_rate: "",
              pvp_without_iva: "",
            }
          : line,
      ),
    );
  }

  function handleSelectPurchaseInvoiceProduct(
    lineId: string,
    option: AdminComboboxOption,
  ) {
    const product = products.find((entry) => entry.id === option.id);

    setPurchaseInvoiceLines((current) =>
      current.map((line) =>
        line.id === lineId
          ? product
            ? createPurchaseInvoiceLine(
                product,
                line.id,
                purchaseHistory,
                purchaseInvoiceProvider,
              )
            : {
                ...line,
                product_id: "",
                product_search: option.label,
                purchase_presentation_id: "",
                iva_rate: "",
                pvp_without_iva: "",
              }
          : line,
      ),
    );
  }

  function handleAddPurchaseInvoiceLine() {
    setPurchaseInvoiceLines((current) => [...current, createPurchaseInvoiceLine()]);
  }

  function handleRemovePurchaseInvoiceLine(lineId: string) {
    setPurchaseInvoiceLines((current) =>
      current.length > 1
        ? current.filter((line) => line.id !== lineId)
        : [createPurchaseInvoiceLine(null, lineId)],
    );
  }

  function resetPurchaseInvoice(providerName = "") {
    const today = getTodayInputDate();

    setPurchaseInvoiceCode(createPurchaseCode());
    setPurchaseInvoiceProvider(providerName);
    setPurchaseInvoiceDate(today);
    setPurchaseInvoiceNumber("");
    setPurchasePaymentMethod("cash");
    setPurchaseCreditIssueDate(today);
    setPurchaseCreditDueDate("");
    setPurchaseInvoiceLines([createPurchaseInvoiceLine()]);
    setPurchaseProduct(null);
  }

  function handleCloseProductPurchase() {
    if (savingPurchase) {
      return;
    }

    setPurchaseProduct(null);
    setPurchaseForm(createProductPurchaseForm());
  }

  function handlePurchaseField<K extends keyof ProductPurchaseForm>(
    field: K,
    value: ProductPurchaseForm[K],
  ) {
    setPurchaseForm((current) => ({ ...current, [field]: value }));
  }

  function handlePurchasePresentationInput(value: string) {
    const presentation = getExactComboboxItem(
      purchaseProductPresentations,
      value,
      (entry) => entry.name,
    );

    if (presentation) {
      handleSelectPurchasePresentationValue(presentation);
      return;
    }

    setPurchaseForm((current) => ({
      ...current,
      purchase_presentation_id: "",
      purchase_presentation_name: value,
    }));
  }

  function handleSelectPurchasePresentation(option: AdminComboboxOption) {
    const presentation = purchaseProductPresentations.find(
      (entry) => entry.id === option.id,
    );

    if (!presentation) {
      handlePurchasePresentationInput(option.label);
      return;
    }

    handleSelectPurchasePresentationValue(presentation);
  }

  function handleSelectPurchasePresentationValue(
    presentation: ProductPresentation,
  ) {
    const unitQuantity = Math.max(1, Number(presentation.unit_quantity) || 1);

    setPurchaseForm((current) => ({
      ...current,
      purchase_presentation_id: presentation.id,
      purchase_presentation_name: presentation.name,
      purchase_presentation_unit_quantity: formatDecimalInputValue(unitQuantity),
      purchase_cost: purchaseProduct
        ? getPresentationPurchaseCostInputValue(
            purchaseProduct,
            unitQuantity,
            presentation.price,
          )
        : current.purchase_cost,
      price: formatMoneyInputValue(
        getPurchasePresentationPublicPrice(presentation, purchaseProduct),
      ),
    }));
  }

  function handlePurchasePresentationUnitQuantityChange(value: string) {
    const unitQuantity = getFiniteNumberInput(value, Number.NaN);

    setPurchaseForm((current) => ({
      ...current,
      purchase_presentation_unit_quantity: value,
      purchase_cost:
        purchaseProduct && Number.isFinite(unitQuantity) && unitQuantity > 0
          ? getPresentationPurchaseCostInputValue(
              purchaseProduct,
              unitQuantity,
              selectedPurchasePresentation?.price,
            )
          : current.purchase_cost,
    }));
  }

  function handlePurchaseQuantityInputUnitChange(value: string) {
    const nextUnit = normalizeBulkStockInputUnit(value);

    setPurchaseForm((current) => ({
      ...current,
      purchase_cost: purchaseProduct
        ? getBulkPurchaseCostInputValue(purchaseProduct, nextUnit)
        : current.purchase_cost,
      quantity_input_unit: nextUnit,
      quantity: convertBulkInputValueToUnit(
        current.quantity,
        current.quantity_input_unit,
        nextUnit,
      ),
    }));
  }

  async function handleSaveProductPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!purchaseProduct) {
      return;
    }

    const providerName =
      getResolvedProviderName(providerSummaries, purchaseForm.provider) ??
      purchaseForm.provider.trim();
    const measurementUnit = normalizeProductMeasurementUnit(
      purchaseProduct.measurement_unit,
    );
    const purchasedQuantity =
      measurementUnit === "lb"
        ? convertBulkStockInputToPounds(
            purchaseForm.quantity,
            purchaseForm.quantity_input_unit,
            0,
          )
        : getFiniteNumberInput(purchaseForm.quantity, 0);
    const presentationUnitQuantity =
      purchasePresentationUnitQuantity;
    const quantity =
      measurementUnit === "lb"
        ? purchasedQuantity
        : Number((purchasedQuantity * presentationUnitQuantity).toFixed(3));
    const purchaseCostInput = normalizeMoney(purchaseForm.purchase_cost || 0);
    const purchaseCost =
      presentationUnitQuantity > 0
        ? normalizeMoney(purchaseCostInput / presentationUnitQuantity)
        : purchaseCostInput;
    const salePrice = normalizeMoney(purchaseForm.price || 0);
    const updatesSalePresentation =
      presentationUnitQuantity > 1 &&
      selectedPurchasePresentation?.use_for_sale !== false;
    const productBasePrice = updatesSalePresentation
      ? normalizeMoney(purchaseProduct.price)
      : salePrice;
    const salePresentationName = purchaseForm.purchase_presentation_name.trim();

    if (!providerName) {
      setMessage("El proveedor es obligatorio para ingresar la compra.");
      return;
    }

    if (!Number.isFinite(purchasedQuantity) || purchasedQuantity <= 0) {
      setMessage("La cantidad comprada debe ser mayor a cero.");
      return;
    }

    if (
      measurementUnit !== "lb" &&
      (!Number.isInteger(purchasedQuantity) ||
        !Number.isInteger(presentationUnitQuantity))
    ) {
      setMessage("Los productos por unidad deben ingresar cantidades enteras.");
      return;
    }

    if (!Number.isFinite(purchaseCost) || purchaseCost <= 0) {
      setMessage("El costo de compra debe ser mayor a cero.");
      return;
    }

    if (!Number.isFinite(salePrice) || salePrice <= 0) {
      setMessage("El precio de venta debe ser mayor a cero.");
      return;
    }

    if (
      measurementUnit !== "lb" &&
      presentationUnitQuantity > 1 &&
      !salePresentationName
    ) {
      setMessage("Escribe o selecciona la presentacion comprada.");
      return;
    }

    const payload = {
      provider: providerName,
      quantity,
      purchase_unit_quantity: presentationUnitQuantity,
      purchase_cost: purchaseCostInput,
      inventory_unit_cost: purchaseCost,
      price: productBasePrice,
      purchase_input_quantity:
        measurementUnit === "lb"
          ? getFiniteNumberInput(purchaseForm.quantity, 0)
          : purchasedQuantity,
      purchase_input_unit:
        measurementUnit === "lb" ? purchaseForm.quantity_input_unit : "unit",
      sale_presentation_id:
        measurementUnit === "lb" || !updatesSalePresentation
          ? null
          : selectedPurchasePresentation?.id ?? null,
      sale_presentation_name:
        measurementUnit === "lb" || !updatesSalePresentation
          ? null
          : salePresentationName || null,
      sale_presentation_unit_quantity:
        measurementUnit === "lb" || !updatesSalePresentation
          ? null
          : presentationUnitQuantity,
      sale_presentation_price: salePrice,
      entry_date: purchaseForm.entry_date || null,
      manufacture_date: purchaseProductRequiresDates
        ? purchaseForm.manufacture_date || null
        : null,
      expiration_date: purchaseProductRequiresDates
        ? purchaseForm.expiration_date || null
        : null,
      requires_dates: purchaseProductRequiresDates,
    };
    const purchaseQuantityLabel = formatProductStock({
      stock: payload.quantity,
      measurement_unit: measurementUnit,
    });

    setSavingPurchase(true);
    setMessage("");

    if (isDemo) {
      const mergedProduct = mergeLocalDuplicateProduct(purchaseProduct, {
        purchase_cost: payload.purchase_cost,
        inventory_unit_cost: payload.inventory_unit_cost,
        price: payload.price,
        use_current_purchase_cost: true,
        purchase_unit_quantity: payload.purchase_unit_quantity,
        sale_presentation_id: payload.sale_presentation_id,
        sale_presentation_name: payload.sale_presentation_name,
        sale_presentation_unit_quantity: payload.sale_presentation_unit_quantity,
        sale_presentation_price: payload.sale_presentation_price,
        measurement_unit: measurementUnit,
        stock: payload.quantity,
        provider: payload.provider,
        entry_date: payload.entry_date,
        manufacture_date: payload.manufacture_date,
        expiration_date: payload.expiration_date,
        requires_dates: payload.requires_dates,
      });

      setProducts((current) =>
        current.map((product) =>
          product.id === mergedProduct.id ? mergedProduct : product,
        ),
      );
      setProviders((current) =>
        current.some(
          (provider) =>
            provider.name.trim().toLocaleLowerCase("es-EC") ===
            providerName.toLocaleLowerCase("es-EC"),
        )
          ? current
          : [
              ...current,
              {
                id: `provider-${Date.now()}`,
                name: providerName,
              },
            ],
      );
      setPurchaseProduct(null);
      setPurchaseForm(createProductPurchaseForm());
      setSavingPurchase(false);
      setMessage(
        `Compra ingresada: ${purchaseQuantityLabel} para ${purchaseProduct.name}.`,
      );
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/products/${purchaseProduct.id}/purchase`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        mode?: StorageMode;
        product?: Product;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo ingresar la compra.");
      }

      setStorageMode(data.mode ?? "supabase");
      setPurchaseProduct(null);
      setPurchaseForm(createProductPurchaseForm());
      await loadRemoteData();
      setMessage(
        `Compra ingresada: ${purchaseQuantityLabel} para ${purchaseProduct.name}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo ingresar la compra.",
      );
    } finally {
      setSavingPurchase(false);
    }
  }

  async function handleSavePurchaseInvoice(event?: FormEvent<HTMLFormElement>, confirmed: boolean = false) {
    event?.preventDefault();
    const purchaseCode = purchaseInvoiceCode.trim() || createPurchaseCode();
    const purchaseDate = getTodayInputDate();
    const providerName =
      getResolvedProviderName(providerSummaries, purchaseInvoiceProvider) ??
      purchaseInvoiceProvider.trim();
    const creditDays =
      purchasePaymentMethod === "credit"
        ? calculatedPurchaseCreditDays
        : 0;
    const preparedLines = purchaseInvoiceLines
      .map((line) => {
        const product = products.find((entry) => entry.id === line.product_id);
        const totals = buildPurchaseInvoiceLineTotals(line, product);

        return {
          line,
          product,
          totals,
        };
      })
      .filter((entry) => entry.product);

    if (!providerName) {
      setMessage("El proveedor es obligatorio para ingresar la compra.");
      return;
    }

    if (!purchaseDate) {
      setMessage("La fecha de compra es obligatoria.");
      return;
    }

    if (
      purchasePaymentMethod === "credit" &&
      (!purchaseCreditIssueDate || !purchaseCreditDueDate)
    ) {
      setMessage("Selecciona la fecha de emision y vencimiento del credito.");
      return;
    }

    if (
      purchasePaymentMethod === "credit" &&
      (!Number.isFinite(creditDays) || creditDays <= 0)
    ) {
      setMessage("La fecha de vencimiento debe ser posterior a la emision.");
      return;
    }

    if (purchaseInvoiceDate !== purchaseDate) {
      setPurchaseInvoiceDate(purchaseDate);
    }

    if (!preparedLines.length) {
      setMessage("Agrega al menos un producto a la compra.");
      return;
    }

    const invalidLine = preparedLines.find(({ line, product, totals }) => {
      const measurementUnit = normalizeProductMeasurementUnit(
        product?.measurement_unit,
      );
      const discountRate = getFiniteNumberInput(line.discount_rate, 0);

      return (
        !Number.isFinite(totals.quantity) ||
        totals.quantity <= 0 ||
        (measurementUnit !== "lb" && !Number.isInteger(totals.quantity)) ||
        !Number.isFinite(totals.cost) ||
        totals.cost <= 0 ||
        !Number.isFinite(discountRate) ||
        discountRate < 0 ||
        discountRate > 100 ||
        !Number.isFinite(totals.ivaRate) ||
        totals.ivaRate < 0 ||
        !Number.isFinite(totals.pvpWithoutIva) ||
        totals.pvpWithoutIva <= 0
      );
    });

    if (invalidLine) {
      setMessage(
        "Revisa cantidad, precio del proveedor, descuento, IVA y precio al publico.",
      );
      return;
    }

    if (!confirmed) {
      setPendingPurchaseConfirmation({
        purchaseCode,
        providerName,
        productCount: preparedLines.length,
      });
      return;
    }

    setSavingPurchase(true);
    setMessage("");

    if (isDemo) {
      const nextProducts = [...products];

      for (const { line, product, totals } of preparedLines) {
        if (!product) {
          continue;
        }

        const lineRequiresDates = doesProductRequireDates(product);
        const mergedProduct = mergeLocalDuplicateProduct(product, {
          purchase_cost: totals.purchaseUnitCost,
          inventory_unit_cost: totals.unitCostWithoutIva,
          price: totals.presentationId
            ? totals.basePvpWithoutIva
            : totals.pvpWithoutIva,
          use_current_purchase_cost: true,
          measurement_unit: normalizeProductMeasurementUnit(
            product.measurement_unit,
          ),
          stock: totals.quantity,
          provider: providerName,
          entry_date: purchaseDate,
          manufacture_date: lineRequiresDates ? line.manufacture_date || null : null,
          expiration_date: lineRequiresDates ? line.expiration_date || null : null,
          has_iva: Boolean(product.has_iva),
          iva_rate: totals.hasIva ? totals.ivaRate : 0,
          requires_dates: lineRequiresDates,
          sale_presentation_id: totals.presentationId,
          sale_presentation_name: totals.presentationName,
          sale_presentation_unit_quantity: totals.presentationId
            ? totals.presentationUnitQuantity
            : null,
          sale_presentation_price: totals.pvpWithoutIva,
        });
        const index = nextProducts.findIndex((entry) => entry.id === product.id);

        if (index >= 0) {
          nextProducts[index] = mergedProduct;
        }
      }

      setProducts(nextProducts);
      setProviders((current) =>
        current.some(
          (provider) =>
            provider.name.trim().toLocaleLowerCase("es-EC") ===
            providerName.toLocaleLowerCase("es-EC"),
        )
          ? current
          : [
              ...current,
              {
                id: `provider-${Date.now()}`,
                name: providerName,
              },
            ],
      );
      resetPurchaseInvoice();
      setSavingPurchase(false);
      setMessage(`Compra ${purchaseCode} ingresada para ${providerName}.`);
      return;
    }

    try {
      for (const { line, product, totals } of preparedLines) {
        if (!product) {
          continue;
        }

        const lineRequiresDates = doesProductRequireDates(product);
        const response = await fetch(`/api/admin/products/${product.id}/purchase`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: providerName,
            quantity: totals.quantity,
            purchase_unit_quantity: totals.presentationUnitQuantity,
            purchase_cost: totals.purchaseUnitCost,
            inventory_unit_cost: totals.unitCostWithoutIva,
            price: totals.basePvpWithoutIva,
            purchase_input_quantity: totals.purchaseQuantity,
            purchase_input_unit: totals.purchaseUnit,
            sale_presentation_id: totals.presentationId,
            sale_presentation_name: totals.presentationName,
            sale_presentation_unit_quantity: totals.presentationId
              ? totals.presentationUnitQuantity
              : null,
            sale_presentation_price: totals.pvpWithoutIva,
            purchase_code: purchaseCode,
            entry_date: purchaseDate,
            manufacture_date: lineRequiresDates ? line.manufacture_date || null : null,
            expiration_date: lineRequiresDates ? line.expiration_date || null : null,
            invoice_number: purchaseInvoiceNumber.trim() || null,
            invoice_date:
              purchasePaymentMethod === "credit"
                ? purchaseCreditIssueDate
                : purchaseDate,
            payment_method: purchasePaymentMethod,
            credit_days:
              purchasePaymentMethod === "credit" ? creditDays : null,
            iva_rate: totals.ivaRate,
            iva_amount: totals.ivaAmount,
            line_subtotal: totals.subtotal,
            line_total: totals.total,
            product_has_iva: Boolean(product.has_iva),
            product_iva_rate: totals.hasIva ? totals.ivaRate : 0,
            requires_dates: lineRequiresDates,
          }),
        });
        const data = (await response.json()) as {
          ok: boolean;
          mode?: StorageMode;
          error?: string;
        };

        if (!response.ok || !data.ok) {
          throw new Error(
            data.error ?? `No se pudo ingresar ${product.name}.`,
          );
        }

        setStorageMode(data.mode ?? "supabase");
      }

      await loadRemoteData();
      resetPurchaseInvoice();
      setMessage(`Compra ${purchaseCode} ingresada para ${providerName}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo ingresar la compra.",
      );
    } finally {
      setSavingPurchase(false);
    }
  }

  async function handleDeleteProduct(product: Product) {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar "${product.name}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    setDeletingProductId(product.id);
    setMessage("");

    if (isDemo) {
      const nextProducts = products.filter((entry) => entry.id !== product.id);
      setProducts(nextProducts);
      setCategories((current) =>
        pruneLocalOrphanCategories(current, nextProducts),
      );
      setProviders((current) => pruneLocalOrphanProviders(current, nextProducts));
      setSelectedCategoryProductIds((current) =>
        current.filter((productId) => productId !== product.id),
      );
      setSelectedCatalogProductIds((current) =>
        current.filter((productId) => productId !== product.id),
      );
      setDeletingProductId(null);
      setMessage(`Producto "${product.name}" eliminado (modo demo).`);
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo eliminar el producto.");
      }

      await loadRemoteData();
      setSelectedCategoryProductIds((current) =>
        current.filter((productId) => productId !== product.id),
      );
      setSelectedCatalogProductIds((current) =>
        current.filter((productId) => productId !== product.id),
      );
      setMessage(`Producto "${product.name}" eliminado correctamente.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el producto.",
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  async function handleDeleteProductLot(lot: ProductLot) {
    const productId = productForm.id;

    if (!productId || deletingProductLotId) {
      return;
    }

    const quantity = getAvailableProductLotQuantity(lot);
    const quantityLabel = formatLotQuantity(quantity, lot.quantity_unit);

    if (
      !window.confirm(
        `Eliminar esta existencia de ${quantityLabel}? El stock del producto se descontara.`,
      )
    ) {
      return;
    }

    setDeletingProductLotId(lot.id);
    setMessage("");

    const currentProduct =
      products.find((product) => product.id === productId) ?? null;
    const nextProduct = currentProduct
      ? getProductWithoutLot(currentProduct, lot)
      : null;

    if (isDemo) {
      if (nextProduct) {
        setProducts((current) =>
          current.map((product) =>
            product.id === productId ? nextProduct : product,
          ),
        );
        syncProductFormStockFromProduct(nextProduct);
      }

      setMessage("Existencia eliminada correctamente.");
      setDeletingProductLotId(null);
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/products/${productId}/lots/${lot.id}`,
        {
          method: "DELETE",
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo eliminar la existencia.");
      }

      if (nextProduct) {
        syncProductFormStockFromProduct(nextProduct);
      }

      await loadRemoteData();
      setMessage("Existencia eliminada correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la existencia.",
      );
    } finally {
      setDeletingProductLotId(null);
    }
  }

  function syncProductFormStockFromProduct(product: Product) {
    const display = getProductPresentationStockDisplay(product, product.stock);

    setProductForm((current) =>
      current.id === product.id
        ? {
            ...current,
            stock: display.quantity,
            stock_presentation_id: display.presentationId,
          }
        : current,
    );
  }

  function handleToggleCategoryProductSelection(productId: string) {
    setSelectedCategoryProductIds((current) =>
      current.includes(productId)
        ? current.filter((entry) => entry !== productId)
        : [...current, productId],
    );
  }

  function handleToggleAllCategoryProducts() {
    const currentCategoryProductIds = new Set(
      selectedCategoryProducts.map((product) => product.id),
    );

    setSelectedCategoryProductIds((current) => {
      const withoutCurrentCategory = current.filter(
        (productId) => !currentCategoryProductIds.has(productId),
      );

      return allCategoryProductsSelected
        ? withoutCurrentCategory
        : [
            ...withoutCurrentCategory,
            ...selectedCategoryProducts.map((product) => product.id),
          ];
    });
  }

  function handleToggleCatalogProductSelection(productId: string) {
    setSelectedCatalogProductIds((current) =>
      current.includes(productId)
        ? current.filter((entry) => entry !== productId)
        : [...current, productId],
    );
  }

  function handleToggleAllVisibleCatalogProducts() {
    const visibleProductIds = new Set(
      filteredProducts.map((product) => product.id),
    );

    setSelectedCatalogProductIds((current) => {
      const withoutVisibleProducts = current.filter(
        (productId) => !visibleProductIds.has(productId),
      );

      return allVisibleCatalogProductsSelected
        ? withoutVisibleProducts
        : [
            ...withoutVisibleProducts,
            ...filteredProducts.map((product) => product.id),
          ];
    });
  }

  async function handleDeleteSelectedCategoryProducts() {
    if (!selectedCategorySelectedProducts.length) {
      return;
    }

    const selectedProductIds = new Set(
      selectedCategorySelectedProducts.map((product) => product.id),
    );
    const confirmation = `Eliminar ${selectedCategorySelectedProducts.length} producto(s) de "${selectedCategory?.name ?? "esta categoria"}".`;

    if (!window.confirm(`${confirmation}\n\nDeseas continuar?`)) {
      return;
    }

    setDeletingProductId(BULK_DELETE_PRODUCT_ID);
    setMessage("");

    if (isDemo) {
      const nextProducts = products.filter(
        (product) => !selectedProductIds.has(product.id),
      );
      setProducts(nextProducts);
      setCategories((current) =>
        pruneLocalOrphanCategories(current, nextProducts),
      );
      setProviders((current) => pruneLocalOrphanProviders(current, nextProducts));
      setSelectedCategoryProductIds((current) =>
        current.filter((productId) => !selectedProductIds.has(productId)),
      );
      setSelectedCatalogProductIds((current) =>
        current.filter((productId) => !selectedProductIds.has(productId)),
      );
      setDeletingProductId(null);
      setMessage("Productos eliminados en modo demo.");
      return;
    }

    try {
      await Promise.all(
        selectedCategorySelectedProducts.map(async (product) => {
          const response = await fetch(`/api/admin/products/${product.id}`, {
            method: "DELETE",
          });
          const data = (await response.json()) as {
            ok: boolean;
            error?: string;
          };

          if (!response.ok || !data.ok) {
            throw new Error(
              data.error ?? `No se pudo eliminar "${product.name}".`,
            );
          }
        }),
      );

      setSelectedCategoryProductIds((current) =>
        current.filter((productId) => !selectedProductIds.has(productId)),
      );
      setSelectedCatalogProductIds((current) =>
        current.filter((productId) => !selectedProductIds.has(productId)),
      );
      await loadRemoteData();
      setMessage("Productos eliminados de Supabase.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron eliminar los productos.",
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  async function handleDeleteSelectedCatalogProducts() {
    if (!selectedCatalogProducts.length) {
      return;
    }

    const selectedProductIds = new Set(
      selectedCatalogProducts.map((product) => product.id),
    );
    const confirmation = `Eliminar ${selectedCatalogProducts.length} producto(s) seleccionados del catalogo.`;

    if (!window.confirm(`${confirmation}\n\nDeseas continuar?`)) {
      return;
    }

    setDeletingProductId(BULK_DELETE_PRODUCT_ID);
    setMessage("");

    if (isDemo) {
      const nextProducts = products.filter(
        (product) => !selectedProductIds.has(product.id),
      );
      setProducts(nextProducts);
      setCategories((current) =>
        pruneLocalOrphanCategories(current, nextProducts),
      );
      setProviders((current) => pruneLocalOrphanProviders(current, nextProducts));
      setSelectedCategoryProductIds((current) =>
        current.filter((productId) => !selectedProductIds.has(productId)),
      );
      setSelectedCatalogProductIds((current) =>
        current.filter((productId) => !selectedProductIds.has(productId)),
      );
      setDeletingProductId(null);
      setMessage("Productos seleccionados eliminados en modo demo.");
      return;
    }

    try {
      await Promise.all(
        selectedCatalogProducts.map(async (product) => {
          const response = await fetch(`/api/admin/products/${product.id}`, {
            method: "DELETE",
          });
          const data = (await response.json()) as {
            ok: boolean;
            error?: string;
          };

          if (!response.ok || !data.ok) {
            throw new Error(
              data.error ?? `No se pudo eliminar "${product.name}".`,
            );
          }
        }),
      );

      setSelectedCategoryProductIds((current) =>
        current.filter((productId) => !selectedProductIds.has(productId)),
      );
      setSelectedCatalogProductIds((current) =>
        current.filter((productId) => !selectedProductIds.has(productId)),
      );
      await loadRemoteData();
      setMessage("Productos seleccionados eliminados de Supabase.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudieron eliminar los productos seleccionados.",
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  function handleEdit(product: Product) {
    const measurementUnit = normalizeProductMeasurementUnit(
      product.measurement_unit,
    );
    const stockInputUnit =
      measurementUnit === "lb"
        ? getPreferredBulkStockInputUnit(product.stock)
        : DEFAULT_BULK_STOCK_INPUT_UNIT;
    const minStockInputUnit =
      measurementUnit === "lb"
        ? getPreferredBulkStockInputUnit(product.min_stock)
        : "lb";
    const maxStockInputUnit =
      measurementUnit === "lb"
        ? getPreferredBulkStockInputUnit(product.max_stock ?? 100)
        : DEFAULT_BULK_STOCK_INPUT_UNIT;
    const stockDisplay = getProductPresentationStockDisplay(
      product,
      product.stock,
    );
    const minStockDisplay = getProductPresentationStockDisplay(
      product,
      product.min_stock,
    );
    const maxStockDisplay = getProductPresentationStockDisplay(
      product,
      product.max_stock ?? 100,
    );
    const purchaseCostInputUnit =
      measurementUnit === "lb" ? DEFAULT_BULK_STOCK_INPUT_UNIT : "lb";

    setProductForm({
      id: product.id,
      category_id: product.category_id ?? "",
      category_name: product.categories?.name ?? "",
      name: product.name,
      sku: product.sku,
      product_code: product.product_code ?? "",
      description: product.description ?? "",
      purchase_cost:
        measurementUnit === "lb"
          ? getBulkPurchaseCostInputValue(product, purchaseCostInputUnit)
          : formatMoneyInputValue(product.purchase_cost),
      purchase_cost_input_unit: purchaseCostInputUnit,
      price: formatMoneyInputValue(product.price),
      measurement_unit: measurementUnit,
      stock:
        measurementUnit === "lb"
          ? formatBulkStockInputValue(product.stock, stockInputUnit)
          : stockDisplay.quantity,
      stock_presentation_id: stockDisplay.presentationId,
      stock_input_unit: stockInputUnit,
      min_stock:
        measurementUnit === "lb"
          ? formatBulkStockInputValue(product.min_stock, minStockInputUnit)
          : minStockDisplay.quantity,
      min_stock_presentation_id: minStockDisplay.presentationId,
      min_stock_input_unit: minStockInputUnit,
      max_stock:
        measurementUnit === "lb"
          ? formatBulkStockInputValue(
              product.max_stock ?? 100,
              maxStockInputUnit,
            )
          : maxStockDisplay.quantity,
      max_stock_presentation_id: maxStockDisplay.presentationId,
      max_stock_input_unit: maxStockInputUnit,
      image_url: product.image_url ?? "",
      provider: product.provider ?? "",
      is_active: true,
      has_iva: Boolean(product.has_iva),
      iva_rate: formatMoneyInputValue(product.iva_rate ?? 15),
      requires_dates: doesProductRequireDates(product),
      entry_date: normalizeDateInput(product.entry_date) ?? getTodayInputDate(),
      manufacture_date: normalizeDateInput(product.manufacture_date) ?? "",
      expiration_date: normalizeDateInput(product.expiration_date) ?? "",
      presentations: createProductPresentationDrafts(product),
    });
    clearLocalImagePreview();
    setActiveSection("product");
  }

  function handleOpenCategory(category: Category) {
    setSelectedCategoryId(category.id);
    setActiveSection("categories");
  }

  function handleStartProduct(categoryId = "", providerName = "") {
    const categoryName =
      categories.find((category) => category.id === categoryId)?.name ?? "";

    setProductForm({
      ...emptyProductForm,
      category_id: categoryId,
      category_name: categoryName,
      provider: providerName,
      sku: generateUniqueProductSku(products, {
        categoryName,
        productName: "",
      }),
      presentations: createProductPresentationDrafts(null),
    });
    clearLocalImagePreview();
    setActiveSection(
      isProductCreationSection ? activeSection : "create-product",
    );
  }

  async function handleDownloadSalesReceipt() {
    if (!selectedInvoice || generatingReceiptPdfId) {
      return;
    }

    setGeneratingReceiptPdfId(selectedInvoice.id);
    setMessage("");
    try {
      await downloadSalesReceiptPdf(selectedInvoice);
      setMessage(`PDF ${selectedInvoice.invoice_number} descargado.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo generar el comprobante PDF.",
      );
    } finally {
      setGeneratingReceiptPdfId("");
    }
  }

  function handleClearSalesFilters() {
    setInvoiceSearch("");
    setBillingFilter("all");
    setInvoiceDeliveryFilter("all");
    setInvoicePeriodFilter("all");
    setInvoiceDateFilter("");
    setInvoiceEndDateFilter("");
  }

  async function handleResolveInvoiceAlert(invoice: InvoiceRecord) {
    if (!invoice.notes) return;
    try {
      const newNotes = invoice.notes.replace("Cliente confirmo que recibio el pedido: No", "Cliente confirmo que recibio el pedido: Si (Resuelto)");
      const response = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_alert", notes: newNotes }),
      });
      if (!response.ok) throw new Error("No se pudo resolver la alerta");
      await loadRemoteInvoices();
      setMessage("Alerta resuelta correctamente.");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }

  async function handleCancelInvoice(invoice: InvoiceRecord) {
    if (invoice.status === "cancelled") {
      setMessage("Esta venta ya esta anulada.");
      return;
    }

    if (
      !window.confirm(
        `Anular la venta ${invoice.invoice_number} devolvera sus productos al inventario.\n\nDeseas continuar?`,
      )
    ) {
      return;
    }

    setInvoiceActionId(invoice.id);
    setMessage("");

    if (isDemo) {
      setInvoices((current) =>
        current.map((entry) =>
          entry.id === invoice.id ? { ...entry, status: "cancelled" } : entry,
        ),
      );
      setMessage(`Venta demo ${invoice.invoice_number} anulada.`);
      setInvoiceActionId("");
      return;
    }

    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo anular la venta.");
      }

      await Promise.all([loadRemoteInvoices(), loadRemoteData()]);
      setMessage(`Venta ${invoice.invoice_number} anulada correctamente.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo anular la venta.",
      );
    } finally {
      setInvoiceActionId("");
    }
  }

  async function handleDeleteInvoice(invoice: InvoiceRecord) {
    if (
      !window.confirm(
        `Eliminar el registro ${invoice.invoice_number} lo borrara definitivamente del historial sin alterar el stock.\n\nDeseas continuar?`,
      )
    ) {
      return;
    }

    setInvoiceActionId(invoice.id);
    setMessage("");

    if (isDemo) {
      setInvoices((current) =>
        current.filter((entry) => entry.id !== invoice.id),
      );
      if (selectedInvoiceId === invoice.id) {
        setSelectedInvoiceId("");
      }
      setMessage(`Comprobante demo ${invoice.invoice_number} eliminado.`);
      setInvoiceActionId("");
      return;
    }

    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo eliminar el comprobante.");
      }

      if (selectedInvoiceId === invoice.id) {
        setSelectedInvoiceId("");
      }
      await loadRemoteInvoices();
      setMessage(`Comprobante ${invoice.invoice_number} eliminado correctamente.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el comprobante.",
      );
    } finally {
      setInvoiceActionId("");
    }
  }

  async function handleBulkDeleteSalesInvoices() {
    if (selectedSalesInvoiceIds.length === 0) return;

    if (
      !window.confirm(
        `¿Estás seguro de eliminar ${selectedSalesInvoiceIds.length} comprobante(s) permanentemente? Esta acción solo limpiará el historial sin afectar el inventario actual.`,
      )
    ) {
      return;
    }

    setDeletingSalesInvoices(true);
    setMessage("");

    if (isDemo) {
      setInvoices((current) =>
        current.filter((entry) => !selectedSalesInvoiceIds.includes(entry.id)),
      );
      if (selectedSalesInvoiceIds.includes(selectedInvoiceId)) {
        setSelectedInvoiceId("");
      }
      setSelectedSalesInvoiceIds([]);
      setMessage(`${selectedSalesInvoiceIds.length} comprobantes demo eliminados.`);
      setDeletingSalesInvoices(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/invoices/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedSalesInvoiceIds }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo eliminar los comprobantes.");
      }

      if (selectedSalesInvoiceIds.includes(selectedInvoiceId)) {
        setSelectedInvoiceId("");
      }
      setSelectedSalesInvoiceIds([]);
      await loadRemoteInvoices();
      setMessage(`${selectedSalesInvoiceIds.length} comprobantes eliminados correctamente.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar los comprobantes.",
      );
    } finally {
      setDeletingSalesInvoices(false);
    }
  }

  function handleNavDragStart(
    event: DragEvent<HTMLButtonElement>,
    sectionId: AdminSection,
  ) {
    setDraggingNavItem(sectionId);
    setDragOverNavItem(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", sectionId);
  }

  function handleNavDragOver(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleNavDrop(
    event: DragEvent<HTMLButtonElement>,
    targetId: AdminSection,
  ) {
    event.preventDefault();

    const sourceId =
      getAdminSection(event.dataTransfer.getData("text/plain")) ??
      draggingNavItem;

    if (!sourceId || sourceId === targetId) {
      setDraggingNavItem(null);
      setDragOverNavItem(null);
      return;
    }

    const sourceIndex = navOrder.indexOf(sourceId);
    const targetIndex = navOrder.indexOf(targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggingNavItem(null);
      setDragOverNavItem(null);
      return;
    }

    const nextOrder = [...navOrder];
    const [movedSection] = nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(targetIndex, 0, movedSection);

    setNavOrder(nextOrder);
    storeAdminNavOrder(nextOrder);
    setDraggingNavItem(null);
    setDragOverNavItem(null);
  }

  function handleNavDragEnd() {
    setDraggingNavItem(null);
    setDragOverNavItem(null);
  }

  function handleHistoryDragStart(
    event: DragEvent<HTMLDetailsElement>,
    sectionId: string,
  ) {
    setDraggingHistoryItem(sectionId);
    setDragOverHistoryItem(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", sectionId);
  }

  function handleHistoryDragOver(
    event: DragEvent<HTMLDetailsElement>,
    sectionId: string,
  ) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (draggingHistoryItem && draggingHistoryItem !== sectionId) {
      setDragOverHistoryItem(sectionId);
    }
  }

  function handleHistoryDrop(
    event: DragEvent<HTMLDetailsElement>,
    targetId: string,
  ) {
    event.preventDefault();

    const sourceId =
      event.dataTransfer.getData("text/plain") || draggingHistoryItem;

    if (!sourceId || sourceId === targetId) {
      setDraggingHistoryItem(null);
      setDragOverHistoryItem(null);
      return;
    }

    const sourceIndex = historyOrder.indexOf(sourceId);
    const targetIndex = historyOrder.indexOf(targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggingHistoryItem(null);
      setDragOverHistoryItem(null);
      return;
    }

    const nextOrder = [...historyOrder];
    const [movedSection] = nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(targetIndex, 0, movedSection);

    setHistoryOrder(nextOrder);
    setDraggingHistoryItem(null);
    setDragOverHistoryItem(null);
  }

  function handleHistoryDragEnd() {
    setDraggingHistoryItem(null);
    setDragOverHistoryItem(null);
  }

  function handleProductField<K extends keyof ProductForm>(
    field: K,
    value: ProductForm[K],
  ) {
    setProductForm((current) => {
      const nextForm = { ...current, [field]: value };

      if (field !== "price") {
        return nextForm;
      }

      return {
        ...nextForm,
        presentations: syncDefaultProductPresentationDraftPrice(
          nextForm,
          String(value ?? ""),
        ),
      };
    });
  }

  function handleProductIvaModeChange(value: string) {
    const hasIva = value === "with_iva";

    setProductForm((current) => ({
      ...current,
      has_iva: hasIva,
      iva_rate: current.iva_rate || emptyProductForm.iva_rate,
    }));
  }

  function handleProductPurchaseCostUnitChange(value: string) {
    const nextUnit = normalizeBulkStockInputUnit(value);

    setProductForm((current) => {
      if (normalizeProductMeasurementUnit(current.measurement_unit) !== "lb") {
        return { ...current, purchase_cost_input_unit: nextUnit };
      }

      const unitCost = getStoredProductPurchaseCostValue(current);

      return {
        ...current,
        purchase_cost: formatMoneyInputValue(
          unitCost * getBulkStockUnitPounds(nextUnit),
        ),
        purchase_cost_input_unit: nextUnit,
      };
    });
  }

  function handleAddProductPresentation(template?: { name: string; unit_quantity: string }) {
    setProductForm((current) => ({
      ...current,
      presentations: [
        ...getProductPresentationDrafts(current),
        createProductPresentationDraft({
          is_default: false,
          name: template?.name || "",
          price: "",
          unit_quantity: template?.unit_quantity || "",
          use_for_purchase: true,
          use_for_sale: false,
        }),
      ],
    }));
  }

  function handleProductPresentationField<
    K extends keyof Pick<
      ProductPresentationDraft,
      "name" | "unit_quantity" | "price" | "use_for_purchase" | "use_for_sale"
    >,
  >(
    index: number,
    field: K,
    value: ProductPresentationDraft[K],
  ) {
    setProductForm((current) => {
      const presentations = getProductPresentationDrafts(current);

      if (!presentations[index]) {
        return current;
      }

      presentations[index] = {
        ...presentations[index],
        [field]: value,
      };

      if (field === "name") {
        const nameStr = String(value).trim();
        const measurementUnit = normalizeProductMeasurementUnit(current.measurement_unit);

        if (measurementUnit === "lb") {
          const bulkPresets: Record<string, string> = {
            "Libra": "1",
            "Media Libra": "0.5",
            "Cuarto de Libra": "0.25",
            "Kilo": "2.20462",
            "Arroba": "25",
            "Quintal": "100",
          };
          
          const presetKeys = Object.keys(bulkPresets);
          const matchedKey = presetKeys.find((key) => key.localeCompare(nameStr, undefined, { sensitivity: 'base' }) === 0);
          
          if (matchedKey) {
             presentations[index].unit_quantity = bulkPresets[matchedKey];
          } else if (!presentations[index].unit_quantity) {
             // NLP Magic: match "<number> <unit>"
             const regex = /([\d.,]+)\s*(kg|kilo|kilos|g|gr|gramos|lb|lbs|libras|oz|onzas|arrobas?|quintales?)/i;
             const match = nameStr.match(regex);
             if (match) {
               const qtyStr = match[1].replace(",", ".");
               const qty = Number(qtyStr);
               const unit = match[2].toLowerCase();
               if (Number.isFinite(qty) && qty > 0) {
                 let lbs = 0;
                 if (unit.startsWith("kg") || unit.startsWith("kilo")) lbs = qty * 2.20462;
                 else if (unit.startsWith("g")) lbs = qty * 0.00220462;
                 else if (unit.startsWith("oz") || unit.startsWith("onza")) lbs = qty * 0.0625;
                 else if (unit.startsWith("arroba")) lbs = qty * 25;
                 else if (unit.startsWith("quintal")) lbs = qty * 100;
                 else if (unit.startsWith("lb") || unit.startsWith("libra")) lbs = qty;

                 if (lbs > 0) {
                   presentations[index].unit_quantity = lbs.toFixed(2).replace(/\.00$/, "");
                 }
               }
             }
          }
        } else if (measurementUnit === "unit" && !presentations[index].unit_quantity) {
          const unitPresets: Record<string, string> = {
            "Par": "2",
            "Docena": "12",
            "Six-pack": "6",
          };
          const matchedKey = Object.keys(unitPresets).find((key) => key.localeCompare(nameStr, undefined, { sensitivity: 'base' }) === 0);
          if (matchedKey) {
             presentations[index].unit_quantity = unitPresets[matchedKey];
          } else {
             const regex = /([\d.,]+)\s*(unidades?|uds?)/i;
             const match = nameStr.match(regex);
             if (match) {
               const qty = Number(match[1].replace(",", "."));
               if (Number.isFinite(qty) && qty > 0) {
                 presentations[index].unit_quantity = String(qty);
               }
             } else {
               const regex2 = /(?:caja|paquete|cubeta|bulto|paca).*?(?:de|con)?\s*([\d.,]+)/i;
               const match2 = nameStr.match(regex2);
               if (match2) {
                 const qty = Number(match2[1].replace(",", "."));
                 if (Number.isFinite(qty) && qty > 0) {
                   presentations[index].unit_quantity = String(qty);
                 }
               }
             }
          }
        }
      }

      let updatedPrice = current.price;
      if (field === "price" && normalizeProductMeasurementUnit(current.measurement_unit) === "unit") {
        const defaultIndex = presentations.findIndex(
          (presentation) =>
            presentation.use_for_sale &&
            Number(presentation.unit_quantity) === 1 &&
            presentation.is_default,
        );
        const resolvedDefaultIndex =
          defaultIndex >= 0
            ? defaultIndex
            : presentations.findIndex(
                (presentation) =>
                  presentation.use_for_sale &&
                  Number(presentation.unit_quantity) === 1,
              );
        
        if (index === resolvedDefaultIndex) {
          updatedPrice = String(value ?? "");
        }
      }

      return { ...current, presentations, price: updatedPrice };
    });
  }

  function handleRemoveProductPresentation(index: number) {
    setProductForm((current) => {
      const presentations = getProductPresentationDrafts(current)
        .filter((_, presentationIndex) => presentationIndex !== index);

      return {
        ...current,
        presentations: normalizeProductPresentationDrafts(presentations, current),
      };
    });
  }

  function handleProductCategoryInput(value: string) {
    const matchedCategory = getExactComboboxItem(
      categories,
      value,
      (category) => category.name,
    );

    setProductForm((current) => ({
      ...current,
      category_id: matchedCategory?.id ?? "",
      category_name: value,
    }));
  }

  function handleSelectProductCategory(option: AdminComboboxOption) {
    const category = categories.find((entry) => entry.id === option.id);

    if (!category) {
      handleProductCategoryInput(option.label);
      return;
    }

    setProductForm((current) => ({
      ...current,
      category_id: category.id,
      category_name: category.name,
    }));
  }

  function handleProductProviderInput(value: string) {
    const resolvedProviderName =
      getResolvedProviderName(providerSummaries, value) ?? value;

    setProductForm((current) => ({
      ...current,
      provider:
        isComboboxExactMatch(providerSummaries, value, (provider) => provider.name)
          ? resolvedProviderName
          : value,
    }));
  }

  function handleSelectProductProvider(option: AdminComboboxOption) {
    handleProductField("provider", option.label);
  }

  function handleProductNameInput(value: string) {
    setProductForm((current) => ({
      ...current,
      name: value,
    }));
  }

  function handleSelectExistingProduct(option: AdminComboboxOption) {
    const product = products.find((entry) => entry.id === option.id);

    if (!product) {
      handleProductNameInput(option.label);
      return;
    }

    const providerName =
      getResolvedProviderName(providerSummaries, productForm.provider) ??
      productForm.provider.trim();
    handleOpenProductPurchase(product, providerName);
    setMessage(`Compra de inventario para ${product.name}.`);
  }

  function handleSelectPurchaseProvider(option: AdminComboboxOption) {
    handlePurchaseField("provider", option.label);
  }

  function handleProductMeasurementUnitChange(value: string) {
    const measurementUnit = normalizeProductMeasurementUnit(value);

    setProductForm((current) => {
      const currentMeasurementUnit = normalizeProductMeasurementUnit(
        current.measurement_unit,
      );
      const changedMeasurementUnit = measurementUnit !== currentMeasurementUnit;

      return {
        ...current,
        measurement_unit: measurementUnit,
        presentations: normalizeProductPresentationDrafts(
          current.presentations,
          { ...current, measurement_unit: measurementUnit },
        ),
        purchase_cost_input_unit:
          measurementUnit === "lb"
            ? current.purchase_cost_input_unit || DEFAULT_BULK_STOCK_INPUT_UNIT
            : current.purchase_cost_input_unit,
        stock: changedMeasurementUnit ? "0" : current.stock,
        stock_presentation_id:
          measurementUnit === "unit"
            ? current.stock_presentation_id || DEFAULT_STOCK_PRESENTATION_ID
            : "",
        stock_input_unit:
          measurementUnit === "lb"
            ? DEFAULT_BULK_STOCK_INPUT_UNIT
            : current.stock_input_unit,
        min_stock:
          measurementUnit === "lb" && currentMeasurementUnit !== "lb"
            ? "25"
            : measurementUnit === "unit" && currentMeasurementUnit === "lb"
              ? "5"
              : current.min_stock,
        min_stock_presentation_id:
          measurementUnit === "unit"
            ? current.min_stock_presentation_id || DEFAULT_STOCK_PRESENTATION_ID
            : "",
        min_stock_input_unit:
          measurementUnit === "lb" && currentMeasurementUnit !== "lb"
            ? "lb"
            : current.min_stock_input_unit,
        max_stock:
          measurementUnit === "lb" && currentMeasurementUnit !== "lb"
            ? "1"
            : measurementUnit === "unit" && currentMeasurementUnit === "lb"
              ? "100"
              : current.max_stock,
        max_stock_presentation_id:
          measurementUnit === "unit"
            ? current.max_stock_presentation_id || DEFAULT_STOCK_PRESENTATION_ID
            : "",
        max_stock_input_unit:
          measurementUnit === "lb"
            ? DEFAULT_BULK_STOCK_INPUT_UNIT
            : current.max_stock_input_unit,
      };
    });
  }

  function handleStockInputUnitChange(value: string) {
    const nextUnit = normalizeBulkStockInputUnit(value);

    setProductForm((current) => ({
      ...current,
      stock_input_unit: nextUnit,
      stock: convertBulkInputValueToUnit(
        current.stock,
        current.stock_input_unit,
        nextUnit,
      ),
    }));
  }

  function handleMinStockInputUnitChange(value: string) {
    const nextUnit = normalizeBulkStockInputUnit(value);

    setProductForm((current) => ({
      ...current,
      min_stock_input_unit: nextUnit,
      min_stock: convertBulkInputValueToUnit(
        current.min_stock,
        current.min_stock_input_unit,
        nextUnit,
      ),
    }));
  }

  function handleMaxStockInputUnitChange(value: string) {
    const nextUnit = normalizeBulkStockInputUnit(value);

    setProductForm((current) => ({
      ...current,
      max_stock_input_unit: nextUnit,
      max_stock: convertBulkInputValueToUnit(
        current.max_stock,
        current.max_stock_input_unit,
        nextUnit,
      ),
    }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = "";
    }

    if (!file) {
      setLocalImagePreviewUrl("");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = previewUrl;
    setLocalImagePreviewUrl(previewUrl);
  }

  async function handleRemoveProductImage() {
    const imageUrl = productForm.image_url.trim();
    const hasPendingLocalImage = Boolean(imageFile || localImagePreviewUrl);

    if (!imageUrl && !hasPendingLocalImage) {
      return;
    }

    if (hasPendingLocalImage) {
      clearLocalImagePreview();
      setMessage("Imagen seleccionada retirada.");
      return;
    }

    if (
      !window.confirm(
        "Eliminar la imagen de este producto?\n\nLa imagen se quitara del producto y, si fue subida al sistema, tambien se eliminara del almacenamiento.",
      )
    ) {
      return;
    }

    setDeletingImage(true);
    setMessage("");

    if (!productForm.id) {
      clearLocalImagePreview();
      setProductForm((current) => ({ ...current, image_url: "" }));
      setDeletingImage(false);
      setMessage("Imagen retirada del formulario.");
      return;
    }

    if (isDemo) {
      clearLocalImagePreview();
      setProductForm((current) => ({ ...current, image_url: "" }));
      setProducts((current) =>
        current.map((product) =>
          product.id === productForm.id
            ? { ...product, image_url: null }
            : product,
        ),
      );
      setDeletingImage(false);
      setMessage("Imagen eliminada en modo demo.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/products/${productForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_url: null }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo quitar la imagen del producto.");
      }

      let storageWarning = "";

      if (imageUrl) {
        try {
          const deleteResponse = await fetch("/api/admin/uploads", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl }),
          });
          const deleteData = (await deleteResponse.json()) as {
            ok: boolean;
            error?: string;
          };

          if (!deleteResponse.ok || !deleteData.ok) {
            throw new Error(deleteData.error ?? "No se pudo borrar el archivo.");
          }
        } catch {
          storageWarning =
            " La referencia se elimino, pero no se pudo borrar el archivo del almacenamiento.";
        }
      }

      clearLocalImagePreview();
      setProductForm((current) => ({ ...current, image_url: "" }));
      setProducts((current) =>
        current.map((product) =>
          product.id === productForm.id
            ? { ...product, image_url: null }
            : product,
        ),
      );
      await loadRemoteData();
      setMessage(`Imagen eliminada del producto.${storageWarning}`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo eliminar la imagen.",
      );
    } finally {
      setDeletingImage(false);
    }
  }

  function resetProductForm() {
    clearStoredAdminProductForm();
    setProductForm(emptyProductForm);
    clearLocalImagePreview();
  }

  function showSavedProductInCatalog(product: Pick<Product, "name" | "sku">) {
    setSearch(product.sku || product.name);
    setCatalogProductsOpen(true);
    setActiveSection("catalog");
  }

  function showSavedProductPrompt(product: SavedProductPrompt) {
    const categoryId = product.category_id ?? "";
    const providerName = product.provider ?? "";
    setNextProductCategoryId(categoryId);
    setNextProductProviderName(providerName);
    setSavedProductPrompt(product);
  }

  function handleContinueAddingProduct() {
    const category = categories.find(
      (entry) => entry.id === nextProductCategoryId,
    );

    setSavedProductPrompt(null);
    handleStartProduct(nextProductCategoryId, nextProductProviderName);
    setMessage(
      category
        ? `Listo para agregar otro producto en ${category.name}.`
        : "Listo para agregar otro producto sin categoria.",
    );
  }

  function handleViewSavedProductInCatalog() {
    if (savedProductPrompt) {
      showSavedProductInCatalog(savedProductPrompt);
    }

    setSavedProductPrompt(null);
    setMessage("Producto guardado correctamente.");
  }

  function clearLocalImagePreview() {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = "";
    }

    setImageFile(null);
    setLocalImagePreviewUrl("");
  }

  const sectionMeta: Record<
    AdminSection,
    { title: string; eyebrow: string; description: React.ReactNode }
  > = {
    overview: {
      title: "Resumen de Catalogo",
      eyebrow: "Dashboard",
      description:
        "Indicadores rapidos para revisar inventario, alertas y actividad del catalogo.",
    },
    information: {
      title: "Informacion del proyecto",
      eyebrow: "Demo interna",
      description: (
        <span className="text-red-500 font-bold">
          Vista de presentacion del sistema, disponible solo dentro del panel administrativo.
        </span>
      ),
    },
    categories: {
      title: selectedCategory ? selectedCategory.name : "Categorias",
      eyebrow: selectedCategory ? "Carpeta de categoria" : "Organizacion",
      description:
        selectedCategory
          ? "Agrega productos directamente en esta categoria y revisa su inventario."
          : "Crea y consulta las categorias que ordenan el catalogo del minimarket.",
    },
    product: {
      title: productForm.id ? "Editar producto" : "Nuevo producto",
      eyebrow: "Inventario",
      description:
        "Registra informacion comercial, foto, precio y stock minimo de cada producto.",
    },
    catalog: {
      title: "Catalogo",
      eyebrow: "Productos",
      description:
        "Busca, edita, activa u oculta productos desde una sola vista.",
    },
    "create-product": {
      title: "Crear Producto",
      eyebrow: "Inventario",
      description:
        "Registra productos nuevos, proveedores y stock comprado.",
    },
    purchases: {
      title: "Compras",
      eyebrow: "Ingreso de stock",
      description:
        "Registra nuevas compras por producto, proveedor, cantidad y fechas.",
    },
    history: {
      title: "Historial",
      eyebrow: "Movimientos",
      description:
        "Consulta entradas, salidas y saldos por producto y proveedor.",
    },
    channels: {
      title: "Canales conectados",
      eyebrow: "Android y chatbot",
      description:
        "Rutas listas para que la app movil y el asistente consulten catalogo y creen pedidos.",
    },
    billing: {
      title: "Comprobantes",
      eyebrow: "Ventas registradas",
      description:
        "Consulta comprobantes de venta creados desde la web, Android o el chatbot.",
    },
    providers: {
      title: "Proveedores",
      eyebrow: "Directorio",
      description:
        "Crea, selecciona y revisa proveedores sin perder de vista sus productos.",
    },
    customers: {
      title: "Usuarios",
      eyebrow: "App Android",
      description:
        "Gestion de usuarios registrados desde la app movil, con correo, cedula de acceso e historial comercial.",
    },
    orders: {
      title: "Pedidos",
      eyebrow: "Módulo de Pedidos",
      description:
        "Gestiona y cambia el estado de los pedidos que llegan desde la aplicación móvil y el chatbot.",
    },
    settings: {
      title: "Configuración",
      eyebrow: "Ajustes",
      description: "Configura parámetros generales del sistema y cuentas bancarias.",
    },
  };

  const baseNavItems: Array<{
    id: AdminSection;
    label: string;
    description: string;
    icon: typeof LayoutDashboard;
  }> = [
    {
      id: "overview",
      label: "Resumen",
      description: "Metricas y alertas",
      icon: LayoutDashboard,
    },
    {
      id: "information",
      label: "Informacion",
      description: "Demo del sistema",
      icon: Info,
    },
    {
      id: "categories",
      label: "Categorias",
      description: `${categories.length} registradas`,
      icon: Tags,
    },
    {
      id: "catalog",
      label: "Catalogo",
      description: `${products.length} productos`,
      icon: Boxes,
    },
    {
      id: "create-product",
      label: "Crear Producto",
      description: "Nuevo ingreso",
      icon: PackagePlus,
    },
    {
      id: "purchases",
      label: "Compras",
      description: "Ingreso de stock",
      icon: ShoppingCart,
    },
    {
      id: "history",
      label: "Historial",
      description: "Entradas y salidas",
      icon: History,
    },
    {
      id: "channels",
      label: "Canales",
      description: "Android y chatbot",
      icon: MessageSquareText,
    },
    {
      id: "providers",
      label: "Proveedores",
      description: `${providerSummaries.length} registrados`,
      icon: Truck,
    },
    {
      id: "customers",
      label: "Usuarios",
      description: `${mobileClients.length} registrados`,
      icon: Users,
    },
    {
      id: "orders",
      label: "Ventas y Pedidos",
      description: "Gestion de pedidos",
      icon: LayoutList,
    },
    {
      id: "settings",
      label: "Configuración",
      description: "Ajustes del sistema",
      icon: Settings,
    },
  ];

  const navItemsById = new Map(
    baseNavItems.map((item) => [item.id, item] as const),
  );
  const navItems = navOrder
    .map((sectionId) => navItemsById.get(sectionId))
    .filter((item): item is (typeof baseNavItems)[number] => Boolean(item));

  const currentSection = sectionMeta[activeSection];
  const duplicateMessageType = getDuplicateMessageType(message);

  if (!adminAuthenticated) {
    return (
      <section className="container grid login-shell place-items-center">
        <div className="login-card">
          <aside className="login-promo">
            <div className="login-brand-block">
              <span className="login-market-logo">
                <LoginMarketLogo />
              </span>
              <div className="grid gap-2">
                <h1 className="login-brand-title">Panel administrativo</h1>
                <p className="max-w-xs text-sm leading-6 text-white/82">
                  Catalogo, inventario y pedidos conectados.
                </p>
              </div>
            </div>
          </aside>

          <form className="login-form-panel" onSubmit={handleLogin}>
            <div className="grid gap-3">
              <span className="badge badge-yellow w-fit">
                <LogIn size={15} aria-hidden="true" />
                Acceso administrador
              </span>
              <div className="grid gap-2">
                <h1 className="login-title">Iniciar sesion</h1>
                <p className="text-sm leading-6 text-stone-600">
                  Acceso privado para administrar catalogo e inventario.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="field">
                <span className="label">Cedula</span>
                <input
                  autoComplete="username"
                  className="input"
                  inputMode="numeric"
                  onChange={(event) => setCedula(event.target.value)}
                  placeholder="0963671755"
                  required
                  value={cedula}
                />
              </label>

              <label className="field">
                <span className="label">Contrasena</span>
                <span className="password-control">
                  <input
                    autoComplete="current-password"
                    className="input"
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    type={showPassword ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={
                      showPassword ? "Ocultar contrasena" : "Ver contrasena"
                    }
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? (
                      <EyeOff size={18} aria-hidden="true" />
                    ) : (
                      <Eye size={18} aria-hidden="true" />
                    )}
                  </button>
                </span>
              </label>
            </div>

            {message ? (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {message}
              </p>
            ) : null}

            <button className="btn btn-primary min-h-12" disabled={saving} type="submit">
              {saving ? (
                <Loader2 className="animate-spin" size={18} aria-hidden="true" />
              ) : (
                <LogIn size={18} aria-hidden="true" />
              )}
              Entrar
            </button>
          </form>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="container grid min-h-[60vh] place-items-center">
        <div className="surface flex items-center gap-3 p-5 font-bold">
          <Loader2 className="animate-spin brand-icon" aria-hidden="true" />
          Cargando panel administrativo...
        </div>
      </section>
    );
  }

  return (
    <section className="admin-app">
      {duplicateMessageType ? (
        <DuplicateAlertDialog
          message={message}
          onDismiss={() => setMessage("")}
          type={duplicateMessageType}
        />
      ) : null}

      {stockAlertMessage ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 border-l-4 border-[#A60B3F]">
            <div className="flex items-center gap-3 text-[#A60B3F] mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h3 className="text-xl font-bold text-gray-900">Aviso de inventario</h3>
            </div>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {stockAlertMessage}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setStockAlertMessage(null)}
                className="bg-[#A60B3F] hover:bg-rose-900 text-white font-semibold py-2 px-6 rounded-lg transition-colors shadow-sm"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <aside className="admin-sidebar">
        <div className="grid gap-6">
          <div className="flex items-center gap-3">
            <span className="brand-mark size-11">
              <LoginMarketLogo />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.12em] text-stone-500">
                Minimarket
              </p>
              <h1 className="text-xl font-black leading-none">Administrador</h1>
            </div>
          </div>

          <nav className="admin-nav" aria-label="Modulos del administrador">
            {navItems.map((item) => {
              const Icon = item.icon;
              const selected = activeSection === item.id;
              const dragging = draggingNavItem === item.id;
              const dragOver =
                dragOverNavItem === item.id && draggingNavItem !== item.id;
              const expiringNotificationCount =
                item.id === "overview" ? expirationAlertProducts.length : 0;
              const lowStockNotificationCount =
                item.id === "overview" ? totals.lowStock : 0;
              const currentPendingOrdersCount =
                item.id === "orders" ? pendingOrdersCount : 0;
              const notificationCount =
                expiringNotificationCount + lowStockNotificationCount + currentPendingOrdersCount;
              const hasMultipleNotifications =
                (expiringNotificationCount > 0 ? 1 : 0) +
                (lowStockNotificationCount > 0 ? 1 : 0) +
                (currentPendingOrdersCount > 0 ? 1 : 0) > 1;
              const notificationLabels = [
                expiringNotificationCount > 0
                  ? expiredProductCount > 0
                    ? `${expiredProductCount} producto${
                        expiredProductCount === 1 ? "" : "s"
                      } caducado${expiredProductCount === 1 ? "" : "s"}`
                    : `${expiringNotificationCount} producto${
                        expiringNotificationCount === 1 ? "" : "s"
                      } proximo${expiringNotificationCount === 1 ? "" : "s"} a vencer`
                  : "",
                lowStockNotificationCount > 0
                  ? `${lowStockNotificationCount} producto${
                      lowStockNotificationCount === 1 ? "" : "s"
                    } con bajo stock`
                  : "",
                currentPendingOrdersCount > 0
                  ? `${currentPendingOrdersCount} pedido${
                      currentPendingOrdersCount === 1 ? "" : "s"
                    } nuevo${currentPendingOrdersCount === 1 ? "" : "s"}`
                  : "",
              ].filter(Boolean);

              return (
                <button
                  aria-label={
                    notificationLabels.length
                      ? `${item.label}, ${notificationLabels.join(", ")}`
                      : undefined
                  }
                  aria-grabbed={dragging}
                  className={`admin-nav-button ${selected ? "is-active" : ""} ${
                    notificationCount > 0 ? "has-notification" : ""
                  } ${hasMultipleNotifications ? "has-multiple-notifications" : ""} ${
                    dragging ? "is-dragging" : ""
                  } ${
                    dragOver ? "is-drag-over" : ""
                  }`}
                  draggable
                  key={item.id}
                  onClick={() => {
                    if (item.id === "categories") {
                      setSelectedCategoryId("");
                    }
                    if (isProductCreationAdminSection(item.id)) {
                      handleCloseProductPurchase();
                      if (activeSection !== item.id && productForm.id) {
                        resetProductForm();
                      }
                    } else {
                      handleCloseProductPurchase();
                    }
                    setActiveSection(item.id);
                  }}
                  onDragEnd={handleNavDragEnd}
                  onDragEnter={() => {
                    if (draggingNavItem && draggingNavItem !== item.id) {
                      setDragOverNavItem(item.id);
                    }
                  }}
                  onDragOver={handleNavDragOver}
                  onDragStart={(event) => handleNavDragStart(event, item.id)}
                  onDrop={(event) => handleNavDrop(event, item.id)}
                  title="Arrastrar para cambiar de lugar"
                  type="button"
                >
                  <span className="admin-nav-icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="grid min-w-0 gap-0.5 text-left">
                    <span className="truncate font-black">{item.label}</span>
                    <span className="truncate text-xs">{item.description}</span>
                  </span>
                  {expiringNotificationCount > 0 ? (
                    <span
                      className={`admin-nav-notification is-expiring ${
                        hasMultipleNotifications ? "is-stack-top" : ""
                      } ${
                        expiredProductCount > 0 ? "is-expired" : ""
                      }`}
                    >
                      <CalendarClock size={12} aria-hidden="true" />
                      <span>
                        {expiredProductCount > 0
                          ? "Productos caducados"
                          : "Productos proximos a vencer"}
                      </span>
                      <strong>
                        {expiringNotificationCount > 99
                          ? "99+"
                          : expiringNotificationCount}
                      </strong>
                    </span>
                  ) : null}
                  {lowStockNotificationCount > 0 ? (
                    <span
                      className={`admin-nav-notification ${
                        hasMultipleNotifications ? "is-stack-bottom" : ""
                      }`}
                    >
                      <AlertTriangle size={12} aria-hidden="true" />
                      <span>Productos con bajo stock</span>
                      <strong>
                        {lowStockNotificationCount > 99
                          ? "99+"
                          : lowStockNotificationCount}
                      </strong>
                    </span>
                  ) : null}
                  {item.id === "orders" && pendingOrdersCount > 0 ? (
                    <span className="admin-nav-notification">
                      <AlertTriangle size={12} aria-hidden="true" />
                      <span>Nuevos pedidos</span>
                      <strong>
                        {pendingOrdersCount > 99
                          ? "99+"
                          : pendingOrdersCount}
                      </strong>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="grid gap-3">
          <span className="badge badge-yellow w-fit">
            <Boxes size={15} aria-hidden="true" />
            {isDemo ? "Modo demo" : "Supabase activo"}
          </span>
          <button className="btn btn-secondary w-full" onClick={handleLogout} type="button">
            <LogOut size={18} aria-hidden="true" />
            Salir
          </button>
        </div>
      </aside>

      <div className="admin-workspace">
        {activeSection !== "catalog" ? (
          <header className="admin-topbar">
            <div className="grid gap-2">
              <span className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent)]">
                {currentSection.eyebrow}
              </span>
              <h2>{currentSection.title}</h2>
              <p>{currentSection.description}</p>
            </div>
            {activeSection !== "overview" &&
            activeSection !== "product" &&
            activeSection !== "information" &&
            activeSection !== "categories" &&
            activeSection !== "settings" &&
            activeSection !== "create-product" &&
            activeSection !== "purchases" &&
            activeSection !== "history" &&
            activeSection !== "channels" &&
            activeSection !== "customers" &&
            activeSection !== "providers" &&
            activeSection !== "orders" &&
            activeSection !== "billing" ? (
              <button
                className="btn btn-primary"
                onClick={() => handleStartProduct("")}
                type="button"
              >
                <PackagePlus size={18} aria-hidden="true" />
                Nuevo producto
              </button>
            ) : null}
          </header>
        ) : null}

        {message && !duplicateMessageType ? (
          <AdminMessageBanner message={message} />
        ) : null}

        {activeSection === "overview" ? (
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Metric
                title="Productos Registrados"
                value={String(products.length)}
              />
              <Metric
                title="Productos con bajo stock"
                value={String(totals.lowStock)}
                warning
              />
              <Metric
                title="Costo del inventario"
                value={formatMoney(totals.inventoryCost)}
              />
              <Metric
                title="Ventas del día"
                value={formatMoney(todaySales.totalSales)}
              />
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <section className="surface section-card overview-stock-card grid gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black">Alertas de stock</h3>
                    <p className="text-sm leading-6 text-stone-600">
                      Productos que requieren revision de inventario.
                    </p>
                  </div>
                  <BarChart3 className="brand-icon" size={22} aria-hidden="true" />
                </div>

                {expirationAlertProducts.length ? (
                  <div
                    className={`stock-alert-summary-card expiration-alert-summary-card ${
                      expiredProductCount > 0 ? "expired-alert-summary-card" : ""
                    }`}
                  >
                    <span className="stock-alert-summary-icon expiration-alert-icon">
                      {expiredProductCount > 0 ? (
                        <AlertTriangle size={22} aria-hidden="true" />
                      ) : (
                        <CalendarClock size={22} aria-hidden="true" />
                      )}
                    </span>
                    <span className="grid gap-1">
                      <strong>
                        {expiredProductCount > 0 && upcomingExpirationCount > 0
                          ? `${expiredProductCount} producto${
                              expiredProductCount === 1 ? "" : "s"
                            } caducado${
                              expiredProductCount === 1 ? "" : "s"
                            } y ${upcomingExpirationCount} proximo${
                              upcomingExpirationCount === 1 ? "" : "s"
                            } a vencer`
                          : expiredProductCount > 0
                            ? `${expiredProductCount} producto${
                                expiredProductCount === 1 ? "" : "s"
                              } caducado${
                                expiredProductCount === 1 ? "" : "s"
                              }`
                            : `${upcomingExpirationCount} producto${
                                upcomingExpirationCount === 1 ? "" : "s"
                              } proximo${
                                upcomingExpirationCount === 1 ? "" : "s"
                              } a vencer`}
                      </strong>
                    </span>
                    <button
                      aria-expanded={overviewExpiringProductsOpen}
                      className="btn btn-primary"
                      onClick={() =>
                        setOverviewExpiringProductsOpen((current) => !current)
                      }
                      type="button"
                    >
                      <CalendarClock size={17} aria-hidden="true" />
                      {overviewExpiringProductsOpen
                        ? "Ocultar vencimientos"
                        : "Ver vencimientos"}
                      <ChevronDown
                        className={`transition ${
                          overviewExpiringProductsOpen ? "rotate-180" : ""
                        }`}
                        size={16}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                ) : null}

                {overviewExpiringProductsOpen &&
                expirationAlertProducts.length ? (
                  <div
                    className="overview-stock-scroll grid gap-3"
                    role="region"
                    aria-label="Productos con alerta de vencimiento"
                  >
                    {expirationAlertProducts.map(
                      ({ expirationDate, isExpired, product }) => (
                      <article
                        className={`mini-row mini-row-with-media stock-alert-row expiration-alert-row ${
                          isExpired ? "expired-alert-row" : ""
                        }`}
                        key={product.id}
                      >
                        <ProductVisual product={product} />
                        <span className="stock-alert-copy">
                          <strong>{product.name}</strong>
                        </span>
                        <span className="stock-alert-metrics">
                          <span
                            className={`stock-alert-chip expiration-alert-chip ${
                              isExpired ? "expired-alert-chip" : ""
                            }`}
                          >
                            {isExpired ? (
                              <AlertTriangle size={14} aria-hidden="true" />
                            ) : (
                              <CalendarClock size={14} aria-hidden="true" />
                            )}
                            {isExpired
                              ? "Producto Caducado"
                              : `Vence ${formatDateValue(expirationDate)}`}
                          </span>
                        </span>
                      </article>
                      ),
                    )}
                  </div>
                ) : null}

                {lowStockProducts.length ? (
                  <div className="stock-alert-summary-card">
                    <span className="stock-alert-summary-icon">
                      <AlertTriangle size={22} aria-hidden="true" />
                    </span>
                    <span className="grid gap-1">
                      <strong>
                        {lowStockProducts.length} producto
                        {lowStockProducts.length === 1 ? "" : "s"} con bajo stock
                      </strong>
                    </span>
                    <button
                      aria-expanded={overviewStockAlertsOpen}
                      className="btn btn-primary"
                      onClick={() =>
                        setOverviewStockAlertsOpen((current) => !current)
                      }
                      type="button"
                    >
                      <AlertTriangle size={17} aria-hidden="true" />
                      {overviewStockAlertsOpen ? "Ocultar alertas" : "Ver alertas"}
                      <ChevronDown
                        className={`transition ${
                          overviewStockAlertsOpen ? "rotate-180" : ""
                        }`}
                        size={16}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <p className="rounded-lg bg-white p-4 text-sm text-stone-600">
                      No hay productos con stock bajo.
                    </p>
                  </div>
                )}

                {overviewStockAlertsOpen && lowStockProducts.length ? (
                  <div
                    className="overview-stock-scroll grid gap-3"
                    role="region"
                    aria-label="Productos con alerta de stock"
                  >
                    {lowStockProducts.map((product) => {
                      const missingStock = getLowStockMissingQuantity(product);

                      return (
                        <article
                          className="mini-row mini-row-with-media stock-alert-row"
                          key={product.id}
                        >
                          <ProductVisual product={product} />
                          <span className="stock-alert-copy">
                            <strong>{product.name}</strong>
                            <span>Stock por debajo del minimo permitido</span>
                          </span>
                          <span className="stock-alert-metrics">
                            <span className="stock-alert-chip stock-alert-chip-current">
                              <AlertTriangle size={14} aria-hidden="true" />
                              Stock actual {formatStockAlertQuantity(product.stock, product)}
                            </span>
                            <span className="stock-alert-chip stock-alert-chip-minimum">
                              Stock minimo{" "}
                              {formatStockAlertQuantity(product.min_stock, product)}
                            </span>
                            <span className="stock-alert-chip stock-alert-chip-missing">
                              {missingStock > 0
                                ? `Faltan ${formatStockAlertQuantity(
                                    missingStock,
                                    product,
                                  )}`
                              : "En minimo permitido"}
                            </span>
                          </span>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </section>

              <div className="grid gap-5 items-start content-start xl:grid-cols-1">
                <section className="surface section-card overview-stock-card grid gap-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black">Actividad reciente</h3>
                      <p className="text-sm leading-6 text-stone-600">
                        Resumen informativo de los ultimos ingresos y compras de inventario.
                      </p>
                    </div>
                    <History className="brand-icon" size={22} aria-hidden="true" />
                  </div>

                {latestProducts.length ? (
                  <div className="recent-products-summary-card">
                    <span className="recent-products-summary-icon">
                      <PackagePlus size={22} aria-hidden="true" />
                    </span>
                    <span className="grid gap-1">
                      <strong>
                        {latestProducts.length} producto
                        {latestProducts.length === 1 ? "" : "s"} recientes
                      </strong>
                    </span>
                    <button
                      aria-expanded={overviewRecentProductsOpen}
                      className="btn btn-primary"
                      onClick={() =>
                        setOverviewRecentProductsOpen((current) => !current)
                      }
                      type="button"
                    >
                      <Boxes size={17} aria-hidden="true" />
                      {overviewRecentProductsOpen
                        ? "Ocultar productos"
                        : "Ver productos"}
                      <ChevronDown
                        className={`transition ${
                          overviewRecentProductsOpen ? "rotate-180" : ""
                        }`}
                        size={16}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                ) : (
                  <p className="rounded-lg bg-white p-4 text-sm text-stone-600">
                    Aun no hay productos ingresados.
                  </p>
                )}

                {overviewRecentProductsOpen && latestProducts.length ? (
                  <div
                    className="overview-recent-scroll"
                    role="region"
                    aria-label="Productos recien ingresados"
                  >
                    {latestProducts.map((product) => (
                      <article
                        className="mini-row mini-row-with-media recent-product-row"
                        key={product.id}
                      >
                        <ProductVisual product={product} />
                        <span className="recent-product-copy">
                          <strong>{product.name}</strong>
                          <span>{product.categories?.name ?? "Sin categoria"}</span>
                        </span>
                        <span className="recent-product-metrics">
                          <span className="recent-product-chip recent-product-chip-price">
                            <ProductPricingMeta product={product} />
                          </span>
                          <span className="recent-product-chip">
                            Stock {formatProductStockWithPresentationBreakdown(product)}
                          </span>
                        </span>
                      </article>
                    ))}
                  </div>
                ) : null}


                {latestPurchases.length ? (
                  <div className="recent-products-summary-card">
                    <span className="recent-products-summary-icon">
                      <PackagePlus size={22} aria-hidden="true" />
                    </span>
                    <span className="grid gap-1">
                      <strong>
                        {latestPurchases.length} compra
                        {latestPurchases.length === 1 ? "" : "s"} recientes
                      </strong>
                    </span>
                    <button
                      aria-expanded={overviewRecentPurchasesOpen}
                      className="btn btn-primary"
                      onClick={() =>
                        setOverviewRecentPurchasesOpen((current) => !current)
                      }
                      type="button"
                    >
                      <Boxes size={17} aria-hidden="true" />
                      {overviewRecentPurchasesOpen
                        ? "Ocultar compras"
                        : "Ver compras"}
                      <ChevronDown
                        className={`transition ${
                          overviewRecentPurchasesOpen ? "rotate-180" : ""
                        }`}
                        size={16}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                ) : (
                  <p className="rounded-lg bg-white p-4 text-sm text-stone-600">
                    Aun no hay compras registradas.
                  </p>
                )}

                {overviewRecentPurchasesOpen && latestPurchases.length ? (
                  <div
                    className="overview-recent-scroll"
                    role="region"
                    aria-label="Productos recien comprados"
                  >
                    {latestPurchases.map((purchase) => {
                      const relatedProduct = products.find(p => p.id === purchase.product_id);
                      return (
                        <article
                          className="mini-row mini-row-with-media recent-product-row"
                          key={purchase.id}
                        >
                          {relatedProduct ? (
                            <ProductVisual product={relatedProduct} />
                          ) : (
                            <div className="product-visual-placeholder">
                              <Package size={24} aria-hidden="true" />
                            </div>
                          )}
                          <span className="recent-product-copy">
                            <strong>{purchase.product_name}</strong>
                            <span>{purchase.provider_name || "Sin proveedor"}</span>
                          </span>
                          <span className="recent-product-metrics">
                            <span className="recent-product-chip recent-product-chip-price">
                              Costo {formatMoney(getPurchaseHistoryPurchaseUnitCost(purchase))}
                            </span>
                            <span className="recent-product-chip">
                              Ingreso {formatPurchaseHistoryInputQuantity(purchase)}
                            </span>
                          </span>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
                </section>
              </div>

            </div>
          </div>
        ) : null}

        {activeSection === "information" ? <ProjectInfoPanel /> : null}

        {activeSection === "settings" ? <SettingsModule /> : null}

        {activeSection === "orders" ? (
          <div className="grid gap-5">
            <div className="flex gap-2 p-1 bg-stone-100/80 rounded-lg w-fit border border-stone-200 mb-2">
              <button
                type="button"
                onClick={() => setSalesTab("orders")}
                className={`px-5 py-2 text-sm transition-all rounded-md ${
                  salesTab === "orders"
                    ? "bg-white text-[var(--accent)] font-bold shadow-sm ring-1 ring-stone-200/50"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                }`}
              >
                Pedidos
              </button>
              <button
                type="button"
                onClick={() => setSalesTab("billing")}
                className={`px-5 py-2 text-sm transition-all rounded-md ${
                  salesTab === "billing"
                    ? "bg-white text-[var(--accent)] font-bold shadow-sm ring-1 ring-stone-200/50"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                }`}
              >
                Historial de Ventas
              </button>
              <button
                type="button"
                onClick={() => setSalesTab("cash-handovers")}
                className={`px-5 py-2 text-sm transition-all rounded-md ${
                  salesTab === "cash-handovers"
                    ? "bg-white text-[var(--accent)] font-bold shadow-sm ring-1 ring-stone-200/50"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                }`}
              >
                Recaudación Delivery
              </button>
            </div>
            {salesTab === "orders" && <OrdersModule onOrderProcessed={loadRemoteOrders} />}
            {salesTab === "cash-handovers" && <CashHandoversModule />}
          </div>
        ) : null}

        {activeSection === "customers" ? (
          <CustomersModule
            clients={mobileClients}
            loading={loadingMobileClients}
            onMessage={setMessage}
            onRefresh={loadRemoteMobileClients}
          />
        ) : null}

        {activeSection === "categories" ? (
          selectedCategory ? (
            <section className="grid gap-5">
              <article className="surface section-card category-detail-card grid gap-5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="category-folder-icon is-open">
                      <FolderOpen size={24} aria-hidden="true" />
                    </span>
                    <div className="grid gap-1">
                      <h3 className="text-2xl font-black">
                        {selectedCategory.name}
                      </h3>
                      <p className="text-sm leading-6 text-stone-600">
                        {selectedCategoryProducts.length} producto
                        {selectedCategoryProducts.length === 1 ? "" : "s"} en
                        esta categoria.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedCategoryId("")}
                      type="button"
                    >
                      <ArrowLeft size={18} aria-hidden="true" />
                      Categorias
                    </button>
                    {selectedCategoryProducts.length ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleStartProduct(selectedCategory.id)}
                        type="button"
                      >
                        <PackagePlus size={18} aria-hidden="true" />
                        Agregar producto
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>

              <section className="surface catalog-card overflow-hidden">
                <div className="grid gap-1 border-b border-stone-200 bg-white/70 p-5">
                  <h3 className="text-xl font-black">Productos de la carpeta</h3>
                  <p className="text-sm leading-6 text-stone-600">
                    Todo lo que agregues aqui queda asociado a{" "}
                    {selectedCategory.name}.
                  </p>
                </div>

                {selectedCategoryProducts.length ? (
                  <div className="grid divide-y divide-stone-200">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 p-4">
                      <label className="flex items-center gap-3 text-sm font-black text-stone-700">
                        <input
                          checked={allCategoryProductsSelected}
                          onChange={handleToggleAllCategoryProducts}
                          type="checkbox"
                        />
                        Seleccionar todos
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-stone-600">
                          {selectedCategorySelectedProducts.length} seleccionado
                          {selectedCategorySelectedProducts.length === 1
                            ? ""
                            : "s"}
                        </span>
                        {selectedCategorySelectedProducts.length > 2 ? (
                          <button
                            className="btn btn-danger"
                            disabled={
                              deletingProductId === BULK_DELETE_PRODUCT_ID
                            }
                            onClick={() =>
                              void handleDeleteSelectedCategoryProducts()
                            }
                            type="button"
                          >
                            {deletingProductId === BULK_DELETE_PRODUCT_ID ? (
                              <Loader2
                                className="animate-spin"
                                size={17}
                                aria-hidden="true"
                              />
                            ) : (
                              <Trash2 size={17} aria-hidden="true" />
                            )}
                            Eliminar seleccionados
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {selectedCategoryProducts.map((product) => {
                      const isSelected = selectedCategoryProductIdsSet.has(
                        product.id,
                      );
                      const isDeleting =
                        deletingProductId === product.id ||
                        deletingProductId === BULK_DELETE_PRODUCT_ID;
                      const displayExpirationDate =
                        getProductDisplayExpirationDate(product);

                      return (
                        <article
                          className={`product-row grid gap-4 p-5 lg:grid-cols-[auto_minmax(96px,140px)_1fr_auto] lg:items-center ${
                            isSelected ? "product-row-selected" : ""
                          }`}
                          key={product.id}
                        >
                          <label className="category-select-control">
                            <input
                              aria-label={`Seleccionar ${product.name}`}
                              checked={isSelected}
                              disabled={isDeleting}
                              onChange={() =>
                                handleToggleCategoryProductSelection(product.id)
                              }
                              type="checkbox"
                            />
                          </label>
                          <ProductVisual product={product} />
                          <div className="grid gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-lg font-black">{product.name}</h4>
                              <span className="badge">{product.sku}</span>
                              {!product.is_active ? (
                                <span className="badge status-off">Oculto</span>
                              ) : product.stock <= product.min_stock ? (
                                <span className="badge status-low">
                                  <AlertTriangle size={14} aria-hidden="true" />
                                  Stock bajo
                                </span>
                              ) : null}
                            </div>
                            <p className="max-w-2xl text-sm leading-6 text-stone-600">
                              {product.description ?? "Sin descripcion."}
                            </p>
                            <div className="flex flex-wrap gap-3 text-sm font-bold text-stone-700">
                              <ProductPricingMeta product={product} />
                              <span>Stock {formatProductStockWithPresentationBreakdown(product)}</span>
                              <span>Min. {formatProductMinimumStock(product)}</span>
                              <span>{formatProductLotCount(product)}</span>
                              {displayExpirationDate ? (
                                <span>Caduca {formatDateValue(displayExpirationDate)}</span>
                              ) : null}
                            </div>
                            <ProductLotDetails product={product} />
                          </div>
                          <div className="catalog-product-list-actions">
                            <button
                              className="btn btn-secondary aspect-square px-0"
                              hidden
                              onClick={() => void handleStockChange(product, -1)}
                              title={`Restar ${getStockAdjustmentStep(product)} ${getStockAdjustmentUnitLabel(product)}`}
                              type="button"
                            >
                              -
                            </button>
                            <button
                              className="btn btn-secondary aspect-square px-0"
                              hidden
                              onClick={() => void handleStockChange(product, 1)}
                              title={`Sumar ${getStockAdjustmentStep(product)} ${getStockAdjustmentUnitLabel(product)}`}
                              type="button"
                            >
                              +
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleEdit(product)}
                              type="button"
                            >
                              Editar
                            </button>
                            <button
                              className="btn btn-danger aspect-square px-0"
                              disabled={isDeleting}
                              onClick={() => void handleDeleteProduct(product)}
                              title="Eliminar producto"
                              type="button"
                            >
                              {isDeleting ? (
                                <Loader2
                                  className="animate-spin"
                                  size={17}
                                  aria-hidden="true"
                                />
                              ) : (
                                <Trash2 size={17} aria-hidden="true" />
                              )}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid place-items-center gap-4 p-8 text-center">
                    <span className="category-folder-icon is-open">
                      <FolderOpen size={26} aria-hidden="true" />
                    </span>
                    <div className="grid gap-1">
                      <h4 className="text-xl font-black">Carpeta vacia</h4>
                      <p className="max-w-md text-sm leading-6 text-stone-600">
                        Agrega el primer producto para que aparezca en esta
                        categoria.
                      </p>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleStartProduct(selectedCategory.id)}
                      type="button"
                    >
                      <PackagePlus size={18} aria-hidden="true" />
                      Agregar producto
                    </button>
                  </div>
                )}
              </section>
            </section>
          ) : (
            <section className="surface section-card grid gap-5 p-5">
              <div className="grid gap-1">
                <h3 className="text-xl font-black">Crear categoria</h3>
                <p className="text-sm leading-6 text-stone-600">
                  Las categorias funcionan como carpetas para organizar productos
                  del minimarket.
                </p>
              </div>

              <form className="grid gap-3 md:grid-cols-[1fr_auto]" onSubmit={handleCreateCategory}>
                <input
                  className="input"
                  onChange={(event) => setNewCategory(event.target.value)}
                  placeholder="Ej. Bebidas"
                  value={newCategory}
                />
                <button className="btn btn-primary" type="submit">
                  <Plus size={18} aria-hidden="true" />
                  Crear categoria
                </button>
              </form>

              {categories.length ? (
                <div className="grid gap-4 rounded-lg border border-stone-200 bg-white/70 p-4 md:grid-cols-[1fr_280px] md:items-center">
                  <div className="grid gap-1">
                    <h4 className="text-sm font-black text-stone-900">
                      Categorias registradas
                    </h4>
                    <p className="text-sm leading-6 text-stone-600">
                      {filteredCategories.length} de {categories.length} visibles.
                    </p>
                  </div>
                  <label>
                    <span className="admin-search-input">
                      <Search size={17} aria-hidden="true" />
                      <input
                        className="input"
                        onChange={(event) => setCategorySearch(event.target.value)}
                        placeholder="Categoria..."
                        value={categorySearch}
                      />
                    </span>
                  </label>
                </div>
              ) : null}

              {categories.length ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white/70 p-4">
                  <label className="flex items-center gap-3 text-sm font-black text-stone-700">
                    <input
                      checked={allCategoriesSelected}
                      disabled={!filteredCategories.length}
                      onChange={handleToggleAllCategories}
                      type="checkbox"
                    />
                    {categorySearch.trim()
                      ? "Seleccionar visibles"
                      : "Seleccionar todas"}
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-stone-600">
                      {selectedCategories.length} seleccionada
                      {selectedCategories.length === 1 ? "" : "s"}
                    </span>
                    <div className="view-toggle" aria-label="Vista de categorias">
                      <button
                        aria-pressed={categoryViewMode === "list"}
                        className={`view-toggle-button ${
                          categoryViewMode === "list" ? "is-active" : ""
                        }`}
                        onClick={() => setCategoryViewMode("list")}
                        title="Vista de lista"
                        type="button"
                      >
                        <LayoutList size={16} aria-hidden="true" />
                        Lista
                      </button>
                      <button
                        aria-pressed={categoryViewMode === "grid"}
                        className={`view-toggle-button ${
                          categoryViewMode === "grid" ? "is-active" : ""
                        }`}
                        onClick={() => setCategoryViewMode("grid")}
                        title="Vista de cuadricula"
                        type="button"
                      >
                        <LayoutGrid size={16} aria-hidden="true" />
                        Cuadricula
                      </button>
                    </div>
                    {selectedCategories.length > 2 ? (
                      <button
                        className="btn btn-danger"
                        disabled={deletingCategoryId === BULK_DELETE_CATEGORY_ID}
                        onClick={() => void handleDeleteSelectedCategories()}
                        type="button"
                      >
                        {deletingCategoryId === BULK_DELETE_CATEGORY_ID ? (
                          <Loader2
                            className="animate-spin"
                            size={17}
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2 size={17} aria-hidden="true" />
                        )}
                        Eliminar seleccionadas
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div
                className={`category-grid ${
                  categoryViewMode === "grid"
                    ? "category-folder-grid"
                    : "category-folder-list"
                }`}
              >
                {filteredCategories.map((category) => {
                  const productCount = products.filter(
                    (product) => product.category_id === category.id,
                  ).length;
                  const isDeleting =
                    deletingCategoryId === category.id ||
                    deletingCategoryId === BULK_DELETE_CATEGORY_ID;
                  const isSelected = selectedCategoryIdsSet.has(category.id);

                  return (
                    <article
                      className={`category-tile category-folder ${
                        isSelected ? "category-folder-selected" : ""
                      }`}
                      key={category.id}
                    >
                      <label className="category-select-control">
                        <input
                          aria-label={`Seleccionar ${category.name}`}
                          checked={isSelected}
                          disabled={isDeleting}
                          onChange={() =>
                            handleToggleCategorySelection(category.id)
                          }
                          type="checkbox"
                        />
                      </label>
                      {editingCategoryId === category.id ? (
                        <div
                          className="category-folder-main"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="category-folder-icon">
                            <Folder size={22} aria-hidden="true" />
                          </span>
                          <span className="grid min-w-0 gap-1.5 text-left w-full pr-2">
                            <input
                              autoFocus
                              className="input p-1 h-auto min-h-0 font-bold"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateCategoryName(category.id);
                                if (e.key === "Escape") setEditingCategoryId(null);
                              }}
                              disabled={updatingCategoryId === category.id}
                            />
                            <div className="flex gap-1.5 mt-1">
                              <button
                                type="button"
                                className="btn btn-primary aspect-square px-0"
                                disabled={updatingCategoryId === category.id}
                                onClick={() => handleUpdateCategoryName(category.id)}
                                title="Guardar"
                              >
                                {updatingCategoryId === category.id ? (
                                  <Loader2 className="animate-spin" size={16} />
                                ) : (
                                  <CheckCircle2 size={16} />
                                )}
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary aspect-square px-0"
                                disabled={updatingCategoryId === category.id}
                                onClick={() => setEditingCategoryId(null)}
                                title="Cancelar"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </span>
                        </div>
                      ) : (
                        <button
                          className="category-folder-main"
                          onClick={() => handleOpenCategory(category)}
                          type="button"
                        >
                          <span className="category-folder-icon">
                            <Folder size={22} aria-hidden="true" />
                          </span>
                          <span className="grid min-w-0 gap-0.5 text-left">
                            <strong className="truncate">{category.name}</strong>
                            <span className="truncate text-stone-500 text-sm">
                              {productCount} producto
                              {productCount === 1 ? "" : "s"}
                            </span>
                          </span>
                        </button>
                      )}
                      <div className={`flex gap-1.5 items-center justify-center pr-1 ${categoryViewMode === "grid" ? "flex-col" : "flex-row"}`}>
                        <button
                          className="btn btn-secondary aspect-square px-0"
                          disabled={isDeleting || updatingCategoryId === category.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCategoryId(category.id);
                            setEditingCategoryName(category.name);
                          }}
                          title={`Editar ${category.name}`}
                          type="button"
                        >
                          <Pencil size={17} aria-hidden="true" />
                        </button>
                        <button
                          className="btn btn-danger aspect-square px-0"
                          disabled={isDeleting || updatingCategoryId === category.id}
                          onClick={() => void handleDeleteCategory(category)}
                          title="Eliminar categoria y productos"
                          type="button"
                        >
                          {isDeleting ? (
                            <Loader2
                              className="animate-spin"
                              size={17}
                              aria-hidden="true"
                            />
                          ) : (
                            <Trash2 size={17} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}
                {!categories.length ? (
                  <div className="rounded-lg border border-dashed border-[var(--line)] bg-white/70 p-5 text-sm leading-6 text-stone-600">
                    Crea la primera categoria para empezar a ordenar el
                    catalogo.
                  </div>
                ) : null}
                {categories.length && !filteredCategories.length ? (
                  <div className="rounded-lg border border-dashed border-[var(--line)] bg-white/70 p-5 text-sm leading-6 text-stone-600">
                    No hay categorias que coincidan con esa busqueda.
                  </div>
                ) : null}
              </div>
            </section>
          )
        ) : null}

        {activeSection === "product" || isCreateProductSection ? (
          <form className="surface section-card grid gap-5 p-5" onSubmit={handleSaveProduct}>
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <h3 className="text-xl font-black">
                  {productForm.id
                    ? "Editar producto"
                    : isCreateProductSection
                      ? "Crear producto"
                      : "Datos del producto"}
                </h3>
                <p className="text-sm leading-6 text-stone-600">
                  {isCreateProductSection
                    ? "Registra la ficha base del producto antes de ingresar compras."
                    : "Estos datos alimentan la web, Android y el chatbot."}
                </p>
                {productFormCategory ? (
                  <span className="badge badge-yellow w-fit">
                    <Folder size={15} aria-hidden="true" />
                    {productFormCategory.name}
                  </span>
                ) : null}

                {!productForm.id && (
                  <div hidden className="mt-4 flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50/80 p-4">
                    <div className="grid gap-1 flex-1">
                      <p className="font-bold text-sm text-stone-800">Importación Masiva</p>
                      <p className="text-xs text-stone-500">Sube un archivo .xlsx para registrar múltiples productos.</p>
                    </div>
                    <label className="btn btn-secondary cursor-pointer whitespace-nowrap">
                      {saving ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                      Importar Excel
                      <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleExcelUpload} disabled={saving} />
                    </label>
                  </div>
                )}
              </div>
              <PackagePlus className="brand-icon" size={24} aria-hidden="true" />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="product-identity-grid lg:col-span-2">
                <AdminSearchCombobox
                  allOptions={buildCategoryComboboxOptions(categories, "")}
                  className="product-identity-field product-category-field"
                  createLabel="Se creara al guardar"
                  label="Categoria"
                  onChange={handleProductCategoryInput}
                  onSelect={handleSelectProductCategory}
                  optionLimit={Math.max(categories.length, 8)}
                  options={productCategoryComboboxOptions}
                  placeholder="Escribe o selecciona una categoria"
                  value={productCategoryInputValue}
                />

                <label className="field product-identity-field product-internal-code-field">
                  <span className="label">Codigo interno del producto</span>
                  <input
                    aria-invalid={hasProductSkuConflict}
                    className={`input ${
                      hasProductSkuConflict ? "border-rose-400 bg-rose-50" : ""
                    }`}
                    readOnly
                    required
                    value={productSkuDisplayValue}
                  />
                  {hasProductSkuConflict ? (
                    <span className="text-xs font-black text-rose-600">
                      El codigo ya existe
                    </span>
                  ) : null}
                </label>

                <label className="field product-identity-field product-code-field">
                  <span className="label">Codigo de producto opcional</span>
                  <input
                    className="input product-code-input"
                    inputMode="numeric"
                    maxLength={16}
                    onChange={(event) =>
                      handleProductField(
                        "product_code",
                        normalizeProductCodeInput(event.target.value),
                      )
                    }
                    value={formatProductCodeInputValue(productForm.product_code)}
                  />
                </label>
              </div>

              {isPurchasesProductCreation ? (
                <AdminSearchCombobox
                  className="lg:col-span-2"
                  createLabel="Producto nuevo"
                  label="Nombre"
                  onChange={handleProductNameInput}
                  onSelect={handleSelectExistingProduct}
                  options={productNameComboboxOptions}
                  placeholder="Escribe un producto nuevo o busca uno existente"
                  required
                  value={productForm.name}
                />
              ) : (
                <label className="field lg:col-span-2">
                  <span className="label">Nombre</span>
                  <input
                    className="input"
                    onChange={(event) =>
                      handleProductField("name", event.target.value)
                    }
                    required
                    value={productForm.name}
                  />
                </label>
              )}

              <label className="field max-w-3xl lg:col-span-2">
                <span className="label">Descripcion</span>
                <textarea
                  className="input min-h-20 resize-y"
                  onChange={(event) =>
                    handleProductField("description", event.target.value)
                  }
                  value={productForm.description}
                />
              </label>

              <label className="field lg:col-span-2">
                <span className="label">Tipo de venta</span>
                <select
                  className="input max-w-[14rem]"
                  onChange={(event) =>
                    handleProductMeasurementUnitChange(event.target.value)
                  }
                  value={productForm.measurement_unit}
                >
                  {PRODUCT_MEASUREMENT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="max-w-3xl text-xs font-bold text-stone-500">
                  {productUnitCopy.helpText}
                </span>
              </label>

              <div className="grid gap-3 border-y border-stone-200 py-4 lg:col-span-2">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="grid gap-1">
                    <h4 className="font-black text-stone-900">
                      Configuracion del producto
                    </h4>
                  </div>
                </div>
                <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
                  <label className="field">
                    <span className="label">
                      IVA del producto
                      {productForm.has_iva && productForm.iva_rate ? (
                        <span className="text-stone-500 font-normal text-xs ml-2">
                          ({productForm.iva_rate}%)
                        </span>
                      ) : null}
                    </span>
                    <select
                      className="input"
                      onChange={(event) =>
                        handleProductIvaModeChange(event.target.value)
                      }
                      value={productForm.has_iva ? "with_iva" : "without_iva"}
                    >
                      <option value="with_iva">Con IVA</option>
                      <option value="without_iva">Sin IVA</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="label">Fechas del producto</span>
                    <select
                      className="input"
                      onChange={(event) =>
                        handleProductField(
                          "requires_dates",
                          event.target.value === "with_dates",
                        )
                      }
                      value={
                        productForm.requires_dates ? "with_dates" : "without_dates"
                      }
                    >
                      <option value="without_dates">Sin fabricacion/vencimiento</option>
                      <option value="with_dates">Con fabricacion/vencimiento</option>
                    </select>
                  </label>
                </div>

              </div>

              <details
                className="product-presentations-section lg:col-span-2"
              >
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4">
                    <div className="grid gap-1">
                      <h4 className="font-black text-stone-900">
                        Presentaciones opcionales
                      </h4>
                    </div>
                    <ChevronDown className="mt-1 brand-icon" size={18} aria-hidden="true" />
                  </summary>

                  <div className="grid gap-4 border-t border-pink-100 p-4">
                    <div className="flex flex-wrap justify-end gap-2 items-center">
                      <select 
                        className="input !py-1 w-auto border-stone-200 text-stone-600 bg-stone-50 cursor-pointer text-sm"
                        onChange={(e) => {
                           if (!e.target.value) return;
                           const [name, qty] = e.target.value.split('|');
                           handleAddProductPresentation({ name, unit_quantity: qty });
                           e.target.value = "";
                        }}
                      >
                         <option value="">+ Plantillas Rápidas...</option>
                         {normalizeProductMeasurementUnit(productForm.measurement_unit) === "lb" ? (
                           <>
                             <option value="Funda 10kg|22.05">Funda 10kg (22.05 lb)</option>
                             <option value="Funda 5kg|11.02">Funda 5kg (11.02 lb)</option>
                             <option value="Saco 50kg|110.23">Saco 50kg (110.23 lb)</option>
                             <option value="Saco 25kg|55.12">Saco 25kg (55.12 lb)</option>
                             <option value="Quintal|100">Quintal (100 lb)</option>
                             <option value="Arroba|25">Arroba (25 lb)</option>
                             <option value="Kilo|2.20">Kilo (2.20 lb)</option>
                           </>
                         ) : (
                           <>
                             <option value="Docena|12">Docena (12 uds)</option>
                             <option value="Six-pack|6">Six-pack (6 uds)</option>
                             <option value="Caja 24|24">Caja 24 uds</option>
                             <option value="Par|2">Par (2 uds)</option>
                           </>
                         )}
                      </select>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleAddProductPresentation()}
                        type="button"
                      >
                        <Plus size={17} aria-hidden="true" />
                        Agregar Manual
                      </button>
                    </div>
                    <datalist id="bulk-presentation-presets">
                      <option value="Libra" />
                      <option value="Media Libra" />
                      <option value="Cuarto de Libra" />
                      <option value="Kilo" />
                      <option value="Arroba" />
                      <option value="Quintal" />
                    </datalist>
                    <datalist id="unit-presentation-presets">
                      <option value="Unidad" />
                      <option value="Par" />
                      <option value="Docena" />
                      <option value="Caja" />
                      <option value="Cubeta" />
                      <option value="Paca" />
                      <option value="Six-pack" />
                      <option value="Bulto" />
                    </datalist>
                    {productFormPresentations.length ? (
                      productFormPresentations.map((presentation, index) => (
                        <div
                          className="grid gap-3 rounded-lg border border-stone-200 bg-white p-3"
                          key={presentation.id}
                        >
                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(120px,0.65fr)_minmax(190px,0.8fr)_minmax(180px,0.9fr)_auto] lg:items-end">
                          <label className="field">
                            <span className="label">Presentacion</span>
                            <input
                              className="input"
                              list={isBulkProductForm ? "bulk-presentation-presets" : "unit-presentation-presets"}
                              onChange={(event) =>
                                handleProductPresentationField(
                                  index,
                                  "name",
                                  event.target.value,
                                )
                              }
                              placeholder={
                                isBulkProductForm
                                  ? "Quintal, saco 25 kg, kilo..."
                                  : "Cubeta, caja x12, pack..."
                              }
                              value={presentation.name}
                            />
                          </label>
                          <label className="field">
                            <span className="label">
                              {isBulkProductForm
                                ? "Contenido en stock (lb)"
                                : "Contenido en stock"}
                            </span>
                            <input
                              className="input"
                              min={isBulkProductForm ? "0.001" : "1"}
                              onChange={(event) =>
                                handleProductPresentationField(
                                  index,
                                  "unit_quantity",
                                  event.target.value,
                                )
                              }
                              step={isBulkProductForm ? "0.001" : "1"}
                              type="number"
                              value={presentation.unit_quantity}
                            />
                          </label>
                          <div className="field">
                            <span className="label">Uso</span>
                            <div className="flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-stone-200 bg-stone-50 px-3">
                              <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
                                <input
                                  checked={presentation.use_for_purchase}
                                  onChange={(event) =>
                                    handleProductPresentationField(
                                      index,
                                      "use_for_purchase",
                                      event.target.checked,
                                    )
                                  }
                                  type="checkbox"
                                />
                                Compra
                              </label>
                              <label className="flex items-center gap-2 text-sm font-bold text-stone-700">
                                <input
                                  checked={presentation.use_for_sale}
                                  onChange={(event) =>
                                    handleProductPresentationField(
                                      index,
                                      "use_for_sale",
                                      event.target.checked,
                                    )
                                  }
                                  type="checkbox"
                                />
                                Venta al publico
                              </label>
                            </div>
                          </div>
                          <label className="field">
                            <span className="label">
                              Precio base de la presentacion (Sin IVA) <span className="text-stone-400 font-normal text-xs ml-1">(Opcional)</span>
                              {productForm.has_iva && productForm.iva_rate && Number(presentation.price) > 0 ? (
                                <span className="text-stone-500 font-medium text-xs ml-2">
                                  Con IVA: {formatMoney(Number(presentation.price) + Number((Number(presentation.price) * Number(productForm.iva_rate) / 100).toFixed(2)))}
                                </span>
                              ) : null}
                            </span>
                            <input
                              className="input"
                              disabled={!presentation.use_for_sale}
                              min="0"
                              onChange={(event) =>
                                handleProductPresentationField(
                                  index,
                                  "price",
                                  event.target.value,
                                )
                              }
                              step="0.01"
                              type="number"
                              value={presentation.use_for_sale ? presentation.price : ""}
                            />
                          </label>
                          <button
                            aria-label="Quitar presentacion"
                            className="btn btn-danger aspect-square px-0"
                            onClick={() => handleRemoveProductPresentation(index)}
                            title="Quitar presentacion"
                            type="button"
                          >
                            <Trash2 size={17} aria-hidden="true" />
                          </button>
                          </div>
                          
                          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-sm bg-stone-50 p-2.5 rounded-md border border-stone-200">
                            {(() => {
                              const hasStock = parseFloat(productForm.stock || "0") > 0;
                              const cost = hasStock ? getStoredProductPurchaseCostValue(productForm) : 0;
                              const qty = parseFloat(presentation.unit_quantity || "0");
                              const price = parseFloat(presentation.price || "0");
                              const totalCost = cost * qty;
                              const profit = price - totalCost;
                              return (
                                <>
                                  <div className="flex gap-2">
                                    <span className="text-stone-500 font-medium">Costo de compra de la presentación:</span>
                                    <strong className="text-stone-900">{formatMoney(totalCost)}</strong>
                                  </div>
                                  {presentation.use_for_sale && (
                                    <div className="flex gap-2">
                                      <span className="text-stone-500 font-medium">Ganancia por presentación:</span>
                                      <strong className={profit >= 0 ? "text-green-600" : "text-red-600"}>
                                        {formatMoney(profit)}
                                      </strong>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-stone-200 bg-stone-50/70 p-4 text-sm font-bold text-stone-600">
                        Sin presentaciones adicionales
                      </div>
                    )}
                  </div>
                </details>

              {productForm.id && editingProduct ? (
                <ProductLotEditor
                  deletingLotId={deletingProductLotId}
                  lots={editingProductLots}
                  onDelete={(lot) => void handleDeleteProductLot(lot)}
                  product={editingProduct}
                />
              ) : null}

              <div className="grid max-w-4xl items-start gap-3 sm:grid-cols-3 lg:col-span-2">
                <div className="field">
                  <label className="label" htmlFor="product-stock">
                    {productStockLabel}
                  </label>
                  {isBulkProductForm ? (
                    <div className="input-combo">
                      <input
                        className="input"
                        id="product-stock"
                        min="0"
                        onChange={(event) =>
                          handleProductField("stock", event.target.value)
                        }
                        readOnly={!isEditingProductForm}
                        step={getBulkStockInputStep(productStockInputUnit)}
                        type="number"
                        value={isEditingProductForm ? productForm.stock : "0"}
                      />
                      <select
                        aria-label="Unidad para stock"
                        className="input-combo-select"
                        disabled={!isEditingProductForm}
                        onChange={(event) =>
                          handleStockInputUnitChange(event.target.value)
                        }
                        value={productStockInputUnit}
                      >
                        {BULK_STOCK_INPUT_UNIT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="input-combo stock-presentation-combo">
                      <input
                        className="input"
                        id="product-stock"
                        min="0"
                        onChange={(event) =>
                          handleProductField("stock", event.target.value)
                        }
                        readOnly={!isEditingProductForm}
                        step={productUnitCopy.stockStep}
                        type="number"
                        value={isEditingProductForm ? productForm.stock : "0"}
                      />
                      <select
                        aria-label="Presentacion para stock"
                        className="input-combo-select"
                        disabled={!isEditingProductForm}
                        onChange={(event) =>
                          handleProductField(
                            "stock_presentation_id",
                            event.target.value,
                          )
                        }
                        value={selectedProductStockPresentation.id}
                      >
                        {productStockPresentationOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {isEditingProductForm && isBulkProductForm ? (
                    <span className="field-hint text-xs font-bold text-stone-500">
                      {productStockPoundsInfo}
                    </span>
                  ) : isEditingProductForm && productStockPresentationInfo ? (
                    <span className="field-hint text-xs font-bold text-stone-500">
                      {productStockPresentationInfo}
                    </span>
                  ) : null}
                </div>
                <div className="field">
                  <label className="label" htmlFor="product-min-stock">
                    {productUnitCopy.minStockLabel}
                  </label>
                  {isBulkProductForm ? (
                    <div className="input-combo">
                      <input
                        className="input"
                        id="product-min-stock"
                        min="0"
                        onChange={(event) =>
                          handleProductField("min_stock", event.target.value)
                        }
                        step={getBulkStockInputStep(productMinStockInputUnit)}
                        type="number"
                        value={productForm.min_stock}
                      />
                      <select
                        aria-label="Unidad para stock minimo"
                        className="input-combo-select"
                        onChange={(event) =>
                          handleMinStockInputUnitChange(event.target.value)
                        }
                        value={productMinStockInputUnit}
                      >
                        {BULK_STOCK_INPUT_UNIT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="input-combo stock-presentation-combo">
                      <input
                        className="input"
                        id="product-min-stock"
                        min="0"
                        onChange={(event) =>
                          handleProductField("min_stock", event.target.value)
                        }
                        step={productUnitCopy.minStockStep}
                        type="number"
                        value={productForm.min_stock}
                      />
                      <select
                        aria-label="Presentacion para stock minimo"
                        className="input-combo-select"
                        onChange={(event) =>
                          handleProductField(
                            "min_stock_presentation_id",
                            event.target.value,
                          )
                        }
                        value={selectedProductMinStockPresentation.id}
                      >
                        {productStockPresentationOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {isBulkProductForm ? (
                    <span className="field-hint text-xs font-bold text-stone-500">
                      {productMinStockPoundsInfo}
                    </span>
                  ) : productMinStockPresentationInfo ? (
                    <span className="field-hint text-xs font-bold text-stone-500">
                      {productMinStockPresentationInfo}
                    </span>
                  ) : null}
                </div>
                <div className="field">
                  <label className="label" htmlFor="product-max-stock">
                    {productUnitCopy.maxStockLabel}
                  </label>
                  {isBulkProductForm ? (
                    <div className="input-combo">
                      <input
                        className="input"
                        id="product-max-stock"
                        min="0"
                        onChange={(event) =>
                          handleProductField("max_stock", event.target.value)
                        }
                        step={getBulkStockInputStep(productMaxStockInputUnit)}
                        type="number"
                        value={productForm.max_stock}
                      />
                      <select
                        aria-label="Unidad para stock maximo"
                        className="input-combo-select"
                        onChange={(event) =>
                          handleMaxStockInputUnitChange(event.target.value)
                        }
                        value={productMaxStockInputUnit}
                      >
                        {BULK_STOCK_INPUT_UNIT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="input-combo stock-presentation-combo">
                      <input
                        className="input"
                        id="product-max-stock"
                        min="0"
                        onChange={(event) =>
                          handleProductField("max_stock", event.target.value)
                        }
                        step={productUnitCopy.stockStep}
                        type="number"
                        value={productForm.max_stock}
                      />
                      <select
                        aria-label="Presentacion para stock maximo"
                        className="input-combo-select"
                        onChange={(event) =>
                          handleProductField(
                            "max_stock_presentation_id",
                            event.target.value,
                          )
                        }
                        value={selectedProductMaxStockPresentation.id}
                      >
                        {productStockPresentationOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {isBulkProductForm ? (
                    <span className="field-hint text-xs font-bold text-stone-500">
                      {productMaxStockPoundsInfo}
                    </span>
                  ) : productMaxStockPresentationInfo ? (
                    <span className="field-hint text-xs font-bold text-stone-500">
                      {productMaxStockPresentationInfo}
                    </span>
                  ) : null}
                </div>
              </div>

              <label className="field lg:col-span-2">
                <span className="label">URL de imagen</span>
                <input
                  className="input"
                  onChange={(event) =>
                    handleProductField("image_url", event.target.value)
                  }
                  placeholder="https://..."
                  type="url"
                  value={productForm.image_url}
                />
              </label>

              <label className="field lg:col-span-2">
                <span className="label">Subir foto</span>
                <span className="btn btn-secondary justify-start">
                  <ImagePlus size={18} aria-hidden="true" />
                  {imageFile?.name ?? "Seleccionar imagen"}
                  <input
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    type="file"
                  />
                </span>
              </label>

              {imagePreviewUrl ? (
                <div className="field lg:col-span-2">
                  <span className="label">Vista previa</span>
                  <div className="image-preview-frame">
                    <button
                      aria-label="Eliminar imagen del producto"
                      className="image-preview-remove"
                      disabled={deletingImage || saving}
                      onClick={() => void handleRemoveProductImage()}
                      title="Eliminar imagen"
                      type="button"
                    >
                      {deletingImage ? (
                        <Loader2
                          className="animate-spin"
                          size={16}
                          aria-hidden="true"
                        />
                      ) : (
                        <X size={16} aria-hidden="true" />
                      )}
                    </button>
                    <img
                      alt="Vista previa del producto"
                      className="image-preview"
                      src={imagePreviewUrl}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-primary"
                disabled={saving || hasProductSkuConflict}
                type="submit"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                ) : (
                  <Save size={18} aria-hidden="true" />
                )}
                Guardar
              </button>
              <button className="btn btn-secondary" onClick={resetProductForm} type="button">
                Limpiar
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setActiveSection("catalog")}
                type="button"
              >
                Ver catalogo
              </button>
            </div>
          </form>
        ) : null}

        {activeSection === "catalog" ? (
          <div className="grid gap-5">
            <section className="surface catalog-card overflow-hidden">
              <div
                className="admin-topbar"
                style={{
                  borderBottom: "1px solid var(--line)",
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                  borderLeft: "none",
                  borderRight: "none",
                  borderTop: "none",
                  boxShadow: "none",
                }}
              >
                <div className="grid gap-2">
                  <span className="text-sm font-black uppercase tracking-[0.14em] text-[var(--accent)]">
                    PRODUCTOS
                  </span>
                  <h2>Catalogo</h2>
                  <p>
                    Busca, edita, activa u oculta productos desde una sola vista.
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <span className="badge">
                    {filteredProducts.length} de {products.length}
                  </span>
                </span>
              </div>

              <div>
                  <div className="grid gap-3 border-b border-stone-200 bg-white px-5 py-4 xl:grid-cols-[minmax(220px,360px)_1fr] xl:items-end">
                    <label className="field">
                      <span className="label">Producto</span>
                      <span className="admin-search-input">
                        <Search size={17} aria-hidden="true" />
                        <input
                          className="input"
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Producto..."
                          value={search}
                        />
                      </span>
                    </label>
                    <div className="flex flex-wrap items-center justify-between gap-3 xl:pb-1.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-3 text-sm font-black text-stone-700">
                          <input
                            checked={allVisibleCatalogProductsSelected}
                            disabled={
                              !filteredProducts.length ||
                              deletingProductId === BULK_DELETE_PRODUCT_ID
                            }
                            onChange={handleToggleAllVisibleCatalogProducts}
                            type="checkbox"
                          />
                          Seleccionar visibles
                        </label>
                        <span className="text-sm font-bold text-stone-600">
                          {filteredProducts.length} visible
                          {filteredProducts.length === 1 ? "" : "s"} -{" "}
                          {selectedCatalogProducts.length} seleccionado
                          {selectedCatalogProducts.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="view-toggle" aria-label="Vista de productos">
                          <button
                            aria-pressed={catalogProductViewMode === "list"}
                            className={`view-toggle-button ${
                              catalogProductViewMode === "list" ? "is-active" : ""
                            }`}
                            onClick={() => setCatalogProductViewMode("list")}
                            title="Vista de lista"
                            type="button"
                          >
                            <LayoutList size={16} aria-hidden="true" />
                            Lista
                          </button>
                          <button
                            aria-pressed={catalogProductViewMode === "grid"}
                            className={`view-toggle-button ${
                              catalogProductViewMode === "grid" ? "is-active" : ""
                            }`}
                            onClick={() => setCatalogProductViewMode("grid")}
                            title="Vista de cuadricula"
                            type="button"
                          >
                            <LayoutGrid size={16} aria-hidden="true" />
                            Cuadricula
                          </button>
                        </div>
                        {search ? (
                          <button
                            className="btn btn-secondary"
                            onClick={() => setSearch("")}
                            type="button"
                          >
                            Limpiar
                          </button>
                        ) : null}
                        {selectedCatalogProducts.length ? (
                          <button
                            className="btn btn-danger"
                            disabled={deletingProductId === BULK_DELETE_PRODUCT_ID}
                            onClick={() => void handleDeleteSelectedCatalogProducts()}
                            type="button"
                          >
                            {deletingProductId === BULK_DELETE_PRODUCT_ID ? (
                              <Loader2
                                className="animate-spin"
                                size={17}
                                aria-hidden="true"
                              />
                            ) : (
                              <Trash2 size={17} aria-hidden="true" />
                            )}
                            Eliminar seleccionados
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {filteredProducts.length ? (
                    <div
                      className={
                        catalogProductViewMode === "grid"
                          ? "catalog-product-grid p-5"
                          : "grid divide-y divide-stone-200"
                      }
                    >
                      {filteredProducts.map((product) => {
                        const isSelected = selectedCatalogProductIdsSet.has(
                          product.id,
                        );
                        const isDeleting =
                          deletingProductId === product.id ||
                          deletingProductId === BULK_DELETE_PRODUCT_ID;
                        const displayExpirationDate =
                          getProductDisplayExpirationDate(product);
                        const productMeta = (
                          <>
                            <span>{product.categories?.name ?? "Sin categoria"}</span>
                            <ProductPricingMeta product={product} />
                            <span>Stock {formatProductStockWithPresentationBreakdown(product)}</span>
                            <span>Min. {formatProductMinimumStock(product)}</span>
                            <span>{formatProductLotCount(product)}</span>
                            {displayExpirationDate ? (
                              <span>
                                Caduca {formatDateValue(displayExpirationDate)}
                              </span>
                            ) : null}
                          </>
                        );

                        return catalogProductViewMode === "grid" ? (
                          <article
                            className={`catalog-product-card ${
                              isSelected ? "product-row-selected" : ""
                            }`}
                            key={product.id}
                          >
                            <div className="catalog-product-card-select">
                              <label className="category-select-control">
                                <input
                                  aria-label={`Seleccionar ${product.name}`}
                                  checked={isSelected}
                                  disabled={isDeleting}
                                  onChange={() =>
                                    handleToggleCatalogProductSelection(product.id)
                                  }
                                  type="checkbox"
                                />
                              </label>
                            </div>
                            <ProductVisual product={product} />
                            <div className="grid gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-black">
                                  {product.name}
                                </h4>
                                <span className="badge">{product.sku}</span>
                                {!product.is_active ? (
                                  <span className="badge status-off">Oculto</span>
                                ) : product.stock <= product.min_stock ? (
                                  <span className="badge status-low">
                                    <AlertTriangle size={14} aria-hidden="true" />
                                    Stock bajo
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-sm leading-6 text-stone-600">
                                {product.description ?? "Sin descripcion."}
                              </p>
                              <div className="flex flex-wrap gap-3 text-sm font-bold text-stone-700">
                                {productMeta}
                              </div>
                              <ProductLotDetails product={product} />
                            </div>
                            <div className="catalog-product-card-actions">
                              <button
                                className="btn btn-secondary aspect-square px-0"
                                hidden
                                onClick={() => void handleStockChange(product, -1)}
                                title={`Restar ${getStockAdjustmentStep(product)} ${getStockAdjustmentUnitLabel(product)}`}
                                type="button"
                              >
                                -
                              </button>
                              <button
                                className="btn btn-secondary aspect-square px-0"
                                hidden
                                onClick={() => void handleStockChange(product, 1)}
                                title={`Sumar ${getStockAdjustmentStep(product)} ${getStockAdjustmentUnitLabel(product)}`}
                                type="button"
                              >
                                +
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleEdit(product)}
                                type="button"
                              >
                                Editar
                              </button>
                              <button
                                className="btn btn-danger aspect-square px-0"
                                disabled={isDeleting}
                                onClick={() => void handleDeleteProduct(product)}
                                title="Eliminar producto"
                                type="button"
                              >
                                {isDeleting ? (
                                  <Loader2
                                    className="animate-spin"
                                    size={17}
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Trash2 size={17} aria-hidden="true" />
                                )}
                              </button>
                            </div>
                          </article>
                        ) : (
                          <article
                            className={`product-row grid gap-4 p-5 lg:grid-cols-[auto_minmax(96px,140px)_1fr_auto] lg:items-center ${
                              isSelected ? "product-row-selected" : ""
                            }`}
                            key={product.id}
                          >
                            <label className="category-select-control">
                              <input
                                aria-label={`Seleccionar ${product.name}`}
                                checked={isSelected}
                                disabled={isDeleting}
                                onChange={() =>
                                  handleToggleCatalogProductSelection(product.id)
                                }
                                type="checkbox"
                              />
                            </label>
                            <ProductVisual product={product} />
                            <div className="grid gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-black">
                                  {product.name}
                                </h4>
                                <span className="badge">{product.sku}</span>
                                {!product.is_active ? (
                                  <span className="badge status-off">Oculto</span>
                                ) : product.stock <= product.min_stock ? (
                                  <span className="badge status-low">
                                    <AlertTriangle size={14} aria-hidden="true" />
                                    Stock bajo
                                  </span>
                                ) : null}
                              </div>
                              <p className="max-w-2xl text-sm leading-6 text-stone-600">
                                {product.description ?? "Sin descripcion."}
                              </p>
                              <div className="flex flex-wrap gap-3 text-sm font-bold text-stone-700">
                                {productMeta}
                              </div>
                              <ProductLotDetails product={product} />
                            </div>
                            <div className="catalog-product-list-actions">
                              <button
                                className="btn btn-secondary aspect-square px-0"
                                hidden
                                onClick={() => void handleStockChange(product, -1)}
                                title={`Restar ${getStockAdjustmentStep(product)} ${getStockAdjustmentUnitLabel(product)}`}
                                type="button"
                              >
                                -
                              </button>
                              <button
                                className="btn btn-secondary aspect-square px-0"
                                hidden
                                onClick={() => void handleStockChange(product, 1)}
                                title={`Sumar ${getStockAdjustmentStep(product)} ${getStockAdjustmentUnitLabel(product)}`}
                                type="button"
                              >
                                +
                              </button>
                              <button
                                className="btn btn-secondary"
                                onClick={() => handleEdit(product)}
                                type="button"
                              >
                                Editar
                              </button>
                              <button
                                className="btn btn-danger aspect-square px-0"
                                disabled={isDeleting}
                                onClick={() => void handleDeleteProduct(product)}
                                title="Eliminar producto"
                                type="button"
                              >
                                {isDeleting ? (
                                  <Loader2
                                    className="animate-spin"
                                    size={17}
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Trash2 size={17} aria-hidden="true" />
                                )}
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-sm leading-6 text-stone-600">
                      No hay productos que coincidan con esa busqueda.
                    </div>
                  )}
                </div>
            </section>
          </div>
        ) : null}

        {isPurchasesSection ? (
          <form
            className="surface section-card purchase-form-card purchase-invoice-form grid gap-5 p-5"
            onSubmit={handleSavePurchaseInvoice}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-2">
                <span className="badge badge-yellow w-fit">
                  <ShoppingCart size={15} aria-hidden="true" />
                  Compra de inventario
                </span>
                <div>
                  <h3 className="text-2xl font-black text-stone-950">
                    Registrar compra
                  </h3>
                  <p className="text-sm leading-6 text-stone-600">
                    Ingresa la factura del proveedor y sus productos.
                  </p>
                </div>
              </div>
            </div>

            <div className="purchase-invoice-top-grid">
              <AdminSearchCombobox
                allOptions={purchaseInvoiceAllProviderComboboxOptions}
                className="purchase-invoice-provider-field"
                createLabel="Proveedor nuevo"
                disabled={savingPurchase || isPurchaseInvoiceProviderLocked}
                label="Proveedor"
                onChange={(value) => {
                  if (!isPurchaseInvoiceProviderLocked) {
                    setPurchaseInvoiceProvider(value);
                  }
                }}
                onSelect={handleSelectPurchaseInvoiceProvider}
                optionLimit={Math.max(
                  purchaseInvoiceAllProviderComboboxOptions.length,
                  8,
                )}
                options={purchaseInvoiceProviderComboboxOptions}
                placeholder="Escribe o selecciona proveedor"
                required
                value={purchaseInvoiceProvider}
              />
              <label className="field purchase-invoice-date-field">
                <span className="label">Fecha de compra</span>
                <input
                  className="input"
                  readOnly
                  value={formatDateInputDisplay(purchaseInvoiceDate)}
                />
              </label>
              <label className="field purchase-invoice-ruc-field">
                <span className="label">RUC</span>
                <input
                  className="input"
                  readOnly
                  value={selectedPurchaseInvoiceProvider?.ruc ?? ""}
                />
              </label>
              <label className="field purchase-invoice-code-field">
                <span className="label">Codigo interno de compra</span>
                <input
                  className="input font-black text-[var(--accent-strong)]"
                  readOnly
                  value={purchaseInvoiceCode}
                />
              </label>
            </div>

            {selectedPurchaseInvoiceProvider ? (
              <div className="purchase-provider-info-grid">
                <label className="field">
                  <span className="label">Telefono</span>
                  <input
                    className="input"
                    readOnly
                    value={
                      selectedPurchaseInvoiceProvider.phone ||
                      "Sin telefono registrado"
                    }
                  />
                </label>
                <label className="field">
                  <span className="label">Direccion</span>
                  <input
                    className="input"
                    readOnly
                    value={
                      selectedPurchaseInvoiceProvider.address ||
                      "Sin direccion registrada"
                    }
                  />
                </label>
                <label className="field">
                  <span className="label">Distribuye</span>
                  <input
                    className="input"
                    readOnly
                    value={
                      selectedPurchaseInvoiceProvider.notes ||
                      "Sin distribución registrada"
                    }
                  />
                </label>
              </div>
            ) : null}

            <div className="purchase-invoice-band">
              <h4>No. factura</h4>
              <div
                className={`grid gap-4 ${
                  purchasePaymentMethod === "credit"
                    ? "lg:grid-cols-[minmax(0,1fr)_170px_170px_170px_120px]"
                    : "lg:grid-cols-[minmax(0,1fr)_220px]"
                }`}
              >
                <label className="field">
                  <span className="label">Numero de factura</span>
                  <input
                    className="input"
                    disabled={savingPurchase}
                    onChange={(event) => setPurchaseInvoiceNumber(event.target.value)}
                    placeholder="Ej. 001-001-000123456"
                    value={purchaseInvoiceNumber}
                  />
                </label>
                <label className="field">
                  <span className="label">Forma de pago</span>
                  <select
                    className="input"
                    disabled={savingPurchase}
                    onChange={(event) =>
                      handlePurchaseInvoicePaymentMethod(event.target.value)
                    }
                    value={purchasePaymentMethod}
                  >
                    <option value="cash">Contado</option>
                    <option value="credit">Credito</option>
                  </select>
                </label>
                {purchasePaymentMethod === "credit" ? (
                  <>
                    <label className="field">
                      <span className="label">Fecha emision</span>
                      <input
                        className="input"
                        disabled={savingPurchase}
                        onChange={(event) =>
                          setPurchaseCreditIssueDate(event.target.value)
                        }
                        required
                        type="date"
                        value={purchaseCreditIssueDate}
                      />
                    </label>
                    <label className="field">
                      <span className="label">Fecha vencimiento</span>
                      <input
                        className="input"
                        disabled={savingPurchase}
                        min={purchaseCreditIssueDate || undefined}
                        onChange={(event) =>
                          setPurchaseCreditDueDate(event.target.value)
                        }
                        required
                        type="date"
                        value={purchaseCreditDueDate}
                      />
                    </label>
                    <label className="field">
                      <span className="label">Plazo</span>
                      <input
                        className="input"
                        readOnly
                        value={
                          Number.isFinite(calculatedPurchaseCreditDays) &&
                          calculatedPurchaseCreditDays > 0
                            ? `${calculatedPurchaseCreditDays} dias`
                            : ""
                        }
                      />
                    </label>
                  </>
                ) : null}
              </div>
            </div>

            <div className="purchase-invoice-table-wrap">
              <table
                className={`purchase-invoice-table ${
                  shouldShowPurchaseInvoiceIvaColumns
                    ? ""
                    : "purchase-invoice-table--no-iva"
                }`.trim()}
              >
                <thead>
                  <tr>
                    <th>Codigo prod</th>
                    {shouldShowPurchaseInvoiceProductCode ? (
                      <th>Codigo de producto</th>
                    ) : null}
                    <th>Nombre</th>
                    <th>Cantidad</th>
                    <th>Unidad compra</th>
                    <th>Ingresa a stock</th>
                    {shouldShowPurchaseInvoiceDateColumns ? (
                      <>
                        <th>Fabricacion</th>
                        <th>Vencimiento</th>
                      </>
                    ) : null}
                    <th>Costo de compra</th>
                    {shouldShowPurchaseInvoiceIvaColumns ? <th>IVA</th> : null}
                    <th>Total</th>
                    {shouldShowPurchaseInvoiceSalePriceColumn ? (
                      <>
                        <th>Precio venta al publico</th>
                        <th>P.V.P Base (U. Mínima)</th>
                      </>
                    ) : null}
                    {shouldShowPurchaseInvoiceIvaColumns ? (
                      <>
                        <th>Precio base (Sin IVA)</th>
                        <th>P.V.P Final (Con IVA)</th>
                        <th>P.V.P Unidad (Sin IVA)</th>
                        <th>P.V.P Unidad Final</th>
                      </>
                    ) : null}
                    <th aria-label="Acciones"></th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseInvoiceLines.map((line) => {
                    const product = products.find(
                      (entry) => entry.id === line.product_id,
                    );
                    const measurementUnit = normalizeProductMeasurementUnit(
                      product?.measurement_unit,
                    );
                    const isBulkLine = measurementUnit === "lb";
                    const linePresentations =
                      product
                        ? getPurchaseInvoiceLinePresentations(product)
                        : [];
                    const bulkLinePresentations =
                      isBulkLine && product
                        ? getBulkPurchaseLinePresentations(product)
                        : [];
                    const selectedLinePresentation =
                      getPurchaseInvoiceLinePresentation(line, product);
                    const totals = buildPurchaseInvoiceLineTotals(line, product);
                    const shouldShowLineIvaFields =
                      shouldShowPurchaseInvoiceIvaColumns &&
                      isPurchaseInvoiceIvaProduct(product);
                    const shouldShowLineDateFields =
                      shouldShowPurchaseInvoiceDateColumns &&
                      doesProductRequireDates(product);
                    const shouldShowLineSalePriceField =
                      shouldShowPurchaseInvoiceSalePriceColumn &&
                      (!product || !isPurchaseInvoiceIvaProduct(product));

                    return (
                      <tr key={line.id}>
                        <td>
                          <span className="purchase-invoice-code">
                            {product?.sku ?? "-"}
                          </span>
                        </td>
                        {shouldShowPurchaseInvoiceProductCode ? (
                          <td>
                            <span className="purchase-invoice-code">
                              {product?.product_code
                                ? formatProductCodeInputValue(product.product_code)
                                : ""}
                            </span>
                          </td>
                        ) : null}
                        <td className="purchase-invoice-product-cell">
                          <AdminSearchCombobox
                            allOptions={
                              purchaseInvoiceProvider
                                ? purchaseInvoiceAllProductComboboxOptions
                                : []
                            }
                            disabled={savingPurchase || !purchaseInvoiceProvider}
                            label="Producto"
                            onChange={(value) =>
                              handlePurchaseInvoiceProductInput(line.id, value)
                            }
                            onSelect={(option) =>
                              handleSelectPurchaseInvoiceProduct(line.id, option)
                            }
                            options={
                              purchaseInvoiceProvider
                                ? buildProductComboboxOptions(
                                    purchaseInvoiceProviderProductOptions,
                                    line.product_search,
                                    purchaseInvoiceProviderProductOptions.length || 8,
                                  )
                                : []
                            }
                            optionLimit={Math.max(
                              purchaseInvoiceProviderProductOptions.length,
                              8,
                            )}
                            placeholder={
                              purchaseInvoiceProvider
                                ? "Buscar producto"
                                : "Selecciona un proveedor..."
                            }
                            portalOptions
                            value={line.product_search}
                          />
                        </td>
                        <td>
                          <input
                            className="input purchase-invoice-number"
                            disabled={savingPurchase}
                            min="0"
                            onChange={(event) =>
                              handlePurchaseInvoiceLineField(
                                line.id,
                                "quantity",
                                event.target.value,
                              )
                            }
                            step={
                              isBulkLine
                                ? getBulkStockInputStep(line.quantity_input_unit)
                                : "1"
                            }
                            type="number"
                            value={line.quantity}
                          />
                        </td>
                        <td>
                          {isBulkLine ? (
                            <select
                              className="input purchase-invoice-number"
                              disabled={savingPurchase}
                              onChange={(event) =>
                                handlePurchaseInvoiceLinePurchaseUnitChange(
                                  line.id,
                                  event.target.value,
                                )
                              }
                              value={
                                line.purchase_presentation_id
                                  ? `presentation:${line.purchase_presentation_id}`
                                  : `bulk:${line.quantity_input_unit}`
                              }
                            >
                              {bulkLinePresentations.length === 0 &&
                                BULK_STOCK_INPUT_UNIT_OPTIONS.map((option) => (
                                  <option
                                    key={option.value}
                                    value={`bulk:${option.value}`}
                                  >
                                    {option.label}
                                  </option>
                                ))}
                              {bulkLinePresentations.map((presentation) => (
                                <option
                                  key={presentation.id}
                                  value={`presentation:${presentation.id}`}
                                >
                                  {presentation.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <select
                                className="input purchase-invoice-unit-select"
                                disabled={savingPurchase || !product}
                                onChange={(event) =>
                                  handlePurchaseInvoiceLinePresentationChange(
                                    line.id,
                                    event.target.value,
                                  )
                                }
                                value={line.purchase_presentation_id || ""}
                              >
                                {!product ? (
                                  <option value="" disabled hidden>
                                    Escoger presentación...
                                  </option>
                                ) : null}
                                {linePresentations.map((presentation) => (
                                  <option key={presentation.id} value={presentation.id}>
                                    {presentation.name}
                                  </option>
                                ))}
                                {product ? (
                                  <option value="custom">Otra presentación...</option>
                                ) : null}
                              </select>
                              {line.purchase_presentation_id === "custom" && product && (
                                <div className="flex flex-col gap-1 sm:flex-row">
                                  <label className="field w-full">
                                    <span className="label text-[10px] leading-tight">Nombre (Ej: Caja)</span>
                                    <input
                                      className="input !text-xs !py-1 !px-2"
                                      disabled={savingPurchase}
                                      onChange={(event) =>
                                        handlePurchaseInvoiceLineField(
                                          line.id,
                                          "custom_presentation_name",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Nombre"
                                      type="text"
                                      value={line.custom_presentation_name}
                                    />
                                  </label>
                                  <label className="field w-full sm:w-24 shrink-0">
                                    <span className="label text-[10px] leading-tight">Equivalencia</span>
                                    <input
                                      className="input !text-xs !py-1 !px-2"
                                      disabled={savingPurchase}
                                      min="1"
                                      onChange={(event) =>
                                        handlePurchaseInvoiceLineField(
                                          line.id,
                                          "custom_presentation_quantity",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Cant."
                                      type="number"
                                      value={line.custom_presentation_quantity}
                                    />
                                  </label>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          {isBulkLine
                            ? `${formatPoundInfoQuantity(totals.quantity)} lb`
                            : `${formatProductQuantity(totals.quantity)} und`}
                        </td>
                        {shouldShowPurchaseInvoiceDateColumns ? (
                          <>
                            <td>
                              {shouldShowLineDateFields ? (
                                <input
                                  className="input purchase-invoice-date"
                                  disabled={savingPurchase}
                                  onChange={(event) =>
                                    handlePurchaseInvoiceLineField(
                                      line.id,
                                      "manufacture_date",
                                      event.target.value,
                                    )
                                  }
                                  type="date"
                                  value={line.manufacture_date}
                                />
                              ) : null}
                            </td>
                            <td>
                              {shouldShowLineDateFields ? (
                                <input
                                  className="input purchase-invoice-date"
                                  disabled={savingPurchase}
                                  onChange={(event) =>
                                    handlePurchaseInvoiceLineField(
                                      line.id,
                                      "expiration_date",
                                      event.target.value,
                                    )
                                  }
                                  type="date"
                                  value={line.expiration_date}
                                />
                              ) : null}
                            </td>
                          </>
                        ) : null}
                        <td>
                          <input
                            className="input purchase-invoice-number"
                            disabled={savingPurchase}
                            min="0"
                            onChange={(event) =>
                              handlePurchaseInvoiceLineField(
                                line.id,
                                "cost",
                                event.target.value,
                              )
                            }
                            step="0.01"
                            type="number"
                            value={line.cost}
                          />
                        </td>

                        {shouldShowPurchaseInvoiceIvaColumns ? (
                          <td>
                            {shouldShowLineIvaFields ? (
                              <>
                                <input
                                  className="input purchase-invoice-number"
                                  disabled={savingPurchase}
                                  min="0"
                                  onChange={(event) =>
                                    handlePurchaseInvoiceLineField(
                                      line.id,
                                      "iva_rate",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="0"
                                  step="0.01"
                                  type="number"
                                  value={line.iva_rate}
                                />
                                <span className="mt-1 block text-[11px] font-black text-stone-500">
                                  {formatMoney(totals.ivaAmount)}
                                </span>
                              </>
                            ) : null}
                          </td>
                        ) : null}
                        <td>
                          <div className="font-bold">{formatMoney(totals.total)}</div>
                          {shouldShowLineIvaFields && Number(line.iva_rate) > 0 ? (
                            <span className="mt-1 block text-[11px] text-stone-500 whitespace-nowrap">
                              {formatMoney(totals.subtotal)} + {formatMoney(totals.ivaAmount)}
                            </span>
                          ) : null}
                        </td>
                        {shouldShowPurchaseInvoiceSalePriceColumn ? (
                          <>
                            <td>
                              {shouldShowLineSalePriceField ? (
                                <>
                                  <input
                                    className={`input purchase-invoice-number ${
                                      Number(line.cost) > 0 && Number(line.pvp_without_iva) > 0 && Number(line.pvp_without_iva) < Number(line.cost)
                                        ? "!border-red-500 !text-red-600 focus:!border-red-500 focus:!ring-red-500"
                                        : ""
                                    }`.trim()}
                                    disabled={savingPurchase}
                                    min="0"
                                    onChange={(event) =>
                                      handlePurchaseInvoiceLineField(
                                        line.id,
                                        "pvp_without_iva",
                                        event.target.value,
                                      )
                                    }
                                    step="0.01"
                                    type="number"
                                    value={line.pvp_without_iva}
                                  />
                                  <span className="mt-1 block text-[10px] text-stone-500 uppercase">
                                    {totals.purchaseUnit}
                                  </span>
                                  {Number(line.cost) > 0 && Number(line.pvp_without_iva) > 0 && Number(line.pvp_without_iva) < Number(line.cost) && (
                                    <span className="mt-1 block text-[10px] text-red-600 font-bold uppercase leading-tight">
                                      ⚠️ PÉRDIDA: {formatMoney(Number(line.pvp_without_iva))} &lt; costo {formatMoney(Number(line.cost))}
                                    </span>
                                  )}
                                  {Number(line.cost) > 0 && Number(line.pvp_without_iva) >= Number(line.cost) && (
                                    <span className={`mt-1 block text-[10px] font-bold uppercase leading-tight ${Number(line.pvp_without_iva) > Number(line.cost) ? "text-green-600" : "text-stone-400"}`}>
                                      {Number(line.pvp_without_iva) > Number(line.cost) 
                                        ? `+${formatMoney(Number(line.pvp_without_iva) - Number(line.cost))} (${(((Number(line.pvp_without_iva) - Number(line.cost)) / Number(line.cost)) * 100).toFixed(1)}% GANANCIA)`
                                        : "PUNTO DE EQUILIBRIO (0%)"
                                      }
                                    </span>
                                  )}
                                </>
                              ) : null}
                            </td>
                            <td>
                              {shouldShowLineSalePriceField ? (
                                <>
                                  <input
                                    className={`input purchase-invoice-number ${
                                      (() => {
                                        const unitPriceInput = Number(line.base_price_without_iva || (totals.presentationUnitQuantity === 1 ? line.pvp_without_iva : 0));
                                        return totals.unitCostWithoutIva > 0 && unitPriceInput > 0 && unitPriceInput < totals.unitCostWithoutIva;
                                      })() ? "!border-red-500 !text-red-600 focus:!border-red-500 focus:!ring-red-500" : ""
                                    }`.trim()}
                                    disabled={savingPurchase}
                                    min="0"
                                    onChange={(event) =>
                                      handlePurchaseInvoiceLineField(
                                        line.id,
                                        "base_price_without_iva",
                                        event.target.value,
                                      )
                                    }
                                    step="0.01"
                                    type="number"
                                    value={line.base_price_without_iva || (totals.presentationUnitQuantity === 1 ? line.pvp_without_iva : "")}
                                  />
                                  <span className="mt-1 block text-[10px] text-stone-500 uppercase">
                                    {measurementUnit === "lb" ? "LIBRA" : "UNIDAD"}
                                  </span>
                                  {(() => {
                                    const unitPriceInput = Number(line.base_price_without_iva || (totals.presentationUnitQuantity === 1 ? line.pvp_without_iva : 0));
                                    if (totals.unitCostWithoutIva > 0 && unitPriceInput > 0 && unitPriceInput < totals.unitCostWithoutIva) {
                                      return (
                                        <span className="mt-1 block text-[10px] text-red-600 font-bold uppercase leading-tight">
                                          ⚠️ PÉRDIDA: {formatMoney(unitPriceInput)} &lt; costo {formatMoney(totals.unitCostWithoutIva)}
                                        </span>
                                      );
                                    } else if (totals.unitCostWithoutIva > 0 && unitPriceInput >= totals.unitCostWithoutIva) {
                                      return (
                                        <span className={`mt-1 block text-[10px] font-bold uppercase leading-tight ${unitPriceInput > totals.unitCostWithoutIva ? "text-green-600" : "text-stone-400"}`}>
                                          {unitPriceInput > totals.unitCostWithoutIva 
                                            ? `+${formatMoney(unitPriceInput - totals.unitCostWithoutIva)} (${(((unitPriceInput - totals.unitCostWithoutIva) / totals.unitCostWithoutIva) * 100).toFixed(1)}% GANANCIA)`
                                            : "PUNTO DE EQUILIBRIO (0%)"
                                          }
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </>
                              ) : null}
                            </td>
                          </>
                        ) : null}
                        {shouldShowPurchaseInvoiceIvaColumns ? (
                          <>
                            <td>
                              {shouldShowLineIvaFields ? (
                                <>
                                  <input
                                    className={`input purchase-invoice-number ${
                                      Number(line.cost) > 0 && Number(line.pvp_without_iva) > 0 && Number(line.pvp_without_iva) < Number(line.cost)
                                        ? "!border-red-500 !text-red-600 focus:!border-red-500 focus:!ring-red-500"
                                        : ""
                                    }`.trim()}
                                    disabled={savingPurchase}
                                    min="0"
                                    onChange={(event) =>
                                      handlePurchaseInvoiceLineField(
                                        line.id,
                                        "pvp_without_iva",
                                        event.target.value,
                                      )
                                    }
                                    step="0.01"
                                    type="number"
                                    value={line.pvp_without_iva}
                                  />
                                  <span className="mt-1 block text-[10px] text-stone-500 uppercase">
                                    {totals.purchaseUnit}
                                  </span>
                                  {Number(line.cost) > 0 && Number(line.pvp_without_iva) > 0 && Number(line.pvp_without_iva) < Number(line.cost) && (
                                    <span className="mt-1 block text-[10px] text-red-600 font-bold uppercase leading-tight">
                                      ⚠️ PÉRDIDA: {formatMoney(Number(line.pvp_without_iva))} &lt; costo {formatMoney(Number(line.cost))}
                                    </span>
                                  )}
                                </>
                              ) : null}
                            </td>
                            <td>
                              {shouldShowLineIvaFields ? (
                                <>
                                  <div className="font-bold">{formatMoney(totals.pvpWithIva)}</div>
                                  <span className="mt-1 block text-[11px] text-stone-500 whitespace-nowrap">
                                    {formatMoney(totals.pvpWithoutIva)} + {formatMoney(totals.pvpWithIva - totals.pvpWithoutIva)}
                                  </span>
                                  {Number(line.cost) > 0 && Number(line.pvp_without_iva) >= Number(line.cost) && (
                                    <span className={`mt-1 block text-[10px] font-bold uppercase leading-tight ${Number(line.pvp_without_iva) > Number(line.cost) ? "text-green-600" : "text-stone-400"}`}>
                                      {Number(line.pvp_without_iva) > Number(line.cost) 
                                        ? `+${formatMoney(Number(line.pvp_without_iva) - Number(line.cost))} (${(((Number(line.pvp_without_iva) - Number(line.cost)) / Number(line.cost)) * 100).toFixed(1)}% GANANCIA)`
                                        : "PUNTO DE EQUILIBRIO (0%)"
                                      }
                                    </span>
                                  )}
                                </>
                              ) : ""}
                            </td>
                            <td>
                              {shouldShowLineIvaFields ? (
                                <>
                                  <input
                                    className={`input purchase-invoice-number ${
                                      (() => {
                                        const unitPriceInput = Number(line.base_price_without_iva || (totals.presentationUnitQuantity === 1 ? line.pvp_without_iva : 0));
                                        return totals.unitCostWithoutIva > 0 && unitPriceInput > 0 && unitPriceInput < totals.unitCostWithoutIva;
                                      })() ? "!border-red-500 !text-red-600 focus:!border-red-500 focus:!ring-red-500" : ""
                                    }`.trim()}
                                    disabled={savingPurchase}
                                    min="0"
                                    onChange={(event) =>
                                      handlePurchaseInvoiceLineField(
                                        line.id,
                                        "base_price_without_iva",
                                        event.target.value,
                                      )
                                    }
                                    step="0.01"
                                    type="number"
                                    value={line.base_price_without_iva || (totals.presentationUnitQuantity === 1 ? line.pvp_without_iva : "")}
                                  />
                                  <span className="mt-1 block text-[10px] text-stone-500 uppercase">
                                    {measurementUnit === "lb" ? "LIBRA" : "UNIDAD"}
                                  </span>
                                  {(() => {
                                    const unitPriceInput = Number(line.base_price_without_iva || (totals.presentationUnitQuantity === 1 ? line.pvp_without_iva : 0));
                                    if (totals.unitCostWithoutIva > 0 && unitPriceInput > 0 && unitPriceInput < totals.unitCostWithoutIva) {
                                      return (
                                        <span className="mt-1 block text-[10px] text-red-600 font-bold uppercase leading-tight">
                                          ⚠️ PÉRDIDA: {formatMoney(unitPriceInput)} &lt; costo {formatMoney(totals.unitCostWithoutIva)}
                                        </span>
                                      );
                                    } else if (totals.unitCostWithoutIva > 0 && unitPriceInput >= totals.unitCostWithoutIva) {
                                      return (
                                        <span className={`mt-1 block text-[10px] font-bold uppercase leading-tight ${unitPriceInput > totals.unitCostWithoutIva ? "text-green-600" : "text-stone-400"}`}>
                                          {unitPriceInput > totals.unitCostWithoutIva 
                                            ? `+${formatMoney(unitPriceInput - totals.unitCostWithoutIva)} (${(((unitPriceInput - totals.unitCostWithoutIva) / totals.unitCostWithoutIva) * 100).toFixed(1)}% GANANCIA)`
                                            : "PUNTO DE EQUILIBRIO (0%)"
                                          }
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </>
                              ) : null}
                            </td>
                            <td>
                              {shouldShowLineIvaFields ? (
                                <>
                                  <div className="font-bold">{formatMoney(totals.basePvpWithIva)}</div>
                                  <span className="mt-1 block text-[11px] text-stone-500 whitespace-nowrap">
                                    {formatMoney(totals.basePvpWithoutIva)} + {formatMoney(totals.basePvpWithIva - totals.basePvpWithoutIva)}
                                  </span>
                                  {(() => {
                                    const unitPriceInput = Number(line.base_price_without_iva || (totals.presentationUnitQuantity === 1 ? line.pvp_without_iva : 0));
                                    if (totals.unitCostWithoutIva > 0 && unitPriceInput >= totals.unitCostWithoutIva) {
                                      return (
                                        <span className={`mt-1 block text-[10px] font-bold uppercase leading-tight ${unitPriceInput > totals.unitCostWithoutIva ? "text-green-600" : "text-stone-400"}`}>
                                          {unitPriceInput > totals.unitCostWithoutIva 
                                            ? `+${formatMoney(unitPriceInput - totals.unitCostWithoutIva)} (${(((unitPriceInput - totals.unitCostWithoutIva) / totals.unitCostWithoutIva) * 100).toFixed(1)}% GANANCIA)`
                                            : "PUNTO DE EQUILIBRIO (0%)"
                                          }
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </>
                              ) : ""}
                            </td>
                          </>
                        ) : null}
                        <td>
                          <button
                            aria-label="Quitar producto"
                            className="btn btn-danger aspect-square px-0"
                            disabled={savingPurchase}
                            onClick={() => handleRemovePurchaseInvoiceLine(line.id)}
                            type="button"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="purchase-invoice-summary">
              <div>
                <span>Subtotal</span>
                <strong>{formatMoney(purchaseInvoiceTotals.subtotal)}</strong>
              </div>
              <div>
                <span>IVA</span>
                <strong>{formatMoney(purchaseInvoiceTotals.ivaAmount)}</strong>
              </div>
              <div className="purchase-invoice-summary-total">
                <span>Valor total</span>
                <strong>{formatMoney(purchaseInvoiceTotals.total)}</strong>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2">
              <button
                className="btn btn-secondary"
                disabled={savingPurchase || !purchaseInvoiceProvider}
                onClick={handleAddPurchaseInvoiceLine}
                type="button"
              >
                <Plus size={17} aria-hidden="true" />
                Agregar producto
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-secondary"
                  disabled={savingPurchase}
                  onClick={() => resetPurchaseInvoice()}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="btn btn-primary"
                  disabled={savingPurchase || purchaseInvoiceLines.some((line) => {
                    const product = products.find((entry) => entry.id === line.product_id);
                    const totals = buildPurchaseInvoiceLineTotals(line, product);
                    const hasLoss = Number(line.cost) > 0 && Number(line.pvp_without_iva) > 0 && Number(line.pvp_without_iva) < Number(line.cost);
                    const unitPriceInput = Number(line.base_price_without_iva || (totals.presentationUnitQuantity === 1 ? line.pvp_without_iva : 0));
                    const hasUnitLoss = totals.unitCostWithoutIva > 0 && unitPriceInput > 0 && unitPriceInput < totals.unitCostWithoutIva;
                    return hasLoss || hasUnitLoss;
                  })}
                  type="submit"
                >
                  {savingPurchase ? (
                    <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                  ) : (
                    <Save size={18} aria-hidden="true" />
                  )}
                  Guardar compra
                </button>
              </div>
            </div>
          </form>
        ) : null}

        {activeSection === "history" ? (
          <section className="grid gap-5">
            {historyOrder.map((sectionId) => (
              <Fragment key={sectionId}>
                {sectionId === "invoices" ? (
            <details
              className={`surface history-disclosure cursor-grab active:cursor-grabbing ${draggingHistoryItem === "invoices" ? "opacity-40" : ""} ${dragOverHistoryItem === "invoices" && draggingHistoryItem !== "invoices" ? "outline-dashed outline-2 outline-offset-2 outline-[var(--primary)]" : ""}`}
              draggable
              onDragStart={(e) => handleHistoryDragStart(e, "invoices")}
              onDragOver={(e) => handleHistoryDragOver(e, "invoices")}
              onDrop={(e) => handleHistoryDrop(e, "invoices")}
              onDragEnd={handleHistoryDragEnd}
              open={historyInvoicesOpen}
              onToggle={(e: React.SyntheticEvent<HTMLDetailsElement, Event>) =>
                setHistoryInvoicesOpen(e.currentTarget.open)
              }
            >
              <summary className="history-disclosure-summary">
                <div className="history-disclosure-title">
                  <span className="history-disclosure-icon">
                    <ReceiptText size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Facturas de compra</h3>
                    <p>Compras agrupadas por factura y codigo interno.</p>
                  </div>
                </div>
                <div className="history-disclosure-meta">
                  <strong>{purchaseInvoiceHistoryGroups.length}</strong>
                  <span>facturas</span>
                  <ChevronDown size={18} aria-hidden="true" />
                </div>
              </summary>

              <div className="history-disclosure-content">
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-wrap gap-4 items-end">
                    <label className="field purchase-history-search-field flex-grow" style={{ margin: 0, minWidth: '220px' }}>
                      <span className="label">Buscar factura de compra</span>
                      <span className="purchase-history-search-control">
                        <Search size={18} aria-hidden="true" />
                        <input
                          aria-label="Buscar por factura, codigo interno o fecha"
                          onChange={(event) =>
                            setPurchaseInvoiceHistorySearch(event.target.value)
                          }
                          placeholder="No. factura, codigo COMP-, proveedor o fecha..."
                          type="search"
                          value={purchaseInvoiceHistorySearch}
                        />
                        {purchaseInvoiceHistorySearch ? (
                          <button
                            aria-label="Limpiar busqueda de facturas"
                            onClick={() => setPurchaseInvoiceHistorySearch("")}
                            title="Limpiar busqueda"
                            type="button"
                          >
                            <X size={16} aria-hidden="true" />
                          </button>
                        ) : null}
                      </span>
                    </label>
                    
                    <label className="field" style={{ margin: 0, minWidth: '150px' }}>
                      <span className="label">Periodo</span>
                      <select
                        className="input"
                        onChange={(event) =>
                          setPurchaseInvoicePeriodFilter(event.target.value as InvoicePeriodFilter)
                        }
                        value={purchaseInvoicePeriodFilter}
                      >
                        <option value="all">Todos</option>
                        <option value="day">Día</option>
                        <option value="month">Mes</option>
                        <option value="range">Desde</option>
                      </select>
                    </label>
                    {purchaseInvoicePeriodFilter !== "all" ? (
                      <>
                        <label className="field" style={{ margin: 0, minWidth: '150px' }}>
                          <span className="label">
                            {purchaseInvoicePeriodFilter === "range" ? "Desde" : "Fecha"}
                          </span>
                          <input
                            className="input"
                            type={purchaseInvoicePeriodFilter === "month" ? "month" : "date"}
                            value={purchaseInvoiceDateFilter}
                            onChange={(e) => setPurchaseInvoiceDateFilter(e.target.value)}
                          />
                        </label>
                        {purchaseInvoicePeriodFilter === "range" && (
                          <label className="field" style={{ margin: 0, minWidth: '150px' }}>
                            <span className="label">Hasta</span>
                            <input
                              className="input"
                              type="date"
                              value={purchaseInvoiceEndDateFilter}
                              onChange={(e) => setPurchaseInvoiceEndDateFilter(e.target.value)}
                            />
                          </label>
                        )}
                      </>
                    ) : null}
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t border-stone-100">
                    {selectedInvoiceGroupIds.length > 0 && (
                      <button
                        className="btn"
                        style={{
                          background: "var(--danger)",
                          color: "white",
                          border: "none",
                        }}
                        disabled={deletingInvoices}
                        onClick={() => void handleBulkDeleteInvoices()}
                        type="button"
                      >
                        {deletingInvoices ? (
                          <Loader2
                            className="animate-spin"
                            size={17}
                            aria-hidden="true"
                          />
                        ) : (
                          <Trash2 size={17} aria-hidden="true" />
                        )}
                        Eliminar ({selectedInvoiceGroupIds.length})
                      </button>
                    )}
                    <button
                      className="btn btn-secondary"
                      disabled={loadingPurchaseHistory || deletingInvoices}
                      onClick={() => void loadRemotePurchaseHistory()}
                      type="button"
                    >
                      {loadingPurchaseHistory ? (
                        <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                      ) : (
                        <RotateCcw size={17} aria-hidden="true" />
                      )}
                      Actualizar
                    </button>
                  </div>
                </div>

                <div className="purchase-history-result-summary">
                  <div>
                    <span>Facturas encontradas</span>
                    <strong>{purchaseInvoiceHistoryTotals.invoices}</strong>
                  </div>
                  <div>
                    <span>Productos comprados</span>
                    <strong>{purchaseInvoiceHistoryTotals.products}</strong>
                  </div>
                  <div>
                    <span>Subtotal (Sin IVA)</span>
                    <strong>{formatMoney(purchaseInvoiceHistoryTotals.subtotal)}</strong>
                  </div>
                  <div>
                    <span>IVA Pagado</span>
                    <strong>{formatMoney(purchaseInvoiceHistoryTotals.total - purchaseInvoiceHistoryTotals.subtotal)}</strong>
                  </div>
                  <div>
                    <span>Valor total (Con IVA)</span>
                    <strong>{formatMoney(purchaseInvoiceHistoryTotals.total)}</strong>
                  </div>
                </div>

                {filteredPurchaseInvoiceHistoryGroups.length ? (
                  <div className="purchase-history-list">
                    <div className="purchase-history-table-wrap">
                      <table className="purchase-history-master-table">
                        <thead>
                          <tr>
                            <th style={{ width: 40, textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={
                                  filteredPurchaseInvoiceHistoryGroups.length > 0 &&
                                  selectedInvoiceGroupIds.length ===
                                    filteredPurchaseInvoiceHistoryGroups.length
                                }
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedInvoiceGroupIds(
                                      filteredPurchaseInvoiceHistoryGroups.map(
                                        (g) => g.id,
                                      ),
                                    );
                                  } else {
                                    setSelectedInvoiceGroupIds([]);
                                  }
                                }}
                              />
                            </th>
                            <th>Factura</th>
                            <th>Proveedor</th>
                            <th>Código Interno</th>
                            <th>Fecha</th>
                            <th>Productos</th>
                            <th>Total</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPurchaseInvoiceHistoryGroups.map((group) => (
                            <tr key={group.id}>
                              <td style={{ textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedInvoiceGroupIds.includes(
                                    group.id,
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedInvoiceGroupIds((prev) => [
                                        ...prev,
                                        group.id,
                                      ]);
                                    } else {
                                      setSelectedInvoiceGroupIds((prev) =>
                                        prev.filter((id) => id !== group.id),
                                      );
                                    }
                                  }}
                                />
                              </td>
                              <td>
                                <strong>
                                  {group.invoice_number || "No registrada"}
                                </strong>
                              </td>
                              <td>{group.provider_name || "Sin proveedor"}</td>
                              <td>{group.purchase_code || "-"}</td>
                              <td>
                                {formatPurchaseInvoiceHistoryDate(group.purchase_date, group.created_at)}
                              </td>
                              <td>
                                {group.lines.length} prod{group.lines.length === 1 ? "" : "s"}
                              </td>
                              <td>
                                <strong>{formatMoney(group.total)}</strong>
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  className="btn btn-secondary !py-1 !px-2 !text-xs"
                                  onClick={() => setSelectedPurchaseHistoryInvoice(group)}
                                  type="button"
                                >
                                  Ver detalles
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="purchase-history-empty">
                    {loadingPurchaseHistory ? (
                      <Loader2 className="animate-spin brand-icon" size={24} />
                    ) : (
                      <ReceiptText className="brand-icon" size={24} aria-hidden="true" />
                    )}
                    <p>
                      {loadingPurchaseHistory
                        ? "Cargando facturas de compra..."
                        : "No hay facturas que coincidan con la busqueda."}
                    </p>
                  </div>
                )}
              </div>
            </details>
                ) : null}

                {sectionId === "movements" ? (
            <details
              className={`surface history-disclosure cursor-grab active:cursor-grabbing ${draggingHistoryItem === "movements" ? "opacity-40" : ""} ${dragOverHistoryItem === "movements" && draggingHistoryItem !== "movements" ? "outline-dashed outline-2 outline-offset-2 outline-[var(--primary)]" : ""}`}
              draggable
              onDragStart={(e) => handleHistoryDragStart(e, "movements")}
              onDragOver={(e) => handleHistoryDragOver(e, "movements")}
              onDrop={(e) => handleHistoryDrop(e, "movements")}
              onDragEnd={handleHistoryDragEnd}
              open={historyMovementsOpen}
              onToggle={(e: React.SyntheticEvent<HTMLDetailsElement, Event>) =>
                setHistoryMovementsOpen(e.currentTarget.open)
              }
            >
              <summary className="history-disclosure-summary">
                <div className="history-disclosure-title">
                  <span className="history-disclosure-icon">
                    <History size={20} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Movimientos de inventario</h3>
                    <p>Historial actual de compras y ventas.</p>
                  </div>
                </div>
                <div className="history-disclosure-meta">
                  <strong>{inventoryHistoryTotals.records}</strong>
                  <span>movimientos</span>
                  <ChevronDown size={18} aria-hidden="true" />
                </div>
              </summary>

              <div className="history-disclosure-content history-movements-content">
              {false && (
            <section className={`grid gap-4 md:grid-cols-${historyMovementFilter === "all" ? 3 : 2}`}>
              <Metric
                title="Movimientos"
                value={String(inventoryHistoryTotals.records)}
              />
              {historyMovementFilter !== "venta" ? (
                <>
                  <Metric
                    title="Valor de compras (Sin IVA)"
                    value={formatMoney(inventoryHistoryTotals.entryValue)}
                  />
                  <Metric
                    title="IVA Pagado en compras"
                    value={formatMoney(inventoryHistoryTotals.entryValueWithIva - inventoryHistoryTotals.entryValue)}
                  />
                  <Metric
                    title="Total compras (Con IVA)"
                    value={formatMoney(inventoryHistoryTotals.entryValueWithIva)}
                  />
                </>
              ) : null}
              {historyMovementFilter !== "compra" ? (
                <>
                  <Metric
                    title="Costo de ventas"
                    value={formatMoney(inventoryHistoryTotals.exitValue)}
                  />
                  <Metric
                    title="Ingresos por ventas (Sin IVA)"
                    value={formatMoney(inventoryHistoryTotals.exitRevenue)}
                  />
                  <Metric
                    title="Ganancia bruta"
                    value={formatMoney(inventoryHistoryTotals.exitRevenue - inventoryHistoryTotals.exitValue)}
                  />
                </>
              ) : null}
            </section>
              )}

            <section className="surface section-card grid gap-5 p-5">
              <div className="grid gap-4 xl:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(180px,240px)_auto] xl:items-end">
                <AdminSearchCombobox
                  label="Producto"
                  onChange={setHistoryProductSearch}
                  onSelect={(option) => setHistoryProductSearch(option.label)}
                  optionLimit={products.length}
                  options={historyProductComboboxOptions}
                  placeholder="Nombre o codigo interno..."
                  value={historyProductSearch}
                />
                {historyMovementFilter !== "venta" ? (
                  <AdminSearchCombobox
                    label="Proveedor"
                    onChange={setHistoryProviderSearch}
                    onSelect={(option) => setHistoryProviderSearch(option.label)}
                    optionLimit={providerSummaries.length}
                    options={historyProviderComboboxOptions}
                    placeholder="Nombre del proveedor..."
                    value={historyProviderSearch}
                  />
                ) : null}
                <label className="field">
                  <span className="label">Movimiento</span>
                  <select
                    className="input"
                    onChange={(event) =>
                      handleHistoryMovementFilterChange(event.target.value)
                    }
                    value={historyMovementFilter}
                  >
                    <option value="all">Todos</option>
                    <option value="compra">Compras</option>
                    <option value="venta">Ventas</option>
                  </select>
                </label>
                <label className="field">
                  <span className="label">Periodo</span>
                  <select
                    className="input w-full"
                    onChange={(event) =>
                      setHistoryPeriodFilter(event.target.value as InventoryHistoryPeriodFilter)
                    }
                    value={historyPeriodFilter}
                  >
                    <option value="all">Todos</option>
                    <option value="day">Día</option>
                    <option value="month">Mes</option>
                    <option value="range">Desde</option>
                  </select>
                </label>
                {historyPeriodFilter !== "all" ? (
                  <>
                    <label className="field">
                      <span className="label">
                        {historyPeriodFilter === "range" ? "Desde" : "Fecha"}
                      </span>
                      <input
                        className="input"
                        type={historyPeriodFilter === "month" ? "month" : "date"}
                        value={historyDateFilter}
                        onChange={(e) => setHistoryDateFilter(e.target.value)}
                      />
                    </label>
                    {historyPeriodFilter === "range" && (
                      <label className="field">
                        <span className="label">Hasta</span>
                        <input
                          className="input"
                          type="date"
                          value={historyEndDateFilter}
                          onChange={(e) => setHistoryEndDateFilter(e.target.value)}
                        />
                      </label>
                    )}
                  </>
                ) : null}
              </div>

              <div className="flex flex-wrap items-end justify-between gap-4 mt-6 pt-6 border-t border-stone-200">
                <div className="inventory-history-summary !mt-0 !grid-cols-1">
                    <div className="!m-0">
                      <span>Stock actual</span>
                      <strong>
                        {selectedHistoryProduct
                          ? selectedHistoryProductProviderStock !== null
                            ? formatProductStockWithPresentationBreakdown(
                                selectedHistoryProduct,
                                selectedHistoryProductProviderStock,
                              )
                            : formatProductStockWithPresentationBreakdown(
                                selectedHistoryProduct,
                              )
                          : "-"}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      className="btn btn-secondary"
                      disabled={
                        !historyProductSearch &&
                        !historyProviderSearch &&
                        historyMovementFilter === "all"
                      }
                      onClick={() => {
                        setHistoryProductSearch("");
                        setHistoryProviderSearch("");
                        setHistoryMovementFilter("all");
                        setHistoryPeriodFilter("all");
                        setHistoryDateFilter("");
                        setHistoryEndDateFilter("");
                      }}
                      type="button"
                    >
                      <X size={17} aria-hidden="true" />
                      Limpiar
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={inventoryHistoryRows.length === 0}
                      onClick={() => downloadInventoryReportPdf(
                        inventoryHistoryRows,
                        inventoryHistoryTotals,
                        historyMovementFilter,
                        historyPeriodFilter,
                        historyDateFilter,
                        historyEndDateFilter
                      )}
                      type="button"
                    >
                      Descargar PDF
                    </button>
                  </div>
                </div>
            </section>

            <section className="surface catalog-card inventory-history-card overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-200 bg-white/75 p-5">
                <div>
                  <h3 className="text-xl font-black">Movimientos de inventario</h3>
                  <p className="text-sm leading-6 text-stone-600">
                    Compras y ventas registradas por producto y proveedor.
                  </p>
                </div>
                <button
                  className="btn btn-secondary"
                  disabled={loadingPurchaseHistory || loadingInvoices}
                  onClick={() =>
                    void Promise.all([
                      loadRemotePurchaseHistory(),
                      loadRemoteInvoices(),
                    ])
                  }
                  type="button"
                >
                  {loadingPurchaseHistory || loadingInvoices ? (
                    <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                  ) : (
                    <RotateCcw size={17} aria-hidden="true" />
                  )}
                  Actualizar
                </button>
              </div>

              {inventoryHistoryRows.length ? (
                <div className="inventory-history-table-wrap">
                  <table className="inventory-history-table">
                    <thead>
                      <tr>
                        <th rowSpan={2}>#</th>
                        <th rowSpan={2}>Codigo interno</th>
                        <InventoryHistorySortableHeader
                          activeSort={inventoryHistorySort}
                          label="Producto"
                          onSort={handleInventoryHistorySort}
                          sortKey="product_name"
                        />
                        {historyMovementFilter !== "venta" ? (
                          <th rowSpan={2}>Proveedor</th>
                        ) : null}
                        {showInventoryHistoryRegisteredAt ? (
                          <InventoryHistorySortableHeader
                            activeSort={inventoryHistorySort}
                            label="Fecha registro"
                            onSort={handleInventoryHistorySort}
                            sortKey="registered_at"
                          />
                        ) : null}
                        {showInventoryHistorySoldAt ? (
                          <InventoryHistorySortableHeader
                            activeSort={inventoryHistorySort}
                            label="Fecha venta"
                            onSort={handleInventoryHistorySort}
                            sortKey="sold_at"
                          />
                        ) : null}
                        <th rowSpan={2}>Detalle</th>
                        {showInventoryHistoryEntries ? (
                          <th colSpan={9}>Entradas</th>
                        ) : null}
                        {showInventoryHistoryExits ? (
                          <th colSpan={6}>Salidas</th>
                        ) : null}
                      </tr>
                      <tr>
                        {showInventoryHistoryEntries ? (
                          <>
                            <th>Cantidad</th>
                            <th>Presentación</th>
                            <th>Vr. unitario</th>
                            <th>Vr. total</th>
                            <th>Vr. total (Con IVA)</th>
                            <th>Precio base (Sin IVA)</th>
                            <th>P.V.P Final (Con IVA)</th>
                            <th>P.V.P Unidad (Sin IVA)</th>
                            <th>P.V.P Unidad Final</th>
                          </>
                        ) : null}
                        {showInventoryHistoryExits ? (
                          <>
                            <th>Cantidad</th>
                            <th>Presentación</th>
                            <th>Vr. unitario</th>
                            <th>Vr. unitario (Con IVA)</th>
                            <th>Vr. total</th>
                            <th>Vr. total (Con IVA)</th>
                          </>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryHistoryRows.map((row, index) => (
                        <tr key={row.id}>
                          <td>{index + 1}</td>
                          <td className="font-black text-[var(--accent-strong)]">
                            {row.product_sku || "-"}
                          </td>
                          <td className="inventory-history-product-cell">
                            {row.product_name}
                          </td>
                          {historyMovementFilter !== "venta" ? (
                            <td>{row.concept === "venta" ? "-" : (row.provider_name || "-")}</td>
                          ) : null}
                          {showInventoryHistoryRegisteredAt ? (
                            <td>{formatNullableHistoryDate(row.registered_at)}</td>
                          ) : null}
                          {showInventoryHistorySoldAt ? (
                            <td>{formatNullableHistoryDate(row.sold_at)}</td>
                          ) : null}
                          <td>
                            <span
                              className={`inventory-history-concept inventory-history-concept-${row.concept}`}
                            >
                              {row.concept}
                            </span>
                          </td>
                          {showInventoryHistoryEntries ? (
                            <>
                              <td>
                                {row.entry_quantity === null ? "-" : formatProductQuantity(row.entry_quantity)}
                              </td>
                              <td className="uppercase">
                                {row.entry_quantity === null ? "-" : (row.entry_presentation_unit ? formatPurchaseInputUnit(row.entry_presentation_unit) : (normalizeProductMeasurementUnit(row.measurement_unit) === "lb" ? "lb" : "und"))}
                              </td>
                              <td>
                                {formatInventoryHistoryMoneyValue(
                                  row.entry_unit_value,
                                )}
                              </td>
                              <td>
                                {formatInventoryHistoryMoneyValue(row.entry_total)}
                              </td>
                              <td>
                                {row.entry_total_with_iva === null || row.entry_total_with_iva === undefined ? "-" : formatInventoryHistoryMoneyValue(row.entry_total_with_iva)}
                              </td>
                              <td>
                                {row.entry_base_price == null ? "-" : formatMoney(row.entry_base_price)}
                              </td>
                              <td>
                                {row.entry_retail_price == null ? "-" : formatMoney(row.entry_retail_price)}
                              </td>
                              <td>
                                {row.entry_unit_base_price == null ? "-" : formatMoney(row.entry_unit_base_price)}
                              </td>
                              <td>
                                {row.entry_unit_retail_price == null ? "-" : formatMoney(row.entry_unit_retail_price)}
                              </td>
                            </>
                          ) : null}
                          {showInventoryHistoryExits ? (
                            <>
                              <td>
                                {row.exit_quantity === null ? "-" : formatProductQuantity(row.exit_quantity)}
                              </td>
                              <td className="uppercase">
                                {row.exit_quantity === null ? "-" : (row.exit_presentation_unit ? formatPurchaseInputUnit(row.exit_presentation_unit) : (normalizeProductMeasurementUnit(row.measurement_unit) === "lb" ? "lb" : "und"))}
                              </td>
                              <td>
                                {formatInventoryHistoryMoneyValue(
                                  row.exit_unit_value,
                                )}
                              </td>
                              <td>
                                {row.exit_unit_value_with_iva == null ? "-" : formatInventoryHistoryMoneyValue(row.exit_unit_value_with_iva)}
                              </td>
                              <td>
                                {formatInventoryHistoryMoneyValue(row.exit_total)}
                              </td>
                              <td>
                                {row.exit_total_with_iva == null ? "-" : formatInventoryHistoryMoneyValue(row.exit_total_with_iva)}
                              </td>
                            </>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid justify-items-center gap-3 p-8 text-center text-sm leading-6 text-stone-600">
                  {loadingPurchaseHistory || loadingInvoices ? (
                    <Loader2 className="animate-spin brand-icon" size={24} />
                  ) : (
                    <History className="brand-icon" size={24} aria-hidden="true" />
                  )}
                  <p>
                    {loadingPurchaseHistory || loadingInvoices
                      ? "Cargando movimientos..."
                      : "No hay movimientos que coincidan con esos filtros."}
                  </p>
                </div>
              )}
            </section>
              </div>
            </details>
                ) : null}
              </Fragment>
            ))}
          </section>
        ) : null}

        {activeSection === "channels" ? (
          <section className="grid gap-5 xl:grid-cols-2">
            <article className="surface section-card grid gap-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">App Android</h3>
                  <p className="text-sm leading-6 text-stone-600">
                    Endpoints para catalogo, pedidos y quejas.
                  </p>
                </div>
                <MessageSquareText className="brand-icon" size={24} aria-hidden="true" />
              </div>
              <div className="endpoint-list">
                <code>GET /api/mobile/catalog</code>
                <code>POST /api/mobile/orders</code>
                <code>POST /api/mobile/complaints</code>
              </div>
            </article>

            <article className="surface catalog-card grid gap-4 p-5">
              <div>
                <h3 className="text-xl font-black">Chatbot inteligente</h3>
                <p className="text-sm leading-6 text-stone-600">
                  Interpreta pedidos simples y devuelve productos sugeridos.
                </p>
              </div>
              <div className="endpoint-list">
                <code>POST /api/chatbot</code>
              </div>
              <button
                className="btn btn-secondary w-fit"
                onClick={() => setActiveSection("catalog")}
                type="button"
              >
                Revisar catalogo
              </button>
            </article>
          </section>
        ) : null}

        {(activeSection === "billing" || (activeSection === "orders" && salesTab === "billing")) ? (
          <section className="grid gap-5">
            <section className="grid gap-4 md:grid-cols-3">
              <Metric
                title="Comprobantes emitidos"
                value={String(invoiceTotals.invoiceCount)}
              />
              <Metric
                title="Productos vendidos"
                value={String(invoiceTotals.itemCount)}
              />
              <Metric
                title="Total vendido"
                value={`$${invoiceTotals.billedTotal.toFixed(2)}`}
              />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(320px,460px)_1fr] items-start">
              <section className="surface catalog-card overflow-hidden flex flex-col sticky top-6 max-h-[calc(100vh-48px)]">
                <div className="grid gap-4 border-b border-stone-200 bg-white/70 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black">
                        Historial de ventas
                      </h3>
                      <p className="text-sm text-stone-600">
                        Ventas entregadas y anuladas para consulta o descarga.
                      </p>
                    </div>
                    {selectedSalesInvoiceIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleBulkDeleteSalesInvoices()}
                        disabled={deletingSalesInvoices}
                        className="btn bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-3 py-1.5 text-sm whitespace-nowrap ml-2"
                      >
                        {deletingSalesInvoices ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        Eliminar seleccionados ({selectedSalesInvoiceIds.length})
                      </button>
                    )}
                    <button
                      className="btn btn-secondary aspect-square px-0"
                      disabled={loadingInvoices}
                      onClick={() => void loadRemoteInvoices()}
                      title="Actualizar comprobantes"
                      type="button"
                    >
                      {loadingInvoices ? (
                        <Loader2
                          className="animate-spin"
                          size={17}
                          aria-hidden="true"
                        />
                      ) : (
                        <ReceiptText size={17} aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 pb-2 border-b border-stone-100">
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                      <label className="field">
                        <span className="label">Pago</span>
                        <select
                          className="input w-full"
                          onChange={(event) =>
                            setBillingFilter(event.target.value as InvoicePaymentFilter)
                          }
                          value={billingFilter}
                        >
                          <option value="all">Todos</option>
                          <option value="efectivo">Efectivo</option>
                          <option value="transferencia">Transferencia</option>
                        </select>
                      </label>
                      <label className="field">
                        <span className="label">Entrega</span>
                        <select
                          className="input w-full"
                          onChange={(event) =>
                            setInvoiceDeliveryFilter(event.target.value as InvoiceDeliveryFilter)
                          }
                          value={invoiceDeliveryFilter}
                        >
                          <option value="all">Todos</option>
                          <option value="pickup">Retiro en el local</option>
                          <option value="delivery">Entrega a domicilio</option>
                          <option value="cancelled">Anulada</option>
                        </select>
                      </label>
                      <button
                        className="btn btn-secondary h-[44px] px-3 py-1.5 text-xs"
                        onClick={handleClearSalesFilters}
                        type="button"
                      >
                        <X size={14} aria-hidden="true" />
                        Limpiar
                      </button>
                    </div>

                    <div className="flex flex-col gap-3">
                      <label>
                        <span className="admin-search-input">
                          <Search size={17} aria-hidden="true" />
                          <input
                            className="input"
                            onChange={(event) => setInvoiceSearch(event.target.value)}
                            placeholder="Cliente, telefono, canal o producto..."
                            value={invoiceSearch}
                          />
                        </span>
                      </label>
                      <label className="field">
                        <span className="label">Periodo</span>
                        <select
                          className="input w-full"
                          onChange={(event) => setInvoicePeriodFilter(event.target.value as InvoicePeriodFilter)}
                          value={invoicePeriodFilter}
                        >
                          <option value="all">Todos</option>
                          <option value="day">Día</option>
                          <option value="month">Mes</option>
                          <option value="range">Desde / Hasta</option>
                        </select>
                      </label>
                      {invoicePeriodFilter !== "all" ? (
                        <div className="flex gap-2">
                          <label className="field flex-1">
                            <span className="label">
                              {invoicePeriodFilter === "range" ? "Desde" : "Fecha"}
                            </span>
                            <input
                              className="input"
                              type={invoicePeriodFilter === "month" ? "month" : "date"}
                              value={invoiceDateFilter}
                              onChange={(e) => setInvoiceDateFilter(e.target.value)}
                            />
                          </label>
                          {invoicePeriodFilter === "range" && (
                            <label className="field flex-1">
                              <span className="label">Hasta</span>
                              <input
                                className="input"
                                type="date"
                                value={invoiceEndDateFilter}
                                onChange={(e) => setInvoiceEndDateFilter(e.target.value)}
                              />
                            </label>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto grid divide-y divide-stone-200">
                  {filteredInvoices.map((invoice) => {
                    const itemCount = invoice.items.reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    );
                    const selected = selectedInvoice?.id === invoice.id;

                    return (
                      <div
                        key={invoice.id}
                        className={`provider-row flex items-stretch border-b border-stone-200 p-0 ${
                          selected ? "provider-row-active" : ""
                        }`}
                      >
                        <div className="flex items-center pl-4 pr-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedSalesInvoiceIds.includes(invoice.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSalesInvoiceIds(prev => [...prev, invoice.id]);
                              } else {
                                setSelectedSalesInvoiceIds(prev => prev.filter(id => id !== invoice.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-stone-300 text-[var(--accent)] focus:ring-[var(--accent)]"
                          />
                        </div>
                        <button
                          aria-pressed={selected}
                          className="flex-1 grid grid-cols-[1fr_auto] items-center gap-4 p-5 pl-3 text-left"
                          onClick={() => setSelectedInvoiceId(invoice.id)}
                          type="button"
                        >
                          <span className="grid min-w-0 gap-2">
                            <span className="flex flex-wrap items-center gap-2">
                              <strong className="font-black text-stone-950">
                                {invoice.invoice_number}
                              </strong>
                            <span className="badge">
                              {getInvoiceStatusLabel(invoice.status)}
                            </span>
                            {(() => {
                               const match = invoice.notes?.match(/Cliente confirmo que recibio el pedido: (Si|No)/i);
                               if (match) {
                                 const isYes = match[1].toLowerCase() === 'si';
                                 const isResolved = invoice.notes?.includes('Si (Resuelto)') || false;
                                 return (
                                   <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${isYes || isResolved ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                     {isResolved ? '✓ Problema Resuelto' : (isYes ? '✓ Entrega confirmada' : '❌ No recibida')}
                                   </span>
                                 );
                               }
                               return null;
                            })()}
                          </span>
                          <span className="truncate text-sm font-bold text-stone-700">
                            {invoice.customer_name}
                          </span>
                          <span className="text-xs font-bold text-stone-500">
                            {itemCount} producto{itemCount === 1 ? "" : "s"} -{" "}
                            {formatDateTime(invoice.created_at)}
                          </span>
                          </span>
                          <strong className="text-right text-lg font-black text-stone-950">
                            ${invoice.total.toFixed(2)}
                          </strong>
                        </button>
                      </div>
                    );
                  })}

                  {loadingInvoices ? (
                    <div className="flex items-center gap-3 p-5 text-sm font-bold text-stone-600">
                      <Loader2 className="animate-spin brand-icon" size={18} />
                      Cargando comprobantes...
                    </div>
                  ) : null}

                  {!loadingInvoices && !filteredInvoices.length ? (
                    <div className="p-10 text-center text-sm leading-6 text-stone-600">
                      No hay comprobantes que coincidan con la busqueda.
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="surface section-card overflow-hidden">
                {selectedInvoice ? (
                  <div className="grid gap-5 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="grid gap-2">
                        <span className="badge badge-yellow w-fit">
                          <ReceiptText size={15} aria-hidden="true" />
                          {selectedInvoice.invoice_number}
                        </span>
                        <h3 className="text-2xl font-black">
                          {selectedInvoice.customer_name}
                        </h3>
                        <p className="text-sm leading-6 text-stone-600">
                          {formatDateTime(selectedInvoice.created_at)} por{" "}
                          {getInvoiceChannelLabel(selectedInvoice.channel)}
                        </p>
                      </div>
                      <div className="flex items-end gap-6 text-right">
                        <div className="grid gap-1">
                          <span className="text-xs font-black uppercase text-stone-500">
                            Pago
                          </span>
                          <span className="font-bold text-stone-700">
                            {getInvoicePaymentLabel(selectedInvoice)}
                          </span>
                        </div>
                        <div className="grid gap-1">
                          <span className="text-sm font-bold text-stone-500">
                            Total
                          </span>
                          <strong className="text-3xl font-black text-stone-950">
                            ${selectedInvoice.total.toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className="sales-void-panel">
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn btn-secondary"
                          disabled={
                            invoiceActionId === selectedInvoice.id ||
                            selectedInvoice.status === "cancelled"
                          }
                          onClick={() => void handleCancelInvoice(selectedInvoice)}
                          type="button"
                        >
                          {invoiceActionId === selectedInvoice.id ? (
                            <Loader2
                              className="animate-spin"
                              size={17}
                              aria-hidden="true"
                            />
                          ) : (
                            <RotateCcw size={17} aria-hidden="true" />
                          )}
                          Anular venta y reponer stock
                        </button>
                      </div>
                      <p>
                        {selectedInvoice.status === "cancelled"
                          ? "Venta anulada: el inventario ya fue repuesto. El registro se conserva para auditoria."
                          : "Usa esta opcion solo ante una devolucion, cobro incorrecto o entrega anulada. Cambia el estado a Anulada y devuelve al inventario las cantidades vendidas."}
                      </p>
                    </div>



                    <section className="sales-receipt-section">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h4 className="font-black text-stone-950">
                            Comprobante de venta
                          </h4>
                          <p className="text-sm leading-6 text-stone-600">
                            Vista previa del documento informativo para entregar al
                            cliente. No es factura tributaria.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="btn btn-primary"
                            disabled={generatingReceiptPdfId === selectedInvoice.id}
                            onClick={() => void handleDownloadSalesReceipt()}
                            type="button"
                          >
                            {generatingReceiptPdfId === selectedInvoice.id ? (
                              <Loader2
                                className="animate-spin"
                                size={17}
                                aria-hidden="true"
                              />
                            ) : (
                              <Download size={17} aria-hidden="true" />
                            )}
                            {generatingReceiptPdfId === selectedInvoice.id
                              ? "Generando PDF"
                              : "Descargar PDF"}
                          </button>
                        </div>
                      </div>
                      <SalesReceiptPreview invoice={selectedInvoice} onResolveAlert={handleResolveInvoiceAlert} />
                    </section>

                    {(() => {
                      const isTransfer = selectedInvoice.payment_method === "transferencia" || getInvoiceNoteValue(selectedInvoice, ["pago", "metodo"])?.toLowerCase() === "transferencia";
                      if (!isTransfer) return null;
                      const receiptUrl = selectedInvoice.transfer_receipt_url || getInvoiceNoteValue(selectedInvoice, ["comprobante"]);
                      return (
                        <details className="group w-full shrink-0 border-t border-stone-200 mt-5">
                          <summary className="font-bold text-stone-800 p-6 text-center cursor-pointer list-none flex justify-center items-center gap-2 hover:bg-stone-50 transition-colors">
                            Ver Comprobante Adjunto
                            <ChevronDown className="group-open:rotate-180 transition-transform" size={16} />
                          </summary>
                          <div className="p-6 pt-0 bg-white">
                            {receiptUrl ? (
                              <div className="w-full rounded-xl border-2 border-stone-100 overflow-hidden bg-stone-50 flex items-center justify-center p-2">
                                <img src={receiptUrl} alt="Comprobante" className="max-w-full object-contain max-h-[600px]" />
                              </div>
                            ) : (
                              <div className="w-full h-32 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 flex items-center justify-center text-stone-400">
                                Sin comprobante legible
                              </div>
                            )}
                          </div>
                        </details>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="grid min-h-96 place-items-center p-10 text-center">
                    <div className="grid max-w-md gap-3">
                      <ReceiptText className="mx-auto brand-icon" size={36} />
                      <h3 className="text-xl font-black">
                        Aun no hay comprobantes generados
                      </h3>
                      <p className="text-sm leading-6 text-stone-600">
                        Cuando Android, el chatbot o la web registren ventas,
                        los comprobantes apareceran aqui con sus productos y
                        datos del cliente.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </section>
          </section>
        ) : null}

        {activeSection === "providers" ? (
          <section className="provider-workspace grid gap-5">
            <section className="surface catalog-card provider-directory-card overflow-hidden">
              <div className="grid gap-4 border-b border-stone-200 bg-white/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black">Proveedores registrados</h3>
                    <p className="text-sm text-stone-600">
                      {filteredProviderSummaries.length} de{" "}
                      {providerSummaries.length} proveedor
                      {providerSummaries.length === 1 ? "" : "es"} visibles.
                    </p>
                  </div>
                  <span className="badge">
                    {selectedProviders.length} seleccionado
                    {selectedProviders.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid gap-3 rounded-lg border border-stone-200 bg-white/80 p-3">
                  <button
                    aria-expanded={providerFormOpen}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left font-black text-stone-950 transition hover:bg-rose-50"
                    onClick={handleToggleProviderForm}
                    type="button"
                  >
                    <span className="flex items-center gap-2">
                      <span className="brand-icon size-9">
                        {editingProviderId ? (
                          <Pencil size={18} aria-hidden="true" />
                        ) : (
                          <Truck size={18} aria-hidden="true" />
                        )}
                      </span>
                      {editingProviderId ? "Editar proveedor" : "Nuevo proveedor"}
                    </span>
                    <ChevronDown
                      className={`text-[var(--accent)] transition ${
                        providerFormOpen ? "rotate-180" : ""
                      }`}
                      size={18}
                      aria-hidden="true"
                    />
                  </button>

                  {providerFormOpen ? (
                    <form
                      className="grid gap-3 border-t border-stone-200 pt-3"
                      onSubmit={(event) => void handleSaveProvider(event)}
                    >
                      <label className="field">
                        <span className="label">Nombre</span>
                        <input
                          className="input"
                          onChange={(event) =>
                            handleProviderField("name", event.target.value)
                          }
                          placeholder="Ej: Distribuidora Lopez"
                          required
                          value={providerForm.name}
                        />
                      </label>
                      <label className="field">
                        <span className="label">RUC</span>
                        <input
                          className="input"
                          inputMode="numeric"
                          onChange={(event) =>
                            handleProviderField("ruc", event.target.value)
                          }
                          placeholder="Ej: 0999999999001"
                          required
                          value={providerForm.ruc}
                        />
                        {providerForm.ruc.trim().length >= 10 && !validateIdentity(providerForm.ruc) && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">
                            El RUC no es válido.
                          </span>
                        )}
                      </label>
                      <label className="field">
                        <span className="label">Correo electrónico <span className="text-muted-foreground font-normal ml-1">(Opcional)</span></span>
                        <input
                          className="input"
                          onBlur={() => setProviderEmailTouched(true)}
                          onChange={(event) => {
                            setProviderEmailTouched(false);
                            handleProviderField("email", event.target.value);
                          }}
                          placeholder="Ej: ventas@distribuidora.com"
                          value={providerForm.email}
                        />
                        {providerForm.email.trim().length > 0 && providerEmailTouched && !validateEmail(providerForm.email) && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">
                            Correo inválido (use @gmail, @hotmail, etc).
                          </span>
                        )}
                      </label>
                      <label className="field">
                        <span className="label">Direccion</span>
                        <input
                          className="input"
                          onChange={(event) =>
                            handleProviderField("address", event.target.value)
                          }
                          placeholder="Ej: Av. Principal y Calle 10"
                          required
                          value={providerForm.address}
                        />
                      </label>
                      <label className="field">
                        <span className="label">Telefono</span>
                        <input
                          className="input"
                          onChange={(event) =>
                            handleProviderField("phone", event.target.value)
                          }
                          placeholder="Ej: 0999999999"
                          required
                          value={providerForm.phone}
                        />
                        {providerForm.phone.trim().length > 0 && !validatePhone(providerForm.phone) && (
                          <span className="text-xs font-medium text-red-600 dark:text-red-400">
                            Teléfono inválido. Usa: 09.., 04.., +593.., o 1800..
                          </span>
                        )}
                        {validatePhone(providerForm.phone) && getEcuadorianProvinceFromPhone(providerForm.phone) && (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                            Fijo provincial: {getEcuadorianProvinceFromPhone(providerForm.phone)}
                          </span>
                        )}
                      </label>
                      <label className="field">
                        <span className="label">Distribuye</span>
                        <textarea
                          className="input min-h-20 resize-y"
                          onChange={(event) =>
                            handleProviderField("notes", event.target.value)
                          }
                          placeholder="Marcas o productos que distribuye..."
                          value={providerForm.notes}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn btn-primary flex-1"
                          disabled={creatingProvider}
                          type="submit"
                        >
                          {creatingProvider ? (
                            <Loader2
                              className="animate-spin"
                              size={17}
                              aria-hidden="true"
                            />
                          ) : editingProviderId ? (
                            <Save size={17} aria-hidden="true" />
                          ) : (
                            <Plus size={17} aria-hidden="true" />
                          )}
                          {editingProviderId ? "Guardar cambios" : "Crear proveedor"}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={handleCloseProviderForm}
                          type="button"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>

                <div className="grid gap-3">
                  <label>
                    <span className="admin-search-input">
                      <Search size={17} aria-hidden="true" />
                      <input
                        className="input"
                        onChange={(event) => setProviderSearch(event.target.value)}
                        placeholder="Buscar proveedor..."
                        value={providerSearch}
                      />
                    </span>
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-3 text-sm font-black text-stone-700">
                      <input
                        checked={allVisibleProvidersSelected}
                        disabled={
                          !visibleSelectableProviders.length ||
                          deletingProviderId === BULK_DELETE_PROVIDER_ID
                        }
                        onChange={handleToggleAllVisibleProviders}
                        type="checkbox"
                      />
                      Seleccionar visibles
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="view-toggle" aria-label="Vista de proveedores">
                        <button
                          aria-pressed={providerViewMode === "list"}
                          className={`view-toggle-button ${
                            providerViewMode === "list" ? "is-active" : ""
                          }`}
                          onClick={() => setProviderViewMode("list")}
                          title="Vista de lista"
                          type="button"
                        >
                          <LayoutList size={16} aria-hidden="true" />
                          Lista
                        </button>
                        <button
                          aria-pressed={providerViewMode === "grid"}
                          className={`view-toggle-button ${
                            providerViewMode === "grid" ? "is-active" : ""
                          }`}
                          onClick={() => setProviderViewMode("grid")}
                          title="Vista de cuadricula"
                          type="button"
                        >
                          <LayoutGrid size={16} aria-hidden="true" />
                          Cuadricula
                        </button>
                      </div>
                      {selectedProviders.length ? (
                        <button
                          className="btn btn-danger"
                          disabled={deletingProviderId === BULK_DELETE_PROVIDER_ID}
                          onClick={() => void handleDeleteSelectedProviders()}
                          type="button"
                        >
                          {deletingProviderId === BULK_DELETE_PROVIDER_ID ? (
                            <Loader2
                              className="animate-spin"
                              size={17}
                              aria-hidden="true"
                            />
                          ) : (
                            <Trash2 size={17} aria-hidden="true" />
                          )}
                          Eliminar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`provider-card-scroll ${
                  providerViewMode === "grid"
                    ? "provider-card-grid p-4"
                    : "grid divide-y divide-stone-200"
                }`}
              >
                {filteredProviderSummaries.map((provider) => {
                  const isSelected = selectedProvider?.name === provider.name;
                  const isChecked = Boolean(
                    provider.id && selectedProviderIdsSet.has(provider.id),
                  );
                  const isDeleting =
                    deletingProviderId === provider.id ||
                    deletingProviderId === BULK_DELETE_PROVIDER_ID;
                  const providerMeta = (
                    <>
                      <span>{provider.products.length} producto{provider.products.length === 1 ? "" : "s"}</span>
                      <span>{provider.activeCount} activo{provider.activeCount === 1 ? "" : "s"}</span>
                      {provider.lastPurchaseCost !== null ? (
                        <span>Ult. costo ${provider.lastPurchaseCost.toFixed(2)}</span>
                      ) : null}
                    </>
                  );

                  return providerViewMode === "grid" ? (
                    <article
                      className={`provider-grid-card ${
                        isSelected ? "provider-row-active" : ""
                      } ${isChecked ? "product-row-selected" : ""}`}
                      key={provider.name}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="category-select-control">
                          <input
                            aria-label={`Seleccionar ${provider.name}`}
                            checked={isChecked}
                            disabled={!provider.id || isDeleting}
                            onChange={() =>
                              provider.id
                                ? handleToggleProviderSelection(provider.id)
                                : undefined
                            }
                            type="checkbox"
                          />
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="brand-icon opacity-70">
                            <Truck size={24} aria-hidden="true" />
                          </span>
                          <button
                            className="btn btn-secondary aspect-square px-0"
                            disabled={!provider.id || isDeleting}
                            onClick={() => handleStartProviderEdit(provider)}
                            title="Editar proveedor"
                            type="button"
                          >
                            <Pencil size={16} aria-hidden="true" />
                          </button>
                          <button
                            className="btn btn-danger aspect-square px-0"
                            disabled={!provider.id || isDeleting}
                            onClick={() => void handleDeleteProvider(provider)}
                            title="Eliminar proveedor"
                            type="button"
                          >
                            {isDeleting ? (
                              <Loader2
                                className="animate-spin"
                                size={16}
                                aria-hidden="true"
                              />
                            ) : (
                              <Trash2 size={16} aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      </div>
                      <button
                        aria-pressed={isSelected}
                        className="provider-card-main"
                        onClick={() => setSelectedProviderName(provider.name)}
                        type="button"
                      >
                        <strong>{provider.name}</strong>
                        <span>{provider.ruc ? `RUC ${provider.ruc}` : "Sin RUC"}</span>
                        <span className="line-clamp-2">
                          {provider.address ?? "Sin direccion"}
                        </span>
                        <span className="line-clamp-2">
                          {provider.phone ? `Tel. ${provider.phone}` : "Sin telefono"}
                        </span>
                      </button>
                      <div className="flex flex-wrap gap-2 text-xs font-black text-stone-600">
                        {providerMeta}
                      </div>
                    </article>
                  ) : (
                    <article
                      className={`provider-row grid grid-cols-[auto_1fr_auto] items-center gap-3 p-4 ${
                        isSelected ? "provider-row-active" : ""
                      } ${isChecked ? "product-row-selected" : ""}`}
                      key={provider.name}
                    >
                      <label className="category-select-control">
                        <input
                          aria-label={`Seleccionar ${provider.name}`}
                          checked={isChecked}
                          disabled={!provider.id || isDeleting}
                          onChange={() =>
                            provider.id
                              ? handleToggleProviderSelection(provider.id)
                              : undefined
                          }
                          type="checkbox"
                        />
                      </label>
                      <button
                        aria-pressed={isSelected}
                        className="provider-list-main"
                        onClick={() => setSelectedProviderName(provider.name)}
                        type="button"
                      >
                        <strong>{provider.name}</strong>
                        <span>{provider.ruc ? `RUC ${provider.ruc}` : "Sin RUC"}</span>
                        <span>
                          {provider.phone ? `Tel. ${provider.phone}` : "Sin telefono"}
                        </span>
                        <span>{provider.address ?? "Sin direccion"}</span>
                        <span className="flex flex-wrap gap-2 text-xs font-black text-stone-600">
                          {providerMeta}
                          {provider.lowStockCount ? (
                            <span className="text-[#9a6300]">
                              {provider.lowStockCount} stock bajo
                            </span>
                          ) : null}
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="brand-icon opacity-60">
                          <Truck size={24} aria-hidden="true" />
                        </span>
                        <button
                          className="btn btn-secondary aspect-square px-0"
                          disabled={!provider.id || isDeleting}
                          onClick={() => handleStartProviderEdit(provider)}
                          title="Editar proveedor"
                          type="button"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          className="btn btn-danger aspect-square px-0"
                          disabled={!provider.id || isDeleting}
                          onClick={() => void handleDeleteProvider(provider)}
                          title="Eliminar proveedor"
                          type="button"
                        >
                          {isDeleting ? (
                            <Loader2
                              className="animate-spin"
                              size={16}
                              aria-hidden="true"
                            />
                          ) : (
                            <Trash2 size={16} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </article>
                  );
                })}

                {!providerSummaries.length ? (
                  <div className="p-8 text-center text-sm leading-6 text-stone-600">
                    Aun no tienes proveedores registrados.
                  </div>
                ) : !filteredProviderSummaries.length ? (
                  <div className="p-8 text-center text-sm leading-6 text-stone-600">
                    No hay proveedores que coincidan con esa busqueda.
                  </div>
                ) : null}
              </div>
            </section>

            {selectedProvider ? (
              <section className="surface catalog-card provider-detail-card overflow-hidden">
                <div className="grid gap-4 border-b border-stone-200 bg-white/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="grid gap-1">
                      <h3 className="text-xl font-black">
                        Productos de {selectedProvider.name}
                      </h3>
                      <p className="text-sm text-stone-600">
                        {selectedProvider.products.length} producto
                        {selectedProvider.products.length === 1 ? "" : "s"} en
                        inventario.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="btn btn-secondary"
                        disabled={!selectedProvider.id}
                        onClick={() => handleStartProviderEdit(selectedProvider)}
                        type="button"
                      >
                        <Pencil size={17} aria-hidden="true" />
                        Editar datos
                      </button>
                      {selectedProvider.lastPurchaseAt ? (
                        <span className="badge">
                          Ult. compra {formatDateTime(selectedProvider.lastPurchaseAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-lg border border-stone-200 bg-white/80 p-3">
                      <span className="text-xs font-black uppercase text-stone-500">
                        RUC
                      </span>
                      <p className="mt-1 font-black text-stone-950">
                        {selectedProvider.ruc ?? "No registrado"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-stone-200 bg-white/80 p-3">
                      <span className="text-xs font-black uppercase text-stone-500">
                        Direccion
                      </span>
                      <p className="mt-1 font-black text-stone-950">
                        {selectedProvider.address ?? "No registrada"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-stone-200 bg-white/80 p-3">
                      <span className="text-xs font-black uppercase text-stone-500">
                        Telefono
                      </span>
                      <p className="mt-1 font-black text-stone-950">
                        {selectedProvider.phone ?? "No registrado"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-stone-200 bg-white/80 p-3">
                      <span className="text-xs font-black uppercase text-stone-500">
                        Productos
                      </span>
                      <p className="mt-1 font-black text-stone-950">
                        {selectedProvider.products.length} registrados
                      </p>
                    </div>
                    <div className="rounded-lg border border-stone-200 bg-white/80 p-3">
                      <span className="text-xs font-black uppercase text-stone-500">
                        Activos
                      </span>
                      <p className="mt-1 font-black text-stone-950">
                        {selectedProvider.activeCount}
                      </p>
                    </div>
                    <div className="rounded-lg border border-stone-200 bg-white/80 p-3">
                      <span className="text-xs font-black uppercase text-stone-500">
                        Valor inventario
                      </span>
                      <p className="mt-1 font-black text-stone-950">
                        {formatMoney(selectedProvider.inventoryValue)}
                      </p>
                    </div>
                  </div>

                  {selectedProvider.lowStockCount || selectedProvider.notes ? (
                    <div className="grid gap-3 lg:grid-cols-[auto_1fr]">
                      {selectedProvider.lowStockCount ? (
                        <span className="badge status-low w-fit">
                          <AlertTriangle size={14} aria-hidden="true" />
                          {selectedProvider.lowStockCount} stock bajo
                        </span>
                      ) : null}
                      {selectedProvider.notes ? (
                        <div className="rounded-lg border border-stone-200 bg-white/75 p-3 text-sm leading-6 text-stone-600">
                          <span className="mb-1 block text-xs font-black uppercase text-stone-500">
                            Distribuye
                          </span>
                          {selectedProvider.notes}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {selectedProvider.products.length ? (
                  <div className="provider-detail-scroll grid divide-y divide-stone-200">
                    {selectedProvider.products.map((product) => {
                      const displayExpirationDate =
                        getProductDisplayExpirationDate(
                          product,
                          selectedProvider.name,
                        );

                      return (
                        <article
                          className="product-row grid gap-4 p-4 lg:grid-cols-[minmax(84px,120px)_1fr_auto] lg:items-center"
                          key={product.id}
                        >
                        <ProductVisual product={product} />
                        <div className="grid gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-black">{product.name}</h4>
                            <span className="badge">{product.sku}</span>
                            {!product.is_active ? (
                              <span className="badge status-off">Oculto</span>
                            ) : product.stock <= product.min_stock ? (
                              <span className="badge status-low">
                                <AlertTriangle size={14} aria-hidden="true" />
                                Stock bajo
                              </span>
                            ) : null}
                          </div>
                          <p className="max-w-2xl text-sm leading-6 text-stone-600">
                            {product.description ?? "Sin descripcion."}
                          </p>
                          <div className="flex flex-wrap gap-3 text-sm font-bold text-stone-700">
                            <span>{product.categories?.name ?? "Sin categoria"}</span>
                            <ProductPricingMeta product={product} />
                            <span>Stock {formatProductStockWithPresentationBreakdown(product)}</span>
                            <span>Min. {formatProductMinimumStock(product)}</span>
                            <span>
                              Proveedores {getProductProviderNames(product).length}
                            </span>
                            <span>{formatProductLotCount(product)}</span>
                            {displayExpirationDate ? (
                              <span>Caduca {formatDateValue(displayExpirationDate)}</span>
                            ) : null}
                          </div>
                          <p className="text-xs font-bold text-stone-500">
                            {formatProductProviders(product)}
                          </p>
                          <ProductLotDetails
                            product={product}
                            providerName={selectedProvider.name}
                          />
                        </div>
                        <div className="catalog-product-list-actions">
                          <button
                            className="btn btn-secondary aspect-square px-0"
                            hidden
                            onClick={() => void handleStockChange(product, -1)}
                            title={`Restar ${getStockAdjustmentStep(product)} ${getStockAdjustmentUnitLabel(product)}`}
                            type="button"
                          >
                            -
                          </button>
                          <button
                            className="btn btn-secondary aspect-square px-0"
                            hidden
                            onClick={() => void handleStockChange(product, 1)}
                            title={`Sumar ${getStockAdjustmentStep(product)} ${getStockAdjustmentUnitLabel(product)}`}
                            type="button"
                          >
                            +
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => handleEdit(product)}
                            type="button"
                          >
                            Editar
                          </button>
                        </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="provider-detail-scroll grid min-h-96 place-items-center p-10 text-center">
                    <div className="grid max-w-md gap-3">
                      <Truck className="mx-auto brand-icon opacity-70" size={34} />
                      <h3 className="text-xl font-black">
                        Proveedor sin productos
                      </h3>
                      <p className="text-sm leading-6 text-stone-600">
                        Este proveedor ya esta en el directorio.
                      </p>
                      <button
                        className="btn btn-primary mx-auto"
                        onClick={() => handleStartProduct("", selectedProvider.name)}
                        type="button"
                      >
                        <PackagePlus size={17} aria-hidden="true" />
                        Agregar producto
                      </button>
                    </div>
                  </div>
                )}
              </section>
            ) : (
              <section className="surface section-card provider-detail-card grid min-h-72 place-items-center p-8 text-center">
                <div className="grid max-w-md gap-3">
                  <Truck className="mx-auto brand-icon opacity-70" size={34} />
                  <h3 className="text-xl font-black">Sin proveedor seleccionado</h3>
                  <p className="text-sm leading-6 text-stone-600">
                    El detalle de productos aparecera aqui.
                  </p>
                </div>
              </section>
            )}
          </section>
        ) : null}
      </div>

      {purchaseProduct && !isProductCreationSection ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-stone-950/45 px-4 py-8 backdrop-blur-sm"
          onClick={handleCloseProductPurchase}
          role="dialog"
        >
          <form
            className="grid w-full max-w-2xl gap-5 rounded-xl border border-pink-200 bg-white p-5 shadow-[0_30px_90px_rgba(80,5,28,0.28)]"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSaveProductPurchase}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-2">
                <span className="badge badge-yellow w-fit">
                  <ShoppingCart size={15} aria-hidden="true" />
                  Compra de inventario
                </span>
                <div>
                  <h3 className="text-2xl font-black text-stone-950">
                    {purchaseProduct.name}
                  </h3>
                  <p className="text-sm leading-6 text-stone-600">
                    Agrega stock al producto existente sin duplicarlo.
                  </p>
                </div>
              </div>
              <button
                aria-label="Cerrar compra"
                className="btn btn-secondary aspect-square px-0"
                disabled={savingPurchase}
                onClick={handleCloseProductPurchase}
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminSearchCombobox
                className="sm:col-span-2"
                createLabel="Proveedor nuevo"
                disabled={savingPurchase}
                label="Proveedor"
                onChange={(value) => handlePurchaseField("provider", value)}
                onSelect={handleSelectPurchaseProvider}
                options={purchaseProviderComboboxOptions}
                placeholder="Ej. Harry Luna"
                value={purchaseForm.provider}
              />

              {!isBulkPurchaseProduct ? (
                <PurchasePresentationField
                  className="sm:col-span-2"
                  disabled={savingPurchase}
                  onNameChange={handlePurchasePresentationInput}
                  onSelect={handleSelectPurchasePresentation}
                  onUnitQuantityChange={handlePurchasePresentationUnitQuantityChange}
                  options={purchasePresentationComboboxOptions}
                  unitQuantity={purchaseForm.purchase_presentation_unit_quantity}
                  value={purchaseForm.purchase_presentation_name}
                />
              ) : null}

              <div className="field">
                <label className="label" htmlFor="purchase-quantity">
                  Cantidad comprada
                </label>
                {isBulkPurchaseProduct ? (
                  <div className="input-combo">
                    <input
                      className="input"
                      id="purchase-quantity"
                      min="0"
                      onChange={(event) =>
                        handlePurchaseField("quantity", event.target.value)
                      }
                      step={getBulkStockInputStep(purchaseQuantityInputUnit)}
                      type="number"
                      value={purchaseForm.quantity}
                    />
                    <select
                      aria-label="Unidad para cantidad comprada"
                      className="input-combo-select"
                      onChange={(event) =>
                        handlePurchaseQuantityInputUnitChange(event.target.value)
                      }
                      value={purchaseQuantityInputUnit}
                    >
                      {BULK_STOCK_INPUT_UNIT_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <input
                    className="input"
                    id="purchase-quantity"
                    min="1"
                    onChange={(event) =>
                      handlePurchaseField("quantity", event.target.value)
                    }
                    step="1"
                    type="number"
                    value={purchaseForm.quantity}
                  />
                )}
                {isBulkPurchaseProduct ? (
                  <span className="field-hint text-xs font-bold text-stone-500">
                    {purchaseQuantityPoundsInfo}
                  </span>
                ) : purchasePresentationStockInfo ? (
                  <span className="field-hint text-xs font-bold text-stone-500">
                    {purchasePresentationStockInfo}
                  </span>
                ) : null}
              </div>

              <label className="field">
                <span className="label">{purchaseCostInputLabel}</span>
                <input
                  className="input"
                  min="0"
                  onChange={(event) =>
                    handlePurchaseField("purchase_cost", event.target.value)
                  }
                  step="0.01"
                  type="number"
                  value={purchaseForm.purchase_cost}
                />
              </label>

              <label className="field">
                <span className="label">{purchaseSalePriceInputLabel}</span>
                <input
                  className="input"
                  min="0"
                  onChange={(event) =>
                    handlePurchaseField("price", event.target.value)
                  }
                  step="0.01"
                  type="number"
                  value={purchaseForm.price}
                />
              </label>

              <label className="field">
                <span className="label">Fecha de ingreso</span>
                <input
                  className="input"
                  onChange={(event) =>
                    handlePurchaseField("entry_date", event.target.value)
                  }
                  type="date"
                  value={purchaseForm.entry_date}
                />
              </label>

              {purchaseProductRequiresDates ? (
                <>
                  <label className="field">
                    <span className="label">Fecha de Fabricacion opcional</span>
                    <input
                      className="input"
                      onChange={(event) =>
                        handlePurchaseField(
                          "manufacture_date",
                          event.target.value,
                        )
                      }
                      type="date"
                      value={purchaseForm.manufacture_date}
                    />
                  </label>

                  <label className="field sm:col-span-2">
                    <span className="label">Fecha de vencimiento opcional</span>
                    <input
                      className="input"
                      onChange={(event) =>
                        handlePurchaseField(
                          "expiration_date",
                          event.target.value,
                        )
                      }
                      type="date"
                      value={purchaseForm.expiration_date}
                    />
                  </label>
                </>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="btn btn-secondary"
                disabled={savingPurchase}
                onClick={handleCloseProductPurchase}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                disabled={savingPurchase}
                type="submit"
              >
                {savingPurchase ? (
                  <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                ) : (
                  <Save size={18} aria-hidden="true" />
                )}
                Guardar compra
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {selectedPurchaseHistoryInvoice && (
        <div
          aria-modal="true"
          className="decision-overlay"
          role="dialog"
        >
          <div className="invoice-detail-dialog">
            <div className="invoice-detail-header">
              <div>
                <h3 className="text-2xl font-black text-stone-950">
                  {selectedPurchaseHistoryInvoice.invoice_number
                    ? `Factura ${selectedPurchaseHistoryInvoice.invoice_number}`
                    : "Compra sin No. factura"}
                </h3>
                <p className="text-stone-600 mt-1 font-bold">
                  Proveedor: {selectedPurchaseHistoryInvoice.provider_name || "Sin proveedor"}
                </p>
              </div>
              <button
                aria-label="Cerrar detalles"
                className="btn btn-secondary !p-2"
                onClick={() => setSelectedPurchaseHistoryInvoice(null)}
                type="button"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="purchase-history-metadata mb-6">
              <div>
                <span>Fecha compra</span>
                <strong>
                  {formatPurchaseInvoiceHistoryDate(selectedPurchaseHistoryInvoice.purchase_date, selectedPurchaseHistoryInvoice.created_at)}
                </strong>
              </div>
              <div>
                <span>Codigo interno</span>
                <strong>{selectedPurchaseHistoryInvoice.purchase_code || "-"}</strong>
              </div>
              <div>
                <span>Forma de pago</span>
                <strong>
                  {formatPurchaseInvoicePaymentMethod(
                    selectedPurchaseHistoryInvoice.payment_method,
                    selectedPurchaseHistoryInvoice.credit_days,
                  )}
                </strong>
              </div>
              {(() => {
                const hasIva = selectedPurchaseHistoryInvoice.lines.some(
                  (line) => Number(line.iva_rate) > 0,
                );
                return hasIva ? (
                  <>
                    <div>
                      <span>Subtotal</span>
                      <strong>{formatMoney(selectedPurchaseHistoryInvoice.subtotal)}</strong>
                    </div>
                    <div>
                      <span>IVA</span>
                      <strong>{formatMoney(selectedPurchaseHistoryInvoice.iva_amount)}</strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>{formatMoney(selectedPurchaseHistoryInvoice.total)}</strong>
                    </div>
                  </>
                ) : (
                  <div>
                    <span>Total</span>
                    <strong>{formatMoney(selectedPurchaseHistoryInvoice.total)}</strong>
                  </div>
                );
              })()}
            </div>

            {(() => {
              const hasIvaInInvoice = selectedPurchaseHistoryInvoice.lines.some(
                (line) => Number(line.iva_rate) > 0,
              );

              return (
                <div className="purchase-history-table-wrap">
                  <table className="purchase-history-master-table">
                    <thead>
                      <tr>
                        <th>Codigo</th>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Unidad compra</th>
                        <th>Ingresa a stock</th>
                        <th>Costo de compra</th>
                        {hasIvaInInvoice ? <th>IVA</th> : null}
                        <th>Total</th>
                        {hasIvaInInvoice ? (
                          <>
                            <th>Precio base (Sin IVA)</th>
                            <th>P.V.P Final (Con IVA)</th>
                            <th>P.V.P Unidad (Sin IVA)</th>
                            <th>P.V.P Unidad Final</th>
                          </>
                        ) : (
                          <>
                            <th>P.V.P Base</th>
                            <th>P.V.P Base (U. Mínima)</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPurchaseHistoryInvoice.lines.map((line) => (
                        <tr key={line.id}>
                          <td>{line.product_sku || "-"}</td>
                          <td>{line.product_name}</td>
                          <td>
                            {formatProductQuantity(
                              line.purchase_input_quantity ?? line.quantity ?? 0,
                            )}
                          </td>
                          <td className="uppercase">
                            {formatPurchaseInputUnit(
                              line.purchase_input_unit ?? line.quantity_unit ?? "unit",
                            )}
                          </td>
                          <td>
                            {formatLotQuantity(
                              line.quantity_in_stock_unit,
                              normalizeProductMeasurementUnit(
                                line.product_measurement_unit ??
                                  line.quantity_unit,
                              ),
                            )}
                          </td>
                          <td>
                            {formatMoney(
                              getPurchaseHistoryPurchaseUnitCost(line),
                            )}
                          </td>

                          {hasIvaInInvoice ? (
                            <td className="whitespace-nowrap">
                              {Number(line.iva_rate) > 0 ? (
                                <span className="text-xs text-stone-500 mr-1">
                                  {line.iva_rate}%
                                </span>
                              ) : null}
                              {formatMoney(
                                normalizeOptionalMoney(line.iva_amount) ?? 0,
                              )}
                            </td>
                          ) : null}
                          <td>
                            {formatMoney(getPurchaseHistoryLineTotal(line))}
                          </td>
                          {hasIvaInInvoice ? (
                            <>
                              <td>{formatMoney(line.base_price ?? 0)}</td>
                              <td>{formatMoney(line.retail_price ?? 0)}</td>
                              <td>{formatMoney(line.unit_base_price ?? 0)}</td>
                              <td>{formatMoney(line.unit_retail_price ?? 0)}</td>
                            </>
                          ) : (
                            <>
                              <td>{formatMoney(line.base_price ?? 0)}</td>
                              <td>{formatMoney(line.unit_base_price ?? 0)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            <div className="mt-6 flex justify-end">
              <button
                className="btn btn-primary"
                onClick={() => setSelectedPurchaseHistoryInvoice(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}


      {pendingPurchaseConfirmation && (
        <div
          aria-modal="true"
          className="decision-overlay"
          role="dialog"
        >
          <div className="decision-dialog">
            <div className="grid gap-2">
              <span className="badge badge-yellow w-fit">
                <CheckCircle2 size={15} aria-hidden="true" />
                Confirmación de compra
              </span>
              <h3 className="text-2xl font-black text-stone-950">
                ¿Registrar la compra?
              </h3>
              <p className="text-sm leading-6 text-stone-600">
                Estás a punto de confirmar la compra <strong>{pendingPurchaseConfirmation.purchaseCode}</strong> para el proveedor <strong>{pendingPurchaseConfirmation.providerName}</strong> con <strong>{pendingPurchaseConfirmation.productCount}</strong> producto(s).
              </p>
              <p className="text-sm leading-6 text-stone-600 mt-2">
                Si cancelas, volverás a la compra sin borrar nada.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 mt-6">
              <button
                className="btn btn-secondary"
                onClick={() => setPendingPurchaseConfirmation(null)}
                type="button"
                disabled={savingPurchase}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setPendingPurchaseConfirmation(null);
                  handleSavePurchaseInvoice(undefined, true);
                }}
                type="button"
                disabled={savingPurchase}
              >
                Confirmar compra
              </button>
            </div>
          </div>
        </div>
      )}

      {savedProductPrompt ? (
        <div
          aria-modal="true"
          className="decision-overlay"
          role="dialog"
        >
          <div className="decision-dialog">
            <div className="grid gap-2">
              <span className="badge badge-yellow w-fit">
                <CheckCircle2 size={15} aria-hidden="true" />
                Producto guardado
              </span>
              <h3 className="text-2xl font-black text-stone-950">
                Desea agregar mas productos?
              </h3>
              <p className="text-sm leading-6 text-stone-600">
                Se registro {savedProductPrompt.name}. Puedes continuar en la
                misma categoria o escoger otra antes de agregar el siguiente
                producto.
              </p>
            </div>

            <label className="field">
              <span className="label">Categoria para el siguiente producto</span>
              <select
                className="input"
                onChange={(event) =>
                  setNextProductCategoryId(event.target.value)
                }
                value={nextProductCategoryId}
              >
                <option value="">Sin categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={handleViewSavedProductInCatalog}
                type="button"
              >
                Ver en catalogo
              </button>
              <button
                className="btn btn-primary"
                onClick={handleContinueAddingProduct}
                type="button"
              >
                <PackagePlus size={18} aria-hidden="true" />
                Agregar otro
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Metric({
  title,
  value,
  warning = false,
}: {
  title: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <article className={`surface metric-card grid gap-2 p-5 ${warning ? "warning" : ""}`}>
      <p className="text-sm font-bold text-stone-500">{title}</p>
      <strong
        className={`text-3xl font-black ${
          warning ? "text-[#9a6300]" : "text-stone-950"
        }`}
      >
        {value}
      </strong>
    </article>
  );
}

function CustomersModule({
  clients,
  loading,
  onMessage,
  onRefresh,
}: {
  clients: MobileClientRecord[];
  loading: boolean;
  onMessage: (message: string) => void;
  onRefresh: () => Promise<void> | void;
}) {
  const [clientSearch, setClientSearch] = useState("");
  const [clientRoleTab, setClientRoleTab] = useState<"clientes" | "empleados" | "delivery" | "todos">("todos");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [creatingClient, setCreatingClient] = useState(false);
  const [editingClient, setEditingClient] = useState<MobileClientRecord | null>(
    null,
  );
  const [clientForm, setClientForm] = useState<MobileClientForm>(
    getEmptyMobileClientForm(),
  );
  const [clientFeedback, setClientFeedback] = useState("");
  const [clientActionId, setClientActionId] = useState("");
  const [bulkDeletingClients, setBulkDeletingClients] = useState(false);
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [touchedClientFields, setTouchedClientFields] = useState<Record<string, boolean>>({});
  const pendingClients = clients.filter(
    (client) => client.status === "pending_review",
  );
  const appClients = clients.filter((client) => client.source === "android");
  const filteredClients = useMemo(
    () => filterMobileClients(clients, clientSearch, clientRoleTab),
    [clientSearch, clients, clientRoleTab],
  );
  const selectedClientIdsSet = useMemo(
    () => new Set(selectedClientIds),
    [selectedClientIds],
  );
  const selectedClients = useMemo(
    () => clients.filter((client) => selectedClientIdsSet.has(client.id)),
    [clients, selectedClientIdsSet],
  );
  const filteredClientIds = useMemo(
    () => filteredClients.map((client) => client.id),
    [filteredClients],
  );
  const allFilteredClientsSelected =
    filteredClientIds.length > 0 &&
    filteredClientIds.every((clientId) => selectedClientIdsSet.has(clientId));
  const passwordRules = getMobileClientPasswordRules(clientForm.password);
  const passwordScore = passwordRules.filter((rule) => rule.complete).length;

  function handleToggleClientSelection(clientId: string) {
    setSelectedClientIds((current) =>
      current.includes(clientId)
        ? current.filter((entry) => entry !== clientId)
        : [...current, clientId],
    );
  }

  function handleToggleAllFilteredClients() {
    if (!filteredClientIds.length) {
      return;
    }

    const filteredClientIdsSet = new Set(filteredClientIds);
    setSelectedClientIds((current) => {
      const hiddenSelectedIds = current.filter(
        (clientId) => !filteredClientIdsSet.has(clientId),
      );

      return allFilteredClientsSelected
        ? hiddenSelectedIds
        : [...hiddenSelectedIds, ...filteredClientIds];
    });
  }

  function handleEditMobileClient(client: MobileClientRecord) {
    setEditingClient(client);
    setCreatingClient(false);
    setClientForm(getMobileClientForm(client));
    setClientFeedback("");
    setShowClientPassword(false);
    setTouchedClientFields({});
  }

  function handleCreateMobileClient() {
    setCreatingClient(true);
    setEditingClient(null);
    setClientForm(getEmptyMobileClientForm());
    setClientFeedback("");
    setShowClientPassword(false);
    setTouchedClientFields({});
  }

  function handleClientField<K extends keyof MobileClientForm>(
    field: K,
    value: MobileClientForm[K],
  ) {
    setClientForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleCloseClientEditor() {
    setEditingClient(null);
    setCreatingClient(false);
    setClientForm(getEmptyMobileClientForm());
    setClientFeedback("");
    setShowClientPassword(false);
  }

  async function handleSaveMobileClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingClient && !creatingClient) {
      return;
    }

    const validationError = getMobileClientFormError(clientForm);
    if (validationError) {
      setClientFeedback(validationError);
      return;
    }

    setClientActionId(creatingClient ? "new" : editingClient!.id);
    setClientFeedback("");

    try {
      const payload: Record<string, string> = {
        full_name: clientForm.full_name.trim(),
        identity_number: clientForm.identity_number.trim(),
        email: clientForm.email.trim().toLowerCase(),
        phone: clientForm.phone.trim(),
        address: clientForm.address.trim(),
        status: clientForm.status,
        role: clientForm.role,
      };
      const newPassword = clientForm.password.trim();

      if (newPassword) {
        payload.password = newPassword;
      }

      const response = await fetch(
        creatingClient
          ? "/api/admin/mobile-clients"
          : `/api/admin/mobile-clients/${editingClient!.id}`,
        {
          method: creatingClient ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await response.json()) as {
        ok: boolean;
        client?: MobileClientRecord;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? `No se pudo ${creatingClient ? "crear" : "actualizar"} el cliente.`);
      }

      await Promise.resolve(onRefresh());
      handleCloseClientEditor();
      onMessage(`Cliente ${creatingClient ? "creado" : "actualizado"} correctamente.`);
    } catch (error) {
      setClientFeedback(
        error instanceof Error ? error.message : "No se pudo actualizar el cliente.",
      );
    } finally {
      setClientActionId("");
    }
  }

  async function handleDeleteMobileClient(client: MobileClientRecord) {
    if (
      !window.confirm(
        `Eliminar "${client.full_name}" borrara su acceso de la app.\n\nDeseas continuar?`,
      )
    ) {
      return;
    }

    setClientActionId(client.id);
    setClientFeedback("");

    try {
      const response = await fetch(`/api/admin/mobile-clients/${client.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        ok: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo eliminar el cliente.");
      }

      setSelectedClientIds((current) =>
        current.filter((clientId) => clientId !== client.id),
      );
      if (editingClient?.id === client.id) {
        handleCloseClientEditor();
      }
      await Promise.resolve(onRefresh());
      onMessage(`Cliente "${client.full_name}" eliminado correctamente.`);
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "No se pudo eliminar el cliente.",
      );
    } finally {
      setClientActionId("");
    }
  }

  async function handleDeleteSelectedMobileClients() {
    if (!selectedClients.length) {
      return;
    }

    if (
      !window.confirm(
        `Eliminar ${selectedClients.length} cliente(s) seleccionado(s) borrara su acceso de la app.\n\nDeseas continuar?`,
      )
    ) {
      return;
    }

    setBulkDeletingClients(true);
    setClientFeedback("");

    try {
      const response = await fetch("/api/admin/mobile-clients", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedClients.map((client) => client.id) }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        deletedCount?: number;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudieron eliminar los clientes.");
      }

      const deletedIds = new Set(selectedClients.map((client) => client.id));
      setSelectedClientIds([]);
      if (editingClient && deletedIds.has(editingClient.id)) {
        handleCloseClientEditor();
      }
      await Promise.resolve(onRefresh());
      onMessage(
        `${data.deletedCount ?? selectedClients.length} cliente(s) eliminado(s) correctamente.`,
      );
    } catch (error) {
      onMessage(
        error instanceof Error ? error.message : "No se pudieron eliminar los clientes.",
      );
    } finally {
      setBulkDeletingClients(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric title="Usuarios registrados" value={String(clients.length)} />
        <Metric title="Cuentas de app" value={String(appClients.length)} />
        <Metric title="Seleccionados" value={String(selectedClients.length)} />
        <Metric title="Pendientes de revisar" value={String(pendingClients.length)} warning />
      </div>

      <section className="surface section-card grid gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-2">
            <span className="badge badge-yellow w-fit">
              <Users size={15} aria-hidden="true" />
              Registro movil activo
            </span>
            <div className="grid gap-1">
              <h3 className="text-2xl font-black">Usuarios registrados</h3>
              <p className="max-w-3xl text-sm leading-6 text-stone-600">
                Administra los usuarios creados en el sistema, actualiza
                sus datos de acceso y elimina cuentas cuando sea necesario.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedClients.length ? (
              <button
                className="btn btn-danger"
                disabled={bulkDeletingClients}
                onClick={() => void handleDeleteSelectedMobileClients()}
                type="button"
              >
                {bulkDeletingClients ? (
                  <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                ) : (
                  <Trash2 size={17} aria-hidden="true" />
                )}
                Eliminar seleccionados
              </button>
            ) : null}
            <button
              className="btn btn-secondary"
              disabled={loading}
              onClick={() => void onRefresh()}
              type="button"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={17} aria-hidden="true" />
              ) : (
                <RotateCcw size={17} aria-hidden="true" />
              )}
              Actualizar
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateMobileClient}
              type="button"
            >
              <Plus size={17} aria-hidden="true" />
              Agregar usuario
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-stone-200">
            {(["todos", "clientes", "empleados", "delivery"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setClientRoleTab(tab)}
                className={`border-b-2 px-4 py-2 text-sm font-bold uppercase transition-colors ${
                  clientRoleTab === tab
                    ? "border-rose-500 text-rose-700"
                    : "border-transparent text-stone-500 hover:text-stone-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-full sm:max-w-md">
              <span className="admin-search-input">
                <Search size={17} aria-hidden="true" />
                <input
                  className="input"
                  onChange={(event) => setClientSearch(event.target.value)}
                  placeholder="Buscar por cedula o nombre..."
                  type="search"
                  value={clientSearch}
                />
              </span>
            </div>
          {selectedClients.length ? (
            <span className="badge badge-yellow">
              {selectedClients.length} seleccionado
              {selectedClients.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <div className="min-w-[980px]">
            <div
              className={`grid gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3 text-xs font-black uppercase text-stone-500 ${
                clientRoleTab === "todos"
                  ? "grid-cols-[44px_1.2fr_0.9fr_1.1fr_0.8fr_0.8fr_0.7fr_auto]"
                  : "grid-cols-[44px_1.2fr_0.9fr_1.1fr_0.8fr_0.7fr_auto]"
              }`}
            >
              <label className="grid place-items-center">
                <input
                  aria-label="Seleccionar usuarios visibles"
                  checked={allFilteredClientsSelected}
                  onChange={handleToggleAllFilteredClients}
                  type="checkbox"
                />
              </label>
              <span>Usuario</span>
              <span>Cedula / usuario</span>
              <span>Correo</span>
              <span>Telefono</span>
              {clientRoleTab === "todos" && <span>Rol</span>}
              <span>Estado</span>
              <span>Acciones</span>
            </div>
            {loading ? (
              <div className="grid min-h-48 place-items-center p-8 text-center">
                <div className="grid justify-items-center gap-3">
                  <Loader2 className="brand-icon animate-spin" size={30} aria-hidden="true" />
                  <p className="text-sm font-bold text-stone-600">
                    Cargando usuarios registrados...
                  </p>
                </div>
              </div>
            ) : filteredClients.length ? (
              <div className="divide-y divide-stone-100">
                {filteredClients.map((client) => {
                  const selected = selectedClientIdsSet.has(client.id);
                  const busy = clientActionId === client.id;

                  return (
                    <div
                      className={`grid items-center gap-3 px-4 py-4 text-sm ${
                        clientRoleTab === "todos"
                          ? "grid-cols-[44px_1.2fr_0.9fr_1.1fr_0.8fr_0.8fr_0.7fr_auto]"
                          : "grid-cols-[44px_1.2fr_0.9fr_1.1fr_0.8fr_0.7fr_auto]"
                      } ${selected ? "bg-rose-50/50" : ""}`}
                      key={client.id}
                    >
                      <label className="grid place-items-center">
                        <input
                          aria-label={`Seleccionar ${client.full_name}`}
                          checked={selected}
                          onChange={() => handleToggleClientSelection(client.id)}
                          type="checkbox"
                        />
                      </label>
                      <span className="grid gap-1">
                        <strong>{client.full_name}</strong>
                        <span className="text-xs font-semibold text-stone-500">
                          {formatDateTime(client.created_at)}
                        </span>
                        {client.address ? (
                          <span className="truncate text-xs text-stone-500">
                            {client.address}
                          </span>
                        ) : null}
                      </span>
                      <strong>{client.identity_number || "Sin cedula"}</strong>
                      <span className="break-all">{client.email ?? "Sin correo"}</span>
                      <span>{client.phone ?? "Sin telefono"}</span>
                      {clientRoleTab === "todos" && (
                        <span className="capitalize">{client.role || "cliente"}</span>
                      )}
                      <span className="badge w-fit">
                        {getMobileClientStatusLabel(client.status)}
                      </span>
                      <span className="flex items-center gap-2">
                        <button
                          className="btn btn-secondary px-3"
                          disabled={busy}
                          onClick={() => handleEditMobileClient(client)}
                          title="Editar cliente"
                          type="button"
                        >
                          <Pencil size={16} aria-hidden="true" />
                          Editar
                        </button>
                        <button
                          className="btn btn-danger aspect-square px-0"
                          disabled={busy}
                          onClick={() => void handleDeleteMobileClient(client)}
                          title="Eliminar cliente"
                          type="button"
                        >
                          {busy ? (
                            <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                          ) : (
                            <Trash2 size={16} aria-hidden="true" />
                          )}
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-h-48 place-items-center p-8 text-center">
                <div className="grid max-w-md justify-items-center gap-3">
                  <span className="brand-icon grid size-14 place-items-center rounded-2xl bg-red-50">
                    <Users size={28} aria-hidden="true" />
                  </span>
                  <div className="grid gap-1">
                    <h4 className="text-xl font-black">
                      {clients.length ? "Sin coincidencias" : "Sin usuarios registrados"}
                    </h4>
                    <p className="text-sm leading-6 text-stone-600">
                      {clients.length
                        ? "Prueba con otro nombre o numero de cedula."
                        : "Los usuarios se agregaran automaticamente cuando se creen cuentas desde la app Android."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="surface section-card grid gap-3 p-5">
          <Mail className="brand-icon" size={22} aria-hidden="true" />
          <div className="grid gap-1">
            <h3 className="font-black">Datos editables</h3>
            <p className="text-sm leading-6 text-stone-600">
              Nombre, cedula, correo, telefono, direccion y estado.
            </p>
          </div>
        </article>
        <article className="surface section-card grid gap-3 p-5">
          <KeyRound className="brand-icon" size={22} aria-hidden="true" />
          <div className="grid gap-1">
            <h3 className="font-black">Cambio de contrasena</h3>
            <p className="text-sm leading-6 text-stone-600">
              Minimo 8 caracteres, una mayuscula y numeros.
            </p>
          </div>
        </article>
        <article className="surface section-card grid gap-3 p-5">
          <ShieldCheck className="brand-icon" size={22} aria-hidden="true" />
          <div className="grid gap-1">
            <h3 className="font-black">Eliminacion segura</h3>
            <p className="text-sm leading-6 text-stone-600">
              Borra una cuenta individual o varias desde la seleccion.
            </p>
          </div>
        </article>
      </section>

      {editingClient || creatingClient ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-stone-950/45 px-4 py-8 backdrop-blur-sm"
          role="dialog"
        >
          <form
            className="grid w-full max-w-3xl gap-5 rounded-lg border border-rose-100 bg-white p-5 shadow-[0_30px_90px_rgba(80,5,28,0.28)]"
            onSubmit={(event) => void handleSaveMobileClient(event)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-2">
                <span className="badge badge-yellow w-fit">
                  <Users size={15} aria-hidden="true" />
                  {editingClient ? "Editar usuario" : "Agregar usuario"}
                </span>
                <div>
                  <h3 className="text-2xl font-black">
                    {editingClient ? editingClient.full_name : "Nuevo usuario"}
                  </h3>
                  <p className="text-sm font-semibold text-stone-500">
                    {editingClient ? editingClient.identity_number : "Completa los datos de acceso para la app movil"}
                  </p>
                </div>
              </div>
              <button
                className="btn btn-secondary aspect-square px-0"
                onClick={handleCloseClientEditor}
                title="Cerrar"
                type="button"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {clientFeedback ? (
              <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
                {clientFeedback}
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span className="label">Nombre completo</span>
                <input
                  className="input"
                  onChange={(event) =>
                    handleClientField("full_name", event.target.value)
                  }
                  value={clientForm.full_name}
                />
              </label>
              <label className="field">
                <span className="label">Cedula / usuario</span>
                <input
                  className="input"
                  onChange={(event) =>
                    handleClientField("identity_number", event.target.value)
                  }
                  onBlur={() => setTouchedClientFields((prev) => ({ ...prev, identity_number: true }))}
                  value={clientForm.identity_number}
                />
                {touchedClientFields.identity_number && clientForm.identity_number.trim().length > 0 && !validateIdentity(clientForm.identity_number) && (
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    La cédula o RUC no es válido.
                  </span>
                )}
              </label>
              <label className="field">
                <span className="label">Correo electronico</span>
                <input
                  className="input"
                  onChange={(event) =>
                    handleClientField("email", event.target.value)
                  }
                  onBlur={() => setTouchedClientFields((prev) => ({ ...prev, email: true }))}
                  type="email"
                  value={clientForm.email}
                />
                {touchedClientFields.email && clientForm.email.trim().length > 0 && !validateEmail(clientForm.email) && (
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    Correo inválido (use @gmail, @hotmail, etc).
                  </span>
                )}
              </label>
              <label className="field">
                <span className="label">Telefono</span>
                <input
                  className="input"
                  onChange={(event) =>
                    handleClientField("phone", event.target.value)
                  }
                  onBlur={() => setTouchedClientFields((prev) => ({ ...prev, phone: true }))}
                  value={clientForm.phone}
                />
                {touchedClientFields.phone && clientForm.phone.trim().length > 0 && !validatePhone(clientForm.phone) && (
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    Número de teléfono inválido.
                  </span>
                )}
              </label>
              <label className="field md:col-span-2">
                <span className="label">Direccion</span>
                <input
                  className="input"
                  onChange={(event) =>
                    handleClientField("address", event.target.value)
                  }
                  value={clientForm.address}
                />
              </label>
              <label className="field">
                <span className="label">Rol</span>
                <select
                  className="input"
                  onChange={(event) =>
                    handleClientField("role", event.target.value)
                  }
                  value={clientForm.role}
                >
                  <option value="cliente">Cliente</option>
                  <option value="empleado">Empleado</option>
                  <option value="delivery">Delivery</option>
                </select>
              </label>
              <label className="field">
                <div className="flex items-center justify-between">
                  <span className="label">Estado</span>
                  {editingClient?.source === "admin_pending" && (
                    <span className="text-xs font-semibold text-rose-600">
                      Contraseña temporal: {editingClient.identity_number}
                    </span>
                  )}
                </div>
                {editingClient?.source === "admin_pending" ? (
                  <input className="input bg-stone-100 font-medium text-stone-500" readOnly value="Pendiente (Cambio requerido)" />
                ) : (
                  <select
                    className="input"
                    onChange={(event) =>
                      handleClientField("status", event.target.value)
                    }
                    value={clientForm.status}
                  >
                    {MOBILE_CLIENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>

            {!creatingClient && (
              <div className="grid gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="field">
                    <span className="label">Nueva contrasena</span>
                    <span className="password-control">
                      <input
                        autoComplete="new-password"
                        className="input"
                        onChange={(event) =>
                          handleClientField("password", event.target.value)
                        }
                        placeholder="Dejar sin cambios"
                        type={showClientPassword ? "text" : "password"}
                        value={clientForm.password}
                      />
                      <button
                        aria-label={
                          showClientPassword ? "Ocultar contrasena" : "Ver contrasena"
                        }
                        className="password-toggle"
                        onClick={() =>
                          setShowClientPassword((current) => !current)
                        }
                        type="button"
                      >
                        {showClientPassword ? (
                          <EyeOff size={18} aria-hidden="true" />
                        ) : (
                          <Eye size={18} aria-hidden="true" />
                        )}
                      </button>
                    </span>
                  </label>
                  <label className="field">
                    <span className="label">Confirmar contrasena</span>
                    <input
                      autoComplete="new-password"
                      className="input"
                      onChange={(event) =>
                        handleClientField("confirm_password", event.target.value)
                      }
                      placeholder="Dejar sin cambios"
                      type={showClientPassword ? "text" : "password"}
                      value={clientForm.confirm_password}
                    />
                  </label>
                </div>

                {clientForm.password ? (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      {passwordRules.map((rule, index) => (
                        <span
                          className={`h-2 rounded-full ${
                            index < passwordScore
                              ? "bg-[var(--accent)]"
                              : "bg-stone-200"
                          }`}
                          key={rule.label}
                        />
                      ))}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {passwordRules.map((rule) => (
                        <span
                          className={`text-xs font-black ${
                            rule.complete ? "text-green-700" : "text-stone-500"
                          }`}
                          key={rule.label}
                        >
                          {rule.complete ? "Listo" : "Falta"}: {rule.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                className="btn btn-secondary"
                onClick={handleCloseClientEditor}
                type="button"
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                disabled={clientActionId === (creatingClient ? "new" : editingClient?.id)}
                type="submit"
              >
                {clientActionId === (creatingClient ? "new" : editingClient?.id) ? (
                  <Loader2 className="animate-spin" size={18} aria-hidden="true" />
                ) : (
                  <Save size={18} aria-hidden="true" />
                )}
                {creatingClient
                  ? `Crear ${clientForm.role === "empleado" ? "empleado" : clientForm.role === "delivery" ? "delivery" : "cliente"}`
                  : `Guardar ${clientForm.role === "empleado" ? "empleado" : clientForm.role === "delivery" ? "delivery" : "cliente"}`}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function getEmptyMobileClientForm(): MobileClientForm {
  return {
    full_name: "",
    identity_number: "",
    email: "",
    phone: "",
    address: "",
    status: "active",
    role: "cliente",
    password: "",
    confirm_password: "",
  };
}

function getMobileClientForm(client: MobileClientRecord): MobileClientForm {
  return {
    full_name: client.full_name,
    identity_number: client.identity_number,
    email: client.email ?? "",
    phone: client.phone ?? "",
    address: client.address ?? "",
    status: client.status || "active",
    role: client.role || "cliente",
    password: "",
    confirm_password: "",
  };
}

function filterMobileClients(
  clients: MobileClientRecord[],
  searchTerm: string,
  roleTab: "clientes" | "empleados" | "delivery" | "todos",
) {
  let list = clients;
  if (roleTab === "clientes") {
    list = clients.filter((c) => c.role === "cliente" || !c.role);
  } else if (roleTab === "empleados") {
    list = clients.filter((c) => c.role === "empleado");
  } else if (roleTab === "delivery") {
    list = clients.filter((c) => c.role === "delivery");
  }

  const term = searchTerm.trim().toLowerCase();

  if (!term) {
    return list;
  }

  return list.filter((client) =>
    [
      client.full_name,
      client.identity_number,
      client.email ?? "",
      client.phone ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(term),
  );
}

function getMobileClientFormError(form: MobileClientForm) {
  if (!form.full_name.trim()) {
    return "El nombre del cliente es obligatorio.";
  }

  if (!form.identity_number.trim() || !validateIdentity(form.identity_number)) {
    return "Ingresa una cédula o RUC válido.";
  }

  const email = form.email.trim();
  if (!email || !validateEmail(email)) {
    return "Ingresa un correo valido (use @gmail, @hotmail, etc).";
  }

  if (!form.phone.trim() || !validatePhone(form.phone)) {
    return "El teléfono no es válido.";
  }

  if (!form.address.trim()) {
    return "La direccion es obligatoria.";
  }

  if (!MOBILE_CLIENT_STATUS_OPTIONS.some((option) => option.value === form.status)) {
    return "Selecciona un estado valido para el cliente.";
  }

  if (form.password || form.confirm_password) {
    const passwordError = getMobileClientPasswordError(form.password);

    if (passwordError) {
      return passwordError;
    }

    if (form.password !== form.confirm_password) {
      return "Las contrasenas no coinciden.";
    }
  }

  return "";
}

function getMobileClientPasswordError(password: string) {
  if (password.trim().length < 8) {
    return "La contrasena debe tener minimo 8 caracteres.";
  }

  if (!/[A-Z]/.test(password)) {
    return "La contrasena debe tener al menos una mayuscula.";
  }

  if (!/\d/.test(password)) {
    return "La contrasena debe tener al menos un numero.";
  }

  return "";
}

function getMobileClientPasswordRules(password: string) {
  return [
    {
      label: "8 caracteres",
      complete: password.trim().length >= 8,
    },
    {
      label: "1 mayuscula",
      complete: /[A-Z]/.test(password),
    },
    {
      label: "numeros",
      complete: /\d/.test(password),
    },
  ];
}

function getMobileClientStatusLabel(status: string) {
  return (
    MOBILE_CLIENT_STATUS_OPTIONS.find((option) => option.value === status)
      ?.label ?? status
  );
}

function AdminMessageBanner({ message }: { message: string }) {
  return (
    <div className="surface flex items-start gap-3 p-4 text-sm leading-6 text-stone-700">
      <CheckCircle2 className="mt-0.5 brand-icon" size={18} aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

function DuplicateAlertDialog({
  message,
  onDismiss,
  type,
}: {
  message: string;
  onDismiss: () => void;
  type: DuplicateMessageType;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] grid place-items-center bg-stone-950/45 px-4 backdrop-blur-sm"
      onClick={onDismiss}
      role="alertdialog"
    >
      <div className="grid w-full max-w-md gap-5 rounded-xl border border-red-200 bg-white p-6 text-center shadow-[0_30px_90px_rgba(80,5,28,0.28)]">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-100 text-red-700">
          <AlertTriangle size={34} aria-hidden="true" />
        </span>
        <div className="grid gap-2">
          <strong className="text-2xl font-black uppercase tracking-[0.08em] text-red-700">
            {message}
          </strong>
          <p className="text-sm leading-6 text-stone-700">
            Ya existe un registro de {type} con un nombre o codigo muy parecido.
            Revisa el registro existente antes de guardar otro.
          </p>
        </div>
        <p className="rounded-lg bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-red-700">
          Haz click o presiona cualquier tecla para cerrar
        </p>
      </div>
    </div>
  );
}

type DuplicateMessageType = "producto" | "categoria";

function getDuplicateMessageType(message: string): DuplicateMessageType | null {
  if (message === PRODUCT_DUPLICATE_MESSAGE) {
    return "producto";
  }

  if (message === CATEGORY_DUPLICATE_MESSAGE) {
    return "categoria";
  }

  return null;
}

function ProductVisual({ product }: { product: Product }) {
  if (product.image_url) {
    return (
      <div className="product-thumb product-thumb-image rounded-lg border border-stone-200">
        <img alt={product.name} src={product.image_url} />
      </div>
    );
  }

  return (
    <div className="product-thumb product-thumb-placeholder grid place-items-center rounded-lg border border-stone-200 brand-icon">
      <Boxes size={28} aria-hidden="true" />
    </div>
  );
}

function ProductPricingMeta({ product }: { product: Product }) {
  const isWeight = isWeightBasedProduct(product);

  const getPriceText = (basePrice: number) => {
    if (product.has_iva && product.iva_rate) {
      const finalPrice = basePrice + Number((basePrice * product.iva_rate / 100).toFixed(2));
      return `${formatMoney(basePrice)} (${formatMoney(finalPrice)} c/IVA)`;
    }
    return formatMoney(basePrice);
  };

  if (!isWeight) {
    const presentations = getProductPresentations(product);

    if (presentations.length > 1) {
      const visiblePresentations = presentations.slice(0, 2);

      return (
        <>
          {visiblePresentations.map((presentation) => (
            <span key={presentation.id}>
              {presentation.name} {getPriceText(presentation.price)}
            </span>
          ))}
          {presentations.length > visiblePresentations.length ? (
            <span>+{presentations.length - visiblePresentations.length}</span>
          ) : null}
        </>
      );
    }
  }

  const priceLabel = isWeight ? "Libra" : "Unidad";

  return (
    <>
      <span>{priceLabel} {getPriceText(product.price)}</span>
    </>
  );
}

function PurchasePresentationField({
  className = "",
  disabled = false,
  onNameChange,
  onSelect,
  onUnitQuantityChange,
  options,
  unitQuantity,
  value,
}: {
  className?: string;
  disabled?: boolean;
  onNameChange: (value: string) => void;
  onSelect: (option: AdminComboboxOption) => void;
  onUnitQuantityChange: (value: string) => void;
  options: AdminComboboxOption[];
  unitQuantity: string;
  value: string;
}) {
  return (
    <div className={`grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] ${className}`.trim()}>
      <AdminSearchCombobox
        createLabel="Presentacion nueva"
        disabled={disabled}
        hint="Selecciona una registrada o escribe una nueva para este producto."
        label="Presentacion comprada"
        onChange={onNameChange}
        onSelect={onSelect}
        options={options}
        placeholder="Unidad, bulto, pack, caja..."
        value={value}
      />
      <label className="field">
        <span className="label">Desc. stock</span>
        <input
          className="input"
          disabled={disabled}
          min="1"
          onChange={(event) => onUnitQuantityChange(event.target.value)}
          step="1"
          type="number"
          value={unitQuantity}
        />
      </label>
    </div>
  );
}

function InventoryHistorySortableHeader({
  activeSort,
  label,
  onSort,
  sortKey,
}: {
  activeSort: InventoryHistorySort;
  label: string;
  onSort: (key: InventoryHistorySortableColumn) => void;
  sortKey: InventoryHistorySortableColumn;
}) {
  const isActive = activeSort.key === sortKey;
  const direction = isActive ? activeSort.direction : "asc";
  const nextDirection = isActive && direction === "asc" ? "desc" : "asc";

  return (
    <th rowSpan={2}>
      <button
        aria-label={`Ordenar ${label} en orden ${
          nextDirection === "asc" ? "ascendente" : "descendente"
        }`}
        className={`inventory-history-sort-button ${isActive ? "is-active" : ""}`}
        onClick={() => onSort(sortKey)}
        title={nextDirection === "asc" ? "Ordenar ascendente" : "Ordenar descendente"}
        type="button"
      >
        <span>{label}</span>
        {direction === "asc" ? (
          <ArrowUp size={14} aria-hidden="true" />
        ) : (
          <ArrowDown size={14} aria-hidden="true" />
        )}
      </button>
    </th>
  );
}

function ProductLotSummary({
  product,
  providerName,
}: {
  product: Product;
  providerName?: string;
}) {
  const lotGroups = getProductLotGroups(product, providerName);

  if (!lotGroups.length) {
    return null;
  }

  return (
    <div className="lot-detail-existences">
      <span className="uppercase text-stone-400">Existencias</span>
      {lotGroups.map((group) => (
        <span className="badge" key={group.key}>
          {group.providerName}:{" "}
          {formatProductStockWithPresentationBreakdown(product, group.quantity)}
          {group.nextExpiration ? ` - vence ${formatDateValue(group.nextExpiration)}` : ""}
        </span>
      ))}
    </div>
  );
}

function AdminSearchCombobox({
  allOptions,
  className = "",
  createLabel,
  disabled = false,
  label,
  onChange,
  onSelect,
  optionLimit = 8,
  options,
  placeholder,
  portalOptions = false,
  required = false,
  value,
  hint,
}: {
  allOptions?: AdminComboboxOption[];
  className?: string;
  createLabel?: string;
  disabled?: boolean;
  label: string;
  onChange: (value: string) => void;
  onSelect: (option: AdminComboboxOption) => void;
  optionLimit?: number;
  options: AdminComboboxOption[];
  placeholder?: string;
  portalOptions?: boolean;
  required?: boolean;
  value: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [floatingStyle, setFloatingStyle] = useState({
    left: 0,
    maxHeight: 292,
    top: 0,
    width: 280,
  });
  const comboboxRef = useRef<HTMLSpanElement | null>(null);
  const optionsId = useId();
  const trimmedValue = value.trim();
  const hasExactOption = options.some(
    (option) =>
      normalizeCatalogSearchText(option.label) ===
      normalizeCatalogSearchText(trimmedValue),
  );
  const panelOptions =
    showAllOptions && allOptions?.length ? allOptions : options;
  const visibleOptions = panelOptions.slice(0, optionLimit);
  const showCreateHint = Boolean(
    createLabel && trimmedValue && !hasExactOption && !showAllOptions,
  );
  const hasPanelContent = visibleOptions.length > 0 || showCreateHint;
  const optionsPanel = open && hasPanelContent ? (
    <span
      className={`admin-combobox-options ${
        portalOptions ? "admin-combobox-options--floating" : ""
      }`.trim()}
      id={optionsId}
      role="listbox"
      style={portalOptions ? floatingStyle : undefined}
    >
      {visibleOptions.map((option) => (
        <button
          aria-selected={
            normalizeCatalogSearchText(option.label) ===
            normalizeCatalogSearchText(value)
          }
          className="admin-combobox-option"
          key={option.id}
          onClick={() => {
            onSelect(option);
            setShowAllOptions(false);
            setOpen(false);
          }}
          onMouseDown={(event) => event.preventDefault()}
          role="option"
          type="button"
        >
          <span className="admin-combobox-option-main">
            <strong>{option.label}</strong>
            {option.badge ? <span>{option.badge}</span> : null}
          </span>
          {option.description ? (
            <span className="admin-combobox-option-description">
              {option.description}
            </span>
          ) : null}
        </button>
      ))}
      {showCreateHint ? (
        <span className="admin-combobox-create">
          <Plus size={15} aria-hidden="true" />
          {createLabel}: {trimmedValue}
        </span>
      ) : null}
    </span>
  ) : null;

  useEffect(() => {
    if (!open || !portalOptions) {
      return;
    }

    function updateFloatingStyle() {
      const rect = comboboxRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const gap = 6;
      const panelHeight = Math.min(
        292,
        Math.max(120, visibleOptions.length * 58 + (showCreateHint ? 46 : 0)),
      );
      const spaceBelow = viewportHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const opensAbove = spaceBelow < panelHeight && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        120,
        Math.min(panelHeight, opensAbove ? spaceAbove - gap : spaceBelow - gap),
      );
      const width = Math.max(rect.width, Math.min(360, viewportWidth - 24));
      const left = Math.min(Math.max(12, rect.left), viewportWidth - width - 12);
      const top = opensAbove
        ? Math.max(12, rect.top - maxHeight - gap)
        : Math.min(rect.bottom + gap, viewportHeight - maxHeight - 12);

      setFloatingStyle({
        left,
        maxHeight,
        top,
        width,
      });
    }

    updateFloatingStyle();
    window.addEventListener("resize", updateFloatingStyle);
    window.addEventListener("scroll", updateFloatingStyle, true);

    return () => {
      window.removeEventListener("resize", updateFloatingStyle);
      window.removeEventListener("scroll", updateFloatingStyle, true);
    };
  }, [
    open,
    portalOptions,
    showCreateHint,
    visibleOptions.length,
  ]);

  return (
    <label className={`field ${className}`.trim()}>
      <span className="label">{label}</span>
      <span className="admin-combobox" ref={comboboxRef}>
        <Search className="admin-combobox-search-icon" size={17} aria-hidden="true" />
        <input
          aria-autocomplete="list"
          aria-controls={optionsId}
          aria-expanded={open}
          className="input admin-combobox-input"
          disabled={disabled}
          onBlur={() => {
            setTimeout(() => {
              setShowAllOptions(false);
              setOpen(false);
            }, 120);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setShowAllOptions(false);
            setOpen(true);
          }}
          onFocus={() => {
            setShowAllOptions(false);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          required={required}
          role="combobox"
          value={value}
        />
        <button
          aria-expanded={open}
          aria-label={`Ver opciones de ${label}`}
          className="admin-combobox-toggle"
          disabled={disabled}
          onClick={() =>
            setOpen((current) => {
              const nextOpen = !current;
              setShowAllOptions(nextOpen && Boolean(allOptions?.length));
              return nextOpen;
            })
          }
          type="button"
        >
          <ChevronDown size={18} aria-hidden="true" />
        </button>

        {portalOptions && optionsPanel
          ? createPortal(optionsPanel, document.body)
          : optionsPanel}
      </span>
      {hint ? <span className="text-xs font-bold text-stone-500">{hint}</span> : null}
    </label>
  );
}

function ProductLotDetails({
  product,
  providerName,
}: {
  product: Product;
  providerName?: string;
}) {
  const lots = getProductLotDisplayRows(product, providerName);
  const lotGroups = getProductLotGroups(product, providerName);

  if (!lots.length) {
    return null;
  }

  return (
    <details className="lot-detail-disclosure">
      <summary className="lot-detail-summary">
        <span>Ver proveedores</span>
        <span className="lot-detail-summary-count">
          {lotGroups.length} proveedor{lotGroups.length === 1 ? "" : "es"}
        </span>
        <ChevronDown className="lot-detail-chevron" size={16} aria-hidden="true" />
      </summary>
      <div
        className="lot-detail-panel"
        aria-label={`Detalle de proveedores de ${product.name}`}
      >

        <div className="lot-detail-row lot-detail-head">
          <span>Proveedor</span>
          <span>Cantidad</span>
          <span>Ingreso</span>
          <span>Fabricacion</span>
          <span>Vencimiento</span>
          <span>Estado</span>
        </div>
        {lots.map((lot) => (
          <div className="lot-detail-row" key={lot.key}>
            <span className="lot-detail-provider" data-label="Proveedor">
              {lot.providerName}
            </span>
            <span data-label="Cantidad">
              {lot.purchaseReceivedLabel}
              {lot.stockEquivalentLabel ? (
                <small className="lot-detail-muted block">
                  {lot.stockEquivalentLabel}
                </small>
              ) : null}
            </span>
            <span data-label="Ingreso">{formatLotDate(lot.entry_date)}</span>
            <span data-label="Fabricacion">
              {formatLotDate(lot.manufacture_date)}
            </span>
            <span data-label="Vencimiento">
              {formatLotDate(lot.expiration_date)}
            </span>
            <span data-label="Estado">{formatLotStatus(lot.status)}</span>
          </div>
        ))}
      </div>
    </details>
  );
}

function ProductLotEditor({
  deletingLotId,
  lots,
  onDelete,
  product,
}: {
  deletingLotId: string | null;
  lots: ProductLot[];
  onDelete: (lot: ProductLot) => void;
  product: Product;
}) {
  return (
    <details className="lot-editor-section product-lot-section lg:col-span-2">
      <summary className="lot-editor-summary">
        <div>
          <h4>Existencias del producto</h4>
          <p>
            Revisa las entradas disponibles y elimina una existencia si fue creada
            por error.
          </p>
        </div>
        <span className="lot-editor-summary-meta">
          <span className="badge">
            {lots.length} existencia{lots.length === 1 ? "" : "s"}
          </span>
          <span className="badge badge-yellow">
            {formatLotQuantity(product.stock, product.measurement_unit)}
          </span>
          <ChevronDown className="lot-detail-chevron" size={17} aria-hidden="true" />
        </span>
      </summary>

      {lots.length ? (
        <div className="lot-editor-panel">
          <div className="lot-editor-row lot-editor-head">
            <span>Proveedor</span>
            <span>Cantidad</span>
            <span>Ingreso</span>
            <span>Vencimiento</span>
            <span>Estado</span>
            <span aria-label="Acciones"></span>
          </div>
          {lots.map((lot) => {
            const isDeleting = deletingLotId === lot.id;

            return (
              <div className="lot-editor-row" key={lot.id}>
                <span data-label="Proveedor">
                  {getProductLotDisplayProviderName(product, lot) ||
                    "Sin proveedor"}
                </span>
                <span data-label="Cantidad">
                  {formatLotPurchaseQuantity(product, lot.quantity_received, lot)}
                  {getLotStockEquivalentLabel(product, lot, lot.quantity_received) ? (
                    <small>
                      {getLotStockEquivalentLabel(
                        product,
                        lot,
                        lot.quantity_received,
                      )}
                    </small>
                  ) : null}
                </span>
                <span data-label="Ingreso">{formatLotDate(lot.entry_date)}</span>
                <span data-label="Vencimiento">
                  {formatLotDate(lot.expiration_date)}
                </span>
                <span data-label="Estado">{formatLotStatus(lot.status)}</span>
                <span className="lot-editor-actions">
                  <button
                    aria-label="Eliminar existencia"
                    className="btn btn-danger aspect-square px-0"
                    disabled={Boolean(deletingLotId)}
                    onClick={() => onDelete(lot)}
                    title="Eliminar existencia"
                    type="button"
                  >
                    {isDeleting ? (
                      <Loader2 className="animate-spin" size={16} aria-hidden="true" />
                    ) : (
                      <Trash2 size={16} aria-hidden="true" />
                    )}
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="lot-editor-panel rounded-lg border border-dashed border-stone-200 bg-white/75 p-4 text-sm font-bold text-stone-600">
          Este producto no tiene existencias detalladas registradas.
        </div>
      )}
    </details>
  );
}

type ProductPricingInput = {
  purchase_cost?: number | null;
  price: number;
  has_iva?: boolean;
  iva_rate?: number | null;
  measurement_unit?: ProductMeasurementUnit | null;
};

type ProductStockInput = {
  measurement_unit?: ProductMeasurementUnit | null;
  stock: number;
  min_stock: number;
  max_stock?: number | null;
};

function getProductPricingError(input: ProductPricingInput) {
  if (
    input.purchase_cost !== undefined &&
    input.purchase_cost !== null &&
    (Number.isNaN(input.purchase_cost) || input.purchase_cost < 0)
  ) {
    return "El costo de compra debe ser un numero valido.";
  }

  return "";
}

function getProductStockError(input: ProductStockInput) {
  if (!Number.isFinite(input.stock) || input.stock < 0) {
    return "El stock debe ser un numero valido.";
  }

  if (!Number.isFinite(input.min_stock) || input.min_stock < 0) {
    return "El stock minimo debe ser un numero valido.";
  }

  if (
    input.max_stock !== undefined &&
    input.max_stock !== null &&
    (!Number.isFinite(input.max_stock) || input.max_stock < 0)
  ) {
    return "El stock maximo debe ser un numero valido.";
  }

  if (
    !isWeightBasedProduct(input) &&
    (!Number.isInteger(input.stock) ||
      !Number.isInteger(input.min_stock) ||
      (input.max_stock !== undefined &&
        input.max_stock !== null &&
        !Number.isInteger(input.max_stock)))
  ) {
    return "Los productos por unidad deben tener stock entero.";
  }

  return "";
}

function getProductUnitCopy(measurementUnit: ProductMeasurementUnit) {
  if (measurementUnit === "lb") {
    return {
      helpText:
        "Usa granel para arroz, harina, frejol, azucar, etc. El inventario se guarda en libras y puedes ingresar compras, minimos o maximos en quintales, kilos o libras.",
      marginUnit: "por libra",
      maxStockLabel: "Maximo",
      minStockLabel: "Minimo",
      minStockStep: "0.001",
      purchaseCostLabel: "Ultimo costo de compra",
      salePriceLabel: "Precio base al publico (Sin IVA)",
      stockLabel: "Stock comprado",
      stockStep: "0.01",
    };
  }

  return {
    helpText:
      "Usa unidad para productos sellados o piezas individuales como aceite, gaseosas o tarrinas.",
    marginUnit: "por unidad",
    maxStockLabel: "Maximo",
    minStockLabel: "Minimo",
    minStockStep: "1",
    purchaseCostLabel: "Ultimo costo de compra",
    salePriceLabel: "Precio base al publico (Sin IVA)",
    stockLabel: "Stock",
    stockStep: "1",
  };
}

function getStockAdjustmentUnitLabel(product: Pick<Product, "measurement_unit">) {
  return isWeightBasedProduct(product) ? "lb" : "unidad";
}

function getLowStockMissingQuantity(
  product: Pick<Product, "stock" | "min_stock">,
) {
  const stock = Number(product.stock);
  const minStock = Number(product.min_stock);

  if (!Number.isFinite(stock) || !Number.isFinite(minStock)) {
    return 0;
  }

  return Math.max(0, Number((minStock - stock).toFixed(3)));
}

function getExpirationAlertProducts(products: Product[], daysAhead = 5) {
  const today = getTodayInputDate();
  const windowEnd = addDaysToDateInput(today, daysAhead);

  return products
    .filter((product) => product.is_active && Number(product.stock) > 0)
    .map((product) => {
      const expirationDate = getProductExpirationAlertDate(product, windowEnd);

      return expirationDate
        ? {
            product,
            expirationDate,
            isExpired: expirationDate < today,
          }
        : null;
    })
    .filter(
      (
        entry,
      ): entry is {
        product: Product;
        expirationDate: string;
        isExpired: boolean;
      } => Boolean(entry),
    )
    .sort(
      (first, second) =>
        Number(second.isExpired) - Number(first.isExpired) ||
        first.expirationDate.localeCompare(second.expirationDate) ||
        first.product.name.localeCompare(second.product.name, "es-EC", {
          sensitivity: "base",
        }),
    );
}

function getProductExpirationAlertDate(
  product: Product,
  endDate: string,
) {
  return getProductExpirationDateOptions(product).find(
    (date) => date <= endDate,
  ) ?? null;
}

function getProductExpirationDateOptions(product: Product) {
  const dates = new Set<string>();
  const availableLots = getAvailableProductLots(product);

  availableLots.forEach((lot) => {
    const lotExpirationDate = normalizeDateInput(lot.expiration_date);

    if (lotExpirationDate) {
      dates.add(lotExpirationDate);
    }
  });

  if (availableLots.length === 0) {
    const productExpirationDate = normalizeDateInput(product.expiration_date);

    if (productExpirationDate) {
      dates.add(productExpirationDate);
    }
  }

  return [...dates].sort();
}

function getProductDisplayExpirationDate(product: Product, providerName?: string) {
  const availableLots = getAvailableProductLots(product, providerName);
  const lotExpirationDate =
    availableLots
      .map((lot) => normalizeDateInput(lot.expiration_date))
      .filter((date): date is string => Boolean(date))
      .sort()[0] ?? null;

  if (availableLots.length > 0) {
    return lotExpirationDate;
  }

  return normalizeDateInput(product.expiration_date);
}

function addDaysToDateInput(dateInput: string, days: number) {
  const date = getDateInputDate(dateInput);
  date.setDate(date.getDate() + days);

  return formatDateInputParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

function getDateInputDate(dateInput: string) {
  const [year, month, day] = dateInput.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function getDateInputDayDifference(startDateInput: string, endDateInput: string) {
  if (!startDateInput || !endDateInput) {
    return Number.NaN;
  }

  const startDate = getDateInputDate(startDateInput);
  const endDate = getDateInputDate(endDateInput);
  const startTime = startDate.getTime();
  const endTime = endDate.getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return Number.NaN;
  }

  return Math.round((endTime - startTime) / 86_400_000);
}

function formatDateInputDisplay(dateInput: string) {
  const normalized = normalizeDateInput(dateInput);

  if (!normalized) {
    return "";
  }

  const [year, month, day] = normalized.split("-");

  return `${day}/${month}/${year}`;
}

function isPurchaseInvoiceInProgress(input: {
  creditDueDate: string;
  invoiceNumber: string;
  lines: PurchaseInvoiceLineDraft[];
  paymentMethod: PurchasePaymentMethod;
}) {
  return (
    Boolean(input.invoiceNumber.trim()) ||
    input.paymentMethod === "credit" ||
    Boolean(input.creditDueDate) ||
    input.lines.length > 1 ||
    input.lines.some(isPurchaseInvoiceLineInProgress)
  );
}

function isPurchaseInvoiceLineInProgress(line: PurchaseInvoiceLineDraft) {
  return (
    Boolean(line.product_id.trim()) ||
    Boolean(line.product_search.trim()) ||
    Boolean(line.purchase_presentation_id.trim()) ||
    Boolean(line.cost.trim()) ||
    Boolean(line.discount_rate.trim()) ||
    Boolean(line.iva_rate.trim()) ||
    Boolean(line.pvp_without_iva.trim()) ||
    Boolean(line.manufacture_date) ||
    Boolean(line.expiration_date) ||
    (line.quantity.trim() !== "" && line.quantity.trim() !== "1") ||
    line.quantity_input_unit !== "lb"
  );
}

function formatStockAlertQuantity(
  value: unknown,
  product: Pick<Product, "measurement_unit">,
) {
  if (isWeightBasedProduct(product)) {
    return `${formatProductQuantity(value)} lb`;
  }

  const quantity = Number(value);
  const unit = quantity === 1 ? "unidad" : "unidades";
  return `${formatProductQuantity(value)} ${unit}`;
}

function buildProductPricingPreview(form: ProductForm) {
  const purchaseCost = getStoredProductPurchaseCostValue(form);
  const unitPrice = normalizeMoney(form.price);
  const measurementUnit = normalizeProductMeasurementUnit(form.measurement_unit);
  const saleValuePerInventoryUnit = getSaleValuePerInventoryUnit(
    unitPrice,
    measurementUnit,
  );

  return {
    unitMargin: calculateProductMargin(
      saleValuePerInventoryUnit,
      purchaseCost,
    ),
  };
}

function createPurchaseInvoiceLine(
  product?: Product | null,
  existingId?: string,
  purchases: ProductPurchaseHistoryRecord[] = [],
  providerName = "",
): PurchaseInvoiceLineDraft {
  const productIvaRate = isPurchaseInvoiceIvaProduct(product)
    ? Number(product?.iva_rate) || 0
    : 0;
  const measurementUnit = normalizeProductMeasurementUnit(
    product?.measurement_unit,
  );
  const isBulkLine = measurementUnit === "lb";
  const purchasePresentations = product
    ? getProductPresentations(product, "purchase")
    : [];
  const bulkPresentations =
    isBulkLine && product
      ? getBulkPurchaseLinePresentations(product)
      : [];

  const defaultPresentation =
    measurementUnit === "unit" && product
      ? purchasePresentations.find((presentation) => presentation.is_default) ??
        purchasePresentations[0] ??
        null
      : isBulkLine && bulkPresentations.length > 0
      ? bulkPresentations[0]
      : null;

  const defaultQuantity = "1";
  const defaultInputUnit =
    measurementUnit === "lb" ? DEFAULT_BULK_STOCK_INPUT_UNIT : "lb";
  const defaultStockQuantity =
    measurementUnit === "lb"
      ? (defaultPresentation ? getPositiveUnitQuantity(defaultPresentation.unit_quantity, 1) : getBulkStockUnitPounds(defaultInputUnit))
      : Math.max(1, Number(defaultPresentation?.unit_quantity) || 1);
  const defaultPurchaseUnit =
    measurementUnit === "lb"
      ? (defaultPresentation ? (defaultPresentation.name || "Presentación") : getBulkStockInputUnitLabel(defaultInputUnit))
      : defaultPresentation?.name ?? "Unidad";
  const historicalUnitCost = product
    ? getLatestSupplierUnitPrice(
        purchases,
        product.id,
        defaultPurchaseUnit,
        providerName,
      )
    : null;
  const defaultLineCost =
    historicalUnitCost ??
    (product
      ? getPurchaseUnitCostValue(
        product,
        measurementUnit,
        defaultStockQuantity,
        defaultPresentation?.price,
      )
      : null);
  const defaultPresentationPrice = getPurchasePresentationPublicPrice(
    defaultPresentation,
    product,
  );
  const pvpWithoutIva = defaultPresentationPrice;

  return {
    id: existingId ?? `purchase-line-${Date.now()}-${Math.random()}`,
    product_id: product?.id ?? "",
    product_search: product?.name ?? "",
    purchase_presentation_id: product ? (defaultPresentation?.id ?? (isBulkLine ? "" : "custom")) : "",
    custom_presentation_name: "",
    custom_presentation_quantity: "1",
    quantity: defaultQuantity,
    quantity_input_unit: defaultInputUnit,
    cost:
      defaultLineCost !== null && defaultLineCost > 0
        ? formatMoneyInputValue(defaultLineCost)
        : "",
    discount_rate: "",
    iva_rate: productIvaRate > 0 ? formatMoneyInputValue(productIvaRate) : "",
    pvp_without_iva:
      pvpWithoutIva > 0 ? formatMoneyInputValue(pvpWithoutIva) : "",
    base_price_without_iva: product && Number(product.price) > 0
      ? formatMoneyInputValue(Number(product.price))
      : "",
    manufacture_date: "",
    expiration_date: "",
  };
}

function isPurchaseInvoiceIvaProduct(product?: Product | null) {
  return product?.has_iva === true;
}

function doesProductRequireDates(product?: Product | null) {
  if (!product) {
    return false;
  }

  if (product.requires_dates !== undefined && product.requires_dates !== null) {
    return Boolean(product.requires_dates);
  }

  return Boolean(product.manufacture_date || product.expiration_date);
}

function buildPurchaseInvoiceLineTotals(
  line: PurchaseInvoiceLineDraft,
  product?: Product | null,
) {
  const hasIva = isPurchaseInvoiceIvaProduct(product);
  const measurementUnit = normalizeProductMeasurementUnit(
    product?.measurement_unit,
  );
  const presentation = getPurchaseInvoiceLinePresentation(line, product);
  const presentationUnitQuantity =
    measurementUnit === "lb"
      ? presentation
        ? getPositiveUnitQuantity(presentation.unit_quantity, 1)
        : getBulkStockUnitPounds(line.quantity_input_unit)
      : measurementUnit === "unit"
      ? line.purchase_presentation_id === "custom"
        ? Math.max(1, Number(line.custom_presentation_quantity) || 1)
        : Math.max(1, Number(presentation?.unit_quantity) || 1)
      : 1;
  const purchaseUnit =
    measurementUnit === "lb"
      ? presentation?.name ?? getBulkStockInputUnitLabel(line.quantity_input_unit)
      : line.purchase_presentation_id === "custom"
      ? line.custom_presentation_name || "Unidad (Personalizada)"
      : presentation?.name ?? "Unidad";
  const purchaseQuantity = getFiniteNumberInput(line.quantity, 0);
  const quantity =
    measurementUnit === "lb"
      ? Number((purchaseQuantity * presentationUnitQuantity).toFixed(3))
      : Number((purchaseQuantity * presentationUnitQuantity).toFixed(3));
  const purchaseUnitCost = normalizeMoney(line.cost || 0);
  const grossSubtotal = normalizeMoney(purchaseUnitCost * purchaseQuantity);
  const discountRate = Math.min(
    100,
    Math.max(0, normalizeMoney(line.discount_rate || 0)),
  );
  const discountAmount = normalizeMoney(grossSubtotal * (discountRate / 100));
  const subtotal = normalizeMoney(Math.max(0, grossSubtotal - discountAmount));
  const ivaRate = hasIva ? normalizeMoney(line.iva_rate || 0) : 0;
  const ivaAmount = hasIva ? normalizeMoney(subtotal * (ivaRate / 100)) : 0;
  const total = normalizeMoney(subtotal + ivaAmount);
  const pvpWithoutIva = normalizeMoney(
    line.pvp_without_iva || (hasIva ? 0 : product?.price ?? 0),
  );
  const pvpWithIva = hasIva
    ? normalizeMoney(pvpWithoutIva + Number((pvpWithoutIva * ivaRate / 100).toFixed(2)))
    : pvpWithoutIva;
  const salePrice = hasIva ? 0 : pvpWithoutIva;
  const unitCostWithoutIva =
    quantity > 0 ? normalizeMoney(subtotal / quantity) : 0;

  const basePvpWithoutIva = line.base_price_without_iva
    ? normalizeMoney(line.base_price_without_iva)
    : (presentationUnitQuantity === 1 
        ? pvpWithoutIva 
        : normalizeMoney(Number(product?.price || 0)));
  const basePvpWithIva = hasIva
    ? normalizeMoney(basePvpWithoutIva + Number((basePvpWithoutIva * ivaRate / 100).toFixed(2)))
    : basePvpWithoutIva;

  return {
    cost: subtotal,
    discountAmount,
    discountRate,
    grossSubtotal,
    hasIva,
    ivaAmount,
    ivaRate,
    pvpWithIva,
    pvpWithoutIva,
    basePvpWithIva,
    basePvpWithoutIva,
    presentationId:
      presentation?.use_for_sale !== false &&
      ((measurementUnit === "unit" && presentationUnitQuantity > 1) ||
        (measurementUnit === "lb" && Boolean(presentation)))
        ? presentation?.id ?? null
        : null,
    presentationName:
      presentation?.use_for_sale !== false &&
      ((measurementUnit === "unit" && presentationUnitQuantity > 1) ||
        (measurementUnit === "lb" && Boolean(presentation)))
        ? presentation?.name ?? null
        : null,
    presentationUnitQuantity,
    purchaseQuantity,
    purchaseUnitCost,
    purchaseUnit,
    quantity,
    salePrice,
    subtotal,
    total,
    unitCostWithoutIva,
  };
}

function getPurchasePresentationPublicPrice(
  presentation?: ProductPresentation | null,
  product?: Product | null,
) {
  return normalizeMoney(
    presentation && presentation.use_for_sale !== false
      ? presentation.price
      : product?.price ?? 0,
  );
}

function buildPurchaseInvoiceTotals(
  lines: PurchaseInvoiceLineDraft[],
  products: Product[],
) {
  const productsById = new Map(products.map((product) => [product.id, product]));

  return lines.reduce(
    (totals, line) => {
      const product = productsById.get(line.product_id) ?? null;
      const lineTotals = buildPurchaseInvoiceLineTotals(line, product);
      const visiblePvpWithoutIva = lineTotals.hasIva
        ? lineTotals.pvpWithoutIva
        : 0;
      const visiblePvpWithIva = lineTotals.hasIva ? lineTotals.pvpWithIva : 0;
      const visibleUnitCostWithoutIva = lineTotals.hasIva
        ? lineTotals.unitCostWithoutIva
        : 0;
      const visibleSalePrice = lineTotals.hasIva ? 0 : lineTotals.salePrice;

      return {
        cost: normalizeMoney(totals.cost + lineTotals.cost),
        discountAmount: normalizeMoney(
          totals.discountAmount + lineTotals.discountAmount,
        ),
        grossSubtotal: normalizeMoney(
          totals.grossSubtotal + lineTotals.grossSubtotal,
        ),
        hasIva: totals.hasIva || lineTotals.hasIva,
        ivaAmount: normalizeMoney(totals.ivaAmount + lineTotals.ivaAmount),
        pvpWithIva: normalizeMoney(totals.pvpWithIva + visiblePvpWithIva),
        pvpWithoutIva: normalizeMoney(
          totals.pvpWithoutIva + visiblePvpWithoutIva,
        ),
        quantity: Number((totals.quantity + lineTotals.quantity).toFixed(3)),
        purchaseQuantity: Number(
          (totals.purchaseQuantity + lineTotals.purchaseQuantity).toFixed(3),
        ),
        salePrice: normalizeMoney(totals.salePrice + visibleSalePrice),
        subtotal: normalizeMoney(totals.subtotal + lineTotals.subtotal),
        total: normalizeMoney(totals.total + lineTotals.total),
        unitCostWithoutIva: normalizeMoney(
          totals.unitCostWithoutIva + visibleUnitCostWithoutIva,
        ),
      };
    },
    {
      cost: 0,
      discountAmount: 0,
      grossSubtotal: 0,
      hasIva: false,
      ivaAmount: 0,
      pvpWithIva: 0,
      pvpWithoutIva: 0,
      purchaseQuantity: 0,
      quantity: 0,
      salePrice: 0,
      subtotal: 0,
      total: 0,
      unitCostWithoutIva: 0,
    },
  );
}

function getPurchaseInvoiceLinePresentations(product: Product) {
  return getProductPresentations(product, "purchase");
}

function getBulkPurchaseLinePresentations(product: Product) {
  return getPurchaseInvoiceLinePresentations(product).filter(
    (presentation) => !isDefaultOnlyProductPresentation(presentation, product),
  );
}

function getPurchaseInvoicePresentationById(
  product: Product | null | undefined,
  presentationId: string,
) {
  if (!product || !presentationId) {
    return null;
  }

  const presentations = getPurchaseInvoiceLinePresentations(product);
  const matchingPresentation =
    presentations.find((presentation) => presentation.id === presentationId) ??
    null;

  if (normalizeProductMeasurementUnit(product.measurement_unit) === "lb") {
    return matchingPresentation;
  }

  return (
    matchingPresentation ?? getPurchaseInvoiceLinePresentations(product)[0] ?? null
  );
}

function getPurchaseInvoiceLinePresentation(
  line: PurchaseInvoiceLineDraft,
  product?: Product | null,
) {
  return getPurchaseInvoicePresentationById(
    product,
    line.purchase_presentation_id,
  );
}

function createProductPresentationDraft(
  presentation?: Partial<ProductPresentationDraft> | Partial<ProductPresentation>,
): ProductPresentationDraft {
  const unitQuantity = Number(presentation?.unit_quantity);
  const price =
    presentation?.price === undefined || presentation.price === null
      ? ""
      : formatMoneyInputValue(presentation.price);

  return {
    id:
      typeof presentation?.id === "string" && presentation.id
        ? presentation.id
        : `presentation-${Date.now()}-${Math.random()}`,
    name: typeof presentation?.name === "string" ? presentation.name : "Unidad",
    unit_quantity: Number.isFinite(unitQuantity) && unitQuantity > 0
      ? formatDecimalInputValue(unitQuantity)
      : "1",
    price,
    is_default: Boolean(presentation?.is_default),
    is_active: presentation?.is_active !== false,
    use_for_purchase: presentation?.use_for_purchase !== false,
    use_for_sale: presentation ? presentation.use_for_sale !== false : false,
  };
}

function createProductPresentationDrafts(
  product: Product | null,
): ProductPresentationDraft[] {
  if (!product) {
    return [];
  }

  const savedPresentations = getVisibleSavedProductPresentations(product);

  return savedPresentations.map((presentation) =>
    createProductPresentationDraft(presentation),
  );
}

function getProductPresentationDrafts(form: ProductForm) {
  return normalizeProductPresentationDrafts(form.presentations, form);
}

function normalizeProductPresentationDrafts(
  presentations: ProductPresentationDraft[],
  form: Pick<ProductForm, "price" | "measurement_unit">,
): ProductPresentationDraft[] {
  const isBulk = normalizeProductMeasurementUnit(form.measurement_unit) === "lb";
  const normalized = presentations
    .filter((presentation) => presentation.is_active !== false)
    .map((presentation) => ({
      ...presentation,
      name: presentation.name,
      unit_quantity: presentation.unit_quantity,
      price: presentation.price,
      is_default:
        isBulk || !presentation.use_for_sale
          ? false
          : Boolean(presentation.is_default),
      is_active: true,
      use_for_purchase: presentation.use_for_purchase,
      use_for_sale: presentation.use_for_sale,
    }));

  if (!normalized.length) {
    return [];
  }

  const firstSaleIndex = normalized.findIndex(
    (presentation) =>
      presentation.use_for_sale && Number(presentation.unit_quantity) === 1,
  );
  const defaultIndex = normalized.findIndex(
    (presentation) =>
      presentation.use_for_sale &&
      Number(presentation.unit_quantity) === 1 &&
      presentation.is_default,
  );

  return normalized.map((presentation, index) => ({
    ...presentation,
    is_default:
      !isBulk &&
      presentation.use_for_sale &&
      Number(presentation.unit_quantity) === 1 &&
      index ===
        (defaultIndex >= 0 ? defaultIndex : Math.max(firstSaleIndex, 0)),
  }));
}

function getVisibleSavedProductPresentations(product: Product) {
  const savedPresentations = (product.presentations ?? [])
    .filter((presentation) => presentation.is_active !== false);

  if (
    savedPresentations.length === 1 &&
    isDefaultOnlyProductPresentation(savedPresentations[0], product)
  ) {
    return [];
  }

  return savedPresentations;
}

function isDefaultOnlyProductPresentation(
  presentation: ProductPresentation,
  product: Product,
) {
  const defaultName = isWeightBasedProduct(product) ? "Libra" : "Unidad";

  return (
    Number(presentation.unit_quantity) === 1 &&
    presentation.name.trim().toLocaleLowerCase("es-EC") ===
      defaultName.toLocaleLowerCase("es-EC") &&
    normalizeMoney(presentation.price) === normalizeMoney(product.price) &&
    presentation.use_for_purchase !== false &&
    presentation.use_for_sale !== false
  );
}

function getProductPresentationPayloads(
  form: ProductForm,
): ProductPresentationPayload[] {
  return syncDefaultProductPresentationDraftPrice(
    form,
    form.price,
  ).map((presentation) => ({
    id: presentation.id,
    name: presentation.name.trim(),
    unit_quantity: getFiniteNumberInput(presentation.unit_quantity, 0),
    price: normalizeMoney(presentation.price || 0),
    is_default: presentation.is_default,
    is_active: presentation.is_active,
    use_for_purchase: presentation.use_for_purchase,
    use_for_sale: presentation.use_for_sale,
  }));
}

function syncDefaultProductPresentationDraftPrice(
  form: ProductForm,
  price: string,
) {
  const presentations = getProductPresentationDrafts(form);

  if (
    normalizeProductMeasurementUnit(form.measurement_unit) !== "unit" ||
    !presentations.length
  ) {
    return presentations;
  }

  const defaultIndex = presentations.findIndex(
    (presentation) =>
      presentation.use_for_sale &&
      Number(presentation.unit_quantity) === 1 &&
      presentation.is_default,
  );
  const resolvedDefaultIndex =
    defaultIndex >= 0
      ? defaultIndex
      : presentations.findIndex(
          (presentation) =>
            presentation.use_for_sale &&
            Number(presentation.unit_quantity) === 1,
        );

  if (resolvedDefaultIndex < 0) {
    return presentations;
  }

  return presentations.map((presentation, index) =>
    index === resolvedDefaultIndex
      ? { ...presentation, price }
      : presentation,
  );
}

function getProductPresentationError(
  presentations: ProductPresentationPayload[],
  measurementUnit: ProductMeasurementUnit,
) {
  if (!presentations.length) {
    return "";
  }

  const validatedPresentations: ProductPresentationPayload[] = [];

  for (const presentation of presentations) {
    if (!presentation.name.trim()) {
      return "Cada presentacion debe tener un nombre.";
    }

    if (!presentation.use_for_purchase && !presentation.use_for_sale) {
      return "Selecciona si la presentacion se usa para comprar o vender.";
    }

    if (
      !Number.isFinite(presentation.unit_quantity) ||
      presentation.unit_quantity <= 0 ||
      (measurementUnit !== "lb" && !Number.isInteger(presentation.unit_quantity))
    ) {
      return measurementUnit === "lb"
        ? "La cantidad que descuenta cada presentacion debe ser valida."
        : "La cantidad que descuenta cada presentacion debe ser entera.";
    }

    if (
      presentation.use_for_sale &&
      (!Number.isFinite(presentation.price) || presentation.price < 0)
    ) {
      return "El precio de venta al publico no es valido.";
    }

    const overlappingPresentation = validatedPresentations.find(
      (candidate) =>
        candidate.unit_quantity === presentation.unit_quantity &&
        ((candidate.use_for_purchase && presentation.use_for_purchase) ||
          (candidate.use_for_sale && presentation.use_for_sale)),
    );

    if (overlappingPresentation) {
      return "No repitas la misma cantidad para el mismo tipo de uso.";
    }

    validatedPresentations.push(presentation);
  }

  return "";
}

function areProductNumericValuesEqual(left: unknown, right: unknown) {
  const leftValue = Number(left);
  const rightValue = Number(right);

  return (
    Number.isFinite(leftValue) &&
    Number.isFinite(rightValue) &&
    Math.abs(leftValue - rightValue) < 0.0005
  );
}

function getProductIvaError(input: ProductPricingInput) {
  if (!input.has_iva) {
    return "";
  }

  if (
    input.iva_rate === undefined ||
    input.iva_rate === null ||
    !Number.isFinite(input.iva_rate) ||
    input.iva_rate < 0 ||
    input.iva_rate > 100
  ) {
    return "El porcentaje de IVA debe ser valido.";
  }

  return "";
}

function createLocalProductPresentations(
  productId: string,
  presentations: ProductPresentationPayload[],
): ProductPresentation[] {
  return presentations.map((presentation, index) => ({
    id:
      presentation.id && !presentation.id.startsWith("presentation-")
        ? presentation.id
        : `presentation-${productId}-${index + 1}`,
    product_id: productId,
    name: presentation.name,
    unit_quantity: presentation.unit_quantity,
    price: normalizeMoney(presentation.price),
    is_default: presentation.is_default,
    is_active: presentation.is_active,
    use_for_purchase: presentation.use_for_purchase,
    use_for_sale: presentation.use_for_sale,
  }));
}

function getPresentationStockInfo(quantity: string, unitQuantity: number) {
  if (!quantity.trim()) {
    return `Cada compra suma ${formatProductQuantity(unitQuantity)} und al inventario.`;
  }

  const purchasedQuantity = getFiniteNumberInput(quantity, 0);

  if (!Number.isFinite(purchasedQuantity) || purchasedQuantity <= 0) {
    return "";
  }

  const stockQuantity = Number((purchasedQuantity * unitQuantity).toFixed(3));

  return `Equivale a ${formatProductQuantity(stockQuantity)} und en inventario.`;
}

function createProductPurchaseForm(
  product?: Product | null,
  providerName = "",
): ProductPurchaseForm {
  const measurementUnit = normalizeProductMeasurementUnit(
    product?.measurement_unit,
  );
  const purchasePresentations = product
    ? getProductPresentations(product, "purchase")
    : [];
  const defaultPresentation =
    purchasePresentations.find((presentation) => presentation.is_default) ??
    purchasePresentations[0] ??
    null;
  const defaultPublicPrice = getPurchasePresentationPublicPrice(
    defaultPresentation,
    product,
  );

  return {
    provider: providerName || getPreferredProductProviderName(product),
    purchase_presentation_id:
      measurementUnit === "unit" ? defaultPresentation?.id ?? "" : "",
    purchase_presentation_name:
      measurementUnit === "unit" ? defaultPresentation?.name ?? "" : "",
    purchase_presentation_unit_quantity:
      measurementUnit === "unit" && defaultPresentation
        ? formatDecimalInputValue(defaultPresentation.unit_quantity)
        : "1",
    quantity: "1",
    quantity_input_unit:
      measurementUnit === "lb" ? DEFAULT_BULK_STOCK_INPUT_UNIT : "lb",
    purchase_cost:
      product && measurementUnit === "lb"
        ? getBulkPurchaseCostInputValue(product, DEFAULT_BULK_STOCK_INPUT_UNIT)
        : product && measurementUnit === "unit" && defaultPresentation
        ? getPresentationPurchaseCostInputValue(
            product,
            defaultPresentation.unit_quantity,
            defaultPresentation.price,
          )
        : product?.purchase_cost !== undefined &&
            product.purchase_cost !== null &&
            Number(product.purchase_cost) > 0
          ? formatMoneyInputValue(product.purchase_cost)
          : "",
    price: defaultPublicPrice > 0 ? formatMoneyInputValue(defaultPublicPrice) : "",
    entry_date: getTodayInputDate(),
    manufacture_date: "",
    expiration_date: "",
  };
}

function getProductFormStockPresentationOptions(
  form: ProductForm,
): ProductStockPresentationOption[] {
  if (normalizeProductMeasurementUnit(form.measurement_unit) !== "unit") {
    return [];
  }

  const options: ProductStockPresentationOption[] = [
    {
      id: DEFAULT_STOCK_PRESENTATION_ID,
      name: "Unidad",
      unitQuantity: 1,
    },
  ];

  for (const presentation of getProductPresentationDrafts(form)) {
    const name = presentation.name.trim();
    const unitQuantity = getFiniteNumberInput(
      presentation.unit_quantity,
      Number.NaN,
    );

    if (!name || !Number.isFinite(unitQuantity) || unitQuantity <= 1) {
      continue;
    }

    options.push({
      id: presentation.id,
      name,
      unitQuantity,
    });
  }

  return options;
}

function getSelectedProductFormStockPresentation(
  form: ProductForm,
): ProductStockPresentationOption {
  return getSelectedProductFormPresentation(
    form,
    form.stock_presentation_id,
  );
}

function getSelectedProductFormMinStockPresentation(
  form: ProductForm,
): ProductStockPresentationOption {
  return getSelectedProductFormPresentation(
    form,
    form.min_stock_presentation_id,
  );
}

function getSelectedProductFormMaxStockPresentation(
  form: ProductForm,
): ProductStockPresentationOption {
  return getSelectedProductFormPresentation(
    form,
    form.max_stock_presentation_id,
  );
}

function getSelectedProductFormPresentation(
  form: ProductForm,
  presentationId: string,
): ProductStockPresentationOption {
  const options = getProductFormStockPresentationOptions(form);

  return (
    options.find((option) => option.id === presentationId) ??
    options[0] ?? {
      id: DEFAULT_STOCK_PRESENTATION_ID,
      name: "Unidad",
      unitQuantity: 1,
    }
  );
}

function getProductFormStockUnitQuantity(form: ProductForm) {
  return getSelectedProductFormStockPresentation(form).unitQuantity;
}

function getProductFormMinStockUnitQuantity(form: ProductForm) {
  return getSelectedProductFormMinStockPresentation(form).unitQuantity;
}

function getProductFormMaxStockUnitQuantity(form: ProductForm) {
  return getSelectedProductFormMaxStockPresentation(form).unitQuantity;
}

function getProductPresentationStockDisplay(
  product: Product,
  value: unknown,
) {
  const stockValue = Number(value);

  if (
    normalizeProductMeasurementUnit(product.measurement_unit) !== "unit" ||
    !Number.isFinite(stockValue) ||
    stockValue <= 0
  ) {
    return {
      presentationId: DEFAULT_STOCK_PRESENTATION_ID,
      quantity: Number.isFinite(stockValue)
        ? formatDecimalInputValue(stockValue)
        : "0",
    };
  }

  const matchingPresentation = getProductPresentations(product)
    .filter((presentation) => Number(presentation.unit_quantity) > 1)
    .sort(
      (first, second) =>
        Number(second.unit_quantity) - Number(first.unit_quantity),
    )
    .find((presentation) => {
      const unitQuantity = Number(presentation.unit_quantity);
      const convertedQuantity = stockValue / unitQuantity;

      return (
        Number.isFinite(convertedQuantity) &&
        Math.abs(convertedQuantity - Math.round(convertedQuantity)) < 0.000001
      );
    });

  if (!matchingPresentation) {
    return {
      presentationId: DEFAULT_STOCK_PRESENTATION_ID,
      quantity: formatDecimalInputValue(stockValue),
    };
  }

  return {
    presentationId: matchingPresentation.id,
    quantity: formatDecimalInputValue(
      stockValue / matchingPresentation.unit_quantity,
    ),
  };
}

function formatProductStockWithPresentationBreakdown(
  product: Product,
  value: unknown = product.stock,
) {
  const stockValue = Number(value);
  const measurementUnit = normalizeProductMeasurementUnit(product.measurement_unit);
  const baseLabel = `${formatProductQuantity(stockValue)} ${
    measurementUnit === "lb" ? "lb" : "und"
  }`;
  const breakdown = getProductStockPresentationBreakdown(product, stockValue);

  return breakdown ? `${baseLabel} (${breakdown})` : baseLabel;
}

function getProductStockPresentationBreakdown(
  product: Product,
  stockValue: number,
) {
  const measurementUnit = normalizeProductMeasurementUnit(product.measurement_unit);

  if (
    !Number.isFinite(stockValue) ||
    stockValue <= 0
  ) {
    return "";
  }

  if (measurementUnit === "lb") {
    return getBulkStockQuintalBreakdown(stockValue);
  }

  if (measurementUnit !== "unit") {
    return "";
  }

  const presentation = getProductPresentations(product)
    .filter((item) => Number(item.unit_quantity) > 1)
    .sort(
      (first, second) =>
        Number(second.unit_quantity) - Number(first.unit_quantity),
    )[0];

  if (!presentation) {
    return "";
  }

  const unitQuantity = Math.max(1, Number(presentation.unit_quantity) || 1);
  const normalizedStock = Number(stockValue.toFixed(3));
  const wholePresentationQuantity = Math.floor(
    (normalizedStock + 0.000001) / unitQuantity,
  );

  if (wholePresentationQuantity <= 0) {
    return "";
  }

  let remainingStock = Number(
    (normalizedStock - wholePresentationQuantity * unitQuantity).toFixed(3),
  );

  if (Math.abs(remainingStock) < 0.000001) {
    remainingStock = 0;
  }

  const parts = [
    formatNamedQuantity(wholePresentationQuantity, presentation.name),
  ];

  if (remainingStock > 0) {
    parts.push(formatNamedQuantity(remainingStock, "unidad"));
  }

  return parts.join(" y ");
}

function getBulkStockQuintalBreakdown(stockValue: number) {
  const normalizedStock = Number(stockValue.toFixed(3));
  const wholeQuintals = Math.floor(
    (normalizedStock + 0.000001) / COMMERCIAL_QUINTAL_TO_POUNDS,
  );

  if (wholeQuintals <= 0) {
    return "";
  }

  let remainingPounds = Number(
    (normalizedStock - wholeQuintals * COMMERCIAL_QUINTAL_TO_POUNDS).toFixed(3),
  );

  if (Math.abs(remainingPounds) < 0.000001) {
    remainingPounds = 0;
  }

  const parts = [`${formatProductQuantity(wholeQuintals)} qq`];

  if (remainingPounds > 0) {
    parts.push(`${formatProductQuantity(remainingPounds)} lb`);
  }

  return parts.join(" y ");
}

function formatNamedQuantity(quantity: number, singularName: string) {
  return `${formatProductQuantity(quantity)} ${getQuantityName(
    singularName,
    quantity,
  )}`;
}

function getQuantityName(name: string, quantity: number) {
  const trimmedName = name.trim() || "unidad";

  if (Math.abs(quantity - 1) < 0.000001) {
    return trimmedName;
  }

  if (/s$/i.test(trimmedName)) {
    return trimmedName;
  }

  if (/z$/i.test(trimmedName)) {
    return `${trimmedName.slice(0, -1)}ces`;
  }

  if (/[aeiouáéíóú]$/i.test(trimmedName)) {
    return `${trimmedName}s`;
  }

  return `${trimmedName}es`;
}

function getStoredProductStockValue(
  value: string,
  measurementUnit: ProductMeasurementUnit,
  inputUnit: BulkStockInputUnit,
  unitQuantity = 1,
) {
  if (measurementUnit === "lb") {
    return convertBulkStockInputToPounds(value, inputUnit, 0);
  }

  const quantity = getFiniteNumberInput(value, 0);

  return Number((quantity * Math.max(1, Number(unitQuantity) || 1)).toFixed(3));
}

function getStoredProductMinStockValue(
  value: string,
  measurementUnit: ProductMeasurementUnit,
  inputUnit: BulkStockInputUnit,
  unitQuantity = 1,
) {
  if (measurementUnit === "lb") {
    return convertBulkStockInputToPounds(value, inputUnit, 0);
  }

  const quantity = getFiniteNumberInput(value, 0);

  return Number((quantity * Math.max(1, Number(unitQuantity) || 1)).toFixed(3));
}

function getStoredProductMaxStockValue(
  value: string,
  measurementUnit: ProductMeasurementUnit,
  inputUnit: BulkStockInputUnit,
  unitQuantity = 1,
) {
  if (measurementUnit === "lb") {
    return convertBulkStockInputToPounds(value, inputUnit, 100);
  }

  const quantity = getFiniteNumberInput(value, 100);

  return Number((quantity * Math.max(1, Number(unitQuantity) || 1)).toFixed(3));
}

function getFiniteNumberInput(value: string, fallback: number) {
  const number = Number(value === "" ? fallback : value);

  return Number.isFinite(number) ? number : fallback;
}

function normalizeBulkStockInputUnit(value: unknown): BulkStockInputUnit {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    normalized === "kg" ||
    normalized.includes("kilo") ||
    normalized.includes("kilogram")
  ) {
    return "kg";
  }

  if (normalized === "lb" || normalized.includes("libra")) {
    return "lb";
  }

  return DEFAULT_BULK_STOCK_INPUT_UNIT;
}

function getBulkStockInputStep(inputUnit: BulkStockInputUnit) {
  return inputUnit === "qq" ? "0.01" : "0.001";
}

function getBulkStockInputUnitLabel(inputUnit: BulkStockInputUnit) {
  return (
    BULK_STOCK_INPUT_UNIT_OPTIONS.find((option) => option.value === inputUnit)
      ?.label ?? "Libras"
  );
}

function getBulkStockUnitPounds(inputUnit: BulkStockInputUnit) {
  if (inputUnit === "qq") {
    return COMMERCIAL_QUINTAL_TO_POUNDS;
  }

  if (inputUnit === "kg") {
    return KILOGRAM_TO_POUNDS;
  }

  return 1;
}

function getBulkInventoryUnitCostValue(product: Pick<Product, "purchase_cost">) {
  const purchaseCost = normalizeOptionalMoney(product.purchase_cost);

  if (purchaseCost === null) {
    return null;
  }

  if (purchaseCost >= 10) {
    return normalizeMoney(purchaseCost / COMMERCIAL_QUINTAL_TO_POUNDS);
  }

  return purchaseCost;
}

function getBulkPurchaseCostInputValue(
  product: Pick<Product, "purchase_cost">,
  inputUnit: BulkStockInputUnit,
) {
  const unitCost = getBulkInventoryUnitCostValue(product);

  return unitCost === null || unitCost <= 0
    ? ""
    : formatMoneyInputValue(unitCost * getBulkStockUnitPounds(inputUnit));
}

function getStoredProductPurchaseCostValue(form: ProductForm) {
  const stock = parseFloat(form.stock || "0");
  if (stock <= 0) return 0;
  const purchaseCost = normalizeMoney(form.purchase_cost || 0);

  if (normalizeProductMeasurementUnit(form.measurement_unit) !== "lb") {
    return purchaseCost;
  }

  const unitPounds = getBulkStockUnitPounds(form.purchase_cost_input_unit);

  return unitPounds > 0 ? normalizeMoney(purchaseCost / unitPounds) : purchaseCost;
}

function convertBulkInputValueToUnit(
  value: string,
  currentUnit: BulkStockInputUnit,
  nextUnit: BulkStockInputUnit,
) {
  if (!value.trim()) {
    return value;
  }

  const pounds = convertBulkStockInputToPounds(value, currentUnit, 0);

  return formatBulkStockInputValue(pounds, nextUnit);
}

function convertBulkStockInputToPounds(
  value: string,
  inputUnit: BulkStockInputUnit,
  fallbackPounds: number,
) {
  const quantity = getFiniteNumberInput(value, Number.NaN);

  if (!Number.isFinite(quantity)) {
    return fallbackPounds;
  }

  if (inputUnit === "qq") {
    return Number((quantity * COMMERCIAL_QUINTAL_TO_POUNDS).toFixed(3));
  }

  if (inputUnit === "kg") {
    return Number((quantity * KILOGRAM_TO_POUNDS).toFixed(3));
  }

  return Number(quantity.toFixed(3));
}

function getPreferredBulkStockInputUnit(value: unknown): BulkStockInputUnit {
  const pounds = Number(value);

  if (!Number.isFinite(pounds) || pounds <= 0) {
    return DEFAULT_BULK_STOCK_INPUT_UNIT;
  }

  return pounds >= COMMERCIAL_QUINTAL_TO_POUNDS ? "qq" : "lb";
}

function formatBulkStockInputValue(
  poundsValue: unknown,
  inputUnit: BulkStockInputUnit,
) {
  const pounds = Number(poundsValue);

  if (!Number.isFinite(pounds) || pounds < 0) {
    return "";
  }

  if (inputUnit === "qq") {
    return formatDecimalInputValue(pounds / COMMERCIAL_QUINTAL_TO_POUNDS);
  }

  if (inputUnit === "kg") {
    return formatDecimalInputValue(pounds / KILOGRAM_TO_POUNDS);
  }

  return formatDecimalInputValue(pounds);
}

function formatDecimalInputValue(value: number) {
  return Number(value.toFixed(3)).toString();
}

function getPositiveUnitQuantity(value: unknown, fallback = 1) {
  const quantity = Number(value);

  return Number.isFinite(quantity) && quantity > 0 ? quantity : fallback;
}

function formatMoneyInputValue(value: unknown) {
  const money = normalizeMoney(value);

  if (!Number.isFinite(money)) {
    return "";
  }

  return (Math.round((money + Number.EPSILON) * 100) / 100).toFixed(2);
}

function getBulkStockPoundsInfo(value: string, inputUnit: BulkStockInputUnit) {
  if (inputUnit === "lb") {
    return "";
  }

  if (!value.trim()) {
    return inputUnit === "qq"
      ? "1 quintal comercial = 100 lb"
      : "1 kilo = 2.20 lb";
  }

  const pounds = convertBulkStockInputToPounds(value, inputUnit, 0);

  return `Equivale a ${formatPoundInfoQuantity(pounds)} lb`;
}

function formatPoundInfoQuantity(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(normalizeMoney(value));
}

function formatSignedMoney(value: number) {
  const normalized = normalizeMoney(value);
  const sign = normalized > 0 ? "+" : normalized < 0 ? "-" : "";
  return `${sign}$${Math.abs(normalized).toFixed(2)}`;
}

function getStoredAdminSession() {
  if (typeof window === "undefined") {
    return false;
  }

  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "admin";
}

function getRequestedAdminSection() {
  if (typeof window === "undefined") {
    return null;
  }

  return getKnownAdminSection(
    new URLSearchParams(window.location.search).get("section"),
  );
}

function getStoredAdminActiveSection() {
  if (typeof window === "undefined") {
    return null;
  }

  return getKnownAdminSection(window.localStorage.getItem(ADMIN_ACTIVE_SECTION_KEY));
}

function storeAdminActiveSection(section: AdminSection) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_ACTIVE_SECTION_KEY, section);
}

function getStoredAdminSalesTab(): "orders" | "billing" | "transfers" | "cash-handovers" {
  const value = getStoredAdminValue(ADMIN_SALES_TAB_KEY);
  return value === "billing" ||
    value === "transfers" ||
    value === "cash-handovers"
    ? value
    : "orders";
}

function getStoredAdminValue(key: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(key) ?? "";
}

function storeAdminValue(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.localStorage.setItem(key, value);
    return;
  }

  window.localStorage.removeItem(key);
}

function getStoredAdminProductForm(): ProductForm | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const storedForm = window.localStorage.getItem(ADMIN_PRODUCT_FORM_KEY);

    if (!storedForm) {
      return null;
    }

    return normalizeStoredProductForm(JSON.parse(storedForm));
  } catch {
    return null;
  }
}

function storeAdminProductForm(form: ProductForm) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_PRODUCT_FORM_KEY, JSON.stringify(form));
}

function clearStoredAdminProductForm() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ADMIN_PRODUCT_FORM_KEY);
}

function hasProductFormDraft(form: ProductForm) {
  return (
    Boolean(form.id) ||
    Boolean(form.category_id) ||
    Boolean(form.category_name.trim()) ||
    Boolean(form.name.trim()) ||
    Boolean(form.sku.trim()) ||
    Boolean(form.product_code.trim()) ||
    Boolean(form.description.trim()) ||
    Boolean(form.purchase_cost.trim()) ||
    form.purchase_cost_input_unit !== emptyProductForm.purchase_cost_input_unit ||
    Boolean(form.price.trim()) ||
    Boolean(form.stock.trim() && form.stock !== emptyProductForm.stock) ||
    form.stock_presentation_id !== emptyProductForm.stock_presentation_id ||
    form.stock_input_unit !== emptyProductForm.stock_input_unit ||
    Boolean(form.min_stock.trim() && form.min_stock !== emptyProductForm.min_stock) ||
    form.min_stock_presentation_id !==
      emptyProductForm.min_stock_presentation_id ||
    form.min_stock_input_unit !== emptyProductForm.min_stock_input_unit ||
    Boolean(form.max_stock.trim() && form.max_stock !== emptyProductForm.max_stock) ||
    form.max_stock_presentation_id !==
      emptyProductForm.max_stock_presentation_id ||
    form.max_stock_input_unit !== emptyProductForm.max_stock_input_unit ||
    Boolean(form.image_url.trim()) ||
    Boolean(form.provider.trim()) ||
    form.has_iva !== emptyProductForm.has_iva ||
    Boolean(form.iva_rate.trim() && form.iva_rate !== emptyProductForm.iva_rate) ||
    form.requires_dates !== emptyProductForm.requires_dates ||
    form.measurement_unit !== emptyProductForm.measurement_unit ||
    form.presentations.length > 0
  );
}

function normalizeStoredProductForm(value: unknown): ProductForm | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const form = value as Partial<Record<keyof ProductForm, unknown>>;
  const measurementUnit = normalizeProductMeasurementUnit(
    getStringValue(form.measurement_unit),
  );
  const storedMinStockInputUnit = getStringValue(form.min_stock_input_unit);

  return {
    id: getStringValue(form.id),
    category_id: getStringValue(form.category_id),
    category_name: getStringValue(form.category_name),
    name: getStringValue(form.name),
    sku: getStringValue(form.sku),
    product_code: normalizeProductCodeInput(getStringValue(form.product_code)),
    description: getStringValue(form.description),
    purchase_cost: getStringValue(form.purchase_cost),
    purchase_cost_input_unit: normalizeBulkStockInputUnit(
      getStringValue(form.purchase_cost_input_unit),
    ),
    price: getStringValue(form.price),
    measurement_unit: measurementUnit,
    stock: getStringValue(form.stock) || emptyProductForm.stock,
    stock_presentation_id:
      getStringValue(form.stock_presentation_id) ||
      DEFAULT_STOCK_PRESENTATION_ID,
    stock_input_unit: normalizeBulkStockInputUnit(
      getStringValue(form.stock_input_unit),
    ),
    min_stock: getStringValue(form.min_stock) || emptyProductForm.min_stock,
    min_stock_presentation_id:
      getStringValue(form.min_stock_presentation_id) ||
      DEFAULT_STOCK_PRESENTATION_ID,
    min_stock_input_unit: storedMinStockInputUnit
      ? normalizeBulkStockInputUnit(storedMinStockInputUnit)
      : measurementUnit === "lb"
        ? "lb"
        : emptyProductForm.min_stock_input_unit,
    max_stock: getStringValue(form.max_stock) || emptyProductForm.max_stock,
    max_stock_presentation_id:
      getStringValue(form.max_stock_presentation_id) ||
      DEFAULT_STOCK_PRESENTATION_ID,
    max_stock_input_unit: normalizeBulkStockInputUnit(
      getStringValue(form.max_stock_input_unit),
    ),
    image_url: getStringValue(form.image_url),
    provider: getStringValue(form.provider),
    is_active: true,
    has_iva: form.has_iva === true,
    iva_rate: getStringValue(form.iva_rate) || emptyProductForm.iva_rate,
    requires_dates: form.requires_dates === true,
    entry_date: getStringValue(form.entry_date),
    manufacture_date: getStringValue(form.manufacture_date),
    expiration_date: getStringValue(form.expiration_date),
    presentations: normalizeStoredProductPresentationDrafts(
      form.presentations,
    ),
  };
}

function normalizeStoredProductPresentationDrafts(
  value: unknown,
): ProductPresentationDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Partial<ProductPresentationDraft> =>
      Boolean(entry && typeof entry === "object"),
    )
    .map((entry) =>
      createProductPresentationDraft({
        id: getStringValue(entry.id),
        name: getStringValue(entry.name) || "Unidad",
        unit_quantity: getStringValue(entry.unit_quantity) || "1",
        price: getStringValue(entry.price),
        is_default: Boolean(entry.is_default),
        is_active: entry.is_active !== false,
        use_for_purchase: entry.use_for_purchase !== false,
        use_for_sale: entry.use_for_sale !== false,
      }),
    );
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function getStoredAdminBoolean(key: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(key) === "true";
}

function storeAdminBoolean(key: string, value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, String(value));
}

function getStoredAdminScrollPosition(section: AdminSection) {
  if (typeof window === "undefined") {
    return 0;
  }

  try {
    const positions = JSON.parse(
      window.localStorage.getItem(ADMIN_SCROLL_POSITIONS_KEY) ?? "{}",
    ) as Record<string, number>;

    return Number.isFinite(positions[section]) ? positions[section] : 0;
  } catch {
    return 0;
  }
}

function storeAdminScrollPosition(section: AdminSection, scrollY: number) {
  if (typeof window === "undefined" || !Number.isFinite(scrollY)) {
    return;
  }

  try {
    const positions = JSON.parse(
      window.localStorage.getItem(ADMIN_SCROLL_POSITIONS_KEY) ?? "{}",
    ) as Record<string, number>;

    window.localStorage.setItem(
      ADMIN_SCROLL_POSITIONS_KEY,
      JSON.stringify({
        ...positions,
        [section]: Math.max(0, Math.round(scrollY)),
      }),
    );
  } catch {
    window.localStorage.setItem(
      ADMIN_SCROLL_POSITIONS_KEY,
      JSON.stringify({ [section]: Math.max(0, Math.round(scrollY)) }),
    );
  }
}

function getStoredAdminNavOrder() {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_NAV_ORDER;
  }

  try {
    const storedOrder = window.localStorage.getItem(ADMIN_NAV_ORDER_KEY);

    if (!storedOrder) {
      return DEFAULT_ADMIN_NAV_ORDER;
    }

    return normalizeAdminNavOrder(JSON.parse(storedOrder));
  } catch {
    return DEFAULT_ADMIN_NAV_ORDER;
  }
}

function storeAdminNavOrder(order: AdminSection[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ADMIN_NAV_ORDER_KEY,
    JSON.stringify(normalizeAdminNavOrder(order)),
  );
}

function normalizeAdminNavOrder(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_ADMIN_NAV_ORDER;
  }

  const sections = value
    .map((entry) => (typeof entry === "string" ? getAdminSection(entry) : null))
    .filter((section): section is AdminSection => Boolean(section));
  const uniqueSections = sections.filter(
    (section, index) => sections.indexOf(section) === index,
  );
  const normalizedSections = [...uniqueSections];

  for (const section of DEFAULT_ADMIN_NAV_ORDER) {
    if (normalizedSections.includes(section)) {
      continue;
    }

    const defaultIndex = DEFAULT_ADMIN_NAV_ORDER.indexOf(section);
    let insertIndex = normalizedSections.length;

    for (let index = defaultIndex - 1; index >= 0; index--) {
      const previousSection = DEFAULT_ADMIN_NAV_ORDER[index];
      const previousIndex = normalizedSections.indexOf(previousSection);

      if (previousIndex >= 0) {
        insertIndex = previousIndex + 1;
        break;
      }
    }

    normalizedSections.splice(insertIndex, 0, section);
  }

  return normalizedSections;
}

function getAdminSection(value: string | null) {
  if (!value) {
    return null;
  }

  return DEFAULT_ADMIN_NAV_ORDER.find((section) => section === value) ?? null;
}

function isProductCreationAdminSection(section: AdminSection) {
  return section === "purchases" || section === "create-product";
}

function getKnownAdminSection(value: string | null) {
  if (!value) {
    return null;
  }

  return ALL_ADMIN_SECTIONS.find((section) => section === value) ?? null;
}

function SalesReceiptPreview({
  invoice,
  onResolveAlert,
}: {
  invoice: InvoiceRecord;
  onResolveAlert?: (invoice: InvoiceRecord) => void;
}) {
  const deliveryTypeLabel = getInvoiceDeliveryTypeLabel(invoice);
  const deliveryDetail = getInvoiceDeliveryDetail(invoice);
  const paymentMethod = getInvoicePaymentLabel(invoice);
  const changeNeeded = getInvoiceNoteValue(invoice, ["necesita cambio/vuelto"]);

  return (
    <article className="sales-invoice-preview">
      <header className="sales-invoice-header">
        <div className="sales-invoice-brand">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain bg-white rounded-md p-1" />
          <span className="flex flex-col gap-1">
            <strong>MINIMARKET VALLOLET</strong>
            <small>Comprobante de venta</small>
          </span>
        </div>
        <div className="sales-invoice-number">
          <span>{getInvoiceStatusLabel(invoice.status)}</span>
           {(() => {
             const match = invoice.notes?.match(/Cliente confirmo que recibio el pedido: (Si|No)/i);
             if (match) {
               const isYes = match[1].toLowerCase() === 'si';
               const isResolved = invoice.notes?.includes('Si (Resuelto)') || false;
               return (
                 <div className="flex items-center gap-2 flex-wrap">
                   <span className={`font-bold text-[11px] px-2 py-0.5 rounded inline-block w-fit mt-1 mb-1 ${isYes ? 'bg-green-600 !text-white' : 'bg-red-600 !text-white'}`}>
                     {isYes ? '✅ Cliente confirmó recepción' : '❌ Cliente indicó NO haber recibido'}
                   </span>
                   {!isYes && !isResolved && (
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         if (confirm('¿Marcar este problema como resuelto?')) {
                           onResolveAlert?.(invoice);
                         }
                       }}
                       className="bg-stone-800 hover:bg-stone-700 text-white text-xs px-2 py-1 rounded font-bold transition-colors"
                     >
                       ✔ Resolver Alerta
                     </button>
                   )}
                 </div>
               );
             }
             return null;
          })()}
          <strong>{invoice.invoice_number}</strong>
          <small>{formatDateTime(invoice.created_at)}</small>
        </div>
      </header>

      <div className="sales-invoice-info-grid">
        <section>
          <span>Cliente</span>
          <strong>{invoice.customer_name || "Consumidor final"}</strong>
          <small>Cedula/RUC: {invoice.customer_identity ?? "No registrada"}</small>
          <small>Telefono: {invoice.customer_phone ?? "No registrado"}</small>
        </section>
        <section>
          <span>Entrega y pago ({getInvoiceChannelLabel(invoice.channel)})</span>
          <strong>{deliveryTypeLabel}</strong>
          <small>{deliveryDetail}</small>
          <small>Pago: <strong>{paymentMethod}</strong></small>
          {(() => {
            const bankMatch = invoice.notes?.match(/Banco:\s*([^\n]+)/);
            if (bankMatch) {
              return (
                <div className="mt-1">
                  <span className="bg-blue-100 text-blue-800 font-extrabold text-[12px] px-2 py-1 rounded border border-blue-200 shadow-sm inline-flex items-center gap-1">
                    🏦 Banco: {bankMatch[1].trim()}
                  </span>
                </div>
              );
            }
            return null;
          })()}
        </section>
      </div>

      <InvoiceOperationSummary invoice={invoice} />

      <div className="sales-invoice-table-wrap">
        <table className="sales-invoice-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th className="text-right">P. Unitario sin IVA</th>
              <th className="text-right">IVA</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => {
              const ivaRate = item.has_iva ? (item.iva_rate || 15) : 0;
              const displayTotal = item.line_total;
              const ivaAmount = ivaRate > 0 ? Number((displayTotal * ivaRate / 100).toFixed(2)) : 0;
              const totalItem = displayTotal + ivaAmount;

              return (
                <tr key={item.id}>
                  <td>{item.product_name}</td>
                  <td>{formatInvoiceItemSaleQuantity(item)}</td>
                  <td className="text-right">{formatMoney(displayTotal)}</td>
                  <td className="text-right">{formatMoney(ivaAmount)}</td>
                  <td className="text-right font-medium">{formatMoney(totalItem)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="sales-invoice-summary-row">
              <td colSpan={2} className="sales-invoice-summary-empty" />
              <td className="text-right font-bold text-black pb-2 pt-4">Subtotal</td>
              <td className="text-right font-bold text-black pb-2 pt-4">IVA (15%)</td>
              <td className="text-right font-bold text-black pb-2 pt-4">Total</td>
            </tr>
            <tr className="sales-invoice-summary-row">
              <td colSpan={2} className="sales-invoice-summary-empty" />
              <td className="text-right font-bold text-black pb-4">{formatMoney(invoice.subtotal)}</td>
              <td className="text-right font-bold text-black pb-4">{formatMoney(invoice.total - invoice.subtotal)}</td>
              <td className="text-right font-bold text-black pb-4">{formatMoney(invoice.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <footer className="sales-invoice-footer">
        <p>Documento informativo, no factura tributaria.</p>
      </footer>
    </article>
  );
}

function InvoiceOperationSummary({ invoice }: { invoice: InvoiceRecord }) {
  const fulfillment = getInvoiceFulfillmentSummary(invoice);
  const lines = getInvoiceFulfillmentLines(fulfillment);

  return (
    <section className="order-audit-panel">
      <div className="order-audit-heading">
        <span>
          <ReceiptText size={16} aria-hidden="true" />
          Operacion del pedido
        </span>
      </div>
      <dl className="order-audit-lines">
        {lines.map((line) => (
          <div className="order-audit-line" key={line.label}>
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function getInvoiceFulfillmentSummary(invoice: InvoiceRecord) {
  return {
    deliveryName: invoice.delivery_user_name ?? "No asignado",
    deliveredAt: formatInvoiceDateTimeOrPending(invoice.delivered_at),
    dispatchedAt: formatInvoiceDateTimeOrPending(invoice.dispatched_at),
    employeeName: invoice.employee_user_name ?? "Administrador",
    isPickup: isPickupInvoice(invoice),
  };
}

function getInvoiceFulfillmentLines(
  fulfillment: ReturnType<typeof getInvoiceFulfillmentSummary>,
) {
  const lines = [
    {
      label: "Empleado que despacho",
      value: fulfillment.employeeName,
    },
  ];

  if (!fulfillment.isPickup) {
    lines.push(
      {
        label: "Delivery asignado",
        value: fulfillment.deliveryName,
      },
      {
        label: "Enviado",
        value: fulfillment.dispatchedAt,
      },
    );
  }

  lines.push({
    label: "Entregado",
    value: fulfillment.deliveredAt,
  });

  return lines;
}

function getInvoicePersonDetail(
  identity?: string | null,
  phone?: string | null,
) {
  const parts = [
    identity ? `Cedula/RUC: ${identity}` : null,
    phone ? `Telefono: ${phone}` : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "Sin datos registrados";
}

function formatInvoiceDateTimeOrPending(value?: string | null) {
  return value ? formatDateTime(value) : "No registrado";
}

async function downloadSalesReceiptPdf(invoice: InvoiceRecord) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const accent = [225, 12, 77] as const;
  const accentDark = [139, 16, 55] as const;
  const ink = [42, 28, 34] as const;
  const muted = [109, 91, 98] as const;
  const soft = [255, 242, 246] as const;
  const fulfillment = getInvoiceFulfillmentSummary(invoice);
  let y = 0;

  let logoBase64: string | null = null;
  try {
    const res = await fetch("/logo.png");
    if (res.ok) {
      const blob = await res.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.error("Failed to load logo", err);
  }

  const drawPageHeader = (compact = false) => {
    const height = compact ? 25 : 42;
    doc.setFillColor(...accent);
    doc.rect(0, 0, pageWidth, height, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");

    if (!compact) {
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(margin, 11, 19, 19, 4, 4, "F");
      if (logoBase64) {
        doc.addImage(logoBase64, "PNG", margin + 1, 12, 17, 17);
      } else {
        doc.setTextColor(...accent);
        doc.setFontSize(11);
        doc.text("MV", margin + 9.5, 23, { align: "center" });
      }
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(17);
      doc.text("MINIMARKET VALLOLET", margin + 25, 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("COMPROBANTE DE VENTA", margin + 25, 25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(invoice.invoice_number, pageWidth - margin, 17, {
        align: "right",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(formatDateTime(invoice.created_at), pageWidth - margin, 24, {
        align: "right",
      });
      y = 49;
    } else {
      doc.setFontSize(12);
      doc.text("MINIMARKET VALLOLET", margin, 11);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`${invoice.invoice_number} - continuacion`, margin, 17);
      y = 31;
    }
  };

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 20) {
      return;
    }
    doc.addPage();
    drawPageHeader(true);
  };

  const drawTableHeader = () => {
    ensureSpace(12);
    doc.setFillColor(...accentDark);
    doc.roundedRect(margin, y, contentWidth, 9, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.text("PRODUCTO", margin + 3, y + 5.8);
    doc.text("CANTIDAD", 88, y + 5.8, { align: "right" });
    doc.text("P. SIN IVA", 122, y + 5.8, { align: "right" });
    doc.text("P. CON IVA", 158, y + 5.8, { align: "right" });
    doc.text("TOTAL", pageWidth - margin - 3, y + 5.8, { align: "right" });
    y += 11;
  };

  drawPageHeader();

  doc.setFillColor(...soft);
  doc.roundedRect(margin, y, contentWidth, 18, 3, 3, "F");
  doc.setTextColor(...muted);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("ESTADO", margin + 4, y + 5);
  doc.text("CANAL", margin + 62, y + 5);
  doc.text("PAGO", margin + 116, y + 5);
  doc.setTextColor(...ink);
  doc.setFontSize(10);
  doc.text(getInvoiceStatusLabel(invoice.status), margin + 4, y + 12);
  doc.text(getInvoiceChannelLabel(invoice.channel), margin + 62, y + 12);
  doc.text(getInvoicePaymentLabel(invoice), margin + 116, y + 12);
  y += 24;

  const deliveryTypeLabel = getInvoiceDeliveryTypeLabel(invoice);
  const deliveryDetail = getInvoiceDeliveryDetail(invoice);
  const address = deliveryDetail;
  const addressLines = doc.splitTextToSize(address, 79) as string[];
  const infoHeight = Math.max(29, addressLines.length * 4 + 17);
  doc.setDrawColor(235, 213, 220);
  doc.setFillColor(255, 252, 250);
  doc.roundedRect(margin, y, 87, infoHeight, 3, 3, "FD");
  doc.roundedRect(margin + 93, y, contentWidth - 93, infoHeight, 3, 3, "FD");
  doc.setTextColor(...accentDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("CLIENTE", margin + 4, y + 6);
  doc.text("ENTREGA", margin + 97, y + 6);
  doc.setTextColor(...ink);
  doc.setFontSize(10);
  doc.text(invoice.customer_name || "Consumidor final", margin + 4, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Cedula/RUC: ${invoice.customer_identity ?? "No registrada"}`, margin + 4, y + 19);
  doc.text(`Telefono: ${invoice.customer_phone ?? "No registrado"}`, margin + 4, y + 24);
  doc.setFont("helvetica", "bold");
  doc.text(deliveryTypeLabel, margin + 97, y + 13);
  doc.setFont("helvetica", "normal");
  doc.text(addressLines, margin + 97, y + 19);
  y += infoHeight + 7;

  const operationLines = getInvoiceFulfillmentLines(fulfillment);
  const operationTextLines = operationLines.flatMap((line) =>
    doc.splitTextToSize(`${line.label}: ${line.value}`, contentWidth - 8) as string[],
  );
  const operationHeight = Math.max(24, operationTextLines.length * 4 + 13);
  ensureSpace(operationHeight + 8);
  doc.setDrawColor(235, 213, 220);
  doc.setFillColor(255, 252, 250);
  doc.roundedRect(margin, y, contentWidth, operationHeight, 3, 3, "FD");
  doc.setTextColor(...accentDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("OPERACION DEL PEDIDO", margin + 4, y + 6);
  doc.setTextColor(...ink);
  doc.setFontSize(8.2);
  operationTextLines.forEach((line, index) => {
    doc.setFont(
      "helvetica",
      operationLines.some((entry) => line.startsWith(`${entry.label}:`))
        ? "bold"
        : "normal",
    );
    doc.text(line, margin + 4, y + 13 + index * 4);
  });
  y += operationHeight + 7;

  drawTableHeader();
  for (const item of invoice.items) {
    const ivaRate = item.has_iva && item.iva_rate ? item.iva_rate : 0;
    const unitPriceSinIva = item.unit_price;
    const unitPriceConIva = unitPriceSinIva + Number((unitPriceSinIva * ivaRate / 100).toFixed(2));
    const totalItem = item.line_total + Number((item.line_total * ivaRate / 100).toFixed(2));
    const productLines = doc.splitTextToSize(item.product_name, 68) as string[];
    const unitWithIvaLabel = `${formatMoney(unitPriceConIva)}${ivaRate > 0 ? ` (${formatIvaRateLabel(ivaRate)}%)` : ""}`;
    const rowHeight = Math.max(11, productLines.length * 4 + 5);
    if (y + rowHeight > pageHeight - 30) {
      doc.addPage();
      drawPageHeader(true);
      drawTableHeader();
    }
    doc.setFillColor(255, 249, 251);
    doc.rect(margin, y, contentWidth, rowHeight, "F");
    doc.setDrawColor(244, 224, 229);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(productLines, margin + 3, y + 6);
    doc.setFont("helvetica", "normal");
    doc.text(formatInvoiceItemSaleQuantity(item), 88, y + 6, {
      align: "right",
    });
    doc.text(formatMoney(unitPriceSinIva), 122, y + 6, { align: "right" });
    doc.text(unitWithIvaLabel, 158, y + 6, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.text(formatMoney(totalItem), pageWidth - margin - 3, y + 6, {
      align: "right",
    });
    y += rowHeight;
  }

  ensureSpace(34);
  y += 5;
  doc.setDrawColor(244, 224, 229);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setFontSize(8.5);
  doc.setTextColor(...ink);
  doc.setFont("helvetica", "bold");
  doc.text("Subtotal", 122, y + 8, { align: "right" });
  doc.text(formatMoney(invoice.subtotal), 158, y + 8, { align: "right" });
  doc.text("IVA", 122, y + 15, { align: "right" });
  doc.text(formatMoney(invoice.total - invoice.subtotal), 158, y + 15, {
    align: "right",
  });
  doc.setDrawColor(230, 184, 198);
  doc.line(132, y + 19, pageWidth - margin - 3, y + 19);
  doc.setTextColor(...accentDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", 158, y + 27, { align: "right" });
  doc.text(formatMoney(invoice.total), pageWidth - margin - 3, y + 27, {
    align: "right",
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(238, 214, 221);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(
      "Gracias por su compra. Documento informativo, no factura tributaria.",
      margin,
      pageHeight - 9,
    );
    doc.text(`Pagina ${page} de ${pageCount}`, pageWidth - margin, pageHeight - 9, {
      align: "right",
    });
  }

  const fileName = invoice.invoice_number.replace(/[^a-z0-9-_]/gi, "-");
  doc.save(`${fileName}-comprobante.pdf`);
}

function formatInvoiceItemSaleQuantity(item: InvoiceRecord["items"][number]) {
  if (
    item.presentation_name &&
    item.presentation_name.toLowerCase() !== "libra"
  ) {
    return formatProductQuantity(item.quantity);
  }

  if (item.stock_unit === "lb") {
    return `${formatProductQuantity(item.stock_quantity ?? item.quantity)} lb`;
  }

  return formatProductQuantity(item.quantity);
}

function formatIvaRateLabel(rate: number) {
  return Number.isInteger(rate) ? rate.toString() : rate.toFixed(2).replace(/\.?0+$/, "");
}

function getInvoiceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    confirmed: "Confirmada",
    preparing: "Preparando",
    delivered: "Entregada",
    cancelled: "Anulada",
  };

  return labels[status] ?? status;
}

function getInvoicePaymentLabel(invoice: InvoiceRecord) {
  return getInvoiceNoteValue(invoice, ["pago", "metodo"]) ?? "Por confirmar";
}

function getInvoiceDeliveryTypeLabel(invoice: InvoiceRecord) {
  return isPickupInvoice(invoice) ? "Retiro en el local" : "Entrega a domicilio";
}

function getInvoiceDeliveryDetail(invoice: InvoiceRecord) {
  if (isPickupInvoice(invoice)) {
    const ticket = getInvoicePickupTicket(invoice);
    return ticket ? `Ticket: ${ticket}` : "Cliente retira en el local";
  }

  return (
    getInvoiceNoteValue(invoice, ["direccion"]) ??
    "Por confirmar desde la app o el chatbot"
  );
}

function isPickupInvoice(invoice: InvoiceRecord) {
  return invoice.notes?.toUpperCase().includes("RETIRO EN LOCAL") ?? false;
}

function getInvoicePickupTicket(invoice: InvoiceRecord) {
  return invoice.notes?.match(/TICKET:\s*([^\n]+)/)?.[1]?.trim() ?? null;
}

function getInvoiceNoteValue(invoice: InvoiceRecord, labels: string[]) {
  const normalizedLabels = new Set(labels.map((label) => label.toLowerCase()));

  for (const line of invoice.notes?.split(/\r?\n/) ?? []) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex < 0) {
      continue;
    }

    const label = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    if (normalizedLabels.has(label) && value) {
      return value;
    }
  }

  return null;
}

function getInvoiceChannelLabel(channel: string) {
  const labels: Record<string, string> = {
    android: "Android",
    chatbot: "Chatbot",
    web: "Web",
  };

  return labels[channel] ?? channel;
}

function getTodayInputDate() {
  const today = new Date();

  return formatDateInputParts(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate(),
  );
}

function createPurchaseCode(date = new Date()) {
  const pad = (value: number, size = 2) => String(value).padStart(size, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const milliseconds = pad(date.getMilliseconds(), 3);

  return `COMP-${year}${month}${day}-${hours}${minutes}${seconds}-${milliseconds}`;
}

function getCatalogExcelDownloadFilename(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `Catalogo_de_productos_${year}-${month}-${day}_(${hours}-${minutes}-${seconds}).xlsx`;
}

function getWorkbookProductRows(workbook: XLSX.WorkBook) {
  const preferredSheetName = workbook.SheetNames.find(
    (sheetName) => normalizeExcelHeader(sheetName) === "productos",
  );
  const sheetNames = preferredSheetName
    ? [
        preferredSheetName,
        ...workbook.SheetNames.filter((sheetName) => sheetName !== preferredSheetName),
      ]
    : workbook.SheetNames;

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    const rows = XLSX.utils.sheet_to_json<ExcelProductValue[]>(worksheet, {
      blankrows: false,
      defval: "",
      header: 1,
    });
    const headerRowIndex = rows.findIndex(isExcelProductHeaderRow);

    if (headerRowIndex === -1) {
      continue;
    }

    const headers = rows[headerRowIndex];
    return rows
      .slice(headerRowIndex + 1)
      .map((row) => buildExcelProductRow(headers, row))
      .filter(hasExcelProductRowValues);
  }

  throw new Error("No se encontro una hoja de productos valida.");
}

function getWorkbookImageUrlMap(workbook: XLSX.WorkBook) {
  const imageSheetName = workbook.SheetNames.find((sheetName) =>
    ["imagenes", "imagenesdelcatalogo"].includes(
      normalizeExcelHeader(sheetName),
    ),
  );
  const imageUrls = new Map<string, string>();

  if (!imageSheetName) {
    return imageUrls;
  }

  const worksheet = workbook.Sheets[imageSheetName];
  if (!worksheet) {
    return imageUrls;
  }

  const rows = XLSX.utils.sheet_to_json<ExcelProductValue[]>(worksheet, {
    blankrows: false,
    defval: "",
    header: 1,
  });
  const headerRowIndex = rows.findIndex(isCatalogImageHeaderRow);

  if (headerRowIndex === -1) {
    return imageUrls;
  }

  const headers = rows[headerRowIndex];

  rows
    .slice(headerRowIndex + 1)
    .map((row) => buildExcelProductRow(headers, row))
    .forEach((row) => {
      const name = normalizeStringExcelValue(
        getExcelValue(row, ["Producto", "Nombre", "producto", "nombre"]),
      );
      const sku = normalizeStringExcelValue(
        getExcelValue(row, [
          "Codigo Interno",
          "Codigo de Producto",
          "Codigo",
          "codigo_interno",
          "Codigo de Barras",
          "Codigo Barras",
          "codigo_barras",
          "SKU",
          "sku",
        ]),
      );
      const imageUrl = getPublicCatalogImageUrl(
        normalizeStringExcelValue(
          getExcelValue(row, [
            "URL Imagen",
            "Imagen",
            "URL",
            "url_imagen",
            "image_url",
          ]),
        ),
      );

      if (!imageUrl) {
        return;
      }

      getCatalogImageLookupKeys({ name, sku }).forEach((key) => {
        imageUrls.set(key, imageUrl);
      });
    });

  return imageUrls;
}

function isCatalogImageHeaderRow(row: ExcelProductValue[]) {
  const normalizedHeaders = new Set(
    row.map((value) => normalizeExcelHeader(String(value ?? ""))),
  );

  return (
    (normalizedHeaders.has("producto") || normalizedHeaders.has("nombre")) &&
    (normalizedHeaders.has("urlimagen") ||
      normalizedHeaders.has("imagen") ||
      normalizedHeaders.has("url"))
  );
}

function getCatalogImageUrlForProduct(
  imageUrls: Map<string, string>,
  product: { name: string; sku: string },
) {
  for (const key of getCatalogImageLookupKeys(product)) {
    const imageUrl = imageUrls.get(key);

    if (imageUrl) {
      return imageUrl;
    }
  }

  return "";
}

function getCatalogImageLookupKeys(product: {
  name?: string | null;
  sku?: string | null;
}) {
  const keys: string[] = [];
  const sku = normalizeProductSku(product.sku ?? "");
  const name = normalizeProductName(product.name ?? "");

  if (sku) {
    keys.push(`sku:${sku}`);
  }

  if (name) {
    keys.push(`name:${name}`);
  }

  return keys;
}

function isExcelProductHeaderRow(row: ExcelProductValue[]) {
  const normalizedHeaders = new Set(
    row.map((value) => normalizeExcelHeader(String(value ?? ""))),
  );

  return (
    normalizedHeaders.has("nombre") &&
    (normalizedHeaders.has("codigointerno") ||
      normalizedHeaders.has("codigodeproducto") ||
      normalizedHeaders.has("codigo") ||
      normalizedHeaders.has("codigodebarras") ||
      normalizedHeaders.has("codigobarras") ||
      normalizedHeaders.has("sku"))
  );
}

function buildExcelProductRow(
  headers: ExcelProductValue[],
  values: ExcelProductValue[],
) {
  return headers.reduce<ExcelProductRow>((acc, header, index) => {
    const key = normalizeStringExcelValue(header);

    if (key) {
      acc[key] = values[index];
    }

    return acc;
  }, {});
}

function hasExcelProductRowValues(row: ExcelProductRow) {
  return Object.values(row).some(
    (value) => normalizeStringExcelValue(value) !== "",
  );
}

function getExcelValue(row: ExcelProductRow, aliases: string[]) {
  for (const alias of aliases) {
    const directValue = row[alias];

    if (directValue !== undefined && directValue !== null && directValue !== "") {
      return directValue;
    }
  }

  const normalizedAliases = new Set(aliases.map(normalizeExcelHeader));
  const matchingKey = Object.keys(row).find((key) =>
    normalizedAliases.has(normalizeExcelHeader(key)),
  );

  if (!matchingKey) {
    return undefined;
  }

  const value = row[matchingKey];
  return value === "" ? undefined : value;
}

function normalizeStringExcelValue(value: ExcelProductValue) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeNumberExcelValue(
  value: ExcelProductValue,
  fallback: number,
) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (value instanceof Date) {
    return fallback;
  }

  let text = String(value).trim().replace(/[^\d,.-]/g, "");
  if (!text) {
    return fallback;
  }

  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");

  if (lastComma > lastDot) {
    text = text.replace(/\./g, "").replace(",", ".");
  } else {
    text = text.replace(/,/g, "");
  }

  const number = Number(text);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeExcelMeasurementUnit(
  value: ExcelProductValue,
): ProductMeasurementUnit {
  const normalized = normalizeExcelHeader(String(value ?? ""));

  if (
    normalized.includes("lb") ||
    normalized.includes("libra") ||
    normalized.includes("granel") ||
    normalized.includes("quintal") ||
    normalized.includes("kg") ||
    normalized.includes("kilo")
  ) {
    return "lb" satisfies ProductMeasurementUnit;
  }

  return "unit" satisfies ProductMeasurementUnit;
}

function getMeasurementUnitExcelLabel(
  value: ProductMeasurementUnit | null | undefined,
) {
  return normalizeProductMeasurementUnit(value) === "lb" ? "Granel" : "Unidad";
}

function normalizeExcelHeader(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeDateInput(value: ExcelProductValue) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return formatDateInputParts(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate(),
    );
  }

  if (typeof value === "number") {
    return normalizeExcelSerialDate(value);
  }

  const text = String(value).trim();

  if (!text) {
    return null;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const dayMonthYearMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayMonthYearMatch) {
    return formatDateInputParts(
      Number(dayMonthYearMatch[3]),
      Number(dayMonthYearMatch[2]),
      Number(dayMonthYearMatch[1]),
    );
  }

  const numericValue = Number(text);
  if (!Number.isNaN(numericValue)) {
    return normalizeExcelSerialDate(numericValue);
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDateInputParts(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
}

function normalizeExcelSerialDate(value: number) {
  const parsed = XLSX.SSF.parse_date_code(value);

  if (!parsed) {
    return null;
  }

  return formatDateInputParts(parsed.y, parsed.m, parsed.d);
}

function formatDateInputParts(year: number, month: number, day: number) {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

type CatalogExcelSummary = {
  activeCount: number;
  categoryCount: number;
  generatedAt: Date;
  inventoryCost: number;
  inventoryValue: number;
  lowStockCount: number;
  productCount: number;
};

type ProductExcelRowOverride = {
  entry_date?: string | null;
  expiration_date?: string | null;
  manufacture_date?: string | null;
  provider?: string | null;
  purchase_cost?: number | null;
  stock?: number;
};

function buildCatalogExcelRows(
  products: Product[],
  categories: Category[],
): CatalogExcelRow[] {
  const categoryNames = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const productsByCategory = new Map<string, Product[]>();
  const uncategorizedProducts: Product[] = [];

  for (const product of products) {
    if (product.category_id && categoryNames.has(product.category_id)) {
      const categoryProducts = productsByCategory.get(product.category_id) ?? [];
      categoryProducts.push(product);
      productsByCategory.set(product.category_id, categoryProducts);
      continue;
    }

    uncategorizedProducts.push(product);
  }

  const categoryRows = categories.flatMap((category) => {
    const categoryProducts = productsByCategory.get(category.id) ?? [];

    if (!categoryProducts.length) {
      return [buildEmptyCategoryExcelRow(category)];
    }

    return categoryProducts.flatMap((product) =>
      buildProductExcelRows(product, category.name),
    );
  });

  return [
    ...categoryRows,
    ...uncategorizedProducts.flatMap((product) =>
      buildProductExcelRows(
        product,
        product.categories?.name ?? "Sin categoria",
      ),
    ),
  ];
}

function buildProductExcelRows(
  product: Product,
  categoryName: string,
): CatalogExcelRow[] {
  const lots = getAvailableProductLots(product);

  if (!lots.length) {
    return [buildProductExcelRow(product, categoryName)];
  }

  const lotRows = lots.map((lot) =>
    buildProductExcelRow(product, categoryName, {
      entry_date: lot.entry_date ?? product.entry_date ?? null,
      expiration_date: lot.expiration_date ?? product.expiration_date ?? null,
      manufacture_date:
        lot.manufacture_date ?? product.manufacture_date ?? null,
      provider: getProductLotProviderName(lot) || product.provider || "",
      purchase_cost: lot.unit_cost ?? product.purchase_cost ?? 0,
      stock: Number(lot.quantity_remaining) || 0,
    }),
  );
  const lotStock = lots.reduce(
    (sum, lot) => Number((sum + Number(lot.quantity_remaining || 0)).toFixed(3)),
    0,
  );
  const residualStock = Number((product.stock - lotStock).toFixed(3));

  if (residualStock > 0) {
    lotRows.push(
      buildProductExcelRow(product, categoryName, {
        stock: residualStock,
      }),
    );
  }

  return lotRows;
}

function buildProductExcelRow(
  product: Product,
  categoryName: string,
  override: ProductExcelRowOverride = {},
): CatalogExcelRow {
  return {
    __categoryId: product.category_id ?? undefined,
    __rowType: "product",
    Nombre: product.name,
    "Codigo Interno": product.sku,
    Descripcion: product.description ?? "",
    "Costo Compra": override.purchase_cost ?? product.purchase_cost ?? 0,
    Precio: product.price,
    "Unidad Medida": getMeasurementUnitExcelLabel(product.measurement_unit),
    Stock: override.stock ?? product.stock,
    "Stock Minimo": product.min_stock,
    "Stock Maximo": product.max_stock ?? 100,
    Categoria: categoryName,
    Proveedor: override.provider ?? product.provider ?? "",
    "Fecha Ingreso": normalizeDateInput(override.entry_date ?? product.entry_date) ?? "",
    "Fecha Fabricacion":
      normalizeDateInput(override.manufacture_date ?? product.manufacture_date) ??
      "",
    "Fecha Caducidad":
      normalizeDateInput(override.expiration_date ?? product.expiration_date) ??
      "",
    Imagen: product.image_url?.trim() ?? "",
  };
}

function buildEmptyCategoryExcelRow(category: Category): CatalogExcelRow {
  return {
    __categoryId: category.id,
    __rowType: "category",
    Nombre: "Categoria sin productos",
    "Codigo Interno": "",
    Descripcion: "Pendiente de productos",
    "Costo Compra": "",
    Precio: "",
    "Unidad Medida": "",
    Stock: "",
    "Stock Minimo": "",
    "Stock Maximo": "",
    Categoria: category.name,
    Proveedor: "",
    "Fecha Ingreso": "",
    "Fecha Fabricacion": "",
    "Fecha Caducidad": "",
    Imagen: "",
  };
}

function normalizeCatalogSearchText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function buildCategoryComboboxOptions(
  categories: Category[],
  query: string,
): AdminComboboxOption[] {
  return getRankedComboboxItems(
    categories,
    query,
    (category) => category.name,
  )
    .map(({ item }) => ({
      id: item.id,
      label: item.name,
      description: "Categoria registrada",
    }));
}

function buildProviderComboboxOptions(
  providers: ProviderSummary[],
  query: string,
  priorityProviderNames: string[] = [],
  limit = 8,
): AdminComboboxOption[] {
  const priorityKeys = new Set(
    priorityProviderNames.map((providerName) =>
      normalizeCatalogSearchText(providerName),
    ),
  );

  return getRankedComboboxItems(
    providers,
    query,
    (provider) => provider.name,
    (provider) =>
      [
        provider.ruc ?? "",
        provider.address ?? "",
        provider.phone ?? "",
        provider.notes ?? "",
        provider.products.map((product) => product.name).join(" "),
      ].join(" "),
  )
    .sort((first, second) => {
      const firstPriority = priorityKeys.has(
        normalizeCatalogSearchText(first.item.name),
      );
      const secondPriority = priorityKeys.has(
        normalizeCatalogSearchText(second.item.name),
      );

      if (firstPriority !== secondPriority) {
        return firstPriority ? -1 : 1;
      }

      return second.score - first.score ||
        first.item.name.localeCompare(second.item.name, "es-EC");
    })
    .slice(0, limit)
    .map(({ item }) => ({
      id: item.id ?? item.name,
      label: item.name,
      badge: priorityKeys.has(normalizeCatalogSearchText(item.name))
        ? "Del producto"
        : undefined,
      description: [
        item.ruc ? `RUC ${item.ruc}` : null,
        item.phone ? `Tel. ${item.phone}` : null,
        `${item.products.length} producto${
          item.products.length === 1 ? "" : "s"
        } asociado${item.products.length === 1 ? "" : "s"}`,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
}

function buildProductComboboxOptions(
  products: Product[],
  query: string,
  limit = 8,
): AdminComboboxOption[] {
  return getRankedComboboxItems(
    products,
    query,
    (product) => product.name,
    (product) =>
      [
        product.sku,
        product.description ?? "",
        product.categories?.name ?? "",
        product.provider ?? "",
        getProductProviderNames(product).join(" "),
      ].join(" "),
  )
    .slice(0, limit)
    .map(({ item }) => ({
      id: item.id,
      label: item.name,
      badge: item.sku,
      description: `${item.categories?.name ?? "Sin categoria"} · Stock ${formatProductStockWithPresentationBreakdown(
        item,
      )}`,
    }));
}

function buildProductPresentationComboboxOptions(
  presentations: ProductPresentation[],
  query: string,
): AdminComboboxOption[] {
  return getRankedComboboxItems(
    presentations,
    query,
    (presentation) => presentation.name,
    (presentation) =>
      [presentation.unit_quantity, formatMoney(presentation.price)].join(" "),
  )
    .slice(0, 8)
    .map(({ item }) => ({
      id: item.id,
      label: item.name,
      badge: `${formatProductQuantity(item.unit_quantity)} und`,
      description: `Descuenta ${formatProductQuantity(
        item.unit_quantity,
      )} und - ${formatMoney(item.price)}`,
    }));
}

function getPresentationPurchaseCostInputValue(
  product: Product,
  unitQuantity: number,
  presentationPrice?: number | null,
) {
  const cost = getPresentationPurchaseCostValue(
    product,
    unitQuantity,
    presentationPrice,
  );

  return cost !== null && cost > 0 ? formatMoneyInputValue(cost) : "";
}

function getPresentationPurchaseCostValue(
  product: Product,
  unitQuantity: number,
  presentationPrice?: number | null,
) {
  return getPurchaseUnitCostValue(
    product,
    normalizeProductMeasurementUnit(product.measurement_unit),
    Math.max(1, unitQuantity),
    presentationPrice,
  );
}

function getPurchaseUnitCostValue(
  product: Product,
  measurementUnit: ProductMeasurementUnit,
  stockQuantityPerPurchaseUnit: number,
  presentationPrice?: number | null,
) {
  const purchaseCost = normalizeOptionalMoney(product.purchase_cost);

  if (purchaseCost === null) {
    return null;
  }

  const stockQuantity = Math.max(1, Number(stockQuantityPerPurchaseUnit) || 1);

  if (measurementUnit === "lb") {
    return normalizeMoney(
      (getBulkInventoryUnitCostValue(product) ?? purchaseCost) * stockQuantity,
    );
  }

  if (stockQuantity <= 1) {
    return normalizeMoney(purchaseCost);
  }

  const expandedCost = normalizeMoney(purchaseCost * stockQuantity);
  const salePrice = normalizeOptionalMoney(presentationPrice);

  if (salePrice && salePrice > 0 && expandedCost > salePrice * 2) {
    return purchaseCost;
  }

  return expandedCost;
}

function getResolvedProviderName(
  providers: ProviderSummary[],
  query: string,
) {
  return getResolvedComboboxItem(
    providers,
    query,
    (provider) => provider.name,
  )?.name ?? null;
}

function getExactComboboxItem<T>(
  items: T[],
  query: string,
  getLabel: (item: T) => string,
) {
  const normalizedQuery = normalizeCatalogSearchText(query);

  if (!normalizedQuery) {
    return null;
  }

  return (
    items.find(
      (item) => normalizeCatalogSearchText(getLabel(item)) === normalizedQuery,
    ) ?? null
  );
}

function isComboboxExactMatch<T>(
  items: T[],
  query: string,
  getLabel: (item: T) => string,
) {
  return Boolean(getExactComboboxItem(items, query, getLabel));
}

function getResolvedComboboxItem<T>(
  items: T[],
  query: string,
  getLabel: (item: T) => string,
  getSearchText?: (item: T) => string,
) {
  const exactMatch = getExactComboboxItem(items, query, getLabel);

  if (exactMatch) {
    return exactMatch;
  }

  const normalizedQuery = normalizeCatalogSearchText(query);

  if (normalizedQuery.length < 2) {
    return null;
  }

  const rankedItems = getRankedComboboxItems(
    items,
    query,
    getLabel,
    getSearchText,
  );
  const first = rankedItems[0];
  const second = rankedItems[1];

  if (!first || first.score < 70) {
    return null;
  }

  if (!second || first.score > second.score) {
    return first.item;
  }

  return null;
}

function getRankedComboboxItems<T>(
  items: T[],
  query: string,
  getLabel: (item: T) => string,
  getSearchText?: (item: T) => string,
) {
  const normalizedQuery = normalizeCatalogSearchText(query);

  return items
    .map((item) => {
      const label = getLabel(item);
      const score = getComboboxMatchScore(
        label,
        normalizedQuery,
        getSearchText?.(item) ?? "",
      );

      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (first, second) =>
        second.score - first.score ||
        getLabel(first.item).localeCompare(getLabel(second.item), "es-EC"),
    );
}

function getComboboxMatchScore(
  label: string,
  normalizedQuery: string,
  searchText = "",
) {
  const normalizedLabel = normalizeCatalogSearchText(label);
  const normalizedText = normalizeCatalogSearchText(`${label} ${searchText}`);

  if (!normalizedQuery) {
    return 1;
  }

  if (normalizedLabel === normalizedQuery) {
    return 100;
  }

  if (normalizedLabel.startsWith(normalizedQuery)) {
    return 92;
  }

  if (normalizedText.includes(normalizedQuery)) {
    return 82;
  }

  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
  const textWords = normalizedText.split(/\s+/).filter(Boolean);

  if (
    queryTerms.length &&
    queryTerms.every((term) =>
      textWords.some((word) => isComboboxWordMatch(word, term)),
    )
  ) {
    return 72;
  }

  return 0;
}

function isComboboxWordMatch(word: string, query: string) {
  if (word.startsWith(query) || word.includes(query)) {
    return true;
  }

  if (query.length >= 5 && Math.abs(word.length - query.length) <= 2) {
    return getBoundedEditDistance(word, query, 2) <= 2;
  }

  return false;
}

function getBoundedEditDistance(first: string, second: string, limit: number) {
  const rows = first.length + 1;
  const cols = second.length + 1;
  let previous = Array.from({ length: cols }, (_, index) => index);

  for (let row = 1; row < rows; row++) {
    const current = [row];
    let rowMinimum = current[0];

    for (let col = 1; col < cols; col++) {
      const cost = first[row - 1] === second[col - 1] ? 0 : 1;
      const value = Math.min(
        previous[col] + 1,
        current[col - 1] + 1,
        previous[col - 1] + cost,
      );
      current[col] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }

    if (rowMinimum > limit) {
      return limit + 1;
    }

    previous = current;
  }

  return previous[cols - 1] ?? limit + 1;
}

function buildCatalogExcelWorkbook(
  rows: CatalogExcelRow[],
  summary: CatalogExcelSummary,
) {
  const workbook = XLSX.utils.book_new();
  workbook.Props = {
    Author: "Minimarket",
    CreatedDate: summary.generatedAt,
    Subject: "Catalogo de productos",
    Title: "Catalogo de productos",
  };

  XLSX.utils.book_append_sheet(
    workbook,
    buildCatalogSummarySheet(rows, summary),
    "Resumen",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildCatalogProductsSheet(rows, summary.generatedAt),
    "Productos",
  );

  return workbook;
}

function buildCatalogSummarySheet(
  rows: CatalogExcelRow[],
  summary: CatalogExcelSummary,
) {
  const emptyCategoryCount = rows.filter((row) => row.__rowType === "category").length;
  const categoryCounts = rows.reduce<Record<string, number>>((acc, row) => {
    const categoryName = row.Categoria || "Sin categoria";
    acc[categoryName] = (acc[categoryName] ?? 0) + 1;
    return acc;
  }, {});
  const categoryRows = Object.entries(categoryCounts)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([category, count]) => [category, count]);

  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Minimarket - Catalogo de productos"],
    [`Actualizado: ${formatDateTime(summary.generatedAt.toISOString())}`],
    [],
    ["Indicador", "Valor"],
    ["Productos", summary.productCount],
    ["Productos activos", summary.activeCount],
    ["Stock bajo", summary.lowStockCount],
    ["Categorias", summary.categoryCount],
    ["Categorias sin productos", emptyCategoryCount],
    ["Filas en Excel", rows.length],
    ["Costo inventario", summary.inventoryCost],
    ["Valor del inventario", summary.inventoryValue],
    [],
    ["Categorias", "Productos"],
    ...categoryRows,
  ]);

  worksheet["!cols"] = [{ wch: 34 }, { wch: 18 }];
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ];
  worksheet["!rows"] = [{ hpt: 28 }, { hpt: 21 }, { hpt: 8 }];

  applyCellStyle(worksheet, "A1", excelTitleStyle);
  applyCellStyle(worksheet, "A2", excelMutedStyle);
  applyRowStyle(worksheet, 3, 2, excelHeaderStyle);
  applyRowStyle(worksheet, 13, 2, excelHeaderStyle);

  for (let rowIndex = 4; rowIndex <= 11; rowIndex++) {
    applyCellStyle(worksheet, `A${rowIndex + 1}`, excelLabelStyle);
    applyCellStyle(worksheet, `B${rowIndex + 1}`, excelValueStyle);
  }

  for (const address of ["B11", "B12"]) {
    const inventoryCell = worksheet[address] as XLSX.CellObject | undefined;
    if (inventoryCell) {
      inventoryCell.z = "$#,##0.00";
    }
  }

  return worksheet;
}

function buildCatalogProductsSheet(
  rows: CatalogExcelRow[],
  generatedAt: Date,
) {
  const worksheet = XLSX.utils.aoa_to_sheet([
    ["Catalogo de productos"],
    [`Actualizado: ${formatDateTime(generatedAt.toISOString())}`],
    [],
    CATALOG_EXCEL_COLUMNS,
    ...rows.map((row) => CATALOG_EXCEL_COLUMNS.map((column) => row[column])),
  ]);
  const lastColumn = CATALOG_EXCEL_COLUMNS.length - 1;
  const lastRow = Math.max(rows.length + 3, 3);

  worksheet["!cols"] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 42 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 26 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 82 },
  ];
  worksheet["!rows"] = [
    { hpt: 30 },
    { hpt: 21 },
    { hpt: 8 },
    { hpt: 26 },
    ...rows.map(() => ({ hpt: 24 })),
  ];
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastColumn } },
  ];
  worksheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 3, c: 0 },
      e: { r: lastRow, c: lastColumn },
    }),
  };

  applyCellStyle(worksheet, "A1", excelTitleStyle);
  applyCellStyle(worksheet, "A2", excelMutedStyle);
  applyRowStyle(worksheet, 3, CATALOG_EXCEL_COLUMNS.length, excelHeaderStyle);

  rows.forEach((row, index) => {
    const sheetRowIndex = index + 4;
    const rowStyle =
      row.__rowType === "category"
        ? excelCategoryRowStyle
        : index % 2 === 0
          ? excelBodyStyle
          : excelAlternateBodyStyle;
    applyRowStyle(worksheet, sheetRowIndex, CATALOG_EXCEL_COLUMNS.length, rowStyle);

    setNumberFormat(worksheet, sheetRowIndex, 3, "$#,##0.00");
    setNumberFormat(worksheet, sheetRowIndex, 4, "$#,##0.00");
    setNumberFormat(worksheet, sheetRowIndex, 6, "0.###");
    setNumberFormat(worksheet, sheetRowIndex, 7, "0.###");
    setNumberFormat(worksheet, sheetRowIndex, 8, "0.###");
  });

  return worksheet;
}

function getPublicCatalogImageUrl(imageUrl: string) {
  const value = imageUrl.trim();

  if (!value || value.toLowerCase().startsWith("data:")) {
    return "";
  }

  if (!/^https?:\/\//i.test(value)) {
    return "";
  }

  return value;
}

const excelBorder = {
  bottom: { color: { rgb: "D6D3D1" }, style: "thin" },
  left: { color: { rgb: "D6D3D1" }, style: "thin" },
  right: { color: { rgb: "D6D3D1" }, style: "thin" },
  top: { color: { rgb: "D6D3D1" }, style: "thin" },
};

const excelTitleStyle = {
  alignment: { horizontal: "center", vertical: "center" },
  fill: { fgColor: { rgb: "175C4C" }, patternType: "solid" },
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 18 },
};

const excelMutedStyle = {
  alignment: { horizontal: "center", vertical: "center" },
  fill: { fgColor: { rgb: "E7F1EC" }, patternType: "solid" },
  font: { bold: true, color: { rgb: "335C52" }, sz: 11 },
};

const excelHeaderStyle = {
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: excelBorder,
  fill: { fgColor: { rgb: "E0AA1F" }, patternType: "solid" },
  font: { bold: true, color: { rgb: "1C1917" }, sz: 11 },
};

const excelLabelStyle = {
  border: excelBorder,
  fill: { fgColor: { rgb: "F5F5F4" }, patternType: "solid" },
  font: { bold: true, color: { rgb: "292524" } },
};

const excelValueStyle = {
  alignment: { horizontal: "right" },
  border: excelBorder,
  font: { bold: true, color: { rgb: "175C4C" } },
};

const excelBodyStyle = {
  alignment: { vertical: "center" },
  border: excelBorder,
  font: { color: { rgb: "292524" } },
};

const excelAlternateBodyStyle = {
  ...excelBodyStyle,
  fill: { fgColor: { rgb: "FAFAF9" }, patternType: "solid" },
};

const excelCategoryRowStyle = {
  alignment: { vertical: "center", wrapText: true },
  border: excelBorder,
  fill: { fgColor: { rgb: "FEF3C7" }, patternType: "solid" },
  font: { bold: true, color: { rgb: "7C2D12" } },
};

function applyCellStyle(
  worksheet: XLSX.WorkSheet,
  address: string,
  style: object,
) {
  const cell =
    (worksheet[address] as XLSX.CellObject | undefined) ??
    ({ t: "s", v: "" } satisfies XLSX.CellObject);

  cell.s = style;
  worksheet[address] = cell;
}

function applyRowStyle(
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  columnCount: number,
  style: object,
) {
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
    applyCellStyle(
      worksheet,
      XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex }),
      style,
    );
  }
}

function setNumberFormat(
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  columnIndex: number,
  format: string,
) {
  const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
  const cell = worksheet[address] as XLSX.CellObject | undefined;

  if (cell) {
    cell.z = format;
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateValue(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-EC", {
    dateStyle: "short",
  }).format(date);
}

async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    body: formData,
  });
  const data = (await response.json()) as {
    ok: boolean;
    publicUrl?: string;
    error?: string;
  };

  if (!response.ok || !data.ok || !data.publicUrl) {
    throw new Error(data.error ?? "No se pudo subir la imagen.");
  }

  return data.publicUrl;
}

function normalizeProducts(products: Product[]) {
  return products.map((product) => {
    const stock = Number(product.stock) || 0;

    return {
      ...product,
      purchase_cost: stock > 0 ? (normalizeOptionalMoney(product.purchase_cost) ?? 0) : 0,
      price: stock > 0 ? normalizeMoney(product.price) : 0,
      measurement_unit: normalizeProductMeasurementUnit(product.measurement_unit),
      stock,
      min_stock: Number(product.min_stock),
      max_stock:
        product.max_stock === undefined || product.max_stock === null
          ? undefined
          : Number(product.max_stock),
      has_iva: Boolean(product.has_iva),
      iva_rate: normalizeOptionalMoney(product.iva_rate) ?? 0,
      requires_dates: doesProductRequireDates(product),
      entry_date: stock > 0 ? (product.entry_date ?? null) : null,
      manufacture_date: stock > 0 ? (product.manufacture_date ?? null) : null,
      expiration_date: stock > 0 ? (product.expiration_date ?? null) : null,
      provider_links: (product.provider_links ?? []).map(normalizeProductProviderLink),
      lots: (product.lots ?? []).map(normalizeProductLot),
      presentations: (product.presentations ?? []).map((presentation) => ({
        ...presentation,
        name: presentation.name?.trim() || "Unidad",
        unit_quantity: getPositiveUnitQuantity(presentation.unit_quantity, 1),
        price: stock > 0 ? normalizeMoney(presentation.price) : 0,
        is_default: Boolean(presentation.is_default),
      is_active: presentation.is_active !== false,
      use_for_purchase: presentation.use_for_purchase !== false,
      use_for_sale: presentation.use_for_sale !== false,
    })),
  };
});
}

function normalizeProductProviderLink(link: ProductProvider): ProductProvider {
  return {
    ...link,
    is_primary: Boolean(link.is_primary),
    last_purchase_cost:
      link.last_purchase_cost === undefined || link.last_purchase_cost === null
        ? null
        : Number(link.last_purchase_cost),
    last_purchase_quantity:
      link.last_purchase_quantity === undefined ||
      link.last_purchase_quantity === null
        ? null
        : Number(link.last_purchase_quantity),
    provider: link.provider ?? link.providers ?? null,
  };
}

function normalizeProductLot(lot: ProductLot): ProductLot {
  const purchaseInput = getProductLotPurchaseInput(lot);

  return {
    ...lot,
    provider: lot.provider ?? lot.providers ?? null,
    purchase_input_quantity: purchaseInput.quantity,
    purchase_input_unit: purchaseInput.unit,
    quantity_received: Number(lot.quantity_received) || 0,
    quantity_remaining: Number(lot.quantity_remaining) || 0,
    quantity_unit: normalizeProductMeasurementUnit(lot.quantity_unit),
    unit_cost: normalizeOptionalMoney(lot.unit_cost) ?? 0,
    entry_date: lot.entry_date ?? null,
    manufacture_date: lot.manufacture_date ?? null,
    expiration_date: lot.expiration_date ?? null,
    status: lot.status ?? "available",
  };
}

function getProductLotPurchaseInput(lot: ProductLot) {
  const joinedPurchase = Array.isArray(lot.product_purchases)
    ? lot.product_purchases[0] ?? null
    : lot.product_purchases ?? null;
  const quantity =
    lot.purchase_input_quantity === undefined ||
    lot.purchase_input_quantity === null
      ? Number(joinedPurchase?.purchase_input_quantity)
      : Number(lot.purchase_input_quantity);
  const unit =
    lot.purchase_input_unit?.trim() ||
    joinedPurchase?.purchase_input_unit?.trim() ||
    null;

  return {
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : null,
    unit,
  };
}

function findProductSkuDuplicate(
  products: Product[],
  sku: string,
  currentProductId = "",
) {
  const targetSku = normalizeProductSku(sku);

  if (!targetSku) {
    return null;
  }

  return (
    products.find(
      (product) =>
        product.id !== currentProductId &&
        normalizeProductSku(product.sku ?? "") === targetSku,
    ) ?? null
  );
}

function findProductCodeDuplicate(
  products: Product[],
  productCode: string,
  currentProductId = "",
) {
  const targetCode = normalizeProductCodeInput(productCode);

  if (!targetCode) {
    return null;
  }

  return (
    products.find(
      (product) =>
        product.id !== currentProductId &&
        normalizeProductCodeInput(product.product_code ?? "") === targetCode,
    ) ?? null
  );
}

function normalizeProductCodeInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 13);
}

function formatProductCodeInputValue(value: string) {
  const code = normalizeProductCodeInput(value);
  const groups = [
    code.slice(0, 3),
    code.slice(3, 7),
    code.slice(7, 12),
    code.slice(12, 13),
  ].filter(Boolean);

  return groups.join(" ");
}

function isValidOptionalProductCode(value: string) {
  return !value || /^\d{13}$/.test(value);
}

function generateUniqueProductSku(
  products: Product[],
  input: {
    categoryName?: string;
    currentProductId?: string;
    productName?: string;
  } = {},
) {
  const prefix =
    buildProductSkuPrefix(input.productName) ||
    buildProductSkuPrefix(input.categoryName) ||
    "PROD";
  const usedSkus = new Set(
    products
      .filter((product) => product.id !== input.currentProductId)
      .map((product) => normalizeProductSku(product.sku ?? ""))
      .filter(Boolean),
  );

  for (let index = 1; index <= 9999; index++) {
    const sku = `${prefix}-${String(index).padStart(4, "0")}`;

    if (!usedSkus.has(normalizeProductSku(sku))) {
      return sku;
    }
  }

  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function buildProductSkuPrefix(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/g, " ");

  if (!normalized) {
    return "";
  }

  const stopwords = new Set(["DE", "DEL", "EL", "LA", "LAS", "LOS", "Y"]);
  const token =
    normalized
      .split(/\s+/)
      .find((part) => part.length >= 3 && !stopwords.has(part)) ??
    normalized.replace(/\s+/g, "");

  return token.replace(/[^A-Z0-9]/g, "").slice(0, 4) || "";
}

function sortCatalogProductsByName(products: Product[]) {
  return [...products].sort((first, second) => {
    const nameComparison = first.name.localeCompare(second.name, "es-EC", {
      sensitivity: "base",
      numeric: true,
    });

    if (nameComparison) {
      return nameComparison;
    }

    return first.sku.localeCompare(second.sku, "es-EC", {
      sensitivity: "base",
      numeric: true,
    });
  });
}

function updateLocalProviderInProducts(
  products: Product[],
  previousName: string,
  provider: Provider,
) {
  const previousKey = previousName.trim().toLocaleLowerCase("es-EC");
  const providerIdentity = {
    id: provider.id,
    name: provider.name,
  };

  return products.map((product) => {
    let updated = false;
    const nextProviderLinks = (product.provider_links ?? []).map((link) => {
      if (
        !isLocalProviderUpdateTarget(
          link.provider_id,
          getProductProviderName(link),
          provider.id,
          previousKey,
        )
      ) {
        return link;
      }

      updated = true;
      return {
        ...link,
        provider_id: provider.id,
        provider: providerIdentity,
        providers: providerIdentity,
      };
    });
    const nextLots = (product.lots ?? []).map((lot) => {
      if (
        !isLocalProviderUpdateTarget(
          lot.provider_id,
          getProductLotProviderName(lot),
          provider.id,
          previousKey,
        )
      ) {
        return lot;
      }

      updated = true;
      return {
        ...lot,
        provider_id: provider.id,
        provider: providerIdentity,
        providers: providerIdentity,
      };
    });
    const productProviderKey = product.provider
      ?.trim()
      .toLocaleLowerCase("es-EC");
    const nextProductProvider =
      productProviderKey && productProviderKey === previousKey
        ? provider.name
        : product.provider;

    if (nextProductProvider !== product.provider) {
      updated = true;
    }

    if (!updated) {
      return product;
    }

    return {
      ...product,
      provider: nextProductProvider,
      provider_links: product.provider_links ? nextProviderLinks : product.provider_links,
      lots: product.lots ? nextLots : product.lots,
    };
  });
}

function isLocalProviderUpdateTarget(
  providerId: string | null | undefined,
  providerName: string | null | undefined,
  nextProviderId: string,
  previousKey: string,
) {
  const id = providerId?.trim();
  const nameKey = providerName?.trim().toLocaleLowerCase("es-EC");

  return Boolean(
    (id && id === nextProviderId) ||
      (previousKey && nameKey && nameKey === previousKey),
  );
}

function removeLocalProvidersFromProducts(
  products: Product[],
  providerIds: Set<string>,
  providerNameKeys: Set<string>,
) {
  return products.flatMap((product) => {
    const productLinks = product.provider_links ?? [];
    const productLots = product.lots ?? [];
    const structuredAssociationCount =
      productLinks.filter((link) =>
        hasLocalProviderIdentity(getProductProviderName(link), link.provider_id),
      ).length +
      productLots.filter((lot) =>
        hasLocalProviderIdentity(getProductLotProviderName(lot), lot.provider_id),
      ).length;
    let hasSelectedProvider = false;
    let removedQuantity = 0;
    const remainingProviderNames = new Map<string, string>();
    const nextProviderLinks = productLinks.filter((link) => {
      const providerName = getProductProviderName(link);
      const selected = isLocalSelectedProvider(
        link.provider_id,
        providerName,
        providerIds,
        providerNameKeys,
      );

      if (selected) {
        hasSelectedProvider = true;
        return false;
      }

      addLocalProviderName(remainingProviderNames, providerName);
      return true;
    });
    const nextLots = productLots.filter((lot) => {
      const providerName = getProductLotProviderName(lot);
      const selected = isLocalSelectedProvider(
        lot.provider_id,
        providerName,
        providerIds,
        providerNameKeys,
      );

      if (selected) {
        hasSelectedProvider = true;
        removedQuantity = Number(
          (
            removedQuantity + getAvailableProductLotQuantity(lot)
          ).toFixed(3),
        );
        return false;
      }

      addLocalProviderName(remainingProviderNames, providerName);
      return true;
    });
    const legacyProviderKey = product.provider?.trim().toLocaleLowerCase("es-EC");

    if (!structuredAssociationCount && legacyProviderKey) {
      if (providerNameKeys.has(legacyProviderKey)) {
        hasSelectedProvider = true;
      } else {
        addLocalProviderName(remainingProviderNames, product.provider);
      }
    }

    if (!hasSelectedProvider) {
      return [product];
    }

    if (!remainingProviderNames.size) {
      return [];
    }

    const nextProvider = getNextLocalProductProviderName(
      product.provider,
      remainingProviderNames,
    );
    const nextStock = Number(
      Math.max(0, product.stock - removedQuantity).toFixed(3),
    );

    return [
      {
        ...product,
        provider: nextProvider,
        provider_links: nextProviderLinks,
        lots: nextLots,
        stock: nextStock,
      },
    ];
  });
}

function pruneLocalOrphanCategories(categories: Category[], products: Product[]) {
  const categoryIdsWithProducts = new Set(
    products
      .map((product) => product.category_id)
      .filter((categoryId): categoryId is string => Boolean(categoryId)),
  );

  return categories.filter((category) =>
    categoryIdsWithProducts.has(category.id),
  );
}

function pruneLocalOrphanProviders(providers: Provider[], products: Product[]) {
  const providerNameKeysWithProducts = new Set(
    products
      .flatMap((product) => getProductProviderNames(product))
      .map((providerName) => providerName.trim().toLocaleLowerCase("es-EC")),
  );

  return providers.filter((provider) =>
    providerNameKeysWithProducts.has(provider.name.trim().toLocaleLowerCase("es-EC")),
  );
}

function hasLocalProviderIdentity(
  providerName?: string | null,
  providerId?: string | null,
) {
  return Boolean(providerId?.trim() || providerName?.trim());
}

function isLocalSelectedProvider(
  providerId: string | null | undefined,
  providerName: string | null | undefined,
  providerIds: Set<string>,
  providerNameKeys: Set<string>,
) {
  const id = providerId?.trim();
  const nameKey = providerName?.trim().toLocaleLowerCase("es-EC");

  return Boolean(
    (id && providerIds.has(id)) ||
      (nameKey && providerNameKeys.has(nameKey)),
  );
}

function addLocalProviderName(
  providers: Map<string, string>,
  providerName?: string | null,
) {
  const normalizedProvider = providerName?.trim();

  if (!normalizedProvider) {
    return;
  }

  providers.set(
    normalizedProvider.toLocaleLowerCase("es-EC"),
    normalizedProvider,
  );
}

function getNextLocalProductProviderName(
  currentProviderName: string | null | undefined,
  providers: Map<string, string>,
) {
  const currentProviderKey = currentProviderName?.trim().toLocaleLowerCase("es-EC");
  const providerNames = [...providers.values()];

  if (currentProviderKey && providers.has(currentProviderKey)) {
    return currentProviderName?.trim() || providerNames[0] || null;
  }

  return (
    providerNames.sort((first, second) =>
      first.localeCompare(second, "es-EC", { sensitivity: "base" }),
    )[0] ?? null
  );
}

function getProductProviderNames(product: Product) {
  const providers = new Map<string, string>();

  for (const lot of getAvailableProductLots(product)) {
    addProductProviderName(providers, getProductLotProviderName(lot));
  }

  if (providers.size) {
    return sortProductProviderNames(providers);
  }

  for (const link of product.provider_links ?? []) {
    addProductProviderName(providers, getProductProviderName(link));
  }

  if (providers.size) {
    return sortProductProviderNames(providers);
  }

  addProductProviderName(providers, product.provider);

  return sortProductProviderNames(providers);
}

function getProductLinkedProviderNames(product: Product) {
  const providers = new Map<string, string>();

  for (const lot of product.lots ?? []) {
    addProductProviderName(providers, getProductLotProviderName(lot));
  }

  for (const link of product.provider_links ?? []) {
    addProductProviderName(providers, getProductProviderName(link));
  }

  addProductProviderName(providers, product.provider);

  return sortProductProviderNames(providers);
}

function getPreferredProductProviderName(product?: Product | null) {
  if (!product) {
    return "";
  }

  const providerNames = getProductProviderNames(product);
  const legacyProvider = product.provider?.trim();

  if (
    legacyProvider &&
    providerNames.some(
      (providerName) =>
        providerName.toLocaleLowerCase("es-EC") ===
        legacyProvider.toLocaleLowerCase("es-EC"),
    )
  ) {
    return legacyProvider;
  }

  return providerNames[0] ?? "";
}

function addProductProviderName(
  providers: Map<string, string>,
  providerName?: string | null,
) {
  const normalizedProvider = providerName?.trim();

  if (!normalizedProvider) {
    return;
  }

  providers.set(
    normalizedProvider.toLocaleLowerCase("es-EC"),
    normalizedProvider,
  );
}

function sortProductProviderNames(providers: Map<string, string>) {
  return [...providers.values()].sort((first, second) =>
    first.localeCompare(second, "es-EC", { sensitivity: "base" }),
  );
}

function getProductProviderName(link: ProductProvider) {
  return (link.provider?.name ?? link.providers?.name ?? "").trim();
}

function getProductProviderLink(product: Product, providerName: string) {
  const key = providerName.toLocaleLowerCase("es-EC");

  return (
    (product.provider_links ?? []).find(
      (link) =>
        getProductProviderName(link).toLocaleLowerCase("es-EC") === key,
    ) ?? null
  );
}

function getProductLotProviderName(lot: ProductLot) {
  return (lot.provider?.name ?? lot.providers?.name ?? "").trim();
}

function getProductLotDisplayProviderName(product: Product, lot: ProductLot) {
  return getProductLotProviderName(lot) || product.provider?.trim() || "";
}

function getAvailableProductLots(product: Product, providerName?: string) {
  return getProductLots(product, providerName).filter(
    (lot) => getAvailableProductLotQuantity(lot) > 0,
  );
}

function getProductLots(product: Product, providerName?: string) {
  if (Number(product.stock) <= 0) {
    return [];
  }

  const providerKey = providerName?.trim().toLocaleLowerCase("es-EC");

  return (product.lots ?? [])
    .filter((lot) => {
      const remaining = Number(lot.quantity_remaining) || 0;
      if (remaining <= 0) {
        return false;
      }

      if (!providerKey) {
        return true;
      }

      return (
        getProductLotDisplayProviderName(product, lot).toLocaleLowerCase(
          "es-EC",
        ) === providerKey
      );
    })
    .sort(compareProductLots);
}

function getProductLotDisplayRows(product: Product, providerName?: string) {
  const rows = new Map<
    string,
    {
      entry_date?: string | null;
      expiration_date?: string | null;
      manufacture_date?: string | null;
      providerName: string;
      quantity_received: number;
      quantity_remaining: number;
      quantity_unit?: ProductMeasurementUnit | null;
      status?: ProductLot["status"];
      key: string;
      purchaseQuantityReceived: number;
      purchaseQuantityRemaining: number;
      purchaseQuantityLabel: string;
      purchaseReceivedLabel: string;
      purchaseUnitLabel: string;
      purchaseUsesStockUnit: boolean;
      stockEquivalentLabel: string;
    }
  >();

  for (const lot of getProductLots(product, providerName)) {
    const provider =
      getProductLotDisplayProviderName(product, lot) || "Sin proveedor";
    const purchaseDisplay = getLotPurchaseQuantityDisplay(product, lot);
    const key = [
      provider.toLocaleLowerCase("es-EC"),
      purchaseDisplay.unitLabel.toLocaleLowerCase("es-EC"),
      lot.quantity_unit ?? product.measurement_unit,
      lot.entry_date ?? "",
      lot.manufacture_date ?? "",
      lot.expiration_date ?? "",
      lot.status ?? "available",
    ].join("|");
    const current = rows.get(key) ?? {
      entry_date: lot.entry_date,
      expiration_date: lot.expiration_date,
      manufacture_date: lot.manufacture_date,
      providerName: provider,
      quantity_received: 0,
      quantity_remaining: 0,
      quantity_unit: lot.quantity_unit,
      status: lot.status,
      key,
      purchaseQuantityReceived: 0,
      purchaseQuantityRemaining: 0,
      purchaseQuantityLabel: "",
      purchaseReceivedLabel: "",
      purchaseUnitLabel: purchaseDisplay.unitLabel,
      purchaseUsesStockUnit: purchaseDisplay.isStockUnit,
      stockEquivalentLabel: "",
    };
    const remainingPurchaseDisplay = getLotPurchaseQuantityDisplay(
      product,
      lot,
      Number(lot.quantity_remaining) || 0,
    );
    const receivedPurchaseDisplay = getLotPurchaseQuantityDisplay(
      product,
      lot,
      Number(lot.quantity_received) || 0,
    );

    current.quantity_received = Number(
      (current.quantity_received + Number(lot.quantity_received || 0)).toFixed(3),
    );
    current.quantity_remaining = Number(
      (current.quantity_remaining + Number(lot.quantity_remaining || 0)).toFixed(3),
    );
    current.purchaseQuantityRemaining = Number(
      (
        current.purchaseQuantityRemaining + remainingPurchaseDisplay.quantity
      ).toFixed(3),
    );
    current.purchaseQuantityReceived = Number(
      (
        current.purchaseQuantityReceived + receivedPurchaseDisplay.quantity
      ).toFixed(3),
    );
    current.purchaseQuantityLabel = `${formatProductQuantity(
      current.purchaseQuantityRemaining,
    )} ${current.purchaseUnitLabel}`;
    current.purchaseReceivedLabel = `${formatProductQuantity(
      current.purchaseQuantityReceived,
    )} ${current.purchaseUnitLabel}`;
    current.stockEquivalentLabel = current.purchaseUsesStockUnit
      ? ""
      : `Equiv. ${formatLotQuantity(
          current.quantity_remaining,
          lot.quantity_unit ?? product.measurement_unit,
        )}`;
    rows.set(key, current);
  }

  return [...rows.values()].sort((first, second) =>
    compareProductLots(
      {
        id: first.key,
        entry_date: first.entry_date,
        expiration_date: first.expiration_date,
        quantity_remaining: first.quantity_remaining,
        status: first.status,
      } as ProductLot,
      {
        id: second.key,
        entry_date: second.entry_date,
        expiration_date: second.expiration_date,
        quantity_remaining: second.quantity_remaining,
        status: second.status,
      } as ProductLot,
    ),
  );
}

function compareProductLots(first: ProductLot, second: ProductLot) {
  const firstAvailable = getAvailableProductLotQuantity(first) > 0;
  const secondAvailable = getAvailableProductLotQuantity(second) > 0;

  if (firstAvailable !== secondAvailable) {
    return firstAvailable ? -1 : 1;
  }

  const firstEntry = first.entry_date ?? "";
  const secondEntry = second.entry_date ?? "";

  if (firstEntry !== secondEntry) {
    if (!firstEntry) {
      return 1;
    }

    if (!secondEntry) {
      return -1;
    }

    return secondEntry.localeCompare(firstEntry);
  }

  const firstCreatedAt = first.created_at ?? "";
  const secondCreatedAt = second.created_at ?? "";

  if (firstCreatedAt !== secondCreatedAt) {
    return secondCreatedAt.localeCompare(firstCreatedAt);
  }

  const firstExpiration = first.expiration_date || "9999-12-31";
  const secondExpiration = second.expiration_date || "9999-12-31";

  return firstExpiration.localeCompare(secondExpiration);
}

function getProductLotGroups(product: Product, providerName?: string) {
  const groups = new Map<
    string,
    {
      key: string;
      providerName: string;
      quantity: number;
      nextExpiration: string | null;
    }
  >();

  for (const lot of getAvailableProductLots(product, providerName)) {
    const name =
      getProductLotDisplayProviderName(product, lot) || "Sin proveedor";
    const key = name.toLocaleLowerCase("es-EC");
    const current = groups.get(key) ?? {
      key,
      providerName: name,
      quantity: 0,
      nextExpiration: null,
    };
    const expirationDate = lot.expiration_date ?? null;

    current.quantity = Number(
      (current.quantity + Number(lot.quantity_remaining || 0)).toFixed(3),
    );
    if (
      expirationDate &&
      (!current.nextExpiration || expirationDate < current.nextExpiration)
    ) {
      current.nextExpiration = expirationDate;
    }
    groups.set(key, current);
  }

  return [...groups.values()]
    .filter((group) => group.quantity > 0)
    .sort((first, second) => first.providerName.localeCompare(second.providerName));
}

function getProductLotQuantity(product: Product, providerName?: string) {
  return getAvailableProductLots(product, providerName).reduce(
    (sum, lot) => Number((sum + Number(lot.quantity_remaining || 0)).toFixed(3)),
    0,
  );
}

function getProductProviderInventorySaleValue(product: Product, providerName: string) {
  const lotQuantity = getProductLotQuantity(product, providerName);

  if (lotQuantity > 0) {
    return Number(
      (
        getSaleValuePerInventoryUnit(
          product.price,
          normalizeProductMeasurementUnit(product.measurement_unit),
        ) * lotQuantity
      ).toFixed(2),
    );
  }

  return getProductProviderLink(product, providerName)
    ? getProductInventorySaleValue(product)
    : 0;
}

function formatProductLotCount(product: Product) {
  const count = getProductLotGroups(product).length;

  if (!count) {
    return "Sin proveedores";
  }

  return `${count} proveedor${count === 1 ? "" : "es"}`;
}

function normalizeProductLotStatus(status: unknown): ProductLotStatus {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase();

  if (
    normalized === "depleted" ||
    normalized === "returned" ||
    normalized === "adjusted"
  ) {
    return normalized;
  }

  return "available";
}

function getAvailableProductLotQuantity(
  lot: Pick<ProductLot, "quantity_remaining" | "status">,
) {
  return normalizeProductLotStatus(lot.status) === "available"
    ? Math.max(0, Number(lot.quantity_remaining) || 0)
    : 0;
}

function formatLotPurchaseQuantity(
  product: Product,
  stockQuantity: number,
  lot: ProductLot,
) {
  const display = getLotPurchaseQuantityDisplay(product, lot, stockQuantity);

  return `${formatProductQuantity(display.quantity)} ${display.unitLabel}`;
}

function getLotStockEquivalentLabel(
  product: Product,
  lot: ProductLot,
  stockQuantity: number,
) {
  const display = getLotPurchaseQuantityDisplay(product, lot, stockQuantity);

  if (display.isStockUnit) {
    return "";
  }

  return `Equiv. ${formatLotQuantity(stockQuantity, lot.quantity_unit ?? product.measurement_unit)}`;
}

function getLotPurchaseQuantityDisplay(
  product: Product,
  lot: ProductLot,
  stockQuantity = Number(lot.quantity_remaining) || 0,
) {
  const measurementUnit = normalizeProductMeasurementUnit(
    lot.quantity_unit ?? product.measurement_unit,
  );
  const stockUnitLabel = measurementUnit === "lb" ? "lb" : "und";
  const purchaseInput = getProductLotPurchaseInput(lot);

  if (
    purchaseInput.quantity &&
    purchaseInput.unit &&
    !isGenericLotPurchaseUnit(purchaseInput.unit)
  ) {
    if (
      measurementUnit === "lb" &&
      isBulkLotPurchaseInputUnit(purchaseInput.unit)
    ) {
      const receivedStock = Number(lot.quantity_received) || 0;
      const isReceivedTotal =
        receivedStock > 0 &&
        Math.abs(Number(stockQuantity) - receivedStock) < 0.0001;

      return {
        isStockUnit: false,
        quantity: isReceivedTotal
          ? purchaseInput.quantity
          : convertPoundsToBulkLotPurchaseQuantity(
              stockQuantity,
              purchaseInput.unit,
            ),
        unitLabel: purchaseInput.unit,
      };
    }

    const receivedStock = Number(lot.quantity_received) || 0;
    const ratio = receivedStock > 0 ? stockQuantity / receivedStock : 1;

    return {
      isStockUnit: false,
      quantity: Number((purchaseInput.quantity * ratio).toFixed(3)),
      unitLabel: purchaseInput.unit,
    };
  }

  const presentation = getPreferredLotPresentation(product, stockQuantity, lot);

  if (presentation) {
    return {
      isStockUnit: false,
      quantity: Number(
        (stockQuantity / Math.max(1, Number(presentation.unit_quantity) || 1)).toFixed(3),
      ),
      unitLabel: presentation.name,
    };
  }

  return {
    isStockUnit: true,
    quantity: stockQuantity,
    unitLabel: stockUnitLabel,
  };
}

function isBulkLotPurchaseInputUnit(unit: string) {
  const normalized = unit.trim().toLocaleLowerCase("es-EC");

  return (
    normalized === "qq" ||
    normalized.includes("quintal") ||
    normalized === "kg" ||
    normalized.includes("kilo")
  );
}

function convertPoundsToBulkLotPurchaseQuantity(
  poundsValue: number,
  inputUnit: string,
) {
  const pounds = Number(poundsValue) || 0;
  const normalizedInputUnit = normalizeBulkStockInputUnit(inputUnit);
  const quantity =
    normalizedInputUnit === "kg"
      ? pounds / KILOGRAM_TO_POUNDS
      : pounds / COMMERCIAL_QUINTAL_TO_POUNDS;

  return Number(quantity.toFixed(3));
}

function getPreferredLotPresentation(
  product: Product,
  stockQuantity: number,
  lot: ProductLot,
) {
  if (
    normalizeProductMeasurementUnit(lot.quantity_unit ?? product.measurement_unit) !==
    "unit"
  ) {
    return null;
  }

  const presentations = getProductPresentations(product)
    .filter((presentation) => Number(presentation.unit_quantity) > 1)
    .sort((first, second) => second.unit_quantity - first.unit_quantity);

  return presentations.find((presentation) => {
    const unitQuantity = Math.max(1, Number(presentation.unit_quantity) || 1);
    const received = Number(lot.quantity_received) || 0;
    const remaining = Number(stockQuantity) || 0;

    return (
      isWholeQuantity(received / unitQuantity) &&
      isWholeQuantity(remaining / unitQuantity)
    );
  }) ?? null;
}

function isWholeQuantity(value: number) {
  return Number.isFinite(value) && Math.abs(value - Math.round(value)) < 0.0001;
}

function isGenericLotPurchaseUnit(unit: string) {
  const normalized = unit.trim().toLocaleLowerCase("es-EC");

  return ["unit", "unidad", "unidades", "und", "lb", "libra", "libras"].includes(
    normalized,
  );
}

function formatLotQuantity(
  value: number,
  measurementUnit?: ProductMeasurementUnit | null,
) {
  const unit = normalizeProductMeasurementUnit(measurementUnit);

  return `${formatProductQuantity(value)} ${unit === "lb" ? "lb" : "und"}`;
}

function formatLotDate(value?: string | null) {
  return value ? formatDateValue(value) : "Sin fecha";
}

function formatLotStatus(status?: ProductLot["status"]) {
  switch (status) {
    case "available":
      return "Disponible";
    case "depleted":
      return "Agotado";
    case "returned":
      return "Devuelto";
    case "adjusted":
      return "Ajustado";
    default:
      return status || "Disponible";
  }
}

function normalizeProductPurchaseHistory(
  purchases: ProductPurchaseHistoryRecord[],
): ProductPurchaseHistoryRecord[] {
  return purchases.map((purchase) => {
    const quantity = Number(purchase.quantity) || 0;
    const quantityInStockUnit =
      Number(purchase.quantity_in_stock_unit) || quantity;
    const unitCost = normalizeOptionalMoney(purchase.unit_cost) ?? 0;

    return {
      ...purchase,
      product_sku: purchase.product_sku.trim(),
      product_measurement_unit: normalizeProductMeasurementUnit(
        purchase.product_measurement_unit,
      ),
      quantity,
      quantity_in_stock_unit: quantityInStockUnit,
      unit_cost: unitCost,
      total_cost:
        normalizeOptionalMoney(purchase.total_cost) ??
        normalizeMoney(quantityInStockUnit * unitCost),
      purchase_code: purchase.purchase_code?.trim() || null,
      purchase_input_quantity:
        purchase.purchase_input_quantity === undefined ||
        purchase.purchase_input_quantity === null
          ? null
          : Number(purchase.purchase_input_quantity),
      purchase_input_unit: purchase.purchase_input_unit?.trim() || null,
      invoice_number: purchase.invoice_number?.trim() || null,
      invoice_date: purchase.invoice_date?.trim() || null,
      payment_method: purchase.payment_method?.trim() || null,
      credit_days:
        purchase.credit_days === undefined || purchase.credit_days === null
          ? null
          : Number(purchase.credit_days),
      iva_rate: normalizeOptionalMoney(purchase.iva_rate) ?? 0,
      iva_amount: normalizeOptionalMoney(purchase.iva_amount) ?? 0,
      line_subtotal: normalizeOptionalMoney(purchase.line_subtotal),
      line_total: normalizeOptionalMoney(purchase.line_total),
      entry_date: purchase.entry_date ?? null,
      manufacture_date: purchase.manufacture_date ?? null,
      expiration_date: purchase.expiration_date ?? null,
      quantity_remaining:
        purchase.quantity_remaining === undefined ||
        purchase.quantity_remaining === null
          ? null
          : Number(purchase.quantity_remaining),
      created_at: purchase.created_at ?? new Date().toISOString(),
    };
  });
}

function buildPurchaseInvoiceHistoryGroups(
  purchases: ProductPurchaseHistoryRecord[],
): PurchaseInvoiceHistoryGroup[] {
  const groups = new Map<string, PurchaseInvoiceHistoryGroup>();

  for (const purchase of purchases) {
    const purchaseCode = purchase.purchase_code?.trim() || null;
    const invoiceNumber = purchase.invoice_number?.trim() || null;
    const purchaseDate = getPurchaseInvoiceHistoryDate(purchase);
    const providerKey = purchase.provider_id ?? purchase.provider_name ?? "provider";
    const key = purchaseCode
      ? `code:${purchaseCode}`
      : invoiceNumber
        ? `invoice:${providerKey}:${invoiceNumber}:${purchaseDate ?? ""}`
        : `purchase:${purchase.id}`;
    const lineIva = normalizeOptionalMoney(purchase.iva_amount) ?? 0;
    const lineTotal =
      normalizeOptionalMoney(purchase.line_total) ??
      normalizeOptionalMoney(purchase.total_cost) ??
      0;
    const lineSubtotal =
      normalizeOptionalMoney(purchase.line_subtotal) ??
      normalizeMoney(Math.max(0, lineTotal - lineIva));
    const lineGrossSubtotal = getPurchaseHistoryGrossSubtotal(purchase);
    const lineDiscount = normalizeMoney(
      Math.max(0, lineGrossSubtotal - lineSubtotal),
    );
    const current = groups.get(key) ?? {
      id: key,
      purchase_code: purchaseCode,
      invoice_number: invoiceNumber,
      purchase_date: purchaseDate,
      created_at: purchase.created_at,
      provider_id: purchase.provider_id ?? null,
      provider_name: purchase.provider_name ?? null,
      payment_method: purchase.payment_method ?? null,
      credit_days: purchase.credit_days ?? null,
      gross_subtotal: 0,
      discount_amount: 0,
      subtotal: 0,
      iva_amount: 0,
      total: 0,
      lines: [],
    };

    current.lines.push(purchase);
    current.gross_subtotal = normalizeMoney(
      current.gross_subtotal + lineGrossSubtotal,
    );
    current.discount_amount = normalizeMoney(
      current.discount_amount + lineDiscount,
    );
    current.subtotal = normalizeMoney(current.subtotal + lineSubtotal);
    current.iva_amount = normalizeMoney(current.iva_amount + lineIva);
    current.total = normalizeMoney(current.total + lineTotal);

    if (
      getInventoryHistorySortTime(purchase.created_at) >
      getInventoryHistorySortTime(current.created_at)
    ) {
      current.created_at = purchase.created_at;
    }

    groups.set(key, current);
  }

  return [...groups.values()].sort(
    (first, second) =>
      getInventoryHistorySortTime(second.purchase_date ?? second.created_at) -
      getInventoryHistorySortTime(first.purchase_date ?? first.created_at),
  );
}

function filterPurchaseInvoiceHistoryGroups(
  groups: PurchaseInvoiceHistoryGroup[],
  search: string,
  periodFilter: InvoicePeriodFilter = "all",
  dateFilter: string = "",
  endDateFilter: string = ""
) {
  let filtered = groups;

  if (periodFilter !== "all" && dateFilter) {
    filtered = filtered.filter((group) => {
      let dateString = group.purchase_date ?? group.created_at;
      if (!dateString) return false;
      if (dateString.length === 10) {
        dateString += "T00:00:00";
      }
      const targetDate = new Date(dateString);
      if (Number.isNaN(targetDate.getTime())) return false;
      
      const filterDateStr = dateFilter.length === 7 ? `${dateFilter}-01T00:00:00` : `${dateFilter}T00:00:00`;
      const filterDate = new Date(filterDateStr);
      if (Number.isNaN(filterDate.getTime())) return true;
      
      const targetY = targetDate.getFullYear();
      const targetM = targetDate.getMonth();
      const targetD = targetDate.getDate();
      const filterY = filterDate.getFullYear();
      const filterM = filterDate.getMonth();
      const filterD = filterDate.getDate();
      
      if (periodFilter === "day") {
        return targetY === filterY && targetM === filterM && targetD === filterD;
      }
      if (periodFilter === "month") {
        return targetY === filterY && targetM === filterM;
      }
      if (periodFilter === "range") {
        const start = new Date(dateFilter + "T00:00:00");
        let end: Date;
        if (endDateFilter) {
          end = new Date(endDateFilter + "T23:59:59");
        } else {
          end = new Date();
        }
        return targetDate >= start && targetDate <= end;
      }
      return true;
    });
  }

  const query = normalizeCatalogSearchText(search.trim());

  if (!query) {
    return filtered;
  }

  return filtered.filter((group) => {
    const searchText = normalizeCatalogSearchText(
      [
        group.purchase_code ?? "",
        group.invoice_number ?? "",
        group.provider_name ?? "",
        group.payment_method ?? "",
        ...getPurchaseInvoiceDateSearchValues(group.purchase_date),
        ...group.lines.flatMap((line) => [
          line.product_name,
          line.product_sku,
          ...getPurchaseInvoiceDateSearchValues(line.invoice_date),
          ...getPurchaseInvoiceDateSearchValues(line.entry_date),
          ...getPurchaseInvoiceDateSearchValues(line.created_at),
        ]),
      ].join(" "),
    );

    return searchText.includes(query);
  });
}

function getPurchaseInvoiceHistoryTotals(groups: PurchaseInvoiceHistoryGroup[]) {
  return groups.reduce(
    (totals, group) => ({
      invoices: totals.invoices + 1,
      products: totals.products + group.lines.length,
      subtotal: normalizeMoney(totals.subtotal + group.subtotal),
      total: normalizeMoney(totals.total + group.total),
    }),
    { invoices: 0, products: 0, subtotal: 0, total: 0 },
  );
}

function getPurchaseInvoiceHistoryDate(
  purchase: ProductPurchaseHistoryRecord,
) {
  return (
    purchase.entry_date ??
    purchase.invoice_date ??
    getPurchaseInvoiceDateInput(purchase.created_at)
  );
}

function getPurchaseInvoiceDateInput(value?: string | null) {
  if (!value) {
    return null;
  }

  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];

  return isoDate ?? null;
}

function getPurchaseInvoiceDateSearchValues(value?: string | null) {
  const dateInput = getPurchaseInvoiceDateInput(value);

  if (!dateInput) {
    return value ? [value] : [];
  }

  const [year, month, day] = dateInput.split("-");
  const shortYear = year.slice(-2);
  const numericDay = String(Number(day));
  const numericMonth = String(Number(month));

  return [
    dateInput,
    `${day}/${month}/${year}`,
    `${numericDay}/${numericMonth}/${year}`,
    `${day}/${month}/${shortYear}`,
    `${numericDay}/${numericMonth}/${shortYear}`,
  ];
}

function formatPurchaseInvoiceHistoryDate(value: string | null, createdAt?: string) {
  const dateStr = value ? formatDateValue(value) : "Sin fecha";
  if (createdAt) {
    const timeStr = new Date(createdAt).toLocaleTimeString("es-EC", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dateStr} a las ${timeStr}`;
  }
  return dateStr;
}

function formatPurchaseInvoicePaymentMethod(
  paymentMethod: string | null,
  creditDays: number | null,
) {
  if (paymentMethod === "credit") {
    return creditDays && creditDays > 0 ? `Credito - ${creditDays} dias` : "Credito";
  }

  return "Contado";
}

function formatPurchaseHistoryInputQuantity(
  purchase: ProductPurchaseHistoryRecord,
) {
  const quantity =
    purchase.purchase_input_quantity ?? purchase.quantity ?? 0;
  const unit = purchase.purchase_input_unit ?? purchase.quantity_unit ?? "unit";

  return `${formatProductQuantity(quantity)} ${formatPurchaseInputUnit(unit)}`;
}

function formatPurchaseInputUnit(value: string) {
  const normalized = value.trim().toLocaleLowerCase("es-EC");

  if (normalized === "qq") {
    return "qq";
  }

  if (normalized === "kg") {
    return "kg";
  }

  if (normalized === "lb") {
    return "lb";
  }

  if (normalized === "unit") {
    return "und";
  }

  return value;
}

function getLatestSupplierUnitPrice(
  purchases: ProductPurchaseHistoryRecord[],
  productId: string,
  purchaseUnit: string,
  providerName = "",
) {
  const unitKey = normalizePurchaseInputUnitKey(purchaseUnit);
  const providerKey = normalizeCatalogSearchText(providerName);
  let latestPurchase: ProductPurchaseHistoryRecord | null = null;

  for (const purchase of purchases) {
    if (purchase.product_id !== productId) {
      continue;
    }

    if (
      providerKey &&
      normalizeCatalogSearchText(purchase.provider_name ?? "") !== providerKey
    ) {
      continue;
    }

    const savedUnit =
      purchase.purchase_input_unit ?? purchase.quantity_unit ?? "unit";

    if (normalizePurchaseInputUnitKey(savedUnit) !== unitKey) {
      continue;
    }

    if (
      !latestPurchase ||
      getInventoryHistorySortTime(purchase.created_at) >
        getInventoryHistorySortTime(latestPurchase.created_at)
    ) {
      latestPurchase = purchase;
    }
  }

  return latestPurchase
    ? getPurchaseHistoryPurchaseUnitCost(latestPurchase)
    : null;
}

function normalizePurchaseInputUnitKey(value: string) {
  const normalized = normalizeCatalogSearchText(value);

  if (["qq", "quintal", "quintales"].includes(normalized)) {
    return "qq";
  }

  if (["kg", "kilo", "kilos", "kilogramo", "kilogramos"].includes(normalized)) {
    return "kg";
  }

  if (["lb", "libra", "libras"].includes(normalized)) {
    return "lb";
  }

  if (["unit", "unidad", "unidades", "und"].includes(normalized)) {
    return "unit";
  }

  return normalized;
}

function getPurchaseHistoryLineSubtotal(purchase: ProductPurchaseHistoryRecord) {
  const ivaAmount = normalizeOptionalMoney(purchase.iva_amount) ?? 0;
  const total = getPurchaseHistoryLineTotal(purchase);

  return (
    normalizeOptionalMoney(purchase.line_subtotal) ??
    normalizeMoney(Math.max(0, total - ivaAmount))
  );
}

function getPurchaseHistoryGrossSubtotal(purchase: ProductPurchaseHistoryRecord) {
  const purchaseQuantity = Number(purchase.purchase_input_quantity);
  const supplierUnitPrice = normalizeOptionalMoney(purchase.unit_cost);

  if (
    Number.isFinite(purchaseQuantity) &&
    purchaseQuantity > 0 &&
    supplierUnitPrice !== null
  ) {
    return normalizeMoney(
      Math.max(
        purchaseQuantity * supplierUnitPrice,
        getPurchaseHistoryLineSubtotal(purchase),
      ),
    );
  }

  return getPurchaseHistoryLineSubtotal(purchase);
}

function getPurchaseHistoryDiscountAmount(
  purchase: ProductPurchaseHistoryRecord,
) {
  return normalizeMoney(
    Math.max(
      0,
      getPurchaseHistoryGrossSubtotal(purchase) -
        getPurchaseHistoryLineSubtotal(purchase),
    ),
  );
}

function getPurchaseHistoryLineTotal(purchase: ProductPurchaseHistoryRecord) {
  return (
    normalizeOptionalMoney(purchase.line_total) ??
    normalizeOptionalMoney(purchase.total_cost) ??
    0
  );
}

function getPurchaseHistoryPurchaseUnitCost(
  purchase: ProductPurchaseHistoryRecord,
) {
  const purchaseQuantity = Number(purchase.purchase_input_quantity);
  const supplierUnitPrice = normalizeOptionalMoney(purchase.unit_cost);

  if (
    supplierUnitPrice !== null &&
    (!Number.isFinite(purchaseQuantity) ||
      purchaseQuantity <= 0 ||
      supplierUnitPrice * purchaseQuantity >=
        getPurchaseHistoryLineSubtotal(purchase))
  ) {
    return supplierUnitPrice;
  }

  if (Number.isFinite(purchaseQuantity) && purchaseQuantity > 0) {
    return normalizeMoney(getPurchaseHistoryLineSubtotal(purchase) / purchaseQuantity);
  }

  return normalizeOptionalMoney(purchase.unit_cost) ?? 0;
}

function buildInventoryHistoryRows({
  invoices,
  movementFilter,
  productSearch,
  products,
  providerSearch,
  purchases,
  dateFilter,
  endDateFilter,
  periodFilter,
}: {
  invoices: InvoiceRecord[];
  movementFilter: InventoryHistoryMovementFilter;
  productSearch: string;
  products: Product[];
  providerSearch: string;
  purchases: ProductPurchaseHistoryRecord[];
  dateFilter: string;
  endDateFilter: string;
  periodFilter: InventoryHistoryPeriodFilter;
}): InventoryHistoryRow[] {
  const productQuery = normalizeCatalogSearchText(productSearch.trim());
  const providerQuery = normalizeCatalogSearchText(providerSearch.trim());
  const productsById = new Map(products.map((product) => [product.id, product]));
  const rows: InventoryHistoryRow[] = [];

  const isDateInRange = (dateString: string | null) => {
    if (periodFilter === "all" || !dateString) return true;
    if (!dateFilter) return true; 
    const targetDate = new Date(dateString);
    if (Number.isNaN(targetDate.getTime())) return false;
    const filterDateStr = dateFilter.length === 7 ? `${dateFilter}-01T00:00:00` : `${dateFilter}T00:00:00`;
    const filterDate = new Date(filterDateStr);
    if (Number.isNaN(filterDate.getTime())) return true;
    const targetY = targetDate.getFullYear();
    const targetM = targetDate.getMonth();
    const targetD = targetDate.getDate();
    const filterY = filterDate.getFullYear();
    const filterM = filterDate.getMonth();
    const filterD = filterDate.getDate();
    if (periodFilter === "day") {
      return targetY === filterY && targetM === filterM && targetD === filterD;
    }
    if (periodFilter === "month") {
      return targetY === filterY && targetM === filterM;
    }
    if (periodFilter === "range") {
      const start = new Date(dateFilter + "T00:00:00");
      let end: Date;
      if (endDateFilter) {
        end = new Date(endDateFilter + "T23:59:59");
      } else {
        end = new Date(); // If no end date, up to now
      }
      return targetDate >= start && targetDate <= end;
    }
    return true;
  };

  if (movementFilter !== "venta") {
    for (const purchase of purchases) {
      if (!isDateInRange(purchase.created_at ?? purchase.entry_date ?? null)) continue;
      const product = productsById.get(purchase.product_id) ?? null;
      const providerName = getInventoryHistoryProviderDisplay(
        product,
        purchase.provider_name,
        providerSearch,
      );

      if (
        !matchesInventoryHistoryProduct(
          product,
          purchase.product_name,
          purchase.product_sku,
          productQuery,
        ) ||
        !matchesInventoryHistoryProvider(product, providerName, providerQuery)
      ) {
        continue;
      }

      const measurementUnit = normalizeProductMeasurementUnit(
        purchase.product_measurement_unit ??
          product?.measurement_unit ??
          purchase.quantity_unit,
      );
      const purchaseInputQuantity = Number(purchase.purchase_input_quantity);
      const quantity = purchaseInputQuantity > 0 ? purchaseInputQuantity : (Number(purchase.quantity_in_stock_unit) || 0);
      const totalCost = getPurchaseHistoryLineSubtotal(purchase);
      const unitCost =
        quantity > 0 ? normalizeMoney(totalCost / quantity) : 0;
      const registeredAt = purchase.created_at ?? purchase.entry_date ?? null;

      rows.push({
        id: `purchase-${purchase.id}`,
        product_id: product?.id ?? purchase.product_id,
        product_name: product?.name ?? purchase.product_name,
        product_sku: product?.sku ?? purchase.product_sku,
        provider_name: providerName,
        registered_at: registeredAt,
        sold_at: null,
        concept: "compra",
        measurement_unit: measurementUnit,
        entry_quantity: quantity,
        entry_unit_value: unitCost,
        entry_total: totalCost,
        entry_total_with_iva: getPurchaseHistoryLineTotal(purchase),
        entry_presentation_unit: purchaseInputQuantity > 0 ? (purchase.purchase_input_unit ?? null) : null,
        entry_base_price: purchase.base_price ?? null,
        entry_retail_price: purchase.retail_price ?? null,
        entry_unit_base_price: purchase.unit_base_price ?? null,
        entry_unit_retail_price: purchase.unit_retail_price ?? null,
        exit_quantity: null,
        exit_unit_value: null,
        exit_total: null,
        sort_time: getInventoryHistorySortTime(registeredAt),
      });
    }
  }

  if (movementFilter !== "compra") {
    for (const invoice of invoices) {
      if (!isDateInRange(invoice.created_at)) continue;
      if (invoice.status === "cancelled") {
        continue;
      }

      for (const item of invoice.items) {
        const product = getInventoryHistoryInvoiceProduct(
          productsById,
          products,
          item,
        );
        const providerName = getInventoryHistoryProviderDisplay(
          product,
          null,
          providerSearch,
        );

        if (
          !matchesInventoryHistoryProduct(
            product,
            item.product_name,
            product?.sku ?? "",
            productQuery,
          ) ||
          !matchesInventoryHistoryProvider(product, providerName, providerQuery)
        ) {
          continue;
        }

        const measurementUnit = normalizeProductMeasurementUnit(
          item.stock_unit ?? product?.measurement_unit,
        );
        const quantity =
          Number(item.quantity) || Number(item.stock_quantity) || 0;
        const totalSaleValue = normalizeMoney(item.line_total);
        const unitSaleValue =
          quantity > 0 ? normalizeMoney(totalSaleValue / quantity) : 0;
        const productRegisteredAt =
          product?.created_at ?? product?.entry_date ?? null;

        const productUnitCost = product ? getProductUnitCost(product) : 0;
        const totalSaleCost = normalizeMoney(quantity * productUnitCost);

        const saleIva = (product?.has_iva && product?.iva_rate) ? normalizeMoney((totalSaleValue * product.iva_rate) / 100) : 0;
        const totalSaleValueWithIva = totalSaleValue + saleIva;
        const unitSaleValueWithIva = quantity > 0 ? normalizeMoney(totalSaleValueWithIva / quantity) : 0;

        rows.push({
          id: `sale-${invoice.id}-${item.id}`,
          product_id:
            product?.id ?? item.product_id ?? `sale-product-${item.product_name}`,
          product_name: product?.name ?? item.product_name,
          product_sku: product?.sku ?? "",
          provider_name: providerName,
          registered_at: productRegisteredAt,
          sold_at: invoice.created_at,
          concept: "venta",
          measurement_unit: measurementUnit,
          entry_quantity: null,
          entry_unit_value: null,
          entry_total: null,
          entry_total_with_iva: null,
          entry_presentation_unit: null,
          entry_base_price: null,
          entry_retail_price: null,
          entry_unit_base_price: null,
          entry_unit_retail_price: null,
          exit_quantity: quantity,
          exit_unit_cost: productUnitCost,
          exit_total_cost: totalSaleCost,
          exit_unit_value: unitSaleValue,
          exit_unit_value_with_iva: unitSaleValueWithIva,
          exit_total: totalSaleValue,
          exit_total_with_iva: totalSaleValueWithIva,
          exit_presentation_unit: item.presentation_name ?? null,
          sort_time: getInventoryHistorySortTime(invoice.created_at),
        });
      }
    }
  }

  return rows;
}

function sortInventoryHistoryRows(
  rows: InventoryHistoryRow[],
  sort: InventoryHistorySort,
) {
  return [...rows].sort((first, second) =>
    compareInventoryHistoryRows(first, second, sort),
  );
}

function compareInventoryHistoryRows(
  first: InventoryHistoryRow,
  second: InventoryHistoryRow,
  sort: InventoryHistorySort,
) {
  const directionFactor = sort.direction === "asc" ? 1 : -1;
  let primaryDifference = 0;

  if (sort.key === "product_name") {
    primaryDifference =
      first.product_name.localeCompare(second.product_name, "es-EC", {
        numeric: true,
        sensitivity: "base",
      }) * directionFactor;
  } else if (sort.key === "registered_at") {
    primaryDifference = compareInventoryHistoryDateValues(
      first.registered_at,
      second.registered_at,
      sort.direction,
    );
  } else if (sort.key === "sold_at") {
    primaryDifference = compareInventoryHistoryDateValues(
      first.sold_at,
      second.sold_at,
      sort.direction,
    );
  } else {
    primaryDifference = compareInventoryHistoryTimes(
      first.sort_time,
      second.sort_time,
      sort.direction,
    );
  }

  if (primaryDifference) {
    return primaryDifference;
  }

  const fallbackTimeDifference = compareInventoryHistoryTimes(
    first.sort_time,
    second.sort_time,
    "asc",
  );

  if (fallbackTimeDifference) {
    return fallbackTimeDifference;
  }

  if (first.concept !== second.concept) {
    return first.concept === "compra" ? -1 : 1;
  }

  const fallbackProductDifference = first.product_name.localeCompare(
    second.product_name,
    "es-EC",
    { numeric: true, sensitivity: "base" },
  );

  return fallbackProductDifference || first.id.localeCompare(second.id, "es-EC");
}

function compareInventoryHistoryDateValues(
  firstValue: string | null,
  secondValue: string | null,
  direction: SortDirection,
) {
  return compareInventoryHistoryTimes(
    getInventoryHistorySortTime(firstValue),
    getInventoryHistorySortTime(secondValue),
    direction,
  );
}

function compareInventoryHistoryTimes(
  firstTime: number,
  secondTime: number,
  direction: SortDirection,
) {
  const firstMissing = firstTime === Number.MAX_SAFE_INTEGER;
  const secondMissing = secondTime === Number.MAX_SAFE_INTEGER;

  if (firstMissing || secondMissing) {
    if (firstMissing === secondMissing) {
      return 0;
    }

    return firstMissing ? 1 : -1;
  }

  const difference = firstTime - secondTime;

  return direction === "asc" ? difference : -difference;
}

function getInventoryHistoryTotals(rows: InventoryHistoryRow[]) {
  return rows.reduce(
    (totals, row) => ({
      records: totals.records + 1,
      entryValue: normalizeMoney(totals.entryValue + (row.entry_total ?? 0)),
      entryValueWithIva: normalizeMoney(totals.entryValueWithIva + (row.entry_total_with_iva ?? row.entry_total ?? 0)),
      exitValue: normalizeMoney(totals.exitValue + (row.exit_total_cost ?? row.exit_total ?? 0)), // Ensure exitValue (cost) is backward compatible
      exitRevenue: normalizeMoney(totals.exitRevenue + (row.exit_total ?? 0)),
      exitRevenueWithIva: normalizeMoney(totals.exitRevenueWithIva + (row.exit_total_with_iva ?? row.exit_total ?? 0)),
    }),
    { records: 0, entryValue: 0, entryValueWithIva: 0, exitValue: 0, exitRevenue: 0, exitRevenueWithIva: 0 },
  );
}

function normalizeInventoryHistoryMovementFilter(
  value: string,
): InventoryHistoryMovementFilter {
  return value === "compra" || value === "venta" ? value : "all";
}

function getInventoryHistoryProviderDisplay(
  product: Product | null,
  fallbackProviderName: string | null | undefined,
  providerSearch: string,
) {
  const fallback = fallbackProviderName?.trim() || null;

  if (!product) {
    return fallback;
  }

  const providerNames = getProductProviderNames(product);
  const providerQuery = normalizeCatalogSearchText(providerSearch.trim());

  if (providerQuery) {
    const matchingProvider = providerNames.find((providerName) =>
      normalizeCatalogSearchText(providerName).includes(providerQuery),
    );

    if (matchingProvider) {
      return matchingProvider;
    }
  }

  return fallback ?? providerNames[0] ?? null;
}

function matchesInventoryHistoryProduct(
  product: Product | null,
  fallbackName: string,
  fallbackSku: string,
  productQuery: string,
) {
  if (!productQuery) {
    return true;
  }

  const searchText = normalizeCatalogSearchText(
    [
      product?.name ?? fallbackName,
      product?.sku ?? fallbackSku,
      product?.description ?? "",
      product?.categories?.name ?? "",
      product ? getProductProviderNames(product).join(" ") : "",
    ].join(" "),
  );

  return searchText.includes(productQuery);
}

function matchesInventoryHistoryProvider(
  product: Product | null,
  providerName: string | null,
  providerQuery: string,
) {
  if (!providerQuery) {
    return true;
  }

  const providerText = normalizeCatalogSearchText(
    [
      providerName ?? "",
      product ? getProductProviderNames(product).join(" ") : "",
    ].join(" "),
  );

  return providerText.includes(providerQuery);
}

function getInventoryHistoryInvoiceProduct(
  productsById: Map<string, Product>,
  products: Product[],
  item: InvoiceRecord["items"][number],
) {
  if (item.product_id) {
    const product = productsById.get(item.product_id);

    if (product) {
      return product;
    }
  }

  const itemName = normalizeCatalogSearchText(item.product_name);

  return (
    products.find(
      (product) => normalizeCatalogSearchText(product.name) === itemName,
    ) ?? null
  );
}

function getInventoryHistorySortTime(value: string | null) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const date = new Date(normalizeHistoryDateTimeValue(value));

  return Number.isNaN(date.getTime()) ? Number.MAX_SAFE_INTEGER : date.getTime();
}

function normalizeHistoryDateTimeValue(value: string) {
  const trimmedValue = value.trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)
    ? `${trimmedValue}T00:00:00`
    : trimmedValue;
}

function formatHistoryStockLimit(
  value: number | null | undefined,
  product: Product,
) {
  if (value === undefined || value === null) {
    return "-";
  }

  return formatLotQuantity(Number(value), product.measurement_unit);
}

function formatInventoryHistoryMovementQuantity(
  value: number | null,
  measurementUnit: ProductMeasurementUnit,
) {
  return value === null ? "-" : formatLotQuantity(value, measurementUnit);
}

function formatInventoryHistoryMoneyValue(value: number | null) {
  return value === null ? "-" : formatMoney(value);
}

function formatNullableHistoryDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return formatDateTime(normalizeHistoryDateTimeValue(value));
}

function formatProductProviders(product: Product) {
  const providers = getProductProviderNames(product);

  if (!providers.length) {
    return "Sin proveedores asociados.";
  }

  return `Proveedores: ${providers.join(", ")}.`;
}

function mergeLocalDuplicateProduct(
  product: Product,
  input: {
    provider?: string | null;
    purchase_cost?: number | null;
    inventory_unit_cost?: number | null;
    stock: number;
    measurement_unit?: ProductMeasurementUnit | null;
    price: number;
    has_iva?: boolean | null;
    iva_rate?: number | null;
    requires_dates?: boolean | null;
    use_current_purchase_cost?: boolean;
    presentations?: ProductPresentationPayload[];
    purchase_unit_quantity?: number | null;
    sale_presentation_id?: string | null;
    sale_presentation_name?: string | null;
    sale_presentation_unit_quantity?: number | null;
    sale_presentation_price?: number | null;
    entry_date?: string | null;
    manufacture_date?: string | null;
    expiration_date?: string | null;
  },
): Product {
  const providerName = input.provider?.trim() ?? "";
  const stock = Number(product.stock) || 0;
  const incomingStock = Number(input.stock) || 0;
  const nextStock = Number((stock + incomingStock).toFixed(3));
  const incomingCost = normalizeOptionalMoney(input.purchase_cost);
  const incomingInventoryCost =
    normalizeOptionalMoney(input.inventory_unit_cost) ?? incomingCost;
  const currentCost =
    normalizeProductMeasurementUnit(
      input.measurement_unit ?? product.measurement_unit,
    ) === "lb"
      ? getBulkInventoryUnitCostValue(product) ??
        normalizeOptionalMoney(product.purchase_cost) ??
        0
      : normalizeOptionalMoney(product.purchase_cost) ?? 0;
  const requiresDates = input.requires_dates ?? product.requires_dates ?? false;
  const purchaseCost = input.use_current_purchase_cost
    ? incomingInventoryCost ?? currentCost
    : incomingInventoryCost && incomingStock > 0 && nextStock > 0
      ? Number(
          (
            (stock * currentCost + incomingStock * incomingInventoryCost) /
            nextStock
          ).toFixed(2),
        )
      : currentCost;
  const providerLinks = [...(product.provider_links ?? [])];
  const lots = [...(product.lots ?? [])];
  const presentations = mergeLocalProductPresentations(product, input);
  const incomingPrice = normalizeOptionalMoney(input.price);

  if (providerName) {
    const existingLinkIndex = providerLinks.findIndex(
      (link) =>
        getProductProviderName(link).toLocaleLowerCase("es-EC") ===
        providerName.toLocaleLowerCase("es-EC"),
    );
    const providerLink: ProductProvider = {
      id:
        existingLinkIndex >= 0
          ? providerLinks[existingLinkIndex].id
          : `provider-link-${Date.now()}-${Math.random()}`,
      product_id: product.id,
      provider_id:
        existingLinkIndex >= 0
          ? providerLinks[existingLinkIndex].provider_id
          : `provider-${Date.now()}-${Math.random()}`,
      is_primary: !product.provider?.trim(),
      last_purchase_cost: incomingInventoryCost ?? 0,
      last_purchase_quantity: incomingStock,
      last_purchase_unit: isWeightBasedProduct(input) ? "lb" : "unit",
      last_purchase_at: new Date().toISOString(),
      provider: {
        id:
          existingLinkIndex >= 0
            ? providerLinks[existingLinkIndex].provider_id
            : `provider-${providerName}`,
        name: providerName,
      },
    };

    if (existingLinkIndex >= 0) {
      providerLinks[existingLinkIndex] = providerLink;
    } else {
      providerLinks.push(providerLink);
    }
  }

  lots.push(
    ...createLocalProductLots({
      productId: product.id,
      providerName,
      quantity: incomingStock,
      measurementUnit: input.measurement_unit,
      purchaseCost: incomingInventoryCost ?? 0,
      entryDate: input.entry_date ?? null,
      manufactureDate: input.manufacture_date ?? null,
      expirationDate: input.expiration_date ?? null,
    }),
  );

  return {
    ...product,
    price:
      incomingStock > 0 && incomingPrice !== null && incomingPrice > 0
        ? incomingPrice
        : normalizeMoney(product.price),
    has_iva: input.has_iva ?? product.has_iva ?? false,
    iva_rate: input.iva_rate ?? product.iva_rate ?? 0,
    requires_dates: requiresDates,
    stock: nextStock,
    purchase_cost: purchaseCost,
    provider: product.provider?.trim() || providerName || null,
    entry_date: input.entry_date ?? product.entry_date,
    manufacture_date: requiresDates
      ? input.manufacture_date ?? product.manufacture_date
      : null,
    expiration_date:
      !requiresDates
        ? null
      : input.expiration_date && product.expiration_date
        ? input.expiration_date < product.expiration_date
          ? input.expiration_date
          : product.expiration_date
        : input.expiration_date || product.expiration_date,
    provider_links: providerLinks,
    presentations,
    lots,
  };
}

function mergeLocalProductPresentations(
  product: Product,
  input: {
    presentations?: ProductPresentationPayload[];
    sale_presentation_id?: string | null;
    sale_presentation_name?: string | null;
    sale_presentation_unit_quantity?: number | null;
    sale_presentation_price?: number | null;
    price?: number | null;
  },
) {
  if (input.presentations) {
    return createLocalProductPresentations(product.id, input.presentations);
  }

  const presentationId = input.sale_presentation_id?.trim();
  const presentationName = input.sale_presentation_name?.trim() ?? "";
  const presentationUnitQuantity = Math.max(
    1,
    Number(input.sale_presentation_unit_quantity) || 1,
  );
  const presentationPrice = normalizeOptionalMoney(input.sale_presentation_price);
  const currentPresentations = (product.presentations ?? []).filter(
    (presentation) => presentation.is_active !== false,
  );

  if ((!presentationId && !presentationName) || presentationPrice === null) {
    return currentPresentations;
  }

  const presentationIndex = currentPresentations.findIndex(
    (presentation) =>
      presentation.id === presentationId ||
      normalizeCatalogSearchText(presentation.name) ===
        normalizeCatalogSearchText(presentationName),
  );

  if (presentationIndex >= 0) {
    return currentPresentations.map((presentation, index) => {
      let updatedPresentation = presentation;

      if (index === presentationIndex) {
        updatedPresentation = {
          ...updatedPresentation,
          name: presentationName || updatedPresentation.name,
          unit_quantity: presentationUnitQuantity,
          price: presentationPrice,
          use_for_purchase: true,
          use_for_sale: true,
        };
      }

      if (input.price !== undefined && input.price !== null && updatedPresentation.is_default) {
        updatedPresentation = {
          ...updatedPresentation,
          price: input.price,
        };
      }

      return updatedPresentation;
    });
  }

  if (presentationUnitQuantity <= 1) {
    return input.price !== undefined && input.price !== null
      ? currentPresentations.map((presentation) =>
          presentation.is_default
            ? { ...presentation, price: input.price as number }
            : presentation,
        )
      : currentPresentations;
  }

  return [
    ...(input.price !== undefined && input.price !== null
      ? currentPresentations.map((presentation) =>
          presentation.is_default
            ? { ...presentation, price: input.price as number }
            : presentation,
        )
      : currentPresentations),
    {
      id: `presentation-${product.id}-${Date.now()}`,
      product_id: product.id,
      name: presentationName,
      unit_quantity: presentationUnitQuantity,
      price: presentationPrice,
      is_default: false,
      is_active: true,
      use_for_purchase: true,
      use_for_sale: true,
    },
  ];
}

function getProductWithoutLot(product: Product, lot: ProductLot): Product {
  const removedQuantity = getAvailableProductLotQuantity(lot);
  const nextStock = Number(
    Math.max(0, Number(product.stock || 0) - removedQuantity).toFixed(3),
  );

  return {
    ...product,
    stock: nextStock,
    lots: (product.lots ?? []).filter((entry) => entry.id !== lot.id),
  };
}

function createLocalProductLots(input: {
  productId: string;
  providerName?: string | null;
  quantity: number;
  measurementUnit?: ProductMeasurementUnit | null;
  purchaseCost?: number | null;
  entryDate?: string | null;
  manufactureDate?: string | null;
  expirationDate?: string | null;
}) {
  const quantity = Number(input.quantity) || 0;

  if (quantity <= 0) {
    return [];
  }

  const providerName = input.providerName?.trim() || "";
  const providerId = providerName
    ? `provider-${providerName.toLocaleLowerCase("es-EC").replace(/\s+/g, "-")}`
    : null;

  return [
    {
      id: `lot-${Date.now()}-${Math.random()}`,
      product_id: input.productId,
      provider_id: providerId,
      purchase_id: null,
      quantity_received: quantity,
      quantity_remaining: quantity,
      quantity_unit: normalizeProductMeasurementUnit(input.measurementUnit),
      unit_cost: normalizeOptionalMoney(input.purchaseCost) ?? 0,
      entry_date: input.entryDate ?? null,
      manufacture_date: input.manufactureDate ?? null,
      expiration_date: input.expirationDate ?? null,
      status: "available",
      created_at: new Date().toISOString(),
      provider: providerId
        ? {
            id: providerId,
            name: providerName,
          }
        : null,
    } satisfies ProductLot,
  ];
}

function normalizeInvoices(invoices: InvoiceRecord[]) {
  return invoices.map((invoice) => ({
    ...invoice,
    subtotal: Number(invoice.subtotal),
    discount: Number(invoice.discount),
    total: Number(invoice.total),
    items: invoice.items.map((item) => ({
      ...item,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      line_total: Number(item.line_total),
    })),
  }));
}


async function downloadInventoryReportPdf(
  rows: InventoryHistoryRow[],
  totals: ReturnType<typeof getInventoryHistoryTotals>,
  movementFilter: string,
  periodFilter: string,
  dateFilter: string,
  endDateFilter: string
) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const accent: [number, number, number] = [225, 12, 77];
  const soft: [number, number, number] = [255, 242, 246];
  
  // Header
  doc.setFillColor(...accent);
  doc.rect(0, 0, pageWidth, 42, "F");
  
  let logoBase64: string | null = null;
  try {
    const res = await fetch("/logo.png");
    if (res.ok) {
      const blob = await res.blob();
      logoBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    }
  } catch (err) {
    console.error("Failed to load logo", err);
  }

  // Logo placeholder "MV"
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, 11, 19, 19, 4, 4, "F");
  
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", margin + 1, 12, 17, 17);
  } else {
    doc.setTextColor(...accent);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("MV", margin + 9.5, 23, { align: "center" });
  }
  
  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text("MINIMARKET VALLOLET", margin + 25, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("REPORTE DE INVENTARIO", margin + 25, 25);
  
  // Right side header info
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  
  const today = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  doc.text(today, pageWidth - margin, 17, { align: "right" });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let filterText = "Todos los movimientos";
  if (movementFilter === "compra") filterText = "Solo Compras";
  if (movementFilter === "venta") filterText = "Solo Ventas";
  doc.text(`Filtro: ${filterText}`, pageWidth - margin, 22, { align: "right" });
  
  let dateText = "Historico completo";
  if (periodFilter === "day") dateText = `Día: ${dateFilter}`;
  if (periodFilter === "week") dateText = `Semana: ${dateFilter}`;
  if (periodFilter === "month") dateText = `Mes: ${dateFilter}`;
  if (periodFilter === "range") dateText = `Desde: ${dateFilter} Hasta: ${endDateFilter || "Hoy"}`;
  doc.text(dateText, pageWidth - margin, 27, { align: "right" });

  let y = 50;
  
  // Summary boxes
  const boxWidth = (pageWidth - margin * 2 - 10) / 3;
  
  doc.setFillColor(...soft);
  doc.roundedRect(margin, y, boxWidth, 20, 2, 2, "F");
  doc.roundedRect(margin + boxWidth + 5, y, boxWidth, 20, 2, 2, "F");
  doc.roundedRect(margin + boxWidth * 2 + 10, y, boxWidth, 20, 2, 2, "F");
  
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("MOVIMIENTOS", margin + 5, y + 7);
  doc.text("TOTAL COMPRAS", margin + boxWidth + 10, y + 7);
  doc.text("TOTAL VENTAS", margin + boxWidth * 2 + 15, y + 7);
  
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(String(totals.records), margin + 5, y + 15);
  doc.text(`$${totals.entryValue.toFixed(2)}`, margin + boxWidth + 10, y + 15);
  doc.text(`$${totals.exitValue.toFixed(2)}`, margin + boxWidth * 2 + 15, y + 15);
  
  y += 28;
  
  // Group rows by product
  const grouped = new Map<string, { name: string, compraQty: number, compraSubtotal: number, compraIva: number, compraTotal: number, ventaQty: number, ventaSubtotal: number, ventaIva: number, ventaTotal: number }>();
  for (const row of rows) {
    const key = row.product_id || row.product_name;
    const item = grouped.get(key) || { name: row.product_name, compraQty: 0, compraSubtotal: 0, compraIva: 0, compraTotal: 0, ventaQty: 0, ventaSubtotal: 0, ventaIva: 0, ventaTotal: 0 };
    if (row.concept === "venta") {
      const vQty = row.exit_quantity || 0;
      const vSub = row.exit_total || 0;
      const vTot = row.exit_total_with_iva || vSub;
      item.ventaQty += vQty;
      item.ventaSubtotal += vSub;
      item.ventaTotal += vTot;
      item.ventaIva += (vTot - vSub);
    } else {
      const cQty = row.entry_quantity || 0;
      const cSub = row.entry_total || 0;
      const cTot = row.entry_total_with_iva || cSub;
      item.compraQty += cQty;
      item.compraSubtotal += cSub;
      item.compraTotal += cTot;
      item.compraIva += (cTot - cSub);
    }
    grouped.set(key, item);
  }
  
  const tableData = Array.from(grouped.values()).map(item => [
    item.name,
    item.compraQty > 0 ? item.compraQty.toString() : "-",
    item.compraSubtotal > 0 ? `$${item.compraSubtotal.toFixed(2)}` : "-",
    item.compraIva > 0 ? `$${item.compraIva.toFixed(2)}` : "-",
    item.compraTotal > 0 ? `$${item.compraTotal.toFixed(2)}` : "-",
    item.ventaQty > 0 ? item.ventaQty.toString() : "-",
    item.ventaSubtotal > 0 ? `$${item.ventaSubtotal.toFixed(2)}` : "-",
    item.ventaIva > 0 ? `$${item.ventaIva.toFixed(2)}` : "-",
    item.ventaTotal > 0 ? `$${item.ventaTotal.toFixed(2)}` : "-"
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Producto", "C. Comp", "Sub. Comp", "IVA Comp", "Tot. Comp", "C. Ven", "Sub. Ven", "IVA Ven", "Tot. Ven"]],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: accent, textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: 50 },
    alternateRowStyles: { fillColor: soft },
    margin: { left: margin, right: margin },
  });

  doc.save(`Reporte_Inventario_${today.replace(/\//g, "-")}.pdf`);
}
