import { createClient } from "@/lib/supabase/server";
import type { ParticipantStatus } from "@/lib/types";

/**
 * Public participant projection matching public.participants in migration 20260920000100.
 * Strictly excludes private columns (phone, email, date_of_birth, notes)
 * to preserve athlete privacy across all public data-access operations.
 */
export type ParticipantRow = {
  id: string;
  festival_id: string;
  team_id: string | null;
  division_id: string | null;
  public_id: string;
  chest_number: string | null;
  name: string;
  profile_image_url: string | null;
  status: ParticipantStatus;
  created_at: string;
  updated_at: string;
};

/**
 * Full administrative participant projection including private fields and registered event IDs.
 * Strictly restricted to authenticated administrator views.
 */
export type AdminParticipantRow = ParticipantRow & {
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  notes: string | null;
  registeredEventIds?: string[];
};

export type CreateParticipantInput = {
  festivalId: string;
  name: string;
  teamId?: string | null;
  divisionId?: string | null;
  chestNumber?: string | null;
  publicId?: string | null;
  status?: ParticipantStatus;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  profileImageUrl?: string | null;
};

export type UpdateParticipantInput = {
  participantId: string;
  name?: string;
  teamId?: string | null;
  divisionId?: string | null;
  chestNumber?: string | null;
  status?: ParticipantStatus;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
  profileImageUrl?: string | null;
};

/**
 * Explicit public columns queried from public.participants.
 * Private fields (phone, email, date_of_birth, notes) are intentionally omitted.
 */
const PARTICIPANT_PUBLIC_COLUMNS =
  "id, festival_id, team_id, division_id, public_id, chest_number, name, profile_image_url, status, created_at, updated_at" as const;

/**
 * Full administrative columns queried for admin console operations.
 */
const PARTICIPANT_ADMIN_COLUMNS =
  "id, festival_id, team_id, division_id, public_id, chest_number, name, profile_image_url, status, phone, email, date_of_birth, notes, created_at, updated_at" as const;

/**
 * Retrieves all public participant records for a given festival.
 *
 * @param festivalId - The UUID of the festival
 * @returns An array of public ParticipantRow records
 * @throws Error if the Supabase query fails
 */
export async function getParticipantsByFestival(
  festivalId: string,
): Promise<ParticipantRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("participants")
    .select(PARTICIPANT_PUBLIC_COLUMNS)
    .eq("festival_id", festivalId)
    .order("name", { ascending: true });

  if (error) {
    console.error(
      `[participantRepository.getParticipantsByFestival] Failed to retrieve participants for festival ${festivalId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve participants for festival ${festivalId}: ${error.message} (${error.code})`,
    );
  }

  return (data as ParticipantRow[]) ?? [];
}

/**
 * Retrieves all administrative participant records for a festival,
 * including private fields and registered event IDs.
 *
 * @param festivalId - The UUID of the festival
 * @returns An array of AdminParticipantRow records
 */
export async function getParticipantsByFestivalAdmin(
  festivalId: string,
): Promise<AdminParticipantRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  // 1. Fetch participants with full fields
  const { data: partData, error: partError } = await supabase
    .from("participants")
    .select(PARTICIPANT_ADMIN_COLUMNS)
    .eq("festival_id", festivalId)
    .order("name", { ascending: true });

  if (partError) {
    console.error(
      `[participantRepository.getParticipantsByFestivalAdmin] Failed to retrieve participants:`,
      partError,
    );
    throw new Error(
      `Failed to retrieve participants for admin view: ${partError.message}`,
    );
  }

  const participants = (partData as AdminParticipantRow[]) ?? [];
  if (participants.length === 0) {
    return [];
  }

  // 2. Fetch event registrations for this festival to map registered event IDs
  try {
    const { data: regData, error: regError } = await supabase
      .from("registrations")
      .select("participant_id, event_id")
      .eq("festival_id", festivalId)
      .eq("status", "approved");

    if (!regError && regData) {
      const regMap = new Map<string, string[]>();
      for (const reg of regData) {
        const list = regMap.get(reg.participant_id) || [];
        list.push(reg.event_id);
        regMap.set(reg.participant_id, list);
      }

      for (const p of participants) {
        p.registeredEventIds = regMap.get(p.id) || [];
      }
    }
  } catch (err) {
    console.warn(
      `[participantRepository.getParticipantsByFestivalAdmin] Warning: unable to fetch registrations:`,
      err,
    );
  }

  return participants;
}

