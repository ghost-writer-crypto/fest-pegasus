"use client";

import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
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
    id: "slide-arena",
    tag: "ZENITHROW ARENA",
    title: "Official Sports Carnival Complex",
    description: "4 Teams • 100+ Programmes • 250+ Candidates",
    ctaLabel: "EXPLORE SCHEDULE",
    ctaHref: "/schedules",
    image: "/images/hero/zenithrow-arena-aerial.png",
    badge: "OFFICIAL FESTIVAL ARENA",
    displayOrder: 1,
  },
  {
    id: "slide-logo",
    tag: "CEREMONIAL LAUNCH",
    title: "Official Emblem Unveiled",
    description: "Unveiled by Kerala Sports Minister Adv. O. J. Janeesh",
    ctaLabel: "HOUSE STANDINGS",
    ctaHref: "/leaderboard",
    image: "/images/hero/zenithrow-logo-unveiled.png",
    badge: "CHAMPIONSHIP LAUNCH",
    displayOrder: 2,
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

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      setPreviousIndex(currentIndex);
      setDirection(resolvedDir);
      setCurrentIndex(target);

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

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

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
      onMouseLeave={() => setIsHovered(false)}
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
      {/* Screen Reader Semantic Announcement */}
      <h1 className={styles.srOnly}>ZENITHROW — Sports Festival 2026</h1>
      <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
        Scene {currentIndex + 1} of {totalSlides}: {current.title}
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
              <div className={styles.imageFocalPlane}>
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

        {/* Cinematic Vignette Gradient Overlay */}
        <div className={styles.overlayGradient} aria-hidden="true" />
      </div>

      {/* Layer 2: Floating Liquid-Glass Cockpit Deck */}
      <div className={styles.contentStage}>
        <div className={styles.cockpitDeck}>
          {/* Active Scene Identity Indicator */}
          <div className={styles.sceneBadge}>
            <span className={styles.livePulse} aria-hidden="true" />
            <span className={styles.sceneTagText}>{current.tag}</span>
          </div>

          {/* Timeline Track Segments */}
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

          {/* Manual Stage Controls */}
          <div className={styles.manualControls}>
            <button
              type="button"
              className={styles.controlBtn}
              onClick={prevSlide}
              aria-label="Previous scene"
              title="Previous scene"
            >
              <svg
                width="14"
                height="14"
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
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg
                  width="12"
                  height="12"
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
                width="14"
                height="14"
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
