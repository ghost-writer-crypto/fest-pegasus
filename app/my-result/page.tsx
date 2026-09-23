import Link from "next/link";
import {
  getParticipantByPublicId,
  getParticipantByChestNumber,
  getTeamById,
  getPublishedResultsByParticipant,
  getEventById,
  type ParticipantRow,
  type TeamRow,
  type EventRow,
  type ResultRow,
} from "@/lib/repositories";
import { CODEX_DIVISIONS } from "@/lib/competition/divisions";
import { formatPerformance } from "@/lib/results/resultStatus";
import type { Performance } from "@/lib/types";
import MyResultSearchForm from "./MyResultSearchForm";

export const dynamic = "force-dynamic";

type MyResultPageProps = {
  searchParams: Promise<{ q?: string }>;
};

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

export default async function MyResultPage({ searchParams }: MyResultPageProps) {
  const { q } = await searchParams;
  const trimmedQuery = q ? q.trim() : "";

  let participant: ParticipantRow | null = null;
  let team: TeamRow | null = null;
  let publishedResults: ResultRow[] = [];
  let eventMap = new Map<string, EventRow | null>();

  if (trimmedQuery) {
    try {
      // 1. Primary lookup by public participant ID (e.g. 'PGS-0001')
      participant = await getParticipantByPublicId(trimmedQuery);

      // 2. Secondary lookup by chest number if not resolved by public ID
      if (!participant) {
        participant = await getParticipantByChestNumber(trimmedQuery);
      }

      if (participant) {
        // Fetch team metadata
        if (participant.team_id) {
          try {
            team = await getTeamById(participant.team_id);
          } catch {
            team = null;
          }
        }

        // Fetch published results strictly
        publishedResults = await getPublishedResultsByParticipant(participant.id);

        // Resolve event names for results
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
        eventMap = new Map<string, EventRow | null>(eventEntries);
      }
    } catch (error) {
      console.error("[MyResultPage] Error performing result lookup:", error);
      participant = null;
    }
  }

  // Resolve human-readable division name
  const division = participant
    ? CODEX_DIVISIONS.find(
        (d) =>
          d.id === participant?.division_id ||
          d.id === participant?.division_id?.toLowerCase() ||
          d.name.toLowerCase() === participant?.division_id?.toLowerCase(),
      )
    : null;
  const divisionName = division?.name ?? participant?.division_id ?? "Unassigned Division";

  return (
    <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--my-result pegasus-animate-fade">
      {/* Page Header */}
      <section className="pegasus-page__header">
        <p className="pegasus-eyebrow">ATHLETE RESULTS DESK</p>
        <h1 className="pegasus-page-title">My Result</h1>
        <p className="pegasus-page__description">
          Fast public lookup for official individual marks, championship
          rankings, and points across the Pegasus Sports Festival.
        </p>
      </section>

      {/* Search Input Utility */}
      <section style={{ marginBottom: "36px" }}>
        <MyResultSearchForm initialQuery={trimmedQuery} />
      </section>

      {/* Lookup State: Searched and Participant Found */}
      {trimmedQuery && participant && (
        <section style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Athlete Identity Summary Card */}
          <div
            className="pegasus-card"
            style={{
              padding: "28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "20px",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                  flexWrap: "wrap",
                }}
              >
                {participant.chest_number && (
                  <span className="pegasus-chest-badge">
                    CHEST #{participant.chest_number}
                  </span>
                )}
                <span className="pegasus-participant-card__id">
                  {participant.public_id}
                </span>
              </div>

              <h2
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  margin: "0 0 6px",
                  color: "var(--foreground)",
                }}
              >
                {participant.name}
              </h2>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "13px",
                  color: "var(--muted)",
                }}
              >
                <span>{team?.name ?? "Unassigned Team"}</span>
                <span>•</span>
                <span>{divisionName}</span>
              </div>
            </div>

            <Link
              href={`/participants/${encodeURIComponent(participant.public_id)}`}
              className="pegasus-button pegasus-button--secondary"
              style={{ fontSize: "13px", minHeight: "40px" }}
            >
              View Full Profile <span>↗</span>
            </Link>
          </div>

          {/* Published Results Section */}
          <div>
            <div style={{ marginBottom: "16px" }}>
              <p className="pegasus-eyebrow">VERIFIED OUTCOMES</p>
              <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "2px 0 0" }}>
                Competition Results
              </h3>
            </div>

            {publishedResults.length === 0 ? (
              <div
                className="pegasus-card"
                style={{
                  padding: "40px 24px",
                  textAlign: "center",
                  maxWidth: "600px",
                }}
              >
                <div
                  style={{
                    fontSize: "28px",
                    marginBottom: "12px",
                    color: "var(--muted)",
                  }}
                >
                  ⏱️
                </div>
                <h4
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    margin: "0 0 6px",
                    color: "var(--foreground)",
                  }}
                >
                  We couldn&apos;t find a published result for that participant yet.
                </h4>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--muted)",
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  Official results will appear here as soon as they are verified
                  and published by the festival committee. Check back shortly
                  after event heats and finals conclude.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
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
                          <h4
                            style={{
                              fontSize: "16px",
                              fontWeight: 750,
                              margin: "2px 0 0",
                              color: "var(--foreground)",
                            }}
                          >
                            {eventName}
                          </h4>
                        </div>

                        <span
                          style={{
                            fontSize: "12px",
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
          </div>
        </section>
      )}

      {/* Lookup State: Searched but Participant Not Found */}
      {trimmedQuery && !participant && (
        <section
          className="pegasus-card"
          style={{
            padding: "44px 28px",
            textAlign: "center",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              fontSize: "32px",
              marginBottom: "12px",
              color: "var(--muted)",
            }}
          >
            🔍
          </div>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 800,
              margin: "0 0 8px",
              color: "var(--foreground)",
            }}
          >
            Competitor Not Found
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              lineHeight: 1.6,
              marginBottom: "24px",
            }}
          >
            We couldn&apos;t find any competitor matching &ldquo;{trimmedQuery}&rdquo;.
            Please verify that you entered a valid Public ID (e.g., PGS-0001) or
            an assigned Chest Number.
          </p>

          <Link href="/participants" className="pegasus-button pegasus-button--secondary">
            Browse Athlete Directory <span>→</span>
          </Link>
        </section>
      )}

      {/* Default State: No query yet */}
      {!trimmedQuery && (
        <section
          className="pegasus-card"
          style={{
            padding: "36px 28px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            maxWidth: "680px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span
              className="pegasus-status pegasus-status--live"
              style={{ fontSize: "11px", padding: "4px 10px" }}
            >
              <span className="pegasus-status__dot" />
              Direct Results Desk Active
            </span>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Search by Public ID or Chest Number
            </span>
          </div>

          <div>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: 800,
                margin: "0 0 8px",
                color: "var(--foreground)",
              }}
            >
              Check Your Competition Marks
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--muted)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Athletes and team managers can look up verified performance marks,
              podium positions, and accrued championship points directly. Enter
              your official Public ID or assigned chest number above.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "8px",
            }}
          >
            <Link
              href="/participants"
              className="pegasus-button pegasus-button--primary"
            >
              Browse Athlete Directory <span>↗</span>
            </Link>
            <Link
              href="/results"
              className="pegasus-button pegasus-button--secondary"
            >
              View Full Leaderboard <span>→</span>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