/**
 * Retrieves a single public participant record by primary key ID.
 * Note: Public canonical routing should prefer getParticipantByPublicId.
 *
 * @param participantId - The UUID of the participant
 * @returns The public ParticipantRow record if found, or null
 * @throws Error if the Supabase query fails
 */
export async function getParticipantById(
  participantId: string,
): Promise<ParticipantRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("participants")
    .select(PARTICIPANT_PUBLIC_COLUMNS)
    .eq("id", participantId)
    .maybeSingle();

  if (error) {
    console.error(
      `[participantRepository.getParticipantById] Failed to retrieve participant ${participantId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve participant ${participantId}: ${error.message} (${error.code})`,
    );
  }

  return (data as ParticipantRow) ?? null;
}

/**
 * Retrieves a single public participant record by publicId (e.g., 'PGS-0001').
 * Canonical public identity lookup for athlete profile views.
 *
 * @param publicId - The public identifier of the participant
 * @param festivalId - Optional festival UUID to disambiguate across festivals
 * @returns The public ParticipantRow record if found, or null
 * @throws Error if the Supabase query fails
 */
export async function getParticipantByPublicId(
  publicId: string,
  festivalId?: string,
): Promise<ParticipantRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  const supabase = await createClient();

  let query = supabase
    .from("participants")
    .select(PARTICIPANT_PUBLIC_COLUMNS)
    .eq("public_id", publicId);

  if (festivalId) {
    query = query.eq("festival_id", festivalId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(
      `[participantRepository.getParticipantByPublicId] Failed to retrieve participant with publicId ${publicId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve participant with publicId ${publicId}: ${error.message} (${error.code})`,
    );
  }

  return (data as ParticipantRow) ?? null;
}

/**
 * Retrieves a single public participant record by chest number.
 * Explicit lookup method supporting fast field lookup on /my-result.
 *
 * @param chestNumber - The chest number of the participant
 * @param festivalId - Optional festival UUID to disambiguate across festivals
 * @returns The public ParticipantRow record if found, or null
 */
export async function getParticipantByChestNumber(
  chestNumber: string,
  festivalId?: string,
): Promise<ParticipantRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  try {
    const supabase = await createClient();

    let query = supabase
      .from("participants")
      .select(PARTICIPANT_PUBLIC_COLUMNS)
      .eq("chest_number", chestNumber);

    if (festivalId) {
      query = query.eq("festival_id", festivalId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(
        `[participantRepository.getParticipantByChestNumber] Failed to retrieve participant with chest number ${chestNumber}:`,
        error,
      );
      return null;
    }

    return (data as ParticipantRow) ?? null;
  } catch (error) {
    console.error(
      `[participantRepository.getParticipantByChestNumber] Unexpected error for chest number ${chestNumber}:`,
      error,
    );
    return null;
  }
}

/**
 * Retrieves all registered participants for a specific event within a festival.
 * Queries public.registrations joined with public.participants.
 * Strictly projects public participant fields only.
 *
 * @param festivalId - The UUID of the festival
 * @param eventId - The UUID of the event
 * @returns An array of public ParticipantRow records
 */
