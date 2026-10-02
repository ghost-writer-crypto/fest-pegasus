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
import AdminVerificationClient from "@/components/admin/AdminVerificationClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Result Verification | ZENITHROW Admin",
  description: "Operational review of competition results, audit referee marks, and official sign-off",
};

export default async function AdminVerificationPage() {
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
      "[AdminVerificationPage] Error fetching verification data:",
      error,
    );
  }

  return (
    <main className="pegasus-page pegasus-animate-fade">
      <section className="pegasus-page__header">
        <p className="pegasus-eyebrow">ZENITHROW 2026 • OFFICIAL AUDIT & SIGN-OFF</p>
        <h1 className="pegasus-page-title">Result Verification</h1>
        <p className="pegasus-page__description">
          Operational review of competition results. Audit referee marks, verify lane outcomes, and officially sign off on results to advance them to the Publishing Surface.
        </p>
      </section>

      <AdminVerificationClient
        initialResults={results}
        events={events}
        participants={participants}
        teams={teams}
      />
    </main>
  );
}
