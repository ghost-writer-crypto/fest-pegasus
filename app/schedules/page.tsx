import type { Metadata } from "next";
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
import { events as staticEvents } from "@/data/events";
import { venues as staticVenues } from "@/data/venues";
import SchedulesClient from "./SchedulesClient";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Timetable & Schedules — ZENITHROW Sports Festival 2026",
  description:
    "Official schedule of heats, tournament knockouts, field finals, and live arena sessions for ZENITHROW 2026.",
};

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

  // Populate events fallback if database has zero rows (Basketball and Chess strictly excluded)
  const displayEvents: EventRow[] = (
    events.length > 0
      ? events
      : [
          ...staticEvents.map((e) => ({
            id: e.id,
            festival_id: "zenithrow-2026",
            division_id: null,
            code: e.id.toUpperCase(),
            name: e.name,
            sport_id: null,
            codex_event_id: e.id,
            point_class: "X" as const,
            scoring_engine: "rank_points",
            competition_type: e.sport || "Athletics",
            event_type: (e.type || "individual") as "individual" | "team",
            scoring_schema: {},
            status: "scheduled",
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
          {
            id: "tug-of-war-600kg",
            festival_id: "zenithrow-2026",
            division_id: null,
            code: "TUG-600KG",
            name: "Tug of War 600kg",
            sport_id: null,
            codex_event_id: "tug-of-war",
            point_class: "W" as const,
            scoring_engine: "bracket_points",
            competition_type: "Tug of War",
            event_type: "team" as const,
            scoring_schema: {},
            status: "scheduled",
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: "badminton-open",
            festival_id: "zenithrow-2026",
            division_id: null,
            code: "BADMINTON-OPEN",
            name: "Badminton Open",
            sport_id: null,
            codex_event_id: "badminton",
            point_class: "X" as const,
            scoring_engine: "bracket_points",
            competition_type: "Badminton",
            event_type: "individual" as const,
            scoring_schema: {},
            status: "scheduled",
            metadata: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]
  ) as EventRow[];

  const venueNameMap: Record<string, string> = {
    "athletics-track": "Main Track",
    "main-ground": "Stadium Arena",
    "indoor-court": "Badminton Arena",
    "badminton-arena": "Badminton Arena",
    "volleyball-court": "Volleyball Court A",
    "cricket-ground": "Cricket Ground",
    "central-arena-pit": "Central Arena Pit",
    "power-pavilion": "Power Pavilion",
  };

  const displayVenues: VenueRow[] = (
    venues.length > 0
      ? venues
      : staticVenues.map((v) => ({
          id: v.id,
          festival_id: "zenithrow-2026",
          code: v.id.toUpperCase(),
          slug: v.id,
          name: venueNameMap[v.id] || v.name,
          location: v.location || "Campus Grounds",
          capacity: null,
          is_active: true,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
  ) as VenueRow[];

  // Use live Supabase schedules directly (no fake fallback data)
  const displaySchedules: ScheduleRow[] = schedules;

  return (
    <>
      <main className="section" style={{ paddingTop: "150px" }}>
        <div className="wrap">
          <div className="kicker">ZENITHROW • TODAY</div>
          <h1 style={{ fontSize: "clamp(55px,8vw,105px)", letterSpacing: "-0.03em" }}>
            THE DAY&apos;S<br />
            <span>RHYTHM.</span>
          </h1>

          <SchedulesClient
            initialSchedules={displaySchedules}
            events={displayEvents}
            venues={displayVenues}
          />

          <div className="section-head" style={{ marginTop: "75px" }}>
            <div>
              <div className="kicker">Championship Operations</div>
              <h2>Follow live<br />or check results.</h2>
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <Link href="/display" className="btn primary">
                Live Broadcast →
              </Link>
              <Link href="/results" className="btn">
                Verified Results →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
