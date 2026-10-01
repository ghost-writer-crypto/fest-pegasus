import Link from "next/link";
import { leaderboard as staticLeaderboard } from "@/data/leaderboard";
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

type LeaderboardDisplayTeam = {
  id: string;
  name: string;
  code?: string;
  rank: number;
  grossPoints: number;
  penaltyDeductions: number;
  points: number; // Net points
};

type DynamicLeaderboardResult = {
  standings: LeaderboardDisplayTeam[];
  integrityError?: string;
};

async function getDynamicLeaderboard(): Promise<DynamicLeaderboardResult> {
  try {
    const festival = await getActiveFestival();
    if (!festival) {
      return {
        standings: staticLeaderboard.map((t) => ({
          ...t,
          grossPoints: t.points,
          penaltyDeductions: 0,
        })),
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
        standings: staticLeaderboard.map((t) => ({
          ...t,
          grossPoints: t.points,
          penaltyDeductions: 0,
        })),
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
      standings: staticLeaderboard.map((t) => ({
        ...t,
        grossPoints: t.points,
        penaltyDeductions: 0,
      })),
      integrityError,
    };
  }
}

export default async function LeaderboardPage() {
  const { standings, integrityError } = await getDynamicLeaderboard();

  const totalPoints = standings.reduce((acc, t) => acc + t.points, 0);

  return (
    <main className="pegasus-page pegasus-animate-fade" style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 16px 80px" }}>
      {integrityError && (
        <aside
          className="zenith-surface-1 zenith-edge"
          style={{
            margin: "0 0 28px 0",
            borderLeft: "4px solid var(--primary)",
            padding: "16px 20px",
            borderRadius: "var(--radius-small)",
          }}
          role="alert"
          aria-live="assertive"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "var(--primary)", fontWeight: 900 }}>⚠️</span>
            <strong style={{ fontSize: "13px", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-primary)" }}>
              Data Integrity Notice
            </strong>
          </div>
          <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>
            {integrityError}. Preserving verified fallback standings for regulatory audit safety.
          </p>
        </aside>
      )}

      {/* Header */}
      <section style={{ marginBottom: "36px" }}>
        <p className="zenith-kicker" style={{ marginBottom: "8px" }}>
          04 / LEADERBOARD
        </p>
        <h1
          style={{
            margin: "0 0 10px 0",
            fontSize: "clamp(2rem, 4vw, 3rem)",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            color: "var(--text-primary)",
            lineHeight: 1.05,
          }}
        >
          Championship Standings
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "14px",
            color: "var(--text-secondary)",
            maxWidth: "640px",
            lineHeight: 1.6,
          }}
        >
          Official championship points and live team standings computed from certified event results and active regulation deductions.
        </p>
      </section>

      {/* Operational Telemetry Summary */}
      <div
        className="zenith-surface-1 zenith-edge"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          padding: "14px 20px",
          borderRadius: "var(--radius-medium)",
          marginBottom: "28px",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px", flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.1em", display: "block" }}>
              ACTIVE HOUSES
            </span>
            <strong style={{ fontSize: "16px", fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
              {standings.length}
            </strong>
          </div>
          <div style={{ width: "1px", height: "24px", backgroundColor: "var(--border)" }} />
          <div>
            <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.1em", display: "block" }}>
              ACCRUED CHAMPIONSHIP POINTS
            </span>
            <strong style={{ fontSize: "16px", fontFamily: "var(--font-mono)", color: "var(--primary)" }}>
              {totalPoints} PTS
            </strong>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="zenith-signal zenith-signal-verified">
            <span className="zenith-signal-dot" />
            CALCULATED & CERTIFIED
          </span>
        </div>
      </div>

      {/* Flagship Rankings List: Dominant Rank Numbers */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {standings.map((team) => {
          const rankFormatted = String(team.rank).padStart(2, "0");
          const isLeader = team.rank === 1;

          return (
            <Link
              key={team.id}
              href="/teams"
              className="zenith-surface-1 zenith-edge zenith-leaderboard-card"
              style={{
                borderRadius: "var(--radius-medium)",
                textDecoration: "none",
                color: "inherit",
                border: "1px solid var(--border)",
                borderLeft: isLeader ? "4px solid var(--primary)" : "1px solid var(--border)",
                transition: "all 160ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* 1. DOMINANT RANK NUMBER */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    color: isLeader ? "var(--primary)" : "var(--text-primary)",
                  }}
                >
                  {rankFormatted}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 800,
                    color: "var(--text-muted)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginTop: "4px",
                  }}
                >
                  {isLeader ? "LEADER" : `RANK ${team.rank}`}
                </span>
              </div>

              {/* 2. HOUSE IDENTITY & METADATA */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "clamp(1.2rem, 2.4vw, 1.8rem)",
                      fontWeight: 850,
                      letterSpacing: "0.01em",
                      textTransform: "uppercase",
                      color: "var(--text-primary)",
                    }}
                  >
                    {team.name}
                  </h2>
                  {team.code && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "var(--radius-micro)",
                        background: "var(--surface-raised)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {team.code}
                    </span>
                  )}
                  {isLeader && (
                    <span className="zenith-signal zenith-signal-live">
                      ★ CHAMPIONSHIP SHIELD LEADER
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--text-muted)", flexWrap: "wrap" }}>
                  {team.penaltyDeductions < 0 ? (
                    <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                      Gross {team.grossPoints} PTS · {team.penaltyDeductions} Penalty Deduction
                    </span>
                  ) : (
                    <span>All points officially ratified</span>
                  )}
                  <span>·</span>
                  <span style={{ color: "var(--secondary)", fontWeight: 600 }}>
                    View Official House Roster ↗
                  </span>
                </div>
              </div>

              {/* 3. DOMINANT POINTS DISPLAY */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  justifyContent: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "clamp(2rem, 4vw, 2.8rem)",
                      fontWeight: 900,
                      letterSpacing: "-0.03em",
                      color: "var(--text-primary)",
                      lineHeight: 1,
                    }}
                  >
                    {team.points}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    PTS
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                    marginTop: "4px",
                  }}
                >
                  NET TOTAL
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
