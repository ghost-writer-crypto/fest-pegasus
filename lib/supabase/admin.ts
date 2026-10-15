import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");
  }

  if (!rawKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing. A privileged server-side Supabase client cannot be created."
    );
  }

  const supabaseUrl = rawUrl.replace(/^["']|["']$/g, "").trim();
  const serviceRoleKey = rawKey.replace(/^["']|["']$/g, "").trim();

  // Create a Supabase client with the service role key.
  // This bypasses RLS entirely. It must NEVER be exposed to the client.
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
