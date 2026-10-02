import {
  getActiveFestival,
  getTeamsByFestival,
  getParticipantsByFestivalAdmin,
} from "@/lib/repositories";
import AdminTeamsClient from "@/components/admin/AdminTeamsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Team Administration | ZENITHROW Admin",
  description: "Manage official festival houses, 3-letter codes, roster allocation, and house points",
};

export default async function AdminTeamsPage() {
  const festival = await getActiveFestival();
  const festivalId = festival?.id || "";

  const [teams, participants] = await Promise.all([
    getTeamsByFestival(festivalId),
    getParticipantsByFestivalAdmin(festivalId),
  ]);

  return (
    <div className="pegasus-admin-content">
      <header style={{ marginBottom: "28px" }}>
        <p className="pegasus-eyebrow">ZENITHROW 2026 • OPERATIONAL ROSTER</p>
        <h1 className="pegasus-page-title">Team Administration</h1>
        <p className="pegasus-page__description">
          Manage official festival houses, 3-letter codes, roster allocation, and house points.
        </p>
      </header>

      <AdminTeamsClient
        festivalId={festivalId}
        initialTeams={teams}
        participants={participants}
      />
    </div>
  );
}
