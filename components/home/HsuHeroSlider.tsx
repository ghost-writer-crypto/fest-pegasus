"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface SlideData {
  kicker: string;
  titlePrimary: string;
  titleSecondary: string;
  lead: string;
  image: string;
}

const HERO_SLIDES: SlideData[] = [
  {
    kicker: "ZENITHROW 2026",
    titlePrimary: "THE",
    titleSecondary: "ARENA",
    lead: "The Hamdan Students Union festival experience — from the first fixture to the final result, designed around the people who make the event happen.",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=2000&q=85",
  },
  {
    kicker: "PLAY. PUSH. RISE.",
    titlePrimary: "NEXT",
    titleSecondary: "GENERATION",
    lead: "A sports festival built around athletic ambition, collegiate pride, and student energy in constant motion.",
    image: "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?auto=format&fit=crop&w=2000&q=85",
  },
  {
    kicker: "LIVE RESULTS",
    titlePrimary: "EVERY",
    titleSecondary: "SCORE.",
    lead: "Verified track and field timings, tournament brackets, and live points synced directly across campus.",
    image: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=2000&q=85",
  },
  {
    kicker: "HAMDAN STUDENTS UNION",
    titlePrimary: "STUDENT",
    titleSecondary: "ENERGY.",
    lead: "Student energy, organized. Five championship disciplines competing for the House Shield.",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=2000&q=85",
  },
];

export default function HsuHeroSlider() {
  const [currentIdx, setCurrentIdx] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIdx((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentIdx((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 6500);

    return () => clearInterval(timer);
  }, [nextSlide]);

  const activeSlide = HERO_SLIDES[currentIdx];

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
          <Link href="/sports" className="btn primary">
            Explore the arena →
          </Link>
          <Link href="/display" className="btn ghost">
            Watch live
          </Link>
        </div>

        {/* Slide Indicators */}
        <div className="slidebar" aria-label="Carousel navigation">
          {HERO_SLIDES.map((slide, idx) => (
            <button
              key={slide.kicker}
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
