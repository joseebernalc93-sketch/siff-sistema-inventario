import { createHash, randomBytes } from "crypto";
import { getServiceSupabase } from "@/lib/supabase-server";
import { validateIdentity, validateEmail, validatePhone } from "@/lib/validations";
import type { MobileClientRecord } from "@/lib/types";

export type MobileClientInput = {
  full_name: string;
  identity_number: string;
  email: string;
  phone: string;
  address: string;
  password: string;
};

export type AdminMobileClientUpdateInput = {
  full_name?: string;
  identity_number?: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: string;
  password?: string;
  role?: string;
};

type StorageMode = "demo" | "supabase";
type ServiceSupabase = NonNullable<ReturnType<typeof getServiceSupabase>>;
type AuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: {
    full_name?: string;
    identity_number?: string;
    mobile_client_id?: string;
    source?: string;
  } | null;
};

const MOBILE_CLIENT_SELECT =
  "id, auth_user_id, full_name, identity_number, email, phone, address, status, source, last_login_at, created_at, updated_at, role";
const PASSWORD_RESET_REQUEST_SELECT =
  "id, client_id, auth_user_id, expires_at, used_at, created_at";
const PASSWORD_RESET_LINK_TTL_MS = 10 * 60 * 1000;
const MOBILE_CLIENT_STATUSES = ["active", "blocked", "pending_review"];
const DUPLICATE_MOBILE_CLIENT_MESSAGE =
  "Ya existe un usuario registrado con ese nombre, numero de cedula o correo.";

export async function getAdminMobileClients(): Promise<{
  mode: StorageMode;
  clients: MobileClientRecord[];
}> {
  const supabase = getServiceSupabase();

  if (!supabase) {
    return {
      mode: "demo",
      clients: [],
    };
  }

  const mobileClients = await supabase
    .from("mobile_clients")
    .select(MOBILE_CLIENT_SELECT)
    .order("created_at", { ascending: false });

  if (!mobileClients.error) {
    return {
      mode: "supabase",
      clients: normalizeMobileClients(mobileClients.data ?? []),
    };
  }

  if (!isMissingMobileClientsSchema(mobileClients.error)) {
    throw new Error(mobileClients.error.message);
  }

  const customers = await supabase
    .from("customers")
    .select("id, full_name, identity_number, phone, created_at")
    .order("created_at", { ascending: false });

  if (customers.error) {
    throw new Error(customers.error.message);
  }

  return {
    mode: "supabase",
    clients: (customers.data ?? []).map((customer) => ({
      id: customer.id,
      full_name: customer.full_name,
      identity_number: customer.identity_number ?? "",
      email: null,
      phone: customer.phone ?? null,
      address: null,
      status: "active",
      source: "customers",
      last_login_at: null,
      created_at: customer.created_at,
      updated_at: null,
    })),
  };
}

export async function registerMobileClient(input: MobileClientInput) {
  const payload = normalizeClientInput(input);
  validateClientPayload(payload);

  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Supabase no esta configurado para registrar clientes.");
  }

  await assertUniqueMobileClient(supabase, payload);

  const passwordHash = hashPassword(payload.password);

  const mobileInsert = await supabase
    .from("mobile_clients")
    .insert({
      full_name: payload.full_name,
      identity_number: payload.identity_number,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      password_hash: passwordHash,
      status: "active",
      source: "android",
    })
    .select(MOBILE_CLIENT_SELECT)
    .single();

  if (!mobileInsert.error && mobileInsert.data) {
    const client = await ensureMobileAuthUser(
      supabase,
      normalizeMobileClient(mobileInsert.data),
      payload.password,
    );

    await mirrorCustomerRecord(supabase, payload);

    return {
      client,
      storage: "mobile_clients" as const,
    };
  }

  if (isDuplicateClientError(mobileInsert.error)) {
    throw new Error(DUPLICATE_MOBILE_CLIENT_MESSAGE);
  }

  if (!isMissingMobileClientsSchema(mobileInsert.error)) {
    throw new Error(mobileInsert.error.message);
  }

  const fallbackClient = await registerCustomerFallback(supabase, payload);

  return {
    client: fallbackClient,
    storage: "customers" as const,
  };
}

