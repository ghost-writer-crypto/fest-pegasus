import {
  getActiveFestival,
  getSchedulesByFestival,
  getEventsByFestival,
  getVenuesByFestival,
  getRecentScheduleChangesByFestival,
  type ScheduleRow,
  type EventRow,
  type VenueRow,
  type ScheduleChangeRow,
} from "@/lib/repositories";
import AdminScheduleClient from "@/components/admin/AdminScheduleClient";

export const metadata = {
  title: "Schedule Operations | ZENITHROW Admin",
  description: "Master competition timetable, conflict detection, and venue allocations",
};

export default async function AdminSchedulePage() {
  const activeFestival = await getActiveFestival();

  let schedules: ScheduleRow[] = [];
  let events: EventRow[] = [];
  let venues: VenueRow[] = [];
  let changes: ScheduleChangeRow[] = [];

  if (activeFestival) {
    [schedules, events, venues, changes] = await Promise.all([
      getSchedulesByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminSchedulePage] Error fetching schedules:", err);
        return [];
      }),
      getEventsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminSchedulePage] Error fetching events:", err);
        return [];
      }),
      getVenuesByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminSchedulePage] Error fetching venues:", err);
        return [];
      }),
      getRecentScheduleChangesByFestival(activeFestival.id, 50).catch((err) => {
        console.error("[AdminSchedulePage] Error fetching schedule changes:", err);
        return [];
      }),
    ]);
  }

  return (
    <AdminScheduleClient
      festivalId={activeFestival?.id || ""}
      initialSchedules={schedules}
      events={events}
      venues={venues}
      initialChanges={changes}
    />
  );
}
