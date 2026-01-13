import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Admin client with service role - bypasses RLS
// Only use server-side for privileged operations
export function createSupabaseAdminClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}


