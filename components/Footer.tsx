import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer" aria-label="Site footer">
      <div className="wrap footergrid">
        <div>
          <div className="brand">
            HAMDAN STUDENTS UNION<span style={{ color: "var(--primary)" }}>.</span>
          </div>
          <p style={{ color: "rgba(245,245,247,0.45)", maxWidth: "360px", lineHeight: 1.7, fontSize: "13px", marginTop: "14px" }}>
            A student-led digital home for sport, participation, results, stories and the moments that make campus life move.
          </p>
        </div>

        <div>
          <b style={{ color: "rgba(245,245,247,0.35)", display: "block", marginBottom: "14px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600 }}>
            Festival
          </b>
          <Link href="/sports">Sports</Link>
          <Link href="/schedules">Schedule</Link>
          <Link href="/results">Results</Link>
        </div>

        <div>
          <b style={{ color: "rgba(245,245,247,0.35)", display: "block", marginBottom: "14px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600 }}>
            Community
          </b>
          <Link href="/teams">Teams</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/my-result">My ZENITHROW</Link>
        </div>

        <div>
          <b style={{ color: "rgba(245,245,247,0.35)", display: "block", marginBottom: "14px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600 }}>
            Management
          </b>
          <Link href="/admin">Admin Panel</Link>
          <Link href="/login">Operator Login</Link>
        </div>
      </div>

      <div className="wrap" style={{ marginTop: "48px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "22px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <small style={{ color: "rgba(245,245,247,0.3)", fontSize: "11px" }}>
          © 2026 Hamdan Students Union · ZENITHROW Sports Festival
        </small>
        <small style={{ color: "rgba(245,245,247,0.3)", fontSize: "11px" }}>
          Official Campus Sports Championship
        </small>
      </div>
    </footer>
  );
}
