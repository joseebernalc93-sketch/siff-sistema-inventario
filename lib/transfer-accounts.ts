import { getServiceSupabase } from "@/lib/supabase-server";

export type TransferAccountRecord = {
  account_number: string;
  bank_name: string;
  created_at?: string;
  email: string | null;
  holder_name: string;
  id: string;
  identity_number: string;
  is_enabled: boolean;
  updated_at?: string;
};

export type TransferAccountInput = {
  account_number?: unknown;
  bank_name?: unknown;
  email?: unknown;
  holder_name?: unknown;
  identity_number?: unknown;
  is_enabled?: unknown;
};

const TRANSFER_SETTINGS_BUCKET = "product-images";
const TRANSFER_SETTINGS_PATH = "settings/transfer-accounts.json";

const FALLBACK_TRANSFER_ACCOUNT: TransferAccountRecord = {
  account_number: process.env.MINIMARKET_TRANSFER_ACCOUNT || "Por configurar",
  bank_name: process.env.MINIMARKET_TRANSFER_BANK || "Banco por configurar",
  email: process.env.MINIMARKET_TRANSFER_EMAIL || null,
  holder_name: process.env.MINIMARKET_TRANSFER_HOLDER || "Minimarket Joelys",
  id: "fallback-transfer-account",
  identity_number: process.env.MINIMARKET_TRANSFER_ID || "Por configurar",
  is_enabled: true,
};

export async function getAdminTransferAccounts() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { accounts: [FALLBACK_TRANSFER_ACCOUNT], storage: "mock" };
  }

  return {
    accounts: await readTransferAccounts(),
    storage: "storage",
  };
}

export async function getEnabledTransferAccounts() {
  const supabase = getServiceSupabase();
  if (!supabase) {
    return { accounts: [FALLBACK_TRANSFER_ACCOUNT], storage: "mock" };
  }

  const { accounts, settingsFound } = await readTransferAccountsResult();
  const enabledAccounts = accounts.filter((account) => account.is_enabled);

  return {
    accounts:
      enabledAccounts.length > 0 || settingsFound
        ? enabledAccounts
        : [FALLBACK_TRANSFER_ACCOUNT],
    storage: "storage",
  };
}

export async function createTransferAccount(input: TransferAccountInput) {
  const payload = normalizeTransferAccountInput(input);
  const now = new Date().toISOString();
  const account: TransferAccountRecord = {
    account_number: payload.account_number!,
    bank_name: payload.bank_name!,
    created_at: now,
    email: payload.email ?? null,
    holder_name: payload.holder_name!,
    id: crypto.randomUUID(),
    identity_number: payload.identity_number!,
    is_enabled: payload.is_enabled ?? true,
    updated_at: now,
  };

  const accounts = await readTransferAccounts();
  await writeTransferAccounts([...accounts, account]);

  return account;
}

export async function updateTransferAccount(
  id: string,
  input: TransferAccountInput,
) {
  const accounts = await readTransferAccounts();
  const index = accounts.findIndex((account) => account.id === id);

  if (index < 0) {
    throw new Error("Cuenta bancaria no encontrada.");
  }

  const payload = normalizeTransferAccountInput(input, { partial: true });
  const updatedAccount: TransferAccountRecord = {
    ...accounts[index],
    ...payload,
    updated_at: new Date().toISOString(),
  };
  const nextAccounts = [...accounts];
  nextAccounts[index] = updatedAccount;
  await writeTransferAccounts(nextAccounts);

  return updatedAccount;
}

export async function deleteTransferAccount(id: string) {
  const accounts = await readTransferAccounts();
  const nextAccounts = accounts.filter((account) => account.id !== id);

  if (nextAccounts.length === accounts.length) {
    throw new Error("Cuenta bancaria no encontrada.");
  }

  await writeTransferAccounts(nextAccounts);
  return { ok: true };
}

