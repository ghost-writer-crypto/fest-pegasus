import { createClient } from "@/lib/supabase/server";
import type { PointClass } from "@/lib/types";

/**
 * Shape of a row in public.events as defined by migration 20260920000100.
 */
export type EventRow = {
  id: string;
  festival_id: string;
  sport_id: string;
  codex_event_id: string | null;
  code: string;
  name: string;
  point_class: PointClass | null;
  competition_type: string | null;
  scoring_engine: string | null;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/**
 * Explicit columns queried from public.events.
 */
const EVENT_COLUMNS =
  "id, festival_id, sport_id, codex_event_id, code, name, point_class, competition_type, scoring_engine, status, metadata, created_at, updated_at" as const;

/**
 * Retrieves all events configured for a given festival.
 *
 * @param festivalId - The UUID of the festival
 * @returns An array of EventRow records
 * @throws Error if the Supabase query fails
 */
export async function getEventsByFestival(
  festivalId: string,
): Promise<EventRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("festival_id", festivalId)
    .order("name", { ascending: true });

  if (error) {
    console.error(
      `[eventRepository.getEventsByFestival] Failed to retrieve events for festival ${festivalId}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve events for festival ${festivalId}: ${error.message} (${error.code})`,
    );
  }

  return (data as EventRow[]) ?? [];
}

/**
 * Retrieves a single event by its unique ID or code (e.g. 'race-100m-majestir').
 *
 * @param eventIdOrCode - The UUID or code of the event
 * @param festivalId - Optional festival UUID to filter by
 * @returns The EventRow record if found, or null
 * @throws Error if the Supabase query fails
 */
export async function getEventById(
  eventIdOrCode: string,
  festivalId?: string,
): Promise<EventRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  const supabase = await createClient();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      eventIdOrCode,
    );

  let query = supabase.from("events").select(EVENT_COLUMNS);

  if (isUuid) {
    query = query.eq("id", eventIdOrCode);
  } else {
    query = query.eq("code", eventIdOrCode);
  }

  if (festivalId) {
    query = query.eq("festival_id", festivalId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error(
      `[eventRepository.getEventById] Failed to retrieve event ${eventIdOrCode}:`,
      error,
    );
    throw new Error(
      `Failed to retrieve event ${eventIdOrCode}: ${error.message} (${error.code})`,
    );
  }

  return (data as EventRow) ?? null;
}


