"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  getAuthenticatedProfile,
  verifyResultRecord,
  publishResultRecord,
  unlockResultForCorrectionRecord,
  createParticipantRecord,
  updateParticipantRecord,
  updateParticipantStatusRecord,
  updateParticipantChestNumberRecord,
  deleteParticipantRecord,
  getParticipantDependencies,
  type ParticipantDependencies,
  createVenueRecord,
  updateVenueRecord,
  updateVenueStatusRecord,
  createScheduleRecord,
  updateScheduleRecord,
  updateScheduleStatusRecord,
  createPenaltyRecord,
  reversePenaltyRecord,
  createCompetitionRecord,
  updateCompetitionRecord,
  updateCompetitionStatusRecord,
  createFixtureRecord,
  updateFixtureRecord,
  updateFixtureStatusRecord,
  updateFixtureScoreRecord,
  generateKnockoutFixturesRecord,
  createTeamRecord,
  updateTeamRecord,
  createRegistrationRecord,
  updateRegistrationStatusRecord,
  withdrawRegistrationRecord,
  createSubstitutionRecord,
  reviewSubstitutionRecord,
  reviewAppealRecord,
  revokeQrIdentity,
  rotateQrIdentity,
  type QrEntityType,
  type ReviewAppealInput,
  type CreateAppealInput,
  type CreateParticipantInput,
  type UpdateParticipantInput,
  type CreateVenueInput,
  type UpdateVenueInput,
  type CreateScheduleInput,
  type UpdateScheduleInput,
  type CreatePenaltyRecordInput,
  type ReversePenaltyRecordInput,
  type CreateTeamInput,
  type UpdateTeamInput,
  type CreateRegistrationInput,
} from "@/lib/repositories";
import type {
  ParticipantStatus,
  RegistrationStatus,
  ScheduleStatus,
  CompetitionStatus,
  FixtureStatus,
  CreateCompetitionInput,
  UpdateCompetitionInput,
  CreateFixtureInput,
  UpdateFixtureInput,
  CreateSubstitutionInput,
  ReviewSubstitutionInput,
} from "@/lib/types";

export type AdminActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Server action to securely log out an administrator and invalidate the session.
 */
export async function logoutAction(): Promise<void> {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error("[logoutAction] Error during signOut:", error);
    }
  }

  redirect("/?logged_out=1");
}

/**
 * Server action to verify a submitted result.
 * Strictly requires authenticated session with role === 'admin' and is_active === true.
 */
export async function verifyResultAction(
  resultId: string,
): Promise<AdminActionResult> {
  if (!resultId || resultId.trim() === "") {
    return { success: false, error: "Result ID is required." };
  }

  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to verify results.",
    };
  }

  // 2. Perform verification through repository and domain service
  const res = await verifyResultRecord(
    resultId,
    profile.userId,
    profile.fullName,
  );

  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate affected administrative and public surfaces
  revalidatePath("/admin/verification");
  revalidatePath("/admin/publish");
  revalidatePath("/admin/results");
  revalidatePath("/results");

  return { success: true };
}

/**
 * Server action to publish a verified result.
 * Strictly requires authenticated session with role === 'admin' and is_active === true.
 */
export async function publishResultAction(
  resultId: string,
): Promise<AdminActionResult> {
  if (!resultId || resultId.trim() === "") {
    return { success: false, error: "Result ID is required." };
  }

  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to publish results.",
    };
  }

  // 2. Perform publication through repository and domain service
  const res = await publishResultRecord(
    resultId,
    profile.userId,
    profile.fullName,
  );

  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate all dependent surfaces
  revalidatePath("/admin/publish");
  revalidatePath("/admin/verification");
  revalidatePath("/admin/results");
  revalidatePath("/results");
  revalidatePath("/participants");
  revalidatePath("/my-result");
  revalidatePath("/leaderboard");

  return { success: true };
}

/**
 * Server action to unlock a verified/published result for formal correction.
 */