function normalizeTransferAccountInput(
  input: TransferAccountInput,
  options: { partial?: boolean } = {},
) {
  const payload: {
    account_number?: string;
    bank_name?: string;
    email?: string | null;
    holder_name?: string;
    identity_number?: string;
    is_enabled?: boolean;
  } = {};

  const bankName = normalizeRequiredText(input.bank_name, "Nombre del banco");
  const holderName = normalizeRequiredText(input.holder_name, "Nombre");
  const identityNumber = normalizeRequiredText(input.identity_number, "Cedula");
  const accountNumber = normalizeRequiredText(
    input.account_number,
    "Numero de cuenta",
  );
  const email = normalizeOptionalText(input.email);

  if (!options.partial || bankName !== null) {
    if (bankName === null) {
      throw new Error("El nombre del banco es obligatorio.");
    }
    payload.bank_name = bankName;
  }

  if (!options.partial || holderName !== null) {
    if (holderName === null) throw new Error("El nombre es obligatorio.");
    payload.holder_name = holderName;
  }

  if (!options.partial || identityNumber !== null) {
    if (identityNumber === null) throw new Error("La cedula es obligatoria.");
    payload.identity_number = identityNumber;
  }

  if (!options.partial || accountNumber !== null) {
    if (accountNumber === null) {
      throw new Error("El numero de cuenta es obligatorio.");
    }
    payload.account_number = accountNumber;
  }

  if (!options.partial || input.email !== undefined) {
    payload.email = email;
  }

  if (!options.partial || input.is_enabled !== undefined) {
    payload.is_enabled = input.is_enabled !== false;
  }

  return payload;
}

function normalizeRequiredText(value: unknown, label: string) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    throw new Error(`${label} es obligatorio.`);
  }

  return text;
}

function normalizeOptionalText(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value).trim();
  return text || null;
}

async function readTransferAccounts(): Promise<TransferAccountRecord[]> {
  return (await readTransferAccountsResult()).accounts;
}

async function readTransferAccountsResult(): Promise<{
  accounts: TransferAccountRecord[];
  settingsFound: boolean;
}> {
  const supabase = getServiceSupabase();
  if (!supabase) {
    throw new Error("Configura Supabase para leer cuentas bancarias.");
  }

  const { data, error } = await supabase.storage
    .from(TRANSFER_SETTINGS_BUCKET)
    .download(TRANSFER_SETTINGS_PATH);

  if (error) {
    if (isMissingStorageObjectError(error.message)) {
      return { accounts: [], settingsFound: false };
    }
    throw new Error(error.message);
  }

  const raw = JSON.parse(await data.text()) as unknown;
  if (!Array.isArray(raw)) {
    return { accounts: [], settingsFound: true };
  }

  const accounts = raw
    .filter(isRecord)
    .map((entry) => ({
      account_number: String(entry.account_number ?? ""),
      bank_name: normalizeOptionalText(entry.bank_name) ?? "",
      created_at: normalizeOptionalText(entry.created_at) ?? undefined,
      email: normalizeOptionalText(entry.email),
      holder_name: String(entry.holder_name ?? ""),
      id: String(entry.id ?? ""),
      identity_number: String(entry.identity_number ?? ""),
      is_enabled: entry.is_enabled !== false,
      updated_at: normalizeOptionalText(entry.updated_at) ?? undefined,
    }))
    .filter(
      (account) =>
        account.id &&
        account.holder_name &&
        account.identity_number &&
        account.account_number,
    );

  return { accounts, settingsFound: true };
}

async function writeTransferAccounts(accounts: TransferAccountRecord[]) {
  const supabase = getServiceSupabase();
  if (!supabase) {
    throw new Error("Configura Supabase para guardar cuentas bancarias.");
  }

  const payload = JSON.stringify(accounts, null, 2);
  const { error } = await supabase.storage
    .from(TRANSFER_SETTINGS_BUCKET)
    .upload(TRANSFER_SETTINGS_PATH, Buffer.from(payload), {
      cacheControl: "0",
      contentType: "application/json",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }
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
