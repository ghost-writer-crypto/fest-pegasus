/**
 * PEGASUS Sports Festival — Appeals & Disputes Domain Engine
 *
 * Official Competition Rules (Pegasus Codex 2026):
 * - Authoritative Appeal Fee: ₹70
 * - Default Appeal Window: 30 minutes following official result publication (configurable)
 * - Eligibility: Team Managers (house representatives) or authorized event participants
 * - Lifecycle: SUBMITTED -> UNDER_REVIEW -> ACCEPTED | REJECTED | PARTIALLY_UPHELD
 * - Concurrency: No duplicate active appeals for the same result by the same house
 * - Invariant: Leaderboard points are NEVER directly mutated. Decisions that amend results
 *   trigger the authoritative result update and dynamic scoring recalculation pipeline.
 */

import type {
  AppealRow,
  AppealStatus,
  AppealReasonCategory,
  CreateAppealInput,
  IdentityRole,
  CorrectedResultPayload,
} from "../types/index.ts";

export const DEFAULT_APPEAL_FEE = 70;
export const DEFAULT_APPEAL_WINDOW_MINUTES = 30;

export interface AppealWindowStatus {
  isOpen: boolean;
  publishedAt: string | null;
  deadlineAt: string | null;
  remainingMinutes: number;
  remainingSeconds: number;
  isExpired: boolean;
}

export interface ValidateAppealSubmissionParams {
  input: CreateAppealInput;
  actor: {
    userId: string;
    role: IdentityRole;
    teamId?: string | null;
  };
  result: {
    id: string;
    status: string;
    publishedAt: string | null;
    teamId?: string | null;
    participantId?: string | null;
  };
  existingAppeals?: Array<{
    result_id: string | null;
    team_id: string;
    status: AppealStatus;
  }>;
  now?: string | Date;
}

export interface AppealValidationResult {
  valid: boolean;
  error?: string;
  deadlineAt?: string;
}

export interface ValidateAppealDecisionParams {
  currentStatus: AppealStatus;
  targetStatus: AppealStatus;
  reviewerRole: IdentityRole;
  decisionNotes: string;
}

/**
 * Calculates whether an appeal window is currently open for a published result.
 */
export function calculateAppealWindow(
  publishedAt: string | Date | null | undefined,
  windowMinutes: number = DEFAULT_APPEAL_WINDOW_MINUTES,
  nowTime: string | Date = new Date(),
): AppealWindowStatus {
  if (!publishedAt) {
    return {
      isOpen: false,
      publishedAt: null,
      deadlineAt: null,
      remainingMinutes: 0,
      remainingSeconds: 0,
      isExpired: false,
    };
  }

  const pubDate = new Date(publishedAt);
  if (isNaN(pubDate.getTime())) {
    return {
      isOpen: false,
      publishedAt: null,
      deadlineAt: null,
      remainingMinutes: 0,
      remainingSeconds: 0,
      isExpired: false,
    };
  }

  const deadlineMs = pubDate.getTime() + windowMinutes * 60 * 1000;
  const deadlineDate = new Date(deadlineMs);
  const nowMs = new Date(nowTime).getTime();
  const diffMs = deadlineMs - nowMs;

  if (diffMs <= 0) {
    return {
      isOpen: false,
      publishedAt: pubDate.toISOString(),
      deadlineAt: deadlineDate.toISOString(),
      remainingMinutes: 0,
      remainingSeconds: 0,
      isExpired: true,
    };
  }

  const remainingSeconds = Math.floor(diffMs / 1000);
  const remainingMinutes = Math.floor(remainingSeconds / 60);

  return {
    isOpen: true,
    publishedAt: pubDate.toISOString(),
    deadlineAt: deadlineDate.toISOString(),
    remainingMinutes,
    remainingSeconds,
    isExpired: false,
  };
}

/**
 * Validates whether an actor has permission to submit an appeal.
 */
export function canActorSubmitAppeal(
  role: IdentityRole,
  actorTeamId: string | null | undefined,
  targetTeamId: string,
): boolean {
  if (role === "admin") return true;
  if (role === "team_manager") {
    return Boolean(actorTeamId && actorTeamId === targetTeamId);
  }
  // Authorized participants belonging to that house
  if (role === "guest" || role === "judge") return false;
  return Boolean(actorTeamId && actorTeamId === targetTeamId);
}

/**
 * Validates an incoming appeal submission against business rules.
 */
