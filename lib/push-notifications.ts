import { GoogleAuth } from "google-auth-library";

import { getServiceSupabase } from "@/lib/supabase-server";

export type PushTokenRecord = {
  account_id: string | null;
  created_at?: string;
  id: string;
  identity_number: string | null;
  is_enabled: boolean;
  name: string | null;
  platform: string;
  role: string | null;
  token: string;
  updated_at?: string;
};

export type PushTokenInput = {
  account_id?: unknown;
  identity_number?: unknown;
  is_enabled?: unknown;
  name?: unknown;
  platform?: unknown;
  role?: unknown;
  token?: unknown;
};

type PushTarget = {
  accountIds?: string[];
  identities?: string[];
  roles?: string[];
  tokens?: string[];
};

type PushNotification = {
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
  title: string;
};

const PUSH_SETTINGS_BUCKET = "product-images";
const PUSH_SETTINGS_PATH = "settings/push-tokens.json";
const FIREBASE_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

let cachedAccessToken: { expiresAt: number; token: string } | null = null;

export async function registerPushToken(input: PushTokenInput) {
  const token = normalizeRequiredText(input.token, "Token");
  const isEnabled = input.is_enabled !== false;
  const supabase = getServiceSupabase();

  if (!supabase) {
    return { ok: true, storage: "mock" };
  }

  const now = new Date().toISOString();
  const accounts = await readPushTokens();
  const existing = accounts.find((account) => account.token === token);
  const nextRecord: PushTokenRecord = {
    account_id: normalizeOptionalText(input.account_id),
    created_at: existing?.created_at ?? now,
    id: existing?.id ?? crypto.randomUUID(),
    identity_number: normalizeOptionalText(input.identity_number),
    is_enabled: isEnabled,
    name: normalizeOptionalText(input.name),
    platform: normalizeOptionalText(input.platform) ?? "android",
    role: normalizeOptionalText(input.role)?.toLowerCase() ?? null,
    token,
    updated_at: now,
  };

  const nextAccounts = [
    ...accounts.filter((account) => account.token !== token),
    nextRecord,
  ];
  await writePushTokens(nextAccounts);

  return { ok: true, storage: "storage" };
}

