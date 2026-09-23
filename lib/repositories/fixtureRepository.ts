import { createClient } from "@/lib/supabase/server";
import type {
  CompetitionFormat,
  FixtureStatus,
  CreateFixtureInput,
  UpdateFixtureInput,
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
  status: string;
  round_name: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Shape of a row in public.fixtures matching migrations 001 and 009.
 */
export type FixtureRow = {
  id: string;
  competition_id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  scheduled_at: string | null;
  venue_id: string | null;
  status: FixtureStatus;
  score_home: number | null;
  score_away: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export const COMPETITION_COLUMNS =
  "id, festival_id, event_id, division_id, name, format, status, round_name, created_at, updated_at" as const;

export const FIXTURE_COLUMNS =
  "id, competition_id, home_team_id, away_team_id, scheduled_at, venue_id, status, score_home, score_away, metadata, created_at, updated_at" as const;

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
      `[fixtureRepository.getCompetitionsByFestival] Failed to retrieve competitions for festival ${festivalId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve competitions for festival ${festivalId}: ${error.message} (${error.code})`,
    );
  }

  return (data as CompetitionRow[]) ?? [];
}

/**
 * Retrieves all fixtures for a specific competition instance.
 */
export async function getFixturesByCompetition(
  competitionId: string,
): Promise<FixtureRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fixtures")
    .select(FIXTURE_COLUMNS)
    .eq("competition_id", competitionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      `[fixtureRepository.getFixturesByCompetition] Failed to retrieve fixtures for competition ${competitionId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve fixtures for competition ${competitionId}: ${error.message} (${error.code})`,
    );
  }

  return (data as FixtureRow[]) ?? [];
}

/**
 * Retrieves a single fixture by primary key ID.
 */
export async function getFixtureById(
  fixtureId: string,
): Promise<FixtureRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fixtures")
    .select(FIXTURE_COLUMNS)
    .eq("id", fixtureId)
    .maybeSingle();

  if (error) {
    console.error(
      `[fixtureRepository.getFixtureById] Failed to retrieve fixture ${fixtureId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve fixture: ${error.message} (${error.code})`,
    );
  }

  return (data as FixtureRow) ?? null;
}

/**
 * Retrieves all fixtures configured across competitions in a given festival.
 */
export async function getFixturesByFestival(
  festivalId: string,
): Promise<FixtureRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const competitions = await getCompetitionsByFestival(festivalId);
  if (competitions.length === 0) {
    return [];
  }

  const competitionIds = competitions.map((c) => c.id);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fixtures")
    .select(FIXTURE_COLUMNS)
    .in("competition_id", competitionIds)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (error) {
    console.error(
      `[fixtureRepository.getFixturesByFestival] Failed to retrieve festival fixtures:`,
      error,
    );
    throw new Error(
      `Failed to retrieve fixtures for festival ${festivalId}: ${error.message} (${error.code})`,
    );
  }

  return (data as FixtureRow[]) ?? [];
}

/**
 * Creates a new manual fixture within a competition.
 */
export async function createFixtureRecord(
  input: CreateFixtureInput,
  actorId: string,
): Promise<{ success: boolean; data?: FixtureRow; error?: string }> {
  const supabase = await createClient();

  if (!input.competitionId?.trim()) {
    return { success: false, error: "Competition ID is required." };
  }

  // 1. Verify competition state
  const { data: comp, error: compErr } = await supabase
    .from("competitions")
    .select("id, status, festival_id")
    .eq("id", input.competitionId.trim())
    .maybeSingle();

  if (compErr || !comp) {
    return { success: false, error: "Parent competition not found." };
  }

  if (comp.status === "completed" || comp.status === "cancelled") {
    return {
      success: false,
      error: `Cannot add fixtures to a ${comp.status} competition.`,
    };
  }

  // 2. Validate Entrants (no self-match)
  if (input.homeTeamId && input.awayTeamId && input.homeTeamId === input.awayTeamId) {
    return {
      success: false,
      error: "Home and Away entrants cannot be the same team.",
    };
  }

  // 3. Insert fixture
  const { data: newFixture, error: insertError } = await supabase
    .from("fixtures")
    .insert({
      competition_id: input.competitionId.trim(),
      home_team_id: input.homeTeamId?.trim() || null,
      away_team_id: input.awayTeamId?.trim() || null,
      scheduled_at: input.scheduledAt || null,
      venue_id: input.venueId?.trim() || null,
      status: input.status || "scheduled",
      score_home: null,
      score_away: null,
      metadata: input.metadata || {},
    })
    .select(FIXTURE_COLUMNS)
    .single();

  if (insertError || !newFixture) {
    console.error("[fixtureRepository.createFixtureRecord] Insert error:", insertError);
    return {
      success: false,
      error: `Failed to create fixture: ${insertError?.message || "Unknown error"}`,
    };
  }

  // 4. Audit
  await supabase.from("competition_change_entries").insert({
    competition_id: input.competitionId.trim(),
    fixture_id: newFixture.id,
    actor_id: actorId,
    action: "fixture_created",
    reason: "New fixture added to competition",
    before_state: null,
    after_state: newFixture,
  });

  return { success: true, data: newFixture as FixtureRow };
}

