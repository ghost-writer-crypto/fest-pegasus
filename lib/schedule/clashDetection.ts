export type ClashType = "participant" | "team" | "venue";

export type ClashConflict<T> = {
  entityId: string;
  type: ClashType;
  conflictItemA: T;
  conflictItemB: T;
  reason: string;
};

/**
 * Checks if two scheduled items with explicit timestamps have overlapping windows.
 *
 * NOTE: If either item lacks an endsAt timestamp, overlap cannot be determined
 * without guessing durations. Returns false to prevent silent assumptions.
 */
export function areTimeWindowsOverlapping(
  a: { startsAt: string; endsAt?: string },
  b: { startsAt: string; endsAt?: string },
): boolean {
  if (!a.endsAt || !b.endsAt) {
    return false;
  }

  const startA = new Date(a.startsAt).getTime();
  const endA = new Date(a.endsAt).getTime();
  const startB = new Date(b.startsAt).getTime();
  const endB = new Date(b.endsAt).getTime();

  if (isNaN(startA) || isNaN(endA) || isNaN(startB) || isNaN(endB)) {
    return false;
  }

  // Two open intervals overlap if and only if startA < endB and startB < endA
  return startA < endB && startB < endA;
}

/**
 * Pure utility to detect venue conflicts:
 * identifies items scheduled at the same venue with overlapping time windows.
 */
export function detectVenueClashes<
  T extends { id: string; venueId: string; startsAt: string; endsAt?: string },
>(items: T[]): ClashConflict<T>[] {
  const clashes: ClashConflict<T>[] = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const itemA = items[i];
      const itemB = items[j];

      if (
        itemA.venueId === itemB.venueId &&
        areTimeWindowsOverlapping(itemA, itemB)
      ) {
        clashes.push({
          entityId: itemA.venueId,
          type: "venue",
          conflictItemA: itemA,
          conflictItemB: itemB,
          reason: `Venue '${itemA.venueId}' has overlapping schedule slots.`,
        });
      }
    }
  }

  return clashes;
}

/**
 * Pure utility to detect team conflicts:
 * identifies teams scheduled across overlapping events.
 */
export function detectTeamClashes<
  T extends { id: string; startsAt: string; endsAt?: string; teamIds: string[] },
>(items: T[]): ClashConflict<T>[] {
  const clashes: ClashConflict<T>[] = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const itemA = items[i];
      const itemB = items[j];

      const commonTeams = itemA.teamIds.filter((t) =>
        itemB.teamIds.includes(t),
      );
      if (commonTeams.length > 0 && areTimeWindowsOverlapping(itemA, itemB)) {
        for (const teamId of commonTeams) {
          clashes.push({
            entityId: teamId,
            type: "team",
            conflictItemA: itemA,
            conflictItemB: itemB,
            reason: `Team '${teamId}' is scheduled in overlapping time windows.`,
          });
        }
      }
    }
  }

  return clashes;
}

/**
 * Pure utility to detect participant conflicts:
 * identifies participants scheduled across overlapping events/heats.
 */
export function detectParticipantClashes<
  T extends {
    id: string;
    startsAt: string;
    endsAt?: string;
    participantIds: string[];
  },
>(items: T[]): ClashConflict<T>[] {
  const clashes: ClashConflict<T>[] = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const itemA = items[i];
      const itemB = items[j];

      const commonParticipants = itemA.participantIds.filter((p) =>
        itemB.participantIds.includes(p),
      );
      if (
        commonParticipants.length > 0 &&
        areTimeWindowsOverlapping(itemA, itemB)
      ) {
        for (const participantId of commonParticipants) {
          clashes.push({
            entityId: participantId,
            type: "participant",
            conflictItemA: itemA,
            conflictItemB: itemB,
            reason: `Participant '${participantId}' is scheduled in overlapping time windows.`,
          });
        }
      }
    }
  }

  return clashes;
}