export async function sendPushNotification(
  target: PushTarget,
  notification: PushNotification,
) {
  const records = await getTargetPushTokens(target);
  const tokens = [...new Set(records.map((record) => record.token))];

  if (tokens.length === 0) {
    return { sent: 0, skipped: "no_tokens" };
  }

  const credentials = getFirebaseServiceAccount();
  if (!credentials) {
    return { sent: 0, skipped: "missing_firebase_service_account" };
  }

  const projectId =
    credentials.project_id || process.env.FIREBASE_PROJECT_ID?.trim();

  if (!projectId) {
    return { sent: 0, skipped: "missing_firebase_project_id" };
  }

  const accessToken = await getFirebaseAccessToken(credentials);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  let sent = 0;

  await Promise.all(
    tokens.map(async (token) => {
      const response = await fetch(endpoint, {
        body: JSON.stringify({
          message: {
            android: {
              priority: "HIGH",
              notification: {
                channel_id: "minimarket_order_alerts",
                default_sound: true,
                default_vibrate_timings: true,
              },
            },
            data: normalizePushData(notification.data),
            notification: {
              body: notification.body,
              title: notification.title,
            },
            token,
          },
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (response.ok) {
        sent += 1;
      }
    }),
  );

  return { sent };
}

export async function notifyOrderCreated(order: {
  order_code?: string | null;
  order_id?: string | null;
  payment_method?: string | null;
}) {
  const code = order.order_code || order.order_id || "nuevo";
  const isTransfer = order.payment_method === "transferencia";
  await sendPushNotification(
    { roles: isTransfer ? ["admin"] : ["admin", "empleado"] },
    {
      body: `Ingreso el pedido ${code}.`,
      data: {
        event: "order_created",
        order_id: order.order_id,
        order_code: code,
        payment_method: order.payment_method,
      },
      title: "Nuevo pedido recibido",
    },
  );
}

export async function notifyOrderStatusChanged(params: {
  customerIdentity?: string | null;
  deliveryUserId?: string | null;
  notes?: string | null;
  orderCode?: string | null;
  orderId: string;
  paymentMethod?: string | null;
  status: string;
  total?: number | null;
}) {
  const code = params.orderCode || params.orderId;
  const isPickup = isPickupOrder(params.notes);
  const pickupTicket = getPickupTicket(params.notes);
  const pickupTicketText = pickupTicket ? ` TICKET: ${pickupTicket}` : "";
  const paymentLabel =
    params.paymentMethod === "transferencia" ? "Transferencia" : "Efectivo";
  const deliveryPaymentText =
    params.paymentMethod === "transferencia"
      ? "Pago: Transferencia."
      : `Pago: Efectivo. Cobrar: ${formatPushMoney(params.total)}.`;

  if (params.status === "confirmed") {
    if (isPickup) {
      await (params.customerIdentity
        ? sendPushNotification(
            { identities: [params.customerIdentity], roles: ["cliente"] },
            {
              body: `🎟️ Tu pedido${pickupTicketText} está listo para ser retirado en el local. 🛍️`,
              data: {
                customer_identity: params.customerIdentity,
                event: "pickup_ready",
                order_code: code,
                order_id: params.orderId,
                pickup_ticket: pickupTicket,
              },
              title: "Pedido listo para retiro",
            },
          )
        : Promise.resolve());
      return;
    }

    await Promise.all([
      params.deliveryUserId
        ? sendPushNotification(
            { accountIds: [params.deliveryUserId], roles: ["delivery"] },
            {
              body: `Tienes que entregar el pedido ${code}. ${deliveryPaymentText}`,
              data: {
                event: "delivery_assigned",
                order_code: code,
                order_id: params.orderId,
                payment_method: params.paymentMethod,
                payment_label: paymentLabel,
                total: params.total,
              },
              title: "Pedido para entregar",
            },
          )
        : Promise.resolve(),
      params.customerIdentity
        ? sendPushNotification(
            { identities: [params.customerIdentity], roles: ["cliente"] },
            {
              body: "Tu pedido va en camino.",
              data: {
                event: "order_on_the_way",
                order_code: code,
                order_id: params.orderId,
              },
              title: "Tu pedido va en camino",
            },
          )
        : Promise.resolve(),
    ]);
    return;
  }

  if (params.status === "delivered") {
    const customerDeliveredNotification = isPickup
      ? {
          body: "✅ Tu pedido ha sido entregado. ¡Gracias por tu compra! 🛒",
          data: {
            customer_identity: params.customerIdentity,
            event: "order_delivered",
            order_code: code,
            order_id: params.orderId,
            pickup_ticket: pickupTicket,
          },
          title: "Pedido entregado",
        }
      : {
          body: "Confirma en el chat si recibiste tu pedido.",
          data: {
            event: "confirm_delivery",
            order_code: code,
            order_id: params.orderId,
          },
          title: "Pedido entregado",
        };

    await Promise.all([
      sendPushNotification(
        { roles: ["admin", "empleado"] },
        {
          body: `El pedido ${code} fue marcado como entregado.`,
          data: { event: "order_delivered", order_code: code, order_id: params.orderId },
          title: "Pedido entregado",
        },
      ),
      params.customerIdentity
        ? sendPushNotification(
            { identities: [params.customerIdentity], roles: ["cliente"] },
            customerDeliveredNotification,
          )
        : Promise.resolve(),
    ]);
    return;
  }

  if (params.status === "preparing") {
    await sendPushNotification(
      { roles: ["admin", "empleado"] },
      {
        body: `El pedido ${code} esta listo para preparar.`,
        data: {
          event: "order_preparing",
          order_code: code,
          order_id: params.orderId,
          payment_method: params.paymentMethod,
          payment_label: paymentLabel,
          total: params.total,
        },
        title: "Pedido actualizado",
      },
    );
  }
}

export async function notifyTransferPaymentRejected(params: {
  customerIdentity?: string | null;
  orderCode?: string | null;
  orderId: string;
}) {
  if (!params.customerIdentity) {
    return { sent: 0, skipped: "missing_customer_identity" };
  }

  const code = params.orderCode || params.orderId;

  return sendPushNotification(
    { identities: [params.customerIdentity], roles: ["cliente"] },
    {
      body:
        "Su pedido fue cancelado por la Administracion por el motivo que su comprobante de pago no pudo ser validado, Porfavor verifique su comprobante de pago y solicite el pedido nuevamente",
      data: {
        customer_identity: params.customerIdentity,
        event: "transfer_payment_rejected",
        order_code: code,
        order_id: params.orderId,
      },
      title: "Pago no validado",
    },
  );
}

function formatPushMoney(value: number | null | undefined) {
  const total = Number(value);
  if (!Number.isFinite(total)) {
    return "$0.00";
  }

  return `$${total.toFixed(2)}`;
}

function isPickupOrder(notes?: string | null) {
  return notes?.toUpperCase().includes("RETIRO EN LOCAL") ?? false;
}

function getPickupTicket(notes?: string | null) {
  const match = notes?.match(/TICKET:\s*([^\n\r]+)/i);
  return match?.[1]?.trim() || null;
}

export async function notifyDeliveryProblem(params: {
  customerIdentity?: string | null;
  deliveryUserId?: string | null;
  orderCode?: string | null;
  orderId: string;
}) {
  const code = params.orderCode || params.orderId;
  await Promise.all([
    sendPushNotification(
      { roles: ["admin", "empleado"] },
      {
        body: `El delivery no pudo entregar el pedido ${code}.`,
        data: { event: "delivery_failed", order_code: code, order_id: params.orderId },
        title: "Delivery no pudo entregar",
      },
    ),
    params.customerIdentity
      ? sendPushNotification(
          { identities: [params.customerIdentity], roles: ["cliente"] },
          {
            body: "El repartidor no pudo concretar la entrega. Revisa el chat.",
            data: {
              event: "delivery_failed",
              order_code: code,
              order_id: params.orderId,
            },
            title: "Problema con la entrega",
          },
        )
      : Promise.resolve(),
  ]);
}

export async function notifyClientDeliveryConfirmation(params: {
  action: "confirm_delivery" | "reject_delivery";
  deliveryUserId?: string | null;
  orderCode?: string | null;
  orderId: string;
}) {
  const code = params.orderCode || params.orderId;
  const confirmed = params.action === "confirm_delivery";
  const title = confirmed
    ? "Cliente confirmo recibido"
    : "Cliente marco no recibido";
  const body = confirmed
    ? `El cliente confirmo que recibio el pedido ${code}.`
    : `El cliente reporto que no recibio el pedido ${code}.`;

  await Promise.all([
    sendPushNotification(
      { roles: ["admin", "empleado"] },
      {
        body,
        data: {
          event: confirmed ? "client_received" : "client_rejected_delivery",
          order_code: code,
          order_id: params.orderId,
        },
        title,
      },
    ),
    params.deliveryUserId
      ? sendPushNotification(
          { accountIds: [params.deliveryUserId], roles: ["delivery"] },
          {
            body,
            data: {
              event: confirmed ? "client_received" : "client_rejected_delivery",
              order_code: code,
              order_id: params.orderId,
            },
            title,
          },
        )
      : Promise.resolve(),
  ]);
}

async function getTargetPushTokens(target: PushTarget) {
  const records = await readPushTokens();
  const roles = new Set((target.roles ?? []).map((role) => role.toLowerCase()));
  const accountIds = new Set(target.accountIds ?? []);
  const identities = new Set(target.identities ?? []);
  const tokens = new Set(target.tokens ?? []);

  return records.filter((record) => {
    if (!record.is_enabled || !record.token) {
      return false;
    }

    const roleMatches = roles.size === 0 || (record.role && roles.has(record.role));
    const accountMatches =
      accountIds.size === 0 ||
      (record.account_id != null && accountIds.has(record.account_id));
    const identityMatches =
      identities.size === 0 ||
      (record.identity_number != null && identities.has(record.identity_number));
    const tokenMatches = tokens.size === 0 || tokens.has(record.token);

    return roleMatches && accountMatches && identityMatches && tokenMatches;
  });
}

async function getFirebaseAccessToken(credentials: Record<string, unknown>) {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: [FIREBASE_SCOPE],
  });
  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();
  const token =
    typeof accessToken === "string" ? accessToken : accessToken?.token;

  if (!token) {
    throw new Error("No se pudo obtener token de Firebase.");
  }

  cachedAccessToken = {
    expiresAt: Date.now() + 50 * 60 * 1000,
    token,
  };

  return token;
}

function getFirebaseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw.replace(/\\n/g, "\n")) as Record<
      string,
      unknown
    >;
    return parsed;
  } catch {
    return null;
  }
}

