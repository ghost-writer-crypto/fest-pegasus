"use client";

import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { Skiper3 } from "@/components/ui/skiper-ui/skiper3";
import styles from "./HeroCarousel.module.css";

export interface HeroSlide {
  id: string;
  tag: string;
  title: string;
  subtitle?: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  badge?: string;
  displayOrder: number;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "slide-motion",
    tag: "01 / THE FEST",
    title: "THE COMPETITION\nIS ALREADY MOVING.",
    subtitle: "AUTHENTIC TIMING // VERIFIED RESULTS // CHAMPIONSHIP RADAR",
    description:
      "ZENITHROW powers real-time fixtures, electronic chip timing, certified results, and multi-house standings across collegiate athletics.",
    ctaLabel: "EXPLORE SCHEDULE",
    ctaHref: "/schedules",
    image: "/images/hero/campus-aerial.jpg",
    badge: "ELECTRONIC CHIP TIMING",
    displayOrder: 1,
  },
  {
    id: "slide-turf",
    tag: "02 / ARENA KNOCKOUTS",
    title: "PRECISION ON THE TURF.",
    subtitle: "KNOCKOUT ROUNDS UNDER THE LIGHTS",
    description:
      "High-stakes competition across Football, Volleyball, Basketball, Cricket, and the certified Tug of War 600kg arena.",
    ctaLabel: "LIVE FIXTURES",
    ctaHref: "/fixtures",
    image: "/images/hero/football-arena.jpg",
    badge: "OFFICIAL MATCH DRAWS",
    displayOrder: 2,
  },
  {
    id: "slide-trophy",
    tag: "03 / CHAMPIONSHIP SHIELD",
    title: "FOUR HOUSES. ONE SHIELD.",
    subtitle: "AGGREGATED MULTI-DISCIPLINE POINTS",
    description:
      "Every sprint cleared and goal scored accumulates toward the overall House Championship Trophy. Track certified standings in real time.",
    ctaLabel: "VIEW LEADERBOARD",
    ctaHref: "/leaderboard",
    image: "/images/hero/championship-trophy.jpg",
    badge: "LIVE POINTS AGGREGATION",
    displayOrder: 3,
  },
];

const SLIDE_DURATION_MS = 6500;
const SCENE_TRANSITION_MS = 540;

function subscribeToReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