export async function createAdminMobileClient(input: Omit<MobileClientInput, "password"> & { role?: string }) {
  const payload = normalizeClientInput({
    ...input,
    password: input.identity_number, // Default password is the identity number
  });
  validateClientPayload(payload, { skipPasswordValidation: true });

  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Supabase no esta configurado para registrar clientes.");
  }

  await assertUniqueMobileClient(supabase, payload);

  const passwordHash = hashPassword(payload.password);

  const mobileInsert = await supabase
    .from("mobile_clients")
    .insert({
      full_name: payload.full_name,
      identity_number: payload.identity_number,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      password_hash: passwordHash,
      status: "active",
      source: "admin_pending", // Distinguishes it from 'android' so the mobile app can require a password change
      role: input.role || "cliente",
    })
    .select(MOBILE_CLIENT_SELECT)
    .single();

  if (!mobileInsert.error && mobileInsert.data) {
    const client = await ensureMobileAuthUser(
      supabase,
      normalizeMobileClient(mobileInsert.data),
      payload.password,
    );

    await mirrorCustomerRecord(supabase, payload);

    return {
      client,
      storage: "mobile_clients" as const,
    };
  }

  if (isDuplicateClientError(mobileInsert.error)) {
    throw new Error(DUPLICATE_MOBILE_CLIENT_MESSAGE);
  }

  if (!isMissingMobileClientsSchema(mobileInsert.error)) {
    throw new Error(mobileInsert.error.message);
  }

  const fallbackClient = await registerCustomerFallback(supabase, payload);

  return {
    client: fallbackClient,
    storage: "customers" as const,
  };
}

export async function loginMobileClient(
  identityNumber: string,
  password: string,
) {
  const identity = identityNumber.trim();
  const rawPassword = password.trim();

  if (!identity) {
    throw new Error("La cedula es obligatoria.");
  }

  if (!rawPassword) {
    throw new Error("La contrasena es obligatoria.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Supabase no esta configurado para iniciar sesion.");
  }

  const result = await supabase
    .from("mobile_clients")
    .select(`${MOBILE_CLIENT_SELECT}, password_hash`)
    .eq("identity_number", identity)
    .maybeSingle();

  if (result.error) {
    if (isMissingMobileClientsSchema(result.error)) {
      throw new Error("El login movil requiere ejecutar el SQL de clientes.");
    }

    throw new Error(result.error.message);
  }

  if (!result.data) {
    throw new InvalidMobileCredentialsError();
  }

  if (result.data.password_hash !== hashPassword(rawPassword)) {
    throw new InvalidMobileCredentialsError();
  }

  const loggedAt = new Date().toISOString();
  const updated = await supabase
    .from("mobile_clients")
    .update({ last_login_at: loggedAt })
    .eq("id", result.data.id)
    .select(MOBILE_CLIENT_SELECT)
    .single();

  if (updated.error) {
    return normalizeMobileClient({
      ...result.data,
      last_login_at: loggedAt,
    });
  }

  return normalizeMobileClient(updated.data);
}

export async function forceChangeMobileClientPassword(
  identityNumber: string,
  currentPasswordRaw: string,
  newPasswordRaw: string,
) {
  const identity = identityNumber.trim();
  const currentPassword = currentPasswordRaw.trim();
  const newPassword = newPasswordRaw.trim();

  if (!identity || !currentPassword || !newPassword) {
    throw new Error("Faltan campos obligatorios para el cambio de contrasena.");
  }

  validatePassword(newPassword);

  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Supabase no esta configurado para actualizar contrasenas.");
  }

  const result = await supabase
    .from("mobile_clients")
    .select("id, password_hash, auth_user_id, email, full_name, identity_number, phone, address, status, source")
    .eq("identity_number", identity)
    .single();

  if (result.error || !result.data) {
    throw new InvalidMobileCredentialsError();
  }

  if (result.data.password_hash !== hashPassword(currentPassword)) {
    throw new InvalidMobileCredentialsError();
  }

  const updatePayload = {
    password_hash: hashPassword(newPassword),
    source: "android", // the password is now changed, so the source is set to android to clear the 'admin_pending' state
  };

  const updatedResult = await supabase
    .from("mobile_clients")
    .update(updatePayload)
    .eq("id", result.data.id)
    .select(MOBILE_CLIENT_SELECT)
    .single();

  if (updatedResult.error) {
    throw new Error(updatedResult.error.message);
  }

  let updatedClient = normalizeMobileClient(updatedResult.data);

  if (updatedClient.auth_user_id) {
    await updateLinkedMobileAuthUser(supabase, updatedClient, newPassword);
  } else {
    updatedClient = await ensureMobileAuthUser(supabase, updatedClient, newPassword);
  }

  return updatedClient;
}

