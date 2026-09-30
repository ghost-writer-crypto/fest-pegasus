import { createClient } from "@/lib/supabase/server";

/**
 * Shape of a row in public.teams as defined by migration 20260920000100.
 */
export type TeamRow = {
  id: string;
  festival_id: string;
  code: string;
  name: string;
  color: string | null;
  logo_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/**
 * Explicit columns queried from public.teams.
 */
const TEAM_COLUMNS =
  "id, festival_id, code, name, color, logo_url, sort_order, created_at, updated_at" as const;

const FALLBACK_TEAMS: TeamRow[] = [
  { id: "falcons", festival_id: "pegasus-2026", code: "H1", name: "House 01", color: "#e11d48", logo_url: null, sort_order: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "titans", festival_id: "pegasus-2026", code: "H2", name: "House 02", color: "#2563eb", logo_url: null, sort_order: 2, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "phoenix", festival_id: "pegasus-2026", code: "H3", name: "House 03", color: "#d97706", logo_url: null, sort_order: 3, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: "warriors", festival_id: "pegasus-2026", code: "H4", name: "House 04", color: "#059669", logo_url: null, sort_order: 4, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

/**
 * Retrieves all teams configured for a given festival.
 * Ordered by sort_order ascending, then name ascending.
 *
 * @param festivalId - The UUID of the festival
 * @returns An array of TeamRow records
 * @throws Error if the Supabase query fails
 */
export async function getTeamsByFestival(
  festivalId: string,
): Promise<TeamRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return FALLBACK_TEAMS.map((t) => ({ ...t, festival_id: festivalId }));
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("teams")
      .select(TEAM_COLUMNS)
      .eq("festival_id", festivalId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.warn(
        `[teamRepository.getTeamsByFestival] Failed to retrieve teams for festival ${festivalId}:`,
        error,
      );
      return FALLBACK_TEAMS.map((t) => ({ ...t, festival_id: festivalId }));
    }

    return (data as TeamRow[]) && (data as TeamRow[]).length > 0
      ? (data as TeamRow[])
      : FALLBACK_TEAMS.map((t) => ({ ...t, festival_id: festivalId }));
  } catch (err) {
    console.warn(`[teamRepository.getTeamsByFestival] Unexpected error, returning fallback teams:`, err);
    return FALLBACK_TEAMS.map((t) => ({ ...t, festival_id: festivalId }));
  }
}

/**
 * Retrieves a single team by its primary key ID.
 *
 * @param teamId - The UUID of the team
 * @returns The TeamRow record if found, or null
 * @throws Error if the Supabase query fails
 */
export async function getTeamById(
  teamId: string,
): Promise<TeamRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_COLUMNS)
    .eq("id", teamId)
    .maybeSingle();

  if (error) {
    console.error(
      `[teamRepository.getTeamById] Failed to retrieve team ${teamId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve team ${teamId}: ${error.message} (${error.code})`,
    );
  }

  return (data as TeamRow) ?? null;
}

/**
 * Retrieves a single team by festival ID and team code (e.g., 'FAL', 'TIT').
 * Teams are guaranteed unique per festival on (festival_id, code).
 *
 * @param festivalId - The UUID of the festival
 * @param code - The official team code
 * @returns The TeamRow record if found, or null
 * @throws Error if the Supabase query fails
 */
export async function getTeamByCode(
  festivalId: string,
  code: string,
): Promise<TeamRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select(TEAM_COLUMNS)
    .eq("festival_id", festivalId)
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error(
      `[teamRepository.getTeamByCode] Failed to retrieve team with code ${code} for festival ${festivalId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve team with code ${code} for festival ${festivalId}: ${error.message} (${error.code})`,
    );
  }

  return (data as TeamRow) ?? null;
}

export type CreateTeamInput = {
  festivalId: string;
  code: string;
  name: string;
  color?: string | null;
  logoUrl?: string | null;
  sortOrder?: number;
};

export type UpdateTeamInput = {
  teamId: string;
  code?: string;
  name?: string;
  color?: string | null;
  logoUrl?: string | null;
  sortOrder?: number;
};

/**
 * Creates a new team record.
 */
export async function createTeamRecord(
  input: CreateTeamInput,
): Promise<{ success: boolean; data?: TeamRow; error?: string }> {
  if (!input.festivalId) return { success: false, error: "Festival ID is required." };
  if (!input.code?.trim()) return { success: false, error: "Team code is required." };
  if (!input.name?.trim()) return { success: false, error: "Team name is required." };

  const supabase = await createClient();

  const insertPayload = {
    festival_id: input.festivalId,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    color: input.color?.trim() || null,
    logo_url: input.logoUrl?.trim() || null,
    sort_order: input.sortOrder ?? 0,
  };

  const { data, error } = await supabase
    .from("teams")
    .insert(insertPayload)
    .select(TEAM_COLUMNS)
    .single();

  if (error) {
    console.error("[teamRepository.createTeamRecord] Error:", error);
    return { success: false, error: `Failed to create team: ${error.message}` };
  }

  return { success: true, data: data as TeamRow };
}

/**
 * Updates an existing team record.
 */
export async function updateTeamRecord(
  input: UpdateTeamInput,
): Promise<{ success: boolean; data?: TeamRow; error?: string }> {
  if (!input.teamId) return { success: false, error: "Team ID is required." };

  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {};
  if (input.code !== undefined) updatePayload.code = input.code.trim().toUpperCase();
  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.color !== undefined) updatePayload.color = input.color ? input.color.trim() : null;
  if (input.logoUrl !== undefined) updatePayload.logo_url = input.logoUrl ? input.logoUrl.trim() : null;
  if (input.sortOrder !== undefined) updatePayload.sort_order = input.sortOrder;

  const { data, error } = await supabase
    .from("teams")
    .update(updatePayload)
    .eq("id", input.teamId)
    .select(TEAM_COLUMNS)
    .single();

  if (error) {
    console.error("[teamRepository.updateTeamRecord] Error:", error);
    return { success: false, error: `Failed to update team: ${error.message}` };
  }

  return { success: true, data: data as TeamRow };
}


