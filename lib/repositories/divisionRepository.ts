import { createClient } from "@/lib/supabase/server";

/**
 * Shape of a row in public.divisions as defined by migration 20260920000100.
 */
export type DivisionRow = {
  id: string;
  festival_id: string;
  code: string;
  name: string;
  sort_order: number;
  created_at: string;
};

const DIVISION_COLUMNS = "id, festival_id, code, name, sort_order, created_at" as const;

/**
 * Retrieves all divisions configured for a given festival.
 * Ordered by sort_order ascending.
 *
 * @param festivalId - The UUID of the festival
 * @returns An array of DivisionRow records
 */
export async function getDivisionsByFestival(
  festivalId: string,
): Promise<DivisionRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("divisions")
      .select(DIVISION_COLUMNS)
      .eq("festival_id", festivalId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(
        `[divisionRepository.getDivisionsByFestival] Failed to retrieve divisions for festival ${festivalId}:`,
        error,
      );
      return [];
    }

    return (data as DivisionRow[]) ?? [];
  } catch (err) {
    console.error(
      `[divisionRepository.getDivisionsByFestival] Unexpected error:`,
      err,
    );
    return [];
  }
}

/**
 * Retrieves a single division by primary key ID.
 */
export async function getDivisionById(
  divisionId: string,
): Promise<DivisionRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("divisions")
      .select(DIVISION_COLUMNS)
      .eq("id", divisionId)
      .maybeSingle();

    if (error) {
      console.error(
        `[divisionRepository.getDivisionById] Failed to retrieve division ${divisionId}:`,
        error,
      );
      return null;
    }

    return (data as DivisionRow) ?? null;
  } catch (err) {
    console.error(
      `[divisionRepository.getDivisionById] Unexpected error:`,
      err,
    );
    return null;
  }
}


