import { createClient } from "../supabase/server.ts";
import type { ParticipantStatus } from "../types/index.ts";
import { participants as staticParticipants } from "../../data/participants.ts";

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
 * In-memory fallback participant store for offline/test environments
 */
const inMemoryParticipants = new Map<string, AdminParticipantRow>();

function initInMemoryStore() {
  if (inMemoryParticipants.size === 0) {
    for (const sp of staticParticipants) {
      inMemoryParticipants.set(sp.id, {
        id: sp.id,
        festival_id: "fest-2026",
        team_id: sp.teamId || null,
        division_id: sp.divisionId || null,
        public_id: sp.publicId,
        chest_number: sp.chestNumber || null,
        name: sp.name,
        profile_image_url: null,
        status: sp.status as ParticipantStatus,
        phone: null,
        email: null,
        date_of_birth: null,
        notes: null,
        registeredEventIds: sp.eventIds || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }
}

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
 */
export async function getParticipantsByFestival(
  festivalId: string,
): Promise<ParticipantRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    initInMemoryStore();
    return Array.from(inMemoryParticipants.values()).filter(
      (p) => p.festival_id === festivalId,
    );
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
 */
export async function getParticipantsByFestivalAdmin(
  festivalId: string,
): Promise<AdminParticipantRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    initInMemoryStore();
    return Array.from(inMemoryParticipants.values()).filter(
      (p) => p.festival_id === festivalId,
    );
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
 */
export async function getParticipantById(
  participantId: string,
): Promise<ParticipantRow | null> {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("participants")
        .select(PARTICIPANT_PUBLIC_COLUMNS)
        .eq("id", participantId)
        .maybeSingle();

      if (!error && data) {
        return data as ParticipantRow;
      }
    } catch {
      // fallback
    }
  }

  initInMemoryStore();
  return inMemoryParticipants.get(participantId) ?? null;
}

/**
 * Retrieves a single administrative participant record by primary key ID,
 * including private fields (phone, email, date_of_birth, notes).
 */
export async function getParticipantByIdAdmin(
  participantId: string,
): Promise<AdminParticipantRow | null> {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("participants")
        .select(PARTICIPANT_ADMIN_COLUMNS)
        .eq("id", participantId)
        .maybeSingle();

      if (!error && data) {
        return data as AdminParticipantRow;
      }
    } catch {
      // fallback
    }
  }

  initInMemoryStore();
  return inMemoryParticipants.get(participantId) ?? null;
}

/**
 * Retrieves a single public participant record by public_id.
 */
export async function getParticipantByPublicId(
  publicId: string,
): Promise<ParticipantRow | null> {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("participants")
        .select(PARTICIPANT_PUBLIC_COLUMNS)
        .eq("public_id", publicId)
        .maybeSingle();

      if (!error && data) {
        return data as ParticipantRow;
      }
    } catch {
      // fallback
    }
  }

  initInMemoryStore();
  for (const p of inMemoryParticipants.values()) {
    if (p.public_id === publicId) return p;
  }
  return null;
}

/**
 * Retrieves public participant records by team ID.
 */
export async function getParticipantsByTeam(
  teamId: string,
): Promise<ParticipantRow[]> {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("participants")
        .select(PARTICIPANT_PUBLIC_COLUMNS)
        .eq("team_id", teamId)
        .order("name", { ascending: true });

      if (!error && data) {
        return data as ParticipantRow[];
      }
    } catch {
      // fallback
    }
  }

  initInMemoryStore();
  return Array.from(inMemoryParticipants.values()).filter(
    (p) => p.team_id === teamId,
  );
}

/**
 * Retrieves public participant records by academic division ID.
 */
export async function getParticipantsByDivision(
  divisionId: string,
): Promise<ParticipantRow[]> {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("participants")
        .select(PARTICIPANT_PUBLIC_COLUMNS)
        .eq("division_id", divisionId)
        .order("name", { ascending: true });

      if (!error && data) {
        return data as ParticipantRow[];
      }
    } catch {
      // fallback
    }
  }

  initInMemoryStore();
  return Array.from(inMemoryParticipants.values()).filter(
    (p) => p.division_id === divisionId,
  );
}

/**
 * Retrieves public participant records by status.
 */
