import Link from "next/link";
import { leaderboard } from "@/data/leaderboard";
import { participants } from "@/data/participants";

export default function TeamsPage() {
  return (
    <main className="pegasus-page pegasus-animate-fade" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 80px" }}>
      {/* Page Header */}
      <section className="pegasus-page__header" style={{ marginBottom: "36px" }}>
        <p className="zenith-kicker" style={{ marginBottom: "8px" }}>06 / HOUSES</p>
        <h1 className="pegasus-page-title" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, textTransform: "uppercase" }}>Official Houses</h1>
        <p className="pegasus-page__description">
          Official competition houses, team identities, registered athlete rosters,
          and division allocations for ZENITHROW Sports Festival 2026.
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "24px" }}>
        {leaderboard.map((team) => {
          const teamParticipants = participants.filter(
            (participant) => participant.teamId === team.id,
          );

          const teamInitials =
            team.code ||
            (team.name.match(/\d+/)
              ? "H" + team.name.match(/\d+/)![0]
              : "H");

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
                    {teamParticipants.length} {teamParticipants.length === 1 ? "Athlete" : "Athletes"}
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
                    REGISTERED ATHLETES ({teamParticipants.length})
                  </span>
                  <Link
                    href="/participants"
                    style={{ fontSize: "12px", color: "var(--muted)", textDecoration: "none" }}
                  >
                    View All ↗
                  </Link>
                </div>

                {teamParticipants.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--muted)", margin: "8px 0" }}>
                    No athletes confirmed for this house yet.
                  </p>
                ) : (
                  <div className="pegasus-team-roster-list">
                    {teamParticipants.map((p) => (
                      <Link
                        key={p.id}
                        href={`/participants/${p.id}`}
                        className="pegasus-roster-chip"
                      >
                        <span className="pegasus-roster-chip__num">#{p.chestNumber}</span>
                        <span className="pegasus-roster-chip__name">{p.name}</span>
                        <span className="pegasus-roster-chip__cat">{p.category}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
