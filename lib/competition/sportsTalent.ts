import type { Result, Participant, SportsTalentEntry } from "@/lib/types";

/**
 * Calculates individual points for a participant across all published results.
 * Only individual event results with participantId are counted towards individual champion points.
 */
export function calculateParticipantIndividualPoints(
  results: Result[],
  participantId: string,
): number {
  return results
    .filter((r) => r.status === "published" && r.participantId === participantId)
    .reduce((sum, r) => sum + r.points, 0);
}

/**
 * Resolves Sports Talent entries for a given division according to Pegasus Codex rules:
 * - Calculated based on individual event points.
 * - In the event of a tie, team event points may serve as tie-breaker where recorded.
 * - Selection flag marks the top contender(s).
 */
export function resolveSportsTalent(
  divisionId: string,
  participants: Participant[],
  results: Result[],
): SportsTalentEntry[] {
  const divisionParticipants = participants.filter(
    (p) => p.divisionId === divisionId && p.status !== "disqualified" && p.status !== "withdrawn",
  );

  const entries: SportsTalentEntry[] = divisionParticipants.map((p) => {
    const individualPoints = calculateParticipantIndividualPoints(results, p.id);
    return {
      participantId: p.id,
      divisionId,
      individualPoints,
      teamEventTieBreakPoints: 0, // Unconfirmed in Codex unless explicit relay/team split
      selected: false,
    };
  });

  // Sort descending by individualPoints, then teamEventTieBreakPoints
  entries.sort((a, b) => {
    if (b.individualPoints !== a.individualPoints) {
      return b.individualPoints - a.individualPoints;
    }
    return b.teamEventTieBreakPoints - a.teamEventTieBreakPoints;
  });

  // Assign ranks and mark selected
  const topScore = entries.length > 0 ? entries[0].individualPoints : 0;

  return entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
    selected: topScore > 0 && entry.individualPoints === topScore,
  }));
}

