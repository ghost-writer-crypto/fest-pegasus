import {
  getActiveFestival,
  getVenuesByFestival,
  getSchedulesByFestival,
  type VenueRow,
  type ScheduleRow,
} from "@/lib/repositories";
import AdminVenuesClient from "@/components/admin/AdminVenuesClient";

export const metadata = {
  title: "Venue Management | Pegasus Admin",
  description: "Campus grounds, courts, tracks, and facility allocation",
};

export default async function AdminVenuesPage() {
  const activeFestival = await getActiveFestival();

  let venues: VenueRow[] = [];
  let schedules: ScheduleRow[] = [];

  if (activeFestival) {
    [venues, schedules] = await Promise.all([
      getVenuesByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminVenuesPage] Error fetching venues:", err);
        return [];
      }),
      getSchedulesByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminVenuesPage] Error fetching schedules:", err);
        return [];
      }),
    ]);
  }

  // Aggregate scheduled slot counts per venue
  const venueSlotCounts: Record<string, number> = {};
  for (const s of schedules) {
    if (s.venue_id && s.status !== "cancelled") {
      venueSlotCounts[s.venue_id] = (venueSlotCounts[s.venue_id] || 0) + 1;
    }
  }

  return (
    <AdminVenuesClient
      festivalId={activeFestival?.id || ""}
      initialVenues={venues}
      venueSlotCounts={venueSlotCounts}
    />
  );
}