export async function unlockResultAction(
  resultId: string,
  reason: string,
): Promise<AdminActionResult> {
  if (!resultId || resultId.trim() === "") {
    return { success: false, error: "Result ID is required." };
  }
  if (!reason || reason.trim() === "") {
    return { success: false, error: "A valid reason is required to unlock a result." };
  }

  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to unlock results.",
    };
  }

  // 2. Perform unlock through repository
  const res = await unlockResultForCorrectionRecord(
    resultId,
    profile.userId,
    profile.fullName,
    reason,
  );

  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate
  revalidatePath("/admin/verification");
  revalidatePath("/admin/publish");
  revalidatePath("/admin/results");
  revalidatePath("/results");

  return { success: true };
}

/**
 * Server action to create a new participant in the official registry.
 * Strictly requires authenticated session with role === 'admin' and is_active === true.
 */
export async function createParticipantAction(
  input: CreateParticipantInput,
): Promise<AdminActionResult & { participantId?: string }> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to register participants.",
    };
  }

  // 2. Perform mutation via repository
  const res = await createParticipantRecord(input);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate administrative and public rosters
  revalidatePath("/admin/participants");
  revalidatePath("/admin");
  revalidatePath("/participants");
  revalidatePath("/my-result");

  return { success: true, participantId: res.data?.id };
}

/**
 * Server action to update an existing participant's profile details.
 * Strictly requires authenticated session with role === 'admin' and is_active === true.
 */
export async function updateParticipantAction(
  input: UpdateParticipantInput,
): Promise<AdminActionResult> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to update participants.",
    };
  }

  // 2. Perform mutation via repository
  const res = await updateParticipantRecord(input);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate administrative and public rosters
  revalidatePath("/admin/participants");
  revalidatePath("/admin");
  revalidatePath("/participants");
  revalidatePath(`/participants/${input.participantId}`);
  revalidatePath("/my-result");

  return { success: true };
}

/**
 * Server action to quickly update a participant's operational status.
 * Strictly requires authenticated session with role === 'admin' and is_active === true.
 */
export async function updateParticipantStatusAction(
  participantId: string,
  status: ParticipantStatus,
): Promise<AdminActionResult> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to modify status.",
    };
  }

  // 2. Perform mutation via repository
  const res = await updateParticipantStatusRecord(participantId, status);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate
  revalidatePath("/admin/participants");
  revalidatePath("/admin");
  revalidatePath("/participants");
  revalidatePath(`/participants/${participantId}`);
  revalidatePath("/my-result");

  return { success: true };
}

/**
 * Server action to allocate or update a participant's chest number.
 * Strictly requires authenticated session with role === 'admin' and is_active === true.
 */
export async function updateParticipantChestNumberAction(
  participantId: string,
  chestNumber: string,
): Promise<AdminActionResult> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to assign chest numbers.",
    };
  }

  // 2. Perform mutation via repository
  const res = await updateParticipantChestNumberRecord(participantId, chestNumber);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate
  revalidatePath("/admin/participants");
  revalidatePath("/admin");
  revalidatePath("/participants");
  revalidatePath(`/participants/${participantId}`);
  revalidatePath("/my-result");

  return { success: true };
}

/**
 * Server action to safely delete an athlete record.
 * Fails safely with detailed dependency breakdown if active history exists.
 * Strictly requires authenticated session with role === 'admin' and is_active === true.
 */
export async function deleteParticipantAction(
  participantId: string,
): Promise<AdminActionResult & { dependencies?: ParticipantDependencies }> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to delete athletes.",
    };
  }

  const res = await deleteParticipantRecord(participantId);
  if (!res.success) {
    return { success: false, error: res.error, dependencies: res.dependencies };
  }

  revalidatePath("/admin/participants");
  revalidatePath("/admin");
  revalidatePath("/participants");
  revalidatePath("/my-result");

  return { success: true, dependencies: res.dependencies };
}

/**
 * Server action to check athlete dependencies prior to deletion prompt.
 */
export async function checkParticipantDependenciesAction(
  participantId: string,
): Promise<{ success: boolean; dependencies: ParticipantDependencies }> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      dependencies: { registrationCount: 0, resultCount: 0, substitutionCount: 0, totalCount: 0 },
    };
  }

  const dependencies = await getParticipantDependencies(participantId);
  return { success: true, dependencies };
}

// ============================================================================
// VENUE ACTIONS
// ============================================================================

/**
 * Server action to create a new operational venue.
 * Strictly requires authenticated active administrator.
 */
