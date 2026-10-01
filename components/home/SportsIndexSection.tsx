"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { Sport, FestivalEvent } from "@/lib/types";
import styles from "./SportsIndexSection.module.css";

interface SportsIndexSectionProps {
  sports: Sport[];
  events: FestivalEvent[];
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

export default function SportsIndexSection({
  sports,
  events,
}: SportsIndexSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasConstructed, setHasConstructed] = useState(false);

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
          setHasConstructed(true);
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

  const isConstructed = isReducedMotion || hasConstructed;

  return (
    <section
      ref={sectionRef}
      className={`${styles.sectionWrap} ${
        isConstructed ? styles.constructed : styles.initialPending
      }`}
      aria-labelledby="sports-heading"
    >
      <div className={styles.container}>
        {/* Section Header: Synchronized entrance */}
        <div className={styles.sectionHeader}>
          <div className={styles.headerTextGroup}>
            <h2 id="sports-heading" className={styles.sectionTitle}>
              THE SPORTS
            </h2>
          </div>

          <Link href="/sports" className={styles.sectionLink}>
            <span>All Sports</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>

        {/* Primary Horizontal Architectural Rule: Sweeps across first */}
        <div className={styles.sectionDividerTrack} aria-hidden="true">
          <div className={styles.sectionDividerLine} />
        </div>

        {/* Sports Index List: Progressive Line-Driven Construction */}
        <div className={styles.sportsList} role="list">
          {sports.map((sport, index) => {
            const sportNum = String(index + 1).padStart(2, "0");
            const configuredEvents = events.filter(
              (e) => e.sport.toLowerCase() === sport.name.toLowerCase()
            );
            // Tight, athletic stagger: 100ms base + 60ms cadence
            const rowDelayMs = 100 + index * 60;

            return (
              <div
                key={sport.id}
                className={styles.sportRowItem}
                style={
                  {
                    "--row-delay": `${rowDelayMs}ms`,
                  } as React.CSSProperties
                }
              >
                <Link
                  href={`/sports/${sport.slug || sport.id}`}
                  className={styles.sportRow}
                  role="listitem"
                >
                  {/* Coordinate Anchor: Index Number */}
                  <span className={styles.sportIndex}>{sportNum}</span>

                  {/* Sport Identity: Attached to the Baseline Rule */}
                  <div className={styles.sportNameCol}>
                    <h3 className={styles.sportName}>{sport.name}</h3>
                    <span className={styles.sportCategory}>
                      {sport.category ||
                        (sport.type === "individual"
                          ? "Track & Field"
                          : "Team Sports")}
                    </span>
                  </div>

                  {/* Narrative Copy */}
                  <p className={styles.sportDesc}>{sport.description}</p>

                  {/* Metadata Count Pill & Action Arrow */}
                  <div className={styles.sportMetaCol}>
                    <span className={styles.sportCountPill}>
                      {configuredEvents.length > 0
                        ? `${configuredEvents.length} Events Configured`
                        : "Tournament Draw"}
                    </span>

                    <span className={styles.sportArrow} aria-hidden="true">
                      ↗
                    </span>
                  </div>
                </Link>

                {/* Row Horizontal Architectural Baseline Rule: Driving line motion */}
                <div className={styles.rowRuleTrack} aria-hidden="true">
                  <div className={styles.rowRuleLine} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
