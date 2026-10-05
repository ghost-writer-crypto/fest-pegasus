"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export interface Skiper10Props {
  /**
   * Number of staircase vertical columns across the viewport.
   * @default 6
   */
  columns?: number;
  /**
   * Duration of each column's wipe animation in seconds.
   * @default 0.85
   */
  duration?: number;
  /**
   * Stagger delay between sequential columns in seconds.
   * @default 0.065
   */
  staggerDelay?: number;
  /**
   * Cubic bezier easing curve for fluid, high-end deceleration.
   * @default [0.76, 0, 0.24, 1]
   */
  ease?: [number, number, number, number];
  /**
   * Timing synchronization mode between top and bottom staircases:
   * - "synchronized": Top and bottom columns wipe in exact column-by-column synchronization
   * - "mirrored": Top wipes left-to-right while bottom wipes right-to-left
   * - "converging": Outer columns wipe inward toward center
   * @default "synchronized"
   */
  timingMode?: "synchronized" | "mirrored" | "converging";
  /**
   * Main brand title text.
   * @default "ZENITHROW"
   */
  brandTitle?: string;
  /**
   * Brand category / emblem pill text.
   * @default "PEGASUS CHAMPIONSHIP 2026"
   */
  emblemText?: string;
  /**
   * Subtitle description row.
   * @default "PRECISION ATHLETICS • KERALA CAMPUS MEET"
   */
  brandSubtitle?: string;
  /**
   * Whether to display the live telemetry numeric counter (00 -> 100%).
   * @default true
   */
  showCounter?: boolean;
  /**
   * Minimum display time before the dual-direction staircase exit sequence begins (in ms).
   * @default 1400
   */
  minDisplayTime?: number;
  /**
   * Callback fired once the entire preloader exit animation completes and unmounts.
   */
  onComplete?: () => void;
  /**
   * Optional custom container class name.
   */
  className?: string;
}

