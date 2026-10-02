import Link from "next/link";
import {
  getActiveFestival,
  getCompetitionsByFestival,
  getFixturesByFestival,
  getEventsByFestival,
  getTeamsByFestival,
  getVenuesByFestival,
  type FixtureRow,
  type CompetitionRow,
  type EventRow,
  type TeamRow,
  type VenueRow,
} from "@/lib/repositories";

export const metadata = {
  title: "Tournament Fixtures | ZENITHROW Admin",
  description: "Operational overview of all festival match pairings and schedules",
};

export default async function AdminFixturesPage() {
  const activeFestival = await getActiveFestival();

  let fixtures: FixtureRow[] = [];
  let competitions: CompetitionRow[] = [];
  let events: EventRow[] = [];
  let teams: TeamRow[] = [];
  let venues: VenueRow[] = [];

  if (activeFestival) {
    [fixtures, competitions, events, teams, venues] = await Promise.all([
      getFixturesByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminFixturesPage] Error fetching fixtures:", err);
        return [];
      }),
      getCompetitionsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminFixturesPage] Error fetching competitions:", err);
        return [];
      }),
      getEventsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminFixturesPage] Error fetching events:", err);
        return [];
      }),
      getTeamsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminFixturesPage] Error fetching teams:", err);
        return [];
      }),
      getVenuesByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminFixturesPage] Error fetching venues:", err);
        return [];
      }),
    ]);
  }

  const compMap = new Map(competitions.map((c) => [c.id, c]));
  const eventMap = new Map(events.map((e) => [e.id, e]));
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const venueMap = new Map(venues.map((v) => [v.id, v]));

  return (
    <div className="pegasus-admin-content">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <span className="pegasus-eyebrow">ZENITHROW 2026 • OPERATIONAL OVERVIEW</span>
          <h1 className="pegasus-page-title" style={{ margin: "4px 0" }}>
            Tournament Fixtures
          </h1>
          <p className="pegasus-page__description" style={{ margin: 0, maxWidth: "680px" }}>
            Master operational roster of all active matchups across tournaments, courts, and stages.
          </p>
        </div>

        <Link
          href="/admin/competitions"
          className="pegasus-button pegasus-button--primary"
          style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontWeight: 700 }}
        >
          <span>🏆</span>
          <span>Manage Competitions</span>
        </Link>
      </div>

      {/* Fixtures Table */}
      <div className="pegasus-card" style={{ padding: 0, overflow: "hidden" }}>
        {fixtures.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>🏟️</span>
            <strong style={{ display: "block", fontSize: "16px", color: "var(--foreground)" }}>
              No fixtures scheduled yet
            </strong>
            <p style={{ margin: "4px 0 16px", fontSize: "13px" }}>
              Navigate to Competitions to set up tournament brackets and generate match pairings.
            </p>
            <Link href="/admin/competitions" className="pegasus-button pegasus-button--secondary">
              Open Competition Console
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--muted)",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px" }}>Matchup (Home vs Away)</th>
                  <th style={{ padding: "12px 16px" }}>Competition & Event</th>
                  <th style={{ padding: "12px 16px" }}>Venue & Schedule</th>
                  <th style={{ padding: "12px 16px" }}>Score</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {fixtures.map((f) => {
                  const comp = compMap.get(f.competition_id);
                  const event = comp ? eventMap.get(comp.event_id) : null;
                  const home = f.home_team_id ? teamMap.get(f.home_team_id) : null;
                  const away = f.away_team_id ? teamMap.get(f.away_team_id) : null;
                  const venue = f.venue_id ? venueMap.get(f.venue_id) : null;
                  const round = (f.metadata?.round as string) || "Match";

                  return (
                    <tr key={f.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            background:
                              f.status === "live"
                                ? "rgba(239, 68, 68, 0.15)"
                                : f.status === "finished"
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(255, 255, 255, 0.06)",
                            color:
                              f.status === "live"
                                ? "#ef4444"
                                : f.status === "finished"
                                ? "#10b981"
                                : "var(--muted)",
                          }}
                        >
                          {f.status}
                        </span>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 750 }}>
                          {home ? home.name : "TBD"} vs {away ? away.name : "TBD"}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {round}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div>{comp ? comp.name : f.competition_id}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {event ? event.name : ""}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px" }}>
                        <div>{venue ? venue.name : "Unallocated"}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {f.scheduled_at
                            ? new Date(f.scheduled_at).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Schedule Pending"}
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px", fontFamily: "monospace", fontWeight: 700 }}>
                        {f.score_home !== null && f.score_away !== null
                          ? `${f.score_home} - ${f.score_away}`
                          : "—"}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {comp && (
                          <Link
                            href={`/admin/competitions/${comp.id}`}
                            className="pegasus-button pegasus-button--subtle"
                            style={{ padding: "4px 8px", fontSize: "12px" }}
                          >
                            Console ↗
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
