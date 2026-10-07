"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

interface SlideData {
  id?: string;
  kicker: string;
  titlePrimary: string;
  titleSecondary: string;
  lead: string;
  image: string;
  ctaText?: string;
  ctaLink?: string;
}

const DEFAULT_HERO_SLIDES: SlideData[] = [
  {
    id: "hero-slide-arena",
    kicker: "ZENITHROW 2026",
    titlePrimary: "THE",
    titleSecondary: "ARENA.",
    lead: "The official Hamdan Annual Sports Carnival 2k26 arena — 4 Teams, 100+ programmes, and 250+ student athletes competing in constant motion.",
    image: "/images/hero/zenithrow-arena-aerial.png",
    ctaText: "Explore the arena →",
    ctaLink: "/sports",
  },
  {
    id: "hero-slide-logo",
    kicker: "OFFICIAL CEREMONIAL LAUNCH",
    titlePrimary: "LOGO",
    titleSecondary: "UNVEILED.",
    lead: "The official emblem for ZENITHROW 2026 ceremonially unveiled by Kerala Sports Minister Adv. O. J. Janeesh with Hamdan Students Union leadership.",
    image: "/images/hero/zenithrow-logo-unveiled.png",
    ctaText: "Championship Standings →",
    ctaLink: "/leaderboard",
  },
];

export default function HsuHeroSlider() {
  const [slides, setSlides] = useState<SlideData[]>(DEFAULT_HERO_SLIDES);
  const [currentIdx, setCurrentIdx] = useState(0);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Sync with published admin hero slides
  useEffect(() => {
    const loadStoredSlides = () => {
      try {
        const stored = localStorage.getItem("zenithrow_hero_slides");
        if (stored) {
          const parsed = JSON.parse(stored);
          const activeOnly = parsed.filter(
            (s: { status?: string }) => s.status === "active" || !s.status
          );
          if (activeOnly.length > 0) {
            // Map any legacy AI image references to the real photos
            const sanitized = activeOnly.map((s: SlideData) => {
              if (
                s.image.includes("campus-aerial") ||
                s.image.includes("track-stadium")
              ) {
                return { ...s, image: "/images/hero/zenithrow-arena-aerial.png" };
              }
              if (
                s.image.includes("football-arena") ||
                s.image.includes("championship-trophy")
              ) {
                return { ...s, image: "/images/hero/zenithrow-logo-unveiled.png" };
              }
              return s;
            });
            setSlides(sanitized);
            return;
          }
        }
      } catch (e) {
        console.warn("Unable to parse stored hero slides", e);
      }
      setSlides(DEFAULT_HERO_SLIDES);
    };

    loadStoredSlides();

    const handleUpdate = () => loadStoredSlides();
    window.addEventListener("zenithrow_hero_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("zenithrow_hero_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIdx((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlide = useCallback(() => {
    setCurrentIdx((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 6500);

    return () => clearInterval(timer);
  }, [nextSlide, slides.length]);

  const activeSlide = slides[currentIdx] || slides[0] || DEFAULT_HERO_SLIDES[0];

  return (
    <section
      className="hero"
      aria-label="Featured Festival Highlights"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Positioned Background Image Layer (inset: 0, lower z-index) */}
      <div className="hero-bg" aria-hidden="true">
        {slides.map((slide, idx) => (
          <div
            key={slide.id || slide.image + idx}
            className={`hero-slide-layer ${idx === currentIdx ? "hero-slide-layer--active" : ""}`}
            style={{
              position: "absolute",
              inset: 0,
              opacity: idx === currentIdx ? 1 : 0,
              transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              zIndex: idx === currentIdx ? 1 : 0,
              pointerEvents: "none",
            }}
          >
            <Image
              src={slide.image}
              alt={`${slide.titlePrimary} ${slide.titleSecondary}`}
              fill
              priority={idx === 0}
              sizes="(max-width: 768px) 100vw, 100vw"
              className="hero-image"
            />
          </div>
        ))}
      </div>

      {/* Content Overlay */}
      <div className="wrap hero-content">
        <div className="eyebrow">
          <i className="dot" />
          <span className="hero-kicker">{activeSlide.kicker}</span>
        </div>

        <h1 className="hero-title">
          {activeSlide.titlePrimary}<br />
          <span>{activeSlide.titleSecondary}</span>
        </h1>

        <p className="lead">{activeSlide.lead}</p>

        <div className="actions">
          <Link href={activeSlide.ctaLink || "/sports"} className="btn primary">
            {activeSlide.ctaText || "Explore the arena →"}
          </Link>
          <Link href="/live" className="btn ghost">
            Watch live
          </Link>
        </div>

        {/* Slide Indicators */}
        <div className="slidebar" aria-label="Carousel navigation">
          {slides.map((slide, idx) => (
            <button
              key={slide.id || slide.kicker + idx}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              className={idx === currentIdx ? "on" : ""}
              aria-label={`Go to slide ${idx + 1}`}
              style={{
                border: 0,
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="hero-controls">
        <button
          type="button"
          onClick={prevSlide}
           
          aria-label="Previous slide"
        >
          ←
        </button>
        <button
          type="button"
          onClick={nextSlide}
          
          aria-label="Next slide"
        >
          →
        </button>
      </div>
    </section>
  );
}