export async function getParticipantsByStatus(
  status: ParticipantStatus,
): Promise<ParticipantRow[]> {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("participants")
        .select(PARTICIPANT_PUBLIC_COLUMNS)
        .eq("status", status)
        .order("name", { ascending: true });

      if (!error && data) {
        return data as ParticipantRow[];
      }
    } catch {
      // fallback
    }
  }

  initInMemoryStore();
  return Array.from(inMemoryParticipants.values()).filter(
    (p) => p.status === status,
  );
}

/**
 * Retrieves public participant records registered for a specific event.
 * Supports both (eventId) and (festivalId, eventId) call signatures.
 */
export async function getParticipantsByEvent(
  festivalIdOrEventId: string,
  maybeEventId?: string,
): Promise<ParticipantRow[]> {
  const eventId = maybeEventId ?? festivalIdOrEventId;
  const festivalId = maybeEventId ? festivalIdOrEventId : undefined;

  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();
      let query = supabase
        .from("registrations")
        .select("participant_id")
        .eq("event_id", eventId)
        .eq("status", "approved");

      if (festivalId) {
        query = query.eq("festival_id", festivalId);
      }

      const { data: regData, error: regError } = await query;

      if (!regError && regData && regData.length > 0) {
        const participantIds = regData.map((r: any) => r.participant_id);
        const { data, error } = await supabase
          .from("participants")
          .select(PARTICIPANT_PUBLIC_COLUMNS)
          .in("id", participantIds)
          .order("name", { ascending: true });

        if (!error && data) {
          return data as ParticipantRow[];
        }
      }
    } catch {
      // fallback
    }
  }

  initInMemoryStore();
  return Array.from(inMemoryParticipants.values()).filter(
    (p) => p.registeredEventIds && p.registeredEventIds.includes(eventId),
  );
}

/**
 * Retrieves a single public participant record by chest bib number within a festival.
 * Supports both (chestNumber) and (festivalId, chestNumber) call signatures.
 */
export async function getParticipantByChestNumber(
  festivalIdOrChestNumber: string,
  maybeChestNumber?: string,
): Promise<ParticipantRow | null> {
  const chestNumber = (maybeChestNumber ?? festivalIdOrChestNumber).trim();
  const festivalId = maybeChestNumber ? festivalIdOrChestNumber : undefined;

  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
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

      if (!error && data) {
        return data as ParticipantRow;
      }
    } catch {
      // fallback
    }
  }

  initInMemoryStore();
  for (const p of inMemoryParticipants.values()) {
    if (festivalId && p.festival_id !== festivalId) continue;
    if (p.chest_number === chestNumber) {
      return p;
    }
  }
  return null;
}

/**
 * Generates the next sequential public_id for a festival.
 */
