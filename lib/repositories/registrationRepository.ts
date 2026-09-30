import { createClient } from "@/lib/supabase/server";
import type { RegistrationStatus } from "@/lib/types";
import { validateRosterQuota } from "@/lib/competition/quotaEngine";
import {
  isTugOfWarEvent,
  extractWeightFromMetadata,
  validateTugOfWarWeight,
} from "@/lib/competition/tugOfWarWeight";

/**
 * Shape of a row in public.registrations matching migrations 001 and 010.
 */
export type RegistrationRow = {
  id: string;
  festival_id: string;
  participant_id: string;
  event_id: string;
  division_id: string | null;
  status: RegistrationStatus;
  seed_number: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AdminRegistrationRow = RegistrationRow & {
  participantName?: string;
  participantChestNumber?: string | null;
  participantPublicId?: string;
  teamId?: string | null;
  teamCode?: string;
  teamName?: string;
  eventName?: string;
  eventCode?: string;
  divisionName?: string | null;
};

export type CreateRegistrationInput = {
  festivalId: string;
  participantId: string;
  eventId: string;
  divisionId?: string | null;
  status?: RegistrationStatus;
  seedNumber?: number | null;
  metadata?: Record<string, unknown>;
};

export const REGISTRATION_COLUMNS =
  "id, festival_id, participant_id, event_id, division_id, status, seed_number, metadata, created_at, updated_at" as const;

/**
 * Retrieves all registrations for a given festival.
 */
export async function getRegistrationsByFestival(
  festivalId: string,
): Promise<RegistrationRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registrations")
    .select(REGISTRATION_COLUMNS)
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      `[registrationRepository.getRegistrationsByFestival] Failed to retrieve registrations:`,
      error,
    );
    throw new Error(`Failed to retrieve registrations: ${error.message} (${error.code})`);
  }

  return (data as RegistrationRow[]) ?? [];
}

/**
 * Retrieves all registrations for a festival joined with participant, team, and event metadata.
 */
export async function getAdminRegistrationsByFestival(
  festivalId: string,
): Promise<AdminRegistrationRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registrations")
    .select(`
      id,
      festival_id,
      participant_id,
      event_id,
      division_id,
      status,
      seed_number,
      metadata,
      created_at,
      updated_at,
      participants (
        id,
        name,
        chest_number,
        public_id,
        team_id,
        division_id,
        teams (
          id,
          code,
          name
        ),
        divisions (
          id,
          name
        )
      ),
      events (
        id,
        code,
        name
      )
    `)
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      `[registrationRepository.getAdminRegistrationsByFestival] Failed to retrieve registrations:`,
      error,
    );
    return [];
  }

  return (data ?? []).map((row: any) => {
    const pt = row.participants;
    const ev = row.events;
    return {
      id: row.id,
      festival_id: row.festival_id,
      participant_id: row.participant_id,
      event_id: row.event_id,
      division_id: row.division_id,
      status: row.status,
      seed_number: row.seed_number,
      metadata: row.metadata ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
      participantName: pt?.name,
      participantChestNumber: pt?.chest_number,
      participantPublicId: pt?.public_id,
      teamId: pt?.team_id,
      teamCode: pt?.teams?.code,
      teamName: pt?.teams?.name,
      eventName: ev?.name,
      eventCode: ev?.code,
      divisionName: pt?.divisions?.name,
    };
  });
}

/**
 * Retrieves all registrations for athletes of a specific team.
 */
export async function getRegistrationsByTeam(
  festivalId: string,
  teamId: string,
): Promise<AdminRegistrationRow[]> {
  const all = await getAdminRegistrationsByFestival(festivalId);
  return all.filter((r) => r.teamId === teamId);
}

/**
 * Retrieves all registrations for a specific event.
 */
export async function getRegistrationsByEvent(
  festivalId: string,
  eventId: string,
): Promise<RegistrationRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registrations")
    .select(REGISTRATION_COLUMNS)
    .eq("festival_id", festivalId)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      `[registrationRepository.getRegistrationsByEvent] Failed:`,
      error,
    );
    throw new Error(`Failed to retrieve event registrations: ${error.message}`);
  }

  return (data as RegistrationRow[]) ?? [];
}

