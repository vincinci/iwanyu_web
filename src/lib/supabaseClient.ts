import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  let url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  console.log('[SupabaseClient] Initializing...');
  console.log('[SupabaseClient] Raw URL:', url);
  console.log('[SupabaseClient] URL length:', url?.length);
  console.log('[SupabaseClient] Has anon key:', !!anonKey);

  if (url && /^[a-z0-9]{20}$/.test(url.trim())) {
    url = `https://${url.trim()}.supabase.co`;
    console.log('[SupabaseClient] Converted short URL to:', url);
  }

  if (!url || !anonKey) {
    console.error('[SupabaseClient] Missing credentials!', { hasUrl: !!url, hasKey: !!anonKey });
    cached = null;
    return cached;
  }

  // Clean the URL
  url = url.trim().replace(/\\n/g, '').replace(/\n/g, '');
  console.log('[SupabaseClient] Final URL:', url);
  console.log('[SupabaseClient] Final URL length:', url.length);

  cached = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  console.log('[SupabaseClient] Client created successfully!');
  return cached;
}
