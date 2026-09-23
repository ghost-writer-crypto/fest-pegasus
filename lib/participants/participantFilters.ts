import type { Participant, ParticipantStatus, Team } from "@/lib/types";
import { teams as defaultTeams } from "@/data/teams";
import { getParticipantTeamName } from "./participantUtils";

export type ParticipantFilterCriteria = {
  searchQuery?: string;
  teamId?: string;
  divisionId?: string;
  status?: ParticipantStatus | "all";
  eventId?: string;
};

/**
 * Evaluates whether a participant matches the search query.
 * Matches against name, public ID, chest number, and resolved team name.
 */
export function matchesParticipantSearch(
  participant: Participant,
  query: string,
  teamList: Team[] = defaultTeams,
): boolean {
  if (!query || query.trim() === "") return true;

  const normalized = query.trim().toLowerCase();
  const teamName = getParticipantTeamName(participant, teamList).toLowerCase();

  return (
    participant.name.toLowerCase().includes(normalized) ||
    participant.publicId.toLowerCase().includes(normalized) ||
    participant.chestNumber.toLowerCase().includes(normalized) ||
    teamName.includes(normalized)
  );
}

/**
 * Pure filter function applying search, team, division, status, and event criteria.
 */
export function filterParticipants(
  participants: Participant[],
  criteria: ParticipantFilterCriteria,
  teamList: Team[] = defaultTeams,
): Participant[] {
  return participants.filter((participant) => {
    // 1. Search Query
    if (criteria.searchQuery && criteria.searchQuery.trim() !== "") {
      if (!matchesParticipantSearch(participant, criteria.searchQuery, teamList)) {
        return false;
      }
    }

    // 2. Team Filter
    if (criteria.teamId && criteria.teamId !== "all") {
      if (participant.teamId !== criteria.teamId) {
        return false;
      }
    }

    // 3. Division Filter
    if (criteria.divisionId && criteria.divisionId !== "all") {
      if (participant.divisionId !== criteria.divisionId) {
        return false;
      }
    }

    // 4. Status Filter
    if (criteria.status && criteria.status !== "all") {
      if (participant.status !== criteria.status) {
        return false;
      }
    }

    // 5. Event Filter
    if (criteria.eventId && criteria.eventId !== "all") {
      if (!participant.eventIds || !participant.eventIds.includes(criteria.eventId)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Checks if any search or filter criterion is currently active.
 */
export function isFilterActive(criteria: ParticipantFilterCriteria): boolean {
  return Boolean(
    (criteria.searchQuery && criteria.searchQuery.trim() !== "") ||
      (criteria.teamId && criteria.teamId !== "all") ||
      (criteria.divisionId && criteria.divisionId !== "all") ||
      (criteria.status && criteria.status !== "all") ||
      (criteria.eventId && criteria.eventId !== "all"),
  );
}
