"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "./MotionTrack.module.css";

interface MotionTrackProps {
  activeSection?: "live" | "sports" | "schedule" | "standings" | "results";
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

export default function MotionTrack({ activeSection }: MotionTrackProps) {
  const [observedSection, setObservedSection] = useState<string>("live");

  const isReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const currentSection = activeSection || observedSection;

  useEffect(() => {
    if (activeSection) return;

    // Observe sections by ID
    const sectionIds = ["live-section", "sports-section", "schedule-section", "standings-section"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            if (id.includes("live")) setObservedSection("live");
            else if (id.includes("sports")) setObservedSection("sports");
            else if (id.includes("schedule")) setObservedSection("schedule");
            else if (id.includes("standings")) setObservedSection("standings");
          }
        });
      },
      {
        threshold: 0.25,
        rootMargin: "-10% 0px -40% 0px",
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [activeSection]);

  return (
    <aside className={styles.trackSpine} aria-label="Competition scrollytelling timeline guide">
      <div className={styles.laneBadge}>
        <span className={styles.laneNum}>01</span>
        <span className={styles.laneTag}>LANE SPINE</span>
      </div>

      {/* Narrative Running Track Line */}
      <div className={styles.trackGuide}>
        <div
          className={`${styles.trackLineFill} ${isReducedMotion ? styles.trackLineInstant : ""}`}
          style={{
            height:
              currentSection === "live"
                ? "25%"
                : currentSection === "sports"
                ? "50%"
                : currentSection === "schedule"
                ? "75%"
                : "100%",
          }}
        />

        {/* Narrative Nodes */}
        <div
          className={`${styles.trackNode} ${
            currentSection === "live" || currentSection === "sports" || currentSection === "schedule" || currentSection === "standings"
              ? styles.trackNodeActive
              : ""
          }`}
          style={{ top: "12%" }}
        >
          <div className={styles.nodeIndicator} />
          <span className={styles.nodeLabel}>BROADCAST</span>
        </div>

        <div
          className={`${styles.trackNode} ${
            currentSection === "sports" || currentSection === "schedule" || currentSection === "standings"
              ? styles.trackNodeActive
              : ""
          }`}
          style={{ top: "42%" }}
        >
          <div className={styles.nodeIndicator} />
          <span className={styles.nodeLabel}>START BLOCKS</span>
        </div>

        <div
          className={`${styles.trackNode} ${
            currentSection === "schedule" || currentSection === "standings"
              ? styles.trackNodeActive
              : ""
          }`}
          style={{ top: "72%" }}
        >
          <div className={styles.nodeIndicator} />
          <span className={styles.nodeLabel}>SPLIT 01</span>
        </div>

        <div
          className={`${styles.trackNode} ${
            currentSection === "standings" ? styles.trackNodeActive : ""
          }`}
          style={{ top: "96%" }}
        >
          <div className={styles.nodeIndicator} />
          <span className={styles.nodeLabel}>FINISH LINE</span>
        </div>
      </div>
    </aside>
  );
}
