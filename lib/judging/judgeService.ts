import {
  submitResult,
  createDraftResult,
  validateScoreSheetEntries,
  type ScoreSheetEntry,
} from "@/lib/results";
import {
  isJudgeAssignedToEvent,
  isJudgeAssignedToFixture,
  judgeAssignments,
} from "./assignmentUtils";
import {
  saveDraftResultsBatch,
  submitResultsBatch,
  type UpsertResultInput,
} from "@/lib/repositories";
import { getSafeEventPoints } from "@/lib/competition";
import type {
  JudgeAssignment,
  JudgeSubmissionParams,
  JudgeSubmissionResult,
} from "./types";


/**
 * Creates a new draft result for a judge.
 * Enforces the assignment boundary: a judge can only initiate drafts
 * for events or fixtures they are assigned to.
 */
export function createJudgeDraftResult(params: {
  id: string;
  judgeId: string;
  eventId: string;
  participantId?: string;
  teamId?: string;
  fixtureId?: string;
  position?: number;
  performance?: string;
  points?: number;
  assignments?: JudgeAssignment[];
}): JudgeSubmissionResult {
  const assignments = params.assignments ?? judgeAssignments;

  if (!isJudgeAssignedToEvent(params.judgeId, params.eventId, assignments)) {
    return {
      success: false,
      error: `Security Boundary Violation: Judge '${params.judgeId}' is not assigned to event '${params.eventId}'.`,
    };
  }

  if (
    params.fixtureId &&
    !isJudgeAssignedToFixture(params.judgeId, params.fixtureId, assignments)
  ) {
    return {
      success: false,
      error: `Security Boundary Violation: Judge '${params.judgeId}' is not assigned to fixture '${params.fixtureId}'.`,
    };
  }

  const draftResult = createDraftResult({
    id: params.id,
    eventId: params.eventId,
    participantId: params.participantId,
    teamId: params.teamId,
    fixtureId: params.fixtureId,
    position: params.position,
    performance: params.performance,
    points: params.points ?? 0,
  });

  if (!draftResult.success || !draftResult.result) {
    return {
      success: false,
      error: draftResult.error ?? "Failed to initialize draft result.",
    };
  }

  return {
    success: true,
    result: draftResult.result,
  };
}

/**
 * Submits a result from a judge into the official competition intake pipeline.
 *
 * Operational & Security Rules:
 * 1. Judge must be officially assigned to the event (and fixture if applicable).
 * 2. Judge cannot bypass lifecycle states (cannot directly set 'verified' or 'published').
 * 3. Advances status strictly from 'draft' to 'submitted'.
 * 4. Attaches judge provenance identifier as 'submittedBy'.
 * 5. Does NOT verify, publish, or award live points.
 */
export function submitJudgeResult(
  params: JudgeSubmissionParams,
): JudgeSubmissionResult {
  const { judgeId, judgeName, draft } = params;
  const assignments = params.assignments ?? judgeAssignments;

  // 1. Identification check
  if (!judgeId || judgeId.trim() === "") {
    return {
      success: false,
      error: "Judge identification (judgeId) is required for submission.",
    };
  }

  if (!judgeName || judgeName.trim() === "") {
    return {
      success: false,
      error: "Judge name is required for audit provenance (submittedBy).",
    };
  }

  // 2. Assignment Security Boundary
  if (!isJudgeAssignedToEvent(judgeId, draft.eventId, assignments)) {
    return {
      success: false,
      error: `Security Boundary Violation: Judge '${judgeId}' is not assigned to event '${draft.eventId}'.`,
    };
  }

  if (
    draft.fixtureId &&
    !isJudgeAssignedToFixture(judgeId, draft.fixtureId, assignments)
  ) {
    return {
      success: false,
      error: `Security Boundary Violation: Judge '${judgeId}' is not assigned to fixture '${draft.fixtureId}'.`,
    };
  }

  // 3. Prevent direct verification or publishing by judges
  if (draft.status === "verified" || draft.status === "published") {
    return {
      success: false,
      error: `Lifecycle Violation: Judges cannot directly produce '${draft.status}' results. Submissions must transition from 'draft' to 'submitted' for Chief Scorer review.`,
    };
  }

  // 4. Delegate to the canonical ResultService state-machine
  const transition = submitResult(draft, judgeName.trim());

  if (!transition.success || !transition.result) {
    return {
      success: false,
      error: transition.error ?? "Result submission failed validation.",
    };
  }

  return {
    success: true,
    result: transition.result,
  };
}

