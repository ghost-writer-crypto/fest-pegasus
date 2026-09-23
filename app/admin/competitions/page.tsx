import {
  getActiveFestival,
  getCompetitionsByFestival,
  getEventsByFestival,
  getDivisionsByFestival,
  getFixturesByFestival,
  type CompetitionRow,
  type EventRow,
  type DivisionRow,
  type FixtureRow,
} from "@/lib/repositories";
import AdminCompetitionsClient from "@/components/admin/AdminCompetitionsClient";

export const metadata = {
  title: "Competition Operations | Pegasus Admin",
  description: "Tournament structures, knockout brackets, heats, and matchup draws",
};

export default async function AdminCompetitionsPage() {
  const activeFestival = await getActiveFestival();

  let competitions: CompetitionRow[] = [];
  let events: EventRow[] = [];
  let divisions: DivisionRow[] = [];
  let fixtures: FixtureRow[] = [];

  if (activeFestival) {
    [competitions, events, divisions, fixtures] = await Promise.all([
      getCompetitionsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminCompetitionsPage] Error fetching competitions:", err);
        return [];
      }),
      getEventsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminCompetitionsPage] Error fetching events:", err);
        return [];
      }),
      getDivisionsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminCompetitionsPage] Error fetching divisions:", err);
        return [];
      }),
      getFixturesByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminCompetitionsPage] Error fetching fixtures:", err);
        return [];
      }),
    ]);
  }

  return (
    <AdminCompetitionsClient
      festivalId={activeFestival?.id || ""}
      initialCompetitions={competitions}
      events={events}
      divisions={divisions}
      fixtures={fixtures}
    />
  );
}