export async function requestMobileClientPasswordReset(
  identifier: string,
  redirectTo: string,
) {
  const recoveryIdentifier = identifier.trim();

  if (!recoveryIdentifier) {
    throw new Error("Ingresa tu cedula o correo registrado.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Supabase no esta configurado para recuperar contrasenas.");
  }

  const client = await findMobileClientByRecoveryIdentifier(
    supabase,
    recoveryIdentifier,
  );

  if (!client) {
    throw new MobileClientNotFoundError();
  }

  if (!client.email) {
    throw new Error("Esta cuenta no tiene un correo registrado.");
  }

  const linkedClient = await ensureMobileAuthUser(supabase, client);
  if (!linkedClient.auth_user_id) {
    throw new Error("No se pudo preparar la cuenta para recuperacion.");
  }

  const resetToken = await createMobilePasswordResetRequest(
    supabase,
    linkedClient,
  );

  const reset = await supabase.auth.resetPasswordForEmail(client.email, {
    redirectTo: appendRecoveryToken(redirectTo, resetToken),
  });

  if (reset.error) {
    throw new Error(reset.error.message);
  }

  return {
    email: maskEmail(client.email),
  };
}

export async function lookupMobileClientPasswordRecovery(identifier: string) {
  const recoveryIdentifier = identifier.trim();

  if (recoveryIdentifier.length < 4) {
    return {
      exists: false,
      email: null,
    };
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Supabase no esta configurado para recuperar contrasenas.");
  }

  const client = await findMobileClientByRecoveryIdentifier(
    supabase,
    recoveryIdentifier,
  );

  if (!client?.email) {
    return {
      exists: false,
      email: null,
    };
  }

  return {
    exists: true,
    email: maskEmail(client.email),
  };
}

export async function updateAdminMobileClient(
  id: string,
  input: AdminMobileClientUpdateInput,
) {
  const clientId = id.trim();

  if (!clientId) {
    throw new Error("El id del cliente es obligatorio.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Supabase no esta configurado para actualizar clientes.");
  }

  const currentResult = await supabase
    .from("mobile_clients")
    .select(MOBILE_CLIENT_SELECT)
    .eq("id", clientId)
    .maybeSingle();

  if (currentResult.error) {
    if (isMissingMobileClientsSchema(currentResult.error)) {
      throw new Error("Ejecuta primero el SQL de clientes moviles.");
    }

    throw new Error(currentResult.error.message);
  }

  if (!currentResult.data) {
    throw new MobileClientNotFoundError();
  }

  const currentClient = normalizeMobileClient(currentResult.data);
  const updatePayload = normalizeAdminClientUpdateInput(input);
  const newPassword = normalizeOptionalPassword(input.password);
  const nextClient = {
    full_name: updatePayload.full_name ?? currentClient.full_name,
    identity_number:
      updatePayload.identity_number ?? currentClient.identity_number,
    email: updatePayload.email ?? currentClient.email ?? "",
  };

  if (!Object.keys(updatePayload).length && !newPassword) {
    return {
      mode: "supabase" as StorageMode,
      client: currentClient,
    };
  }

  await assertUniqueMobileClient(supabase, nextClient, currentClient.id);

  if (newPassword) {
    validatePassword(newPassword);
    updatePayload.password_hash = hashPassword(newPassword);
  }

  const updatedResult = await supabase
    .from("mobile_clients")
    .update(updatePayload)
    .eq("id", clientId)
    .select(MOBILE_CLIENT_SELECT)
    .single();

  if (updatedResult.error) {
    if (isDuplicateClientError(updatedResult.error)) {
      throw new Error(DUPLICATE_MOBILE_CLIENT_MESSAGE);
    }

    throw new Error(updatedResult.error.message);
  }

  let updatedClient = normalizeMobileClient(updatedResult.data);

  if (newPassword && !updatedClient.auth_user_id) {
    updatedClient = await ensureMobileAuthUser(
      supabase,
      updatedClient,
      newPassword,
    );
  }

  if (updatedClient.auth_user_id) {
    await updateLinkedMobileAuthUser(supabase, updatedClient, newPassword);
  }

  await mirrorUpdatedCustomerRecord(supabase, currentClient, updatedClient);

  return {
    mode: "supabase" as StorageMode,
    client: updatedClient,
  };
}

