"use client";

import React from "react";
import Link from "next/link";
import styles from "./LiveStatusStrip.module.css";

export interface LiveStatusStripProps {
  liveEvent?: {
    name: string;
    venue: string;
    status: string;
    time?: string;
  } | null;
  upcomingEvent?: {
    name: string;
    venue: string;
    time: string;
    sport: string;
  } | null;
  latestResult?: {
    eventName: string;
    performance: string;
    houseOrAthlete: string;
    position: number;
  } | null;
  leader?: {
    name: string;
    points: number;
    rank: number;
    leadMargin?: number;
  } | null;
}

export default function LiveStatusStrip({
  liveEvent,
  upcomingEvent,
  latestResult,
  leader,
}: LiveStatusStripProps) {
  return (
    <aside className={styles.statusStrip} aria-label="Operational festival status bar">
      <div className={styles.container}>
        <div className={styles.grid}>
          {/* Tile 01: LIVE NOW */}
          <Link href="/results?live=true" className={styles.tile}>
            <div className={styles.tileHeader}>
              <span className={styles.kicker}>01 // LIVE NOW</span>
              {liveEvent ? (
                <span className={styles.liveTagActive}>
                  <span className={styles.pulseDot} aria-hidden="true" />
                  LIVE
                </span>
              ) : (
                <span className={styles.liveTagStandby}>STANDBY</span>
              )}
            </div>
            <div className={styles.tileBody}>
              {liveEvent ? (
                <>
                  <div className={styles.tileTitle}>{liveEvent.name}</div>
                  <div className={styles.tileMeta}>
                    {liveEvent.venue} · {liveEvent.time || "IN PROGRESS"}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.tileTitleMuted}>NO LIVE SESSION</div>
                  <div className={styles.tileMeta}>
                    Timing armed · Next session on standby
                  </div>
                </>
              )}
            </div>
            <div className={styles.tileFooter}>
              <span>Monitor Arena</span>
              <span className={styles.arrow} aria-hidden="true">↗</span>
            </div>
          </Link>

          {/* Tile 02: UPCOMING */}
          <Link href="/schedules" className={styles.tile}>
            <div className={styles.tileHeader}>
              <span className={styles.kicker}>02 // UPCOMING</span>
              <span className={styles.badgeNeutral}>SCHEDULED</span>
            </div>
            <div className={styles.tileBody}>
              {upcomingEvent ? (
                <>
                  <div className={styles.tileTitle}>{upcomingEvent.name}</div>
                  <div className={styles.tileMeta}>
                    {upcomingEvent.venue} · {upcomingEvent.time}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.tileTitle}>FIELD KNOCKOUTS</div>
                  <div className={styles.tileMeta}>
                    Stadium Arena · 04:30 PM
                  </div>
                </>
              )}
            </div>
            <div className={styles.tileFooter}>
              <span>Full Timetable</span>
              <span className={styles.arrow} aria-hidden="true">↗</span>
            </div>
          </Link>

          {/* Tile 03: RESULTS */}
          <Link href="/results" className={styles.tile}>
            <div className={styles.tileHeader}>
              <span className={styles.kicker}>03 // RESULTS</span>
              <span className={styles.badgeOfficial}>OFFICIAL</span>
            </div>
            <div className={styles.tileBody}>
              {latestResult ? (
                <>
                  <div className={styles.tileTitle}>
                    {latestResult.eventName} · {latestResult.performance}
                  </div>
                  <div className={styles.tileMeta}>
                    #{latestResult.position} Gold · {latestResult.houseOrAthlete}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.tileTitle}>RACE 100M · 11.42s</div>
                  <div className={styles.tileMeta}>
                    #1 Gold · Majestir House
                  </div>
                </>
              )}
            </div>
            <div className={styles.tileFooter}>
              <span>Official Marks</span>
              <span className={styles.arrow} aria-hidden="true">↗</span>
            </div>
          </Link>

          {/* Tile 04: LEADERBOARD */}
          <Link href="/leaderboard" className={styles.tile}>
            <div className={styles.tileHeader}>
              <span className={styles.kicker}>04 // LEADERBOARD</span>
              <span className={styles.badgeGold}>SHIELD RANK #1</span>
            </div>
            <div className={styles.tileBody}>
              {leader ? (
                <>
                  <div className={styles.tileTitle}>
                    {leader.name.toUpperCase()} · {leader.points} PTS
                  </div>
                  <div className={styles.tileMeta}>
                    {leader.leadMargin !== undefined && leader.leadMargin > 0
                      ? `+${leader.leadMargin} pt lead over field`
                      : "Tournament Leader"}
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.tileTitle}>HOUSE MAJESTIR · 20 PTS</div>
                  <div className={styles.tileMeta}>Tournament Leader</div>
                </>
              )}
            </div>
            <div className={styles.tileFooter}>
              <span>Points Radar</span>
              <span className={styles.arrow} aria-hidden="true">↗</span>
            </div>
          </Link>
        </div>
      </div>
    </aside>
  );
}
