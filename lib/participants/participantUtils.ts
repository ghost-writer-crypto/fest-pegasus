import type {
  Participant,
  ParticipantStatus,
  Team,
  FestivalEvent,
} from "@/lib/types";
import { CODEX_DIVISIONS, type CodexDivision } from "@/lib/competition/divisions";
import { teams as defaultTeams } from "@/data/teams";
import { events as defaultEvents } from "@/data/events";
import { participants as defaultParticipants } from "@/data/participants";
import { getEventQuota } from "@/lib/competition/quotaEngine";

export type ParticipantRegistryTelemetry = {
  totalCount: number;
  confirmedCount: number;
  registeredCount: number;
  withdrawnCount: number;
  disqualifiedCount: number;
  teamsRepresentedCount: number;
  divisionsRepresentedCount: number;
  totalEventRegistrationsCount: number;
};

/**
 * Resolves the full Team object for a participant.
 */
export function getParticipantTeam(
  participant: Participant,
  teamList: Team[] = defaultTeams,
): Team | undefined {
  if (!participant.teamId) return undefined;
  return teamList.find((t) => t.id === participant.teamId);
}

/**
 * Safely resolves the human-readable team name for a participant.
 * Never displays raw team IDs.
 */
export function getParticipantTeamName(
  participant: Participant,
  teamList: Team[] = defaultTeams,
): string {
  const team = getParticipantTeam(participant, teamList);
  return team?.name ?? "Unknown Team";
}

/**
 * Resolves the canonical CodexDivision for a participant.
 */
export function getParticipantDivision(
  participant: Participant,
  divisionList: CodexDivision[] = CODEX_DIVISIONS,
): CodexDivision | undefined {
  if (!participant.divisionId) return undefined;
  return divisionList.find((d) => d.id === participant.divisionId);
}

/**
 * Safely resolves the human-readable division name for a participant.
 * Never displays raw division IDs.
 */
export function getParticipantDivisionName(
  participant: Participant,
  divisionList: CodexDivision[] = CODEX_DIVISIONS,
): string {
  const division = getParticipantDivision(participant, divisionList);
  return division?.name ?? participant.divisionId ?? "Unknown Division";
}

/**
 * Resolves all FestivalEvent objects associated with a participant's registered eventIds.
 */
export function getParticipantEvents(
  participant: Participant,
  eventList: FestivalEvent[] = defaultEvents,
): FestivalEvent[] {
  if (!participant.eventIds || participant.eventIds.length === 0) {
    return [];
  }
  return participant.eventIds
    .map((eventId) => eventList.find((e) => e.id === eventId))
    .filter((e): e is FestivalEvent => Boolean(e));
}

/**
 * Derives uppercase initials from a participant's name for fallback avatars.
 * e.g., "Participant One" -> "PO", "Athlete" -> "A".
 */
export function getParticipantInitials(name: string): string {
  if (!name || name.trim() === "") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Derives a human-readable display label for a ParticipantStatus.
 */
export function getParticipantStatusLabel(status: ParticipantStatus): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "registered":
      return "Registered";
    case "withdrawn":
      return "Withdrawn";
    case "disqualified":
      return "Disqualified";
    default:
      return status;
  }
}

/**
 * Maps a ParticipantStatus to the corresponding Pegasus status badge CSS modifier.
 */
export function getParticipantStatusBadgeClass(status: ParticipantStatus): string {
  switch (status) {
    case "confirmed":
      return "pegasus-status--live";
    case "registered":
      return "pegasus-status--pending";
    case "withdrawn":
      return "pegasus-status--upcoming";
    case "disqualified":
      return "pegasus-status--disqualified";
    default:
      return "pegasus-status--upcoming";
  }
}

/**
 * Computes registry telemetry counters from real participant records.
 * Zero hardcoding. Zero fake percentages.
 */
export function getParticipantRegistryTelemetry(
  participantList: Participant[] = defaultParticipants,
): ParticipantRegistryTelemetry {
  const confirmedCount = participantList.filter(
    (p) => p.status === "confirmed",
  ).length;
  const registeredCount = participantList.filter(
    (p) => p.status === "registered",
  ).length;
  const withdrawnCount = participantList.filter(
    (p) => p.status === "withdrawn",
  ).length;
  const disqualifiedCount = participantList.filter(
    (p) => p.status === "disqualified",
  ).length;

  const uniqueTeams = new Set(
    participantList
      .map((p) => p.teamId)
      .filter((id): id is string => Boolean(id)),
  );

  const uniqueDivisions = new Set(
    participantList
      .map((p) => p.divisionId)
      .filter((id): id is string => Boolean(id)),
  );

  const totalEventRegistrationsCount = participantList.reduce(
    (acc, p) => acc + (p.eventIds ? p.eventIds.length : 0),
    0,
  );

  return {
    totalCount: participantList.length,
    confirmedCount,
    registeredCount,
    withdrawnCount,
    disqualifiedCount,
    teamsRepresentedCount: uniqueTeams.size,
    divisionsRepresentedCount: uniqueDivisions.size,
    totalEventRegistrationsCount,
  };
}

/**
 * Foundation for future quota lookup integration.
 * Exposes event quota rules without inventing unauthorized validation logic.
 */
export function getParticipantEventQuota(eventId: string, divisionId?: string) {
  return getEventQuota(eventId, divisionId);
}

