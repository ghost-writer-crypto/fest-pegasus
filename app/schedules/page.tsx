import Link from "next/link";
import {
  getActiveFestival,
  getSchedulesByFestival,
  getEventsByFestival,
  getVenuesByFestival,
  type ScheduleRow,
  type EventRow,
  type VenueRow,
} from "@/lib/repositories";
import SchedulesClient from "./SchedulesClient";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  let schedules: ScheduleRow[] = [];
  let events: EventRow[] = [];
  let venues: VenueRow[] = [];

  try {
    const festival = await getActiveFestival();
    if (festival) {
      [schedules, events, venues] = await Promise.all([
        getSchedulesByFestival(festival.id),
        getEventsByFestival(festival.id),
        getVenuesByFestival(festival.id),
      ]);
    }
  } catch (error) {
    console.error("[SchedulesPage] Error retrieving schedule data:", error);
    schedules = [];
    events = [];
    venues = [];
  }

  return (
    <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--schedules pegasus-animate-fade">
      {/* Header */}
      <section className="pegasus-page__header" style={{ marginBottom: "32px" }}>
        <p className="zenith-kicker" style={{ marginBottom: "8px" }}>03 / SCHEDULE</p>
        <h1 className="pegasus-page-title" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, textTransform: "uppercase" }}>Competition Schedule</h1>
        <p className="pegasus-page__description">
          Official competition timetable, venue assignments, and event timings
          for ZENITHROW Sports Festival 2026.
        </p>
      </section>

      {/* Schedules Content or Authentic Empty State */}
      {schedules.length === 0 ? (
        <section
          className="pegasus-card"
          style={{ textAlign: "center", padding: "64px 24px" }}
        >
          <p className="pegasus-eyebrow" style={{ color: "var(--muted)" }}>
            TIMETABLE PENDING
          </p>
          <h2
            style={{
              margin: "12px 0 10px",
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            The official festival schedule will appear here once published.
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
            Event timings, venue allocations, and heat schedules are being
            finalized by festival coordinators. Check back soon for the complete
            program.
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
              href="/fixtures"
              className="pegasus-button pegasus-button--subtle"
            >
              View Fixtures <span>↗</span>
            </Link>
          </div>
        </section>
      ) : (
        <SchedulesClient
          initialSchedules={schedules}
          events={events}
          venues={venues}
        />
      )}
    </main>
  );
}
