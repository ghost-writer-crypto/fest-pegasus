import Link from "next/link";
import { sports } from "@/data/sports";
import { events } from "@/data/events";

export const dynamic = "force-dynamic";

export default function AdminSportsPage() {
  const sportStats = sports.map((s) => {
    const sportEvents = events.filter(
      (e) => e.sport.toLowerCase() === s.name.toLowerCase() || e.sport.toLowerCase() === s.id.toLowerCase()
    );
    return {
      ...s,
      eventCount: sportEvents.length,
    };
  });

  return (
    <div className="pegasus-admin-content">
      <header style={{ marginBottom: "28px" }}>
        <p className="pegasus-eyebrow">SPORTS CATALOG • OFFICIAL DISCIPLINES</p>
        <h1 className="pegasus-page-title">Sport Disciplines Management</h1>
        <p className="pegasus-page__description">
          Active competition sports, discipline categories, format rules, and event distribution.
        </p>
      </header>

      {/* Summary KPI Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Total Disciplines
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px" }}>
            {sports.length}
          </strong>
        </div>
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Team Sports
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px" }}>
            {sports.filter((s) => s.type === "team").length}
          </strong>
        </div>
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Individual Athletics
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px" }}>
            {sports.filter((s) => s.type === "individual").length}
          </strong>
        </div>
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Total Configured Events
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px" }}>
            {events.length}
          </strong>
        </div>
      </div>

      {/* Sports Catalog Table */}
      <div className="pegasus-card" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>Official Festival Sports</h2>
          <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--muted)" }}>
            {sports.length} Disciplines Active
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)" }}>SPORT</th>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)" }}>CATEGORY</th>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)" }}>TYPE</th>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)" }}>EVENTS</th>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)" }}>DESCRIPTION</th>
                <th style={{ padding: "12px 20px", fontWeight: 750, color: "var(--muted)", textAlign: "right" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {sportStats.map((sport) => (
                <tr key={sport.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 20px", fontWeight: 800 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>{sport.name}</span>
                      <span style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--muted)", padding: "2px 6px", background: "rgba(255,255,255,0.04)", borderRadius: "2px" }}>
                        {sport.slug}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--muted)" }}>{sport.category}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: "2px",
                        background: sport.type === "team" ? "rgba(37,99,235,0.1)" : "rgba(16,185,129,0.1)",
                        color: sport.type === "team" ? "#60a5fa" : "#34d399",
                      }}
                    >
                      {sport.type}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 700 }}>
                    {sport.eventCount > 0 ? `${sport.eventCount} Events` : "Catalog"}
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--muted)", maxWidth: "320px" }}>
                    {sport.description}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <Link
                      href={`/sports/${sport.slug}`}
                      className="pegasus-button pegasus-button--subtle"
                      style={{ fontSize: "11px", padding: "4px 10px" }}
                    >
                      Public View ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
