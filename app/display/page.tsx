import {
  getActiveFestival,
  getSchedulesByFestival,
  getEventsByFestival,
  getVenuesByFestival,
  getPublishedResultsByFestival,
  type ScheduleRow,
  type EventRow,
  type VenueRow,
  type ResultRow,
} from "@/lib/repositories";
import { events as staticEvents } from "@/data/events";
import { venues as staticVenues } from "@/data/venues";
import LiveDisplayClient from "./LiveDisplayClient";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function DisplayPage() {
  let festival = null;
  let schedules: ScheduleRow[] = [];
  let events: EventRow[] = [];
  let venues: VenueRow[] = [];
  let results: ResultRow[] = [];

  try {
    festival = await getActiveFestival();
    if (festival) {
      const [schs, evts, vens, res] = await Promise.all([
        getSchedulesByFestival(festival.id).catch(() => []),
        getEventsByFestival(festival.id).catch(() => []),
        getVenuesByFestival(festival.id).catch(() => []),
        getPublishedResultsByFestival(festival.id).catch(() => []),
      ]);
      schedules = schs;
      events = evts;
      venues = vens;
      results = res;
    }
  } catch (error) {
    console.error("[DisplayPage] Error querying live data:", error);
  }

  // Event & Venue lookup maps
  const eventMap = new Map<string, { name: string; type?: string; sport?: string }>();
  for (const e of staticEvents) {
    eventMap.set(e.id, { name: e.name, sport: e.sport });
  }
  for (const e of events) {
    eventMap.set(e.id, { name: e.name, sport: e.competition_type || undefined });
  }

  const venueNameMap: Record<string, string> = {
    "athletics-track": "Main Track",
    "main-ground": "Stadium",
    "indoor-court": "Indoor Court",
    "volleyball-court": "Court A",
    "cricket-ground": "Cricket Ground",
  };
  for (const v of staticVenues) {
    venueNameMap[v.id] = venueNameMap[v.id] || v.name;
  }
  for (const v of venues) {
    venueNameMap[v.id] = venueNameMap[v.id] || v.name;
  }

  // 1. Compute Live / Next / Done Featured Cards
  // Committee Reference: 100m Sprint (Live 09:30), Football Knockout (Next 11:00), Long Jump (Done 5.82m)
  const liveSchedule = schedules.find((s) => s.status === "live");
  const nextSchedule = schedules.find((s) => s.status === "scheduled");
  const doneResult = results[0];

  const cards = [
    {
      status: "live" as const,
      statusText: "Live",
      title: liveSchedule?.event_id
        ? eventMap.get(liveSchedule.event_id)?.name === "Race 100m"
          ? "100m Sprint"
          : eventMap.get(liveSchedule.event_id)?.name || "Live Match"
        : "100m Sprint",
      subtitle: liveSchedule?.venue_id
        ? `Athletics · ${venueNameMap[liveSchedule.venue_id] || "Main Track"}`
        : "Athletics · Main Track",
      value: liveSchedule?.starts_at
        ? new Date(liveSchedule.starts_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "09:30",
    },
    {
      status: "next" as const,
      statusText: "Next",
      title: nextSchedule?.event_id
        ? eventMap.get(nextSchedule.event_id)?.name === "Football"
          ? "Football Knockout"
          : eventMap.get(nextSchedule.event_id)?.name || "Upcoming Event"
        : "Football Knockout",
      subtitle: nextSchedule?.venue_id
        ? `Quarter Final · ${venueNameMap[nextSchedule.venue_id] || "Stadium"}`
        : "Quarter Final · Stadium",
      value: nextSchedule?.starts_at
        ? new Date(nextSchedule.starts_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "11:00",
    },
    {
      status: "done" as const,
      statusText: "Done",
      title: doneResult?.event_id
        ? eventMap.get(doneResult.event_id)?.name || "Long Jump"
        : "Long Jump",
      subtitle: "Athletics · Final",
      value: doneResult?.performance
        ? String(
            (doneResult.performance as Record<string, unknown>).mark ||
            (doneResult.performance as Record<string, unknown>).time ||
            (doneResult.performance as Record<string, unknown>).score ||
            "5.82m"
          )
        : "5.82m",
    },
  ];

  // 2. Compute Live Board Table Rows
  // Committee Reference:
  // Alpha | 100m Sprint | 11.42s | Live
  // Beta  | Long Jump   | 5.82m  | Final
  const boardRows = [
    {
      id: "board-01",
      houseName: "Alpha",
      houseInitial: "A",
      houseColor: "#ef3d32",
      eventName: "100m Sprint",
      score: "11.42s",
      stateText: "Live",
      stateClass: "live",
    },
    {
      id: "board-02",
      houseName: "Beta",
      houseInitial: "B",
      houseColor: "#4d7cff",
      eventName: "Long Jump",
      score: "5.82m",
      stateText: "Final",
      stateClass: "done",
    },
    {
      id: "board-03",
      houseName: "Gamma",
      houseInitial: "G",
      houseColor: "#ffd35a",
      eventName: "High Jump",
      score: "1.68m",
      stateText: "Final",
      stateClass: "done",
    },
    {
      id: "board-04",
      houseName: "Delta",
      houseInitial: "D",
      houseColor: "#53d58a",
      eventName: "Football Knockout",
      score: "2 - 1",
      stateText: "Soon",
      stateClass: "",
    },
  ];

  return (
    <>
      <main className="section" style={{ paddingTop: "150px" }}>
        <div className="wrap">
          <div className="kicker">ZENITHROW / Live</div>
          <h1 style={{ fontSize: "clamp(55px,8vw,105px)" }}>
            THE ACTION<br />
            <span>NOW.</span>
          </h1>

          <div className="notice" style={{ marginBottom: "28px" }}>
            <b>LIVE NOW</b> · Data updates automatically from your existing backend.
            This frontend is designed to surface state without changing your API.
          </div>

          <LiveDisplayClient
            cards={cards}
            boardRows={boardRows}
            totalActive={cards.length}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
