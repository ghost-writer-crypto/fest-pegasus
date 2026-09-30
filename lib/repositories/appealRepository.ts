import { createClient } from "@/lib/supabase/server";
import type {
  AppealRow,
  AdminAppealRow,
  CreateAppealInput,
  ReviewAppealInput,
  IdentityRole,
} from "@/lib/types";

export type {
  AppealRow,
  AdminAppealRow,
  CreateAppealInput,
  ReviewAppealInput,
};
import type { ResultRow } from "./resultRepository";
import {
  DEFAULT_APPEAL_FEE,
  DEFAULT_APPEAL_WINDOW_MINUTES,
  validateAppealSubmission,
  validateAppealDecision,
  calculateAppealWindow,
} from "@/lib/appeals/appealEngine";
import { appeals as inMemoryAppeals } from "@/data/appeals";

export const APPEAL_COLUMNS =
  "id, festival_id, event_id, competition_id, fixture_id, result_id, team_id, participant_id, submitted_by, submitter_name, submitter_role, reason_category, title, description, evidence_references, published_at, deadline_at, window_minutes, fee_amount, fee_status, status, reviewed_by, reviewer_name, reviewed_at, decision_notes, corrected_result_payload, metadata, created_at, updated_at" as const;

/**
 * Retrieves all appeals for a given festival with joined operational metadata.
 */
export async function getAppealsByFestival(
  festivalId: string,
): Promise<AdminAppealRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return (inMemoryAppeals as unknown as AdminAppealRow[]).filter(
      (a) => a.festival_id === festivalId || festivalId === "pegasus-2026",
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appeals")
    .select(`
      ${APPEAL_COLUMNS},
      events (
        code,
        name
      ),
      teams (
        code,
        name
      ),
      participants (
        name
      ),
      results (
        rank,
        points,
        status
      )
    `)
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      `[appealRepository.getAppealsByFestival] Error fetching appeals:`,
      error,
    );
    return (inMemoryAppeals as unknown as AdminAppealRow[]).filter(
      (a) => a.festival_id === festivalId || festivalId === "pegasus-2026",
    );
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    festival_id: row.festival_id,
    event_id: row.event_id,
    competition_id: row.competition_id,
    fixture_id: row.fixture_id,
    result_id: row.result_id,
    team_id: row.team_id,
    participant_id: row.participant_id,
    submitted_by: row.submitted_by,
    submitter_name: row.submitter_name,
    submitter_role: row.submitter_role,
    reason_category: row.reason_category,
    title: row.title,
    description: row.description,
    evidence_references: row.evidence_references ?? [],
    published_at: row.published_at,
    deadline_at: row.deadline_at,
    window_minutes: row.window_minutes,
    fee_amount: Number(row.fee_amount),
    fee_status: row.fee_status,
    status: row.status,
    reviewed_by: row.reviewed_by,
    reviewer_name: row.reviewer_name,
    reviewed_at: row.reviewed_at,
    decision_notes: row.decision_notes,
    corrected_result_payload: row.corrected_result_payload,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    eventName: row.events?.name,
    eventCode: row.events?.code,
    teamName: row.teams?.name,
    teamCode: row.teams?.code,
    participantName: row.participants?.name,
    resultRank: row.results?.rank,
    resultPoints: row.results?.points,
    resultStatus: row.results?.status,
  }));
}

/**
 * Retrieves appeals lodged by or concerning a specific house/team.
 */
export async function getAppealsByTeam(
  festivalId: string,
  teamId: string,
): Promise<AdminAppealRow[]> {
  const all = await getAppealsByFestival(festivalId);
  return all.filter((a) => a.team_id === teamId);
}

/**
 * Retrieves appeals filed against a specific result.
 */
export async function getAppealsByResult(
  resultId: string,
): Promise<AdminAppealRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return (inMemoryAppeals as unknown as AdminAppealRow[]).filter(
      (a) => a.result_id === resultId,
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appeals")
    .select(APPEAL_COLUMNS)
    .eq("result_id", resultId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      `[appealRepository.getAppealsByResult] Error for result ${resultId}:`,
      error,
    );
    return [];
  }

  return (data as AdminAppealRow[]) ?? [];
}

/**
 * Retrieves a single appeal by ID.
 */
