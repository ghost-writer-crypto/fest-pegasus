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
              aria-label="Upcoming event timetable"
            >
              {/* Operational Column Header */}
              <div className="hidden lg:grid grid-cols-12 gap-4 pb-3 border-b border-[#1A3663]/15 text-[11px] font-mono font-bold tracking-widest text-[#5B9BD5] uppercase px-2">
                <span className="col-span-4">EVENT</span>
                <span className="col-span-2">SPORT</span>
                <span className="col-span-2">DIVISION</span>
                <span className="col-span-2">VENUE</span>
                <span className="col-span-1">TIME</span>
                <span className="col-span-1 text-right">STATUS</span>
              </div>

              {items.map((item, idx) => {
                const kickerNum = String(idx + 1).padStart(2, "0");
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 py-4 px-2 border-b border-[#E8EDF3] hover:bg-[#F8FAFC] transition-colors items-center"
                    role="row"
                    aria-label={`${item.timeSlot}: ${item.eventName} (${item.sportName}, ${item.category}) at ${item.venueName}, Status ${item.status}`}
                  >
                    {/* EVENT with numbered kicker */}
                    <div className="lg:col-span-4 flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#5B9BD5] tracking-widest shrink-0">
                        {kickerNum} //
                      </span>
                      <span className="font-bold text-[#1A3663] text-sm sm:text-base">
                        {item.eventName}
                      </span>
                    </div>

                    {/* SPORT */}
                    <div className="lg:col-span-2 text-xs font-mono text-[#26364A]">
                      <span className="lg:hidden text-[#94A3B8] mr-2">SPORT:</span>
                      <span className="font-semibold uppercase">{item.sportName}</span>
                    </div>

                    {/* DIVISION */}
                    <div className="lg:col-span-2 text-xs font-mono text-[#64748B]">
                      <span className="lg:hidden text-[#94A3B8] mr-2">DIV:</span>
                      <span>{item.category}</span>
                    </div>

                    {/* VENUE */}
                    <div className="lg:col-span-2 text-xs font-mono text-[#64748B]">
                      <span className="lg:hidden text-[#94A3B8] mr-2">VENUE:</span>
                      <span>{item.venueName}</span>
                    </div>

                    {/* TIME */}
                    <div className="lg:col-span-1 text-xs sm:text-sm font-mono font-bold text-[#1A3663]">
                      <span className="lg:hidden text-[#94A3B8] mr-2">TIME:</span>
                      <span>{item.timeSlot}</span>
                    </div>

                    {/* STATUS */}
                    <div className="lg:col-span-1 flex lg:justify-end">
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase rounded-xs bg-[#0F2242] text-white">
                        {item.status}
                      </span>
                    </div>
                  </div>
                );
              })}
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
