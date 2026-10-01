"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";

export interface CompetitionCardData {
  id: string;
  name: string;
  sport: string;
  division: string;
  status: "FINISHED" | "LIVE" | "SCHEDULED" | "WEIGH-IN" | string;
  scheduledTime: string;
  venue: string;
  ctaLabel: string;
  ctaHref: string;
  kicker: string;
  summary?: string;
  badge?: string;
}

export const DEFAULT_COMPETITIONS: CompetitionCardData[] = [
  {
    id: "comp-race-100m-majestir",
    name: "100m Sprint Championship",
    sport: "Athletics",
    division: "Super Senior (Majestir)",
    status: "FINISHED",
    scheduledTime: "10:00 AM",
    venue: "Main Track // Lane 1-8",
    ctaLabel: "View Official Results",
    ctaHref: "/results",
    kicker: "01 // SPRINT TRACK",
    summary: "Electronic chip timing verified. Official gold mark set at 11.42s.",
    badge: "ELECTRONIC CHIP TIMING",
  },
  {
    id: "comp-long-jump-majestir",
    name: "Long Jump Invitational",
    sport: "Athletics",
    division: "Super Senior (Majestir)",
    status: "FINISHED",
    scheduledTime: "11:00 AM",
    venue: "Long Jump Pit // Runway A",
    ctaLabel: "View Pit Distances",
    ctaHref: "/results",
    kicker: "02 // FIELD HORIZONTAL",
    summary: "Official measurement recorded. Winning jump measured at 5.82m.",
    badge: "OPTICAL BOARD MEASUREMENT",
  },
  {
    id: "comp-high-jump-majestir",
    name: "High Jump Bar Finals",
    sport: "Athletics",
    division: "Super Senior (Majestir)",
    status: "FINISHED",
    scheduledTime: "02:00 PM",
    venue: "High Jump Mat // South Curve",
    ctaLabel: "Inspect Jump Clearance",
    ctaHref: "/results",
    kicker: "03 // FIELD VERTICAL",
    summary: "Clearance at 1.68m certified by Chief Field Adjudicator.",
    badge: "CERTIFIED HEIGHT BAR",
  },
  {
    id: "comp-football-knockouts",
    name: "Collegiate Football Knockout",
    sport: "Football",
    division: "General Division",
    status: "SCHEDULED",
    scheduledTime: "04:30 PM",
    venue: "Central Stadium Turf",
    ctaLabel: "View Tournament Fixtures",
    ctaHref: "/fixtures",
    kicker: "04 // TEAM KNOCKOUT",
    summary: "4-House bracket elimination match under stadium lights.",
    badge: "FIFA REGULATION TURF",
  },
  {
    id: "comp-tug-of-war-600kg",
    name: "Tug-of-War 600kg Arena",
    sport: "Tug of War",
    division: "General (600kg Limit)",
    status: "WEIGH-IN",
    scheduledTime: "06:00 PM",
    venue: "Central Arena Pit",
    ctaLabel: "View Squad Rosters",
    ctaHref: "/teams",
    kicker: "05 // STRENGTH SHOWDOWN",
    summary: "Strict calibrated loadcell weigh-in enforcement. 8 athletes per anchor line.",
    badge: "CALIBRATED LOAD CELL",
  },
];

interface StickyCardProps {
  card: CompetitionCardData;
  index: number;
  total: number;
  progress: any;
  range: [number, number];
  targetScale: number;
}

