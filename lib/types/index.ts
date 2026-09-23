/**
 * PEGASUS Sports Festival Operating System
 * Canonical Domain Specification — TypeScript Domain Types (v1)
 */

// ============================================================================
// 1. LIFECYCLE & STATUS ENUMS
// ============================================================================

export type FestivalStatus = "upcoming" | "live" | "completed";

export * from "./competitions";
import type {
  CompetitionFormat,
  FixtureStatus,
} from "./competitions";

export type ScheduleStatus =
  | "scheduled"
  | "live"
  | "delayed"
  | "postponed"
  | "venue_changed"
  | "finished"
  | "cancelled";

export type HeatStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "cancelled";

export type CheckInStatus =
  | "registered"
  | "checked_in"
  | "called"
  | "ready"
  | "absent"
  | "dns";

export type ResultDisposition = "normal" | "dns" | "dnf" | "dq";

export type ParticipantStatus =
  | "registered"
  | "confirmed"
  | "withdrawn"
  | "disqualified";

export type RegistrationStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "withdrawn"
  | "rejected";

export type ResultStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "published"
  | "corrected";

export type EventStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "cancelled";

export type SportType = "team" | "individual";
export type EventType = "team" | "individual";

// ============================================================================
// 2. SCORING & CLASSIFICATION
// ============================================================================

export type PointClass = "W" | "X" | "Y" | "Z";

/** Backwards-compatibility alias for PointClass */
export type EventClassification = PointClass;

export type ScoringEngineType =
  | "athletics"
  | "standard_match"
  | "arm_wrestling"
  | "tug_of_war"
  | "weightlifting"
  | "swimming";

// ============================================================================
// 3. TEAM & PARTICIPANT DOMAIN
// ============================================================================

export type Team = {
  id: string;
  name: string;
  code: string;
  colorHex?: string;
};

export type Division = {
  id: string;
  name: string;
  level?: string;
  classes?: string;
  maxParticipants?: number;
  minAge?: number;
  maxAge?: number;
  slug?: string;
};

export type Participant = {
  id: string;
  publicId: string;
  chestNumber: string;
  name: string;
  profileImage?: string;
  teamId: string;
  divisionId: string;
  category: string;
  eventIds: string[]; // Backwards compatibility for participant-event linkage
  status: ParticipantStatus;
};

/** First-class registration entity linking Participant to Event */
export type Registration = {
  id: string;
  participantId: string;
  eventId: string;
  teamId: string;
  divisionId: string;
  status: RegistrationStatus;
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  notes?: string;
};

/** Backwards-compatibility alias for Registration */
export type ParticipantEventRegistration = Registration;

// ============================================================================
// 4. SPORT, EVENT & RULES DOMAIN
// ============================================================================

export type EventQuotaRule = {
  id?: string;
  eventId?: string;
  divisionId?: string;
  quotaPerTeam?: number;
  maxTeamParticipants?: number;
  maxTeamWeightKg?: number;
  rawCodexNotation?: string;
  notes?: string;
  mainParticipants?: number;
  groups?: number;
  substitutes?: number;
};

export type CompetitionRule = {
  id: string;
  ruleText: string;
  section?: string;
  penaltyPoints?: number;
};

export type Sport = {
  id: string;
  name: string;
  slug: string;
  type: SportType;
  category?: string;
  description?: string;
};

export type Event = {
  id: string;
  codexEventId: string;
  sportId?: string;
  name: string;
  category?: string;
  type?: EventType;
  format?: CompetitionFormat;
  sport?: string;
  divisionId?: string;
  divisionIds?: string[];
  pointClass?: PointClass;
  competitionType?: CompetitionFormat;
  scoringEngine?: ScoringEngineType;
  quotaRules?: EventQuotaRule[];
  rules?: CompetitionRule[];
  status?: EventStatus;
  description?: string;
};

/** Backwards-compatibility festival event type preserving required fields */
export type FestivalEvent = Event & {
  sport: string;
  category: string;
  type: EventType;
  format: CompetitionFormat;
};

export type Venue = {
  id: string;
  name: string;
  type: string;
  location: string;
};

// ============================================================================
// 5. COMPETITION, FIXTURE & SCHEDULE
// ============================================================================

export * from "./competitions";

export type LaneAssignment = {
  lane: number;
  participantId: string;
  timeMs?: number;
  rank?: number;
};

export type Heat = {
  id: string;
  eventId?: string;
  competitionId?: string;
  venueId: string;
  heatNumber: number;
  scheduledAt: string;
  status: HeatStatus;
  lanes: LaneAssignment[];
  laneAssignments?: LaneAssignment[];
};



export type ScheduleItem = {
  id: string;
  eventId: string;
  venueId: string;
  startsAt: string;
  endsAt?: string;
  status: FixtureStatus;
};

export type ScheduleChange = {
  id: string;
  scheduleItemId: string;
  type: "delay" | "postponement" | "venue_change" | "reschedule";
  previousValue?: string;
  newValue?: string;
  reason: string;
  changedBy: string;
  changedAt: string;
};

// ============================================================================
// 6. RESULT, AUDIT & DISPUTES
// ============================================================================

export type Performance =
  | string
  | {
      timeMs?: number;
      distanceM?: number;
      heightM?: number;
      score?: number;
      reps?: number;
      raw?: string;
    };

export type Result = {
  id: string;
  eventId: string;
  competitionId?: string;
  fixtureId?: string;
  participantId?: string;
  teamId?: string;
  position?: number;
  performance?: Performance;
  points: number;
  status: ResultStatus;
  disposition?: ResultDisposition;
  isOfficial?: boolean;
  submittedBy?: string;
  verifiedBy?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ResultAuditEntry = {
  id: string;
  resultId: string;
  action:
    | "created"
    | "submitted"
    | "verified"
    | "published"
    | "unlocked"
    | "corrected"
    | "reverified"
    | "republished";
  actor: string;
  timestamp: string;
  previousState?: Partial<Result>;
  newState?: Partial<Result>;
  reason?: string;
};

export type Appeal = {
  id: string;
  resultId: string;
  eventId: string;
  submittedBy: string;
  fee: number; // ₹70 as specified in Pegasus Codex 2026
  status: "pending" | "upheld" | "dismissed";
  reason: string;
  submittedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notes?: string;
};

export * from "./penalties";

export type SportsTalentEntry = {
  participantId: string;
  divisionId: string;
  individualPoints: number;
  teamEventTieBreakPoints: number;
  rank?: number;
  selected: boolean;
};

// ============================================================================
// 7. IDENTITY, ROLES & AUDIT LOGS
// ============================================================================

export type IdentityRole =
  | "admin"
  | "judge"
  | "team_manager"
  | "desk_operator"
  | "guest";

export type CredentialStatus = "active" | "revoked" | "expired";

export type AuditLog = {
  id: string;
  entity: string;
  entityId: string;
  action: string;
  actor: string;
  timestamp: string;
  details?: Record<string, unknown>;
};

// ============================================================================
// 8. JUDGING OPERATIONAL TYPES
// ============================================================================

export type JudgeAssignmentStatus =
  | "assigned"
  | "in_progress"
  | "submitted"
  | "completed";

export type Judge = {
  id: string;
  name: string;
  role: string;
};

export type JudgeAssignment = {
  id: string;
  judgeId: string;
  eventId: string;
  fixtureId?: string;
  heatId?: string;
  status?: JudgeAssignmentStatus;
};

// ============================================================================
// 9. SUBSTITUTION OPERATIONAL TYPES
// ============================================================================

export * from "./substitutions";

