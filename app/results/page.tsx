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
      <section className="pegasus-page__header" style={{ marginBottom: "32px" }}>
        <p className="zenith-kicker" style={{ marginBottom: "8px" }}>02 / RESULTS</p>
        <h1 className="pegasus-page-title" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, textTransform: "uppercase" }}>Official Results</h1>
        <p className="pegasus-page__description">
          Verified and officially published event outcomes, athlete rankings,
          and championship points for ZENITHROW Sports Festival 2026.
        </p>
      </section>

      {/* Published Results or Authentic Empty State */}
      {publishedResults.length === 0 ? (
        <section
          className="pegasus-card"
          style={{ textAlign: "center", padding: "64px 24px" }}
        >
          <p className="pegasus-eyebrow" style={{ color: "var(--muted)" }}>
            STANDINGS PENDING
          </p>
          <h2
            style={{
              margin: "12px 0 10px",
              fontSize: "24px",
              fontWeight: 800,
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