export default function HeroCarousel({
  slides = DEFAULT_SLIDES,
}: {
  slides?: HeroSlide[];
}) {
  const isReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [transitionKey, setTransitionKey] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const transitionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const isTouchDevice = useRef(false);

  const totalSlides = slides.length;

  const goToSlide = useCallback(
    (index: number, explicitDirection?: "next" | "prev") => {
      const target = (index + totalSlides) % totalSlides;
      if (target === currentIndex) return;

      // Determine scene movement direction
      let resolvedDir = explicitDirection;
      if (!resolvedDir) {
        if (target === 0 && currentIndex === totalSlides - 1) {
          resolvedDir = "next";
        } else if (target === totalSlides - 1 && currentIndex === 0) {
          resolvedDir = "prev";
        } else {
          resolvedDir = target > currentIndex ? "next" : "prev";
        }
      }

      // Clear any pending transition timer to prevent queues on rapid navigation
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      setPreviousIndex(currentIndex);
      setDirection(resolvedDir);
      setCurrentIndex(target);
      setTransitionKey((k) => k + 1);

      // Clean up previous scene reference once shutter/camera sweep completes
      transitionTimerRef.current = setTimeout(() => {
        setPreviousIndex(null);
      }, SCENE_TRANSITION_MS);
    },
    [totalSlides, currentIndex]
  );

  const nextSlide = useCallback(() => {
    goToSlide(currentIndex + 1, "next");
  }, [goToSlide, currentIndex]);

  const prevSlide = useCallback(() => {
    goToSlide(currentIndex - 1, "prev");
  }, [goToSlide, currentIndex]);

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  const shouldAnimate = isPlaying && !isHovered && !isFocused && !isReducedMotion;

  // Continuous autoplay cycle
  useEffect(() => {
    if (!shouldAnimate) return;

    const timer = setTimeout(() => {
      goToSlide(currentIndex + 1, "next");
    }, SLIDE_DURATION_MS);

    return () => clearTimeout(timer);
  }, [currentIndex, shouldAnimate, goToSlide]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  // Keyboard navigation within carousel
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevSlide();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextSlide();
    } else if (e.key === " " && e.target === containerRef.current) {
      e.preventDefault();
      togglePlay();
    }
  };

  // Mobile Touch Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    isTouchDevice.current = true;
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (diff > minSwipeDistance) {
      nextSlide();
    } else if (diff < -minSwipeDistance) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Subtle layered depth on desktop
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice.current || isReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

    // Keep movement restrained within physical bounds
    const depthX = (x * 12).toFixed(2);
    const depthY = (y * 8).toFixed(2);

    containerRef.current.style.setProperty("--depth-x", `${depthX}px`);
    containerRef.current.style.setProperty("--depth-y", `${depthY}px`);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (containerRef.current) {
      containerRef.current.style.setProperty("--depth-x", "0px");
      containerRef.current.style.setProperty("--depth-y", "0px");
    }
  };

  const current = slides[currentIndex] || slides[0];

  return (
    <section
      ref={containerRef}
      className={styles.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured sports meet highlights"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsFocused(false);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Screen Reader Announcement */}
      <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
        Scene {currentIndex + 1} of {totalSlides}: {current.title} — {current.description}
      </div>

      {/* Layer 0 & 1: Continuous Camera Viewport with Directional Shutter Reveal */}
      <div className={styles.cameraViewport}>
        {slides.map((slide, idx) => {
          const isCurrent = idx === currentIndex;
          const isPrevious = idx === previousIndex;

          if (!isCurrent && !isPrevious) return null;

          let sceneClass = "";
          if (isCurrent && previousIndex !== null) {
            sceneClass =
              direction === "next"
                ? styles.sceneSweepEnterNext
                : styles.sceneSweepEnterPrev;
          } else if (isCurrent && previousIndex === null) {
            sceneClass = styles.sceneResting;
          } else if (isPrevious) {
            sceneClass =
              direction === "next"
                ? styles.sceneSweepExitNext
                : styles.sceneSweepExitPrev;
          }

          return (
            <div
              key={slide.id}
              className={`${styles.sceneLayer} ${sceneClass}`}
              aria-hidden={!isCurrent}
            >
              <div className={styles.imageFocalPlane} style={{ position: "absolute", overflow: "hidden" }}>
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={idx === 0}
                  className={styles.heroImage}
                  sizes="100vw"
                />
              </div>
            </div>
          );
        })}

        {/* Persistent Architectural Vignette Gradient (Deep PEGASUS Navy) */}
        <div className={styles.overlayGradient} aria-hidden="true" />

        {/* Architectural Stage Hairline Guide with Directional Sweep */}
        <div
          className={`${styles.stageArchitecturalLine} ${
            previousIndex !== null
              ? direction === "next"
                ? styles.stageLineSweepNext
                : styles.stageLineSweepPrev
              : ""
          }`}
          aria-hidden="true"
        />
      </div>

      {/* Layer 2: Coordinated Persistent Typography & Metadata Stage */}
      <div className={styles.contentStage}>
        <div className={styles.stageGrid}>
          {/* Spatial Anchor: Kicker Row with Transforming Badge */}
          <div className={styles.kickerRow}>
            <div className={styles.kickerBadgeMask}>
              {previousIndex !== null && slides[previousIndex] && (
                <span
                  className={`${styles.kickerBadge} ${styles.kickerBadgeExiting} ${
                    direction === "next" ? styles.kickerExitNext : styles.kickerExitPrev
                  }`}
                  aria-hidden="true"
                >
                  {slides[previousIndex].tag}
                </span>
              )}
              <span
                key={`tag-${currentIndex}`}
                className={`${styles.kickerBadge} ${
                  previousIndex !== null
                    ? direction === "next"
                      ? styles.kickerEnterNext
                      : styles.kickerEnterPrev
                    : ""
                }`}
              >
                {current.tag}
              </span>
            </div>

            {/* Architectural Connecting Rule between Kicker and Status */}
            <div
              key={`rule-${transitionKey}`}
              className={styles.kickerArchitecturalRule}
              aria-hidden="true"
            />

            {current.badge && (
              <div className={styles.statusChip}>
                <span className={styles.statusDot} aria-hidden="true" />
                <span className={styles.statusTextMask}>
                  {previousIndex !== null && slides[previousIndex]?.badge && (
                    <span
                      className={`${styles.statusText} ${styles.statusTextExiting} ${
                        direction === "next" ? styles.textExitNext : styles.textExitPrev
                      }`}
                      aria-hidden="true"
                    >
                      {slides[previousIndex].badge}
                    </span>
                  )}
                  <span
                    key={`badge-${currentIndex}`}
                    className={`${styles.statusText} ${
                      previousIndex !== null
                        ? direction === "next"
                          ? styles.textEnterNext
                          : styles.textEnterPrev
                        : ""
                    }`}
                  >
                    {current.badge}
                  </span>
                </span>
              </div>
            )}
            <div className="ml-auto hidden md:flex items-center">
              <Skiper3 />
            </div>
          </div>

          {/* Typography as Motion Object: Architectural Mask Window with Kinetic Tracking */}
          <div className={styles.titleMaskWindow}>
            {previousIndex !== null && slides[previousIndex] && (
              <span
                className={`${styles.heroTitle} ${styles.titleExiting} ${
                  direction === "next" ? styles.titleExitNext : styles.titleExitPrev
                }`}
                aria-hidden="true"
              >
                {slides[previousIndex].title}
              </span>
            )}
            <h1
              key={`title-${currentIndex}`}
              className={`${styles.heroTitle} ${
                previousIndex !== null
                  ? direction === "next"
                    ? styles.titleEnterNext
                    : styles.titleEnterPrev
                  : ""
              }`}
            >
              {current.title}
            </h1>
          </div>

          {/* Supporting Lead Description Mask Window */}
          <div className={styles.descMaskWindow}>
            {previousIndex !== null && slides[previousIndex] && (
              <span
                className={`${styles.heroDescription} ${styles.descExiting} ${
                  direction === "next" ? styles.descExitNext : styles.descExitPrev
                }`}
                aria-hidden="true"
              >
                {slides[previousIndex].description}
              </span>
            )}
            <p
              key={`desc-${currentIndex}`}
              className={`${styles.heroDescription} ${
                previousIndex !== null
                  ? direction === "next"
                    ? styles.descEnterNext
                    : styles.descEnterPrev
                  : ""
              }`}
            >
              {current.description}
            </p>
          </div>

          {/* Persistent Action Hardware: Button Frame Remains In-Place While Label Updates */}
          <div className={styles.actionRow}>
            <Link href={current.ctaHref} className={styles.primaryCta}>
              <span className={styles.ctaLabelWindow}>
                {previousIndex !== null && slides[previousIndex] && (
                  <span
                    className={`${styles.ctaLabel} ${styles.ctaLabelExiting} ${
                      direction === "next" ? styles.ctaExitNext : styles.ctaExitPrev
                    }`}
                    aria-hidden="true"
                  >
                    {slides[previousIndex].ctaLabel}
                  </span>
                )}
                <span
                  key={`cta-${currentIndex}`}
                  className={`${styles.ctaLabel} ${
                    previousIndex !== null
                      ? direction === "next"
                        ? styles.ctaEnterNext
                        : styles.ctaEnterPrev
                      : ""
                  }`}
                >
                  {current.ctaLabel}
                </span>
              </span>
              <span className={styles.ctaArrow} aria-hidden="true">
                ↗
              </span>
            </Link>

            <Link href="/results" className={styles.secondaryCta}>
              <span>LIVE RESULTS</span>
              <span className={styles.ctaArrow} aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </div>

        {/* Layer 3: Persistent Architectural Progress Timeline & Stage Hardware */}
        <div className={styles.timelineBar}>
          <div
            className={styles.timelineSegments}
            role="tablist"
            aria-label="Carousel scene timeline"
          >
            {slides.map((slide, idx) => {
              const isActive = idx === currentIndex;
              const isCompleted = idx < currentIndex;
              const slideNum = String(idx + 1).padStart(2, "0");

              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Switch to scene ${idx + 1}: ${slide.title}`}
                  className={`${styles.timelineSegment} ${
                    isActive ? styles.timelineSegmentActive : ""
                  }`}
                  onClick={() => goToSlide(idx)}
                >
                  <span className={styles.timelineNum}>{slideNum}</span>
                  <div className={styles.timelineTrack}>
                    <div
                      key={isActive ? `active-${currentIndex}` : `static-${idx}`}
                      className={`${styles.timelineFill} ${
                        isActive
                          ? shouldAnimate
                            ? styles.timelineFillActive
                            : styles.timelineFillPaused
                          : isCompleted
                          ? styles.timelineFillCompleted
                          : ""
                      }`}
                      style={{
                        animationDuration: `${SLIDE_DURATION_MS}ms`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Persistent Manual Stage Controls: Prev, Play/Pause, Next */}
          <div className={styles.manualControls}>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={prevSlide}
              aria-label="Previous scene"
              title="Previous scene"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <button
              type="button"
              className={styles.controlBtn}
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause autoplay" : "Start autoplay"}
              title={isPlaying ? "Pause autoplay" : "Start autoplay"}
            >
              {isPlaying ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            <button
              type="button"
              className={styles.controlBtn}
              onClick={nextSlide}
              aria-label="Next scene"
              title="Next scene"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
