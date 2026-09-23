import type { Fixture, FixtureStatus } from "@/lib/types";

/**
 * Filters fixtures by event ID.
 */
export function filterFixturesByEvent(
  fixtures: Fixture[],
  eventId: string,
): Fixture[] {
  return fixtures.filter((f) => f.eventId === eventId);
}

/**
 * Filters fixtures by venue ID.
 */
export function filterFixturesByVenue(
  fixtures: Fixture[],
  venueId: string,
): Fixture[] {
  return fixtures.filter((f) => f.venueId === venueId);
}

/**
 * Filters fixtures involving a specific team (as team A or team B).
 */
export function filterFixturesByTeam(
  fixtures: Fixture[],
  teamId: string,
): Fixture[] {
  return fixtures.filter(
    (f) => f.teamAId === teamId || f.teamBId === teamId,
  );
}

/**
 * Finds the subsequent fixture in a tournament progression by nextFixtureId.
 */
export function findNextFixture(
  currentFixture: Fixture,
  allFixtures: Fixture[],
): Fixture | undefined {
  if (!currentFixture.nextFixtureId) return undefined;
  return allFixtures.find((f) => f.id === currentFixture.nextFixtureId);
}

/**
 * Checks whether both participating teams have been populated for a fixture.
 */
export function isFixtureTeamsAssigned(fixture: Fixture): boolean {
  return Boolean(fixture.teamAId && fixture.teamBId);
}

/**
 * Checks whether a fixture is complete (finished status with recorded scores).
 */
export function isFixtureComplete(fixture: Fixture): boolean {
  return (
    fixture.status === "finished" &&
    fixture.teamAScore !== undefined &&
    fixture.teamBScore !== undefined
  );
}

/**
 * Derives a human-readable display label from the canonical FixtureStatus.
 */
export function getFixtureStatusLabel(status: FixtureStatus): string {
  switch (status) {
    case "live":
      return "Live";
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
 * Derives the Pegasus status badge modifier class for a FixtureStatus.
 */
export function getFixtureStatusBadgeClass(status: FixtureStatus): string {
  switch (status) {
    case "live":
      return "pegasus-status--live";
    case "finished":
      return "pegasus-status--finished";
    case "cancelled":
      return "pegasus-status--disqualified";
    case "scheduled":
    default:
      return "pegasus-status--upcoming";
  }
}

