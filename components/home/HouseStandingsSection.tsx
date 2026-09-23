"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import styles from "./HouseStandingsSection.module.css";

export interface LeaderboardEntry {
  id: string;
  name: string;
  code?: string;
  points: number;
  rank: number;
}

interface HouseStandingsSectionProps {
  leaderboard: LeaderboardEntry[];
}

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export default function HouseStandingsSection({
  leaderboard,
}: HouseStandingsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasCalibrated, setHasCalibrated] = useState(false);

  const isReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  useEffect(() => {
    if (isReducedMotion) return;

    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasCalibrated(true);
          observer.unobserve(el);
        }
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isReducedMotion]);

  const isCalibrated = isReducedMotion || hasCalibrated;
  const maxPoints = Math.max(...leaderboard.map((t) => t.points), 1);

  return (
    <section
      ref={sectionRef}
      className={`${styles.sectionWrap} ${
        isCalibrated ? styles.calibrated : styles.pending
      }`}
      aria-labelledby="standings-heading"
    >
      <div className={styles.stickyStage}>
        <div className={styles.container}>
          {/* Section Header */}
          <div className={styles.sectionHeader}>
            <div className={styles.headerTextGroup}>
              <p className={styles.sectionKicker}>06 / CHAMPIONSHIP RADAR</p>
              <h2 id="standings-heading" className={styles.sectionTitle}>
                HOUSE STANDINGS
              </h2>
            </div>

            <Link href="/leaderboard" className={styles.sectionLink}>
              <span>Full Points Table</span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>

          {/* Architectural Line Divider */}
          <div className={styles.sectionDividerTrack} aria-hidden="true">
            <div className={styles.sectionDividerLine} />
          </div>

          {/* Championship Standings Table */}
          <div
            className={styles.standingsTable}
            role="table"
            aria-label="House championship leaderboard"
          >
            {leaderboard.map((team, idx) => {
              const isLeader = team.rank === 1;
              const ratio = Math.max(0, Math.min(1, team.points / maxPoints));
              const rankNum = String(idx + 1).padStart(2, "0");

              return (
                <div
                  key={team.id}
                  className={`${styles.standingRow} ${
                    isLeader ? styles.standingRowLeader : ""
                  }`}
                  role="row"
                  aria-label={`Rank ${team.rank}: ${team.name}${
                    isLeader ? " (Current Tournament Leader)" : ""
                  }, ${team.points} points`}
                  style={
                    {
                      "--meter-scale": ratio.toFixed(4),
                      "--rank-index": idx,
                    } as React.CSSProperties
                  }
                >
                  <div
                    className={`${styles.standingRank} ${
                      isLeader ? styles.standingRankLeader : ""
                    }`}
                    role="cell"
                  >
                    {isLeader && (
                      <span className={styles.goldStar} aria-hidden="true">
                        ★
                      </span>
                    )}
                    <span>{rankNum}</span>
                  </div>

                  <div className={styles.standingHouse} role="cell">
                    <span className={styles.standingHouseName}>{team.name}</span>
                    {isLeader && (
                      <span className={styles.standingHouseTag}>
                        CURRENT TOURNAMENT LEADER
                      </span>
                    )}
                  </div>

                  <div
                    className={styles.standingMeterWrap}
                    role="cell"
                    aria-hidden="true"
                  >
                    <div
                      className={`${styles.standingMeterFill} ${
                        isLeader ? styles.standingMeterFillLeader : ""
                      }`}
                    />
                  </div>

                  <div className={styles.standingPoints} role="cell">
                    <span className={styles.standingPointsVal}>
                      {team.points}
                    </span>
                    <span className={styles.standingPointsUnit}>PTS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
