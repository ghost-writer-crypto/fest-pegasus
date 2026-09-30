import type { PointClass, ResultStatus } from "@/lib/types";
import type { UpsertResultInput } from "../repositories/resultRepository";

export type MatchOutcome = {
  isComplete: boolean;
  isDraw: boolean;
  winnerTeamId: string | null;
  loserTeamId: string | null;
  winnerRank: number | null; // 1 (or 3 for third-place match)
  loserRank: number | null; // 2 (or 4 for third-place match)
  scoreHome: number | null;
  scoreAway: number | null;
  performanceRaw: string;
};

export type ResolveMatchOutcomeParams = {
  homeTeamId?: string | null;
  awayTeamId?: string | null;
  scoreHome?: number | null;
  scoreAway?: number | null;
  round?: string | null;
};

/**
 * Standard Pegasus Codex Point Matrix (Locked).
 */
export const CANONICAL_POINT_MATRIX: Record<
  PointClass,
  { 1: number; 2: number; 3: number }
> = {
  W: { 1: 5, 2: 3, 3: 1 },
  X: { 1: 5, 2: 3, 3: 1 },
  Y: { 1: 7, 2: 5, 3: 3 },
  Z: { 1: 10, 2: 7, 3: 5 },
};

/**
 * Canonical Point Classes for known Pegasus team competitions.
 */
export const TEAM_EVENT_POINT_CLASSES: Record<string, PointClass> = {
  football: "Z",
  cricket: "Z",
  volleyball: "Z",
  "tug-of-war": "Y",
  "penalty-shootout": "Y",
  "kho-kho": "X",
  "dodge-ball": "X",
  "relay-4x50m": "X",
  "relay-4x100m": "X",
  "relay-4x200m": "X",
};

/**
 * Computes canonical championship points for a given point class and finishing rank.
 */
export function getCanonicalPoints(
  pointClass: PointClass | string | null | undefined,
  rank: number | null | undefined,
): number {
  if (!pointClass || !rank || rank < 1) return 0;
  const matrix = CANONICAL_POINT_MATRIX[pointClass as PointClass];
  if (!matrix) return 0;
  return matrix[rank as 1 | 2 | 3] ?? 0;
}

/**
 * Pure domain resolver that evaluates match scores between two teams and determines
 * the official winner, loser, ranks, and operational performance string.
 *
 * Ranking Semantics:
 * - Direct Match / Final: Winner is Rank 1, Loser is Rank 2.
 * - 3rd-Place Match (if indicated by round): Winner is Rank 3, Loser is Rank 4.
 * - Incomplete / Unscored: isComplete = false, ranks = null.
 * - Drawn / Tied (without tiebreaker): isDraw = true, isComplete = false, ranks = null.
 */
export function resolveMatchOutcome(
  params: ResolveMatchOutcomeParams,
): MatchOutcome {
  const { homeTeamId, awayTeamId, scoreHome, scoreAway, round } = params;

  const hasScores =
    scoreHome !== null &&
    scoreHome !== undefined &&
    scoreAway !== null &&
    scoreAway !== undefined &&
    !isNaN(scoreHome) &&
    !isNaN(scoreAway) &&
    scoreHome >= 0 &&
    scoreAway >= 0;

  if (!hasScores || !homeTeamId || !awayTeamId) {
    return {
      isComplete: false,
      isDraw: false,
      winnerTeamId: null,
      loserTeamId: null,
      winnerRank: null,
      loserRank: null,
      scoreHome: scoreHome ?? null,
      scoreAway: scoreAway ?? null,
      performanceRaw: "",
    };
  }

  const performanceRaw = `${scoreHome} - ${scoreAway}`;

  // Tied score without tiebreak
  if (scoreHome === scoreAway) {
    return {
      isComplete: false,
      isDraw: true,
      winnerTeamId: null,
      loserTeamId: null,
      winnerRank: null,
      loserRank: null,
      scoreHome,
      scoreAway,
      performanceRaw,
    };
  }

  // Detect 3rd-place match from round metadata
  const roundLower = (round || "").toLowerCase();
  const isThirdPlaceMatch =
    roundLower.includes("3rd") ||
    roundLower.includes("third") ||
    roundLower.includes("bronze");

  const winnerRank = isThirdPlaceMatch ? 3 : 1;
  const loserRank = isThirdPlaceMatch ? 4 : 2;

  if (scoreHome > scoreAway) {
    return {
      isComplete: true,
      isDraw: false,
      winnerTeamId: homeTeamId,
      loserTeamId: awayTeamId,
      winnerRank,
      loserRank,
      scoreHome,
      scoreAway,
      performanceRaw,
    };
  } else {
    return {
      isComplete: true,
      isDraw: false,
      winnerTeamId: awayTeamId,
      loserTeamId: homeTeamId,
      winnerRank,
      loserRank,
      scoreHome,
      scoreAway,
      performanceRaw,
    };
  }
}

