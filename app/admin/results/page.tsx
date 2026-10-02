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
import AdminResultsClient from "@/components/admin/AdminResultsClient";

export const metadata = {
  title: "Results Ledger | ZENITHROW Admin",
  description: "Official results and performance ledger for ZENITHROW 2026",
};

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
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
      "[AdminResultsPage] Error fetching master results ledger:",
      error,
    );
  }

  return (
    <main className="pegasus-page pegasus-animate-fade">
      <section className="pegasus-page__header">
        <p className="pegasus-eyebrow">ZENITHROW 2026 • MASTER LEDGER</p>
        <h1 className="pegasus-page-title">Results Ledger</h1>
        <p className="pegasus-page__description">
          Central administrative ledger of all competition marks, verification states, and publication statuses across the festival.
        </p>
      </section>

      <AdminResultsClient
        initialResults={results}
        events={events}
        participants={participants}
        teams={teams}
      />
    </main>
  );
}
