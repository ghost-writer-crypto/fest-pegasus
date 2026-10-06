import {
  getActiveFestival,
  getTeamsByFestival,
  getParticipantsByFestivalAdmin,
  getEventsByFestival,
  getDivisionsByFestival,
  getAdminRegistrationsByFestival,
  getSubstitutionsByFestival,
  getAppealsByFestival,
  getPublishedResultsByFestival,
  getAuthenticatedProfile,
} from "@/lib/repositories";
import TeamManagerClient from "@/components/team-manager/TeamManagerClient";
import { requireRole } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function TeamManagerDashboardPage() {
  await requireRole(["team_manager", "admin"], "/team-manager");
  const festival = await getActiveFestival();
  const festivalId = festival?.id || "pegasus-2026";

  const [
    profile,
    teams,
    allParticipants,
    events,
    divisions,
    allRegistrations,
    allSubstitutions,
    allAppeals,
    allPublishedResults,
  ] = await Promise.all([
    getAuthenticatedProfile().catch(() => null),
    getTeamsByFestival(festivalId).catch(() => []),
    getParticipantsByFestivalAdmin(festivalId).catch(() => []),
    getEventsByFestival(festivalId).catch(() => []),
    getDivisionsByFestival(festivalId).catch(() => []),
    getAdminRegistrationsByFestival(festivalId).catch(() => []),
    getSubstitutionsByFestival(festivalId).catch(() => []),
    getAppealsByFestival(festivalId).catch(() => []),
    getPublishedResultsByFestival(festivalId).catch(() => []),
  ]);

  // Determine current team: if manager has team_id use it, otherwise default to first team for inspection
  const managerTeamId = profile?.teamId || teams[0]?.id;
  const currentTeam = teams.find((t) => t.id === managerTeamId) || teams[0] || null;

  // Filter participants, registrations, substitutions to this team
  const teamParticipants = currentTeam
    ? allParticipants.filter((p) => p.team_id === currentTeam.id)
    : [];

  const teamRegistrations = currentTeam
    ? allRegistrations.filter((r) => r.teamId === currentTeam.id)
    : [];

  const teamSubstitutions = currentTeam
    ? allSubstitutions.filter((s) => s.team_id === currentTeam.id)
    : [];

  const teamAppeals = currentTeam
    ? allAppeals.filter((a) => a.team_id === currentTeam.id)
    : [];

  const teamPublishedResults = currentTeam
    ? allPublishedResults.filter((r) => r.team_id === currentTeam.id)
    : [];

  return (
    <main className="pegasus-page pegasus-animate-fade" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      <TeamManagerClient
        festivalId={festivalId}
        currentTeam={currentTeam}
        allTeams={teams}
        participants={teamParticipants}
        events={events}
        divisions={divisions}
        registrations={teamRegistrations}
        substitutions={teamSubstitutions}
        appeals={teamAppeals}
        publishedResults={teamPublishedResults}
        managerName={profile?.fullName || undefined}
      />
    </main>
  );
}
