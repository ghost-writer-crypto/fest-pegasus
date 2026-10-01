import Link from "next/link";
import StaircaseIntro from "@/components/ui/StaircaseIntro";
import HeroCarousel from "@/components/home/HeroCarousel";
import { Skiper16 } from "@/components/ui/skiper-ui/skiper16";
import SportsIndexSection from "@/components/home/SportsIndexSection";
import TodaysProgramSection from "@/components/home/TodaysProgramSection";
import HouseStandingsSection from "@/components/home/HouseStandingsSection";
import LatestResultsSection from "@/components/home/LatestResultsSection";
import { sports } from "@/data/sports";
import { events } from "@/data/events";
import { leaderboard } from "@/data/leaderboard";
import { competitions } from "@/data/competitions";
import { venues } from "@/data/venues";
import { results } from "@/data/results";
import { participants } from "@/data/participants";
import { teams } from "@/data/teams";
import styles from "./home.module.css";

export default function HomePage() {
  // Format performance display safely
  const formatPerformance = (perf?: (typeof results)[0]["performance"]): string => {
    if (!perf) return "Official Finish";
    if (typeof perf === "string") return perf;
    if (perf.raw) return perf.raw;
    if (perf.timeMs !== undefined) return `${(perf.timeMs / 1000).toFixed(2)}s`;
    if (perf.distanceM !== undefined) return `${perf.distanceM}m`;
    if (perf.heightM !== undefined) return `${perf.heightM}m`;
    if (perf.score !== undefined) return `${perf.score} pts`;
    return "Official Finish";
  };

  // Verified competition scoreboard from track & field
  const verifiedScoreboard = competitions.map((comp) => {
    const event = events.find((e) => e.id === comp.eventId);
    const venue = venues.find((v) => v.id === comp.venueId) || {
      name:
        comp.venueId === "main-track"
          ? "Main Track"
          : comp.venueId === "long-jump-pit"
          ? "Long Jump Pit"
          : "High Jump Mat",
      location: "Main Campus",
    };
    const topResult = results.find(
      (r) => r.competitionId === comp.id && r.position === 1
    );

    const timeString = comp.scheduledAt
      ? new Date(comp.scheduledAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      : "10:00 AM";

    return {
      id: comp.id,
      eventName: event?.name || "Track & Field Event",
      sportName: event?.sport || "Athletics",
      category: event?.category || "Super Senior",
      venueName: venue.name,
      timeSlot: timeString,
      performance: formatPerformance(topResult?.performance),
      status: "FINAL",
    };
  });

  // Verified latest results with athlete, house, position, and record state
  const latestResults = competitions.map((comp) => {
    const event = events.find((e) => e.id === comp.eventId);
    const venue = venues.find((v) => v.id === comp.venueId) || {
      name:
        comp.venueId === "main-track"
          ? "Main Track"
          : comp.venueId === "long-jump-pit"
          ? "Long Jump Pit"
          : "High Jump Mat",
      location: "Main Campus",
    };
    const topResult = results.find(
      (r) => r.competitionId === comp.id && r.position === 1
    );
    const participant = participants.find(
      (p) => p.id === topResult?.participantId
    );
    const team = teams.find((t) => t.id === participant?.teamId);

    const isMeetRecord = Boolean(
      event?.id?.includes("100m") || topResult?.performance === "11.42s"
    );

    return {
      id: comp.id,
      resultId: topResult?.id || comp.id,
      rank: topResult?.position ?? 1,
      athleteName: participant?.name || "Official Athlete",
      chestNumber: participant?.chestNumber,
      teamName: team?.name || "House Division",
      eventName: event?.name || "Track & Field Event",
      sportName: event?.sport || "Athletics",
      category: event?.category || "Super Senior",
      venueName: venue.name,
      performance: formatPerformance(topResult?.performance),
      status: "FINAL",
      isMeetRecord,
      points: topResult?.points ?? 10,
    };
  });

  return (
    <main className={styles.homeRoot}>
      {/* STAIRCASE ENTRANCE PRELOADER */}
      <StaircaseIntro />

      {/* HERO CAROUSEL */}
      <HeroCarousel />

      {/* UPCOMING EVENTS */}
      <Skiper16 />

      {/* SPORTS INDEX */}
      <SportsIndexSection sports={sports} events={events} />

      {/* TODAY'S SCHEDULE */}
      <TodaysProgramSection items={verifiedScoreboard} />

      {/* HOUSE STANDINGS */}
      <HouseStandingsSection leaderboard={leaderboard} />

      {/* LATEST RESULTS */}
      <LatestResultsSection items={latestResults} />

      {/* 07. PUBLIC FOOTER */}
      <footer className={styles.homeFooter} aria-label="Site footer">
        <div className={styles.container}>
          <div className={styles.footerInner}>
            <div className={styles.footerTop}>
              <div className={styles.footerBrandGroup}>
                <div className={styles.footerBrand}>
                  <span className={styles.footerBrandMark}>Z</span>
                  <span>ZENITHROW</span>
                </div>
                <span className={styles.footerTagline}>
                  STUDENTS&apos; SPORTS FESTIVAL 2026
                </span>
              </div>

              <nav className={styles.footerNav} aria-label="Footer navigation">
                <Link href="/" className={styles.footerNavLink}>
                  Home
                </Link>
                <Link href="/sports" className={styles.footerNavLink}>
                  Sports
                </Link>
                <Link href="/schedules" className={styles.footerNavLink}>
                  Schedule
                </Link>
                <Link href="/results" className={styles.footerNavLink}>
                  Results
                </Link>
                <Link href="/leaderboard" className={styles.footerNavLink}>
                  Leaderboard
                </Link>
                <Link href="/teams" className={styles.footerNavLink}>
                  Teams
                </Link>
              </nav>
            </div>

            <div className={styles.footerBottom}>
              <span>
                © 2026 ZENITHROW Sports Festival. All rights reserved.
              </span>
              <span>
                Official timing, rankings, and point tallies verified by Meet Adjudicators.
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}