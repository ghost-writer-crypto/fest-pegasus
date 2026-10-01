import Link from "next/link";
import {
  getActiveFestival,
  getParticipantsByFestival,
  getTeamsByFestival,
  type ParticipantRow,
  type TeamRow,
} from "@/lib/repositories";
import ParticipantDirectoryClient from "./ParticipantDirectoryClient";

export const dynamic = "force-dynamic";

export default async function ParticipantsPage() {
  let participants: ParticipantRow[] = [];
  let teams: TeamRow[] = [];

  try {
    const festival = await getActiveFestival();
    if (festival) {
      [participants, teams] = await Promise.all([
        getParticipantsByFestival(festival.id),
        getTeamsByFestival(festival.id),
      ]);
    }
  } catch (error) {
    console.error("[ParticipantsPage] Error retrieving participant directory data:", error);
    participants = [];
    teams = [];
  }

  return (
    <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--participants pegasus-animate-fade">
      {/* Header */}
      <section className="pegasus-page__header" style={{ marginBottom: "32px" }}>
        <p className="zenith-kicker" style={{ marginBottom: "8px" }}>11 / DIRECTORY</p>
        <h1 className="pegasus-page-title" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, textTransform: "uppercase" }}>Athlete Directory</h1>
        <p className="pegasus-page__description">
          Search confirmed competitors across houses and academic divisions in the official ZENITHROW 2026 registry.
        </p>
      </section>

      {/* Directory Content or Empty State */}
      {participants.length === 0 ? (
        <section
          className="pegasus-card"
          style={{
            padding: "48px 32px",
            textAlign: "center",
            maxWidth: "640px",
            margin: "40px auto",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(215, 255, 63, 0.1)",
              color: "var(--accent)",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 20px",
              fontSize: "24px",
            }}
          >
            👥
          </div>

          <h2
            style={{
              fontSize: "20px",
              fontWeight: 800,
              color: "var(--foreground)",
              marginBottom: "8px",
            }}
          >
            Competitor Directory Pending
          </h2>

          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: "28px",
            }}
          >
            The official participant roster has not been published yet. Check
            back once athlete registrations are finalized and confirmed by the
            festival technical committee.
          </p>

          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/sports"
              className="pegasus-button pegasus-button--primary"
            >
              Explore Sports <span>↗</span>
            </Link>
            <Link
              href="/schedules"
              className="pegasus-button pegasus-button--secondary"
            >
              View Schedules <span>→</span>
            </Link>
            <Link
              href="/my-result"
              className="pegasus-button pegasus-button--secondary"
            >
              Lookup Result <span>→</span>
            </Link>
          </div>
        </section>
      ) : (
        <ParticipantDirectoryClient
          initialParticipants={participants}
          teams={teams}
        />
      )}
    </main>
  );
}
