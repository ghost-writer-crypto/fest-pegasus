import {
  getActiveFestival,
  getParticipantsByFestivalAdmin,
  getTeamsByFestival,
  getDivisionsByFestival,
  getEventsByFestival,
  type AdminParticipantRow,
  type TeamRow,
  type DivisionRow,
  type EventRow,
} from "@/lib/repositories";
import AdminParticipantsClient from "@/components/admin/AdminParticipantsClient";

export const metadata = {
  title: "Participant Registry | Pegasus Admin",
  description: "Official Pegasus athlete registry and management console",
};

export default async function AdminParticipantsPage() {
  const activeFestival = await getActiveFestival();

  let initialParticipants: AdminParticipantRow[] = [];
  let teams: TeamRow[] = [];
  let divisions: DivisionRow[] = [];
  let events: EventRow[] = [];

  if (activeFestival) {
    [initialParticipants, teams, divisions, events] = await Promise.all([
      getParticipantsByFestivalAdmin(activeFestival.id).catch((err) => {
        console.error("[AdminParticipantsPage] Error fetching participants:", err);
        return [];
      }),
      getTeamsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminParticipantsPage] Error fetching teams:", err);
        return [];
      }),
      getDivisionsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminParticipantsPage] Error fetching divisions:", err);
        return [];
      }),
      getEventsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminParticipantsPage] Error fetching events:", err);
        return [];
      }),
    ]);
  }

  return (
    <AdminParticipantsClient
      festivalId={activeFestival?.id || ""}
      initialParticipants={initialParticipants}
      teams={teams}
      divisions={divisions}
      events={events}
    />
  );
}
