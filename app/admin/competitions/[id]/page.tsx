import { notFound } from "next/navigation";
import {
  getActiveFestival,
  getCompetitionById,
  getEventById,
  getDivisionById,
  getFixturesByCompetition,
  getTeamsByFestival,
  getParticipantsByEvent,
  getVenuesByFestival,
  getCompetitionChangeEntries,
  type CompetitionRow,
  type EventRow,
  type DivisionRow,
  type FixtureRow,
  type TeamRow,
  type ParticipantRow,
  type VenueRow,
  type CompetitionChangeRow,
} from "@/lib/repositories";
import AdminCompetitionDetailClient from "@/components/admin/AdminCompetitionDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Competition Console | Pegasus Admin",
  description: "Operational tournament bracket, heats, entrant roster, and matchup management",
};

export default async function AdminCompetitionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const activeFestival = await getActiveFestival();

  if (!activeFestival) {
    notFound();
  }

  const competition: CompetitionRow | null = await getCompetitionById(id);
  if (!competition || competition.festival_id !== activeFestival.id) {
    notFound();
  }

  const [event, division, fixtures, teams, participants, venues, auditEntries] =
    await Promise.all([
      getEventById(competition.event_id, activeFestival.id).catch((err) => {
        console.error("[AdminCompetitionDetailPage] Error fetching event:", err);
        return null;
      }),
      competition.division_id
        ? getDivisionById(competition.division_id).catch((err) => {
            console.error("[AdminCompetitionDetailPage] Error fetching division:", err);
            return null;
          })
        : Promise.resolve(null),
      getFixturesByCompetition(competition.id).catch((err) => {
        console.error("[AdminCompetitionDetailPage] Error fetching fixtures:", err);
        return [] as FixtureRow[];
      }),
      getTeamsByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminCompetitionDetailPage] Error fetching teams:", err);
        return [] as TeamRow[];
      }),
      getParticipantsByEvent(activeFestival.id, competition.event_id).catch((err) => {
        console.error("[AdminCompetitionDetailPage] Error fetching participants:", err);
        return [] as ParticipantRow[];
      }),
      getVenuesByFestival(activeFestival.id).catch((err) => {
        console.error("[AdminCompetitionDetailPage] Error fetching venues:", err);
        return [] as VenueRow[];
      }),
      getCompetitionChangeEntries(competition.id, 50).catch((err) => {
        console.error("[AdminCompetitionDetailPage] Error fetching audit entries:", err);
        return [] as CompetitionChangeRow[];
      }),
    ]);

  return (
    <AdminCompetitionDetailClient
      festivalId={activeFestival.id}
      competition={competition}
      event={event as EventRow | null}
      division={division as DivisionRow | null}
      initialFixtures={fixtures}
      teams={teams}
      participants={participants}
      venues={venues}
      auditEntries={auditEntries}
    />
  );
}

