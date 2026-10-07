import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getParticipantByPublicId,
  getParticipantById,
  getTeamById,
  getPublishedResultsByParticipant,
  getEventById,
  getOrCreateQrIdentity,
  type ParticipantRow,
  type TeamRow,
  type EventRow,
  type ResultRow,
} from "@/lib/repositories";
import { CODEX_DIVISIONS } from "@/lib/competition/divisions";
import { formatPerformance } from "@/lib/results/resultStatus";
import type { Performance } from "@/lib/types";
import ShowQrButton from "@/components/qr/ShowQrButton";
import Footer from "@/components/Footer";

type ParticipantPageProps = {
  params: Promise<{ id: string }>;
};

function getInitials(name: string): string {
  if (!name || name.trim() === "") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRankBadge(rank: number | null, disposition: string) {
  if (disposition && disposition !== "normal") {
    return {
      label: disposition.toUpperCase(),
      bg: "rgba(255, 255, 255, 0.08)",
      color: "var(--muted)",
    };
  }
  if (!rank) {
    return {
      label: "Rank Pending",
      bg: "rgba(255, 255, 255, 0.05)",
      color: "var(--muted)",
    };
  }
  if (rank === 1) {
    return {
      label: "#1 Gold",
      bg: "rgba(255, 215, 0, 0.15)",
      color: "#ffd700",
    };
  }
  if (rank === 2) {
    return {
      label: "#2 Silver",
      bg: "rgba(192, 192, 192, 0.15)",
      color: "#c0c0c0",
    };
  }
  if (rank === 3) {
    return {
      label: "#3 Bronze",
      bg: "rgba(205, 127, 50, 0.15)",
      color: "#cd7f32",
    };
  }
  return {
    label: `#${rank}`,
    bg: "rgba(255, 255, 255, 0.08)",
    color: "var(--foreground)",
  };
}

export default async function ParticipantPage({ params }: ParticipantPageProps) {
  const { id } = await params;

  let participant: ParticipantRow | null = null;

  try {
    // 1. Primary authoritative lookup by public identifier (e.g. 'PGS-0001')
    participant = await getParticipantByPublicId(id);

    // 2. Secondary fallback for internal UUID links only
    if (
      !participant &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      participant = await getParticipantById(id);
    }
  } catch (error) {
    console.error(`[ParticipantPage] Error retrieving participant ${id}:`, error);
    participant = null;
  }

  // Strict 404 if athlete record does not exist
  if (!participant) {
    notFound();
  }

  // Fetch associated team (public metadata only)
  let team: TeamRow | null = null;
  if (participant.team_id) {
    try {
      team = await getTeamById(participant.team_id);
    } catch {
      team = null;
    }
  }

  // Resolve or create on-demand QR identity
  const qrIdentity = await getOrCreateQrIdentity("participant", participant.id);

  // Resolve human-readable division name
  const division = CODEX_DIVISIONS.find(
    (d) =>
      d.id === participant.division_id ||
      d.id === participant.division_id?.toLowerCase() ||
      d.name.toLowerCase() === participant.division_id?.toLowerCase(),
  );
  const divisionName = division?.name ?? participant.division_id ?? "Unassigned Division";

  // Fetch published-only results for this competitor
  let publishedResults: ResultRow[] = [];
  try {
    publishedResults = await getPublishedResultsByParticipant(participant.id);
  } catch (error) {
    console.error(
      `[ParticipantPage] Error retrieving published results for ${participant.id}:`,
      error,
    );
    publishedResults = [];
  }

  // Resolve event names for published results (batched by distinct event IDs)
  const distinctEventIds = Array.from(
    new Set(publishedResults.map((r) => r.event_id)),
  );
  const eventEntries = await Promise.all(
    distinctEventIds.map(async (eventId) => {
      try {
        const ev = await getEventById(eventId);
        return [eventId, ev] as const;
      } catch {
        return [eventId, null] as const;
      }
    }),
  );
  const eventMap = new Map<string, EventRow | null>(eventEntries);

  return (
    <>
      <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--participants pegasus-animate-fade">
        {/* Back Navigation */}
        <Link href="/participants" className="pegasus-back">
          ← All participants
        </Link>

      {/* Athlete Profile Header */}
      <section className="pegasus-profile">
        {/* Avatar */}
        <div className="pegasus-profile__image">
          {participant.profile_image_url ? (
            <Image
              src={participant.profile_image_url}
              alt={participant.name}
              width={120}
              height={120}
            />
          ) : (
            <span>{getInitials(participant.name)}</span>
          )}
        </div>

        {/* Profile Content */}
        <div className="pegasus-profile__content" style={{ flexGrow: 1 }}>
          {/* Top Identifier Row: High-Contrast Chest Badge & Public ID */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {participant.chest_number && (
              <span className="pegasus-chest-badge--lg">
                CHEST #{participant.chest_number}
              </span>
            )}
            <span
              className="pegasus-participant-card__id"
              style={{ fontSize: "12px" }}
            >
              {participant.public_id}
            </span>
          </div>

          <h1>{participant.name}</h1>

          {/* Meta Line: Team, Division, Status */}
          <div className="pegasus-profile__meta" style={{ flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {team?.color && (
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: team.color,
                  }}
                  aria-hidden="true"
                />
              )}
              {team?.name ?? "Unassigned Team"}
            </span>
            <span>{divisionName}</span>
            <span
              className={`pegasus-status pegasus-status--${
                participant.status === "confirmed" ? "live" : "upcoming"
              }`}
              style={{ padding: "2px 8px", fontSize: "11px" }}
            >
              <span className="pegasus-status__dot" />
              {participant.status.charAt(0).toUpperCase() +
                participant.status.slice(1)}
            </span>
          </div>

          {/* Quick Actions: Show QR & My Result */}
          <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <ShowQrButton
              data={{
                name: participant.name,
                role: "student",
                roleLabel: "Student Competitor",
                identifier: `ID: ${participant.public_id}`,
                subIdentifier: participant.chest_number ? `Chest #${participant.chest_number}` : undefined,
                qrUrl: `/qr/${qrIdentity.qr_token}`,
                isPrivileged: false,
              }}
              label="Show QR Code"
              variant="primary"
            />
            <Link
              href={`/my-result?q=${encodeURIComponent(participant.public_id)}`}
              className="pegasus-button pegasus-button--secondary"
              style={{ fontSize: "13px", padding: "0 14px", minHeight: "38px" }}
            >
              Check My Result <span>↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Published Outings & Results Section */}
      <section className="pegasus-profile-section">
        <div className="pegasus-profile-section__heading">
          <p className="pegasus-eyebrow">CHAMPIONSHIP OUTINGS</p>
          <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "4px 0 20px" }}>
            Published Results & Marks
          </h2>
        </div>

        {publishedResults.length === 0 ? (
          <div
            className="pegasus-card"
            style={{
              padding: "36px 24px",
              textAlign: "center",
              maxWidth: "600px",
            }}
          >
            <p
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "var(--foreground)",
                margin: "0 0 6px",
              }}
            >
              No published results yet
            </p>
            <p
              style={{
                fontSize: "13px",
                color: "var(--muted)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Official competition marks and standings for {participant.name} will
              appear here as soon as they are verified and released by the
              Festival Scorer.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "16px",
            }}
          >
            {publishedResults.map((result) => {
              const event = eventMap.get(result.event_id);
              const eventName = event?.name ?? "Competition Event";
              const rankInfo = getRankBadge(result.rank, result.disposition);
              const performanceText = formatPerformance(
                result.performance as unknown as Performance,
              );

              return (
                <article
                  key={result.id}
                  className="pegasus-card"
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 750,
                          color: "var(--muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {event?.code ?? "EVENT"}
                      </span>
                      <h3
                        style={{
                          fontSize: "17px",
                          fontWeight: 750,
                          margin: "2px 0 0",
                          color: "var(--foreground)",
                        }}
                      >
                        {eventName}
                      </h3>
                    </div>

                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 800,
                        padding: "3px 10px",
                        borderRadius: "4px",
                        background: rankInfo.bg,
                        color: rankInfo.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rankInfo.label}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: "8px",
                      borderTop: "1px solid var(--border)",
                      fontSize: "13px",
                    }}
                  >
                    <span style={{ color: "var(--muted-strong)" }}>
                      {performanceText ? (
                        <strong>{performanceText}</strong>
                      ) : (
                        "Mark logged"
                      )}
                    </span>

                    <span
                      style={{
                        fontWeight: 750,
                        color:
                          result.points > 0
                            ? "var(--accent)"
                            : "var(--muted)",
                      }}
                    >
                      +{result.points} pts
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
    <Footer />
  </>
  );
}