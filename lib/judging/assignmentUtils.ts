import { events } from "@/data/events";
import { fixtures } from "@/data/fixtures";
import type {
  FestivalEvent,
  Fixture,
  Heat,
  JudgeAssignment,
} from "./types";

/**
 * Static registry of official judge assignments.
 * Empty until assignments are provisioned by the Festival Technical Committee.
 * No fake assignments are fabricated.
 */
export const judgeAssignments: JudgeAssignment[] = [];

/**
 * Retrieves all assignments for a specific judge.
 * Safely returns [] if no assignments exist for the given judgeId.
 */
export function getJudgeAssignments(
  judgeId: string,
  assignments: JudgeAssignment[] = judgeAssignments,
): JudgeAssignment[] {
  if (!judgeId || judgeId.trim() === "") {
    return [];
  }
  return assignments.filter((a) => a.judgeId === judgeId);
}

/**
 * Retrieves the resolved events assigned to a specific judge.
 * Safely returns [] if no assignments exist.
 */
export function getAssignedEvents(
  judgeId: string,
  assignments: JudgeAssignment[] = judgeAssignments,
  eventList: FestivalEvent[] = events,
): FestivalEvent[] {
  const userAssignments = getJudgeAssignments(judgeId, assignments);
  if (userAssignments.length === 0) {
    return [];
  }

  const assignedEventIds = new Set(userAssignments.map((a) => a.eventId));
  return eventList.filter((event) => assignedEventIds.has(event.id));
}

/**
 * Retrieves the resolved tournament fixtures assigned to a specific judge.
 * Safely returns [] if no assignments exist.
 */
export function getAssignedFixtures(
  judgeId: string,
  assignments: JudgeAssignment[] = judgeAssignments,
  fixtureList: Fixture[] = fixtures,
): Fixture[] {
  const userAssignments = getJudgeAssignments(judgeId, assignments);
  if (userAssignments.length === 0) {
    return [];
  }

  const assignedFixtureIds = new Set(
    userAssignments
      .map((a) => a.fixtureId)
      .filter((id): id is string => Boolean(id)),
  );

  return fixtureList.filter((f) => assignedFixtureIds.has(f.id));
}

/**
 * Retrieves the resolved heats assigned to a specific judge.
 * Safely returns [] if no assignments exist.
 */
export function getAssignedHeats(
  judgeId: string,
  assignments: JudgeAssignment[] = judgeAssignments,
  heatList: Heat[] = [],
): Heat[] {
  const userAssignments = getJudgeAssignments(judgeId, assignments);
  if (userAssignments.length === 0) {
    return [];
  }

  const assignedHeatIds = new Set(
    userAssignments
      .map((a) => a.heatId)
      .filter((id): id is string => Boolean(id)),
  );

  return heatList.filter((h) => assignedHeatIds.has(h.id));
}

/**
 * Checks whether a judge is officially assigned to an event.
 */
export function isJudgeAssignedToEvent(
  judgeId: string,
  eventId: string,
  assignments: JudgeAssignment[] = judgeAssignments,
): boolean {
  if (!judgeId || !eventId) {
    return false;
  }
  return assignments.some(
    (a) => a.judgeId === judgeId && a.eventId === eventId,
  );
}

/**
 * Checks whether a judge is officially assigned to a specific fixture.
 */
export function isJudgeAssignedToFixture(
  judgeId: string,
  fixtureId: string,
  assignments: JudgeAssignment[] = judgeAssignments,
): boolean {
  if (!judgeId || !fixtureId) {
    return false;
  }
  return assignments.some(
    (a) => a.judgeId === judgeId && a.fixtureId === fixtureId,
  );
}

/**
 * Checks whether a judge is officially assigned to a specific heat.
 */
export function isJudgeAssignedToHeat(
  judgeId: string,
  heatId: string,
  assignments: JudgeAssignment[] = judgeAssignments,
): boolean {
  if (!judgeId || !heatId) {
    return false;
  }
  return assignments.some(
    (a) => a.judgeId === judgeId && a.heatId === heatId,
  );
}

