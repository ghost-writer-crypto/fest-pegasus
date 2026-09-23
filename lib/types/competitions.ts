/**
 * PEGASUS — Domain Types for Competition & Fixture Operations
 */

export type CompetitionStatus =
  | "draft"
  | "ready"
  | "live"
  | "completed"
  | "cancelled"
  | "scheduled"
  | "finished";

export type CompetitionFormat =
  | "final"
  | "heats"
  | "knockout"
  | "round_robin"
  | "match";

export type FixtureStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "cancelled";

export type Competition = {
  id: string;
  festivalId?: string;
  eventId: string;
  divisionId?: string | null;
  name?: string;
  format: CompetitionFormat;
  status: CompetitionStatus;
  roundName?: string | null;
  venueId?: string;
  scheduledAt?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Fixture = {
  id: string;
  competitionId?: string;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  scheduledAt?: string | null;
  venueId?: string | null;
  status: FixtureStatus;
  scoreHome?: number | null;
  scoreAway?: number | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  eventId?: string;
  teamAId?: string;
  teamBId?: string;
  teamAScore?: number;
  teamBScore?: number;
  round?: string;
  nextFixtureId?: string;
};

export type CompetitionChangeEntry = {
  id: string;
  competitionId: string;
  fixtureId?: string | null;
  actorId?: string | null;
  action: string;
  reason?: string | null;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  createdAt: string;
};

export type CreateCompetitionInput = {
  festivalId: string;
  eventId: string;
  divisionId?: string | null;
  name: string;
  format: CompetitionFormat;
  roundName?: string | null;
};

export type UpdateCompetitionInput = {
  competitionId: string;
  name: string;
  format: CompetitionFormat;
  roundName?: string | null;
};

export type UpdateCompetitionStatusInput = {
  competitionId: string;
  status: CompetitionStatus;
  reason?: string;
};

export type CreateFixtureInput = {
  competitionId: string;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  scheduledAt?: string | null;
  venueId?: string | null;
  status?: FixtureStatus;
  metadata?: Record<string, unknown>;
};

export type UpdateFixtureInput = {
  fixtureId: string;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  scheduledAt?: string | null;
  venueId?: string | null;
  status?: FixtureStatus;
  metadata?: Record<string, unknown>;
};

export type UpdateFixtureScoreInput = {
  fixtureId: string;
  scoreHome: number | null;
  scoreAway: number | null;
};

export type UpdateFixtureStatusInput = {
  fixtureId: string;
  status: FixtureStatus;
  reason?: string;
};

export type GenerateKnockoutFixturesInput = {
  competitionId: string;
  teamIds: string[];
  roundName?: string;
};