export type SaveScoreSheetParams = {
  festivalId: string;
  eventId: string;
  judgeId: string;
  judgeName?: string;
  entries: ScoreSheetEntry[];
  assignments?: JudgeAssignment[];
};

export type SubmitScoreSheetParams = {
  festivalId: string;
  eventId: string;
  judgeId: string;
  judgeName: string;
  entries: ScoreSheetEntry[];
  assignments?: JudgeAssignment[];
};

/**
 * Saves draft score sheet entries to the database via repository layer.
 * Enforces assignment boundary if assignments are provisioned.
 * Prevents lifecycle escalation (status strictly remains 'draft').
 */
export async function saveJudgeScoreSheetDraft(
  params: SaveScoreSheetParams,
): Promise<{ success: boolean; count?: number; error?: string }> {
  const { festivalId, eventId, judgeId, judgeName, entries } = params;
  const assignments = params.assignments ?? judgeAssignments;

  if (
    assignments.length > 0 &&
    !isJudgeAssignedToEvent(judgeId, eventId, assignments)
  ) {
    return {
      success: false,
      error: `Security Boundary Violation: Judge '${judgeId}' is not assigned to event '${eventId}'.`,
    };
  }

  // Pre-validate entries
  const validation = validateScoreSheetEntries(entries, "individual", false);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join("; ")}`,
    };
  }

  // Derive points safely via competition engine without fabricating rules
  const resultInputs: UpsertResultInput[] = entries.map((e) => {
    const points =
      e.rank && e.disposition === "normal"
        ? (getSafeEventPoints(eventId, e.rank) ?? 0)
        : 0;

    return {
      id: e.resultId,
      festival_id: festivalId,
      event_id: eventId,
      participant_id: e.participantId ?? null,
      team_id: e.teamId ?? null,
      fixture_id: e.fixtureId ?? null,
      rank: e.rank ?? null,
      points,
      performance: e.performanceRaw ? { raw: e.performanceRaw } : {},
      disposition: e.disposition,
      status: "draft",
    };
  });

  return saveDraftResultsBatch(resultInputs, judgeId, judgeName);
}

/**
 * Submits an official score sheet to the Chief Scorer verification queue.
 * Enforces:
 * 1. Judge identification and provenance name are required.
 * 2. Assignment check if assignments are provisioned.
 * 3. Strict lifecycle transition: status moves to 'submitted', never directly to 'verified' or 'published'.
 * 4. Immutability guard against overwriting verified/published records.
 * 5. Codex points derivation via competition engine.
 */
export async function submitJudgeScoreSheet(
  params: SubmitScoreSheetParams,
): Promise<{ success: boolean; count?: number; error?: string }> {
  const { festivalId, eventId, judgeId, judgeName, entries } = params;
  const assignments = params.assignments ?? judgeAssignments;

  if (!judgeName || judgeName.trim() === "") {
    return {
      success: false,
      error: "Judge name is required for audit provenance (submitted_by).",
    };
  }

  if (
    assignments.length > 0 &&
    !isJudgeAssignedToEvent(judgeId, eventId, assignments)
  ) {
    return {
      success: false,
      error: `Security Boundary Violation: Judge '${judgeId}' is not assigned to event '${eventId}'.`,
    };
  }

  // Pre-validate entries for final submission
  const validation = validateScoreSheetEntries(entries, "individual", true);
  if (!validation.valid) {
    return {
      success: false,
      error: `Submission validation failed: ${validation.errors.join("; ")}`,
    };
  }

  // Derive points safely via competition engine without fabricating rules
  const resultInputs: UpsertResultInput[] = entries.map((e) => {
    const points =
      e.rank && e.disposition === "normal"
        ? (getSafeEventPoints(eventId, e.rank) ?? 0)
        : 0;

    return {
      id: e.resultId,
      festival_id: festivalId,
      event_id: eventId,
      participant_id: e.participantId ?? null,
      team_id: e.teamId ?? null,
      fixture_id: e.fixtureId ?? null,
      rank: e.rank ?? null,
      points,
      performance: e.performanceRaw ? { raw: e.performanceRaw } : {},
      disposition: e.disposition,
      status: "submitted",
    };
  });

  return submitResultsBatch(
    festivalId,
    eventId,
    judgeName,
    judgeId,
    resultInputs,
  );
}