export async function deleteAdminMobileClient(id: string) {
  const result = await deleteAdminMobileClients([id]);

  return {
    ...result,
    clientId: id,
  };
}

export async function deleteAdminMobileClients(ids: string[]) {
  const clientIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];

  if (!clientIds.length) {
    throw new Error("Selecciona al menos un cliente.");
  }

  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Supabase no esta configurado para eliminar clientes.");
  }

  const currentResult = await supabase
    .from("mobile_clients")
    .select(MOBILE_CLIENT_SELECT)
    .in("id", clientIds);

  if (currentResult.error) {
    if (isMissingMobileClientsSchema(currentResult.error)) {
      throw new Error("Ejecuta primero el SQL de clientes moviles.");
    }

    throw new Error(currentResult.error.message);
  }

  const clients = normalizeMobileClients(currentResult.data ?? []);

  const deleteResult = await supabase
    .from("mobile_clients")
    .delete()
    .in("id", clientIds);

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  for (const client of clients) {
    await deleteLinkedMobileAuthUser(supabase, client);
  }

  return {
    mode: "supabase" as StorageMode,
    clientIds,
    deletedCount: clients.length,
  };
}

export async function updateMobileClientPasswordFromRecovery(
  accessToken: string,
  password: string,
  resetToken: string,
) {
  const token = accessToken.trim();
  const newPassword = password.trim();
  const rawResetToken = resetToken.trim();

  if (!token || !rawResetToken) {
    throw new InvalidPasswordRecoveryTokenError();
  }

  validatePassword(newPassword);

  const supabase = getServiceSupabase();

  if (!supabase) {
    throw new Error("Supabase no esta configurado para actualizar contrasenas.");
  }

  const userResult = await supabase.auth.getUser(token);
  if (userResult.error || !userResult.data.user) {
    throw new InvalidPasswordRecoveryTokenError();
  }

  const user = userResult.data.user;
  let clientResult = await supabase
    .from("mobile_clients")
    .select(MOBILE_CLIENT_SELECT)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (clientResult.error) {
    throw new Error(clientResult.error.message);
  }

  if (!clientResult.data && user.email) {
    clientResult = await supabase
      .from("mobile_clients")
      .select(MOBILE_CLIENT_SELECT)
      .eq("email", user.email.toLowerCase())
      .maybeSingle();

    if (clientResult.error) {
      throw new Error(clientResult.error.message);
    }
  }

  if (!clientResult.data) {
    throw new MobileClientNotFoundError();
  }

  await claimMobilePasswordResetRequest(
    supabase,
    normalizeMobileClient(clientResult.data),
    user.id,
    rawResetToken,
  );

  const authUpdate = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (authUpdate.error) {
    throw new Error(authUpdate.error.message);
  }

  const updated = await supabase
    .from("mobile_clients")
    .update({
      auth_user_id: user.id,
      password_hash: hashPassword(newPassword),
    })
    .eq("id", clientResult.data.id)
    .select(MOBILE_CLIENT_SELECT)
    .single();

  if (updated.error) {
    throw new Error(updated.error.message);
  }

  await supabase.auth.admin.signOut(token, "global");

  return normalizeMobileClient(updated.data);
}

