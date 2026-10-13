import type { Metadata } from "next";
import {
  getActiveFestival,
  getTeamsByFestival,
  getPublishedResultsByFestival,
  getActivePenaltiesByFestival,
  getParticipantsByFestival,
} from "@/lib/repositories";
import {
  calculateTeamPointsBreakdown,
  ParticipantResolutionError,
} from "@/lib/competition/pointsAggregation";
import type { Result } from "@/lib/types";
import LeaderboardClient, {
  LeaderboardDisplayTeam,
} from "@/components/leaderboard/LeaderboardClient";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Championship Standings • ZENITHROW Sports Festival 2026",
  description:
    "Live official championship points, house shield rankings, and ratified tournament standings for ZENITHROW 2026.",
};

type DynamicLeaderboardResult = {
  standings: LeaderboardDisplayTeam[];
  integrityError?: string;
  hasError?: boolean;
};

async function getDynamicLeaderboard(): Promise<DynamicLeaderboardResult> {
  try {
    const festival = await getActiveFestival();
    if (!festival) {
      return {
        standings: [],
      };
    }

    const [teams, resultRows, penalties, participants] = await Promise.all([
      getTeamsByFestival(festival.id),
      getPublishedResultsByFestival(festival.id),
      getActivePenaltiesByFestival(festival.id),
      getParticipantsByFestival(festival.id),
    ]);

    if (!teams || teams.length === 0) {
      return {
        standings: [],
      };
    }

    // Canonical database-backed participant -> team lookup
    const participantTeamMap = new Map<string, string | null>(
      participants.map((p) => [p.id, p.team_id]),
    );

    // Map ResultRow to minimal Result format for points calculation
    const domainResults: Result[] = resultRows.map((r) => ({
      id: r.id,
      festivalId: r.festival_id,
      eventId: r.event_id,
      competitionId: r.competition_id ?? undefined,
      fixtureId: r.fixture_id ?? undefined,
      participantId: r.participant_id ?? undefined,
      teamId: r.team_id ?? undefined,
      rank: r.rank ?? undefined,
      points: Number(r.points),
      performance: (r.performance ?? {}) as Record<string, unknown>,
      disposition: r.disposition,
      status: r.status,
      isOfficial: r.is_official,
      publishedAt: r.published_at ?? undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    // Calculate points for each team using canonical database resolution
    const teamScores = teams.map((team) => {
      const breakdown = calculateTeamPointsBreakdown(
        domainResults,
        team.id,
        penalties,
        participantTeamMap,
      );

      return {
        id: team.id,
        name: team.name,
        code: team.code,
        sortOrder: team.sort_order,
        grossPoints: breakdown.grossPoints,
        penaltyDeductions: breakdown.penaltyDeductions,
        points: breakdown.netPoints,
      };
    });

    // Sort by points descending, then sort_order ascending, then name ascending
    teamScores.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      standings: teamScores.map((t, index) => ({
        id: t.id,
        name: t.name,
        code: t.code,
        rank: index + 1,
        grossPoints: t.grossPoints,
        penaltyDeductions: t.penaltyDeductions,
        points: t.points,
      })),
    };
  } catch (error) {
    console.error("[LeaderboardPage] Error fetching dynamic standings:", error);
    const integrityError =
      error instanceof ParticipantResolutionError
        ? error.message
        : error instanceof Error
        ? error.message
        : "An unknown data resolution error occurred.";

    return {
      standings: [],
      integrityError,
      hasError: true,
    };
  }
}

export default async function LeaderboardPage() {
  const { standings, integrityError, hasError } = await getDynamicLeaderboard();

  const totalPoints = standings.reduce((acc, t) => acc + t.points, 0);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <main
        style={{
          flex: 1,
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          padding: "0 24px 96px",
        }}
      >
        {/* Header */}
        <Reveal as="section" className="page-header">
          <p className="page-kicker">House Championship Standings</p>
          <h1 className="page-title">Championship standings.</h1>
          <p className="page-desc">
            Official points and live team standings computed from certified event results and active regulation deductions for ZENITHROW 2026.
          </p>
        </Reveal>

        {/* Dynamic Client with Podium, Standings Matrix & Codex */}
        <Reveal>
          <LeaderboardClient
            standings={standings}
            totalPoints={totalPoints}
            integrityError={integrityError}
            hasError={hasError}
          />
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
