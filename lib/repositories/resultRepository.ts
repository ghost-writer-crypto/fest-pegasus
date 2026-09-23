import { createClient } from "@/lib/supabase/server";
import type { ResultStatus, ResultDisposition, Result } from "@/lib/types";
import {
  verifyResult,
  publishResult,
  unlockResultForCorrection,
} from "@/lib/results/resultService";

/**
 * Shape of a row in public.results as defined by migration 20260920000100.
 *
 * Internal provenance fields (submitted_by, verified_by linking to auth.users)
 * are intentionally omitted from public projections to protect administrative
 * and official identities.
 */
export type ResultRow = {
  id: string;
  festival_id: string;
  event_id: string;
  competition_id: string | null;
  fixture_id: string | null;
  participant_id: string | null;
  team_id: string | null;
  rank: number | null;
  points: number;
  performance: Record<string, unknown>;
  disposition: ResultDisposition;
  status: ResultStatus;
  is_official: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  submitted_by?: string | null;
  verified_by?: string | null;
};

/**
 * Explicit columns queried from public.results for public surfaces.
 * Excludes internal auth user references (submitted_by, verified_by).
 */
const RESULT_COLUMNS =
  "id, festival_id, event_id, competition_id, fixture_id, participant_id, team_id, rank, points, performance, disposition, status, is_official, published_at, created_at, updated_at" as const;

/**
 * Columns queried for internal operational surfaces (judge desk, admin verification).
 */
const OPERATIONAL_RESULT_COLUMNS =
  "id, festival_id, event_id, competition_id, fixture_id, participant_id, team_id, rank, points, performance, disposition, status, is_official, published_at, created_at, updated_at, submitted_by, verified_by" as const;


/**
 * Retrieves all published results for a given festival.
 *
 * Enforces strict public-domain filtering: returns ONLY results with status = 'published'.
 * Draft, submitted, verified, and un-republished corrected results are strictly excluded.
 *
 * @param festivalId - The UUID of the festival
 * @returns An array of published ResultRow records
 * @throws Error if the Supabase query fails
 */
export async function getPublishedResultsByFestival(
  festivalId: string,
): Promise<ResultRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("results")
    .select(RESULT_COLUMNS)
    .eq("festival_id", festivalId)
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      `[resultRepository.getPublishedResultsByFestival] Failed to retrieve published results for festival ${festivalId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve published results for festival ${festivalId}: ${error.message} (${error.code})`,
    );
  }

  return (data as ResultRow[]) ?? [];
}

/**
 * Retrieves all published results associated with a specific participant.
 *
 * Enforces strict public-domain filtering: returns ONLY results with status = 'published'.
 * Draft, submitted, verified, and un-republished corrected results are strictly excluded.
 *
 * @param participantId - The UUID of the participant
 * @returns An array of published ResultRow records
 * @throws Error if the Supabase query fails
 */
export async function getPublishedResultsByParticipant(
  participantId: string,
): Promise<ResultRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("results")
    .select(RESULT_COLUMNS)
    .eq("participant_id", participantId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      `[resultRepository.getPublishedResultsByParticipant] Failed to retrieve published results for participant ${participantId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve published results for participant ${participantId}: ${error.message} (${error.code})`,
    );
  }

  return (data as ResultRow[]) ?? [];
}

/**
 * Retrieves all results associated with a specific competition instance.
 * Ordered by rank ascending (null ranks placed last).
 *
 * @param competitionId - The UUID of the competition
 * @returns An array of ResultRow records
 * @throws Error if the Supabase query fails
 */
export async function getResultsByCompetition(
  competitionId: string,
): Promise<ResultRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("results")
    .select(RESULT_COLUMNS)
    .eq("competition_id", competitionId)
    .order("rank", { ascending: true, nullsFirst: false });

  if (error) {
    console.error(
      `[resultRepository.getResultsByCompetition] Failed to retrieve results for competition ${competitionId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve results for competition ${competitionId}: ${error.message} (${error.code})`,
    );
  }

  return (data as ResultRow[]) ?? [];
}

