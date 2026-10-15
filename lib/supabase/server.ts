import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers.js";

export async function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-anon.supabase.co";
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabaseUrl = rawUrl.replace(/^["']|["']$/g, "").trim();
  const supabaseKey = rawKey.replace(/^["']|["']$/g, "").trim();

  try {
    const cookieStore = await cookies();

    return createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Server Components cannot always write cookies.
            }
          },
        },
      },
    );
  } catch {
    return createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll() {},
        },
      },
    );
  }
}

