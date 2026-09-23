import { createClient } from "@/lib/supabase/server";
import type {
  CompetitionFormat,
  CompetitionStatus,
  CreateCompetitionInput,
  UpdateCompetitionInput,
} from "@/lib/types";

/**
 * Shape of a row in public.competitions matching migrations 001 and 009.
 */
export type CompetitionRow = {
  id: string;
  festival_id: string;
  event_id: string;
  division_id: string | null;
  name: string;
  format: CompetitionFormat;
  status: CompetitionStatus;
  round_name: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Shape of a row in public.competition_change_entries matching migration 009.
 */
export type CompetitionChangeRow = {
  id: string;
  competition_id: string;
  fixture_id: string | null;
  actor_id: string | null;
  action: string;
  reason: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
};

export const COMPETITION_COLUMNS =
  "id, festival_id, event_id, division_id, name, format, status, round_name, created_at, updated_at" as const;

export const COMPETITION_CHANGE_COLUMNS =
  "id, competition_id, fixture_id, actor_id, action, reason, before_state, after_state, created_at" as const;

/**
 * Retrieves all competitions for a given festival.
 */
export async function getCompetitionsByFestival(
  festivalId: string,
): Promise<CompetitionRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competitions")
    .select(COMPETITION_COLUMNS)
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      `[competitionRepository.getCompetitionsByFestival] Failed to retrieve competitions for festival ${festivalId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve competitions: ${error.message} (${error.code})`,
    );
  }

  return (data as CompetitionRow[]) ?? [];
}

/**
 * Retrieves a single competition by primary key ID.
 */
export async function getCompetitionById(
  competitionId: string,
): Promise<CompetitionRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competitions")
    .select(COMPETITION_COLUMNS)
    .eq("id", competitionId)
    .maybeSingle();

  if (error) {
    console.error(
      `[competitionRepository.getCompetitionById] Failed to retrieve competition ${competitionId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve competition: ${error.message} (${error.code})`,
    );
  }

  return (data as CompetitionRow) ?? null;
}

/**
 * Retrieves all competitions configured for an event within a festival.
 */
export async function getCompetitionsByEvent(
  festivalId: string,
  eventId: string,
): Promise<CompetitionRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competitions")
    .select(COMPETITION_COLUMNS)
    .eq("festival_id", festivalId)
    .eq("event_id", eventId)
    .order("name", { ascending: true });

  if (error) {
    console.error(
      `[competitionRepository.getCompetitionsByEvent] Failed to retrieve competitions for event ${eventId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve competitions: ${error.message} (${error.code})`,
    );
  }

  return (data as CompetitionRow[]) ?? [];
}

/**
 * Retrieves audit change entries for a competition.
 */
export async function getCompetitionChangeEntries(
  competitionId: string,
  limit = 50,
): Promise<CompetitionChangeRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("competition_change_entries")
    .select(COMPETITION_CHANGE_COLUMNS)
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(
      `[competitionRepository.getCompetitionChangeEntries] Failed to fetch changes for ${competitionId}:`,
      error,
    );
    return [];
  }

  return (data as CompetitionChangeRow[]) ?? [];
}

/**
 * Creates a new competition record in 'draft' status with audit tracking.
 */
export async function createCompetitionRecord(
  input: CreateCompetitionInput,
  actorId: string,
): Promise<{ success: boolean; data?: CompetitionRow; error?: string }> {
  const supabase = await createClient();

  if (!input.festivalId?.trim()) {
    return { success: false, error: "Festival ID is required." };
  }
  if (!input.eventId?.trim()) {
    return { success: false, error: "Event selection is required." };
  }
  if (!input.name?.trim()) {
    return { success: false, error: "Competition name is required." };
  }
  if (!input.format) {
    return { success: false, error: "Competition format is required." };
  }

  // 1. Verify Event belongs to Festival
  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("id, festival_id")
    .eq("id", input.eventId.trim())
    .maybeSingle();

  if (eventError || !eventData || eventData.festival_id !== input.festivalId.trim()) {
    return {
      success: false,
      error: "Selected event is invalid or does not belong to the active festival.",
    };
  }

  // 2. If division provided, verify Division belongs to Festival
  if (input.divisionId?.trim()) {
    const { data: divData, error: divError } = await supabase
      .from("divisions")
      .select("id, festival_id")
      .eq("id", input.divisionId.trim())
      .maybeSingle();

    if (divError || !divData || divData.festival_id !== input.festivalId.trim()) {
      return {
        success: false,
        error: "Selected division is invalid or does not belong to the active festival.",
      };
    }
  }

  // 3. Insert competition
  const { data: newComp, error: insertError } = await supabase
    .from("competitions")
    .insert({
      festival_id: input.festivalId.trim(),
      event_id: input.eventId.trim(),
      division_id: input.divisionId?.trim() || null,
      name: input.name.trim(),
      format: input.format,
      status: "draft",
      round_name: input.roundName?.trim() || null,
    })
    .select(COMPETITION_COLUMNS)
    .single();

  if (insertError || !newComp) {
    console.error("[competitionRepository.createCompetitionRecord] Insert error:", insertError);
    return {
      success: false,
      error: `Failed to create competition: ${insertError?.message || "Unknown error"}`,
    };
  }

  // 4. Log change audit
  await supabase.from("competition_change_entries").insert({
    competition_id: newComp.id,
    actor_id: actorId,
    action: "competition_created",
    reason: "Initial competition configuration created",
    before_state: null,
    after_state: newComp,
  });

  return { success: true, data: newComp as CompetitionRow };
}

