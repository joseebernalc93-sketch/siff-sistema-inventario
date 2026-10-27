"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv, isSupabaseConfigured } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabase() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!browserClient) {
    const { url, anonKey } = getPublicSupabaseEnv();
    browserClient = createClient(url, anonKey);
  }

  return browserClient;
}

