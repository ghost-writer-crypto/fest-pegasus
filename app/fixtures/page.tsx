import Link from "next/link";
import {
  getActiveFestival,
  getCompetitionsByFestival,
  getFixturesByFestival,
  getEventsByFestival,
  getTeamsByFestival,
  getVenuesByFestival,
  type FixtureRow,
  type CompetitionRow,
  type EventRow,
  type TeamRow,
  type VenueRow,
} from "@/lib/repositories";
import FixturesClient from "./FixturesClient";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function FixturesPage() {
  let fixtures: FixtureRow[] = [];
  let competitions: CompetitionRow[] = [];
  let events: EventRow[] = [];
  let teams: TeamRow[] = [];
  let venues: VenueRow[] = [];

  try {
    const festival = await getActiveFestival();
    if (festival) {
      [competitions, fixtures, events, teams, venues] = await Promise.all([
        getCompetitionsByFestival(festival.id),
        getFixturesByFestival(festival.id),
        getEventsByFestival(festival.id),
        getTeamsByFestival(festival.id),
        getVenuesByFestival(festival.id),
      ]);
    }
  } catch (error) {
    console.error("[FixturesPage] Error retrieving tournament fixtures:", error);
    fixtures = [];
    competitions = [];
    events = [];
    teams = [];
    venues = [];
  }

  return (
    <>
      <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--fixtures pegasus-animate-fade">
        {/* Header */}
        <section className="page-header" style={{ marginBottom: "32px" }}>
          <p className="page-kicker">10 / Fixtures</p>
          <h1 className="page-title">Tournament fixtures</h1>
          <p className="page-desc">
            Official team tournament fixtures, knockout matchups, and arena
            schedules across ZENITHROW Sports Festival 2026.
          </p>
        </section>

      {/* Fixtures Content or Authentic Empty State */}
      {fixtures.length === 0 ? (
        <section
          className="pegasus-card"
          style={{ textAlign: "center", padding: "64px 24px" }}
        >
          <p className="pegasus-eyebrow" style={{ color: "var(--muted)" }}>
            MATCHUPS PENDING
          </p>
          <h2
            style={{
              margin: "12px 0 10px",
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            Official tournament fixtures will appear here once drawn.
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
            Team seedings, court allocations, and round brackets are currently
            being organized. Check back soon for confirmed game matchups.
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
              href="/sports"
              className="pegasus-button pegasus-button--secondary"
            >
              Explore Sports <span>↗</span>
            </Link>
            <Link
              href="/schedules"
              className="pegasus-button pegasus-button--subtle"
            >
              View Schedules <span>↗</span>
            </Link>
          </div>
        </section>
      ) : (
        <FixturesClient
          initialFixtures={fixtures}
          competitions={competitions}
          events={events}
          teams={teams}
          venues={venues}
        />
      )}
    </main>
    <Footer />
  </>
  );
}