export async function getParticipantsByEvent(
  festivalId: string,
  eventId: string,
): Promise<ParticipantRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  try {
    const supabase = await createClient();

    // 1. Query approved registrations for this event
    const { data: regData, error: regError } = await supabase
      .from("registrations")
      .select("participant_id")
      .eq("festival_id", festivalId)
      .eq("event_id", eventId)
      .eq("status", "approved");

    if (regError) {
      console.error(
        `[participantRepository.getParticipantsByEvent] Failed to retrieve registrations for event ${eventId}:`,
        regError,
      );
      return [];
    }

    if (!regData || regData.length === 0) {
      return [];
    }

    const participantIds = regData.map((r: { participant_id: string }) => r.participant_id);

    // 2. Fetch public participant rows for these IDs
    const { data: partData, error: partError } = await supabase
      .from("participants")
      .select(PARTICIPANT_PUBLIC_COLUMNS)
      .eq("festival_id", festivalId)
      .in("id", participantIds)
      .order("name", { ascending: true });

    if (partError) {
      console.error(
        `[participantRepository.getParticipantsByEvent] Failed to retrieve participant rows:`,
        partError,
      );
      return [];
    }

    return (partData as ParticipantRow[]) ?? [];
  } catch (error) {
    console.error(
      `[participantRepository.getParticipantsByEvent] Unexpected error:`,
      error,
    );
    return [];
  }
}

/**
 * Generates the next sequential public ID for a festival (canonical PGS-XXXX format).
 */
