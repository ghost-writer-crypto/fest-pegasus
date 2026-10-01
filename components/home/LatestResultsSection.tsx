"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import styles from "./LatestResultsSection.module.css";

export interface LatestResultItem {
  id: string;
  resultId?: string;
  rank: number;
  athleteName: string;
  chestNumber?: string;
  teamName: string;
  eventName: string;
  sportName: string;
  category: string;
  venueName: string;
  performance: string;
  status: string;
  isMeetRecord?: boolean;
  points?: number;
}

interface LatestResultsSectionProps {
  items: LatestResultItem[];
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

export default function LatestResultsSection({
  items,
}: LatestResultsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasSettled, setHasSettled] = useState(false);

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
          setHasSettled(true);
          observer.unobserve(el);
        }
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isReducedMotion]);

  const isSettled = isReducedMotion || hasSettled;

  return (
    <section
      ref={sectionRef}
      className={`${styles.sectionWrap} ${
        isSettled ? styles.settled : styles.pending
      }`}
      aria-labelledby="results-heading"
    >
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.sectionHeader}>
          <div className={styles.headerTextGroup}>
            <h2 id="results-heading" className={styles.sectionTitle}>
              LATEST RESULTS
            </h2>
          </div>

          <Link href="/results" className={styles.sectionLink}>
            <span>All Results</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        {/* Primary Horizontal Architectural Rule */}
        <div className={styles.sectionDividerTrack} aria-hidden="true">
          <div className={styles.sectionDividerLine} />
        </div>

        {/* Results Content */}
        <div className={styles.sectionContent}>
          {items.length === 0 ? (
            /* Authentic Empty State matching PEGASUS institutional language */
            <div className={styles.emptyCard} role="status">
              <p className={styles.emptyEyebrow}>VERIFIED SCORES</p>
              <h3 className={styles.emptyTitle}>RESULTS PENDING</h3>
              <p className={styles.emptyDesc}>
                Official event outcomes, metric calibrations, and podium points
                are published once adjudication is completed by the technical
                committee.
              </p>
              <Link href="/results" className={styles.emptyLink}>
                <span>View All Results</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          ) : (
            /* Empirical Settlement Ledger */
            <div
              className={styles.resultsList}
              role="table"
              aria-label="Latest verified event results"
            >
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={styles.resultRow}
                  role="row"
                  aria-label={`Position ${item.rank}: ${item.athleteName} representing ${item.teamName} in ${item.eventName}, official performance ${item.performance}, status ${item.status}`}
                  style={
                    {
                      "--row-index": idx,
                    } as React.CSSProperties
                  }
                >
                  {/* 1. Rank Anchor: Settles into position with authoritative micro-drop */}
                  <div className={styles.rankCol} role="cell">
                    <span
                      className={`${styles.rankBadge} ${
                        item.rank === 1 ? styles.rankPodiumGold : ""
                      }`}
                    >
                      #{item.rank}
                    </span>
                  </div>

                  {/* 2. Sport Discipline Tag */}
                  <div className={styles.sportCol} role="cell">
                    <span className={styles.resultSportTag}>
                      {item.sportName}
                    </span>
                  </div>

                  {/* 3. Athlete, House & Event Information */}
                  <div className={styles.resultInfoCol} role="cell">
                    <div className={styles.athleteRow}>
                      <span className={styles.athleteName}>
                        {item.athleteName}
                      </span>
                      <span className={styles.houseName}>
                        {item.teamName}
                        {item.chestNumber && (
                          <span className={styles.chestNumber}>
                            {" "}
                            #{item.chestNumber}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className={styles.eventRow}>
                      <span className={styles.eventName}>{item.eventName}</span>
                      <span aria-hidden="true" className={styles.metaDot}>
                        •
                      </span>
                      <span className={styles.eventMeta}>
                        {item.venueName} · {item.category}
                      </span>
                    </div>
                  </div>

                  {/* 4. Empirical Performance Metric: Tabular monospace measurement */}
                  <div className={styles.resultPerfCol} role="cell">
                    <span className={styles.perfValue}>{item.performance}</span>
                    {item.points !== undefined && (
                      <span className={styles.pointsBadge}>
                        +{item.points} PTS
                      </span>
                    )}
                  </div>

                  {/* 5. Adjudication Seal: FINAL status tag and MEET RECORD badge */}
                  <div className={styles.resultStatusCol} role="cell">
                    <div className={styles.statusStack}>
                      <span className={styles.resultStatusTag}>
                        {item.status}
                      </span>
                      {item.isMeetRecord && (
                        <span className={styles.meetRecordBadge}>
                          MEET RECORD
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
