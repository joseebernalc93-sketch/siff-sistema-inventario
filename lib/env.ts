export function getPublicSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getPublicSupabaseEnv();
  return Boolean(
    url &&
      anonKey &&
      url.startsWith("https://") &&
      !url.includes("TU-PROYECTO") &&
      !anonKey.includes("TU_ANON_KEY"),
  );
}

export function getServerSupabaseEnv() {
  return {
    ...getPublicSupabaseEnv(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

export function isSupabaseServiceConfigured() {
  const { url, serviceRoleKey } = getServerSupabaseEnv();
  return Boolean(
    isSupabaseConfigured() &&
      serviceRoleKey &&
      !serviceRoleKey.includes("TU_SERVICE_ROLE_KEY") &&
      url.startsWith("https://"),
  );
}

