import type { IdentityRole, ResultDisposition, ResultStatus } from "./index";

export type AppealStatus =
  | "submitted"
  | "under_review"
  | "accepted"
  | "rejected"
  | "partially_upheld";

export type AppealReasonCategory =
  | "scoring_discrepancy"
  | "timing_error"
  | "rule_violation"
  | "eligibility_breach"
  | "conduct_protest"
  | "clerical_error"
  | "other";

export type AppealFeeStatus = "unpaid" | "paid" | "waived" | "refunded";

export interface AppealRow {
  id: string;
  festival_id: string;
  event_id: string;
  competition_id: string | null;
  fixture_id: string | null;
  result_id: string | null;
  team_id: string;
  participant_id: string | null;

  // Submitter
  submitted_by: string | null;
  submitter_name: string;
  submitter_role: IdentityRole;

  // Content
  reason_category: AppealReasonCategory;
  title: string;
  description: string;
  evidence_references: string[];

  // Window & Deadlines
  published_at: string | null;
  deadline_at: string;
  window_minutes: number;

  // Financials
  fee_amount: number;
  fee_status: AppealFeeStatus;

  // Lifecycle
  status: AppealStatus;

  // Review & Decision
  reviewed_by: string | null;
  reviewer_name: string | null;
  reviewed_at: string | null;
  decision_notes: string | null;
  corrected_result_payload: Record<string, unknown> | null;

  // Metadata
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AdminAppealRow extends AppealRow {
  eventName?: string;
  eventCode?: string;
  teamName?: string;
  teamCode?: string;
  participantName?: string | null;
  resultRank?: number | null;
  resultPoints?: number | null;
  resultStatus?: ResultStatus;
}

export interface CreateAppealInput {
  festivalId: string;
  eventId: string;
  competitionId?: string | null;
  fixtureId?: string | null;
  resultId: string;
  teamId: string;
  participantId?: string | null;
  title: string;
  reasonCategory: AppealReasonCategory;
  description: string;
  evidenceReferences?: string[];
  windowMinutes?: number;
  metadata?: Record<string, unknown>;
}

export interface CorrectedResultPayload {
  rank?: number | null;
  points?: number;
  performance?: Record<string, unknown>;
  disposition?: ResultDisposition;
}

export interface ReviewAppealInput {
  appealId: string;
  status: "under_review" | "accepted" | "rejected" | "partially_upheld";
  decisionNotes: string;
  feeStatus?: AppealFeeStatus;
  correctedResult?: CorrectedResultPayload;
}
