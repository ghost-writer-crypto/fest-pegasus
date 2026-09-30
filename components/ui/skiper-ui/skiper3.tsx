"use client";

import { motion } from "framer-motion";
import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface Skiper3Props {
  className?: string;
  defaultOpen?: boolean;
}

export const Skiper3: React.FC<Skiper3Props> = ({
  className,
  defaultOpen = false,
}) => {
  const [active, setActive] = useState(defaultOpen);

  return (
    <div className={cn("inline-flex items-center", className)}>
      <motion.div
        layout
        className="relative flex items-center justify-between overflow-hidden rounded-full border border-[#1A3663]/25 bg-[#0F2242]/90 backdrop-blur-md px-3 py-1.5 shadow-lg text-white"
        style={{
          boxShadow: active
            ? "0 8px 24px rgba(26, 54, 99, 0.25), 0 0 0 1px rgba(229, 55, 55, 0.4)"
            : "0 4px 14px rgba(26, 54, 99, 0.15)",
        }}
        initial={false}
        animate={{
          width: active ? 320 : 155,
        }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
      >
        {/* Left Section: Live Pulse & Channel Label */}
        <button
          type="button"
          onClick={() => setActive((x) => !x)}
          className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[#F2B84B] rounded-full cursor-pointer pr-1"
          aria-expanded={active}
          aria-label={active ? "Collapse arena broadcast feed" : "Expand arena broadcast feed"}
        >
          <span className="relative flex h-2.5 w-2.5 items-center justify-center">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full opacity-75",
                active ? "bg-[#E53737] animate-ping" : "bg-[#5B9BD5]"
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                active ? "bg-[#E53737]" : "bg-[#5B9BD5]"
              )}
            />
          </span>

          <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-white/90">
            {active ? "LIVE FEED" : "BROADCAST"}
          </span>

          {!active && (
            <span className="font-mono text-[9px] text-[#5B9BD5] font-semibold">
              CH-01
            </span>
          )}
        </button>

        {/* Expanded Content: Frequency equalizer bars & Station Info */}
        {active && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.12 }}
            className="flex items-center gap-1.5 px-2 border-l border-white/15"
          >
            <span className="font-mono text-[9px] font-medium text-white/70 tracking-tight">
              ARENA TRACK 1
            </span>
            <div className="flex items-end gap-[3px] h-3 px-1">
              <span className="w-[2px] bg-[#E53737] rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-2.5" />
              <span className="w-[2px] bg-[#F2B84B] rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.2s] h-3" />
              <span className="w-[2px] bg-[#5B9BD5] rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.4s] h-1.5" />
              <span className="w-[2px] bg-[#E53737] rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.1s] h-2" />
            </div>
          </motion.div>
        )}

        {/* Toggle Trigger Icon */}
        <button
          type="button"
          onClick={() => setActive((x) => !x)}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
            active ? "bg-[#E53737] text-white" : "bg-white/10 hover:bg-white/20 text-white/90"
          )}
          title={active ? "Mute Broadcast" : "Open Live Feed"}
          aria-label={active ? "Mute Broadcast" : "Open Live Feed"}
        >
          {active ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
          )}
        </button>
      </motion.div>
    </div>
  );
};