/**
 * Retrieves a single result record by its primary key ID.
 *
 * @param resultId - The UUID of the result
 * @returns The ResultRow record if found, or null
 * @throws Error if the Supabase query fails
 */
export async function getResultById(
  resultId: string,
): Promise<ResultRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("results")
    .select(RESULT_COLUMNS)
    .eq("id", resultId)
    .maybeSingle();

  if (error) {
    console.error(
      `[resultRepository.getResultById] Failed to retrieve result ${resultId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve result ${resultId}: ${error.message} (${error.code})`,
    );
  }

  return (data as ResultRow) ?? null;
}

/**
 * Shape of input payload for saving drafts or submitting results.
 */
export type UpsertResultInput = {
  id?: string;
  festival_id: string;
  event_id: string;
  competition_id?: string | null;
  fixture_id?: string | null;
  participant_id?: string | null;
  team_id?: string | null;
  rank?: number | null;
  points?: number;
  performance?: Record<string, unknown>;
  disposition?: ResultDisposition;
  status?: ResultStatus;
  is_official?: boolean;
  submitted_by?: string | null;
};

/**
 * Retrieves all results for a specific event (including draft and submitted).
 * Used by internal operational surfaces (judge desk, admin verification).
 *
 * @param festivalId - The UUID of the festival
 * @param eventId - The UUID of the event
 * @returns An array of ResultRow records
 */
export async function getResultsByEvent(
  festivalId: string,
  eventId: string,
): Promise<ResultRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("results")
    .select(OPERATIONAL_RESULT_COLUMNS)
    .eq("festival_id", festivalId)
    .eq("event_id", eventId)
    .order("rank", { ascending: true, nullsFirst: false });

  if (error) {
    console.error(
      `[resultRepository.getResultsByEvent] Failed to retrieve results for event ${eventId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve results for event ${eventId}: ${error.message} (${error.code})`,
    );
  }

  return (data as ResultRow[]) ?? [];
}

/**
 * Batch saves draft results without advancing lifecycle status.
 * Enforces security boundary: cannot overwrite submitted, verified, or published records.
 * Logs action to public.result_audit_entries.
 */
