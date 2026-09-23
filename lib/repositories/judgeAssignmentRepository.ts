import { createClient } from "@/lib/supabase/server";
import type { JudgeAssignmentStatus } from "@/lib/types";
import type { EventRow } from "./eventRepository";

/**
 * Shape of a row in public.judge_assignments matching migration 20260920000300.
 */
export type JudgeAssignmentRow = {
  id: string;
  festival_id: string;
  judge_id: string;
  event_id: string;
  competition_id: string | null;
  fixture_id: string | null;
  role: string;
  status: JudgeAssignmentStatus;
  created_at: string;
  updated_at: string;
};

const ASSIGNMENT_COLUMNS =
  "id, festival_id, judge_id, event_id, competition_id, fixture_id, role, status, created_at, updated_at" as const;

/**
 * Retrieves all official assignments for a specific judge within a festival.
 *
 * @param festivalId - The UUID of the festival
 * @param judgeId - The UUID of the judge (from auth.users/profiles)
 * @returns Array of JudgeAssignmentRow records
 */
export async function getAssignmentsByJudge(
  festivalId: string,
  judgeId: string,
): Promise<JudgeAssignmentRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    !judgeId
  ) {
    return [];
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("judge_assignments")
      .select(ASSIGNMENT_COLUMNS)
      .eq("festival_id", festivalId)
      .eq("judge_id", judgeId);

    if (error) {
      console.error(
        `[judgeAssignmentRepository.getAssignmentsByJudge] Error for judge ${judgeId}:`,
        error,
      );
      return [];
    }

    return (data as JudgeAssignmentRow[]) ?? [];
  } catch (error) {
    console.error(
      `[judgeAssignmentRepository.getAssignmentsByJudge] Unexpected error:`,
      error,
    );
    return [];
  }
}

/**
 * Server-side security check: Verifies if a judge is officially assigned to an event.
 * If user has role 'admin', they are authorized for all events.
 *
 * @param festivalId - The UUID of the festival
 * @param judgeId - The UUID of the judge
 * @param eventId - The UUID of the event
 * @returns True if officially assigned, false otherwise
 */
export async function isJudgeAssignedToEventInDb(
  festivalId: string,
  judgeId: string,
  eventId: string,
): Promise<boolean> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    !judgeId ||
    !eventId
  ) {
    return false;
  }

  try {
    const supabase = await createClient();

    // 1. Check if user is an active admin (admins are universally authorized to officiate/supervise)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", judgeId)
      .maybeSingle();

    if (profile?.is_active && profile.role === "admin") {
      return true;
    }

    // 2. Check if user has explicit active assignment to this event ('assigned' or 'in_progress')
    const { data, error } = await supabase
      .from("judge_assignments")
      .select("id, status")
      .eq("festival_id", festivalId)
      .eq("judge_id", judgeId)
      .eq("event_id", eventId)
      .in("status", ["assigned", "in_progress"])
      .maybeSingle();

    if (error) {
      console.error(
        `[judgeAssignmentRepository.isJudgeAssignedToEventInDb] Query error:`,
        error,
      );
      return false;
    }

    return Boolean(data);
  } catch (error) {
    console.error(
      `[judgeAssignmentRepository.isJudgeAssignedToEventInDb] Unexpected error:`,
      error,
    );
    return false;
  }
}

/**
 * Resolves the EventRow objects assigned to an authenticated judge.
 * Only returns events with active assignment statuses ('assigned' or 'in_progress').
 *
 * @param festivalId - The UUID of the festival
 * @param judgeId - The UUID of the judge
 * @returns Array of assigned EventRow records
 */
export async function getAssignedEventsForJudge(
  festivalId: string,
  judgeId: string,
): Promise<EventRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    !judgeId
  ) {
    return [];
  }

  try {
    const supabase = await createClient();

    // Check if admin: if admin, returns all festival events
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", judgeId)
      .maybeSingle();

    if (profile?.is_active && profile.role === "admin") {
      const { data: allEvents } = await supabase
        .from("events")
        .select(
          "id, festival_id, sport_id, codex_event_id, code, name, point_class, competition_type, scoring_engine, status, metadata, created_at, updated_at",
        )
        .eq("festival_id", festivalId)
        .order("name", { ascending: true });

      return (allEvents as EventRow[]) ?? [];
    }

    // Otherwise, fetch specific assigned events that are in active operational state
    const assignments = await getAssignmentsByJudge(festivalId, judgeId);
    const activeAssignments = assignments.filter(
      (a) => a.status === "assigned" || a.status === "in_progress",
    );
    if (activeAssignments.length === 0) {
      return [];
    }

    const eventIds = activeAssignments.map((a) => a.event_id);
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select(
        "id, festival_id, sport_id, codex_event_id, code, name, point_class, competition_type, scoring_engine, status, metadata, created_at, updated_at",
      )
      .eq("festival_id", festivalId)
      .in("id", eventIds)
      .order("name", { ascending: true });

    if (eventsError) {
      console.error(
        `[judgeAssignmentRepository.getAssignedEventsForJudge] Error:`,
        eventsError,
      );
      return [];
    }

    return (events as EventRow[]) ?? [];
  } catch (error) {
    console.error(
      `[judgeAssignmentRepository.getAssignedEventsForJudge] Unexpected error:`,
      error,
    );
    return [];
  }
}

