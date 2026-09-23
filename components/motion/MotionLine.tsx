"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import styles from "./MotionLine.module.css";

interface MotionLineProps {
  orientation?: "horizontal" | "vertical";
  variant?: "solid" | "measured" | "track-lane";
  color?: string;
  thickness?: number;
  className?: string;
  delay?: number;
  duration?: number;
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

export default function MotionLine({
  orientation = "horizontal",
  variant = "solid",
  color = "#1A3663",
  thickness = 1,
  className = "",
  delay = 0,
  duration = 500,
}: MotionLineProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isDrawn, setIsDrawn] = useState(false);

  const isReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  useEffect(() => {
    if (isReducedMotion) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsDrawn(true);
          observer.unobserve(el);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -20px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isReducedMotion]);

  const active = isReducedMotion || isDrawn;

  if (variant === "measured") {
    return (
      <div
        ref={ref}
        className={`${styles.lineContainer} ${styles[orientation]} ${className}`}
        aria-hidden="true"
      >
        <svg
          className={styles.svgLine}
          preserveAspectRatio="none"
          width="100%"
          height={orientation === "horizontal" ? 12 : "100%"}
        >
          {orientation === "horizontal" ? (
            <>
              <line
                x1="0"
                y1="6"
                x2="100%"
                y2="6"
                stroke={color}
                strokeWidth={thickness}
                className={`${styles.pathDraw} ${active ? styles.pathDrawn : ""}`}
                style={{
                  transitionDelay: `${delay}ms`,
                  transitionDuration: `${duration}ms`,
                }}
              />
              {/* Broadcast timing tick marks along the line */}
              <line x1="0" y1="1" x2="0" y2="11" stroke={color} strokeWidth={2} />
              <line x1="25%" y1="3" x2="25%" y2="9" stroke={color} strokeWidth={1} opacity={0.6} />
              <line x1="50%" y1="2" x2="50%" y2="10" stroke={color} strokeWidth={1.5} opacity={0.8} />
              <line x1="75%" y1="3" x2="75%" y2="9" stroke={color} strokeWidth={1} opacity={0.6} />
              <line x1="100%" y1="1" x2="100%" y2="11" stroke={color} strokeWidth={2} />
            </>
          ) : (
            <>
              <line
                x1="6"
                y1="0"
                x2="6"
                y2="100%"
                stroke={color}
                strokeWidth={thickness}
                className={`${styles.pathDrawVertical} ${active ? styles.pathDrawnVertical : ""}`}
                style={{
                  transitionDelay: `${delay}ms`,
                  transitionDuration: `${duration}ms`,
                }}
              />
              <line x1="1" y1="0" x2="11" y2="0" stroke={color} strokeWidth={2} />
              <line x1="1" y1="100%" x2="11" y2="100%" stroke={color} strokeWidth={2} />
            </>
          )}
        </svg>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`${styles.lineContainer} ${styles[orientation]} ${className}`}
      aria-hidden="true"
    >
      <div
        className={`${styles.solidLine} ${active ? styles.drawn : ""}`}
        style={{
          backgroundColor: color,
          ...(orientation === "horizontal"
            ? { height: `${thickness}px`, transformOrigin: "left center" }
            : { width: `${thickness}px`, transformOrigin: "center top" }),
          transitionDelay: `${delay}ms`,
          transitionDuration: `${duration}ms`,
        }}
      />
    </div>
  );
}