async function readPushTokens(): Promise<PushTokenRecord[]> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.storage
    .from(PUSH_SETTINGS_BUCKET)
    .download(PUSH_SETTINGS_PATH);

  if (error) {
    if (isMissingStorageObjectError(error.message)) {
      return [];
    }
    throw new Error(error.message);
  }

  const raw = JSON.parse(await data.text()) as unknown;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter(isRecord)
    .map((entry) => ({
      account_id: normalizeOptionalText(entry.account_id),
      created_at: normalizeOptionalText(entry.created_at) ?? undefined,
      id: String(entry.id ?? ""),
      identity_number: normalizeOptionalText(entry.identity_number),
      is_enabled: entry.is_enabled !== false,
      name: normalizeOptionalText(entry.name),
      platform: normalizeOptionalText(entry.platform) ?? "android",
      role: normalizeOptionalText(entry.role)?.toLowerCase() ?? null,
      token: String(entry.token ?? ""),
      updated_at: normalizeOptionalText(entry.updated_at) ?? undefined,
    }))
    .filter((entry) => entry.id && entry.token);
}

async function writePushTokens(tokens: PushTokenRecord[]) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    throw new Error("Configura Supabase para guardar tokens push.");
  }

  const payload = JSON.stringify(tokens, null, 2);
  const { error } = await supabase.storage
    .from(PUSH_SETTINGS_BUCKET)
    .upload(PUSH_SETTINGS_PATH, Buffer.from(payload), {
      cacheControl: "60",
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
}

function normalizePushData(data: PushNotification["data"]) {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(data ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }
    normalized[key] = String(value);
  }

  return normalized;
}

function normalizeRequiredText(value: unknown, label: string) {
  const text = normalizeOptionalText(value);
  if (!text) {
    throw new Error(`${label} es obligatorio.`);
  }

  return text;
}

function normalizeOptionalText(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value).trim();
  return text || null;
}

function isMissingStorageObjectError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("not found") ||
    normalized.includes("does not exist") ||
    normalized.includes("object not found")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
