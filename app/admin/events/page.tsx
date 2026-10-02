import Link from "next/link";
import {
  getActiveFestival,
  getEventsByFestival,
  getSportsByFestival,
  type EventRow,
  type SportRow,
} from "@/lib/repositories";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Event Matrix & Rules | ZENITHROW Admin",
  description: "Official festival event point classifications, scoring engines, and rule matrices",
};

export default async function AdminEventsPage() {
  const activeFestival = await getActiveFestival();

  let events: EventRow[] = [];
  let sports: SportRow[] = [];

  if (activeFestival) {
    [events, sports] = await Promise.all([
      getEventsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminEventsPage] Error fetching events from Supabase:", err);
        return [];
      }),
      getSportsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminEventsPage] Error fetching sports from Supabase:", err);
        return [];
      }),
    ]);
  }

  const sportMap = new Map(sports.map((s) => [s.id, s]));

  const classWCount = events.filter((e) => e.point_class === "W").length;
  const classZCount = events.filter((e) => e.point_class === "Z").length;
  const individualAthleticsCount = events.filter(
    (e) => e.point_class === "W" || sportMap.get(e.sport_id)?.slug === "athletics",
  ).length;

  return (
    <div className="pegasus-admin-content">
      <header style={{ marginBottom: "28px" }}>
        <p className="pegasus-eyebrow">ZENITHROW 2026 • POINT MATRIX & RULES</p>
        <h1 className="pegasus-page-title">Event Management & Matrix</h1>
        <p className="pegasus-page__description">
          Review competition events, point classifications (W, X, Y, Z), scoring engine mapping, and divisions.
        </p>
      </header>

      {/* Summary KPI Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Total Events
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px" }}>
            {events.length}
          </strong>
        </div>
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Class W Events (5 • 3 • 1)
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px" }}>
            {classWCount}
          </strong>
        </div>
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Class Z Events (10 • 7 • 5)
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px" }}>
            {classZCount}
          </strong>
        </div>
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Individual Athletics
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px" }}>
            {individualAthleticsCount}
          </strong>
        </div>
      </div>

      {/* Events Table */}
      <div className="pegasus-card" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>Official Festival Events</h2>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--muted)" }}>
            {events.length} Events Configured
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)" }}>EVENT</th>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)" }}>SPORT</th>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)" }}>FORMAT</th>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)" }}>POINT CLASS</th>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)" }}>SCORING ENGINE</th>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)", textAlign: "right" }}>DESK LINK</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted)" }}>
                    No events configured in Supabase.
                  </td>
                </tr>
              ) : (
                events.map((event) => {
                  const sport = sportMap.get(event.sport_id);
                  const isIndividual = event.point_class === "W";
                  const eventType = isIndividual ? "individual" : "team";
                  const formatDisplay = event.competition_type || "standard";

                  return (
                    <tr key={event.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "14px 20px", fontWeight: 800 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>{event.name}</span>
                          <span style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--muted)", padding: "2px 6px", background: "rgba(255,255,255,0.04)", borderRadius: "2px" }}>
                            {event.code}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px", color: "var(--muted)" }}>
                        {sport?.name || "General"}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "2px 8px",
                            borderRadius: "2px",
                            background: !isIndividual ? "rgba(37,99,235,0.1)" : "rgba(16,185,129,0.1)",
                            color: !isIndividual ? "#60a5fa" : "#34d399",
                          }}
                        >
                          {formatDisplay} ({eventType})
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "2px",
                            background: "rgba(242,184,75,0.15)",
                            color: "#F2B84B",
                          }}
                        >
                          Class {event.point_class || "Standard"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: "12px", color: "var(--muted)" }}>
                        {event.scoring_engine || "standard"}
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <Link
                          href={`/judge/events/${event.id}`}
                          className="pegasus-button pegasus-button--subtle"
                          style={{ fontSize: "11px", padding: "4px 10px" }}
                        >
                          Judge Console ↗
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
