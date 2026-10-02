import type { Metadata } from "next";
import Link from "next/link";
import {
  getParticipantByPublicId,
  getParticipantByChestNumber,
  getTeamById,
  getPublishedResultsByParticipant,
  getEventById,
  getSchedulesByFestival,
  getActiveFestival,
  type ParticipantRow,
  type TeamRow,
  type EventRow,
  type ResultRow,
  type ScheduleRow,
} from "@/lib/repositories";
import { getOrCreateQrIdentity } from "@/lib/repositories/qrRepository";
import { generateQrSvgString } from "@/lib/qr/qrMatrix";
import { CODEX_DIVISIONS } from "@/lib/competition/divisions";
import { formatPerformance } from "@/lib/results/resultStatus";
import type { Performance } from "@/lib/types";
import { leaderboard } from "@/data/leaderboard";
import { participants as staticParticipants } from "@/data/participants";
import { events as staticEvents } from "@/data/events";
import { results as staticResults } from "@/data/results";
import AchievementPosterModal from "@/components/achievements/AchievementPosterModal";
import AthleteAccreditationBadge, {
  type HouseTheme,
} from "@/components/athlete/AthleteAccreditationBadge";
import MyResultSearchForm from "./MyResultSearchForm";
import Footer from "@/components/Footer";
import styles from "@/components/athlete/athletePass.module.css";
import {
  Trophy,
  Medal,
  Award,
  Flame,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Athlete Accreditation Pass • ZENITHROW Sports Festival 2026",
  description:
    "Official digital athlete accreditation pass, scannable QR verification, verified competition marks, and podium certificates for ZENITHROW 2026.",
};

type MyResultPageProps = {
  searchParams: Promise<{ q?: string }>;
};

function resolveHouseTheme(
  team: TeamRow | null | undefined,
  fallbackTeamId?: string | null
): HouseTheme {
  const name = `${team?.name || ""} ${fallbackTeamId || ""}`.toLowerCase();
  const code = (team?.code || "").toUpperCase();

  if (
    name.includes("garuda") ||
    name.includes("house 01") ||
    name.includes("falcons") ||
    code === "GAR"
  ) {
    return {
      name: "Garuda",
      code: "GAR",
      gradient: "linear-gradient(135deg, #b91c1c, #d97706)",
      primaryColor: "#ef4444",
      icon: "🦅",
      motto: "The Fire Soaring High",
    };
  }
  if (
    name.includes("toofan") ||
    name.includes("house 02") ||
    name.includes("titans") ||
    code === "TOF"
  ) {
    return {
      name: "Toofan",
      code: "TOF",
      gradient: "linear-gradient(135deg, #0284c7, #06b6d4)",
      primaryColor: "#38bdf8",
      icon: "⚡",
      motto: "The Storm Unstoppable",
    };
  }
  if (
    name.includes("tiburon") ||
    name.includes("house 03") ||
    name.includes("phoenix") ||
    code === "TIB"
  ) {
    return {
      name: "Tiburon",
      code: "TIB",
      gradient: "linear-gradient(135deg, #059669, #0d9488)",
      primaryColor: "#10b981",
      icon: "🦈",
      motto: "The Deep Tide Striking",
    };
  }
  if (
    name.includes("trojan") ||
    name.includes("house 04") ||
    name.includes("warriors") ||
    code === "TRJ"
  ) {
    return {
      name: "Trojan",
      code: "TRJ",
      gradient: "linear-gradient(135deg, #7c3aed, #d97706)",
      primaryColor: "#a855f7",
      icon: "🛡️",
      motto: "The Unbreakable Bastion",
    };
  }

  return {
    name: team?.name || "Garuda",
    code: team?.code || "GAR",
    gradient: "linear-gradient(135deg, #b91c1c, #d97706)",
    primaryColor: "#ef4444",
    icon: "🦅",
    motto: "The Fire Soaring High",
  };
}

function getRankBadge(rank: number | null, disposition: string) {
  if (disposition && disposition !== "normal") {
    return {
      label: disposition.toUpperCase(),
      className: styles.rankBadgeNormal,
    };
  }
  if (!rank) {
    return {
      label: "Pending",
      className: styles.rankBadgeNormal,
    };
  }
  if (rank === 1) {
    return {
      label: "Gold #01",
      className: styles.rankBadgeGold,
    };
  }
  if (rank === 2) {
    return {
      label: "Silver #02",
      className: styles.rankBadgeSilver,
    };
  }
  if (rank === 3) {
    return {
      label: "Bronze #03",
      className: styles.rankBadgeBronze,
    };
  }
  return {
    label: `Rank #${rank}`,
    className: styles.rankBadgeNormal,
  };
}