export type DeriveTeamMatchResultsParams = {
  fixtureId: string;
  festivalId: string;
  eventId: string;
  homeTeamId: string;
  awayTeamId: string;
  scoreHome: number | null | undefined;
  scoreAway: number | null | undefined;
  pointClass?: PointClass | string | null;
  getEventPoints?: (eventId: string, rank: number) => number | null | undefined;
  round?: string | null;
  status?: ResultStatus;
  homeResultId?: string;
  awayResultId?: string;
};

/**
 * Derives the official UpsertResultInput records for both entrants in a team match.
 *
 * Guarantees:
 * 1. For a decided match: Winner receives canonical Rank 1 points; Loser receives canonical Rank 2 points.
 * 2. For an incomplete/drawn match: Both teams receive rank = null and points = 0.
 * 3. Never produces fabricated points for unresolved matches.
 * 4. Generates distinct results linked to their respective team_id to prevent multi-team collision.
 */
export function deriveTeamMatchResults(
  params: DeriveTeamMatchResultsParams,
): UpsertResultInput[] {
  const {
    fixtureId,
    festivalId,
    eventId,
    homeTeamId,
    awayTeamId,
    scoreHome,
    scoreAway,
    pointClass,
    getEventPoints,
    round,
    status = "submitted",
    homeResultId,
    awayResultId,
  } = params;

  const outcome = resolveMatchOutcome({
    homeTeamId,
    awayTeamId,
    scoreHome,
    scoreAway,
    round,
  });

  if (outcome.isComplete && outcome.winnerTeamId && outcome.loserTeamId) {
    const isHomeWinner = outcome.winnerTeamId === homeTeamId;
    const homeRank = isHomeWinner ? outcome.winnerRank! : outcome.loserRank!;
    const awayRank = isHomeWinner ? outcome.loserRank! : outcome.winnerRank!;

    const resolvedClass =
      pointClass || TEAM_EVENT_POINT_CLASSES[eventId.toLowerCase()];

    const calculatePoints = (rank: number): number => {
      if (getEventPoints) {
        const pts = getEventPoints(eventId, rank);
        if (pts !== null && pts !== undefined) return pts;
      }
      return getCanonicalPoints(resolvedClass, rank);
    };

    const homePoints = calculatePoints(homeRank);
    const awayPoints = calculatePoints(awayRank);

    return [
      {
        id: homeResultId,
        festival_id: festivalId,
        event_id: eventId,
        fixture_id: fixtureId,
        team_id: homeTeamId,
        participant_id: null,
        rank: homeRank,
        points: homePoints,
        performance: {
          raw: `${scoreHome} - ${scoreAway}`,
          scoreHome,
          scoreAway,
          side: "home",
          isWinner: isHomeWinner,
        },
        disposition: "normal",
        status,
      },
      {
        id: awayResultId,
        festival_id: festivalId,
        event_id: eventId,
        fixture_id: fixtureId,
        team_id: awayTeamId,
        participant_id: null,
        rank: awayRank,
        points: awayPoints,
        performance: {
          raw: `${scoreAway} - ${scoreHome}`,
          scoreHome,
          scoreAway,
          side: "away",
          isWinner: !isHomeWinner,
        },
        disposition: "normal",
        status,
      },
    ];
  }

  // Incomplete or drawn match without resolution: record operational status with null rank & 0 points
  return [
    {
      id: homeResultId,
      festival_id: festivalId,
      event_id: eventId,
      fixture_id: fixtureId,
      team_id: homeTeamId,
      participant_id: null,
      rank: null,
      points: 0,
      performance: {
        raw: outcome.performanceRaw,
        scoreHome: outcome.scoreHome,
        scoreAway: outcome.scoreAway,
        side: "home",
      },
      disposition: "normal",
      status,
    },
    {
      id: awayResultId,
      festival_id: festivalId,
      event_id: eventId,
      fixture_id: fixtureId,
      team_id: awayTeamId,
      participant_id: null,
      rank: null,
      points: 0,
      performance: {
        raw: outcome.performanceRaw,
        scoreHome: outcome.scoreHome,
        scoreAway: outcome.scoreAway,
        side: "away",
      },
      disposition: "normal",
      status,
    },
  ];
}
