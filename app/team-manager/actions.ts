"use server";

import { revalidatePath } from "next/cache";
import {
  getAuthenticatedProfile,
  createParticipantRecord,
  updateParticipantRecord,
  createRegistrationRecord,
  createSubstitutionRecord,
  createAppealRecord,
  type CreateParticipantInput,
  type UpdateParticipantInput,
  type CreateRegistrationInput,
  type CreateAppealInput,
} from "@/lib/repositories";

export type TeamManagerActionResult = {
  success: boolean;
  error?: string;
};

export type RequestSubstitutionInput = {
  festivalId: string;
  eventId: string;
  originalParticipantId: string;
  replacementParticipantId: string;
  reason: string;
  scheduledAt?: string | null;
  metadata?: Record<string, any>;
};

/**
 * Validates that current session belongs to an active team manager.
 */
async function getActiveTeamManagerProfile() {
  const profile = await getAuthenticatedProfile();
  if (
    !profile ||
    profile.role !== "team_manager" ||
    !profile.teamId ||
    !profile.isActive
  ) {
    return null;
  }
  return profile;
}

/**
 * Server action for Team Manager to register a new athlete into their own team roster.
 */
export async function createTeamParticipantAction(
  input: Omit<CreateParticipantInput, "teamId">,
): Promise<TeamManagerActionResult> {
  const profile = await getActiveTeamManagerProfile();
  if (!profile) {
    return {
      success: false,
      error: "Unauthorized: Active team manager session required.",
    };
  }

  // Force teamId to match manager's assigned team
  const res = await createParticipantRecord({
    ...input,
    teamId: profile.teamId,
  });

  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/team-manager");
  revalidatePath("/participants");
  return { success: true };
}

/**
 * Server action for Team Manager to update an athlete belonging to their own team.
 */
export async function updateTeamParticipantAction(
  input: UpdateParticipantInput,
): Promise<TeamManagerActionResult> {
  const profile = await getActiveTeamManagerProfile();
  if (!profile) {
    return {
      success: false,
      error: "Unauthorized: Active team manager session required.",
    };
  }

  // Ensure teamId is not changed away from manager's team
  const res = await updateParticipantRecord({
    ...input,
    teamId: profile.teamId,
  });

  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/team-manager");
  return { success: true };
}

/**
 * Server action for Team Manager to submit an event entry registration.
 */
export async function createTeamRegistrationAction(
  input: CreateRegistrationInput,
): Promise<TeamManagerActionResult> {
  const profile = await getActiveTeamManagerProfile();
  if (!profile) {
    return {
      success: false,
      error: "Unauthorized: Active team manager session required.",
    };
  }

  const res = await createRegistrationRecord(input);
  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/team-manager");
  return { success: true };
}

/**
 * Server action for Team Manager to request a substitution.
 * Timing and fee are calculated automatically (normal ₹20 >= 12h, emergency ₹50 < 12h).
 * Requires Admin desk review/approval.
 */
export async function requestSubstitutionAction(
  input: RequestSubstitutionInput,
): Promise<TeamManagerActionResult> {
  const profile = await getActiveTeamManagerProfile();
  if (!profile) {
    return {
      success: false,
      error: "Unauthorized: Active team manager session required.",
    };
  }

  const res = await createSubstitutionRecord(
    {
      festivalId: input.festivalId,
      eventId: input.eventId,
      teamId: profile.teamId!,
      originalParticipantId: input.originalParticipantId,
      replacementParticipantId: input.replacementParticipantId,
      reason: input.reason,
      scheduledAt: input.scheduledAt,
      metadata: input.metadata,
    },
    profile.userId,
  );

  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/team-manager");
  revalidatePath("/admin/substitutions");
  return { success: true };
}

/**
 * Server action for Team Manager to submit a formal appeal regarding an official result.
 */
export async function submitAppealAction(
  input: CreateAppealInput,
): Promise<TeamManagerActionResult> {
  const profile = await getActiveTeamManagerProfile();
  if (!profile) {
    return {
      success: false,
      error: "Unauthorized: Active team manager session required.",
    };
  }

  const res = await createAppealRecord(
    {
      ...input,
      teamId: profile.teamId!,
    },
    {
      userId: profile.userId,
      fullName: profile.fullName || "Team Manager",
      role: "team_manager",
      teamId: profile.teamId,
    },
  );

  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/team-manager");
  revalidatePath("/admin/appeals");
  return { success: true };
}

