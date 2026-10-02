import { createClient } from "../supabase/server.ts";
import type { ScheduleStatus } from "../types/index.ts";

/**
 * Shape of a row in public.schedules as defined by migration 20260920000100 & 20260921000700.
 */
export type ScheduleRow = {
  id: string;
  festival_id: string;
  event_id: string | null;
  competition_id: string | null;
  fixture_id: string | null;
  venue_id: string | null;
  starts_at: string;
  ends_at: string | null;
  status: ScheduleStatus;
  notes: string | null;
  title?: string | null;
  category?: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Shape of a row in public.schedule_change_entries for operational audit history.
 */
export type ScheduleChangeRow = {
  id: string;
  schedule_id: string;
  actor_id: string | null;
  action: string;
  reason: string | null;
  before_state: Partial<ScheduleRow> | null;
  after_state: Partial<ScheduleRow> | null;
  created_at: string;
};

export type CreateScheduleInput = {
  festivalId: string;
  eventId?: string | null;
  venueId?: string | null;
  startsAt: string;
  endsAt?: string | null;
  status?: ScheduleStatus;
  notes?: string | null;
  title?: string | null;
  category?: string | null;
  competitionId?: string | null;
  fixtureId?: string | null;
  ignoreConflict?: boolean;
};

export type UpdateScheduleInput = {
  scheduleId: string;
  eventId?: string | null;
  venueId?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  status?: ScheduleStatus;
  notes?: string | null;
  title?: string | null;
  category?: string | null;
  competitionId?: string | null;
  fixtureId?: string | null;
  reason?: string | null;
  ignoreConflict?: boolean;
};

export type ScheduleConflict = {
  hasConflict: boolean;
  type?: "venue" | "event";
  conflictingScheduleId?: string;
  message?: string;
};

const SCHEDULE_COLUMNS =
  "id, festival_id, event_id, competition_id, fixture_id, venue_id, starts_at, ends_at, status, notes, title, category, created_at, updated_at" as const;

const LEGACY_SCHEDULE_COLUMNS =
  "id, festival_id, event_id, competition_id, fixture_id, venue_id, starts_at, ends_at, status, notes, created_at, updated_at" as const;

const SCHEDULE_CHANGE_COLUMNS =
  "id, schedule_id, actor_id, action, reason, before_state, after_state, created_at" as const;

/**
 * Retrieves all schedule items for a given festival, ordered chronologically.
 */
export async function getSchedulesByFestival(
  festivalId: string,
): Promise<ScheduleRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("festival_id", festivalId)
    .order("starts_at", { ascending: true });

  if (error && (error as any).code === "42703") {
    // Fallback if title/category columns are pending migration
    const fallback = await supabase
      .from("schedules")
      .select(LEGACY_SCHEDULE_COLUMNS)
      .eq("festival_id", festivalId)
      .order("starts_at", { ascending: true });

    if (!fallback.error && fallback.data) {
      return (fallback.data as any[]).map((r) => ({
        ...r,
        title: null,
        category: null,
      })) as ScheduleRow[];
    }
  }

  if (error) {
    console.error(
      `[scheduleRepository.getSchedulesByFestival] Failed to retrieve schedules for festival ${festivalId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve schedules for festival ${festivalId}: ${error.message} (${error.code})`,
    );
  }

  return (data as ScheduleRow[]) ?? [];
}

/**
 * Retrieves all schedule items for a given festival on a specific calendar date.
 */