export async function getAppealById(
  appealId: string,
): Promise<AdminAppealRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    const found = (inMemoryAppeals as unknown as AdminAppealRow[]).find(
      (a) => a.id === appealId,
    );
    return found ?? null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appeals")
    .select(`
      ${APPEAL_COLUMNS},
      events (
        code,
        name
      ),
      teams (
        code,
        name
      ),
      participants (
        name
      ),
      results (
        rank,
        points,
        status
      )
    `)
    .eq("id", appealId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as any;
  return {
    id: row.id,
    festival_id: row.festival_id,
    event_id: row.event_id,
    competition_id: row.competition_id,
    fixture_id: row.fixture_id,
    result_id: row.result_id,
    team_id: row.team_id,
    participant_id: row.participant_id,
    submitted_by: row.submitted_by,
    submitter_name: row.submitter_name,
    submitter_role: row.submitter_role,
    reason_category: row.reason_category,
    title: row.title,
    description: row.description,
    evidence_references: row.evidence_references ?? [],
    published_at: row.published_at,
    deadline_at: row.deadline_at,
    window_minutes: row.window_minutes,
    fee_amount: Number(row.fee_amount),
    fee_status: row.fee_status,
    status: row.status,
    reviewed_by: row.reviewed_by,
    reviewer_name: row.reviewer_name,
    reviewed_at: row.reviewed_at,
    decision_notes: row.decision_notes,
    corrected_result_payload: row.corrected_result_payload,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    eventName: row.events?.name,
    eventCode: row.events?.code,
    teamName: row.teams?.name,
    teamCode: row.teams?.code,
    participantName: row.participants?.name,
    resultRank: row.results?.rank,
    resultPoints: row.results?.points,
    resultStatus: row.results?.status,
  };
}

/**
 * Creates a formal appeal record with strict domain validation and window enforcement.
 */
