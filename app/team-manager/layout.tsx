import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pegasus Team Manager — House Operations Portal",
  description: "Official portal for house captains and team managers",
};

export default function TeamManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pegasus-tm-shell">
      <header className="pegasus-tm-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <Link href="/team-manager" className="pegasus-brand">
            <span className="pegasus-brand__mark">P</span>
            <span className="pegasus-brand__name">PEGASUS</span>
          </Link>
          <span
            style={{
              height: "16px",
              width: "1px",
              background: "var(--border)",
              display: "inline-block",
            }}
          />
          <div>
            <span
              style={{
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--accent)",
                display: "block",
              }}
            >
              HOUSE OPERATIONS
            </span>
            <span style={{ fontSize: "13px", fontWeight: 750, color: "var(--foreground)" }}>
              Team Manager Portal
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "11px",
              color: "var(--muted)",
              background: "rgba(255, 255, 255, 0.04)",
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid var(--border)",
            }}
          >
            STATION: TEAM-OPS
          </span>
          <Link
            href="/"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "12px", padding: "6px 12px", minHeight: "32px" }}
          >
            Public Site ↗
          </Link>
        </div>
      </header>

      <div className="pegasus-tm-content">{children}</div>
    </div>
  );
}

