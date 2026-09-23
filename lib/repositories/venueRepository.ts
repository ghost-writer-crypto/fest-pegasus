import { createClient } from "@/lib/supabase/server";

/**
 * Shape of a row in public.venues matching migration 20260920000100 & 20260921000700.
 */
export type VenueRow = {
  id: string;
  festival_id: string;
  name: string;
  slug: string;
  location: string | null;
  capacity: number | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CreateVenueInput = {
  festivalId: string;
  name: string;
  slug?: string;
  location?: string | null;
  capacity?: number | null;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
};

export type UpdateVenueInput = {
  venueId: string;
  name?: string;
  slug?: string;
  location?: string | null;
  capacity?: number | null;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
};

const VENUE_COLUMNS =
  "id, festival_id, name, slug, location, capacity, is_active, metadata, created_at" as const;

/**
 * Generates a URL-safe slug from a venue name.
 */
function generateVenueSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Retrieves all venues configured for a given festival.
 *
 * @param festivalId - The UUID of the festival
 * @param onlyActive - If true, only returns active venues (defaults to false)
 * @returns An array of VenueRow records ordered by name ascending
 */
export async function getVenuesByFestival(
  festivalId: string,
  onlyActive = false,
): Promise<VenueRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  let query = supabase
    .from("venues")
    .select(VENUE_COLUMNS)
    .eq("festival_id", festivalId);

  if (onlyActive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) {
    console.error(
      `[venueRepository.getVenuesByFestival] Failed to retrieve venues for festival ${festivalId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve venues for festival ${festivalId}: ${error.message} (${error.code})`,
    );
  }

  return (data as VenueRow[]) ?? [];
}

/**
 * Retrieves a single venue by its primary key ID.
 *
 * @param venueId - The UUID of the venue
 * @returns The VenueRow record if found, or null
 */
export async function getVenueById(
  venueId: string,
): Promise<VenueRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("venues")
    .select(VENUE_COLUMNS)
    .eq("id", venueId)
    .maybeSingle();

  if (error) {
    console.error(
      `[venueRepository.getVenueById] Failed to retrieve venue ${venueId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve venue ${venueId}: ${error.message} (${error.code})`,
    );
  }

  return (data as VenueRow) ?? null;
}

/**
 * Creates a new venue record for a festival.
 * Strictly requires active administrator session.
 */
export async function createVenueRecord(
  input: CreateVenueInput,
): Promise<{ success: boolean; data?: VenueRow; error?: string }> {
  if (!input.name || input.name.trim() === "") {
    return { success: false, error: "Venue name is required." };
  }
  if (!input.festivalId || input.festivalId.trim() === "") {
    return { success: false, error: "Festival ID is required." };
  }

  const supabase = await createClient();

  // Resolve unique slug
  let slug = input.slug?.trim() ? generateVenueSlug(input.slug) : generateVenueSlug(input.name);
  if (!slug) slug = `venue-${Date.now()}`;

  // Check if slug already exists in this festival
  const { data: existingSlug } = await supabase
    .from("venues")
    .select("id")
    .eq("festival_id", input.festivalId)
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlug) {
    slug = `${slug}-${Date.now().toString().slice(-4)}`;
  }

  const insertPayload = {
    festival_id: input.festivalId,
    name: input.name.trim(),
    slug,
    location: input.location ? input.location.trim() : null,
    capacity: typeof input.capacity === "number" && input.capacity >= 0 ? input.capacity : null,
    is_active: input.isActive !== undefined ? input.isActive : true,
    metadata: input.metadata || {},
  };

  const { data, error } = await supabase
    .from("venues")
    .insert(insertPayload)
    .select(VENUE_COLUMNS)
    .single();

  if (error) {
    console.error(`[venueRepository.createVenueRecord] Insert failed:`, error);
    return {
      success: false,
      error: `Failed to create venue: ${error.message} (${error.code})`,
    };
  }

  return { success: true, data: data as VenueRow };
}

/**
 * Updates an existing venue's properties.
 * ID and Festival ID remain immutable.
 */
export async function updateVenueRecord(
  input: UpdateVenueInput,
): Promise<{ success: boolean; data?: VenueRow; error?: string }> {
  if (!input.venueId || input.venueId.trim() === "") {
    return { success: false, error: "Venue ID is required." };
  }
  if (input.name !== undefined && input.name.trim() === "") {
    return { success: false, error: "Venue name cannot be empty." };
  }

  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.slug !== undefined) updatePayload.slug = generateVenueSlug(input.slug);
  if (input.location !== undefined) {
    updatePayload.location = input.location ? input.location.trim() : null;
  }
  if (input.capacity !== undefined) {
    updatePayload.capacity =
      typeof input.capacity === "number" && input.capacity >= 0 ? input.capacity : null;
  }
  if (input.isActive !== undefined) updatePayload.is_active = input.isActive;
  if (input.metadata !== undefined) updatePayload.metadata = input.metadata;

  const { data, error } = await supabase
    .from("venues")
    .update(updatePayload)
    .eq("id", input.venueId)
    .select(VENUE_COLUMNS)
    .single();

  if (error) {
    console.error(`[venueRepository.updateVenueRecord] Update failed:`, error);
    return {
      success: false,
      error: `Failed to update venue: ${error.message} (${error.code})`,
    };
  }

  return { success: true, data: data as VenueRow };
}

/**
 * Activates or deactivates a venue (soft status toggle).
 */
export async function updateVenueStatusRecord(
  venueId: string,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  return updateVenueRecord({ venueId, isActive });
}
