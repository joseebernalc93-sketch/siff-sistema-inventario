export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at?: string;
};

export type ProductMeasurementUnit = "unit" | "lb";

export type ProductPresentation = {
  id: string;
  product_id: string;
  name: string;
  unit_quantity: number;
  price: number;
  is_default?: boolean;
  is_active?: boolean;
  use_for_purchase?: boolean;
  use_for_sale?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  sku: string;
  product_code?: string | null;
  description: string | null;
  purchase_cost?: number | null;
  price: number;
  measurement_unit?: ProductMeasurementUnit | null;
  stock: number;
  min_stock: number;
  max_stock?: number;
  image_url: string | null;
  provider?: string | null;
  is_active: boolean;
  has_iva?: boolean | null;
  iva_rate?: number | null;
  requires_dates?: boolean | null;
  entry_date?: string | null;
  manufacture_date?: string | null;
  expiration_date?: string | null;
  created_at?: string;
  updated_at?: string;
  categories?: Pick<Category, "name" | "slug"> | null;
  provider_links?: ProductProvider[];
  lots?: ProductLot[];
  presentations?: ProductPresentation[];
};

export type Provider = {
  id: string;
  name: string;
  ruc?: string | null;
  email?: string | null;
  address?: string | null;
  phone?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ProductLotPurchaseInput = {
  id?: string;
  purchase_input_quantity?: number | string | null;
  purchase_input_unit?: string | null;
};

export type ProductProvider = {
  id: string;
  product_id: string;
  provider_id: string;
  is_primary: boolean;
  last_purchase_cost?: number | null;
  last_purchase_quantity?: number | null;
  last_purchase_unit?: string | null;
  last_purchase_at?: string | null;
  created_at?: string;
  updated_at?: string;
  provider?: Pick<Provider, "id" | "name"> | null;
  providers?: Pick<Provider, "id" | "name"> | null;
};

export type ProductLot = {
  id: string;
  product_id: string;
  provider_id?: string | null;
  purchase_id?: string | null;
  quantity_received: number;
  quantity_remaining: number;
  quantity_unit?: ProductMeasurementUnit | null;
  unit_cost?: number | null;
  entry_date?: string | null;
  manufacture_date?: string | null;
  expiration_date?: string | null;
  status?: "available" | "depleted" | "returned" | "adjusted" | string;
  created_at?: string;
  updated_at?: string;
  provider?: Pick<Provider, "id" | "name"> | null;
  providers?: Pick<Provider, "id" | "name"> | null;
  purchase_input_quantity?: number | null;
  purchase_input_unit?: string | null;
  product_purchases?: ProductLotPurchaseInput | ProductLotPurchaseInput[] | null;
};

export type ProductPurchaseHistoryRecord = {
  id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  product_measurement_unit?: ProductMeasurementUnit | null;
  category_name?: string | null;
  provider_id?: string | null;
  provider_name?: string | null;
  quantity: number;
  quantity_unit?: ProductMeasurementUnit | string | null;
  quantity_in_stock_unit: number;
  unit_cost: number;
  total_cost: number;
  purchase_code?: string | null;
  purchase_input_quantity?: number | null;
  purchase_input_unit?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  payment_method?: string | null;
  credit_days?: number | null;
  iva_rate?: number | null;
  iva_amount?: number | null;
  line_subtotal?: number | null;
  line_total?: number | null;
  entry_date?: string | null;
  manufacture_date?: string | null;
  expiration_date?: string | null;
  lot_status?: string | null;
  quantity_remaining?: number | null;
  base_price?: number | null;
  retail_price?: number | null;
  unit_base_price?: number | null;
  unit_retail_price?: number | null;
  created_at: string;
};

export type CatalogResponse = {
  categories: Category[];
  products: Product[];
};

export type OrderItemInput = {
  product_id: string;
  presentation_id?: string | null;
  quantity: number;
};

export type OrderRequest = {
  customer_name: string;
  customer_identity?: string;
  customer_phone?: string;
  channel?: "android" | "chatbot" | "web";
  payment_method?: "efectivo" | "transferencia";
  transfer_receipt_url?: string | null;
  notes?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  items: OrderItemInput[];
};

export type OrderResult = {
  order_id: string;
  order_code: string;
  payment_method?: "efectivo" | "transferencia";
  total: number;
};

export type ChatbotRequest = {
  message: string;
  customer_name?: string;
  customer_phone?: string;
  history?: ChatbotHistoryEntry[];
};

export type ChatbotHistoryEntry = {
  role: "user" | "assistant";
  message: string;
  product_ids?: string[];
};

export type ChatbotResponse = {
  answer: string;
  intent: "catalog" | "order" | "complaint" | "help";
  products: Product[];
  source?: "gemini" | "local";
  source_reason?:
    | "gemini_empty_answer"
    | "gemini_error"
    | "gemini_invalid_key"
    | "gemini_model_error"
    | "gemini_permission_error"
    | "gemini_quota_error"
    | "missing_gemini_key";
  suggested_order?: {
    items: OrderItemInput[];
    total: number;
  };
};

export type ComplaintRequest = {
  customer_name: string;
  customer_phone?: string;
  order_id?: string;
  message: string;
};

export type ComplaintResult = {
  complaint_id: string;
  status: string;
};

export type InvoiceItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  presentation_name?: string | null;
  stock_quantity?: number | null;
  stock_unit?: ProductMeasurementUnit | null;
  has_iva?: boolean;
  iva_rate?: number | null;
};

export type InvoiceRecord = {
  id: string;
  invoice_number: string;
  customer_name: string;
  customer_identity: string | null;
  customer_phone: string | null;
  status: string;
  channel: string;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
  items: InvoiceItem[];
  delivery_user_id?: string | null;
  employee_user_id?: string | null;
  delivery_user_name?: string | null;
  delivery_user_identity?: string | null;
  delivery_user_phone?: string | null;
  employee_user_name?: string | null;
  employee_user_identity?: string | null;
  employee_user_phone?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  payment_method?: string | null;
  transfer_receipt_url?: string | null;
  cash_handover_status?: string | null;
  cash_handed_over_at?: string | null;
  cash_confirmed_at?: string | null;
};

export type MobileClientRecord = {
  id: string;
  auth_user_id?: string | null;
  full_name: string;
  identity_number: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: string;
  source: string;
  last_login_at: string | null;
  created_at: string;
  updated_at?: string | null;
  role?: string | null;
};

export type AdminOrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  has_iva?: boolean;
  iva_rate?: number | null;
};

export type AdminOrderRecord = {
  id: string;
  order_code: string;
  customer_name: string;
  customer_identity?: string | null;
  customer_phone?: string | null;
  status: string;
  channel: string;
  payment_method?: string;
  transfer_receipt_url?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string | null;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_user_id?: string | null;
  employee_user_id?: string | null;
  delivery_user_name?: string | null;
  delivery_user_identity?: string | null;
  delivery_user_phone?: string | null;
  employee_user_name?: string | null;
  employee_user_identity?: string | null;
  employee_user_phone?: string | null;
  dispatched_at?: string | null;
  delivered_at?: string | null;
  cash_handover_status?: string | null;
  cash_handed_over_at?: string | null;
  cash_confirmed_at?: string | null;
  created_at: string;
  items: AdminOrderItem[];
};
