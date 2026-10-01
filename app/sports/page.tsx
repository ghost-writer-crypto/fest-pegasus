import Link from "next/link";
import { sports } from "@/data/sports";
import { events } from "@/data/events";

export default function SportsPage() {
  return (
    <main className="pegasus-page pegasus-animate-fade" style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px 80px" }}>
      <section className="pegasus-page__header" style={{ marginBottom: "36px" }}>
        <p className="zenith-kicker" style={{ marginBottom: "8px" }}>05 / DISCIPLINES</p>
        <h1 className="pegasus-page-title" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, textTransform: "uppercase" }}>Sports Program</h1>
        <p className="pegasus-page__description">
          Certified athletic disciplines, match tournaments, and medal events configured across ZENITHROW 2026.
        </p>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
        {sports.map((sport, index) => {
          const configuredEvents = events.filter(
            (event) => event.sport.toLowerCase() === sport.name.toLowerCase(),
          );
          const indexNum = String(index + 1).padStart(2, "0");

          return (
            <Link
              key={sport.id}
              href={`/sports/${sport.slug || sport.id}`}
              className="zenith-surface-1 zenith-edge"
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                padding: "24px",
                borderRadius: "var(--radius-medium)",
                textDecoration: "none",
                color: "inherit",
                border: "1px solid var(--border)",
                minHeight: "220px",
                transition: "all 160ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span className="zenith-kicker">
                    {indexNum} // {sport.type?.toUpperCase() || "DISCIPLINE"}
                  </span>

                  <span className="zenith-signal zenith-signal-upcoming">
                    <span className="zenith-signal-dot" />
                    {configuredEvents.length} {configuredEvents.length === 1 ? "EVENT" : "EVENTS"}
                  </span>
                </div>

                <h2
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "22px",
                    fontWeight: 850,
                    letterSpacing: "-0.02em",
                    textTransform: "uppercase",
                    color: "var(--text-primary)",
                  }}
                >
                  {sport.name}
                </h2>
                {sport.description && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      lineHeight: 1.5,
                    }}
                  >
                    {sport.description}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "20px",
                  paddingTop: "14px",
                  borderTop: "1px solid var(--border)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span style={{ color: "var(--text-muted)", textTransform: "uppercase" }}>
                  {configuredEvents.length} certified {configuredEvents.length === 1 ? "draw" : "draws"}
                </span>

                <span style={{ color: "var(--secondary)", fontWeight: 700, textTransform: "uppercase" }}>
                  EXPLORE PANEL ↗
                </span>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}