export async function createVenueAction(
  input: CreateVenueInput,
): Promise<AdminActionResult & { venueId?: string }> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to create venues.",
    };
  }

  // 2. Perform mutation
  const res = await createVenueRecord(input);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate affected surfaces
  revalidatePath("/admin/venues");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin");
  revalidatePath("/schedules");

  return { success: true, venueId: res.data?.id };
}

/**
 * Server action to update an existing venue.
 * Strictly requires authenticated active administrator.
 */
export async function updateVenueAction(
  input: UpdateVenueInput,
): Promise<AdminActionResult> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to edit venues.",
    };
  }

  // 2. Perform mutation
  const res = await updateVenueRecord(input);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate
  revalidatePath("/admin/venues");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin");
  revalidatePath("/schedules");

  return { success: true };
}

/**
 * Server action to toggle venue active/inactive status.
 * Strictly requires authenticated active administrator.
 */
export async function updateVenueStatusAction(
  venueId: string,
  isActive: boolean,
): Promise<AdminActionResult> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to modify venue status.",
    };
  }

  // 2. Perform mutation
  const res = await updateVenueStatusRecord(venueId, isActive);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate
  revalidatePath("/admin/venues");
  revalidatePath("/admin/schedule");
  revalidatePath("/admin");
  revalidatePath("/schedules");

  return { success: true };
}

// ============================================================================
// SCHEDULE ACTIONS
// ============================================================================

/**
 * Server action to create a new timetable schedule slot.
 * Strictly requires authenticated active administrator and enforces conflict detection.
 */
export async function createScheduleAction(
  input: CreateScheduleInput,
): Promise<AdminActionResult & { scheduleId?: string }> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to create schedule slots.",
    };
  }

  // 2. Perform mutation
  const res = await createScheduleRecord(input, profile.userId);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate affected surfaces
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/venues");
  revalidatePath("/admin");
  revalidatePath("/schedules");

  return { success: true, scheduleId: res.data?.id };
}

/**
 * Server action to update/reschedule a timetable slot.
 * Strictly requires authenticated active administrator and records audit history.
 */
export async function updateScheduleAction(
  input: UpdateScheduleInput,
): Promise<AdminActionResult> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to modify schedule slots.",
    };
  }

  // 2. Perform mutation
  const res = await updateScheduleRecord(input, profile.userId);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate affected surfaces
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/venues");
  revalidatePath("/admin");
  revalidatePath("/schedules");

  return { success: true };
}

/**
 * Server action to update a schedule item's operational status.
 * Strictly requires authenticated active administrator and records reason.
 */
export async function updateScheduleStatusAction(
  scheduleId: string,
  status: ScheduleStatus,
  reason?: string,
): Promise<AdminActionResult> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to transition schedule status.",
    };
  }

  // 2. Perform mutation
  const res = await updateScheduleStatusRecord(scheduleId, status, profile.userId, reason);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  // 3. Revalidate
  revalidatePath("/admin/schedule");
  revalidatePath("/admin/venues");
  revalidatePath("/admin");
  revalidatePath("/schedules");

  return { success: true };
}

/**
 * Server action to issue a new team penalty.
 * Derived server-side (-10 pts) and strictly restricted to active administrators.
 */
export async function createTeamPenaltyAction(
  input: CreatePenaltyRecordInput,
): Promise<AdminActionResult> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to issue penalties.",
    };
  }

  try {
    // 2. Perform penalty creation
    await createPenaltyRecord(input, profile.userId);

    // 3. Revalidate affected surfaces
    revalidatePath("/admin/penalties");
    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    revalidatePath("/teams");

    return { success: true };
  } catch (error) {
    console.error("[createTeamPenaltyAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to issue penalty.",
    };
  }
}

/**
 * Server action to soft-reverse an active team penalty.
 * Strictly restricted to active administrators with mandatory justification.
 */
export async function reverseTeamPenaltyAction(
  input: ReversePenaltyRecordInput,
): Promise<AdminActionResult> {
  // 1. Authenticate and authorize admin server-side
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to reverse penalties.",
    };
  }

  try {
    // 2. Perform soft reversal
    await reversePenaltyRecord(input, profile.userId);

    // 3. Revalidate affected surfaces
    revalidatePath("/admin/penalties");
    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    revalidatePath("/teams");

    return { success: true };
  } catch (error) {
    console.error("[reverseTeamPenaltyAction] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reverse penalty.",
    };
  }
}