export async function saveDraftResultsBatch(
  entries: UpsertResultInput[],
  actorId?: string | null,
  actorName?: string,
): Promise<{ success: boolean; count: number; error?: string }> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return { success: true, count: entries.length };
  }

  if (entries.length === 0) {
    return { success: true, count: 0 };
  }

  const supabase = await createClient();
  const festivalId = entries[0].festival_id;
  const eventId = entries[0].event_id;

  // 1. Fetch existing results to ensure no submitted/verified/published records are overwritten
  const { data: existingRecords, error: fetchError } = await supabase
    .from("results")
    .select("id, participant_id, team_id, fixture_id, status")
    .eq("festival_id", festivalId)
    .eq("event_id", eventId);

  if (fetchError) {
    console.error(
      "[resultRepository.saveDraftResultsBatch] Fetch check error:",
      fetchError,
    );
  }

  const immutableStatuses: ResultStatus[] = [
    "submitted",
    "verified",
    "published",
  ];
  if (existingRecords) {
    for (const record of existingRecords) {
      if (immutableStatuses.includes(record.status as ResultStatus)) {
        const matchingEntry = entries.find(
          (e) =>
            (e.id && e.id === record.id) ||
            (e.participant_id && e.participant_id === record.participant_id) ||
            (e.fixture_id && e.fixture_id === record.fixture_id),
        );
        if (matchingEntry) {
          return {
            success: false,
            count: 0,
            error: `Security boundary violation: Cannot save draft for already ${record.status} result.`,
          };
        }
      }
    }
  }

  const isUuid = (val: string | null | undefined): boolean =>
    Boolean(
      val &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          val,
        ),
    );

  const validActorUuid = isUuid(actorId) ? actorId : null;

  // 2. Prepare draft rows
  const rowsToUpsert = entries.map((e) => {
    const existing = existingRecords?.find(
      (r) =>
        (e.participant_id && r.participant_id === e.participant_id) ||
        (e.fixture_id && r.fixture_id === e.fixture_id),
    );

    return {
      id: e.id || existing?.id || undefined,
      festival_id: e.festival_id,
      event_id: e.event_id,
      competition_id: e.competition_id ?? null,
      fixture_id: e.fixture_id ?? null,
      participant_id: e.participant_id ?? null,
      team_id: e.team_id ?? null,
      rank: e.rank ?? null,
      points: e.points ?? 0,
      performance: e.performance ?? {},
      disposition: e.disposition ?? "normal",
      status: "draft" as ResultStatus,
      is_official: false,
      submitted_by: validActorUuid,
      updated_at: new Date().toISOString(),
    };
  });

  const { data: upserted, error: upsertError } = await supabase
    .from("results")
    .upsert(rowsToUpsert)
    .select("id");

  if (upsertError) {
    console.error(
      "[resultRepository.saveDraftResultsBatch] Upsert error:",
      upsertError,
    );
    return {
      success: false,
      count: 0,
      error: `Failed to save drafts: ${upsertError.message}`,
    };
  }

  // 3. Log audit entries
  if (upserted && upserted.length > 0) {
    const auditEntries = upserted.map((row) => ({
      result_id: row.id,
      actor_id: validActorUuid,
      action: "save_draft",
      reason: validActorUuid
        ? (actorName ? `Draft saved by ${actorName}` : "Field score sheet draft saved")
        : `[NON-PRODUCTION TRANSITIONAL] Draft saved without cryptographic session: ${actorName || "Field Station"}`,
      after_state: { status: "draft" },
    }));


    const { error: auditError } = await supabase
      .from("result_audit_entries")
      .insert(auditEntries);

    if (auditError) {
      console.warn(
        "[resultRepository.saveDraftResultsBatch] Audit log warning:",
        auditError.message,
      );
    }
  }

  return { success: true, count: entries.length };
}

/**
 * Batch submits results, advancing status from 'draft' to 'submitted'.
 * Enforces:
 * - submittedBy provenance identifier is required.
 * - Cannot submit verified or published records.
 * - Attaches valid auth actor UUID or null to submitted_by.
 * - Logs action to public.result_audit_entries.
 */
