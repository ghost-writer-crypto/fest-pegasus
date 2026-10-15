import {
  getActiveFestival,
  getResultsByFestivalOperational,
  getEventsByFestival,
  getParticipantsByFestival,
  getTeamsByFestival,
  getCompetitionsByFestival,
  type ResultRow,
  type EventRow,
  type ParticipantRow,
  type TeamRow,
  type CompetitionRow,
} from "@/lib/repositories";
import AdminResultsClient from "@/components/admin/AdminResultsClient";

export const metadata = {
  title: "Results Management | ZENITHROW Admin",
  description: "Official results entry, verification, and publishing for ZENITHROW 2026",
};

export const dynamic = "force-dynamic";

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams?: Promise<{ event?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialEventId = resolvedSearchParams?.event || "";
  let results: ResultRow[] = [];
  let events: EventRow[] = [];
  let participants: ParticipantRow[] = [];
  let teams: TeamRow[] = [];
  let competitions: CompetitionRow[] = [];
  let festivalId = "";

  try {
    const festival = await getActiveFestival();
    if (festival) {
      festivalId = festival.id;
      [results, events, participants, teams, competitions] = await Promise.all([
        getResultsByFestivalOperational(festival.id),
        getEventsByFestival(festival.id),
        getParticipantsByFestival(festival.id),
        getTeamsByFestival(festival.id),
        getCompetitionsByFestival(festival.id),
      ]);
    }
  } catch (error) {
    console.error(
      "[AdminResultsPage] Error fetching master results:",
      error,
    );
  }

  return (
    <main className="pegasus-page pegasus-animate-fade">
      <section className="pegasus-page__header">
        <p className="pegasus-eyebrow">ZENITHROW 2026 • RESULTS CONTROL</p>
        <h1 className="pegasus-page-title">Results Management</h1>
        <p className="pegasus-page__description">
          Central administrative control for result entry, score verification, audit corrections, and official festival publication.
        </p>
      </section>

      <AdminResultsClient
        initialResults={results}
        events={events}
        participants={participants}
        teams={teams}
        competitions={competitions}
        festivalId={festivalId}
        initialEventId={initialEventId}
      />
    </main>
  );
}