/**
 * Updates fixture allocation (teams, schedule, venue, metadata).
 */
export async function updateFixtureRecord(
  input: UpdateFixtureInput,
  actorId: string,
): Promise<{ success: boolean; data?: FixtureRow; error?: string }> {
  const supabase = await createClient();

  if (!input.fixtureId?.trim()) {
    return { success: false, error: "Fixture ID is required." };
  }

  const existing = await getFixtureById(input.fixtureId.trim());
  if (!existing) {
    return { success: false, error: "Fixture not found." };
  }

  if (input.homeTeamId && input.awayTeamId && input.homeTeamId === input.awayTeamId) {
    return {
      success: false,
      error: "Home and Away entrants cannot be the same team.",
    };
  }

  const { data: updated, error: updateError } = await supabase
    .from("fixtures")
    .update({
      home_team_id: input.homeTeamId?.trim() || null,
      away_team_id: input.awayTeamId?.trim() || null,
      scheduled_at: input.scheduledAt || null,
      venue_id: input.venueId?.trim() || null,
      status: input.status || existing.status,
      metadata: input.metadata || existing.metadata,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.fixtureId.trim())
    .select(FIXTURE_COLUMNS)
    .single();

  if (updateError || !updated) {
    console.error("[fixtureRepository.updateFixtureRecord] Update error:", updateError);
    return {
      success: false,
      error: `Failed to update fixture: ${updateError?.message || "Unknown error"}`,
    };
  }

  // Audit
  await supabase.from("competition_change_entries").insert({
    competition_id: existing.competition_id,
    fixture_id: updated.id,
    actor_id: actorId,
    action: "fixture_updated",
    reason: "Fixture details updated",
    before_state: existing,
    after_state: updated,
  });

  return { success: true, data: updated as FixtureRow };
}

/**
 * Updates fixture operational status (scheduled -> live -> finished -> cancelled).
 */
export async function updateFixtureStatusRecord(
  fixtureId: string,
  newStatus: FixtureStatus,
  actorId: string,
  reason?: string,
): Promise<{ success: boolean; data?: FixtureRow; error?: string }> {
  const supabase = await createClient();

  const existing = await getFixtureById(fixtureId.trim());
  if (!existing) {
    return { success: false, error: "Fixture not found." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("fixtures")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fixtureId.trim())
    .select(FIXTURE_COLUMNS)
    .single();

  if (updateError || !updated) {
    console.error("[fixtureRepository.updateFixtureStatusRecord] Status error:", updateError);
    return {
      success: false,
      error: `Failed to transition fixture status: ${updateError?.message || "Unknown error"}`,
    };
  }

  // Audit
  await supabase.from("competition_change_entries").insert({
    competition_id: existing.competition_id,
    fixture_id: updated.id,
    actor_id: actorId,
    action: "fixture_status_changed",
    reason: reason?.trim() || `Fixture status updated to ${newStatus}`,
    before_state: existing,
    after_state: updated,
  });

  return { success: true, data: updated as FixtureRow };
}

/**
 * Updates operational fixture scores (score_home, score_away).
 * Strictly operational — does not publish official results or mutate results.points.
 */
export async function updateFixtureScoreRecord(
  fixtureId: string,
  scoreHome: number | null,
  scoreAway: number | null,
  actorId: string,
): Promise<{ success: boolean; data?: FixtureRow; error?: string }> {
  const supabase = await createClient();

  const existing = await getFixtureById(fixtureId.trim());
  if (!existing) {
    return { success: false, error: "Fixture not found." };
  }

  // Validate non-negative numbers if provided
  if (scoreHome !== null && (isNaN(scoreHome) || scoreHome < 0)) {
    return { success: false, error: "Home score must be a non-negative number." };
  }
  if (scoreAway !== null && (isNaN(scoreAway) || scoreAway < 0)) {
    return { success: false, error: "Away score must be a non-negative number." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("fixtures")
    .update({
      score_home: scoreHome,
      score_away: scoreAway,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fixtureId.trim())
    .select(FIXTURE_COLUMNS)
    .single();

  if (updateError || !updated) {
    console.error("[fixtureRepository.updateFixtureScoreRecord] Score update error:", updateError);
    return {
      success: false,
      error: `Failed to update fixture scores: ${updateError?.message || "Unknown error"}`,
    };
  }

  // Audit
  await supabase.from("competition_change_entries").insert({
    competition_id: existing.competition_id,
    fixture_id: updated.id,
    actor_id: actorId,
    action: "fixture_scores_updated",
    reason: `Operational score updated: ${scoreHome ?? "-"} - ${scoreAway ?? "-"}`,
    before_state: existing,
    after_state: updated,
  });

  return { success: true, data: updated as FixtureRow };
}

/**
 * Generates first-round knockout fixtures for selected eligible teams.
 * Rejects odd entrant counts with a clear message rather than inventing fake byes.
 */
export async function generateKnockoutFixturesRecord(
  competitionId: string,
  teamIds: string[],
  actorId: string,
  roundName = "Quarter Finals",
): Promise<{ success: boolean; count?: number; error?: string }> {
  const supabase = await createClient();

  if (!teamIds || teamIds.length < 2) {
    return {
      success: false,
      error: "At least 2 teams are required to generate knockout fixtures.",
    };
  }

  if (teamIds.length % 2 !== 0) {
    return {
      success: false,
      error: `Manual fixture setup required for this entrant count (odd count: ${teamIds.length}). Automated knockout pairings require an even number of entrants.`,
    };
  }

  // Verify competition state
  const { data: comp, error: compErr } = await supabase
    .from("competitions")
    .select("id, status")
    .eq("id", competitionId.trim())
    .maybeSingle();

  if (compErr || !comp) {
    return { success: false, error: "Competition not found." };
  }

  if (comp.status === "completed" || comp.status === "cancelled") {
    return {
      success: false,
      error: `Cannot generate fixtures in a ${comp.status} competition.`,
    };
  }

  // Pair teams sequentially: (0 vs 1), (2 vs 3), etc.
  const fixturesToInsert = [];
  for (let i = 0; i < teamIds.length; i += 2) {
    const homeTeamId = teamIds[i];
    const awayTeamId = teamIds[i + 1];
    const matchNumber = i / 2 + 1;

    fixturesToInsert.push({
      competition_id: competitionId.trim(),
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      status: "scheduled" as FixtureStatus,
      metadata: {
        round: roundName,
        matchNumber,
        generated: true,
      },
    });
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("fixtures")
    .insert(fixturesToInsert)
    .select(FIXTURE_COLUMNS);

  if (insertErr || !inserted) {
    console.error("[fixtureRepository.generateKnockoutFixturesRecord] Error:", insertErr);
    return {
      success: false,
      error: `Failed to generate fixtures: ${insertErr?.message || "Unknown error"}`,
    };
  }

  // Audit
  await supabase.from("competition_change_entries").insert({
    competition_id: competitionId.trim(),
    actor_id: actorId,
    action: "fixtures_generated",
    reason: `Generated ${inserted.length} ${roundName} fixtures for ${teamIds.length} entrants`,
    before_state: null,
    after_state: { generatedCount: inserted.length, round: roundName },
  });

  return { success: true, count: inserted.length };
}