export async function createAppealRecord(
  input: CreateAppealInput,
  actor: {
    userId: string;
    fullName: string;
    role: IdentityRole;
    teamId?: string | null;
  },
): Promise<{ success: boolean; data?: AppealRow; error?: string }> {
  const hasDb = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  let targetResult: {
    id: string;
    status: string;
    publishedAt: string | null;
    teamId?: string | null;
    participantId?: string | null;
  } | null = null;

  let existingAppealsForCheck: Array<{
    result_id: string | null;
    team_id: string;
    status: any;
  }> = [];

  if (hasDb) {
    const supabase = await createClient();

    // 1. Fetch target authoritative result
    const { data: resRow, error: resErr } = await supabase
      .from("results")
      .select("id, status, published_at, team_id, participant_id")
      .eq("id", input.resultId)
      .maybeSingle();

    if (resErr || !resRow) {
      return { success: false, error: "Authoritative result record not found." };
    }

    targetResult = {
      id: resRow.id,
      status: resRow.status,
      publishedAt: resRow.published_at,
      teamId: resRow.team_id,
      participantId: resRow.participant_id,
    };

    // 2. Fetch existing appeals for duplicate prevention
    const { data: existApps } = await supabase
      .from("appeals")
      .select("result_id, team_id, status")
      .eq("result_id", input.resultId)
      .eq("team_id", input.teamId);

    existingAppealsForCheck = existApps ?? [];
  } else {
    // In-memory fallback
    targetResult = {
      id: input.resultId,
      status: "published",
      publishedAt: new Date().toISOString(),
      teamId: input.teamId,
      participantId: input.participantId,
    };
    existingAppealsForCheck = (inMemoryAppeals as any[]).filter(
      (a) => a.result_id === input.resultId && a.team_id === input.teamId,
    );
  }

  // 3. Domain Validation (Window, Permissions, Role, Duplicates)
  const validation = validateAppealSubmission({
    input,
    actor,
    result: targetResult,
    existingAppeals: existingAppealsForCheck,
  });

  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const windowMinutes = input.windowMinutes ?? DEFAULT_APPEAL_WINDOW_MINUTES;
  const deadlineAt =
    validation.deadlineAt ??
    calculateAppealWindow(targetResult.publishedAt, windowMinutes).deadlineAt ??
    new Date(Date.now() + windowMinutes * 60 * 1000).toISOString();

  const insertPayload = {
    festival_id: input.festivalId,
    event_id: input.eventId,
    competition_id: input.competitionId ?? null,
    fixture_id: input.fixtureId ?? null,
    result_id: input.resultId,
    team_id: input.teamId,
    participant_id: input.participantId ?? null,
    submitted_by: actor.userId,
    submitter_name: actor.fullName,
    submitter_role: actor.role,
    reason_category: input.reasonCategory,
    title: input.title.trim(),
    description: input.description.trim(),
    evidence_references: input.evidenceReferences ?? [],
    published_at: targetResult.publishedAt,
    deadline_at: deadlineAt,
    window_minutes: windowMinutes,
    fee_amount: DEFAULT_APPEAL_FEE,
    fee_status: "unpaid" as const,
    status: "submitted" as const,
    metadata: input.metadata ?? {},
  };

  if (!hasDb) {
    const memoryRow: AppealRow = {
      id: `appeal-${Date.now()}`,
      ...insertPayload,
      reviewed_by: null,
      reviewer_name: null,
      reviewed_at: null,
      decision_notes: null,
      corrected_result_payload: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    (inMemoryAppeals as any[]).push(memoryRow);
    return { success: true, data: memoryRow };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appeals")
    .insert(insertPayload)
    .select(APPEAL_COLUMNS)
    .single();

  if (error) {
    console.error("[appealRepository.createAppealRecord] Database insert failed:", error);
    return { success: false, error: `Failed to record appeal: ${error.message}` };
  }

  return { success: true, data: data as AppealRow };
}

/**
 * Adjudicates an appeal and, if accepted with modifications, applies controlled
 * corrections to the authoritative result and logs an official audit record.
 *
 * Invariant: Never alters leaderboard points directly; triggers canonical scoring
 * recalculation from the corrected authoritative result in public.results.
 */
export async function reviewAppealRecord(
  input: ReviewAppealInput,
  reviewer: {
    userId: string;
    fullName: string;
    role: IdentityRole;
  },
): Promise<{ success: boolean; data?: AppealRow; error?: string }> {
  const hasDb = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  let appeal: AppealRow | null = null;
  let supabase: any = null;

  if (hasDb) {
    supabase = await createClient();
    const { data: appRow, error: appErr } = await supabase
      .from("appeals")
      .select("*")
      .eq("id", input.appealId)
      .maybeSingle();

    if (appErr || !appRow) {
      return { success: false, error: "Appeal record not found." };
    }
    appeal = appRow as AppealRow;
  } else {
    appeal =
      (inMemoryAppeals as any[]).find((a) => a.id === input.appealId) ?? null;
    if (!appeal) {
      return { success: false, error: "Appeal record not found." };
    }
  }

  // 1. Domain validation on decision and lifecycle state machine
  const decisionValidation = validateAppealDecision({
    currentStatus: appeal.status,
    targetStatus: input.status,
    reviewerRole: reviewer.role,
    decisionNotes: input.decisionNotes,
  });

  if (!decisionValidation.valid) {
    return { success: false, error: decisionValidation.error };
  }

  const timestamp = new Date().toISOString();

  // 2. Controlled Result Correction Workflow
  // If the appeal is accepted or partially upheld AND includes result corrections
  if (
    (input.status === "accepted" || input.status === "partially_upheld") &&
    input.correctedResult &&
    appeal.result_id
  ) {
    if (hasDb) {
      // Fetch authoritative result
      const { data: currentRes, error: resErr } = await supabase
        .from("results")
        .select("*")
        .eq("id", appeal.result_id)
        .maybeSingle();

      if (resErr || !currentRes) {
        return {
          success: false,
          error: `Authoritative result '${appeal.result_id}' could not be located to apply appeal correction.`,
        };
      }

      const beforeState = {
        rank: currentRes.rank,
        points: currentRes.points,
        performance: currentRes.performance,
        disposition: currentRes.disposition,
        status: currentRes.status,
      };

      const updateFields: Record<string, unknown> = {
        status: "published",
        is_official: true,
        updated_at: timestamp,
      };

      if (input.correctedResult.rank !== undefined) {
        updateFields.rank = input.correctedResult.rank;
      }
      if (input.correctedResult.points !== undefined) {
        updateFields.points = input.correctedResult.points;
      }
      if (input.correctedResult.performance !== undefined) {
        updateFields.performance = input.correctedResult.performance;
      }
      if (input.correctedResult.disposition !== undefined) {
        updateFields.disposition = input.correctedResult.disposition;
      }

      // Update authoritative result
      const { error: resUpdateErr } = await supabase
        .from("results")
        .update(updateFields)
        .eq("id", appeal.result_id);

      if (resUpdateErr) {
        return {
          success: false,
          error: `Failed to update authoritative result from appeal decision: ${resUpdateErr.message}`,
        };
      }

      // Log decision audit entry into public.result_audit_entries
      await supabase.from("result_audit_entries").insert({
        result_id: appeal.result_id,
        actor_id: reviewer.userId,
        action: `appeal_${input.status}`,
        reason: `Appeal ${appeal.id} decided (${input.status}) by ${reviewer.fullName}: ${input.decisionNotes.trim()}`,
        before_state: beforeState,
        after_state: updateFields,
      });
    }
  }

  // 3. Update Appeal Status & Decision
  const updatePayload = {
    status: input.status,
    reviewed_by: reviewer.userId,
    reviewer_name: reviewer.fullName,
    reviewed_at: timestamp,
    decision_notes: input.decisionNotes.trim(),
    fee_status: input.feeStatus ?? appeal.fee_status,
    corrected_result_payload: (input.correctedResult as any) ?? null,
    updated_at: timestamp,
  };

  if (!hasDb) {
    Object.assign(appeal, updatePayload);
    return { success: true, data: appeal };
  }

  const { data: updatedAppeal, error: appUpdateErr } = await supabase
    .from("appeals")
    .update(updatePayload)
    .eq("id", input.appealId)
    .select(APPEAL_COLUMNS)
    .single();

  if (appUpdateErr) {
    console.error("[appealRepository.reviewAppealRecord] Update failed:", appUpdateErr);
    return { success: false, error: `Failed to update appeal: ${appUpdateErr.message}` };
  }

  return { success: true, data: updatedAppeal as AppealRow };
}