export const Skiper10: React.FC<Skiper10Props> = ({
  columns = 6,
  duration = 0.85,
  staggerDelay = 0.065,
  ease = [0.76, 0, 0.24, 1],
  timingMode = "synchronized",
  brandTitle = "ZENITHROW",
  emblemText = "CHAMPIONSHIP 2026",
  brandSubtitle = "PRECISION ATHLETICS • KERALA CAMPUS MEET",
  showCounter = true,
  minDisplayTime = 1400,
  onComplete,
  className,
}) => {
  const [isActive, setIsActive] = useState(true);
  const [showCenter, setShowCenter] = useState(true);
  const [progress, setProgress] = useState(0);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsActive(false);
      onComplete?.();
      return;
    }

    // Counter animation 0 -> 100%
    const counterInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(counterInterval);
          return 100;
        }
        const increment = Math.floor(Math.random() * 8) + 4;
        return Math.min(100, prev + increment);
      });
    }, 45);

    // Fade out center brand slightly before staircase starts wiping
    const centerTimer = setTimeout(() => {
      setShowCenter(false);
    }, Math.max(300, minDisplayTime - 250));

    // Trigger double staircase exit
    const exitTimer = setTimeout(() => {
      setIsActive(false);
    }, minDisplayTime);

    // Calculate total duration until full unmount
    const totalExitTime =
      minDisplayTime + (columns - 1) * staggerDelay * 1000 + duration * 1000 + 100;

    const unmountTimer = setTimeout(() => {
      onComplete?.();
    }, totalExitTime);

    return () => {
      clearInterval(counterInterval);
      clearTimeout(centerTimer);
      clearTimeout(exitTimer);
      clearTimeout(unmountTimer);
    };
  }, [minDisplayTime, columns, staggerDelay, duration, onComplete]);

  // Synchronized timing delay resolver
  const getDelay = (index: number, direction: "top" | "bottom"): number => {
    if (timingMode === "synchronized") {
      return index * staggerDelay;
    }
    if (timingMode === "mirrored") {
      return direction === "top"
        ? index * staggerDelay
        : (columns - 1 - index) * staggerDelay;
    }
    if (timingMode === "converging") {
      const mid = (columns - 1) / 2;
      const distFromEdge = Math.min(index, columns - 1 - index);
      return distFromEdge * staggerDelay;
    }
    return index * staggerDelay;
  };

  // Top column animation variants
  const topColumnVariants: Variants = {
    initial: { y: "0%" },
    exit: (i: number) => ({
      y: "-102%",
      transition: {
        duration,
        ease: ease as [number, number, number, number],
        delay: getDelay(i, "top"),
      },
    }),
  };

  // Bottom column animation variants
  const bottomColumnVariants: Variants = {
    initial: { y: "0%" },
    exit: (i: number) => ({
      y: "102%",
      transition: {
        duration,
        ease: ease as [number, number, number, number],
        delay: getDelay(i, "bottom"),
      },
    }),
  };

  // Center typography exit variants
  const centerVariants: Variants = {
    initial: { opacity: 0, scale: 0.96, y: 12 },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
    },
    exit: {
      opacity: 0,
      scale: 0.94,
      y: -10,
      transition: { duration: 0.28, ease: [0.76, 0, 0.24, 1] as [number, number, number, number] },
    },
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[99999] pointer-events-none select-none overflow-hidden",
        className
      )}
      aria-hidden={!isActive}
      role="presentation"
    >
      <AnimatePresence mode="sync">
        {isActive && (
          <>
            {/* ============================================================== */}
            {/* 1. TOP STAIRCASE (Moves toward the top) */}
            {/* ============================================================== */}
            <div
              className="absolute inset-x-0 top-0 h-[calc(50%+1px)] flex pointer-events-auto z-20"
              aria-hidden="true"
            >
              {Array.from({ length: columns }).map((_, i) => (
                <motion.div
                  key={`top-col-${i}`}
                  custom={i}
                  variants={topColumnVariants}
                  initial="initial"
                  exit="exit"
                  className="flex-1 h-full relative overflow-hidden bg-gradient-to-b from-[#05070A] via-[#090D14] to-[#0E1420] border-r border-white/[0.07] last:border-r-0 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
                  style={{ willChange: "transform" }}
                >
                  {/* Subtle architectural vertical grid line */}
                  <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-white/10 via-white/[0.04] to-transparent pointer-events-none" />

                  {/* Synchronized glowing accent beam at the split seam */}
                  <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#E53935]/70 to-transparent shadow-[0_0_12px_rgba(229,57,53,0.5)]" />
                </motion.div>
              ))}
            </div>

            {/* ============================================================== */}
            {/* 2. BOTTOM STAIRCASE (Moves toward the bottom) */}
            {/* ============================================================== */}
            <div
              className="absolute inset-x-0 bottom-0 h-[calc(50%+1px)] flex pointer-events-auto z-20"
              aria-hidden="true"
            >
              {Array.from({ length: columns }).map((_, i) => (
                <motion.div
                  key={`bottom-col-${i}`}
                  custom={i}
                  variants={bottomColumnVariants}
                  initial="initial"
                  exit="exit"
                  className="flex-1 h-full relative overflow-hidden bg-gradient-to-t from-[#05070A] via-[#090D14] to-[#0E1420] border-r border-white/[0.07] last:border-r-0 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]"
                  style={{ willChange: "transform" }}
                >
                  {/* Subtle architectural vertical grid line */}
                  <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-t from-white/10 via-white/[0.04] to-transparent pointer-events-none" />

                  {/* Synchronized glowing accent beam at the split seam */}
                  <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#2563EB]/70 to-transparent shadow-[0_0_12px_rgba(37,99,235,0.5)]" />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ================================================================ */}
      {/* 3. CENTER PRESTIGE EMBLEM & SYNCHRONIZED TELEMETRY READOUT */}
      {/* ================================================================ */}
      <AnimatePresence>
        {showCenter && (
          <motion.div
            variants={centerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-30 pointer-events-none"
          >
            {/* Emblem Pill */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/15 backdrop-blur-xl mb-4 shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E53935] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E53935] shadow-[0_0_8px_#E53935]" />
              </span>
              <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-white/90 uppercase">
                {emblemText}
              </span>
            </div>

            {/* Brand Title */}
            <div className="overflow-hidden mb-3">
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-[0.24em] text-white pl-[0.24em] drop-shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
                {brandTitle}
              </h1>
            </div>

            {/* Subtitle Row */}
            <div className="flex items-center gap-2.5 font-mono text-[10px] sm:text-xs font-semibold tracking-[0.16em] text-white/60 uppercase mb-5">
              <span>{brandSubtitle}</span>
            </div>

            {/* Numeric Progress Telemetry Counter */}
            {showCounter && (
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-md bg-black/40 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/60">
                    MATRIX CALIBRATION
                  </span>
                </div>
                <div className="h-3 w-[1px] bg-white/20" />
                <span className="font-mono text-xs font-black tracking-widest text-[#F59E0B]">
                  {String(progress).padStart(3, "0")}%
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Skiper10;