export async function submitResultsBatch(
  festivalId: string,
  eventId: string,
  submittedBy: string,
  actorId: string | null,
  entries: UpsertResultInput[],
): Promise<{ success: boolean; count: number; error?: string }> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return { success: true, count: entries.length };
  }

  if (!submittedBy || submittedBy.trim() === "") {
    return {
      success: false,
      count: 0,
      error: "Judge name/provenance identifier is required for official submission.",
    };
  }

  if (entries.length === 0) {
    return { success: true, count: 0 };
  }

  const supabase = await createClient();

  // 1. Fetch existing results to guard immutability
  const { data: existingRecords, error: fetchError } = await supabase
    .from("results")
    .select("id, participant_id, team_id, fixture_id, status")
    .eq("festival_id", festivalId)
    .eq("event_id", eventId);

  if (fetchError) {
    console.error(
      "[resultRepository.submitResultsBatch] Fetch check error:",
      fetchError,
    );
  }

  if (existingRecords) {
    for (const record of existingRecords) {
      if (
        record.status === "submitted" ||
        record.status === "verified" ||
        record.status === "published"
      ) {
        const matchingEntry = entries.find(
          (e) =>
            (e.id && e.id === record.id) ||
            (e.participant_id && e.participant_id === record.participant_id) ||
            (e.fixture_id && e.fixture_id === record.fixture_id),
        );
        if (matchingEntry) {
          return {
            success: false,
            count: 0,
            error: `Security boundary violation: Cannot submit result. An existing record is already ${record.status}.`,
          };
        }
      }
    }
  }

  const isUuid = (val: string | null | undefined): boolean =>
    Boolean(
      val &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          val,
        ),
    );

  const validActorUuid = isUuid(actorId) ? actorId : null;

  // 2. Prepare submitted rows
  const rowsToUpsert = entries.map((e) => {
    const existing = existingRecords?.find(
      (r) =>
        (e.participant_id && r.participant_id === e.participant_id) ||
        (e.fixture_id && r.fixture_id === e.fixture_id),
    );

    return {
      id: e.id || existing?.id || undefined,
      festival_id: e.festival_id,
      event_id: e.event_id,
      competition_id: e.competition_id ?? null,
      fixture_id: e.fixture_id ?? null,
      participant_id: e.participant_id ?? null,
      team_id: e.team_id ?? null,
      rank: e.rank ?? null,
      points: e.points ?? 0,
      performance: e.performance ?? {},
      disposition: e.disposition ?? "normal",
      status: "submitted" as ResultStatus,
      is_official: false,
      submitted_by: validActorUuid,
      updated_at: new Date().toISOString(),
    };
  });

  const { data: upserted, error: upsertError } = await supabase
    .from("results")
    .upsert(rowsToUpsert)
    .select("id");

  if (upsertError) {
    console.error(
      "[resultRepository.submitResultsBatch] Upsert error:",
      upsertError,
    );
    return {
      success: false,
      count: 0,
      error: `Failed to submit results: ${upsertError.message}`,
    };
  }

  // 3. Log audit entries
  if (upserted && upserted.length > 0) {
    const auditEntries = upserted.map((row) => ({
      result_id: row.id,
      actor_id: validActorUuid,
      action: "submit_result",
      reason: validActorUuid
        ? `Official score sheet submitted by authenticated judge: ${submittedBy.trim()}`
        : `[NON-PRODUCTION TRANSITIONAL] Official score sheet submitted without cryptographic auth: ${submittedBy.trim()}`,
      after_state: {
        status: "submitted",
        submitted_by_name: submittedBy.trim(),
        authenticated_actor: Boolean(validActorUuid),
      },
    }));


    const { error: auditError } = await supabase
      .from("result_audit_entries")
      .insert(auditEntries);

    if (auditError) {
      console.warn(
        "[resultRepository.submitResultsBatch] Audit log warning:",
        auditError.message,
      );
    }
  }

  return { success: true, count: entries.length };
}

/**
  * Converts a database ResultRow to a domain Result model for domain validation services.
  */
function toDomainResult(row: ResultRow): Result {
  return {
    id: row.id,
    eventId: row.event_id,
    competitionId: row.competition_id ?? undefined,
    fixtureId: row.fixture_id ?? undefined,
    participantId: row.participant_id ?? undefined,
    teamId: row.team_id ?? undefined,
    position: row.rank ?? undefined,
    performance: row.performance as Result["performance"],
    points: Number(row.points),
    status: row.status,
    disposition: row.disposition,
    isOfficial: row.is_official,
    submittedBy: row.submitted_by ?? "Field Official",
    verifiedBy: row.verified_by ?? undefined,
    publishedAt: row.published_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Retrieves all results for a festival for internal operational/admin views.
 */
export async function getResultsByFestivalOperational(
  festivalId: string,
): Promise<ResultRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("results")
    .select(OPERATIONAL_RESULT_COLUMNS)
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      `[resultRepository.getResultsByFestivalOperational] Error:`,
      error,
    );
    throw new Error(
      `Failed to retrieve operational results: ${error.message} (${error.code})`,
    );
  }

  return (data as ResultRow[]) ?? [];
}

/**
 * Retrieves results filtered by specific status for admin queues (submitted, verified, published, etc.).
 */
export async function getResultsByStatus(
  festivalId: string,
  status: ResultStatus,
): Promise<ResultRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("results")
    .select(OPERATIONAL_RESULT_COLUMNS)
    .eq("festival_id", festivalId)
    .eq("status", status)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(
      `[resultRepository.getResultsByStatus] Error for status ${status}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve results for status ${status}: ${error.message} (${error.code})`,
    );
  }

  return (data as ResultRow[]) ?? [];
}

/**
 * Admin action to verify a submitted result.
 * Enforces domain validation, transitions status submitted -> verified, sets verified_by, and logs audit.
 */
