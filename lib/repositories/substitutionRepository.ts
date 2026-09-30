import { createClient } from "@/lib/supabase/server";
import type {
  RegistrationSubstitutionRow,
  CreateSubstitutionInput,
  ReviewSubstitutionInput,
  SubstitutionTiming,
} from "@/lib/types";
import { validateRosterQuota } from "@/lib/competition/quotaEngine";
import {
  isTugOfWarEvent,
  extractWeightFromMetadata,
  validateTugOfWarSubstitutionWeight,
} from "@/lib/competition/tugOfWarWeight";

export type AdminSubstitutionRow = RegistrationSubstitutionRow & {
  originalParticipantName?: string;
  originalParticipantChest?: string | null;
  originalParticipantPublicId?: string;
  replacementParticipantName?: string;
  replacementParticipantChest?: string | null;
  replacementParticipantPublicId?: string;
  eventName?: string;
  eventCode?: string;
  teamName?: string;
  teamCode?: string;
};

export const SUBSTITUTION_COLUMNS =
  "id, festival_id, event_id, team_id, original_participant_id, replacement_participant_id, original_registration_id, replacement_registration_id, timing, fee_amount, payment_status, status, reason, requested_by, reviewed_by, reviewed_at, rejection_reason, metadata, created_at, updated_at" as const;

/**
 * Calculates timing tier and fee:
 * normal >= 12h: ₹20
 * emergency < 12h: ₹50
 */
export function calculateSubstitutionTiming(
  scheduledAt?: string | null,
): { timing: SubstitutionTiming; fee: number } {
  if (!scheduledAt) {
    return { timing: "normal", fee: 20 };
  }

  const scheduledTime = new Date(scheduledAt).getTime();
  const now = Date.now();
  const diffHours = (scheduledTime - now) / (1000 * 60 * 60);

  if (diffHours >= 12) {
    return { timing: "normal", fee: 20 };
  } else {
    return { timing: "emergency", fee: 50 };
  }
}

/**
 * Retrieves all substitutions for a festival with joined metadata.
 */
export async function getSubstitutionsByFestival(
  festivalId: string,
): Promise<AdminSubstitutionRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registration_substitutions")
    .select(`
      id,
      festival_id,
      event_id,
      team_id,
      original_participant_id,
      replacement_participant_id,
      original_registration_id,
      replacement_registration_id,
      timing,
      fee_amount,
      payment_status,
      status,
      reason,
      requested_by,
      reviewed_by,
      reviewed_at,
      rejection_reason,
      metadata,
      created_at,
      updated_at,
      orig_part:participants!registration_substitutions_original_participant_id_fkey(
        name,
        chest_number,
        public_id
      ),
      rep_part:participants!registration_substitutions_replacement_participant_id_fkey(
        name,
        chest_number,
        public_id
      ),
      events(
        code,
        name
      ),
      teams(
        code,
        name
      )
    `)
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[substitutionRepository.getSubstitutionsByFestival] Error:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    festival_id: row.festival_id,
    event_id: row.event_id,
    team_id: row.team_id,
    original_participant_id: row.original_participant_id,
    replacement_participant_id: row.replacement_participant_id,
    original_registration_id: row.original_registration_id,
    replacement_registration_id: row.replacement_registration_id,
    timing: row.timing,
    fee_amount: Number(row.fee_amount),
    payment_status: row.payment_status,
    status: row.status,
    reason: row.reason,
    requested_by: row.requested_by,
    reviewed_by: row.reviewed_by,
    reviewed_at: row.reviewed_at,
    rejection_reason: row.rejection_reason,
    metadata: row.metadata ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    originalParticipantName: row.orig_part?.name,
    originalParticipantChest: row.orig_part?.chest_number,
    originalParticipantPublicId: row.orig_part?.public_id,
    replacementParticipantName: row.rep_part?.name,
    replacementParticipantChest: row.rep_part?.chest_number,
    replacementParticipantPublicId: row.rep_part?.public_id,
    eventName: row.events?.name,
    eventCode: row.events?.code,
    teamName: row.teams?.name,
    teamCode: row.teams?.code,
  }));
}

/**
 * Retrieves substitutions for a specific team.
 */
