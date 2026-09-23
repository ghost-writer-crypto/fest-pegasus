"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import styles from "./TodaysProgramSection.module.css";

export interface ProgramItem {
  id: string;
  eventName: string;
  sportName: string;
  category: string;
  venueName: string;
  timeSlot: string;
  performance?: string;
  status: string;
}

interface TodaysProgramSectionProps {
  items: ProgramItem[];
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

export default function TodaysProgramSection({
  items,
}: TodaysProgramSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasResolved, setHasResolved] = useState(false);

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
          setHasResolved(true);
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

  const isResolved = isReducedMotion || hasResolved;

  return (
    <section
      ref={sectionRef}
      className={`${styles.sectionWrap} ${
        isResolved ? styles.resolved : styles.pending
      }`}
      aria-labelledby="schedule-heading"
    >
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.sectionHeader}>
          <div className={styles.headerTextGroup}>
            <p className={styles.sectionKicker}>05 / PROGRAM</p>
            <h2 id="schedule-heading" className={styles.sectionTitle}>
              TODAY
            </h2>
          </div>

          <Link href="/schedules" className={styles.sectionLink}>
            <span>Full Schedule</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        {/* Primary Horizontal Architectural Rule */}
        <div className={styles.sectionDividerTrack} aria-hidden="true">
          <div className={styles.sectionDividerLine} />
        </div>

        {/* Timetable Content */}
        <div className={styles.sectionContent}>
          {items.length === 0 ? (
            /* Authentic Empty State matching PEGASUS operational language */
            <div className={styles.emptyCard} role="status">
              <p className={styles.emptyEyebrow}>TIMETABLE PENDING</p>
              <h3 className={styles.emptyTitle}>
                Official Schedule In Preparation
              </h3>
              <p className={styles.emptyDesc}>
                Competition timetable, venue allocations, and heat sheets are
                published by meet adjudicators prior to start of session.
              </p>
              <Link href="/schedules" className={styles.emptyLink}>
                <span>View Full Program</span>
                <span aria-hidden="true">↗</span>
              </Link>
            </div>
          ) : (
            /* Chronological Cadence Timetable */
            <div
              className={styles.scheduleTimeline}
              role="table"
              aria-label="Today's event timetable"
            >
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className={styles.scheduleRow}
                  role="row"
                  aria-label={`${item.timeSlot}: ${item.eventName} at ${item.venueName}, Status ${item.status}`}
                  style={
                    {
                      "--row-index": idx,
                    } as React.CSSProperties
                  }
                >
                  {/* Time Anchor: Resolves first in the cadence */}
                  <div className={styles.timeAnchorCol} role="cell">
                    <span className={styles.timePip} aria-hidden="true" />
                    <span className={styles.scheduleTime}>{item.timeSlot}</span>
                  </div>

                  {/* Event Information: Resolves adjacent to time anchor */}
                  <div className={styles.scheduleEventCol} role="cell">
                    <span className={styles.scheduleEventName}>
                      {item.eventName}
                    </span>
                    <div className={styles.scheduleEventMeta}>
                      <span>{item.venueName}</span>
                      <span aria-hidden="true" className={styles.metaDot}>
                        •
                      </span>
                      <span>{item.sportName}</span>
                      <span aria-hidden="true" className={styles.metaDot}>
                        •
                      </span>
                      <span>{item.category}</span>
                    </div>
                  </div>

                  {/* Operational Status Tag: Fully visible across all viewports */}
                  <div className={styles.scheduleStatusCol} role="cell">
                    <span className={styles.scheduleStatusTag}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Forward Vector Callout: UP NEXT Tournament Match Pairings */}
          <div
            className={styles.scheduleNotice}
            style={
              {
                "--notice-index": items.length,
              } as React.CSSProperties
            }
          >
            <div className={styles.scheduleNoticeText}>
              <span className={styles.scheduleNoticeBadge}>UP NEXT</span>
              <span>
                Tournament match pairings for Football, Volleyball, Basketball
                and Cricket are released by the Chief Referee.
              </span>
            </div>

            <Link href="/fixtures" className={styles.sectionLink}>
              <span>View Fixtures</span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
