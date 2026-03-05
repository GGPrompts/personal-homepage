/**
 * GovHound Supabase clients.
 *
 * - getClient() re-exports the homepage's browser client
 * - getServiceClient() uses SUPABASE_SERVICE_ROLE_KEY for server-side access (bypasses RLS)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";

let _serviceClient: SupabaseClient | null = null;

// Client-side Supabase client (anon key) — delegates to homepage's singleton
export function getClient(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return client;
}

// Server-side Supabase client (service role key for full access, bypasses RLS)
export function getServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
      );
    }
    _serviceClient = createClient(url, key);
  }
  return _serviceClient;
}
