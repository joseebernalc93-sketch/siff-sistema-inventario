import { createClient } from "@supabase/supabase-js";
import { getServerSupabaseEnv, isSupabaseServiceConfigured } from "@/lib/env";

export function getServiceSupabase() {
  if (!isSupabaseServiceConfigured()) {
    return null;
  }

  const { url, serviceRoleKey } = getServerSupabaseEnv();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