export class InvalidMobileCredentialsError extends Error {
  constructor() {
    super("Cedula o contrasena incorrecta.");
  }
}

export class MobileClientNotFoundError extends Error {
  constructor() {
    super("No encontramos una cuenta registrada con esa cedula.");
  }
}

export class InvalidPasswordRecoveryTokenError extends Error {
  constructor() {
    super("El enlace de recuperacion expiro o no es valido.");
  }
}

function normalizeClientInput(input: MobileClientInput): MobileClientInput {
  return {
    full_name: input.full_name.trim(),
    identity_number: input.identity_number.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    password: input.password,
  };
}

function validateClientPayload(input: MobileClientInput, options?: { skipPasswordValidation?: boolean }) {
  if (!input.full_name) {
    throw new Error("El nombre del cliente es obligatorio.");
  }

  if (!input.identity_number || !validateIdentity(input.identity_number)) {
    throw new Error("Ingresa una cedula valida (ecuatoriana).");
  }

  if (!input.email || !validateEmail(input.email)) {
    throw new Error("Ingresa un correo valido (gmail, hotmail, outlook, yahoo, icloud).");
  }

  if (!input.phone || !validatePhone(input.phone)) {
    throw new Error("Telefono invalido. Formatos: 09.., 02.., +593.., 1800..");
  }

  if (!input.address) {
    throw new Error("La direccion es obligatoria.");
  }

  if (!options?.skipPasswordValidation) {
    validatePassword(input.password);
  }
}

function normalizeAdminClientUpdateInput(input: AdminMobileClientUpdateInput) {
  const payload: Record<string, string> = {};

  if (input.full_name !== undefined) {
    const fullName = input.full_name.trim();

    if (!fullName) {
      throw new Error("El nombre del cliente es obligatorio.");
    }

    payload.full_name = fullName;
  }

  if (input.identity_number !== undefined) {
    const identityNumber = input.identity_number.trim();

    if (!identityNumber || !validateIdentity(identityNumber)) {
      throw new Error("Ingresa una cedula valida (ecuatoriana).");
    }

    payload.identity_number = identityNumber;
  }

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();

    if (!email || !validateEmail(email)) {
      throw new Error("Ingresa un correo valido (gmail, hotmail, outlook, yahoo, icloud).");
    }

    payload.email = email;
  }

  if (input.phone !== undefined) {
    const phone = input.phone.trim();

    if (!phone || !validatePhone(phone)) {
      throw new Error("Telefono invalido. Formatos: 09.., 02.., +593.., 1800..");
    }

    payload.phone = phone;
  }

  if (input.address !== undefined) {
    const address = input.address.trim();

    if (!address) {
      throw new Error("La direccion es obligatoria.");
    }

    payload.address = address;
  }

  if (input.status !== undefined) {
    const status = input.status.trim();

    if (!MOBILE_CLIENT_STATUSES.includes(status)) {
      throw new Error("Selecciona un estado valido para el cliente.");
    }

    payload.status = status;
  }

  if (input.role !== undefined) {
    const role = input.role.trim();
    payload.role = role || "cliente";
  }

  return payload;
}

function normalizeOptionalPassword(password?: string) {
  return password?.trim() ?? "";
}

async function assertUniqueMobileClient(
  supabase: ServiceSupabase,
  input: Pick<MobileClientInput, "full_name" | "identity_number" | "email">,
  ignoredClientId?: string,
) {
  const result = await supabase
    .from("mobile_clients")
    .select("id, full_name, identity_number, email");

  if (result.error) {
    if (isMissingMobileClientsSchema(result.error)) {
      return;
    }

    throw new Error(result.error.message);
  }

  const targetName = normalizeUniqueText(input.full_name);
  const targetIdentity = input.identity_number.trim();
  const targetEmail = input.email.trim().toLowerCase();
  const duplicate = (result.data ?? []).find((client) => {
    if (client.id === ignoredClientId) {
      return false;
    }

    return (
      normalizeUniqueText(client.full_name ?? "") === targetName ||
      String(client.identity_number ?? "").trim() === targetIdentity ||
      String(client.email ?? "").trim().toLowerCase() === targetEmail
    );
  });

  if (duplicate) {
    throw new Error(DUPLICATE_MOBILE_CLIENT_MESSAGE);
  }
}

