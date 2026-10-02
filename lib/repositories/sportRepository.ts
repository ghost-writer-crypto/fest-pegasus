import { createClient } from "../supabase/server.ts";

/**
 * Shape of a row in public.sports matching migration 20260920000100.
 */
export type SportRow = {
  id: string;
  festival_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
};

/**
 * Explicit columns queried from public.sports.
 */
const SPORT_COLUMNS =
  "id, festival_id, name, slug, description, sort_order, created_at" as const;

/**
 * Retrieves all sports configured for a given festival.
 * Ordered by sort_order ascending, then name ascending.
 *
 * @param festivalId - The UUID of the festival
 * @returns An array of SportRow records
 */
export async function getSportsByFestival(
  festivalId: string,
): Promise<SportRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sports")
      .select(SPORT_COLUMNS)
      .eq("festival_id", festivalId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error(
        `[sportRepository.getSportsByFestival] Failed to retrieve sports for festival ${festivalId}:`,
        error,
      );
      return [];
    }

    return (data as SportRow[]) ?? [];
  } catch (err) {
    console.error(
      `[sportRepository.getSportsByFestival] Unexpected error:`,
      err,
    );
    return [];
  }
}

/**
 * Retrieves a single sport by primary key ID or slug.
 *
 * @param sportIdOrSlug - The UUID or slug of the sport discipline
 * @param festivalId - Optional festival UUID to filter by
 * @returns The SportRow record if found, or null
 */
export async function getSportById(
  sportIdOrSlug: string,
  festivalId?: string,
): Promise<SportRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  try {
    const supabase = await createClient();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sportIdOrSlug,
      );

    let query = supabase.from("sports").select(SPORT_COLUMNS);

    if (isUuid) {
      query = query.eq("id", sportIdOrSlug);
    } else {
      query = query.eq("slug", sportIdOrSlug);
    }

    if (festivalId) {
      query = query.eq("festival_id", festivalId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(
        `[sportRepository.getSportById] Failed to retrieve sport ${sportIdOrSlug}:`,
        error,
      );
      return null;
    }

    return (data as SportRow) ?? null;
  } catch (err) {
    console.error(
      `[sportRepository.getSportById] Unexpected error:`,
      err,
    );
    return null;
  }
}
