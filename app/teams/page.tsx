import Link from "next/link";
import { leaderboard } from "@/data/leaderboard";
import { participants } from "@/data/participants";

export default function TeamsPage() {
  return (
    <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--teams pegasus-animate-fade">
      {/* Page Header */}
      <section className="pegasus-page__header">
        <p className="pegasus-eyebrow">FESTIVAL HOUSES & ATHLETE ROSTERS</p>
        <h1 className="pegasus-page-title">Teams</h1>
        <p className="pegasus-page__description">
          Official competition houses, team identities, registered athlete rosters,
          and division allocations for the Pegasus Sports Festival.
        </p>
      </section>

      <section className="pegasus-teams-grid">
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
            <article key={team.id} className="pegasus-card pegasus-team-card">
              <div className="pegasus-team-card__header">
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div className="pegasus-team-badge" aria-label={team.name}>
                    {teamInitials}
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
                      {team.name}
                    </h2>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {team.code ? `Code: ${team.code}` : "Identity Pending"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span className="pegasus-status pegasus-status--upcoming">
                    <span className="pegasus-status__dot" />
                    Rank #{team.rank}
                  </span>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "var(--accent)",
                      fontFamily: "monospace",
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