export function validateAppealSubmission(
  params: ValidateAppealSubmissionParams,
): AppealValidationResult {
  const { input, actor, result, existingAppeals = [], now = new Date() } = params;

  // 1. Required fields
  if (!input.title || input.title.trim() === "") {
    return { valid: false, error: "Appeal title is required." };
  }
  if (!input.description || input.description.trim() === "") {
    return { valid: false, error: "Appeal description and statement of grounds are required." };
  }
  if (!input.reasonCategory) {
    return { valid: false, error: "Structured appeal reason category is required." };
  }
  if (!input.resultId) {
    return { valid: false, error: "Authoritative result ID is required." };
  }
  if (!input.teamId) {
    return { valid: false, error: "Appealing house/team ID is required." };
  }

  // 2. Permission check
  if (!canActorSubmitAppeal(actor.role, actor.teamId, input.teamId)) {
    return {
      valid: false,
      error: `Unauthorized: User with role '${actor.role}' cannot file an appeal on behalf of team '${input.teamId}'.`,
    };
  }

  // 3. Result status check
  // Appeals can only be lodged against published or verified official results
  if (result.status !== "published" && result.status !== "verified") {
    return {
      valid: false,
      error: `Cannot lodge appeal: Result status is '${result.status}'. Only officially published or verified results can be disputed.`,
    };
  }

  // 4. Appeal Window Check
  const windowMinutes = input.windowMinutes ?? DEFAULT_APPEAL_WINDOW_MINUTES;
  const windowStatus = calculateAppealWindow(result.publishedAt, windowMinutes, now);

  if (windowStatus.isExpired || !windowStatus.isOpen) {
    const formattedDeadline = windowStatus.deadlineAt
      ? new Date(windowStatus.deadlineAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "expired";
    return {
      valid: false,
      error: `Appeal window closed at ${formattedDeadline}. Under Pegasus Codex rules, appeals must be lodged within ${windowMinutes} minutes of result publication.`,
      deadlineAt: windowStatus.deadlineAt || undefined,
    };
  }

  // 5. Duplicate active appeal check
  const activeDuplicate = existingAppeals.find(
    (a) =>
      a.result_id === input.resultId &&
      a.team_id === input.teamId &&
      (a.status === "submitted" || a.status === "under_review"),
  );

  if (activeDuplicate) {
    return {
      valid: false,
      error: `An active appeal is already pending review (${activeDuplicate.status}) for this result by your house. Duplicate appeals are prohibited.`,
    };
  }

  return {
    valid: true,
    deadlineAt: windowStatus.deadlineAt || undefined,
  };
}

/**
 * Validates legal state machine transitions for appeals.
 */
export function canTransitionAppealStatus(
  from: AppealStatus,
  to: AppealStatus,
): boolean {
  if (from === to) return true;

  switch (from) {
    case "submitted":
      return to === "under_review" || to === "rejected";
    case "under_review":
      return to === "accepted" || to === "rejected" || to === "partially_upheld";
    case "accepted":
    case "rejected":
    case "partially_upheld":
      // Terminal states cannot be re-opened
      return false;
    default:
      return false;
  }
}

/**
 * Validates review and decision authority.
 */
export function canActorDecideAppeal(role: IdentityRole): boolean {
  return role === "admin" || role === "desk_operator";
}

/**
 * Validates review and decision action against permissions and lifecycle.
 */
export function validateAppealDecision(
  params: ValidateAppealDecisionParams,
): AppealValidationResult {
  const { currentStatus, targetStatus, reviewerRole, decisionNotes } = params;

  // 1. Role verification
  if (!canActorDecideAppeal(reviewerRole)) {
    return {
      valid: false,
      error: `Unauthorized: User role '${reviewerRole}' lacks authority to adjudicate appeals. Requires Administrator or Desk Operator (Jury of Appeal).`,
    };
  }

  // 2. Lifecycle transition check
  if (!canTransitionAppealStatus(currentStatus, targetStatus)) {
    return {
      valid: false,
      error: `Illegal appeal lifecycle transition: Cannot transition from '${currentStatus}' to '${targetStatus}'.`,
    };
  }

  // 3. Decision notes requirement for final resolution
  if (
    (targetStatus === "accepted" || targetStatus === "rejected" || targetStatus === "partially_upheld") &&
    (!decisionNotes || decisionNotes.trim() === "")
  ) {
    return {
      valid: false,
      error: "Formal written decision notes explaining the Jury of Appeal rationale are strictly mandatory.",
    };
  }

  return { valid: true };
}

export interface AppealAuditRecord {
  id: string;
  resultId: string;
  actorId: string;
  action: string;
  reason: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  timestamp: string;
}

/**
 * In-memory appeals manager for fast transactional and test validation.
 */
export class InMemoryAppealStore {
  private appeals: AppealRow[] = [];
  private audits: AppealAuditRecord[] = [];

  constructor(initialAppeals: AppealRow[] = []) {
    this.appeals = [...initialAppeals];
  }

  getAppeals(): AppealRow[] {
    return [...this.appeals];
  }

  getAppealById(id: string): AppealRow | null {
    return this.appeals.find((a) => a.id === id) ?? null;
  }

  getAppealsByTeam(teamId: string): AppealRow[] {
    return this.appeals.filter((a) => a.team_id === teamId);
  }

  getAudits(): AppealAuditRecord[] {
    return [...this.audits];
  }

  createAppeal(params: {
    input: CreateAppealInput;
    actor: {
      userId: string;
      fullName: string;
      role: IdentityRole;
      teamId?: string | null;
    };
    result: {
      id: string;
      status: string;
      publishedAt: string | null;
      teamId?: string | null;
      participantId?: string | null;
    };
    now?: string | Date;
  }): { success: boolean; data?: AppealRow; error?: string } {
    const nowTime = params.now ? new Date(params.now) : new Date();
    const validation = validateAppealSubmission({
      input: params.input,
      actor: params.actor,
      result: params.result,
      existingAppeals: this.appeals,
      now: nowTime,
    });

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const windowMinutes =
      params.input.windowMinutes ?? DEFAULT_APPEAL_WINDOW_MINUTES;
    const deadlineAt =
      validation.deadlineAt ??
      new Date(nowTime.getTime() + windowMinutes * 60 * 1000).toISOString();

    const appeal: AppealRow = {
      id: `appeal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      festival_id: params.input.festivalId,
      event_id: params.input.eventId,
      competition_id: params.input.competitionId ?? null,
      fixture_id: params.input.fixtureId ?? null,
      result_id: params.input.resultId,
      team_id: params.input.teamId,
      participant_id: params.input.participantId ?? null,
      submitted_by: params.actor.userId,
      submitter_name: params.actor.fullName,
      submitter_role: params.actor.role,
      reason_category: params.input.reasonCategory,
      title: params.input.title.trim(),
      description: params.input.description.trim(),
      evidence_references: params.input.evidenceReferences ?? [],
      published_at: params.result.publishedAt,
      deadline_at: deadlineAt,
      window_minutes: windowMinutes,
      fee_amount: DEFAULT_APPEAL_FEE,
      fee_status: "paid",
      status: "submitted",
      reviewed_by: null,
      reviewer_name: null,
      reviewed_at: null,
      decision_notes: null,
      corrected_result_payload: null,
      metadata: params.input.metadata ?? {},
      created_at: nowTime.toISOString(),
      updated_at: nowTime.toISOString(),
    };

    this.appeals.push(appeal);
    return { success: true, data: appeal };
  }

  reviewAppeal(params: {
    appealId: string;
    targetStatus: AppealStatus;
    reviewer: {
      userId: string;
      fullName: string;
      role: IdentityRole;
    };
    decisionNotes: string;
    correctedResult?: CorrectedResultPayload;
    authoritativeResults?: Array<{
      id: string;
      rank: number | null;
      points: number;
      [key: string]: unknown;
    }>;
    now?: string | Date;
  }): { success: boolean; data?: AppealRow; error?: string } {
    const appeal = this.appeals.find((a) => a.id === params.appealId);
    if (!appeal) {
      return { success: false, error: "Appeal not found." };
    }

    const validation = validateAppealDecision({
      currentStatus: appeal.status,
      targetStatus: params.targetStatus,
      reviewerRole: params.reviewer.role,
      decisionNotes: params.decisionNotes,
    });

    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const timestamp = params.now
      ? new Date(params.now).toISOString()
      : new Date().toISOString();

    // Controlled result correction & audit logging
    if (
      (params.targetStatus === "accepted" ||
        params.targetStatus === "partially_upheld") &&
      params.correctedResult &&
      params.authoritativeResults &&
      appeal.result_id
    ) {
      const targetRes = params.authoritativeResults.find(
        (r) => r.id === appeal.result_id,
      );
      if (targetRes) {
        const beforeState = { rank: targetRes.rank, points: targetRes.points };
        if (params.correctedResult.rank !== undefined) {
          targetRes.rank = params.correctedResult.rank;
        }
        if (params.correctedResult.points !== undefined) {
          targetRes.points = params.correctedResult.points;
        }
        const afterState = { rank: targetRes.rank, points: targetRes.points };

        this.audits.push({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          resultId: appeal.result_id,
          actorId: params.reviewer.userId,
          action: `appeal_${params.targetStatus}`,
          reason: `Appeal ${appeal.id} decided (${params.targetStatus}) by ${params.reviewer.fullName}: ${params.decisionNotes.trim()}`,
          beforeState,
          afterState,
          timestamp,
        });
      }
    }

    appeal.status = params.targetStatus;
    appeal.reviewed_by = params.reviewer.userId;
    appeal.reviewer_name = params.reviewer.fullName;
    appeal.reviewed_at = timestamp;
    appeal.decision_notes = params.decisionNotes.trim();
    if (params.correctedResult) {
      appeal.corrected_result_payload = params.correctedResult as Record<
        string,
        unknown
      >;
    }
    appeal.updated_at = timestamp;

    return { success: true, data: appeal };
  }
}
