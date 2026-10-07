import Link from "next/link";
import {
  getActiveFestival,
  getPublishedResultsByFestival,
  getEventsByFestival,
  getTeamsByFestival,
  getParticipantsByFestival,
  type ResultRow,
  type EventRow,
  type TeamRow,
  type ParticipantRow,
} from "@/lib/repositories";
import ResultsClient from "./ResultsClient";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  let publishedResults: ResultRow[] = [];
  let events: EventRow[] = [];
  let teams: TeamRow[] = [];
  let participants: ParticipantRow[] = [];

  try {
    const festival = await getActiveFestival();
    if (festival) {
      [publishedResults, events, teams, participants] = await Promise.all([
        getPublishedResultsByFestival(festival.id),
        getEventsByFestival(festival.id),
        getTeamsByFestival(festival.id),
        getParticipantsByFestival(festival.id),
      ]);
    }
  } catch (error) {
    console.error("[ResultsPage] Error retrieving published results:", error);
    publishedResults = [];
    events = [];
    teams = [];
    participants = [];
  }

  return (
    <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--results pegasus-animate-fade">
      {/* Header */}
      <section className="page-header">
        <p className="page-kicker">Results</p>
        <h1 className="page-title">Official results.</h1>
        <p className="page-desc">
          Verified and officially published event outcomes, athlete rankings, and championship points for ZENITHROW Sports Festival 2026.
        </p>
      </section>

      {/* Published Results or Authentic Empty State */}
      {publishedResults.length === 0 ? (
        <section
          className="pegasus-card"
          style={{ textAlign: "center", padding: "64px 24px" }}
        >
          <p style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted, #6e6e73)", marginBottom: "12px", fontWeight: 700 }}>
            Standings pending
          </p>
          <h2
            style={{
              margin: "0 0 10px",
              fontSize: "24px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
            }}
          >
            No published results yet.
          </h2>
          <p
            style={{
              margin: "0 auto",
              maxWidth: "520px",
              fontSize: "14px",
              color: "var(--muted)",
              lineHeight: 1.6,
            }}
          >
            Official results will appear here once verified by judges and
            published by the festival technical committee. Check back soon.
          </p>

          <div
            style={{
              marginTop: "28px",
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/schedules"
              className="pegasus-button pegasus-button--secondary"
            >
              View Schedules <span>↗</span>
            </Link>
            <Link
              href="/fixtures"
              className="pegasus-button pegasus-button--subtle"
            >
              View Fixtures <span>↗</span>
            </Link>
          </div>
        </section>
      ) : (
        <ResultsClient
          initialResults={publishedResults}
          events={events}
          teams={teams}
          participants={participants}
        />
      )}
    </main>
  );
}
