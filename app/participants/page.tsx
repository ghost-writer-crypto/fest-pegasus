import Link from "next/link";
import {
  getActiveFestival,
  getParticipantsByFestival,
  getTeamsByFestival,
  type ParticipantRow,
  type TeamRow,
} from "@/lib/repositories";
import ParticipantDirectoryClient from "./ParticipantDirectoryClient";
import Footer from "@/components/Footer";

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
    <>
    <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--participants pegasus-animate-fade">
      {/* Header */}
      <section className="page-header">
        <p className="page-kicker">Athlete directory</p>
        <h1 className="page-title">Athlete directory.</h1>
        <p className="page-desc">
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
          <p style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted, #6e6e73)", marginBottom: "16px", fontWeight: 700 }}>
            Directory pending
          </p>

          <h2
            style={{
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
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
    <Footer />
    </>
  );
}
