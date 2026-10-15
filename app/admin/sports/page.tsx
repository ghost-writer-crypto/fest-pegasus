import {
  getActiveFestival,
  getSportsByFestival,
  getReconciledSports,
  getSchedulesByFestival,
  getEventsByFestival,
  getVenuesByFestival,
  getPublishedResultsByFestival,
  type SportWithImage,
  type ScheduleRow,
  type EventRow,
  type VenueRow,
  type ResultRow,
} from "@/lib/repositories";
import AdminSportsClient from "@/components/admin/AdminSportsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sports & Programme Management | ZENITHROW Admin",
  description:
    "Active competition sports, discipline cover images, official timetable completion, and direct result entry",
};

export default async function AdminSportsPage() {
  const activeFestival = await getActiveFestival();

  let sports: SportWithImage[] = [];
  let schedules: ScheduleRow[] = [];
  let events: EventRow[] = [];
  let venues: VenueRow[] = [];
  let results: ResultRow[] = [];

  if (activeFestival) {
    [sports, schedules, events, venues, results] = await Promise.all([
      getReconciledSports(activeFestival.id).catch((err) => {
        console.error("[AdminSportsPage] Error fetching sports:", err);
        return [];
      }),
      getSchedulesByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminSportsPage] Error fetching schedules:", err);
        return [];
      }),
      getEventsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminSportsPage] Error fetching events:", err);
        return [];
      }),
      getVenuesByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminSportsPage] Error fetching venues:", err);
        return [];
      }),
      getPublishedResultsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminSportsPage] Error fetching results:", err);
        return [];
      }),
    ]);
  }

  return (
    <AdminSportsClient
      festivalId={activeFestival?.id || ""}
      sports={sports}
      schedules={schedules}
      events={events}
      venues={venues}
      results={results}
    />
  );
}