function normalizeUniqueText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

async function registerCustomerFallback(
  supabase: ServiceSupabase,
  input: MobileClientInput,
) {
  const existing = await supabase
    .from("customers")
    .select("id, full_name, identity_number");

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  const duplicate = (existing.data ?? []).find(
    (client) =>
      normalizeUniqueText(client.full_name ?? "") ===
        normalizeUniqueText(input.full_name) ||
      String(client.identity_number ?? "").trim() === input.identity_number,
  );

  if (duplicate) {
    throw new Error(DUPLICATE_MOBILE_CLIENT_MESSAGE);
  }

  const inserted = await supabase
    .from("customers")
    .insert({
      full_name: input.full_name,
      identity_number: input.identity_number,
      phone: input.phone,
    })
    .select("id, full_name, identity_number, phone, created_at")
    .single();

  if (inserted.error) {
    if (isDuplicateClientError(inserted.error)) {
      throw new Error(DUPLICATE_MOBILE_CLIENT_MESSAGE);
    }

    throw new Error(inserted.error.message);
  }

  return {
    id: inserted.data.id,
    auth_user_id: null,
    full_name: inserted.data.full_name,
    identity_number: inserted.data.identity_number ?? input.identity_number,
    email: input.email,
    phone: inserted.data.phone ?? input.phone,
    address: input.address,
    status: "active",
    source: "customers",
    last_login_at: null,
    created_at: inserted.data.created_at,
    updated_at: null,
  } satisfies MobileClientRecord;
}

async function mirrorCustomerRecord(
  supabase: ServiceSupabase,
  input: MobileClientInput,
) {
  try {
    await supabase
      .from("customers")
      .upsert(
        {
          full_name: input.full_name,
          identity_number: input.identity_number,
          phone: input.phone,
        },
        { onConflict: "identity_number" },
      )
      .throwOnError();
  } catch {
    // The mobile_clients table is the source of truth. The legacy customers
    // mirror is useful for older order flows, but it should not block signup.
  }
}

async function mirrorUpdatedCustomerRecord(
  supabase: ServiceSupabase,
  previousClient: MobileClientRecord,
  client: MobileClientRecord,
) {
  try {
    const payload = {
      full_name: client.full_name,
      identity_number: client.identity_number,
      phone: client.phone,
    };

    const previousCustomer = await supabase
      .from("customers")
      .select("id")
      .eq("identity_number", previousClient.identity_number)
      .maybeSingle();

    if (!previousCustomer.error && previousCustomer.data?.id) {
      await supabase
        .from("customers")
        .update(payload)
        .eq("id", previousCustomer.data.id);
      return;
    }

    await supabase
      .from("customers")
      .upsert(payload, { onConflict: "identity_number" });
  } catch {
    // The mobile profile is the source of truth for the Android app. The
    // customers table remains a best-effort mirror for older sales flows.
  }
}

function normalizeMobileClients(clients: MobileClientRecord[]) {
  return clients.map(normalizeMobileClient);
}

function normalizeMobileClient(client: MobileClientRecord): MobileClientRecord {
  return {
    id: client.id,
    auth_user_id: client.auth_user_id ?? null,
    full_name: client.full_name,
    identity_number: client.identity_number,
    email: client.email ?? null,
    phone: client.phone ?? null,
    address: client.address ?? null,
    status: client.status ?? "active",
    source: client.source ?? "android",
    last_login_at: client.last_login_at ?? null,
    created_at: client.created_at,
    updated_at: client.updated_at ?? null,
    role: client.role ?? "cliente",
  };
}

