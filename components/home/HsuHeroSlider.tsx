"use client";

import { useState, useEffect, useCallback } from "react";
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
    lead: "The official Hamdan Annual Sports Carnival 2k26 arena — 4 Collegiate Houses, 100+ programmes, and 250+ student athletes competing in constant motion.",
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

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      nextSlide();
    }, 6500);

    return () => clearInterval(timer);
  }, [nextSlide, slides.length]);

  const activeSlide = slides[currentIdx] || slides[0] || DEFAULT_HERO_SLIDES[0];

  return (
    <section className="hero" aria-label="Featured Festival Highlights">
      {/* Background with cross-fade */}
      <div
        className="hero-bg"
        style={{
          backgroundImage: `url('${activeSlide.image}')`,
        }}
      />

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
          <Link href="/display" className="btn ghost">
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
          className="circle"
          aria-label="Previous slide"
        >
          ←
        </button>
        <button
          type="button"
          onClick={nextSlide}
          className="circle"
          aria-label="Next slide"
        >
          →
        </button>
      </div>
    </section>
  );
}