async function generateNextPublicId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  festivalId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("participants")
    .select("public_id")
    .eq("festival_id", festivalId);

  if (error || !data || data.length === 0) {
    return "PGS-0001";
  }

  let maxNum = 0;
  for (const row of data) {
    const match = (row.public_id || "").match(/PGS-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `PGS-${String(nextNum).padStart(4, "0")}`;
}

/**
 * Creates a new participant record with strict domain validation and public ID generation.
 * Strictly requires authenticated active admin context.
 */
export async function createParticipantRecord(
  input: CreateParticipantInput,
): Promise<{ success: boolean; data?: ParticipantRow; error?: string }> {
  if (!input.name || input.name.trim() === "") {
    return { success: false, error: "Participant name is required." };
  }
  if (!input.festivalId || input.festivalId.trim() === "") {
    return { success: false, error: "Festival ID is required." };
  }

  const validStatuses: ParticipantStatus[] = [
    "registered",
    "confirmed",
    "withdrawn",
    "disqualified",
  ];
  const status = input.status || "registered";
  if (!validStatuses.includes(status)) {
    return {
      success: false,
      error: `Invalid participant status: "${input.status}". Allowed values: ${validStatuses.join(", ")}`,
    };
  }

  const supabase = await createClient();

  // 1. Validate chest number uniqueness if provided
  if (input.chestNumber && input.chestNumber.trim() !== "") {
    const trimmedChest = input.chestNumber.trim();
    const { data: existingChest, error: chestError } = await supabase
      .from("participants")
      .select("id, name")
      .eq("festival_id", input.festivalId)
      .eq("chest_number", trimmedChest)
      .maybeSingle();

    if (chestError) {
      return {
        success: false,
        error: `Database check for chest number failed: ${chestError.message}`,
      };
    }

    if (existingChest) {
      return {
        success: false,
        error: `Chest number "${trimmedChest}" is already assigned to participant "${existingChest.name}".`,
      };
    }
  }

  // 2. Resolve canonical public_id
  let publicId = input.publicId?.trim();
  if (!publicId) {
    publicId = await generateNextPublicId(supabase, input.festivalId);
  } else {
    // Check if provided publicId already exists
    const { data: existingPubId } = await supabase
      .from("participants")
      .select("id")
      .eq("festival_id", input.festivalId)
      .eq("public_id", publicId)
      .maybeSingle();

    if (existingPubId) {
      return {
        success: false,
        error: `Public ID "${publicId}" is already in use.`,
      };
    }
  }

  // 3. Insert record
  const insertPayload = {
    festival_id: input.festivalId,
    name: input.name.trim(),
    public_id: publicId,
    team_id: input.teamId || null,
    division_id: input.divisionId || null,
    chest_number: input.chestNumber?.trim() || null,
    status,
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    date_of_birth: input.dateOfBirth || null,
    notes: input.notes?.trim() || null,
    profile_image_url: input.profileImageUrl?.trim() || null,
  };

  const { data, error } = await supabase
    .from("participants")
    .insert(insertPayload)
    .select(PARTICIPANT_ADMIN_COLUMNS)
    .single();

  if (error) {
    console.error(
      `[participantRepository.createParticipantRecord] Failed to insert participant:`,
      error,
    );
    return {
      success: false,
      error: `Failed to create participant: ${error.message} (${error.code})`,
    };
  }

  return { success: true, data: data as ParticipantRow };
}

/**
 * Updates an existing participant record.
 * Public ID and ID remain strictly immutable.
 */
export async function updateParticipantRecord(
  input: UpdateParticipantInput,
): Promise<{ success: boolean; data?: ParticipantRow; error?: string }> {
  if (!input.participantId || input.participantId.trim() === "") {
    return { success: false, error: "Participant ID is required." };
  }
  if (input.name !== undefined && input.name.trim() === "") {
    return { success: false, error: "Participant name cannot be empty." };
  }

  const validStatuses: ParticipantStatus[] = [
    "registered",
    "confirmed",
    "withdrawn",
    "disqualified",
  ];
  if (input.status !== undefined && !validStatuses.includes(input.status)) {
    return {
      success: false,
      error: `Invalid participant status: "${input.status}". Allowed values: ${validStatuses.join(", ")}`,
    };
  }

  const supabase = await createClient();

  // 1. Fetch existing participant to get festivalId
  const { data: existing, error: fetchError } = await supabase
    .from("participants")
    .select("id, festival_id, name")
    .eq("id", input.participantId)
    .maybeSingle();

  if (fetchError || !existing) {
    return {
      success: false,
      error: `Participant not found (${input.participantId}).`,
    };
  }

  // 2. Validate chest number uniqueness if changed
  if (input.chestNumber !== undefined && input.chestNumber !== null && input.chestNumber.trim() !== "") {
    const trimmedChest = input.chestNumber.trim();
    const { data: chestCollision, error: chestError } = await supabase
      .from("participants")
      .select("id, name")
      .eq("festival_id", existing.festival_id)
      .eq("chest_number", trimmedChest)
      .neq("id", input.participantId)
      .maybeSingle();

    if (chestError) {
      return {
        success: false,
        error: `Database check for chest number failed: ${chestError.message}`,
      };
    }

    if (chestCollision) {
      return {
        success: false,
        error: `Chest number "${trimmedChest}" is already assigned to participant "${chestCollision.name}".`,
      };
    }
  }

  // 3. Construct update payload (excluding immutable public_id, id, festival_id)
  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.teamId !== undefined) updatePayload.team_id = input.teamId || null;
  if (input.divisionId !== undefined) updatePayload.division_id = input.divisionId || null;
  if (input.chestNumber !== undefined) {
    updatePayload.chest_number = input.chestNumber ? input.chestNumber.trim() : null;
  }
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.phone !== undefined) updatePayload.phone = input.phone ? input.phone.trim() : null;
  if (input.email !== undefined) updatePayload.email = input.email ? input.email.trim() : null;
  if (input.dateOfBirth !== undefined) updatePayload.date_of_birth = input.dateOfBirth || null;
  if (input.notes !== undefined) updatePayload.notes = input.notes ? input.notes.trim() : null;
  if (input.profileImageUrl !== undefined) {
    updatePayload.profile_image_url = input.profileImageUrl ? input.profileImageUrl.trim() : null;
  }

  const { data, error } = await supabase
    .from("participants")
    .update(updatePayload)
    .eq("id", input.participantId)
    .select(PARTICIPANT_ADMIN_COLUMNS)
    .single();

  if (error) {
    console.error(
      `[participantRepository.updateParticipantRecord] Failed to update participant ${input.participantId}:`,
      error,
    );
    return {
      success: false,
      error: `Failed to update participant: ${error.message} (${error.code})`,
    };
  }

  return { success: true, data: data as ParticipantRow };
}

/**
 * Fast status transition method for participant records.
 */
export async function updateParticipantStatusRecord(
  participantId: string,
  status: ParticipantStatus,
): Promise<{ success: boolean; error?: string }> {
  return updateParticipantRecord({ participantId, status });
}

/**
 * Fast chest number assignment method for participant records.
 */
export async function updateParticipantChestNumberRecord(
  participantId: string,
  chestNumber: string,
): Promise<{ success: boolean; error?: string }> {
  return updateParticipantRecord({ participantId, chestNumber });
}