const StickyCompetitionCard: React.FC<StickyCardProps> = ({
  card,
  index,
  total,
  progress,
  range,
  targetScale,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useTransform(progress, range, [1, targetScale]);

  const isFinished = card.status === "FINISHED";
  const isWeighIn = card.status === "WEIGH-IN";
  const isScheduled = card.status === "SCHEDULED";

  return (
    <div
      ref={containerRef}
      className="sticky top-24 flex items-center justify-center w-full px-4 mb-8 sm:mb-12"
      style={{
        zIndex: index + 1,
      }}
    >
      <motion.div
        style={{
          scale,
        }}
        className="w-full max-w-4xl rounded-sm border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] p-6 sm:p-8 relative overflow-hidden transition-shadow zenith-edge"
      >
        {/* Subtle Top Architectural Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--secondary)] via-[var(--primary)] to-[#F2B84B]" />

        {/* Card Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold tracking-widest text-[var(--secondary)] uppercase">
              {card.kicker}
            </span>
            <span className="opacity-30">•</span>
            <span className="font-mono text-xs text-[var(--text-secondary)] uppercase">
              {card.sport}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isFinished && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider uppercase bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] rounded-xs">
                OFFICIAL FINAL
              </span>
            )}
            {isWeighIn && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider uppercase bg-[#F2B84B]/15 text-[#F2B84B] border border-[#F2B84B]/30 rounded-xs">
                WEIGH-IN PENDING
              </span>
            )}
            {isScheduled && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold tracking-wider uppercase bg-[var(--secondary)]/15 text-[var(--secondary)] border border-[var(--secondary)]/30 rounded-xs">
                UPCOMING
              </span>
            )}
            {card.badge && (
              <span className="hidden md:inline-block font-mono text-[10px] uppercase text-[var(--text-muted)] tracking-wider">
                {card.badge}
              </span>
            )}
          </div>
        </div>

        {/* Card Body Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-[var(--border)]">
          <div className="md:col-span-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] mb-2">
              {card.name}
            </h3>
            {card.summary && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
                {card.summary}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-xs font-mono text-[var(--text-muted)]">
              <div>
                <span className="text-[var(--text-muted)] block text-[10px] uppercase">Division</span>
                <span className="text-[var(--text-primary)] font-bold">{card.division}</span>
              </div>
              <div className="border-l border-[var(--border)] pl-4">
                <span className="text-[var(--text-muted)] block text-[10px] uppercase">Venue</span>
                <span className="text-[var(--text-primary)] font-bold">{card.venue}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between items-start md:items-end bg-[var(--surface-raised)] p-4 rounded-xs border border-[var(--border)]">
            <div>
              <span className="font-mono text-[10px] text-[var(--text-muted)] uppercase block">Scheduled Time</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-[#F2B84B]">
                {card.scheduledTime}
              </span>
            </div>

            <Link
              href={card.ctaHref}
              className="mt-4 md:mt-0 inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider transition-opacity rounded-xs shadow-md"
            >
              <span>{card.ctaLabel}</span>
              <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>

        {/* Card Footer: Metadata Indicators */}
        <div className="flex items-center justify-between pt-4 text-[11px] font-mono text-[var(--text-muted)]">
          <span>DISCIPLINE {index + 1} OF {total}</span>
          <span className="text-[var(--secondary)]">ZENITHROW OPERATING SYSTEM</span>
        </div>
      </motion.div>
    </div>
  );
};

export interface Skiper16Props {
  competitions?: CompetitionCardData[];
}

export const Skiper16: React.FC<Skiper16Props> = ({
  competitions = DEFAULT_COMPETITIONS,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      ref={containerRef}
      className="relative w-full py-16 border-b border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]"
      aria-label="Competition card deck"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8 text-center md:text-left">
        <div>
          <p className="font-mono text-xs font-bold tracking-widest text-[var(--secondary)] uppercase mb-1">
            04 // THE DISCIPLINES
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)] uppercase">
            COMPETITIONS IN MOTION
          </h2>
        </div>
      </div>

      <div className="relative w-full">
        {competitions.map((comp, i) => {
          const targetScale = Math.max(
            0.88,
            1 - (competitions.length - i - 1) * 0.03
          );
          return (
            <StickyCompetitionCard
              key={comp.id}
              card={comp}
              index={i}
              total={competitions.length}
              progress={scrollYProgress}
              range={[i * (1 / competitions.length), 1]}
              targetScale={targetScale}
            />
          );
        })}
      </div>
    </section>
  );
};

export default Skiper16;
