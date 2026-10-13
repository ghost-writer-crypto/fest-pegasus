import Link from "next/link";
import {
  getActiveFestival,
  getTeamsByFestival,
  getParticipantsByFestival,
  getPublishedResultsByFestival,
  getActivePenaltiesByFestival,
  type TeamRow,
  type ParticipantRow,
} from "@/lib/repositories";
import { calculateTeamPointsBreakdown } from "@/lib/competition/pointsAggregation";
import type { Result } from "@/lib/types";
import Footer from "@/components/Footer";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  let displayTeams: Array<{
    id: string;
    name: string;
    code: string | null;
    rank: number;
    points: number;
    participants: Array<{ id: string; name: string; chestNumber: string | null; category?: string }>;
  }> = [];
  let queryError: string | null = null;

  try {
    const festival = await getActiveFestival();
    if (festival) {
      const [teams, participants, resultRows, penalties] = await Promise.all([
        getTeamsByFestival(festival.id),
        getParticipantsByFestival(festival.id),
        getPublishedResultsByFestival(festival.id),
        getActivePenaltiesByFestival(festival.id),
      ]);

      if (teams && teams.length > 0) {
        const participantTeamMap = new Map<string, string | null>(
          participants.map((p) => [p.id, p.team_id]),
        );

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

        const computedScores = teams.map((team) => {
          const breakdown = calculateTeamPointsBreakdown(
            domainResults,
            team.id,
            penalties,
            participantTeamMap,
          );
          const teamParticipants = participants.filter((p) => p.team_id === team.id);

          return {
            id: team.id,
            name: team.name,
            code: team.code,
            sortOrder: team.sort_order,
            points: breakdown.netPoints,
            participants: teamParticipants.map((p) => ({
              id: p.id,
              name: p.name,
              chestNumber: p.chest_number,
              category: "General",
            })),
          };
        });

        computedScores.sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.name.localeCompare(b.name);
        });

        displayTeams = computedScores.map((t, idx) => ({
          id: t.id,
          name: t.name,
          code: t.code,
          rank: idx + 1,
          points: t.points,
          participants: t.participants,
        }));
      }
    }
  } catch (err) {
    console.error("[TeamsPage] Error loading database teams:", err);
    queryError = err instanceof Error ? err.message : "Failed to load team data from database.";
  }

  return (
    <>
    <main className="pegasus-page pegasus-animate-fade" style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px 80px" }}>
      {/* Page Header */}
      <Reveal as="section" className="page-header">
        <p className="page-kicker">Houses</p>
        <h1 className="page-title">Official houses.</h1>
        <p className="page-desc">
          Official competition houses, team identities, registered athlete rosters, and division allocations for ZENITHROW Sports Festival 2026.
        </p>
      </Reveal>

      {queryError && (
        <aside
          style={{
            margin: "0 0 28px 0",
            borderLeft: "4px solid #ef4444",
            background: "rgba(239, 68, 68, 0.06)",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
          role="alert"
        >
          <strong style={{ fontSize: "13px", color: "#ef4444" }}>Team Query Error</strong>
          <p style={{ margin: "6px 0 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
            Unable to load official teams from the database: {queryError}. No sample data has been substituted.
          </p>
        </aside>
      )}

      {displayTeams.length === 0 && !queryError && (
        <div style={{ textAlign: "center", padding: "64px 24px", background: "var(--surface-raised)", borderRadius: "var(--radius-medium)", border: "1px dashed var(--border)" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>
            No registered collegiate houses found for this championship festival.
          </p>
        </div>
      )}

      {displayTeams.length > 0 && (
        <Reveal as="section" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 340px), 1fr))", gap: "24px" }}>
          {displayTeams.map((team) => {
          const teamInitials =
            team.code ||
            (team.name.match(/\d+/)
              ? "H" + team.name.match(/\d+/)![0]
              : team.name.slice(0, 3).toUpperCase());

          return (
            <article
              key={team.id}
              className="zenith-surface-1 zenith-edge"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                padding: "24px",
                borderRadius: "var(--radius-medium)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "44px",
                      height: "44px",
                      borderRadius: "var(--radius-micro)",
                      background: "var(--surface-raised)",
                      border: "1px solid var(--border)",
                      boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 900,
                      fontSize: "15px",
                      color: "var(--text-primary)",
                    }}
                    aria-label={team.name}
                  >
                    {teamInitials}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 850, textTransform: "uppercase", color: "var(--text-primary)" }}>
                      {team.name}
                    </h2>
                    <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
                      {team.code ? `CODE: ${team.code}` : "IDENTITY CONFIRMED"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                  <span className="zenith-signal zenith-signal-upcoming">
                    RANK #{team.rank}
                  </span>
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: 900,
                      color: "var(--primary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {team.points} PTS
                  </span>
                </div>
              </div>

              {/* Team Stats Summary */}
              <div className="pegasus-team-card__stats">
                <div>
                  <span className="pegasus-team-stat-label">Roster Size</span>
                  <strong className="pegasus-team-stat-val">
                    {team.participants.length} {team.participants.length === 1 ? "Athlete" : "Athletes"}
                  </strong>
                </div>
                <div>
                  <span className="pegasus-team-stat-label">Current Standing</span>
                  <strong className="pegasus-team-stat-val">#{team.rank} Overall</strong>
                </div>
                <div>
                  <span className="pegasus-team-stat-label">House Points</span>
                  <strong className="pegasus-team-stat-val" style={{ color: "var(--accent)" }}>
                    {team.points} pts
                  </strong>
                </div>
              </div>

              {/* Athlete Roster Section */}
              <div className="pegasus-team-card__roster">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span className="pegasus-eyebrow" style={{ margin: 0 }}>
                    REGISTERED ATHLETES ({team.participants.length})
                  </span>
                  <Link
                    href="/participants"
                    style={{ fontSize: "12px", color: "var(--muted)", textDecoration: "none" }}
                  >
                    View All ↗
                  </Link>
                </div>

                {team.participants.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--muted)", margin: "8px 0" }}>
                    No athletes confirmed for this house yet.
                  </p>
                ) : (
                  <div className="pegasus-team-roster-list">
                    {team.participants.map((p) => (
                      <Link
                        key={p.id}
                        href={`/participants/${p.id}`}
                        className="pegasus-roster-chip"
                      >
                        <span className="pegasus-roster-chip__num">#{p.chestNumber || "—"}</span>
                        <span className="pegasus-roster-chip__name">{p.name}</span>
                        {p.category ? <span className="pegasus-roster-chip__cat">{p.category}</span> : null}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </Reveal>
      )}
    </main>
    <Footer />
    </>
  );
}
