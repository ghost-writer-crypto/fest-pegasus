import { createClient } from "@/lib/supabase/server";

/**
 * Shape of a row in public.festivals matching migration 20260920000100.
 */
export type FestivalRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  registration_deadline: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Explicit columns queried from public.festivals.
 */
const FESTIVAL_COLUMNS =
  "id, name, slug, description, starts_at, ends_at, registration_deadline, is_active, created_at, updated_at" as const;

/**
 * Retrieves the currently active festival.
 *
 * Authoritative rule: A festival is active if and only if festivals.is_active = true.
 * If no active festival exists, returns null. No hardcoded slug fallback is permitted.
 *
 * @returns The active FestivalRow record if found, or null
 */
export async function getActiveFestival(): Promise<FestivalRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("festivals")
      .select(FESTIVAL_COLUMNS)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.error(
        "[festivalRepository.getActiveFestival] Failed to retrieve active festival:",
        error,
      );
      return null;
    }

    return (data as FestivalRow) ?? null;
  } catch (error) {
    console.error(
      "[festivalRepository.getActiveFestival] Unexpected error during active festival retrieval:",
      error,
    );
    return null;
  }
}