export async function verifyResultRecord(
  resultId: string,
  verifiedByUuid: string,
  verifiedByName: string,
): Promise<{ success: boolean; result?: ResultRow; error?: string }> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return {
      success: false,
      error: "Supabase database environment is not configured.",
    };
  }

  const supabase = await createClient();

  // 1. Fetch the target result
  const { data: current, error: fetchError } = await supabase
    .from("results")
    .select(OPERATIONAL_RESULT_COLUMNS)
    .eq("id", resultId)
    .maybeSingle();

  if (fetchError || !current) {
    return {
      success: false,
      error: `Result not found: ${fetchError?.message || resultId}`,
    };
  }

  const currentRow = current as ResultRow;

  // 2. Enforce domain transition rules via resultService
  const domainModel = toDomainResult(currentRow);
  const transition = verifyResult(domainModel, verifiedByName);
  if (!transition.success) {
    return {
      success: false,
      error: transition.error || "Domain validation failed for verification.",
    };
  }

  // 3. Perform database update
  const timestamp = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("results")
    .update({
      status: "verified" as ResultStatus,
      verified_by: verifiedByUuid,
      updated_at: timestamp,
    })
    .eq("id", resultId)
    .select(OPERATIONAL_RESULT_COLUMNS)
    .single();

  if (updateError) {
    console.error("[resultRepository.verifyResultRecord] Update error:", updateError);
    return {
      success: false,
      error: `Failed to verify result: ${updateError.message}`,
    };
  }

  // 4. Log audit entry
  const { error: auditError } = await supabase
    .from("result_audit_entries")
    .insert({
      result_id: resultId,
      actor_id: verifiedByUuid,
      action: "verify_result",
      reason: `Result verified by Chief Scorer / Admin: ${verifiedByName}`,
      before_state: {
        status: currentRow.status,
        points: currentRow.points,
        rank: currentRow.rank,
      },
      after_state: {
        status: "verified",
        verified_by: verifiedByUuid,
        verified_by_name: verifiedByName,
        points: currentRow.points,
        rank: currentRow.rank,
      },
    });

  if (auditError) {
    console.warn(
      "[resultRepository.verifyResultRecord] Audit logging warning:",
      auditError.message,
    );
  }

  return {
    success: true,
    result: updated as ResultRow,
  };
}

/**
 * Admin action to publish a verified result.
 * Enforces domain validation, transitions status verified -> published, sets published_at and is_official = true, and logs audit.
 */
export async function publishResultRecord(
  resultId: string,
  publishedByUuid: string,
  publishedByName: string,
): Promise<{ success: boolean; result?: ResultRow; error?: string }> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return {
      success: false,
      error: "Supabase database environment is not configured.",
    };
  }

  const supabase = await createClient();

  // 1. Fetch the target result
  const { data: current, error: fetchError } = await supabase
    .from("results")
    .select(OPERATIONAL_RESULT_COLUMNS)
    .eq("id", resultId)
    .maybeSingle();

  if (fetchError || !current) {
    return {
      success: false,
      error: `Result not found: ${fetchError?.message || resultId}`,
    };
  }

  const currentRow = current as ResultRow;

  // 2. Enforce domain transition rules via resultService
  const domainModel = toDomainResult(currentRow);
  const timestamp = new Date().toISOString();
  const transition = publishResult(domainModel, timestamp);
  if (!transition.success) {
    return {
      success: false,
      error: transition.error || "Domain validation failed for publication.",
    };
  }

  // 3. Perform database update
  const { data: updated, error: updateError } = await supabase
    .from("results")
    .update({
      status: "published" as ResultStatus,
      is_official: true,
      published_at: timestamp,
      updated_at: timestamp,
    })
    .eq("id", resultId)
    .select(OPERATIONAL_RESULT_COLUMNS)
    .single();

  if (updateError) {
    console.error("[resultRepository.publishResultRecord] Update error:", updateError);
    return {
      success: false,
      error: `Failed to publish result: ${updateError.message}`,
    };
  }

  // 4. Log audit entry
  const { error: auditError } = await supabase
    .from("result_audit_entries")
    .insert({
      result_id: resultId,
      actor_id: publishedByUuid,
      action: "publish_result",
      reason: `Result officially published to leaderboard by Admin: ${publishedByName}`,
      before_state: {
        status: currentRow.status,
        points: currentRow.points,
        rank: currentRow.rank,
      },
      after_state: {
        status: "published",
        is_official: true,
        published_at: timestamp,
        published_by_name: publishedByName,
        points: currentRow.points,
        rank: currentRow.rank,
      },
    });

  if (auditError) {
    console.warn(
      "[resultRepository.publishResultRecord] Audit logging warning:",
      auditError.message,
    );
  }

  return {
    success: true,
    result: updated as ResultRow,
  };
}