export async function getSubstitutionsByTeam(
  festivalId: string,
  teamId: string,
): Promise<AdminSubstitutionRow[]> {
  const all = await getSubstitutionsByFestival(festivalId);
  return all.filter((s) => s.team_id === teamId);
}

/**
 * Creates a substitution request with domain validation.
 */
export async function createSubstitutionRecord(
  input: CreateSubstitutionInput,
  actorId?: string,
): Promise<{ success: boolean; data?: RegistrationSubstitutionRow; error?: string }> {
  if (!input.festivalId) return { success: false, error: "Festival ID is required." };
  if (!input.eventId) return { success: false, error: "Event ID is required." };
  if (!input.teamId) return { success: false, error: "Team ID is required." };
  if (!input.originalParticipantId) return { success: false, error: "Original participant ID is required." };
  if (!input.replacementParticipantId) return { success: false, error: "Replacement participant ID is required." };
  if (!input.reason?.trim()) return { success: false, error: "Substitution reason is required." };

  if (input.originalParticipantId === input.replacementParticipantId) {
    return { success: false, error: "Replacement must be a different athlete than original participant." };
  }

  const supabase = await createClient();

  // 1. Validate Original Participant & Active Registration
  const { data: origPart, error: origPartErr } = await supabase
    .from("participants")
    .select("id, team_id, division_id, name")
    .eq("id", input.originalParticipantId)
    .maybeSingle();

  if (origPartErr || !origPart) {
    return { success: false, error: "Original participant not found." };
  }

  if (origPart.team_id !== input.teamId) {
    return { success: false, error: "Original participant does not belong to the specified team." };
  }

  const { data: origReg, error: origRegErr } = await supabase
    .from("registrations")
    .select("id, status")
    .eq("participant_id", input.originalParticipantId)
    .eq("event_id", input.eventId)
    .maybeSingle();

  if (origRegErr || !origReg) {
    return { success: false, error: "Original participant does not have a registration for this event." };
  }

  if (origReg.status !== "approved") {
    return {
      success: false,
      error: `Cannot substitute participant with registration status "${origReg.status}". Must be "approved".`,
    };
  }

  // 2. Validate Replacement Participant
  const { data: repPart, error: repPartErr } = await supabase
    .from("participants")
    .select("id, team_id, division_id, status, name")
    .eq("id", input.replacementParticipantId)
    .maybeSingle();

  if (repPartErr || !repPart) {
    return { success: false, error: "Replacement participant not found in festival roster." };
  }

  if (repPart.status === "withdrawn" || repPart.status === "disqualified") {
    return {
      success: false,
      error: `Replacement participant is ${repPart.status} and cannot enter competitions.`,
    };
  }

  // Rule: Replacement must belong to the same team
  if (repPart.team_id !== input.teamId) {
    return {
      success: false,
      error: "Replacement participant must belong to the same house/team.",
    };
  }

  // Rule: Academic division check (must match event division requirements or original division)
  const { data: eventDivs } = await supabase
    .from("event_divisions")
    .select("division_id")
    .eq("event_id", input.eventId);

  const allowedDivIds = (eventDivs ?? []).map((ed: { division_id: string }) => ed.division_id);

  if (allowedDivIds.length > 0) {
    // Specific category event: replacement must belong to the exact same division
    if (repPart.division_id !== origPart.division_id) {
      return {
        success: false,
        error: "Replacement athlete must belong to the same academic division for category-specific events.",
      };
    }
  }

  // Rule: Replacement must not already be registered for that event
  const { data: repExistingReg } = await supabase
    .from("registrations")
    .select("id, status")
    .eq("participant_id", input.replacementParticipantId)
    .eq("event_id", input.eventId)
    .maybeSingle();

  if (repExistingReg) {
    return {
      success: false,
      error: `Replacement athlete is already registered in this event (status: ${repExistingReg.status}).`,
    };
  }

  // Check if there is already a pending substitution for this original registration
  const { data: existingPending } = await supabase
    .from("registration_substitutions")
    .select("id")
    .eq("original_registration_id", origReg.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending) {
    return {
      success: false,
      error: "A substitution request for this athlete in this event is already pending review.",
    };
  }

  // 3. Compute Timing and Fee
  const { timing, fee } = calculateSubstitutionTiming(input.scheduledAt);

  // 4. Insert Substitution Request
  const insertPayload = {
    festival_id: input.festivalId,
    event_id: input.eventId,
    team_id: input.teamId,
    original_participant_id: input.originalParticipantId,
    replacement_participant_id: input.replacementParticipantId,
    original_registration_id: origReg.id,
    timing,
    fee_amount: fee,
    payment_status: "unpaid",
    status: "pending",
    reason: input.reason.trim(),
    requested_by: actorId || null,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("registration_substitutions")
    .insert(insertPayload)
    .select(SUBSTITUTION_COLUMNS)
    .single();

  if (error) {
    console.error("[substitutionRepository.createSubstitutionRecord] Failed to insert:", error);
    return { success: false, error: `Failed to create substitution request: ${error.message}` };
  }

  return { success: true, data: data as RegistrationSubstitutionRow };
}

/**
 * Reviews (approves or rejects) a substitution request.
 * On approval:
 * 1. Original registration becomes 'withdrawn'.
 * 2. Replacement registration is created with status 'approved'.
 * 3. Future competition draws use the replacement athlete.
 * 4. Historical results remain 100% untouched.
 */
export async function reviewSubstitutionRecord(
  input: ReviewSubstitutionInput,
  reviewerId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!input.substitutionId) return { success: false, error: "Substitution ID is required." };
  if (!["approved", "rejected"].includes(input.status)) {
    return { success: false, error: "Invalid review status." };
  }

  const supabase = await createClient();

  // 1. Fetch substitution row
  const { data: sub, error: subErr } = await supabase
    .from("registration_substitutions")
    .select("*")
    .eq("id", input.substitutionId)
    .maybeSingle();

  if (subErr || !sub) {
    return { success: false, error: "Substitution record not found." };
  }

  if (sub.status !== "pending") {
    return { success: false, error: `Substitution is already ${sub.status}.` };
  }

  if (input.status === "rejected") {
    const { error: rejectErr } = await supabase
      .from("registration_substitutions")
      .update({
        status: "rejected",
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        rejection_reason: input.rejectionReason || "Rejected by administrator",
      })
      .eq("id", input.substitutionId);

    if (rejectErr) {
      return { success: false, error: `Failed to reject substitution: ${rejectErr.message}` };
    }
    return { success: true };
  }

  // 2. Validate Original Registration & Prospective Roster Quota
  const { data: origReg, error: origRegErr } = await supabase
    .from("registrations")
    .select("id, status, event_id, participant_id, metadata")
    .eq("id", sub.original_registration_id)
    .maybeSingle();

  if (origRegErr || !origReg) {
    return { success: false, error: "Original registration record not found." };
  }

  // Fetch event row for name/code
  const { data: eventRow } = await supabase
    .from("events")
    .select("id, code, name")
    .eq("id", sub.event_id)
    .maybeSingle();

  // Check custom database quota if defined
  let dbMaxQuota: number | null = null;
  const { data: eqRow } = await supabase
    .from("event_quotas")
    .select("maximum_count, substitutes_count")
    .eq("event_id", sub.event_id)
    .maybeSingle();
  if (eqRow && eqRow.maximum_count != null) {
    dbMaxQuota = eqRow.maximum_count + (eqRow.substitutes_count ?? 0);
  }

  // Count current active registrations for this house in this event
  const { data: activeTeamRegs } = await supabase
    .from("registrations")
    .select("id, status, participants!inner(team_id)")
    .eq("event_id", sub.event_id)
    .eq("participants.team_id", sub.team_id)
    .in("status", ["approved", "submitted", "draft"]);

  const currentCount = activeTeamRegs?.length ?? 0;
  // If original was active, it will be withdrawn (-1). If it was already inactive, withdrawing it subtracts 0.
  const isOriginalActive =
    origReg.status === "approved" ||
    origReg.status === "submitted" ||
    origReg.status === "draft";
  const withdrawnCount = isOriginalActive ? 1 : 0;

  const quotaResult = validateRosterQuota({
    eventName: eventRow?.name || eventRow?.code || "Event",
    eventId: eventRow?.code || sub.event_id,
    divisionId: null,
    currentRosterCount: currentCount,
    incomingCount: 1,
    withdrawnCount,
    customMaxQuota: dbMaxQuota,
  });

  if (!quotaResult.allowed) {
    return {
      success: false,
      error: `Roster limit exceeded: Cannot approve substitution. ${quotaResult.error}`,
    };
  }

  // 2b. Tug-of-War 600kg Weight Validation (for active main-team substitutions)
  let replacementWeight: number | null = null;
  const isTow = isTugOfWarEvent(eventRow?.code || sub.event_id);
  const origIsSubstitute = Boolean((origReg.metadata as Record<string, unknown> | null)?.isSubstitute);

  if (isTow && !origIsSubstitute) {
    // 1. Resolve replacement athlete's weight
    replacementWeight = extractWeightFromMetadata(sub.metadata);
    if (replacementWeight === null) {
      // Check if replacement participant has an existing registration row (e.g. registered as reserve/substitute)
      const { data: repExistingReg } = await supabase
        .from("registrations")
        .select("metadata")
        .eq("participant_id", sub.replacement_participant_id)
        .eq("event_id", sub.event_id)
        .maybeSingle();

      if (repExistingReg) {
        replacementWeight = extractWeightFromMetadata(repExistingReg.metadata);
      }
    }

    if (replacementWeight === null) {
      return {
        success: false,
        error:
          "Cannot approve Tug-of-War substitution: Replacement athlete does not have a valid weigh-in record.",
      };
    }

    // 2. Resolve outgoing athlete's weight
    const outgoingWeight = extractWeightFromMetadata(origReg.metadata) ?? 0;

    // 3. Query existing active main team registrations
    const { data: currentTowRegs } = await supabase
      .from("registrations")
      .select("id, status, metadata, participants!inner(team_id)")
      .eq("event_id", sub.event_id)
      .eq("participants.team_id", sub.team_id)
      .in("status", ["approved", "submitted", "draft"]);

    const currentMainWeights = (currentTowRegs ?? [])
      .filter((r: any) => !r.metadata?.isSubstitute)
      .map((r: any) => ({
        participantId: r.id,
        weightKg: extractWeightFromMetadata(r.metadata),
        isSubstitute: false,
      }));

    const subWeightResult = validateTugOfWarSubstitutionWeight({
      currentMainWeights,
      outgoingWeightKg: outgoingWeight,
      incomingWeightKg: replacementWeight,
    });

    if (!subWeightResult.valid) {
      return {
        success: false,
        error: `Weight limit exceeded: Cannot approve substitution. ${subWeightResult.error}`,
      };
    }
  }

  // 3. Execute Approval Workflow:
  // a) Mark original registration as 'withdrawn'
  const { error: withdrawErr } = await supabase
    .from("registrations")
    .update({
      status: "withdrawn",
      metadata: {
        substituted_out: true,
        substitution_id: sub.id,
        replaced_by: sub.replacement_participant_id,
        withdrawn_at: new Date().toISOString(),
      },
    })
    .eq("id", sub.original_registration_id);

  if (withdrawErr) {
    return { success: false, error: `Failed to withdraw original registration: ${withdrawErr.message}` };
  }

  // b) Fetch replacement participant details for division
  const { data: repPart } = await supabase
    .from("participants")
    .select("division_id")
    .eq("id", sub.replacement_participant_id)
    .single();

  // c) Create replacement registration with status 'approved'
  const { data: newReg, error: newRegErr } = await supabase
    .from("registrations")
    .insert({
      festival_id: sub.festival_id,
      participant_id: sub.replacement_participant_id,
      event_id: sub.event_id,
      division_id: repPart?.division_id || null,
      status: "approved",
      metadata: {
        substituted_in: true,
        substitution_id: sub.id,
        replaced_participant_id: sub.original_participant_id,
        isSubstitute: false,
        ...(replacementWeight !== null ? { weightKg: replacementWeight } : {}),
      },
    })
    .select("id")
    .single();

  if (newRegErr) {
    return { success: false, error: `Failed to create replacement registration: ${newRegErr.message}` };
  }

  // d) Update substitution record to 'approved'
  const { error: updateSubErr } = await supabase
    .from("registration_substitutions")
    .update({
      status: "approved",
      replacement_registration_id: newReg?.id || null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      payment_status: input.paymentStatus || sub.payment_status,
    })
    .eq("id", sub.id);

  if (updateSubErr) {
    return { success: false, error: `Failed to update substitution status: ${updateSubErr.message}` };
  }

  return { success: true };
}

