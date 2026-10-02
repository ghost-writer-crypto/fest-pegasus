import {
  getActiveFestival,
  getTeamsByFestival,
  getEventsByFestival,
  getPenaltiesByFestival,
  type TeamRow,
  type EventRow,
} from "@/lib/repositories";
import type { TeamPenalty } from "@/lib/types";
import AdminPenaltiesClient from "@/components/admin/AdminPenaltiesClient";

export const metadata = {
  title: "Team Penalty Operations | ZENITHROW Admin",
  description: "Manage official house sanctions and championship regulation deductions",
};

export default async function AdminPenaltiesPage() {
  const activeFestival = await getActiveFestival();

  let penalties: TeamPenalty[] = [];
  let teams: TeamRow[] = [];
  let events: EventRow[] = [];

  if (activeFestival) {
    [penalties, teams, events] = await Promise.all([
      getPenaltiesByFestival(activeFestival.id, { includeReversed: true }).catch((err) => {
        console.error("[AdminPenaltiesPage] Error fetching penalties:", err);
        return [];
      }),
      getTeamsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminPenaltiesPage] Error fetching teams:", err);
        return [];
      }),
      getEventsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminPenaltiesPage] Error fetching events:", err);
        return [];
      }),
    ]);
  }

  return (
    <AdminPenaltiesClient
      festivalId={activeFestival?.id || ""}
      initialPenalties={penalties}
      teams={teams}
      events={events}
    />
  );
}