/**
 * Admin action to unlock a verified or published result for formal correction.
 */
export async function unlockResultForCorrectionRecord(
  resultId: string,
  actorUuid: string,
  actorName: string,
  reason: string,
): Promise<{ success: boolean; result?: ResultRow; error?: string }> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return {
      success: false,
      error: "Supabase database environment is not configured.",
    };
  }

  if (!reason || reason.trim() === "") {
    return {
      success: false,
      error: "A valid reason is required to unlock a result for correction.",
    };
  }

  const supabase = await createClient();

  // 1. Fetch current result
  const { data: current, error: fetchError } = await supabase
    .from("results")
    .select(OPERATIONAL_RESULT_COLUMNS)
    .eq("id", resultId)
    .maybeSingle();

  if (fetchError || !current) {
    return {
      success: false,
      error: `Result not found: ${fetchError?.message || resultId}`,
    };
  }

  const currentRow = current as ResultRow;

  // 2. Enforce domain transition rules
  const domainModel = toDomainResult(currentRow);
  const transition = unlockResultForCorrection(domainModel, actorName, reason);
  if (!transition.success) {
    return {
      success: false,
      error: transition.error || "Domain validation failed for unlocking result.",
    };
  }

  // 3. Update database
  const timestamp = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("results")
    .update({
      status: "corrected" as ResultStatus,
      updated_at: timestamp,
    })
    .eq("id", resultId)
    .select(OPERATIONAL_RESULT_COLUMNS)
    .single();

  if (updateError) {
    console.error(
      "[resultRepository.unlockResultForCorrectionRecord] Update error:",
      updateError,
    );
    return {
      success: false,
      error: `Failed to unlock result: ${updateError.message}`,
    };
  }

  // 4. Log audit entry
  const { error: auditError } = await supabase
    .from("result_audit_entries")
    .insert({
      result_id: resultId,
      actor_id: actorUuid,
      action: "unlock_result",
      reason: `Result unlocked for correction by Admin ${actorName}: ${reason.trim()}`,
      before_state: {
        status: currentRow.status,
        points: currentRow.points,
        rank: currentRow.rank,
      },
      after_state: {
        status: "corrected",
        unlocked_by: actorUuid,
        reason: reason.trim(),
      },
    });

  if (auditError) {
    console.warn(
      "[resultRepository.unlockResultForCorrectionRecord] Audit logging warning:",
      auditError.message,
    );
  }

  return {
    success: true,
    result: updated as ResultRow,
  };
}

/**
 * Shape of a row in public.result_audit_entries.
 */
export type ResultAuditRow = {
  id: string;
  result_id: string;
  actor_id: string | null;
  action: string;
  reason: string | null;
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Retrieves the most recent result lifecycle audit entries.
 */
export async function getRecentResultAuditEntries(
  limit = 15,
): Promise<ResultAuditRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("result_audit_entries")
      .select(
        "id, result_id, actor_id, action, reason, before_state, after_state, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error(
        "[resultRepository.getRecentResultAuditEntries] Query error:",
        error,
      );
      return [];
    }

    return (data as ResultAuditRow[]) ?? [];
  } catch (err) {
    console.error(
      "[resultRepository.getRecentResultAuditEntries] Unexpected error:",
      err,
    );
    return [];
  }
}



