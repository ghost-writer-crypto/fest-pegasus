import type { Result, TeamPenalty } from "@/lib/types";

/**
 * Custom error indicating a data-integrity failure during participant-to-team resolution.
 * Surfaces unresolved participants rather than silently dropping championship points.
 */
export class ParticipantResolutionError extends Error {
  public readonly resultId: string;
  public readonly participantId: string;

  constructor(
    resultId: string,
    participantId: string,
    message?: string,
  ) {
    super(
      message ??
        `Data integrity violation: Published result "${resultId}" references participant "${participantId}" whose canonical team/house cannot be resolved.`,
    );
    this.name = "ParticipantResolutionError";
    this.resultId = resultId;
    this.participantId = participantId;
  }
}

/**
 * Flexible lookup for resolving a participantId to their canonical teamId.
 * Supports:
 * - Map<string, string | null | undefined>
 * - Record<string, string | null | undefined>
 * - Function (participantId: string) => string | null | undefined
 */
export type ParticipantTeamLookup =
  | Map<string, string | null | undefined>
  | Record<string, string | null | undefined>
  | ((participantId: string) => string | null | undefined);

/**
 * Resolves a participantId from a lookup structure.
 */
function resolveFromLookup(
  lookup: ParticipantTeamLookup,
  participantId: string,
): string | null | undefined {
  if (typeof lookup === "function") {
    return lookup(participantId);
  }
  if (lookup instanceof Map) {
    return lookup.get(participantId);
  }
  return lookup[participantId];
}

/**
 * Resolves the canonical teamId for a competition result.
 *
 * Invariants:
 * 1. If result.teamId is already explicitly provided, it is returned directly.
 * 2. If result.participantId is provided:
 *    - Resolves via participantLookup if provided.
 *    - If participantLookup is provided but does not contain the participant (or maps to null/undefined),
 *      it throws ParticipantResolutionError to protect championship integrity.
 *    - If participantLookup is NOT provided and teamId is missing, it throws ParticipantResolutionError
 *      to ensure production callers never silently drop unmapped participant results.
 * 3. If neither teamId nor participantId is present, returns null.
 */
export function getResultTeamId(
  result: Result,
  participantLookup?: ParticipantTeamLookup,
): string | null {
  if (result.teamId) {
    return result.teamId;
  }

  if (result.participantId) {
    if (!participantLookup) {
      throw new ParticipantResolutionError(
        result.id,
        result.participantId,
        `Data integrity violation: Published result "${result.id}" lacks teamId and no participantLookup was provided to resolve participant "${result.participantId}".`,
      );
    }

    const resolvedTeamId = resolveFromLookup(
      participantLookup,
      result.participantId,
    );
    if (!resolvedTeamId) {
      throw new ParticipantResolutionError(
        result.id,
        result.participantId,
        `Data integrity violation: Published result "${result.id}" references participant "${result.participantId}" which does not exist in the participant registry or has no assigned team/house.`,
      );
    }

    return resolvedTeamId;
  }

  return null;
}

export type TeamPointsBreakdown = {
  teamId: string;
  grossPoints: number;
  penaltyDeductions: number; // Negative or 0
  netPoints: number;
};

export function calculateTeamPointsBreakdown(
  results: Result[],
  teamId: string,
  penalties: TeamPenalty[] = [],
  participantLookup?: ParticipantTeamLookup,
): TeamPointsBreakdown {
  const grossPoints = results
    .filter((result) => result.status === "published")
    .filter((result) => getResultTeamId(result, participantLookup) === teamId)
    .reduce((total, result) => total + result.points, 0);

  const penaltyDeductions = penalties
    .filter((penalty) => !penalty.isReversed)
    .filter((penalty) => penalty.teamId === teamId)
    .reduce((total, penalty) => total + penalty.pointsDelta, 0);

  const netPoints = Math.max(0, grossPoints + penaltyDeductions);

  return {
    teamId,
    grossPoints,
    penaltyDeductions,
    netPoints,
  };
}

export function calculateTeamPoints(
  results: Result[],
  teamId: string,
  penalties: TeamPenalty[] = [],
  participantLookup?: ParticipantTeamLookup,
): number {
  return calculateTeamPointsBreakdown(
    results,
    teamId,
    penalties,
    participantLookup,
  ).netPoints;
}

export function calculateAllTeamPoints(
  results: Result[],
  penalties: TeamPenalty[] = [],
  participantLookup?: ParticipantTeamLookup,
) {
  const publishedResults = results.filter(
    (result) => result.status === "published",
  );

  const activePenalties = penalties.filter((p) => !p.isReversed);

  const teamIds = new Set([
    ...publishedResults
      .map((result) => getResultTeamId(result, participantLookup))
      .filter((resolvedId): resolvedId is string => Boolean(resolvedId)),
    ...activePenalties.map((p) => p.teamId),
  ]);

  return Array.from(teamIds).map((teamId) => ({
    teamId,
    points: calculateTeamPoints(
      publishedResults,
      teamId,
      activePenalties,
      participantLookup,
    ),
  }));
}

