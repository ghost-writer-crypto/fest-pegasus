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
      festival: "Pegasus Sports Festival 2026",
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
    <main className="pegasus-page pegasus-atmosphere pegasus-atmosphere--my-result pegasus-animate-fade">
      {/* Page Header */}
      <section className="pegasus-page__header">
        <p className="pegasus-eyebrow">MY PEGASUS // ATHLETE COMMAND OS</p>
        <h1 className="pegasus-page-title">Participant Dashboard</h1>
        <p className="pegasus-page__description">
          Official athlete telemetry, personal competition marks, house point
          contributions, and official podium achievement posters.
        </p>
      </section>

      {/* Search Input Utility */}
      <section style={{ marginBottom: "32px" }}>
        <MyResultSearchForm initialQuery={trimmedQuery} />
      </section>

      {/* Lookup State: Searched and Participant Found */}
      {trimmedQuery && participant && (
        <section style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* 01. MY PROFILE & MY HOUSE */}
          <div
            className="pegasus-card"
            style={{
              padding: "28px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
              border: "1px solid var(--border)",
              background: "var(--surface)",
            }}
          >
            {/* Athlete Profile Column */}
            <div>
              <span className="font-mono text-xs font-bold text-[#5B9BD5] uppercase tracking-wider block mb-2">
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
                  <span className="pegasus-chest-badge font-mono">
                    CHEST #{participant.chest_number}
                  </span>
                )}
                <span className="pegasus-participant-card__id font-mono">
                  {participant.public_id}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase bg-[#1A3663] text-white rounded-xs">
                  CONFIRMED ATHLETE
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
                <span className="font-semibold text-[#1A3663]">{team?.name ?? "Unassigned Team"}</span>
                <span>•</span>
                <span>{divisionName}</span>
              </div>
            </div>

            {/* My House Column */}
            <div className="border-t sm:border-t-0 sm:border-l border-white/10 sm:pl-6 pt-4 sm:pt-0 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-[#5B9BD5] uppercase tracking-wider block mb-2">
                  02 // MY HOUSE
                </span>
                <h3 className="text-xl font-extrabold text-[#1A3663]">
                  {team?.name || "Official House"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  House Championship Shield Standing
                </p>
              </div>

              <div className="flex items-center gap-6 mt-4">
                <div>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                    Shield Rank
                  </span>
                  <span className="text-2xl font-mono font-black text-[#F2B84B]">
                    #{houseStanding?.rank || 1}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                    House Points
                  </span>
                  <span className="text-2xl font-mono font-black text-[#1A3663]">
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
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            <div className="pegasus-card" style={{ padding: "16px 20px" }}>
              <span className="font-mono text-[10px] font-bold text-[#5B9BD5] uppercase tracking-wider block">
                MY ACCRUED POINTS
              </span>
              <strong className="text-3xl font-black font-mono text-[#E53737] block mt-1">
                +{totalPoints} PTS
              </strong>
              <span className="text-[11px] text-muted-foreground">
                Authoritative points earned
              </span>
            </div>

            <div className="pegasus-card" style={{ padding: "16px 20px" }}>
              <span className="font-mono text-[10px] font-bold text-[#5B9BD5] uppercase tracking-wider block">
                VERIFIED OUTCOMES
              </span>
              <strong className="text-3xl font-black font-mono text-[#1A3663] block mt-1">
                {publishedResults.length}
              </strong>
              <span className="text-[11px] text-muted-foreground">
                Final published marks
              </span>
            </div>

            <div className="pegasus-card" style={{ padding: "16px 20px" }}>
              <span className="font-mono text-[10px] font-bold text-[#5B9BD5] uppercase tracking-wider block">
                PODIUM FINISHES
              </span>
              <strong className="text-3xl font-black font-mono text-[#F2B84B] block mt-1">
                {achievements.filter((a) => typeof a.position === "number" && a.position <= 3).length}
              </strong>
              <span className="text-[11px] text-muted-foreground">
                Medal positions
              </span>
            </div>
          </div>

          {/* 03. MY ACHIEVEMENTS (OFFICIAL POSTER GENERATION FLOW) */}
          <div>
            <div style={{ marginBottom: "16px" }}>
              <p className="pegasus-eyebrow">PODIUM & HONORS</p>
              <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "2px 0 0" }}>
                My Achievements ({achievements.length})
              </h3>
            </div>

            {achievements.length === 0 ? (
              <div
                className="pegasus-card"
                style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}
              >
                No podium marks recorded yet. Achievements unlock upon published official finish.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((ach) => (
                  <div
                    key={ach.id}
                    className="pegasus-card"
                    style={{
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "16px",
                      border: "1px solid rgba(242, 184, 75, 0.3)",
                      background: "rgba(15, 34, 66, 0.03)",
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-[#5B9BD5] uppercase tracking-wider">
                          {ach.competition}
                        </span>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#F2B84B]/15 text-[#b07d1d] border border-[#F2B84B]/40 rounded-xs">
                          {typeof ach.position === "number" ? `#${ach.position} PODIUM` : ach.position}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-[#1A3663] mb-1">
                        {ach.achievement}
                      </h4>
                      <p className="text-xs font-mono text-[#64748B]">
                        {ach.house} • {ach.festival} • {ach.date}
                      </p>
                      {ach.performance && (
                        <div className="mt-3 inline-block px-3 py-1 bg-white border border-[#E8EDF3] rounded-xs font-mono text-sm font-bold text-[#1A3663]">
                          Mark: {ach.performance}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#E8EDF3] flex items-center justify-between">
                      <span className="text-[11px] font-mono text-muted-foreground uppercase">
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