async function ensureMobileAuthUser(
  supabase: ServiceSupabase,
  client: MobileClientRecord,
  password?: string,
) {
  if (!client.email) {
    return client;
  }

  if (client.auth_user_id) {
    return client;
  }

  const existingUser = await findAuthUserByEmail(supabase, client.email);
  let authUserId = existingUser?.id ?? null;

  if (existingUser && !isMobileAuthUser(existingUser, client)) {
    return client;
  }

  if (!authUserId) {
    const created = await supabase.auth.admin.createUser({
      email: client.email,
      password: password ?? temporaryPassword(),
      email_confirm: true,
      user_metadata: {
        source: "mobile_client",
        mobile_client_id: client.id,
        identity_number: client.identity_number,
        full_name: client.full_name,
      },
    });

    if (created.error || !created.data.user) {
      return client;
    }

    authUserId = created.data.user.id;
  }

  const updated = await supabase
    .from("mobile_clients")
    .update({ auth_user_id: authUserId })
    .eq("id", client.id)
    .select(MOBILE_CLIENT_SELECT)
    .single();

  if (updated.error) {
    await upsertProfileFromMobileClient(supabase, {
      ...client,
      auth_user_id: authUserId,
    });

    return {
      ...client,
      auth_user_id: authUserId,
    };
  }

  const updatedClient = normalizeMobileClient(updated.data);
  await upsertProfileFromMobileClient(supabase, updatedClient);

  return updatedClient;
}

async function updateLinkedMobileAuthUser(
  supabase: ServiceSupabase,
  client: MobileClientRecord,
  password?: string,
) {
  if (!client.auth_user_id) {
    return;
  }

  const authUpdate = await supabase.auth.admin.updateUserById(
    client.auth_user_id,
    {
      ...(client.email ? { email: client.email, email_confirm: true } : {}),
      ...(password ? { password } : {}),
      user_metadata: {
        source: "mobile_client",
        mobile_client_id: client.id,
        identity_number: client.identity_number,
        full_name: client.full_name,
      },
    },
  );

  if (authUpdate.error) {
    throw new Error(authUpdate.error.message);
  }

  await upsertProfileFromMobileClient(supabase, client);
}

async function deleteLinkedMobileAuthUser(
  supabase: ServiceSupabase,
  client: MobileClientRecord,
) {
  if (!client.auth_user_id) {
    return;
  }

  const deleted = await supabase.auth.admin.deleteUser(client.auth_user_id);

  if (deleted.error) {
    throw new Error(deleted.error.message);
  }
}

async function upsertProfileFromMobileClient(
  supabase: ServiceSupabase,
  client: MobileClientRecord,
) {
  if (!client.auth_user_id) {
    return;
  }

  const result = await supabase.from("profiles").upsert(
    {
      id: client.auth_user_id,
      full_name: client.full_name,
      phone: client.phone,
      role: "customer",
      created_at: client.created_at,
    },
    { onConflict: "id" },
  );

  if (result.error) {
    console.warn("No se pudo sincronizar profiles:", result.error.message);
  }
}

async function findMobileClientByRecoveryIdentifier(
  supabase: ServiceSupabase,
  identifier: string,
) {
  const recoveryIdentifier = identifier.trim();
  const column = recoveryIdentifier.includes("@") ? "email" : "identity_number";
  const value = column === "email"
    ? recoveryIdentifier.toLowerCase()
    : recoveryIdentifier;

  const result = await supabase
    .from("mobile_clients")
    .select(MOBILE_CLIENT_SELECT)
    .eq(column, value)
    .maybeSingle();

  if (result.error) {
    if (isMissingMobileClientsSchema(result.error)) {
      throw new Error("La recuperacion requiere ejecutar el SQL de clientes.");
    }

    throw new Error(result.error.message);
  }

  return result.data ? normalizeMobileClient(result.data) : null;
}

