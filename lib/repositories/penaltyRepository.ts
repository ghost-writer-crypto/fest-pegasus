import { createClient } from "@/lib/supabase/server";
import type { TeamPenalty } from "@/lib/types";

/**
 * Shape of a row in public.team_penalties as defined by migrations 001 and 008.
 */
export type PenaltyRow = {
  id: string;
  festival_id: string;
  team_id: string;
  event_id: string | null;
  points: number;
  reason: string;
  created_by: string | null;
  created_at: string;
  is_reversed: boolean;
  reversal_reason: string | null;
  reversed_by: string | null;
  reversed_at: string | null;
};

/**
 * Explicit columns queried from public.team_penalties.
 */
const PENALTY_COLUMNS =
  "id, festival_id, team_id, event_id, points, reason, created_by, created_at, is_reversed, reversal_reason, reversed_by, reversed_at" as const;

/**
 * Maps a raw database row to the strongly-typed TeamPenalty domain model.
 */
export function mapPenaltyRowToDomain(row: PenaltyRow): TeamPenalty {
  return {
    id: row.id,
    festivalId: row.festival_id,
    teamId: row.team_id,
    eventId: row.event_id,
    pointsDelta: Number(row.points),
    reason: row.reason,
    issuedBy: row.created_by,
    issuedAt: row.created_at,
    isReversed: Boolean(row.is_reversed),
    reversalReason: row.reversal_reason,
    reversedBy: row.reversed_by,
    reversedAt: row.reversed_at,
  };
}

/**
 * Retrieves all penalty records for a given festival.
 * Ordered by created_at descending.
 */
export async function getPenaltiesByFestival(
  festivalId: string,
  options: { includeReversed?: boolean } = { includeReversed: true },
): Promise<TeamPenalty[]> {
  const supabase = await createClient();

  let query = supabase
    .from("team_penalties")
    .select(PENALTY_COLUMNS)
    .eq("festival_id", festivalId);

  if (!options.includeReversed) {
    query = query.eq("is_reversed", false);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error(
      `[penaltyRepository.getPenaltiesByFestival] Failed to retrieve penalties for festival ${festivalId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve penalties: ${error.message} (${error.code})`,
    );
  }

  return (data as PenaltyRow[]).map(mapPenaltyRowToDomain);
}

/**
 * Retrieves active (non-reversed) penalty records for a given festival.
 */
export async function getActivePenaltiesByFestival(
  festivalId: string,
): Promise<TeamPenalty[]> {
  return getPenaltiesByFestival(festivalId, { includeReversed: false });
}

/**
 * Retrieves all penalty records for a specific team in a festival.
 */
export async function getPenaltiesByTeam(
  festivalId: string,
  teamId: string,
): Promise<TeamPenalty[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_penalties")
    .select(PENALTY_COLUMNS)
    .eq("festival_id", festivalId)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      `[penaltyRepository.getPenaltiesByTeam] Failed to retrieve penalties for team ${teamId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve team penalties: ${error.message} (${error.code})`,
    );
  }

  return (data as PenaltyRow[]).map(mapPenaltyRowToDomain);
}

/**
 * Retrieves a single penalty record by primary key ID.
 */
export async function getPenaltyById(
  penaltyId: string,
): Promise<TeamPenalty | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_penalties")
    .select(PENALTY_COLUMNS)
    .eq("id", penaltyId)
    .maybeSingle();

  if (error) {
    console.error(
      `[penaltyRepository.getPenaltyById] Failed to retrieve penalty ${penaltyId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve penalty: ${error.message} (${error.code})`,
    );
  }

  return data ? mapPenaltyRowToDomain(data as PenaltyRow) : null;
}

export type CreatePenaltyRecordInput = {
  festivalId: string;
  teamId: string;
  eventId?: string | null;
  ruleCode: "POST_EVENT_VIOLATION";
  reason: string;
};

/**
 * Creates a new active team penalty.
 * Derived server-side with -10 points according to standard regulation.
 */
export async function createPenaltyRecord(
  input: CreatePenaltyRecordInput,
  actorId: string,
): Promise<TeamPenalty> {
  const supabase = await createClient();

  if (!input.festivalId?.trim()) {
    throw new Error("Festival ID is required.");
  }
  if (!input.teamId?.trim()) {
    throw new Error("Team selection is required.");
  }
  if (!input.reason?.trim()) {
    throw new Error("A justification reason is required for team penalties.");
  }
  if (input.ruleCode !== "POST_EVENT_VIOLATION") {
    throw new Error(`Unsupported penalty rule code: ${input.ruleCode}`);
  }

  // Canonical -10 point penalty derived strictly server-side
  const points = -10;

  const { data, error } = await supabase
    .from("team_penalties")
    .insert({
      festival_id: input.festivalId.trim(),
      team_id: input.teamId.trim(),
      event_id: input.eventId?.trim() || null,
      points,
      reason: input.reason.trim(),
      created_by: actorId,
      is_reversed: false,
    })
    .select(PENALTY_COLUMNS)
    .single();

  if (error) {
    console.error(
      `[penaltyRepository.createPenaltyRecord] Failed to create penalty:`,
      error,
    );
    throw new Error(
      `Failed to create team penalty: ${error.message} (${error.code})`,
    );
  }

  return mapPenaltyRowToDomain(data as PenaltyRow);
}

export type ReversePenaltyRecordInput = {
  festivalId: string;
  penaltyId: string;
  reversalReason: string;
};

/**
 * Soft-reverses an active team penalty with audit tracking.
 * Prevents double reversals.
 */
export async function reversePenaltyRecord(
  input: ReversePenaltyRecordInput,
  actorId: string,
): Promise<TeamPenalty> {
  const supabase = await createClient();

  if (!input.penaltyId?.trim()) {
    throw new Error("Penalty ID is required.");
  }
  if (!input.reversalReason?.trim()) {
    throw new Error("A reversal reason is required.");
  }

  // 1. Fetch existing to ensure not already reversed
  const existing = await getPenaltyById(input.penaltyId.trim());
  if (!existing) {
    throw new Error(`Penalty ${input.penaltyId} not found.`);
  }
  if (existing.isReversed) {
    throw new Error("This penalty has already been reversed.");
  }
  if (existing.festivalId !== input.festivalId) {
    throw new Error("Penalty does not belong to the active festival.");
  }

  // 2. Perform soft reversal update
  const { data, error } = await supabase
    .from("team_penalties")
    .update({
      is_reversed: true,
      reversal_reason: input.reversalReason.trim(),
      reversed_by: actorId,
      reversed_at: new Date().toISOString(),
    })
    .eq("id", input.penaltyId.trim())
    .select(PENALTY_COLUMNS)
    .single();

  if (error) {
    console.error(
      `[penaltyRepository.reversePenaltyRecord] Failed to reverse penalty ${input.penaltyId}:`,
      error,
    );
    throw new Error(
      `Failed to reverse penalty: ${error.message} (${error.code})`,
    );
  }

  return mapPenaltyRowToDomain(data as PenaltyRow);
}

