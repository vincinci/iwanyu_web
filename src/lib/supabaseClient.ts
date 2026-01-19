import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;
let cachedPublic: SupabaseClient | null | undefined;

function isE2eSupabaseDisabled() {
  return (
    String(import.meta.env.VITE_E2E_DISABLE_SUPABASE ?? "").toLowerCase() === "true" ||
    String(import.meta.env.VITE_E2E_DISABLE_SUPABASE ?? "") === "1"
  );
}

function resolveSupabaseCredentials(): { url: string; anonKey: string } | null {
  let url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (url && /^[a-z0-9]{20}$/.test(url.trim())) {
    url = `https://${url.trim()}.supabase.co`;
  }

  if (!url || !anonKey) {
    console.warn('[SupabaseClient] Missing credentials', { hasUrl: !!url, hasKey: !!anonKey });
    return null;
  }

  url = url.trim().replace(/\\n/g, "").replace(/\n/g, "");
  const cleanedKey = String(anonKey).trim().replace(/\\n/g, "").replace(/\n/g, "");
  return { url, anonKey: cleanedKey };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  if (isE2eSupabaseDisabled()) {
    cached = null;
    return cached;
  }

  const creds = resolveSupabaseCredentials();
  if (!creds) {
    cached = null;
    return cached;
  }

  cached = createClient(creds.url, creds.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
      storageKey: 'iwanyu-auth-token',
      flowType: 'pkce',
    },
  });

  return cached;
}

// Public read-only client that does NOT use persisted user sessions.
// This prevents an expired/broken auth session from breaking anonymous product browsing.
export function getPublicSupabaseClient(): SupabaseClient | null {
  if (cachedPublic !== undefined) return cachedPublic;

  if (isE2eSupabaseDisabled()) {
    cachedPublic = null;
    return cachedPublic;
  }

  const creds = resolveSupabaseCredentials();
  if (!creds) {
    cachedPublic = null;
    return cachedPublic;
  }

  cachedPublic = createClient(creds.url, creds.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedPublic;
}