export async function getSchedulesByDate(
  festivalId: string,
  date: string,
): Promise<ScheduleRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const datePrefix = date.includes("T") ? date.split("T")[0] : date;
  const dayStart = new Date(`${datePrefix}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("festival_id", festivalId)
    .gte("starts_at", dayStart.toISOString())
    .lt("starts_at", dayEnd.toISOString())
    .order("starts_at", { ascending: true });

  if (error && (error as any).code === "42703") {
    const fallback = await supabase
      .from("schedules")
      .select(LEGACY_SCHEDULE_COLUMNS)
      .eq("festival_id", festivalId)
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .order("starts_at", { ascending: true });

    if (!fallback.error && fallback.data) {
      return (fallback.data as any[]).map((r) => ({
        ...r,
        title: null,
        category: null,
      })) as ScheduleRow[];
    }
  }

  if (error) {
    console.error(
      `[scheduleRepository.getSchedulesByDate] Failed to retrieve schedules for festival ${festivalId} on date ${date}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve schedules for festival ${festivalId} on date ${date}: ${error.message} (${error.code})`,
    );
  }

  return (data as ScheduleRow[]) ?? [];
}

/**
 * Retrieves a single schedule item by its primary key ID.
 */
export async function getScheduleById(
  scheduleId: string,
): Promise<ScheduleRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("id", scheduleId)
    .maybeSingle();

  if (error && (error as any).code === "42703") {
    const fallback = await supabase
      .from("schedules")
      .select(LEGACY_SCHEDULE_COLUMNS)
      .eq("id", scheduleId)
      .maybeSingle();

    if (!fallback.error && fallback.data) {
      return {
        ...(fallback.data as any),
        title: null,
        category: null,
      } as ScheduleRow;
    }
  }

  if (error) {
    console.error(
      `[scheduleRepository.getScheduleById] Failed to retrieve schedule item ${scheduleId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve schedule item ${scheduleId}: ${error.message} (${error.code})`,
    );
  }

  return (data as ScheduleRow) ?? null;
}

/**
 * Retrieves the change history entries for a specific schedule item.
 */
export async function getScheduleChangesBySchedule(
  scheduleId: string,
): Promise<ScheduleChangeRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("schedule_change_entries")
    .select(SCHEDULE_CHANGE_COLUMNS)
    .eq("schedule_id", scheduleId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      `[scheduleRepository.getScheduleChangesBySchedule] Error querying changes for ${scheduleId}:`,
      error,
    );
    return [];
  }

  return (data as ScheduleChangeRow[]) ?? [];
}

/**
 * Retrieves recent schedule change history for a festival.
 */
export async function getRecentScheduleChangesByFestival(
  festivalId: string,
  limit = 20,
): Promise<ScheduleChangeRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("schedule_change_entries")
    .select(`
      id,
      schedule_id,
      actor_id,
      action,
      reason,
      before_state,
      after_state,
      created_at,
      schedules!inner (
        festival_id
      )
    `)
    .eq("schedules.festival_id", festivalId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(
      `[scheduleRepository.getRecentScheduleChangesByFestival] Error querying changes:`,
      error,
    );
    return [];
  }

  return (data as unknown as ScheduleChangeRow[]) ?? [];
}

/**
 * Evaluates whether proposed time, venue, or event overlaps with existing active schedule slots.
 * Ignore cancelled slots.
 */
export async function checkScheduleConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    festivalId: string;
    startsAt: string;
    endsAt?: string | null;
    venueId?: string | null;
    eventId?: string | null;
    excludeScheduleId?: string;
  },
): Promise<ScheduleConflict> {
  const startA = new Date(params.startsAt).getTime();
  if (isNaN(startA)) {
    return { hasConflict: false };
  }

  // If no endsAt, default window is 1 hour
  const endA = params.endsAt
    ? new Date(params.endsAt).getTime()
    : startA + 60 * 60 * 1000;

  if (endA <= startA) {
    return {
      hasConflict: true,
      message: "End time must be after start time.",
    };
  }

  // Fetch all active schedules for the festival
  let query = supabase
    .from("schedules")
    .select("id, event_id, venue_id, starts_at, ends_at, status, title, category")
    .eq("festival_id", params.festivalId)
    .neq("status", "cancelled");

  if (params.excludeScheduleId) {
    query = query.neq("id", params.excludeScheduleId);
  }

  const { data: existingSlots, error } = await query;

  if (error || !existingSlots) {
    return { hasConflict: false };
  }

  for (const slot of existingSlots) {
    const startB = new Date(slot.starts_at).getTime();
    const endB = slot.ends_at
      ? new Date(slot.ends_at).getTime()
      : startB + 60 * 60 * 1000;

    // Check exact non-inclusive interval overlap: startA < endB && endA > startB
    const isOverlapping = startA < endB && endA > startB;

    if (isOverlapping) {
      // 1. Venue conflict
      if (params.venueId && slot.venue_id === params.venueId) {
        const timeStr = `${new Date(slot.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(endB).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        const slotName = (slot as any).title || "another active program slot";
        return {
          hasConflict: true,
          type: "venue",
          conflictingScheduleId: slot.id,
          message: `Venue Conflict: The selected venue is already occupied by '${slotName}' (${timeStr}).`,
        };
      }

      // 2. Event conflict
      if (params.eventId && slot.event_id === params.eventId) {
        const timeStr = `${new Date(slot.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(endB).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        return {
          hasConflict: true,
          type: "event",
          conflictingScheduleId: slot.id,
          message: `Event Conflict: This event is already scheduled in an overlapping time slot (${timeStr}).`,
        };
      }
    }
  }

  return { hasConflict: false };
}

/**
 * Creates a new schedule slot with conflict detection and audit history.
 */
export async function createScheduleRecord(
  input: CreateScheduleInput,
  actorUserId?: string,
  client?: any,
): Promise<{ success: boolean; data?: ScheduleRow; error?: string; hasConflictWarning?: boolean }> {
  if (!input.festivalId || input.festivalId.trim() === "") {
    return { success: false, error: "Festival ID is required." };
  }
  if (!input.startsAt || isNaN(new Date(input.startsAt).getTime())) {
    return { success: false, error: "A valid start time is required." };
  }

  const supabase = client ?? (await createClient());

  // 1. Check for conflicts
  if (!input.ignoreConflict) {
    const conflict = await checkScheduleConflict(supabase, {
      festivalId: input.festivalId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      venueId: input.venueId,
      eventId: input.eventId,
    });

    if (conflict.hasConflict) {
      return {
        success: false,
        error: conflict.message || "Schedule conflict detected.",
        hasConflictWarning: true,
      };
    }
  }

  // 2. Insert schedule row
  const insertPayload = {
    festival_id: input.festivalId,
    event_id: input.eventId || null,
    venue_id: input.venueId || null,
    competition_id: input.competitionId || null,
    fixture_id: input.fixtureId || null,
    starts_at: input.startsAt,
    ends_at: input.endsAt || null,
    status: input.status || "scheduled",
    notes: input.notes ? input.notes.trim() : null,
    title: input.title ? input.title.trim() : null,
    category: input.category ? input.category.trim() : null,
  };

  let { data: newSchedule, error: insertError } = await supabase
    .from("schedules")
    .insert(insertPayload)
    .select(SCHEDULE_COLUMNS)
    .single();

  if (insertError && (insertError as any).code === "42703") {
    // Graceful fallback if title/category columns are pending migration
    const { title: _title, category: _category, ...legacyPayload } = insertPayload;
    const legacyRes = await supabase
      .from("schedules")
      .insert(legacyPayload)
      .select(LEGACY_SCHEDULE_COLUMNS)
      .single();
    if (!legacyRes.error && legacyRes.data) {
      newSchedule = {
        ...legacyRes.data,
        title: input.title || null,
        category: input.category || null,
      };
      insertError = null;
    }
  }

  if (insertError || !newSchedule) {
    console.error(`[scheduleRepository.createScheduleRecord] Insert failed:`, insertError);
    return {
      success: false,
      error: `Failed to create schedule item: ${insertError?.message || "Unknown error"}`,
    };
  }

  // 3. Write change audit history
  try {
    await supabase.from("schedule_change_entries").insert({
      schedule_id: newSchedule.id,
      actor_id: actorUserId || null,
      action: "created",
      reason: "Initial timetable slot creation",
      before_state: null,
      after_state: newSchedule,
    });
  } catch (auditErr) {
    console.warn(`[scheduleRepository.createScheduleRecord] Audit write failed:`, auditErr);
  }

  return { success: true, data: newSchedule as ScheduleRow };
}

/**
 * Updates an existing schedule slot, validates conflicts, and logs change history.
 */
export async function updateScheduleRecord(
  input: UpdateScheduleInput,
  actorUserId?: string,
  client?: any,
): Promise<{ success: boolean; data?: ScheduleRow; error?: string; hasConflictWarning?: boolean }> {
  if (!input.scheduleId || input.scheduleId.trim() === "") {
    return { success: false, error: "Schedule ID is required." };
  }

  const supabase = client ?? (await createClient());

  // 1. Fetch current schedule state
  const { data: current, error: fetchError } = await supabase
    .from("schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("id", input.scheduleId)
    .maybeSingle();

  if (fetchError || !current) {
    return { success: false, error: `Schedule item ${input.scheduleId} not found.` };
  }

  const effectiveStartsAt = input.startsAt || current.starts_at;
  const effectiveEndsAt = input.endsAt !== undefined ? input.endsAt : current.ends_at;
  const effectiveVenueId = input.venueId !== undefined ? input.venueId : current.venue_id;
  const effectiveEventId = input.eventId !== undefined ? input.eventId : current.event_id;

  // 2. Conflict check
  if (!input.ignoreConflict) {
    const conflict = await checkScheduleConflict(supabase, {
      festivalId: current.festival_id,
      startsAt: effectiveStartsAt,
      endsAt: effectiveEndsAt,
      venueId: effectiveVenueId,
      eventId: effectiveEventId,
      excludeScheduleId: input.scheduleId,
    });

    if (conflict.hasConflict) {
      return {
        success: false,
        error: conflict.message || "Schedule conflict detected.",
        hasConflictWarning: true,
      };
    }
  }

  // 3. Construct update payload
  const updatePayload: Record<string, unknown> = {};
  if (input.eventId !== undefined) updatePayload.event_id = input.eventId || null;
  if (input.venueId !== undefined) updatePayload.venue_id = input.venueId || null;
  if (input.competitionId !== undefined) updatePayload.competition_id = input.competitionId || null;
  if (input.fixtureId !== undefined) updatePayload.fixture_id = input.fixtureId || null;
  if (input.startsAt !== undefined) updatePayload.starts_at = input.startsAt;
  if (input.endsAt !== undefined) updatePayload.ends_at = input.endsAt || null;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.notes !== undefined) updatePayload.notes = input.notes ? input.notes.trim() : null;
  if (input.title !== undefined) updatePayload.title = input.title ? input.title.trim() : null;
  if (input.category !== undefined) updatePayload.category = input.category ? input.category.trim() : null;

  const { data: updatedSchedule, error: updateError } = await supabase
    .from("schedules")
    .update(updatePayload)
    .eq("id", input.scheduleId)
    .select(SCHEDULE_COLUMNS)
    .single();

  if (updateError || !updatedSchedule) {
    console.error(`[scheduleRepository.updateScheduleRecord] Update failed:`, updateError);
    return {
      success: false,
      error: `Failed to update schedule item: ${updateError?.message || "Unknown error"}`,
    };
  }

  // 4. Derive action label for history
  let action = "updated";
  if (input.startsAt && input.startsAt !== current.starts_at) {
    action = "rescheduled";
  } else if (input.venueId !== undefined && input.venueId !== current.venue_id) {
    action = "venue_changed";
  } else if (input.status && input.status !== current.status) {
    action = `status_${input.status}`;
  }

  // 5. Write change history
  try {
    await supabase.from("schedule_change_entries").insert({
      schedule_id: input.scheduleId,
      actor_id: actorUserId || null,
      action,
      reason: input.reason || "Operational update by administrator",
      before_state: current,
      after_state: updatedSchedule,
    });
  } catch (auditErr) {
    console.warn(`[scheduleRepository.updateScheduleRecord] Audit write failed:`, auditErr);
  }

  return { success: true, data: updatedSchedule as ScheduleRow };
}

/**
 * Updates schedule status and logs reason into history.
 */
export async function updateScheduleStatusRecord(
  scheduleId: string,
  status: ScheduleStatus,
  actorUserId?: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  return updateScheduleRecord(
    { scheduleId, status, reason: reason || `Status changed to ${status}` },
    actorUserId,
  );
}

/**
 * Deletes a schedule slot and logs change audit history.
 */
export async function deleteScheduleRecord(
  scheduleId: string,
  actorUserId?: string,
  reason?: string,
  client?: any,
): Promise<{ success: boolean; error?: string }> {
  if (!scheduleId || scheduleId.trim() === "") {
    return { success: false, error: "Schedule ID is required." };
  }

  const supabase = client ?? (await createClient());

  // 1. Fetch current schedule state
  const { data: current, error: fetchError } = await supabase
    .from("schedules")
    .select(SCHEDULE_COLUMNS)
    .eq("id", scheduleId)
    .maybeSingle();

  if (fetchError || !current) {
    return { success: false, error: `Schedule item ${scheduleId} not found.` };
  }

  // 2. Write deletion audit history before cascade deletion
  try {
    await supabase.from("schedule_change_entries").insert({
      schedule_id: scheduleId,
      actor_id: actorUserId || null,
      action: "deleted",
      reason: reason || "Slot removed by administrator",
      before_state: current,
      after_state: null,
    });
  } catch (auditErr) {
    console.warn(`[scheduleRepository.deleteScheduleRecord] Audit write failed:`, auditErr);
  }

  // 3. Delete row
  const { error: deleteError } = await supabase
    .from("schedules")
    .delete()
    .eq("id", scheduleId);

  if (deleteError) {
    console.error(`[scheduleRepository.deleteScheduleRecord] Delete failed:`, deleteError);
    return {
      success: false,
      error: `Failed to delete schedule item: ${deleteError.message}`,
    };
  }

  return { success: true };
}