/**
 * Updates competition metadata (name, format, roundName) with audit logging.
 */
export async function updateCompetitionRecord(
  input: UpdateCompetitionInput,
  actorId: string,
): Promise<{ success: boolean; data?: CompetitionRow; error?: string }> {
  const supabase = await createClient();

  if (!input.competitionId?.trim()) {
    return { success: false, error: "Competition ID is required." };
  }
  if (!input.name?.trim()) {
    return { success: false, error: "Competition name is required." };
  }

  const existing = await getCompetitionById(input.competitionId.trim());
  if (!existing) {
    return { success: false, error: "Competition not found." };
  }

  if (existing.status === "completed" || existing.status === "cancelled") {
    return {
      success: false,
      error: `Cannot modify a competition that is ${existing.status}.`,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("competitions")
    .update({
      name: input.name.trim(),
      format: input.format,
      round_name: input.roundName?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.competitionId.trim())
    .select(COMPETITION_COLUMNS)
    .single();

  if (updateError || !updated) {
    console.error("[competitionRepository.updateCompetitionRecord] Update error:", updateError);
    return {
      success: false,
      error: `Failed to update competition: ${updateError?.message || "Unknown error"}`,
    };
  }

  // Audit
  await supabase.from("competition_change_entries").insert({
    competition_id: updated.id,
    actor_id: actorId,
    action: "competition_updated",
    reason: "Competition metadata updated",
    before_state: existing,
    after_state: updated,
  });

  return { success: true, data: updated as CompetitionRow };
}

/**
 * Validates lifecycle transition and updates competition status with audit logging.
 */
export async function updateCompetitionStatusRecord(
  competitionId: string,
  newStatus: CompetitionStatus,
  actorId: string,
  reason?: string,
): Promise<{ success: boolean; data?: CompetitionRow; error?: string }> {
  const supabase = await createClient();

  const existing = await getCompetitionById(competitionId.trim());
  if (!existing) {
    return { success: false, error: "Competition not found." };
  }

  const current = existing.status;

  // Validation rules for lifecycle transitions:
  // draft -> ready, cancelled
  // ready -> draft, live, cancelled
  // live -> completed, cancelled
  // scheduled -> ready, live, cancelled
  // completed -> terminal (no change unless cancelled with explicit reason)
  // cancelled -> terminal
  const validTransitions: Record<string, string[]> = {
    draft: ["ready", "cancelled"],
    scheduled: ["ready", "live", "cancelled", "draft"],
    ready: ["draft", "live", "cancelled"],
    live: ["completed", "cancelled", "ready"],
    finished: ["completed", "live"],
    completed: [],
    cancelled: [],
  };

  const allowed = validTransitions[current] || [];
  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Invalid status transition from "${current}" to "${newStatus}".`,
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("competitions")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", competitionId.trim())
    .select(COMPETITION_COLUMNS)
    .single();

  if (updateError || !updated) {
    console.error("[competitionRepository.updateCompetitionStatusRecord] Status error:", updateError);
    return {
      success: false,
      error: `Failed to transition competition status: ${updateError?.message || "Unknown error"}`,
    };
  }

  // Audit
  await supabase.from("competition_change_entries").insert({
    competition_id: updated.id,
    actor_id: actorId,
    action: "status_changed",
    reason: reason?.trim() || `Status transitioned from ${current} to ${newStatus}`,
    before_state: existing,
    after_state: updated,
  });

  return { success: true, data: updated as CompetitionRow };
}

