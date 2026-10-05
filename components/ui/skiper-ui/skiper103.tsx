"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Scale,
  QrCode,
  Clock,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AccordionItemData {
  id: string;
  title: string;
  category?: string;
  description: string;
  icon?: LucideIcon;
  badge?: string;
}

export const DEFAULT_ACCORDION_ITEMS: AccordionItemData[] = [
  {
    id: "item-points-engine",
    title: "Championship Points & House Standings Engine",
    category: "STANDINGS MATRIX",
    badge: "OFFICIAL RULE",
    icon: Trophy,
    description:
      "Points are awarded across 1st, 2nd, and 3rd rank finishers following official collegiate athletics standards (5-3-1 for individual disciplines, 10-6-2 for team matches). Every verified field score immediately propagates into the live championship leaderboard with zero cross-house leakage.",
  },
  {
    id: "item-tug-weight",
    title: "Tug-of-War 600kg Cumulative Weight Protocol",
    category: "TECHNICAL SCRUTINY",
    badge: "WEIGH-IN",
    icon: Scale,
    description:
      "All 8 main-pull roster athletes must weigh in collectively under the verified 600.00kg threshold at the South Station prior to arena entry. Substitutes are weighed separately and prospective substitutions exceeding the quota limit are automatically blocked by the registry engine.",
  },
  {
    id: "item-qr-credentials",
    title: "Dynamic QR Credential & Athlete Verification",
    category: "DIGITAL IDENTITY",
    badge: "SECURITY",
    icon: QrCode,
    description:
      "Athletes, team managers, and field judges authenticate via cryptographically unguessable on-demand QR credentials. Tokens rotate dynamically upon verification, preventing proxy attendance and ensuring real-time lane assignment tracking.",
  },
  {
    id: "item-schedule-policy",
    title: "Schedule Operations & Timetable Management",
    category: "TIMETABLE",
    badge: "ARENA OPERATIONS",
    icon: Clock,
    description:
      "Track and field programmes strictly follow the official October 2026 timetable across all main campus venues. In the event of weather holds or heat adjustments, the Central Operations Desk pushes synchronized telemetry alerts to all field stations.",
  },
  {
    id: "item-appeals-jury",
    title: "Judicial Appeals & Post-Match Review Window",
    category: "JURY PROTOCOL",
    badge: "REGULATION",
    icon: ShieldCheck,
    description:
      "Formal score or disqualification appeals must be lodged by accredited Team Managers within 30 minutes of initial result publication. The Jury of Appeal reviews digital finish-line telemetry and provides binding written resolution within 60 minutes.",
  },
];

export interface Skiper103Props {
  items?: AccordionItemData[];
  defaultOpenId?: string | null;
  allowMultiple?: boolean;
  kicker?: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const Skiper103: React.FC<Skiper103Props> = ({
  items = DEFAULT_ACCORDION_ITEMS,
  defaultOpenId = "item-points-engine",
  allowMultiple = false,
  kicker = "Tournament Directives",
  title = "Frequently Addressed Arena Regulations",
  subtitle = "Official guidelines, scoring matrices, and operational scrutiny governing the PEGASUS 2026 Championship.",
  className,
}) => {
  const [openIds, setOpenIds] = useState<string[]>(
    defaultOpenId ? [defaultOpenId] : []
  );

  const toggleItem = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <section
      className={cn(
        "relative w-full py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#06080C] via-[#090D14] to-[#06080C] text-white overflow-hidden",
        className
      )}
      aria-label="Tournament Regulations Accordion"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-[#E53935]/10 via-[#2563EB]/10 to-transparent blur-[120px] pointer-events-none" />

      <div className="relative max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center md:text-left mb-12">
          {kicker && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md mb-3">
              <Sparkles className="h-3 w-3 text-[#E53935]" />
              <span className="font-mono text-[10px] font-bold tracking-widest text-white/80 uppercase">
                {kicker}
              </span>
            </div>
          )}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm sm:text-base text-[#94A3B8] max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {/* Accordion List with Gap Between Items */}
        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const isOpen = openIds.includes(item.id);
            const Icon = item.icon || Sparkles;

            return (
              <motion.div
                key={item.id}
                layout
                transition={{
                  layout: { type: "spring", stiffness: 350, damping: 28 },
                }}
                className={cn(
                  "relative rounded-2xl border transition-all duration-300 overflow-hidden",
                  isOpen
                    ? "bg-[#0E1524]/90 border-white/20 shadow-[0_12px_36px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.08)]"
                    : "bg-[#0A0E17]/70 border-white/[0.08] hover:border-white/15 hover:bg-[#0E1524]/60 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                )}
              >
                {/* Active Accent Top Line */}
                {isOpen && (
                  <motion.div
                    layoutId="active-accordion-line"
                    className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#E53935] to-[#2563EB]"
                  />
                )}

                {/* Accordion Trigger Header */}
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between p-5 sm:p-6 text-left gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                    {/* Glassmorphism-Styled Leading Icon */}
                    <div
                      className={cn(
                        "relative flex-shrink-0 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border backdrop-blur-xl transition-all duration-300",
                        isOpen
                          ? "bg-gradient-to-br from-[#E53935]/25 via-white/[0.08] to-transparent border-[#E53935]/50 text-white shadow-[0_0_20px_rgba(229,57,53,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]"
                          : "bg-white/[0.05] border-white/10 text-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] group-hover:border-white/20 group-hover:text-white"
                      )}
                    >
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300" />
                    </div>

                    {/* Title & Metadata */}
                    <div className="min-w-0">
                      {item.category && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[9px] sm:text-[10px] font-bold tracking-widest text-[#F59E0B] uppercase">
                            {item.category}
                          </span>
                          {item.badge && (
                            <span className="font-mono text-[8px] sm:text-[9px] px-1.5 py-0.5 rounded bg-white/[0.07] border border-white/10 text-white/60 uppercase">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                      <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug truncate sm:whitespace-normal">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  {/* Glassmorphism-Styled Trailing Spring Chevron Icon */}
                  <div
                    className={cn(
                      "flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300",
                      isOpen
                        ? "bg-white/15 border-white/25 text-white shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                        : "bg-white/[0.04] border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 24 }}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </motion.div>
                  </div>
                </button>

                {/* Accordion Expand/Collapse Content */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key={`content-${item.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{
                        height: "auto",
                        opacity: 1,
                        transition: {
                          height: { type: "spring", stiffness: 350, damping: 28 },
                          opacity: { duration: 0.25, delay: 0.05 },
                        },
                      }}
                      exit={{
                        height: 0,
                        opacity: 0,
                        transition: {
                          height: { type: "spring", stiffness: 350, damping: 28 },
                          opacity: { duration: 0.18 },
                        },
                      }}
                      className="overflow-hidden"
                    >
                      <motion.div
                        initial={{ y: -8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -8, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 24 }}
                        className="px-5 sm:px-6 pb-6 pt-1 text-sm sm:text-base text-[#94A3B8] leading-relaxed border-t border-white/[0.06] mt-1"
                      >
                        {item.description}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Skiper103;