export async function generateNextPublicId(
  supabase: any,
  festivalId: string,
): Promise<string> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("participants")
        .select("public_id")
        .eq("festival_id", festivalId)
        .order("public_id", { ascending: false });

      if (!error && data && data.length > 0) {
        let maxNum = 0;
        for (const row of data) {
          if (!row.public_id) continue;
          const match = row.public_id.match(/^PGS-(\d+)$/i);
          if (match) {
            const parsed = parseInt(match[1], 10);
            if (!isNaN(parsed) && parsed > maxNum) {
              maxNum = parsed;
            }
          }
        }
        return `PGS-${String(maxNum + 1).padStart(4, "0")}`;
      }
    } catch {
      // fallback
    }
  }

  initInMemoryStore();
  let maxNum = 0;
  for (const p of inMemoryParticipants.values()) {
    const match = p.public_id?.match(/^PGS-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  return `PGS-${String(maxNum + 1).padStart(4, "0")}`;
}

/**
 * Creates a new participant record with strict domain validation and public ID generation.
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

  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    try {
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
        return {
          success: false,
          error: `Failed to create participant: ${error.message} (${error.code})`,
        };
      }

      return { success: true, data: data as ParticipantRow };
    } catch {
      // fallback
    }
  }

  // In-memory fallback
  initInMemoryStore();

  if (input.chestNumber && input.chestNumber.trim() !== "") {
    const trimmedChest = input.chestNumber.trim();
    for (const p of inMemoryParticipants.values()) {
      if (p.festival_id === input.festivalId && p.chest_number === trimmedChest) {
        return {
          success: false,
          error: `Chest number "${trimmedChest}" is already assigned to participant "${p.name}".`,
        };
      }
    }
  }

  let publicId = input.publicId?.trim();
  if (!publicId) {
    publicId = await generateNextPublicId(null, input.festivalId);
  }

  const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newRow: AdminParticipantRow = {
    id,
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
    registeredEventIds: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryParticipants.set(id, newRow);
  return { success: true, data: newRow };
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

  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();

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
        return {
          success: false,
          error: `Failed to update participant: ${error.message} (${error.code})`,
        };
      }

      return { success: true, data: data as ParticipantRow };
    } catch {
      // fallback
    }
  }

  // In-memory fallback
  initInMemoryStore();
  const existing = inMemoryParticipants.get(input.participantId);
  if (!existing) {
    return { success: false, error: `Participant not found (${input.participantId}).` };
  }

  if (input.chestNumber !== undefined && input.chestNumber !== null && input.chestNumber.trim() !== "") {
    const trimmedChest = input.chestNumber.trim();
    for (const [id, p] of inMemoryParticipants.entries()) {
      if (id !== input.participantId && p.festival_id === existing.festival_id && p.chest_number === trimmedChest) {
        return {
          success: false,
          error: `Chest number "${trimmedChest}" is already assigned to participant "${p.name}".`,
        };
      }
    }
  }

  const updatedRow: AdminParticipantRow = {
    ...existing,
    name: input.name !== undefined ? input.name.trim() : existing.name,
    team_id: input.teamId !== undefined ? (input.teamId || null) : existing.team_id,
    division_id: input.divisionId !== undefined ? (input.divisionId || null) : existing.division_id,
    chest_number: input.chestNumber !== undefined ? (input.chestNumber ? input.chestNumber.trim() : null) : existing.chest_number,
    status: input.status !== undefined ? input.status : existing.status,
    phone: input.phone !== undefined ? (input.phone ? input.phone.trim() : null) : existing.phone,
    email: input.email !== undefined ? (input.email ? input.email.trim() : null) : existing.email,
    date_of_birth: input.dateOfBirth !== undefined ? (input.dateOfBirth || null) : existing.date_of_birth,
    notes: input.notes !== undefined ? (input.notes ? input.notes.trim() : null) : existing.notes,
    profile_image_url: input.profileImageUrl !== undefined ? (input.profileImageUrl ? input.profileImageUrl.trim() : null) : existing.profile_image_url,
    updated_at: new Date().toISOString(),
  };

  inMemoryParticipants.set(input.participantId, updatedRow);
  return { success: true, data: updatedRow };
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
 * Allocates or re-assigns a chest bib number to a participant.
 */
export async function updateParticipantChestNumberRecord(
  participantId: string,
  chestNumber: string,
): Promise<{ success: boolean; error?: string }> {
  return updateParticipantRecord({ participantId, chestNumber });
}

// ============================================================================
// PARTICIPANT DEPENDENCY ANALYSIS & SAFE DELETE ENGINE
// ============================================================================

export type ParticipantDependencies = {
  registrationCount: number;
  resultCount: number;
  substitutionCount: number;
  originalSubstitutionCount?: number;
  replacementSubstitutionCount?: number;
  totalCount: number;
};

/**
 * Inspects database relationships to count references preventing safe deletion.
 */
export async function getParticipantDependencies(
  participantId: string,
): Promise<ParticipantDependencies> {
  if (!participantId || participantId.trim() === "") {
    return {
      registrationCount: 0,
      resultCount: 0,
      substitutionCount: 0,
      originalSubstitutionCount: 0,
      replacementSubstitutionCount: 0,
      totalCount: 0,
    };
  }

  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  let regCount = 0;
  let resCount = 0;
  let origCount = 0;
  let replCount = 0;

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();

      const [regRes, resultRes, subOrigRes, subReplRes] = await Promise.all([
        supabase
          .from("registrations")
          .select("id", { count: "exact", head: true })
          .eq("participant_id", participantId),
        supabase
          .from("results")
          .select("id", { count: "exact", head: true })
          .eq("participant_id", participantId),
        supabase
          .from("registration_substitutions")
          .select("id", { count: "exact", head: true })
          .eq("original_participant_id", participantId),
        supabase
          .from("registration_substitutions")
          .select("id", { count: "exact", head: true })
          .eq("replacement_participant_id", participantId),
      ]);

      regCount = regRes.count ?? 0;
      resCount = resultRes.count ?? 0;
      origCount = subOrigRes.count ?? 0;
      replCount = subReplRes.count ?? 0;

      const substitutionCount = origCount + replCount;
      const totalCount = regCount + resCount + substitutionCount;

      return {
        registrationCount: regCount,
        resultCount: resCount,
        substitutionCount,
        originalSubstitutionCount: origCount,
        replacementSubstitutionCount: replCount,
        totalCount,
      };
    } catch (err) {
      console.warn("[participantRepository.getParticipantDependencies] Supabase query error, falling back:", err);
    }
  }

  // Fallback in-memory check for testing / local development
  try {
    const { registrations: staticRegistrations } = await import("@/data/registrations").catch(() => ({ registrations: [] }));
    regCount = (staticRegistrations || []).filter(
      (r: any) => r.participantId === participantId || r.participant_id === participantId,
    ).length;

    const { results: staticResults } = await import("@/data/results").catch(() => ({ results: [] }));
    resCount = (staticResults || []).filter(
      (r: any) => r.participantId === participantId || r.participant_id === participantId,
    ).length;
  } catch {
    // fallback
  }

  const subCount = origCount + replCount;
  return {
    registrationCount: regCount,
    resultCount: resCount,
    substitutionCount: subCount,
    originalSubstitutionCount: origCount,
    replacementSubstitutionCount: replCount,
    totalCount: regCount + resCount + subCount,
  };
}

