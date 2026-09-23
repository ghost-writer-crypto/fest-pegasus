import {
  getActiveFestival,
  getResultsByFestivalOperational,
  getEventsByFestival,
  getParticipantsByFestival,
  getTeamsByFestival,
  type ResultRow,
  type EventRow,
  type ParticipantRow,
  type TeamRow,
} from "@/lib/repositories";
import AdminPublishClient from "@/components/admin/AdminPublishClient";

export const dynamic = "force-dynamic";

export default async function AdminPublishPage() {
  let results: ResultRow[] = [];
  let events: EventRow[] = [];
  let participants: ParticipantRow[] = [];
  let teams: TeamRow[] = [];

  try {
    const festival = await getActiveFestival();
    if (festival) {
      [results, events, participants, teams] = await Promise.all([
        getResultsByFestivalOperational(festival.id),
        getEventsByFestival(festival.id),
        getParticipantsByFestival(festival.id),
        getTeamsByFestival(festival.id),
      ]);
    }
  } catch (error) {
    console.error(
      "[AdminPublishPage] Error fetching publishing data:",
      error,
    );
  }

  return (
    <main className="pegasus-page pegasus-animate-fade">
      <section className="pegasus-page__header">
        <p className="pegasus-eyebrow">CONTROL ROOM • OFFICIAL PUBLIC RELEASE</p>
        <h1 className="pegasus-page-title">Publishing Surface</h1>
        <p className="pegasus-page__description">
          Review verified competition outcomes and authorize final publication. Only verified results transition to published status to appear in public standings, athlete profiles, and championship points totals.
        </p>
      </section>

      <AdminPublishClient
        initialResults={results}
        events={events}
        participants={participants}
        teams={teams}
      />
    </main>
  );
}
