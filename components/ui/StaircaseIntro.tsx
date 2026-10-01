"use client";

import { useEffect, useState } from "react";
import styles from "./StaircaseIntro.module.css";

export default function StaircaseIntro() {
  const [stageActive, setStageActive] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Accessibility: instantly dismiss if user prefers reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsDismissed(true);
      return;
    }

    // Trigger sequential animations
    const frameId = requestAnimationFrame(() => {
      setStageActive(true);
    });

    // Step sequence finishes and begins container exit fade
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 1500);

    // Complete reveal and unmount from DOM permanently
    const unmountTimer = setTimeout(() => {
      setIsDismissed(true);
    }, 1750);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(exitTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className={`${styles.introOverlay} ${isExiting ? styles.introOverlayExiting : ""} ${
        stageActive ? styles.stageActive : ""
      }`}
      aria-hidden={isExiting}
      role="presentation"
    >
      {/* Stepped Geometric Staircase Columns */}
      <div className={styles.staircaseStage} aria-hidden="true">
        <div className={`${styles.stairColumn} ${styles.col1}`} />
        <div className={`${styles.stairColumn} ${styles.col2}`} />
        <div className={`${styles.stairColumn} ${styles.col3}`} />
        <div className={`${styles.stairColumn} ${styles.col4}`} />
        <div className={`${styles.stairColumn} ${styles.col5}`} />
        <div className={`${styles.stairColumn} ${styles.col6}`} />
      </div>

      {/* Restrained Brand Emblem */}
      <div className={styles.introCenter} aria-hidden="true">
        <div className={styles.emblemBadge}>
          <span className={styles.emblemDot} />
          <span className={styles.emblemText}>CHAMPIONSHIP OS 2026</span>
        </div>
        <div className={styles.brandTitleWrap}>
          <span className={styles.brandTitle}>ZENITHROW</span>
        </div>
        <div className={styles.subRule}>
          <span className={styles.subText}>PRECISION ATHLETICS</span>
          <span className={styles.subSep}>//</span>
          <span className={styles.subText}>KERALA CAMPUS MEET</span>
        </div>
      </div>
    </div>
  );
}