// ============================================================================
// COMPETITION ACTIONS
// ============================================================================

/**
 * Server action to create a new competition instance.
 */
export async function createCompetitionAction(
  input: CreateCompetitionInput,
): Promise<AdminActionResult & { competitionId?: string }> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to create competitions.",
    };
  }

  const res = await createCompetitionRecord(input, profile.userId);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/competitions");
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");
  revalidatePath("/admin");

  return { success: true, competitionId: res.data?.id };
}

/**
 * Server action to update competition metadata.
 */
export async function updateCompetitionAction(
  input: UpdateCompetitionInput,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to update competitions.",
    };
  }

  const res = await updateCompetitionRecord(input, profile.userId);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/competitions");
  revalidatePath(`/admin/competitions/${input.competitionId}`);
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");

  return { success: true };
}

/**
 * Server action to transition competition operational lifecycle status.
 */
export async function updateCompetitionStatusAction(
  competitionId: string,
  status: CompetitionStatus,
  reason?: string,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to change competition status.",
    };
  }

  const res = await updateCompetitionStatusRecord(
    competitionId,
    status,
    profile.userId,
    reason,
  );
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/competitions");
  revalidatePath(`/admin/competitions/${competitionId}`);
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");
  revalidatePath("/admin");

  return { success: true };
}

// ============================================================================
// FIXTURE ACTIONS
// ============================================================================

/**
 * Server action to create a manual fixture within a competition.
 */
export async function createFixtureAction(
  input: CreateFixtureInput,
): Promise<AdminActionResult & { fixtureId?: string }> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to add fixtures.",
    };
  }

  const res = await createFixtureRecord(input, profile.userId);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath(`/admin/competitions/${input.competitionId}`);
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");

  return { success: true, fixtureId: res.data?.id };
}

/**
 * Server action to update fixture details (teams, schedule, venue, metadata).
 */
export async function updateFixtureAction(
  competitionId: string,
  input: UpdateFixtureInput,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to update fixtures.",
    };
  }

  const res = await updateFixtureRecord(input, profile.userId);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath(`/admin/competitions/${competitionId}`);
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");

  return { success: true };
}

/**
 * Server action to update fixture operational status.
 */
export async function updateFixtureStatusAction(
  competitionId: string,
  fixtureId: string,
  status: FixtureStatus,
  reason?: string,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to transition fixture status.",
    };
  }

  const res = await updateFixtureStatusRecord(
    fixtureId,
    status,
    profile.userId,
    reason,
  );
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath(`/admin/competitions/${competitionId}`);
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");

  return { success: true };
}

/**
 * Server action to update operational fixture scores.
 * Note: Does not mutate or bypass official result verification workflow.
 */
export async function updateFixtureScoreAction(
  competitionId: string,
  fixtureId: string,
  scoreHome: number | null,
  scoreAway: number | null,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to update scores.",
    };
  }

  const res = await updateFixtureScoreRecord(
    fixtureId,
    scoreHome,
    scoreAway,
    profile.userId,
  );
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath(`/admin/competitions/${competitionId}`);
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");

  return { success: true };
}

/**
 * Server action to generate first-round knockout fixtures for selected entrants.
 */
export async function generateKnockoutFixturesAction(
  competitionId: string,
  teamIds: string[],
  roundName = "Quarter Finals",
): Promise<AdminActionResult & { count?: number }> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to generate fixtures.",
    };
  }

  const res = await generateKnockoutFixturesRecord(
    competitionId,
    teamIds,
    profile.userId,
    roundName,
  );
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath(`/admin/competitions/${competitionId}`);
  revalidatePath("/admin/competitions");
  revalidatePath("/admin/fixtures");
  revalidatePath("/fixtures");

  return { success: true, count: res.count };
}

// ============================================================================
// 10. TEAM ACTIONS
// ============================================================================

export async function createTeamAction(
  input: CreateTeamInput,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to create teams.",
    };
  }

  const res = await createTeamRecord(input);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/teams");
  revalidatePath("/teams");
  return { success: true };
}

