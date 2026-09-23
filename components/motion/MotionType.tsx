"use client";

import { useEffect, useRef, useState, useSyncExternalStore, ElementType, ReactNode } from "react";
import styles from "./MotionType.module.css";

interface MotionTypeProps {
  as?: ElementType;
  children: ReactNode;
  variant?: "mask" | "tracking" | "editorial-lift";
  className?: string;
  delay?: number;
  duration?: number;
  id?: string;
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

export default function MotionType({
  as: Component = "div",
  children,
  variant = "mask",
  className = "",
  delay = 0,
  duration = 420,
  id,
}: MotionTypeProps) {
  const ref = useRef<HTMLElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

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
          setIsRevealed(true);
          observer.unobserve(el);
        }
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -20px 0px",
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isReducedMotion]);

  const active = isReducedMotion || isRevealed;

  return (
    <Component
      ref={ref}
      id={id}
      className={`${styles.typeWrap} ${styles[variant]} ${active ? styles.revealed : ""} ${className}`}
      style={{
        "--type-delay": `${delay}ms`,
        "--type-duration": `${duration}ms`,
      } as React.CSSProperties}
    >
      <span className={styles.innerContent}>{children}</span>
    </Component>
  );
}
