import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pegasus Judge — Field Operations Console",
  description: "Field scoring and referee console for Pegasus Sports Festival",
};

export default function JudgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="pegasus-judge-shell">
      <header className="pegasus-judge-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <Link href="/judge" className="pegasus-brand">
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
              FIELD OPERATIONS
            </span>
            <span style={{ fontSize: "13px", fontWeight: 750, color: "var(--foreground)" }}>
              Referee Console
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
            FIELD TERMINAL
          </span>
          <Link
            href="/judge"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "12px", padding: "6px 12px", minHeight: "32px" }}
          >
            My Station
          </Link>
          <Link
            href="/"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "12px", padding: "6px 12px", minHeight: "32px" }}
          >
            Public Site ↗
          </Link>
        </div>
      </header>

      <div className="pegasus-judge-content">{children}</div>
    </div>
  );
}