export async function updateTeamAction(
  input: UpdateTeamInput,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to update teams.",
    };
  }

  const res = await updateTeamRecord(input);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/teams");
  revalidatePath("/teams");
  return { success: true };
}

// ============================================================================
// 11. REGISTRATION ACTIONS
// ============================================================================

export async function createRegistrationAction(
  input: CreateRegistrationInput,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to register athletes.",
    };
  }

  const res = await createRegistrationRecord(input);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/participants");
  revalidatePath("/admin/teams");
  revalidatePath("/participants");
  return { success: true };
}

export async function updateRegistrationStatusAction(
  registrationId: string,
  status: RegistrationStatus,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to update registrations.",
    };
  }

  const res = await updateRegistrationStatusRecord(registrationId, status);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/participants");
  revalidatePath("/admin/teams");
  return { success: true };
}

export async function withdrawRegistrationAction(
  registrationId: string,
  reason?: string,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to withdraw registrations.",
    };
  }

  const res = await withdrawRegistrationRecord(registrationId, reason);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/participants");
  revalidatePath("/admin/teams");
  return { success: true };
}

// ============================================================================
// 12. SUBSTITUTION ACTIONS
// ============================================================================

export async function createSubstitutionAction(
  input: CreateSubstitutionInput,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active session required to submit substitutions.",
    };
  }

  // If role is team_manager, enforce same team check
  if (profile.role === "team_manager" && profile.teamId !== input.teamId) {
    return {
      success: false,
      error: "Forbidden: Team managers can only request substitutions for their own team.",
    };
  }

  const res = await createSubstitutionRecord(input, profile.userId);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/substitutions");
  revalidatePath("/admin/participants");
  revalidatePath("/team-manager");
  return { success: true };
}

export async function reviewSubstitutionAction(
  input: ReviewSubstitutionInput,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Only administrators may approve or reject substitutions.",
    };
  }

  const res = await reviewSubstitutionRecord(input, profile.userId);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/substitutions");
  revalidatePath("/admin/participants");
  revalidatePath("/admin/competitions");
  revalidatePath("/team-manager");
  revalidatePath("/participants");
  return { success: true };
}

/**
 * Server action for Jury of Appeal / Administrators to review and adjudicate formal appeals.
 */
export async function reviewAppealAction(
  input: ReviewAppealInput,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (
    !profile ||
    (profile.role !== "admin" && profile.role !== "desk_operator") ||
    !profile.isActive
  ) {
    return {
      success: false,
      error:
        "Unauthorized: Only administrators and desk operators (Jury of Appeal) may adjudicate appeals.",
    };
  }

  const res = await reviewAppealRecord(input, {
    userId: profile.userId,
    fullName: profile.fullName,
    role: profile.role,
  });

  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/appeals");
  revalidatePath("/admin/results");
  revalidatePath("/admin/verification");
  revalidatePath("/admin/publish");
  revalidatePath("/results");
  revalidatePath("/leaderboard");
  revalidatePath("/team-manager");
  revalidatePath("/participants");
  return { success: true };
}

// ============================================================================
// 14. QR IDENTITY ACTIONS
// ============================================================================

/**
 * Server action to revoke a QR identity token.
 * Strictly restricted to active administrators.
 */
export async function revokeQrAction(
  qrToken: string,
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to revoke QR codes.",
    };
  }

  const res = await revokeQrIdentity(qrToken);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/participants");
  revalidatePath("/admin");
  revalidatePath("/participants");

  return { success: true };
}

/**
 * Server action to rotate / regenerate a QR identity token for an entity.
 * Strictly restricted to active administrators.
 */
export async function rotateQrAction(
  entityType: QrEntityType,
  entityId: string,
): Promise<AdminActionResult & { newToken?: string }> {
  const profile = await getAuthenticatedProfile();
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return {
      success: false,
      error: "Unauthorized: Active administrator privileges required to regenerate QR codes.",
    };
  }

  const res = await rotateQrIdentity(entityType, entityId);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/admin/participants");
  revalidatePath("/admin");
  revalidatePath("/participants");

  return { success: true, newToken: res.newIdentity?.qr_token };
}




