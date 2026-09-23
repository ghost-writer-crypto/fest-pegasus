"use client";

import { useEffect, useRef, useState, useSyncExternalStore, ReactNode } from "react";

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
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

export default function SectionReveal({
  children,
  className = "",
  id,
  "aria-labelledby": ariaLabelledby,
  "aria-label": ariaLabel,
}: SectionRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [isIntersected, setIsIntersected] = useState(false);
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
          setIsIntersected(true);
          observer.unobserve(el);
        }
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isReducedMotion]);

  const isRevealed = isReducedMotion || isIntersected;

  return (
    <section
      ref={ref}
      id={id}
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabel}
      className={`${className} ${isRevealed ? "sectionRevealed" : "sectionPending"}`}
    >
      {children}
    </section>
  );
}