export default async function MyResultPage({ searchParams }: MyResultPageProps) {
  const { q } = await searchParams;
  const trimmedQuery = q ? q.trim() : "";

  let participant: ParticipantRow | null = null;
  let team: TeamRow | null = null;
  let publishedResults: ResultRow[] = [];
  let eventMap = new Map<string, EventRow | null>();
  let festivalSchedules: ScheduleRow[] = [];
  let qrSvgString = "";
  let verificationUrl = "";

  if (trimmedQuery) {
    try {
      const cleanQ = trimmedQuery;

      // 1. Authoritative lookup by public identifier (supports ZNT- and legacy prefix)
      participant = await getParticipantByPublicId(cleanQ);
      if (!participant && cleanQ.toUpperCase().startsWith("ZNT-")) {
        participant = await getParticipantByPublicId(
          cleanQ.toUpperCase().replace("ZNT-", "PGS-")
        );
      }
      if (!participant && cleanQ.toUpperCase().startsWith("ZENITH-")) {
        participant = await getParticipantByPublicId(
          cleanQ.toUpperCase().replace("ZENITH-", "PGS-")
        );
      }

      // 2. Secondary lookup by chest number if not resolved by public ID
      if (!participant) {
        participant = await getParticipantByChestNumber(cleanQ);
      }

      if (participant) {
        // Fetch team metadata safely
        if (participant.team_id) {
          try {
            team = await getTeamById(participant.team_id);
          } catch {
            team = null;
          }
        }

        // Fetch published results safely with static fallback
        try {
          publishedResults = await getPublishedResultsByParticipant(participant.id);
        } catch {
          publishedResults = [];
        }

        if (publishedResults.length === 0) {
          const fallbackMatches = staticResults.filter(
            (r) =>
              r.participantId === participant?.id ||
              r.participantId === participant?.public_id ||
              r.participantId === participant?.chest_number
          );

          if (fallbackMatches.length > 0) {
            publishedResults = fallbackMatches.map((r) => ({
              id: r.id,
              festival_id: "fest-2026",
              event_id: r.eventId,
              competition_id: r.competitionId || null,
              fixture_id: r.fixtureId || null,
              participant_id: r.participantId || null,
              team_id: r.teamId || null,
              rank: r.position || null,
              points: Number(r.points || 0),
              performance: (typeof r.performance === "string"
                ? { raw: r.performance, mark: r.performance }
                : (r.performance ?? {})) as Record<string, unknown>,
              disposition: r.disposition || "normal",
              status: "published",
              is_official: true,
              published_at: r.publishedAt || "2026-09-18T16:00:00Z",
              created_at: r.createdAt || "2026-09-18T15:30:00Z",
              updated_at: r.updatedAt || "2026-09-18T16:00:00Z",
            }));
          }
        }

        // Fetch festival schedules for enrolled events
        try {
          const festival = await getActiveFestival();
          if (festival) {
            festivalSchedules = await getSchedulesByFestival(festival.id).catch(() => []);
          }
        } catch {
          festivalSchedules = [];
        }

        // Resolve event names for results
        const distinctEventIds = Array.from(
          new Set(publishedResults.map((r) => r.event_id))
        );
        const eventEntries = await Promise.all(
          distinctEventIds.map(async (eventId) => {
            try {
              const ev = await getEventById(eventId);
              return [eventId, ev] as const;
            } catch {
              return [eventId, null] as const;
            }
          })
        );
        eventMap = new Map<string, EventRow | null>(eventEntries);

        // Generate or resolve official QR identity
        try {
          const qrIdentity = await getOrCreateQrIdentity("participant", participant.id);
          verificationUrl = `/qr/${qrIdentity.qr_token}`;
          qrSvgString = generateQrSvgString(verificationUrl, {
            size: 180,
            margin: 2,
            darkColor: "#0f172a",
            lightColor: "#ffffff",
          });
        } catch (qrErr) {
          console.warn("[MyResultPage] Error generating QR identity:", qrErr);
          verificationUrl = `/my-result?q=${encodeURIComponent(participant.public_id)}`;
          qrSvgString = generateQrSvgString(verificationUrl, {
            size: 180,
            margin: 2,
            darkColor: "#0f172a",
            lightColor: "#ffffff",
          });
        }
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
          d.name.toLowerCase() === participant?.division_id?.toLowerCase()
      )
    : null;
  const divisionName =
    division?.name ?? participant?.division_id ?? "Super Senior Division";

  // Resolve official collegiate house theme
  const houseTheme = resolveHouseTheme(team, participant?.team_id);

  // Accrued metrics
  const totalPoints = publishedResults.reduce(
    (acc, r) => acc + (r.points || 0),
    0
  );
  const houseStanding = leaderboard.find(
    (l) =>
      l.id === team?.id ||
      l.name.toLowerCase() === houseTheme.name.toLowerCase() ||
      l.name.toLowerCase() === team?.name?.toLowerCase()
  );

  // Achievements for certificate generation modal
  const achievements = publishedResults.map((r) => {
    const ev =
      eventMap.get(r.event_id) ||
      staticEvents.find((e) => e.id === r.event_id);
    const pos = r.rank ?? 1;
    const medal =
      pos === 1
        ? "Gold Medalist"
        : pos === 2
        ? "Silver Medalist"
        : pos === 3
        ? "Bronze Medalist"
        : `Finisher Rank #${pos}`;
    const perfString =
      formatPerformance(r.performance as unknown as Performance) ||
      (typeof r.performance === "object" && r.performance !== null
        ? ((r.performance as Record<string, unknown>).raw as string) ||
          ((r.performance as Record<string, unknown>).mark as string) ||
          ""
        : "");
    return {
      id: `ach-${r.id}`,
      achievement: `${ev?.name || "Championship Event"} ${medal}`,
      competition: ev?.name || "Championship Event",
      position: pos,
      house: houseTheme.name,
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
      performance: perfString,
    };
  });

  // Enrolled events (excluding any basketball or chess strictly)
  const staticMatch = staticParticipants.find(
    (p) =>
      p.id === participant?.id ||
      p.publicId === participant?.public_id ||
      p.chestNumber === participant?.chest_number
  );
  const participantWithEvents = participant as
    | (ParticipantRow & { registeredEventIds?: string[] })
    | null;
  const registeredEventIds: string[] =
    participantWithEvents?.registeredEventIds || staticMatch?.eventIds || [];

  type EnrolledEventItem = {
    id: string;
    name: string;
    sport: string;
    category?: string;
  };

  const enrolledEvents: EnrolledEventItem[] = registeredEventIds
    .map((id: string): EnrolledEventItem => {
      const match = staticEvents.find((e) => e.id === id);
      if (match) {
        return {
          id: match.id,
          name: match.name,
          sport: match.sport || "Athletics",
          category: match.category,
        };
      }
      return {
        id,
        name: id
          .split("-")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        sport: "Athletics",
        category: "Championship",
      };
    })
    .filter((e: EnrolledEventItem) => {
      const name = e.name.toLowerCase();
      const sport = (e.sport || "").toLowerCase();
      return (
        !name.includes("basketball") &&
        !name.includes("chess") &&
        !sport.includes("basketball") &&
        !sport.includes("chess")
      );
    });

  return (
    <div className={styles.pageContainer}>
      <main className={styles.mainContent}>
        {/* Page Header */}
        <section className={styles.pageHeader}>
          <p className={styles.kicker}>
            <span className={styles.kickerDot} />
            01 • ATHLETE ACCREDITATION PASS
          </p>
          <h1 className={styles.pageTitle}>Athlete Credential Pass</h1>
          <p className={styles.pageDescription}>
            Official athlete accreditation card, scannable QR verification pass,
            registered event heats, and certified podium marks for ZENITHROW 2026.
          </p>
        </section>

        {/* Search Input Utility */}
        <section className={styles.searchSection}>
          <MyResultSearchForm initialQuery={trimmedQuery} />
        </section>

        {/* 1. STATE: Searched & Athlete Found */}
        {trimmedQuery && participant && (
          <div className={styles.athleteCockpit}>
            {/* Top Grid: Credential Card & Performance Telemetry */}
            <div className={styles.passCardWrapper}>
              {/* Flagship Digital Accreditation Card */}
              <AthleteAccreditationBadge
                athlete={{
                  id: participant.id,
                  publicId: participant.public_id,
                  chestNumber: participant.chest_number,
                  name: participant.name,
                  divisionName,
                  status: participant.status,
                }}
                house={houseTheme}
                qrSvg={qrSvgString}
                verificationUrl={verificationUrl}
              />

              {/* Right Column: Telemetry Strip & Collegiate House Card */}
              <div className={styles.telemetryColumn}>
                {/* 4-Stat Telemetry Strip */}
                <div className={styles.telemetryGrid}>
                  <div className={styles.telemetryCard}>
                    <div>
                      <span className={styles.telemetryLabel}>
                        <Flame size={14} style={{ color: "#38bdf8" }} />
                        CHAMPIONSHIP POINTS
                      </span>
                      <div
                        className={styles.telemetryValue}
                        style={{ color: "#38bdf8" }}
                      >
                        +{totalPoints} PTS
                      </div>
                    </div>
                    <span className={styles.telemetrySubtext}>
                      Ratified points contributed to {houseTheme.name}
                    </span>
                  </div>

                  <div className={styles.telemetryCard}>
                    <div>
                      <span className={styles.telemetryLabel}>
                        <CheckCircle2 size={14} style={{ color: "#10b981" }} />
                        VERIFIED OUTCOMES
                      </span>
                      <div className={styles.telemetryValue}>
                        {publishedResults.length}
                      </div>
                    </div>
                    <span className={styles.telemetrySubtext}>
                      Official marks certified by Chief Scorer
                    </span>
                  </div>

                  <div className={styles.telemetryCard}>
                    <div>
                      <span className={styles.telemetryLabel}>
                        <Trophy size={14} style={{ color: "#f59e0b" }} />
                        PODIUM MEDALS
                      </span>
                      <div
                        className={styles.telemetryValue}
                        style={{ color: "#f59e0b" }}
                      >
                        {
                          achievements.filter(
                            (a) => typeof a.position === "number" && a.position <= 3
                          ).length
                        }
                      </div>
                    </div>
                    <span className={styles.telemetrySubtext}>
                      Championship Gold, Silver, or Bronze
                    </span>
                  </div>

                  <div className={styles.telemetryCard}>
                    <div>
                      <span className={styles.telemetryLabel}>
                        <Award size={14} style={{ color: "#a855f7" }} />
                        REGISTERED EVENTS
                      </span>
                      <div className={styles.telemetryValue}>
                        {enrolledEvents.length}
                      </div>
                    </div>
                    <span className={styles.telemetrySubtext}>
                      Active competition draws & disciplines
                    </span>
                  </div>
                </div>

                {/* House Alliance Card */}
                <div className={styles.houseAllianceCard}>
                  <div className={styles.houseDetails}>
                    <div
                      className={styles.houseShieldIcon}
                      style={{ background: houseTheme.gradient }}
                    >
                      {houseTheme.icon}
                    </div>
                    <div>
                      <h3 className={styles.houseName}>
                        {houseTheme.name} House
                      </h3>
                      <p className={styles.houseMotto}>{houseTheme.motto}</p>
                    </div>
                  </div>

                  <div className={styles.houseStandingBlock}>
                    <div className={styles.houseStatItem}>
                      <span className={styles.houseStatLabel}>SHIELD RANK</span>
                      <span
                        className={styles.houseStatValue}
                        style={{ color: houseTheme.primaryColor }}
                      >
                        #{houseStanding?.rank || 1} OVERALL
                      </span>
                    </div>
                    <div className={styles.houseStatItem}>
                      <span className={styles.houseStatLabel}>HOUSE TOTAL</span>
                      <span className={styles.houseStatValue}>
                        {houseStanding?.points || 74} PTS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Marshaling & Field Room Guidelines */}
                <div className={styles.marshalingNotice}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginBottom: "4px",
                    }}
                  >
                    <ShieldCheck size={18} style={{ color: "#38bdf8" }} />
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "15px",
                        fontWeight: 800,
                        textTransform: "uppercase",
                        color: "#f8fafc",
                      }}
                    >
                      Field Marshaling & Call Room Protocol
                    </h3>
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "#94a3b8",
                      lineHeight: 1.5,
                    }}
                  >
                    Follow these mandatory steps before entering the arena or
                    starting blocks:
                  </p>

                  <div className={styles.protocolGrid}>
                    <div className={styles.protocolCard}>
                      <span className={styles.protocolNumber}>STEP 01</span>
                      <h4 className={styles.protocolTitle}>QR Check-In</h4>
                      <p className={styles.protocolDesc}>
                        Present your digital pass QR code to the Call Room Marshal
                        20 minutes prior to your heat.
                      </p>
                    </div>

                    <div className={styles.protocolCard}>
                      <span className={styles.protocolNumber}>STEP 02</span>
                      <h4 className={styles.protocolTitle}>Chest Number Affix</h4>
                      <p className={styles.protocolDesc}>
                        Ensure your assigned chest badge (
                        <strong>#{participant.chest_number || "REG"}</strong>)
                        is pinned securely to the front of your jersey.
                      </p>
                    </div>

                    <div className={styles.protocolCard}>
                      <span className={styles.protocolNumber}>STEP 03</span>
                      <h4 className={styles.protocolTitle}>Spikes & Gear Audit</h4>
                      <p className={styles.protocolDesc}>
                        Track spikes must not exceed 9mm pyramid needles. Clean
                        non-marking indoor shoes for court events.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Registered Events & Draw Card */}
            <div>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  Enrolled Events & Fixture Draws
                </h3>
                <span className={styles.sectionBadge}>
                  {enrolledEvents.length} DISCIPLINES
                </span>
              </div>

              {enrolledEvents.length === 0 ? (
                <div
                  style={{
                    padding: "32px",
                    textAlign: "center",
                    background: "rgba(18, 26, 43, 0.7)",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#94a3b8",
                  }}
                >
                  No active events currently assigned for this athlete profile.
                </div>
              ) : (
                <div className={styles.eventsGrid}>
                  {enrolledEvents.map((evt) => {
                    const sched = festivalSchedules.find(
                      (s) => s.event_id === evt.id
                    );
                    const isLive = sched?.status === "live";
                    const isDone = sched?.status === "finished";

                    return (
                      <div key={evt.id} className={styles.eventCard}>
                        <div>
                          <div className={styles.eventCardHeader}>
                            <div>
                              <span className={styles.eventSportTag}>
                                {evt.sport || "Athletics"}
                              </span>
                              <h4 className={styles.eventName}>{evt.name}</h4>
                            </div>

                            <span
                              className={`${styles.eventStatusBadge} ${
                                isLive
                                  ? styles.eventStatusLive
                                  : isDone
                                  ? styles.eventStatusCompleted
                                  : styles.eventStatusScheduled
                              }`}
                            >
                              {isLive ? "LIVE NOW" : isDone ? "COMPLETED" : "SCHEDULED"}
                            </span>
                          </div>
                        </div>

                        <div className={styles.eventDetailsRow}>
                          <div className={styles.eventDetailItem}>
                            <MapPin size={13} style={{ color: "#38bdf8" }} />
                            <span>
                              {sched?.venue_id === "main-ground"
                                ? "Main Stadium"
                                : sched?.venue_id === "athletics-track"
                                ? "Athletics Track"
                                : "Main Arena"}
                            </span>
                          </div>
                          <div className={styles.eventDetailItem}>
                            <Clock size={13} style={{ color: "#94a3b8" }} />
                            <span>
                              {sched?.starts_at
                                ? new Date(sched.starts_at).toLocaleTimeString(
                                    [],
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                    }
                                  )
                                : "Session Draw"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Ratified Results & Podium Achievements */}
            <div>
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>
                  Certified Competition Marks & Results
                </h3>
                <span className={styles.sectionBadge}>
                  {publishedResults.length} RATIFIED
                </span>
              </div>

              {publishedResults.length === 0 ? (
                <div
                  style={{
                    padding: "36px 24px",
                    textAlign: "center",
                    background: "rgba(18, 26, 43, 0.7)",
                    borderRadius: "14px",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "14px",
                      color: "#94a3b8",
                      margin: "0 0 6px 0",
                    }}
                  >
                    No published results recorded yet for this athlete.
                  </p>
                  <span style={{ fontSize: "12px", color: "#64748b" }}>
                    Official event outcomes appear here as soon as they are
                    audited and signed off by the Chief Scorer.
                  </span>
                </div>
              ) : (
                <div className={styles.resultsGrid}>
                  {publishedResults.map((res) => {
                    const ev =
                      eventMap.get(res.event_id) ||
                      staticEvents.find((e) => e.id === res.event_id);
                    const eventName = ev?.name || "100m Sprint Grand Final";
                    const rankInfo = getRankBadge(res.rank, res.disposition);
                    const perfText =
                      formatPerformance(
                        res.performance as unknown as Performance
                      ) ||
                      (typeof res.performance === "object" && res.performance !== null
                        ? ((res.performance as Record<string, unknown>).raw as string) ||
                          ((res.performance as Record<string, unknown>).mark as string) ||
                          ""
                        : "");
                    const ach = achievements.find(
                      (a) => a.id === `ach-${res.id}`
                    );

                    const cardVariant =
                      res.rank === 1
                        ? styles.resultCardGold
                        : res.rank === 2
                        ? styles.resultCardSilver
                        : res.rank === 3
                        ? styles.resultCardBronze
                        : styles.resultCardFinisher;

                    return (
                      <div
                        key={res.id}
                        className={`${styles.resultCard} ${cardVariant}`}
                      >
                        <div>
                          <div className={styles.resultTopRow}>
                            <div>
                              <h4 className={styles.resultEventTitle}>
                                {eventName}
                              </h4>
                              <p className={styles.resultDateText}>
                                {res.published_at
                                  ? new Date(
                                      res.published_at
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : "Official Finish"}
                              </p>
                            </div>

                            <span className={rankInfo.className}>
                              {res.rank === 1 ? (
                                <Trophy size={13} />
                              ) : res.rank === 2 || res.rank === 3 ? (
                                <Medal size={13} />
                              ) : null}
                              {rankInfo.label}
                            </span>
                          </div>

                          <div style={{ marginTop: "12px" }}>
                            <span className={styles.resultMarkPill}>
                              Mark: {perfText || "Ratified Finish"}
                            </span>
                          </div>
                        </div>

                        <div className={styles.resultBottomRow}>
                          <span className={styles.pointsEarned}>
                            +{res.points} House Points
                          </span>

                          {ach && <AchievementPosterModal achievement={ach} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. STATE: Searched but Competitor Not Found */}
        {trimmedQuery && !participant && (
          <div className={styles.emptyStateCard}>
            <div className={styles.emptyStateIcon}>
              <AlertCircle size={28} />
            </div>
            <h2 className={styles.emptyStateTitle}>
              Athlete Accreditation Not Found
            </h2>
            <p className={styles.emptyStateText}>
              We couldn&apos;t locate any registered athlete matching &ldquo;
              <strong>{trimmedQuery}</strong>&rdquo;. Please verify your assigned
              chest number (e.g. <strong>1001</strong>, <strong>1002</strong>) or
              official public accreditation code.
            </p>

            <div className={styles.emptyStateActions}>
              <Link href="/my-result" className={styles.primaryAction}>
                <Search size={14} />
                <span>Try Another Lookup</span>
              </Link>
              <Link href="/teams" className={styles.secondaryAction}>
                <span>View Collegiate Squads →</span>
              </Link>
            </div>
          </div>
        )}

        {/* 3. STATE: Default Landing (No query entered yet) */}
        {!trimmedQuery && (
          <div className={styles.emptyStateCard}>
            <div className={styles.emptyStateIcon}>
              <Sparkles size={28} />
            </div>
            <h2 className={styles.emptyStateTitle}>
              Access Your Digital Athlete Credential
            </h2>
            <p className={styles.emptyStateText}>
              Athletes, team managers, and field judges can lookup official
              accreditation credentials, verified competition marks, and personal
              podium certificates directly. Enter your assigned chest number
              or accreditation ID above to generate your digital pass.
            </p>

            <div className={styles.emptyStateActions}>
              <Link href="/my-result?q=1001" className={styles.primaryAction}>
                <Trophy size={14} />
                <span>Demo Pass • #1001 (Gold Medalist)</span>
              </Link>
              <Link href="/leaderboard" className={styles.secondaryAction}>
                <span>View Championship Shield →</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