/**
 * Retrieves all active registrations for a specific participant.
 */
export async function getRegistrationsByParticipant(
  participantId: string,
): Promise<RegistrationRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registrations")
    .select(REGISTRATION_COLUMNS)
    .eq("participant_id", participantId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(
      `[registrationRepository.getRegistrationsByParticipant] Failed:`,
      error,
    );
    return [];
  }

  return (data as RegistrationRow[]) ?? [];
}

/**
 * Retrieves a single registration by ID.
 */
export async function getRegistrationById(
  registrationId: string,
): Promise<RegistrationRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registrations")
    .select(REGISTRATION_COLUMNS)
    .eq("id", registrationId)
    .maybeSingle();

  if (error) {
    console.error(
      `[registrationRepository.getRegistrationById] Failed:`,
      error,
    );
    return null;
  }

  return (data as RegistrationRow) ?? null;
}

/**
 * Creates a new event registration record with domain validation.
 */
export async function createRegistrationRecord(
  input: CreateRegistrationInput,
): Promise<{ success: boolean; data?: RegistrationRow; error?: string }> {
  if (!input.festivalId) return { success: false, error: "Festival ID is required." };
  if (!input.participantId) return { success: false, error: "Participant ID is required." };
  if (!input.eventId) return { success: false, error: "Event ID is required." };

  const supabase = await createClient();

  // 1. Check if athlete already has any registration in this event
  const { data: existing, error: existErr } = await supabase
    .from("registrations")
    .select("id, status")
    .eq("participant_id", input.participantId)
    .eq("event_id", input.eventId)
    .maybeSingle();

  if (existErr) {
    return { success: false, error: `Database error checking existing registration: ${existErr.message}` };
  }

  if (existing) {
    if (existing.status === "withdrawn") {
      return {
        success: false,
        error: "Participant was previously withdrawn/substituted from this event and cannot re-enter the same event.",
      };
    }
    return {
      success: false,
      error: `Participant is already registered for this event (status: ${existing.status}).`,
    };
  }

  // 2. Fetch participant to ensure valid division and team
  const { data: participant, error: partErr } = await supabase
    .from("participants")
    .select("id, team_id, division_id, status")
    .eq("id", input.participantId)
    .maybeSingle();

  if (partErr || !participant) {
    return { success: false, error: "Participant not found." };
  }

  if (participant.status === "withdrawn" || participant.status === "disqualified") {
    return {
      success: false,
      error: `Cannot register participant with status "${participant.status}".`,
    };
  }

  // 3. Fetch event division requirements to validate category eligibility
  const { data: eventDivs } = await supabase
    .from("event_divisions")
    .select("division_id")
    .eq("event_id", input.eventId);

  const allowedDivIds = (eventDivs ?? []).map((ed: { division_id: string }) => ed.division_id);

  // If event has specific divisions, participant division must match
  if (allowedDivIds.length > 0) {
    if (!participant.division_id || !allowedDivIds.includes(participant.division_id)) {
      return {
        success: false,
        error: "Participant academic division is not eligible for this category-specific event.",
      };
    }
  }

  // 4. Validate Roster Quota against Canonical Rules
  const { data: eventRow } = await supabase
    .from("events")
    .select("id, code, name")
    .eq("id", input.eventId)
    .maybeSingle();

  let divisionCode: string | undefined = undefined;
  const divId = participant.division_id || input.divisionId;
  if (divId) {
    const { data: divRow } = await supabase
      .from("divisions")
      .select("code")
      .eq("id", divId)
      .maybeSingle();
    divisionCode = divRow?.code;
  }

  let dbMaxQuota: number | null = null;
  const { data: eqRow } = await supabase
    .from("event_quotas")
    .select("maximum_count, substitutes_count")
    .eq("event_id", input.eventId)
    .maybeSingle();
  if (eqRow && eqRow.maximum_count != null) {
    dbMaxQuota = eqRow.maximum_count + (eqRow.substitutes_count ?? 0);
  }

  // Count existing active registrations for this house in this event
  const { data: activeTeamRegs } = await supabase
    .from("registrations")
    .select("id, status, participants!inner(team_id)")
    .eq("event_id", input.eventId)
    .eq("participants.team_id", participant.team_id)
    .in("status", ["approved", "submitted", "draft"]);

  const currentCount = activeTeamRegs?.length ?? 0;

  const quotaResult = validateRosterQuota({
    eventName: eventRow?.name || eventRow?.code || "Event",
    eventId: eventRow?.code || input.eventId,
    divisionId: divisionCode || divId || null,
    currentRosterCount: currentCount,
    incomingCount: 1,
    customMaxQuota: dbMaxQuota,
  });

  if (!quotaResult.allowed) {
    return {
      success: false,
      error: quotaResult.error,
    };
  }

  // 4b. Validate Tug-of-War 600kg Weight Ceiling (Main/Active team only)
  const isTow = isTugOfWarEvent(eventRow?.code || input.eventId);
  const isSubstitute = Boolean(input.metadata?.isSubstitute);

  if (isTow && !isSubstitute) {
    const athleteWeight = extractWeightFromMetadata(input.metadata);
    if (athleteWeight === null) {
      return {
        success: false,
        error:
          "Tug-of-War main team entries require an official athlete weigh-in record (metadata.weightKg > 0).",
      };
    }

    // Fetch existing active registrations for this house in Tug of War with their metadata
    const { data: existingTowRegs } = await supabase
      .from("registrations")
      .select("id, status, metadata, participants!inner(team_id)")
      .eq("event_id", input.eventId)
      .eq("participants.team_id", participant.team_id)
      .in("status", ["approved", "submitted", "draft"]);

    const mainParticipantsList = (existingTowRegs ?? [])
      .filter((r: any) => !r.metadata?.isSubstitute)
      .map((r: any) => ({
        participantId: r.id,
        weightKg: extractWeightFromMetadata(r.metadata),
        isSubstitute: false,
      }));

    // Add incoming athlete
    mainParticipantsList.push({
      participantId: input.participantId,
      weightKg: athleteWeight,
      isSubstitute: false,
    });

    const weightValidation = validateTugOfWarWeight(mainParticipantsList);
    if (!weightValidation.valid) {
      return {
        success: false,
        error: weightValidation.error,
      };
    }
  }

  // 5. Insert registration
  const insertPayload = {
    festival_id: input.festivalId,
    participant_id: input.participantId,
    event_id: input.eventId,
    division_id: participant.division_id || input.divisionId || null,
    status: input.status || "approved",
    seed_number: input.seedNumber ?? null,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("registrations")
    .insert(insertPayload)
    .select(REGISTRATION_COLUMNS)
    .single();

  if (error) {
    console.error("[registrationRepository.createRegistrationRecord] Failed to insert:", error);
    return { success: false, error: `Failed to create registration: ${error.message}` };
  }

  return { success: true, data: data as RegistrationRow };
}

/**
 * Updates registration status (e.g. approve, reject, withdraw).
 */
export async function updateRegistrationStatusRecord(
  registrationId: string,
  status: RegistrationStatus,
): Promise<{ success: boolean; data?: RegistrationRow; error?: string }> {
  if (!registrationId) return { success: false, error: "Registration ID is required." };

  const validStatuses: RegistrationStatus[] = [
    "draft",
    "submitted",
    "approved",
    "withdrawn",
    "rejected",
  ];

  if (!validStatuses.includes(status)) {
    return { success: false, error: `Invalid registration status: ${status}` };
  }

  const supabase = await createClient();

  // If activating to approved or submitted from an inactive status (withdrawn or rejected),
  // verify prospective roster quota and weight before activation.
  if (status === "approved" || status === "submitted") {
    const { data: currentReg } = await supabase
      .from("registrations")
      .select("id, status, event_id, participant_id, metadata, participants!inner(team_id, division_id)")
      .eq("id", registrationId)
      .maybeSingle();

    if (
      currentReg &&
      (currentReg.status === "withdrawn" || currentReg.status === "rejected")
    ) {
      const participantObj = currentReg.participants as unknown as {
        team_id?: string;
        division_id?: string;
      } | null;
      const partTeamId = participantObj?.team_id;
      const partDivId = participantObj?.division_id;

      const { data: eventRow } = await supabase
        .from("events")
        .select("id, code, name")
        .eq("id", currentReg.event_id)
        .maybeSingle();

      let divisionCode: string | undefined = undefined;
      if (partDivId) {
        const { data: divRow } = await supabase
          .from("divisions")
          .select("code")
          .eq("id", partDivId)
          .maybeSingle();
        divisionCode = divRow?.code;
      }

      let dbMaxQuota: number | null = null;
      const { data: eqRow } = await supabase
        .from("event_quotas")
        .select("maximum_count, substitutes_count")
        .eq("event_id", currentReg.event_id)
        .maybeSingle();
      if (eqRow && eqRow.maximum_count != null) {
        dbMaxQuota = eqRow.maximum_count + (eqRow.substitutes_count ?? 0);
      }

      const { data: activeTeamRegs } = await supabase
        .from("registrations")
        .select("id, status, metadata, participants!inner(team_id)")
        .eq("event_id", currentReg.event_id)
        .eq("participants.team_id", partTeamId)
        .in("status", ["approved", "submitted", "draft"]);

      const currentCount = activeTeamRegs?.length ?? 0;

      const quotaResult = validateRosterQuota({
        eventName: eventRow?.name || eventRow?.code || "Event",
        eventId: eventRow?.code || currentReg.event_id,
        divisionId: divisionCode || partDivId || null,
        currentRosterCount: currentCount,
        incomingCount: 1,
        customMaxQuota: dbMaxQuota,
      });

      if (!quotaResult.allowed) {
        return {
          success: false,
          error: `Roster limit exceeded: Cannot activate registration. ${quotaResult.error}`,
        };
      }

      // Check Tug-of-War prospective weight if active main team member
      const isTow = isTugOfWarEvent(eventRow?.code || currentReg.event_id);
      const isSub = Boolean((currentReg.metadata as Record<string, unknown> | null)?.isSubstitute);

      if (isTow && !isSub) {
        const athleteWeight = extractWeightFromMetadata(currentReg.metadata);
        if (athleteWeight === null) {
          return {
            success: false,
            error: "Cannot activate Tug-of-War registration: Participant lacks a valid weigh-in record.",
          };
        }

        const mainParticipantsList = (activeTeamRegs ?? [])
          .filter((r: any) => r.id !== registrationId && !r.metadata?.isSubstitute)
          .map((r: any) => ({
            participantId: r.id,
            weightKg: extractWeightFromMetadata(r.metadata),
            isSubstitute: false,
          }));

        mainParticipantsList.push({
          participantId: currentReg.participant_id,
          weightKg: athleteWeight,
          isSubstitute: false,
        });

        const weightValidation = validateTugOfWarWeight(mainParticipantsList);
        if (!weightValidation.valid) {
          return {
            success: false,
            error: `Weight limit exceeded: Cannot activate registration. ${weightValidation.error}`,
          };
        }
      }
    }
  }

  const { data, error } = await supabase
    .from("registrations")
    .update({ status })
    .eq("id", registrationId)
    .select(REGISTRATION_COLUMNS)
    .single();

  if (error) {
    console.error("[registrationRepository.updateRegistrationStatusRecord] Failed:", error);
    return { success: false, error: `Failed to update registration status: ${error.message}` };
  }

  return { success: true, data: data as RegistrationRow };
}

/**
 * Withdraws a registration with metadata logging.
 */
export async function withdrawRegistrationRecord(
  registrationId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("registrations")
    .select("metadata")
    .eq("id", registrationId)
    .maybeSingle();

  const currentMeta = (existing?.metadata as Record<string, unknown>) || {};
  const updatedMeta = {
    ...currentMeta,
    withdrawn_at: new Date().toISOString(),
    withdrawn_reason: reason || "Administrative withdrawal",
  };

  const { error } = await supabase
    .from("registrations")
    .update({
      status: "withdrawn",
      metadata: updatedMeta,
    })
    .eq("id", registrationId);

  if (error) {
    return { success: false, error: `Failed to withdraw registration: ${error.message}` };
  }

  return { success: true };
}

