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
import { leaderboard } from "@/data/leaderboard";
import AchievementPosterModal from "@/components/achievements/AchievementPosterModal";
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

  // Accrued metrics
  const totalPoints = publishedResults.reduce((acc, r) => acc + (r.points || 0), 0);
  const houseStanding = leaderboard.find(
    (l) => l.id === team?.id || l.name.toLowerCase() === team?.name?.toLowerCase()
  );

  const achievements = publishedResults.map((r) => {
    const ev = eventMap.get(r.event_id);
    const pos = r.rank ?? 1;
    const medal =
      pos === 1
        ? "Gold Medalist"
        : pos === 2
        ? "Silver Medalist"
        : pos === 3
        ? "Bronze Medalist"
        : `Finisher Rank #${pos}`;
    return {
      id: `ach-${r.id}`,
      achievement: `${ev?.name || "Event"} ${medal}`,
      competition: ev?.name || "Championship Event",
      position: pos,
      house: team?.name || "Official House",
      festival: "ZENITHROW Sports Festival 2026",
      date: r.published_at
        ? new Date(r.published_at).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "September 18, 2026",
      athleteName: participant?.name || "Official Athlete",
      chestNumber: participant?.chest_number || undefined,
      performance: formatPerformance(r.performance as unknown as Performance),
    };
  });

  return (
    <main className="pegasus-page pegasus-animate-fade" style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px 80px" }}>
      {/* Page Header */}
      <section className="pegasus-page__header" style={{ marginBottom: "32px" }}>
        <p className="zenith-kicker" style={{ marginBottom: "8px" }}>07 / ATHLETE COCKPIT</p>
        <h1 className="pegasus-page-title" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 900, textTransform: "uppercase" }}>Participant Dashboard</h1>
        <p className="pegasus-page__description">
          Official athlete telemetry, personal competition marks, house point
          contributions, and certified podium achievement records.
        </p>
      </section>

      {/* Search Input Utility */}
      <section style={{ marginBottom: "32px" }}>
        <MyResultSearchForm initialQuery={trimmedQuery} />
      </section>

      {/* Lookup State: Searched and Participant Found */}
      {trimmedQuery && participant && (
        <section style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          {/* 01. MY PROFILE & MY HOUSE */}
          <div
            className="zenith-surface-1 zenith-edge"
            style={{
              padding: "24px 28px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "28px",
              borderRadius: "var(--radius-medium)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Athlete Profile Column */}
            <div>
              <span className="zenith-kicker" style={{ display: "block", marginBottom: "8px" }}>
                01 // MY PROFILE
              </span>
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
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      fontWeight: 850,
                      padding: "3px 8px",
                      borderRadius: "var(--radius-micro)",
                      background: "var(--primary)",
                      color: "#FFFFFF",
                    }}
                  >
                    CHEST #{participant.chest_number}
                  </span>
                )}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                  }}
                >
                  {participant.public_id}
                </span>
                <span className="zenith-signal zenith-signal-verified">
                  <span className="zenith-signal-dot" />
                  CONFIRMED ATHLETE
                </span>
              </div>

              <h2
                style={{
                  fontSize: "26px",
                  fontWeight: 900,
                  margin: "0 0 6px",
                  textTransform: "uppercase",
                  color: "var(--text-primary)",
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
                  color: "var(--text-secondary)",
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase" }}>
                  {team?.name ?? "Unassigned House"}
                </span>
                <span>•</span>
                <span>{divisionName}</span>
              </div>
            </div>

            {/* My House Column */}
            <div
              style={{
                borderLeft: "1px solid var(--border)",
                paddingLeft: "24px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              <div>
                <span className="zenith-kicker" style={{ display: "block", marginBottom: "8px" }}>
                  02 // MY HOUSE
                </span>
                <h3
                  style={{
                    fontSize: "22px",
                    fontWeight: 850,
                    margin: 0,
                    textTransform: "uppercase",
                    color: "var(--text-primary)",
                  }}
                >
                  {team?.name || "Official House"}
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  House Championship Shield Standing
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
                <div>
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.08em", display: "block" }}>
                    SHIELD RANK
                  </span>
                  <span style={{ fontSize: "24px", fontFamily: "var(--font-mono)", fontWeight: 900, color: "var(--text-primary)" }}>
                    #{houseStanding?.rank || 1}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.08em", display: "block" }}>
                    HOUSE POINTS
                  </span>
                  <span style={{ fontSize: "24px", fontFamily: "var(--font-mono)", fontWeight: 900, color: "var(--primary)" }}>
                    {houseStanding?.points || 20} PTS
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 02. MY POINTS & SUMMARY METRICS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "16px",
            }}
          >
            <div className="zenith-surface-1 zenith-edge" style={{ padding: "18px 20px", borderRadius: "var(--radius-medium)", border: "1px solid var(--border)" }}>
              <span className="zenith-kicker" style={{ display: "block", fontSize: "10px" }}>
                MY ACCRUED POINTS
              </span>
              <strong style={{ fontSize: "28px", fontWeight: 900, fontFamily: "var(--font-mono)", color: "var(--primary)", display: "block", marginTop: "4px" }}>
                +{totalPoints} PTS
              </strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Authoritative points earned
              </span>
            </div>

            <div className="zenith-surface-1 zenith-edge" style={{ padding: "18px 20px", borderRadius: "var(--radius-medium)", border: "1px solid var(--border)" }}>
              <span className="zenith-kicker" style={{ display: "block", fontSize: "10px" }}>
                VERIFIED OUTCOMES
              </span>
              <strong style={{ fontSize: "28px", fontWeight: 900, fontFamily: "var(--font-mono)", color: "var(--text-primary)", display: "block", marginTop: "4px" }}>
                {publishedResults.length}
              </strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Final published marks
              </span>
            </div>

            <div className="zenith-surface-1 zenith-edge" style={{ padding: "18px 20px", borderRadius: "var(--radius-medium)", border: "1px solid var(--border)" }}>
              <span className="zenith-kicker" style={{ display: "block", fontSize: "10px" }}>
                PODIUM FINISHES
              </span>
              <strong style={{ fontSize: "28px", fontWeight: 900, fontFamily: "var(--font-mono)", color: "#F59E0B", display: "block", marginTop: "4px" }}>
                {achievements.filter((a) => typeof a.position === "number" && a.position <= 3).length}
              </strong>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                Medal positions
              </span>
            </div>
          </div>

          {/* 03. MY ACHIEVEMENTS (OFFICIAL POSTER GENERATION FLOW) */}
          <div>
            <div style={{ marginBottom: "16px" }}>
              <p className="zenith-kicker" style={{ marginBottom: "4px" }}>PODIUM & HONORS</p>
              <h3 style={{ fontSize: "20px", fontWeight: 850, margin: 0, textTransform: "uppercase", color: "var(--text-primary)" }}>
                My Achievements ({achievements.length})
              </h3>
            </div>

            {achievements.length === 0 ? (
              <div
                className="zenith-surface-1 zenith-edge"
                style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)", borderRadius: "var(--radius-medium)", border: "1px solid var(--border)" }}
              >
                No podium marks recorded yet. Achievements unlock upon published official finish.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="zenith-surface-1 zenith-edge"
                    style={{
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "16px",
                      borderRadius: "var(--radius-medium)",
                      border: "1px solid var(--border)",
                      borderLeft: "3px solid #F59E0B",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                        <span className="zenith-kicker">
                          {ach.competition}
                        </span>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: "var(--radius-micro)",
                            background: "rgba(245, 158, 11, 0.12)",
                            border: "1px solid rgba(245, 158, 11, 0.35)",
                            color: "#F59E0B",
                          }}
                        >
                          {typeof ach.position === "number" ? `#${ach.position} PODIUM` : ach.position}
                        </span>
                      </div>
                      <h4 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 4px", color: "var(--text-primary)" }}>
                        {ach.achievement}
                      </h4>
                      <p style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-secondary)", margin: 0 }}>
                        {ach.house} • {ach.festival} • {ach.date}
                      </p>
                      {ach.performance && (
                        <div
                          style={{
                            marginTop: "12px",
                            display: "inline-block",
                            padding: "4px 10px",
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-micro)",
                            fontFamily: "var(--font-mono)",
                            fontSize: "13px",
                            fontWeight: 750,
                            color: "var(--text-primary)",
                          }}
                        >
                          Mark: {ach.performance}
                        </div>
                      )}
                    </div>

                    <div style={{ paddingTop: "12px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", textTransform: "uppercase" }}>
                        CERTIFICATE READY
                      </span>
                      <AchievementPosterModal achievement={ach} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 04. MY RESULTS & COMPETITIONS */}
          <div>
            <div style={{ marginBottom: "16px" }}>
              <p className="pegasus-eyebrow">VERIFIED OUTCOMES</p>
              <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "2px 0 0" }}>
                My Competition Results
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

          {/* 05. NOTIFICATIONS */}
          <div className="pegasus-card p-6">
            <span className="font-mono text-xs font-bold text-[#5B9BD5] uppercase tracking-wider block mb-2">
              05 // NOTIFICATIONS & MARSHALING
            </span>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xs border border-white/10">
                <span className="text-[#5B9BD5] text-sm">ℹ</span>
                <div>
                  <strong className="text-sm font-bold text-[#1A3663] block">
                    Official Timing Certified
                  </strong>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your sprint and field marks have been audited by Chief Scorer and locked to the official tournament records.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xs border border-white/10">
                <span className="text-[#F2B84B] text-sm">★</span>
                <div>
                  <strong className="text-sm font-bold text-[#1A3663] block">
                    Podium Ceremony Assembly
                  </strong>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Medal presentation is scheduled at the Central Victory Stand. Check with House Manager for staging instructions.
                  </p>
                </div>
              </div>
            </div>
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

          <div style={{ marginTop: "12px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
            <span className="font-mono text-xs text-[#5B9BD5] uppercase font-bold block mb-2">
              QUICK ACCESS VERIFIED ATHLETES:
            </span>
            <div className="flex flex-wrap gap-2">
              <Link href="/my-result?q=PGS-0001" className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs font-mono text-[#F2B84B] border border-white/10 rounded-xs">
                PGS-0001 (Participant One · Gold)
              </Link>
              <Link href="/my-result?q=PGS-0002" className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs font-mono text-[#5B9BD5] border border-white/10 rounded-xs">
                PGS-0002 (Participant Two · Silver)
              </Link>
              <Link href="/my-result?q=PGS-0003" className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs font-mono text-[#E8EDF3] border border-white/10 rounded-xs">
                PGS-0003 (Participant Three)
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