async function createMobilePasswordResetRequest(
  supabase: ServiceSupabase,
  client: MobileClientRecord,
) {
  if (!client.auth_user_id) {
    throw new Error("No se pudo preparar la cuenta para recuperacion.");
  }

  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + PASSWORD_RESET_LINK_TTL_MS,
  ).toISOString();
  const rawToken = randomBytes(32).toString("base64url");

  const invalidated = await supabase
    .from("mobile_password_reset_requests")
    .update({ used_at: createdAt })
    .eq("client_id", client.id)
    .is("used_at", null);

  if (invalidated.error && isMissingPasswordResetSchema(invalidated.error)) {
    throw new Error("La recuperacion requiere ejecutar el SQL actualizado.");
  }

  if (invalidated.error) {
    throw new Error(invalidated.error.message);
  }

  const inserted = await supabase
    .from("mobile_password_reset_requests")
    .insert({
      client_id: client.id,
      auth_user_id: client.auth_user_id,
      token_hash: hashRecoveryToken(rawToken),
      expires_at: expiresAt,
    })
    .select(PASSWORD_RESET_REQUEST_SELECT)
    .single();

  if (inserted.error) {
    if (isMissingPasswordResetSchema(inserted.error)) {
      throw new Error("La recuperacion requiere ejecutar el SQL actualizado.");
    }

    throw new Error(inserted.error.message);
  }

  return rawToken;
}

async function claimMobilePasswordResetRequest(
  supabase: ServiceSupabase,
  client: MobileClientRecord,
  authUserId: string,
  rawToken: string,
) {
  const now = new Date().toISOString();
  const claimed = await supabase
    .from("mobile_password_reset_requests")
    .update({ used_at: now })
    .eq("token_hash", hashRecoveryToken(rawToken))
    .eq("client_id", client.id)
    .eq("auth_user_id", authUserId)
    .is("used_at", null)
    .gt("expires_at", now)
    .select(PASSWORD_RESET_REQUEST_SELECT)
    .maybeSingle();

  if (claimed.error) {
    if (isMissingPasswordResetSchema(claimed.error)) {
      throw new Error("La recuperacion requiere ejecutar el SQL actualizado.");
    }

    throw new Error(claimed.error.message);
  }

  if (!claimed.data) {
    throw new InvalidPasswordRecoveryTokenError();
  }
}

async function findAuthUserByEmail(
  supabase: ServiceSupabase,
  email: string,
): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 100;

  while (page <= 10) {
    const result = await supabase.auth.admin.listUsers({ page, perPage });

    if (result.error) {
      return null;
    }

    const user = result.data.users.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail,
    );

    if (user) {
      return user;
    }

    if (result.data.users.length < perPage) {
      return null;
    }

    page += 1;
  }

  return null;
}

function isMobileAuthUser(user: AuthUser, client: MobileClientRecord) {
  const metadata = user.user_metadata;

  return (
    metadata?.source === "mobile_client" ||
    metadata?.mobile_client_id === client.id ||
    metadata?.identity_number === client.identity_number
  );
}

function validatePassword(password: string) {
  if (password.length < 8) {
    throw new Error("La contrasena debe tener minimo 8 caracteres.");
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error("La contrasena debe tener al menos una mayuscula.");
  }

  if (!/\d/.test(password)) {
    throw new Error("La contrasena debe tener al menos un numero.");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new Error("La contrasena debe tener al menos un simbolo.");
  }
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function hashRecoveryToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function temporaryPassword() {
  return `${randomBytes(24)
    .toString("base64")
    .replace(/[^A-Za-z0-9]/g, "")}Aa1!`;
}

function maskEmail(email: string) {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  const visibleStart = localPart.slice(0, 2);
  const visibleEnd = localPart.length > 4 ? localPart.slice(-1) : "";
  return `${visibleStart}${"*".repeat(4)}${visibleEnd}@${domain}`;
}

function appendRecoveryToken(redirectTo: string, token: string) {
  try {
    const url = new URL(redirectTo);
    url.searchParams.set("reset_request", token);
    return url.toString();
  } catch {
    const separator = redirectTo.includes("?") ? "&" : "?";
    return `${redirectTo}${separator}reset_request=${encodeURIComponent(token)}`;
  }
}

function isMissingMobileClientsSchema(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.message?.includes("mobile_clients") === true
  );
}

function isMissingPasswordResetSchema(error: { code?: string; message?: string } | null) {
  if (!error) {
    return false;
  }

  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.message?.includes("mobile_password_reset_requests") === true
  );
}

function isDuplicateClientError(error: { code?: string } | null) {
  return error?.code === "23505";
}
