import Link from "next/link";

export default function DisplayPage() {
  const displayModes = [
    { mode: "01", name: "Live Leaderboard", desc: "Real-time team standings and championship podium changes" },
    { mode: "02", name: "Track & Field Results", desc: "Instant official podium announcements and winning times" },
    { mode: "03", name: "Current Heat / Match", desc: "Live match scoreboard, lane draw, and athlete lineup" },
    { mode: "04", name: "Festival Countdown", desc: "Opening ceremony clock and next event countdown" },
  ];

  return (
    <main className="pegasus-display-inner pegasus-animate-fade">
      {/* Top Stadium Bar */}
      <header className="pegasus-display-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div className="pegasus-brand" style={{ transform: "scale(1.15)", transformOrigin: "left center" }}>
            <span className="pegasus-brand__mark">Z</span>
            <span className="pegasus-brand__name">ZENITHROW</span>
          </div>
          <span
            className="pegasus-status pegasus-status--live"
            style={{ fontSize: "12px", padding: "4px 12px", fontWeight: 800 }}
          >
            <span className="pegasus-status__dot" />
            STADIUM BROADCAST READY
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "monospace" }}>
            PRESS F11 FOR FULLSCREEN
          </span>
          <Link
            href="/"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "12px", padding: "6px 14px" }}
          >
            Exit to Public Portal ↗
          </Link>
        </div>
      </header>

      {/* Main Stadium Jumbotron Body */}
      <section className="pegasus-display-body">
        <p className="pegasus-eyebrow" style={{ fontSize: "14px", letterSpacing: "0.2em", color: "var(--accent)" }}>
          ZENITHROW SPORTS FESTIVAL 2026
        </p>
        <h1 className="pegasus-display-title">
          STADIUM SCREEN SYSTEM
        </h1>
        <p className="pegasus-display-subtitle">
          Dedicated ultra-readable visual display engine engineered for outdoor LED jumbotrons,
          trackside monitors, and stadium projectors.
        </p>

        {/* Display Modes Selector Preview */}
        <div className="pegasus-display-modes">
          {displayModes.map((item) => (
            <div key={item.mode} className="pegasus-display-mode-card">
              <span className="pegasus-display-mode-number">{item.mode}</span>
              <div>
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Ticker Placeholder */}
      <footer className="pegasus-display-ticker">
        <span>BROADCAST FEED: STANDBY</span>
        <span>•</span>
        <span>FIELD BUS CONNECTED</span>
        <span>•</span>
        <span>AUTOMATED BROADCAST MODES TO BE ACTIVATED DURING LIVE EVENTS</span>
      </footer>
    </main>
  );
}

