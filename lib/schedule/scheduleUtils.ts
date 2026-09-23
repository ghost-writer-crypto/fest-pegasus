import type {
  ScheduleItem,
  ScheduleStatus,
  Fixture,
  Venue,
  FestivalEvent,
} from "@/lib/types";


/**
 * Resolves the FestivalEvent associated with a schedule item.
 */
export function getScheduleEvent(
  item: ScheduleItem,
  events: FestivalEvent[],
): FestivalEvent | undefined {
  return events.find((e) => e.id === item.eventId);
}

/**
 * Resolves the Venue associated with a schedule item.
 */
export function getScheduleVenue(
  item: ScheduleItem,
  venues: Venue[],
): Venue | undefined {
  return venues.find((v) => v.id === item.venueId);
}

/**
 * Resolves the FestivalEvent associated with a fixture.
 */
export function getFixtureEvent(
  fixture: Fixture,
  events: FestivalEvent[],
): FestivalEvent | undefined {
  return events.find((e) => e.id === fixture.eventId);
}

/**
 * Resolves the Venue associated with a fixture.
 */
export function getFixtureVenue(
  fixture: Fixture,
  venues: Venue[],
): Venue | undefined {
  return venues.find((v) => v.id === fixture.venueId);
}

/**
 * Filters schedule items by a specific date string (e.g. "YYYY-MM-DD").
 */
export function filterScheduleByDate(
  items: ScheduleItem[],
  dateIsoString: string,
): ScheduleItem[] {
  return items.filter((item) => item.startsAt.startsWith(dateIsoString));
}

/**
 * Filters schedule items by venue ID.
 */
export function filterScheduleByVenue(
  items: ScheduleItem[],
  venueId: string,
): ScheduleItem[] {
  return items.filter((item) => item.venueId === venueId);
}

/**
 * Filters schedule items by event ID.
 */
export function filterScheduleByEvent(
  items: ScheduleItem[],
  eventId: string,
): ScheduleItem[] {
  return items.filter((item) => item.eventId === eventId);
}

/**
 * Sorts schedule items chronologically by startsAt timestamp.
 */
export function sortScheduleChronologically(
  items: ScheduleItem[],
): ScheduleItem[] {
  return [...items].sort((a, b) => {
    return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
  });
}

/**
 * Derives human-readable display label for a ScheduleStatus.
 */
export function getScheduleStatusLabel(status: ScheduleStatus): string {
  switch (status) {
    case "live":
      return "Live";
    case "delayed":
      return "Delayed";
    case "postponed":
      return "Postponed";
    case "venue_changed":
      return "Venue Changed";
    case "finished":
      return "Finished";
    case "cancelled":
      return "Cancelled";
    case "scheduled":
    default:
      return "Scheduled";
  }
}

/**
 * Derives the Pegasus status badge modifier class for a ScheduleStatus.
 */
export function getScheduleStatusBadgeClass(status: ScheduleStatus): string {
  switch (status) {
    case "live":
      return "pegasus-status--live";
    case "delayed":
    case "postponed":
    case "venue_changed":
      return "pegasus-status--pending";
    case "finished":
      return "pegasus-status--finished";
    case "cancelled":
      return "pegasus-status--disqualified";
    case "scheduled":
    default:
      return "pegasus-status--upcoming";
  }
}


