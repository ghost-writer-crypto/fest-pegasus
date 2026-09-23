import type { Result, TeamPenalty } from "@/lib/types";
import { participants } from "@/data/participants";

export function getResultTeamId(result: Result): string | null {
  if (result.teamId) {
    return result.teamId;
  }

  if (result.participantId) {
    const participant = participants.find(
      (item) => item.id === result.participantId,
    );

    return participant?.teamId ?? null;
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
): TeamPointsBreakdown {
  const grossPoints = results
    .filter((result) => result.status === "published")
    .filter((result) => getResultTeamId(result) === teamId)
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
): number {
  return calculateTeamPointsBreakdown(results, teamId, penalties).netPoints;
}

export function calculateAllTeamPoints(
  results: Result[],
  penalties: TeamPenalty[] = [],
) {
  const publishedResults = results.filter(
    (result) => result.status === "published",
  );

  const activePenalties = penalties.filter((p) => !p.isReversed);

  const teamIds = new Set([
    ...publishedResults
      .map((result) => getResultTeamId(result))
      .filter((teamId): teamId is string => Boolean(teamId)),
    ...activePenalties.map((p) => p.teamId),
  ]);

  return Array.from(teamIds).map((teamId) => ({
    teamId,
    points: calculateTeamPoints(publishedResults, teamId, activePenalties),
  }));
}