/**
 * Safely deletes a participant record ONLY if zero dependencies exist.
 * If any registrations, results, or substitutions exist, hard deletion is blocked.
 */
export async function deleteParticipantRecord(
  participantId: string,
): Promise<{
  success: boolean;
  error?: string;
  dependencies?: ParticipantDependencies;
}> {
  if (!participantId || participantId.trim() === "") {
    return { success: false, error: "Participant ID is required." };
  }

  // 1. Re-check dependencies in real-time to guard against concurrent changes
  const dependencies = await getParticipantDependencies(participantId);
  if (dependencies.totalCount > 0) {
    const reasons: string[] = [];
    if (dependencies.registrationCount > 0) {
      reasons.push(`${dependencies.registrationCount} event registration(s)`);
    }
    if (dependencies.resultCount > 0) {
      reasons.push(`${dependencies.resultCount} competition result(s)`);
    }
    if (dependencies.substitutionCount > 0) {
      reasons.push(`${dependencies.substitutionCount} substitution record(s)`);
    }

    return {
      success: false,
      error: `Cannot delete participant record because active festival history exists: ${reasons.join(", ")}. Deactivate the athlete instead to preserve historical integrity.`,
      dependencies,
    };
  }

  // 2. Perform safe hard delete when 0 dependencies exist
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    try {
      const supabase = await createClient();

      // Clean up any associated qr_identities for this participant first
      await supabase
        .from("qr_identities")
        .delete()
        .eq("entity_type", "participant")
        .eq("entity_id", participantId);

      const { error } = await supabase
        .from("participants")
        .delete()
        .eq("id", participantId);

      if (error) {
        return { success: false, error: `Failed to delete participant: ${error.message}` };
      }

      return { success: true, dependencies };
    } catch {
      // fallback
    }
  }

  initInMemoryStore();
  inMemoryParticipants.delete(participantId);
  return { success: true, dependencies };
}

// ============================================================================
// INGESTION-READY DOMAIN VALIDATION
// ============================================================================

export type RawParticipantInput = {
  festival_id?: string | null;
  name?: string | null;
  chest_number?: string | null;
  chestNumber?: string | null;
  team_code?: string | null;
  teamCode?: string | null;
  division_code?: string | null;
  divisionCode?: string | null;
  status?: ParticipantStatus | string | null;
  phone?: string | null;
  email?: string | null;
  date_of_birth?: string | null;
  dateOfBirth?: string | null;
  notes?: string | null;
};

