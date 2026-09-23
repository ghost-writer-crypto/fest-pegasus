import Link from "next/link";
import { leaderboard as staticLeaderboard } from "@/data/leaderboard";
import {
  getActiveFestival,
  getTeamsByFestival,
  getPublishedResultsByFestival,
  getActivePenaltiesByFestival,
} from "@/lib/repositories";
import { calculateTeamPointsBreakdown } from "@/lib/competition/pointsAggregation";
import type { Result } from "@/lib/types";

type LeaderboardDisplayTeam = {
  id: string;
  name: string;
  code?: string;
  rank: number;
  grossPoints: number;
  penaltyDeductions: number;
  points: number; // Net points
};

async function getDynamicLeaderboard(): Promise<LeaderboardDisplayTeam[]> {
  try {
    const festival = await getActiveFestival();
    if (!festival) {
      return staticLeaderboard.map((t) => ({
        ...t,
        grossPoints: t.points,
        penaltyDeductions: 0,
      }));
    }

    const [teams, resultRows, penalties] = await Promise.all([
      getTeamsByFestival(festival.id),
      getPublishedResultsByFestival(festival.id),
      getActivePenaltiesByFestival(festival.id),
    ]);

    if (!teams || teams.length === 0) {
      return staticLeaderboard.map((t) => ({
        ...t,
        grossPoints: t.points,
        penaltyDeductions: 0,
      }));
    }

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

    // Calculate points for each team
    const teamScores = teams.map((team) => {
      const breakdown = calculateTeamPointsBreakdown(
        domainResults,
        team.id,
        penalties,
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

    return teamScores.map((t, index) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      rank: index + 1,
      grossPoints: t.grossPoints,
      penaltyDeductions: t.penaltyDeductions,
      points: t.points,
    }));
  } catch (error) {
    console.error("[LeaderboardPage] Error fetching dynamic standings:", error);
    return staticLeaderboard.map((t) => ({
      ...t,
      grossPoints: t.points,
      penaltyDeductions: 0,
    }));
  }
}

export default async function LeaderboardPage() {
  const standings = await getDynamicLeaderboard();

  const podiumTeams = standings.filter((t) => t.rank <= 3);
  const remainingTeams = standings.filter((t) => t.rank > 3);

  return (
    <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--leaderboard pegasus-animate-fade">
      <section className="pegasus-page__header">
        <p className="pegasus-eyebrow">FESTIVAL STANDINGS & CHAMPIONSHIP</p>
        <h1 className="pegasus-page-title">Leaderboard</h1>
        <p className="pegasus-page__description">
          Official championship points and live team standings computed from
          verified event results and active regulation deductions.
        </p>
      </section>

      <section className="pegasus-leaderboard">
        {/* Championship Podium Zone */}
        <div className="pegasus-leaderboard__group-header">
          <span className="pegasus-eyebrow" style={{ margin: 0 }}>
            CHAMPIONSHIP PODIUM
          </span>
          <span className="pegasus-leaderboard__group-caption">
            Top 3 House Standings
          </span>
        </div>

        {podiumTeams.map((team) => (
          <Link
            key={team.id}
            href="/teams"
            className={`pegasus-leaderboard__row pegasus-leaderboard__row--podium pegasus-leaderboard__row--rank-${team.rank}`}
          >
            <div className="pegasus-leaderboard__rank">
              <span className="pegasus-leaderboard__rank-number">
                #{team.rank}
              </span>
              {team.rank === 1 && (
                <span className="pegasus-leaderboard__rank-badge pegasus-leaderboard__rank-badge--leader">
                  LEADER
                </span>
              )}
              {team.rank === 2 && (
                <span className="pegasus-leaderboard__rank-badge pegasus-leaderboard__rank-badge--silver">
                  2ND
                </span>
              )}
              {team.rank === 3 && (
                <span className="pegasus-leaderboard__rank-badge pegasus-leaderboard__rank-badge--bronze">
                  3RD
                </span>
              )}
            </div>

            <div className="pegasus-leaderboard__team">
              <strong>{team.name}</strong>
              <div className="pegasus-leaderboard__team-meta">
                {team.code ? (
                  <span className="pegasus-leaderboard__team-code">{team.code}</span>
                ) : null}
                {team.penaltyDeductions < 0 && (
                  <span
                    style={{
                      fontSize: "11px",
                      color: "#ef4444",
                      background: "rgba(239, 68, 68, 0.12)",
                      padding: "1px 6px",
                      borderRadius: "3px",
                      fontWeight: 700,
                    }}
                  >
                    {team.penaltyDeductions} Penalty
                  </span>
                )}
                <span className="pegasus-leaderboard__team-cta">View Roster ↗</span>
              </div>
            </div>

            <div className="pegasus-leaderboard__points">
              <strong>{team.points}</strong>
              <span>PTS</span>
            </div>
          </Link>
        ))}

        {/* Remaining Field Standings */}
        {remainingTeams.length > 0 && (
          <>
            <div className="pegasus-leaderboard__divider">
              <span className="pegasus-eyebrow" style={{ margin: 0 }}>
                FIELD STANDINGS
              </span>
            </div>

            {remainingTeams.map((team) => (
              <Link
                key={team.id}
                href="/teams"
                className="pegasus-leaderboard__row pegasus-leaderboard__row--field"
              >
                <div className="pegasus-leaderboard__rank">
                  <span className="pegasus-leaderboard__rank-number">
                    #{team.rank}
                  </span>
                </div>

                <div className="pegasus-leaderboard__team">
                  <strong>{team.name}</strong>
                  <div className="pegasus-leaderboard__team-meta">
                    {team.code ? (
                      <span className="pegasus-leaderboard__team-code">{team.code}</span>
                    ) : null}
                    {team.penaltyDeductions < 0 && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "#ef4444",
                          background: "rgba(239, 68, 68, 0.12)",
                          padding: "1px 6px",
                          borderRadius: "3px",
                          fontWeight: 700,
                        }}
                      >
                        {team.penaltyDeductions} Penalty
                      </span>
                    )}
                    <span className="pegasus-leaderboard__team-cta">View Roster ↗</span>
                  </div>
                </div>

                <div className="pegasus-leaderboard__points">
                  <strong>{team.points}</strong>
                  <span>PTS</span>
                </div>
              </Link>
            ))}
          </>
        )}
      </section>
    </main>
  );
}
