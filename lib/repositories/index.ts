/**
 * PEGASUS Repository Layer
 *
 * Centralized entry point for Supabase data-access repositories.
 * Re-exports public repository functions and row types with explicit naming.
 */

// ============================================================================
// Database Row Projections
// ============================================================================

export type { FestivalRow } from "./festivalRepository";
export type { SportRow } from "./sportRepository";
export type { EventRow } from "./eventRepository";
export type { DivisionRow } from "./divisionRepository";
export type {
  ParticipantRow,
  AdminParticipantRow,
  CreateParticipantInput,
  UpdateParticipantInput,
} from "./participantRepository";
export type { TeamRow } from "./teamRepository";
export type { ResultRow, UpsertResultInput, ResultAuditRow } from "./resultRepository";
export type {
  ScheduleRow,
  ScheduleChangeRow,
  CreateScheduleInput,
  UpdateScheduleInput,
  ScheduleConflict,
} from "./scheduleRepository";
export type {
  VenueRow,
  CreateVenueInput,
  UpdateVenueInput,
} from "./venueRepository";
export type { ProfileRow } from "./profileRepository";
export type { JudgeAssignmentRow } from "./judgeAssignmentRepository";

// ============================================================================
// Festival Repository
// ============================================================================

export { getActiveFestival } from "./festivalRepository";

// ============================================================================
// Sport Repository
// ============================================================================

export {
  getSportsByFestival,
  getSportById,
} from "./sportRepository";

// ============================================================================
// Event Repository
// ============================================================================

export {
  getEventsByFestival,
  getEventById,
} from "./eventRepository";

// ============================================================================
// Division Repository
// ============================================================================

export {
  getDivisionsByFestival,
  getDivisionById,
} from "./divisionRepository";

// ============================================================================
// Participant Repository
// ============================================================================

export {
  getParticipantsByFestival,
  getParticipantsByFestivalAdmin,
  getParticipantsByEvent,
  getParticipantById,
  getParticipantByPublicId,
  getParticipantByChestNumber,
  createParticipantRecord,
  updateParticipantRecord,
  updateParticipantStatusRecord,
  updateParticipantChestNumberRecord,
  getParticipantDependencies,
  deleteParticipantRecord,
  validateAndPrepareParticipant,
  type ParticipantDependencies,
  type RawParticipantInput,
  type ValidatedParticipantPayload,
} from "./participantRepository";

// ============================================================================
// Team Repository
// ============================================================================

export {
  getTeamsByFestival,
  getTeamById,
  getTeamByCode,
  createTeamRecord,
  updateTeamRecord,
  type CreateTeamInput,
  type UpdateTeamInput,
} from "./teamRepository";

// ============================================================================
// Registration Repository
// ============================================================================

export {
  getRegistrationsByFestival,
  getAdminRegistrationsByFestival,
  getRegistrationsByTeam,
  getRegistrationsByEvent,
  getRegistrationsByParticipant,
  getRegistrationById,
  createRegistrationRecord,
  updateRegistrationStatusRecord,
  withdrawRegistrationRecord,
  type RegistrationRow,
  type AdminRegistrationRow,
  type CreateRegistrationInput,
} from "./registrationRepository";

// ============================================================================
// Substitution Repository
// ============================================================================

export {
  getSubstitutionsByFestival,
  getSubstitutionsByTeam,
  createSubstitutionRecord,
  reviewSubstitutionRecord,
  calculateSubstitutionTiming,
  type AdminSubstitutionRow,
} from "./substitutionRepository";

// ============================================================================
// Appeal Repository
// ============================================================================

export {
  getAppealsByFestival,
  getAppealsByTeam,
  getAppealById,
  createAppealRecord,
  reviewAppealRecord,
  type AppealRow,
  type AdminAppealRow,
  type CreateAppealInput,
  type ReviewAppealInput,
} from "./appealRepository";


// ============================================================================
// Result Repository
// ============================================================================

export {
  getPublishedResultsByFestival,
  getPublishedResultsByParticipant,
  getResultsByCompetition,
  getResultsByEvent,
  getResultById,
  saveDraftResultsBatch,
  submitResultsBatch,
  getResultsByFestivalOperational,
  getResultsByStatus,
  verifyResultRecord,
  publishResultRecord,
  unlockResultForCorrectionRecord,
  getRecentResultAuditEntries,
} from "./resultRepository";

// ============================================================================
// Schedule Repository
// ============================================================================

export {
  getSchedulesByFestival,
  getSchedulesByDate,
  getScheduleById,
  getScheduleChangesBySchedule,
  getRecentScheduleChangesByFestival,
  createScheduleRecord,
  updateScheduleRecord,
  updateScheduleStatusRecord,
  deleteScheduleRecord,
  checkScheduleConflict,
} from "./scheduleRepository";

// ============================================================================
// Venue Repository
// ============================================================================

export {
  getVenuesByFestival,
  getVenueById,
  createVenueRecord,
  updateVenueRecord,
  updateVenueStatusRecord,
} from "./venueRepository";

// ============================================================================
// Competition Repository
// ============================================================================

export {
  getCompetitionsByFestival,
  getCompetitionById,
  getCompetitionsByEvent,
  getCompetitionChangeEntries,
  createCompetitionRecord,
  updateCompetitionRecord,
  updateCompetitionStatusRecord,
  type CompetitionRow,
  type CompetitionChangeRow,
} from "./competitionRepository";

// ============================================================================
// Fixture Repository
// ============================================================================

export {
  getFixturesByCompetition,
  getFixturesByFestival,
  getFixtureById,
  createFixtureRecord,
  updateFixtureRecord,
  updateFixtureStatusRecord,
  updateFixtureScoreRecord,
  generateKnockoutFixturesRecord,
  type FixtureRow,
} from "./fixtureRepository";

// ============================================================================
// Profile Repository
// ============================================================================

export {
  getProfileById,
  getAuthenticatedProfile,
} from "./profileRepository";

// ============================================================================
// Judge Assignment Repository
// ============================================================================

export {
  getAssignmentsByJudge,
  isJudgeAssignedToEventInDb,
  getAssignedEventsForJudge,
} from "./judgeAssignmentRepository";

// ============================================================================
// Penalty Repository
// ============================================================================

export {
  getPenaltiesByFestival,
  getActivePenaltiesByFestival,
  getPenaltiesByTeam,
  getPenaltyById,
  createPenaltyRecord,
  reversePenaltyRecord,
  type PenaltyRow,
  type CreatePenaltyRecordInput,
  type ReversePenaltyRecordInput,
} from "./penaltyRepository";

// ============================================================================
// QR Repository
// ============================================================================

export {
  getOrCreateQrIdentity,
  revokeQrIdentity,
  rotateQrIdentity,
  resolveQrToken,
  generateSecureQrToken,
  type QrIdentityRow,
  type QrResolutionResult,
  type QrEntityType,
  type QrStatus,
} from "./qrRepository";