export type ValidatedParticipantPayload = {
  name: string;
  chestNumber: string;
  chest_number?: string;
  teamCode: "GAR" | "TOF" | "TIB" | "TRJ";
  team_code?: "GAR" | "TOF" | "TIB" | "TRJ";
  divisionCode: "bidaya" | "thaniya" | "thamheediyya" | "aliya" | "majestir";
  division_code?: "bidaya" | "thaniya" | "thamheediyya" | "aliya" | "majestir";
  status: ParticipantStatus;
  phone?: string | null;
  email?: string | null;
  dateOfBirth?: string | null;
  date_of_birth?: string | null;
  notes?: string | null;
};

export const OFFICIAL_TEAM_CODES = ["GAR", "TOF", "TIB", "TRJ"] as const;
export const OFFICIAL_DIVISION_CODES = [
  "bidaya",
  "thaniya",
  "thamheediyya",
  "aliya",
  "majestir",
] as const;

/**
 * Domain-level validation helper preparing participant input for festival ingestion.
 * Validates names, chest numbers, official team codes, official division codes, and status.
 */
export function validateAndPrepareParticipant(
  raw: RawParticipantInput,
):
  | {
      valid: true;
      data: ValidatedParticipantPayload;
      payload: ValidatedParticipantPayload;
      error?: never;
      errors?: never;
    }
  | {
      valid: false;
      data?: never;
      payload?: never;
      error: string;
      errors: string[];
    } {
  const errors: string[] = [];

  // 1. Full Name
  const name = (raw.name || "").trim();
  if (!name) {
    errors.push("Full Name is required.");
  }

  // 2. Chest Number
  const chestNumber = (raw.chest_number || raw.chestNumber || "").trim();
  if (!chestNumber) {
    errors.push("Chest Number is required.");
  }

  // 3. Team Code
  const rawTeamCode = (raw.team_code || raw.teamCode || "").trim().toUpperCase();
  if (!rawTeamCode) {
    errors.push("Team Code is required.");
  } else if (!OFFICIAL_TEAM_CODES.includes(rawTeamCode as any)) {
    errors.push(`Invalid team code "${rawTeamCode}". Accepted team codes: ${OFFICIAL_TEAM_CODES.join(", ")}`);
  }

  // 4. Division Code
  const rawDivCode = (raw.division_code || raw.divisionCode || "").trim().toLowerCase();
  if (!rawDivCode) {
    errors.push("Division Code is required.");
  } else if (!OFFICIAL_DIVISION_CODES.includes(rawDivCode as any)) {
    errors.push(`Invalid division code "${rawDivCode}". Accepted division codes: ${OFFICIAL_DIVISION_CODES.join(", ")}`);
  }

  // 5. Status
  const validStatuses: ParticipantStatus[] = ["registered", "confirmed", "withdrawn", "disqualified"];
  let status: ParticipantStatus = "registered";
  if (raw.status) {
    const cleanStatus = raw.status.trim().toLowerCase() as ParticipantStatus;
    if (validStatuses.includes(cleanStatus)) {
      status = cleanStatus;
    } else {
      errors.push(`Invalid status "${raw.status}". Allowed values: ${validStatuses.join(", ")}`);
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: errors.join("; "),
      errors,
    };
  }

  const phone = (raw.phone || "").trim() || undefined;
  const email = (raw.email || "").trim() || undefined;
  const dateOfBirth = (raw.date_of_birth || raw.dateOfBirth || "").trim() || undefined;
  const notes = (raw.notes || "").trim() || undefined;

  const payload: ValidatedParticipantPayload = {
    name,
    chestNumber,
    chest_number: chestNumber,
    teamCode: rawTeamCode as "GAR" | "TOF" | "TIB" | "TRJ",
    team_code: rawTeamCode as "GAR" | "TOF" | "TIB" | "TRJ",
    divisionCode: rawDivCode as "bidaya" | "thaniya" | "thamheediyya" | "aliya" | "majestir",
    division_code: rawDivCode as "bidaya" | "thaniya" | "thamheediyya" | "aliya" | "majestir",
    status,
    phone,
    email,
    dateOfBirth,
    date_of_birth: dateOfBirth,
    notes,
  };

  return {
    valid: true,
    data: payload,
    payload,
  };
}
