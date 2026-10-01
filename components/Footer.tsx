import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer" aria-label="Site footer">
      <div className="wrap footergrid">
        <div>
          <div className="brand" style={{ fontSize: "20px" }}>
            HAMDAN STUDENTS UNION<span style={{ color: "var(--hsu-red)" }}>.</span>
          </div>
          <p style={{ color: "#777", maxWidth: "390px", lineHeight: 1.7, fontSize: "14px", marginTop: "12px" }}>
            A student-led digital home for sport, participation, results, stories and the moments that make campus life move.
          </p>
        </div>

        <div>
          <b style={{ color: "#fff", display: "block", marginBottom: "12px", fontSize: "14px" }}>
            Festival
          </b>
          <Link href="/sports">Sports</Link>
          <Link href="/schedules">Schedule</Link>
          <Link href="/display">Live</Link>
          <Link href="/results">Results</Link>
        </div>

        <div>
          <b style={{ color: "#fff", display: "block", marginBottom: "12px", fontSize: "14px" }}>
            Community
          </b>
          <Link href="/teams">Teams</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <Link href="/my-result">My ZENITHROW</Link>
        </div>

        <div>
          <b style={{ color: "#fff", display: "block", marginBottom: "12px", fontSize: "14px" }}>
            Operations
          </b>
          <Link href="/team-manager">Team Manager</Link>
          <Link href="/judge">Judge Desk</Link>
          <Link href="/admin">Admin</Link>
        </div>
      </div>

      <div className="wrap" style={{ marginTop: "40px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "20px" }}>
        <small style={{ color: "#666", fontSize: "12px" }}>
          © 2026 Hamdan Students Union · ZENITHROW Sports Festival
        </small>
      </div>
    </footer>
  );
}
