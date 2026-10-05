"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

export type ThemeTransitionVariant =
  | "circle"
  | "circle-blur"
  | "bottom-up"
  | "gif";

export interface UseThemeToggleOptions {
  variant?: ThemeTransitionVariant;
  duration?: number;
  onThemeChange?: (theme: "light" | "dark") => void;
}

/**
 * useThemeToggle: Hook to trigger smooth View Transition API animations
 * with variants: circle, circle-blur, bottom-up, and gif/ripple.
 */
export function useThemeToggle(options: UseThemeToggleOptions = {}) {
  const { theme, setTheme } = useTheme();
  const [variant, setVariant] = useState<ThemeTransitionVariant>(
    options.variant || "circle"
  );
  const isDark = theme === "dark";

  const executeTransition = useCallback(
    async (
      nextTheme: "light" | "dark",
      coords?: { x: number; y: number }
    ) => {
      // 1. Check for reduced motion or lack of View Transition API support
      if (
        typeof document === "undefined" ||
        !("startViewTransition" in document) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        setTheme(nextTheme);
        options.onThemeChange?.(nextTheme);
        return;
      }

      const x = coords?.x ?? window.innerWidth / 2;
      const y = coords?.y ?? window.innerHeight / 2;
      const endRadius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      // Start view transition
      const transition = (
        document as unknown as {
          startViewTransition: (callback: () => void) => {
            ready: Promise<void>;
            finished: Promise<void>;
          };
        }
      ).startViewTransition(() => {
        // Immediate DOM attribute update for instant visual capture
        document.documentElement.setAttribute("data-theme", nextTheme);
        setTheme(nextTheme);
        options.onThemeChange?.(nextTheme);
      });

      try {
        await transition.ready;

        // Execute animation variant on documentElement ::view-transition-new(root)
        if (variant === "circle") {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
              ],
            },
            {
              duration: options.duration ?? 520,
              easing: "ease-in-out",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        } else if (variant === "circle-blur") {
          document.documentElement.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${endRadius}px at ${x}px ${y}px)`,
              ],
              filter: ["blur(16px)", "blur(0px)"],
              opacity: [0.6, 1],
            },
            {
              duration: options.duration ?? 650,
              easing: "cubic-bezier(0.16, 1, 0.3, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        } else if (variant === "bottom-up") {
          document.documentElement.animate(
            {
              clipPath: [
                "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
                "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
              ],
            },
            {
              duration: options.duration ?? 550,
              easing: "cubic-bezier(0.76, 0, 0.24, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        } else if (variant === "gif") {
          // Dynamic graphic ripple distortion effect
          document.documentElement.animate(
            {
              clipPath: [
                "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)",
                "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
              ],
              transform: ["scale(0.94) rotate(-1.5deg)", "scale(1) rotate(0deg)"],
              filter: [
                "contrast(140%) brightness(1.25) saturate(1.2)",
                "contrast(100%) brightness(1) saturate(1)",
              ],
            },
            {
              duration: options.duration ?? 620,
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              pseudoElement: "::view-transition-new(root)",
            }
          );
        }
      } catch (err) {
        console.warn("[useThemeToggle] View Transition cancelled or error:", err);
      }
    },
    [options, setTheme, variant]
  );

  const toggleTheme = useCallback(
    (e?: React.MouseEvent | { clientX: number; clientY: number }) => {
      const nextTheme = theme === "light" ? "dark" : "light";
      const coords = e ? { x: e.clientX, y: e.clientY } : undefined;
      executeTransition(nextTheme, coords);
    },
    [theme, executeTransition]
  );

  return {
    theme,
    isDark,
    toggleTheme,
    variant,
    setVariant,
  };
}

export interface Skiper26Props {
  defaultVariant?: ThemeTransitionVariant;
  showVariantSelector?: boolean;
  floating?: boolean;
  className?: string;
}

export const Skiper26: React.FC<Skiper26Props> = ({
  defaultVariant = "circle",
  showVariantSelector = false,
  floating = false,
  className,
}) => {
  const { isDark, toggleTheme, variant, setVariant } = useThemeToggle({
    variant: defaultVariant,
  });
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05]",
          className
        )}
      />
    );
  }

  const VARIANTS: { id: ThemeTransitionVariant; label: string }[] = [
    { id: "circle", label: "Radial Circle" },
    { id: "circle-blur", label: "Diffused Blur" },
    { id: "bottom-up", label: "Bottom Up" },
    { id: "gif", label: "Dynamic Ripple" },
  ];

  return (
    <div
      ref={menuRef}
      className={cn(
        "relative inline-flex items-center",
        floating && "fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990] pointer-events-auto",
        className
      )}
    >
      <div className="relative flex items-center gap-2 p-1.5 rounded-full bg-[#0A0E17]/85 backdrop-blur-2xl border border-white/20 shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] hover:border-white/35 transition-all">
        {/* Primary Animated Circular Toggle Button */}
        <motion.button
          type="button"
          onClick={(e) => toggleTheme(e)}
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          title={`Switch to ${isDark ? "light" : "dark"} mode (Transition: ${variant})`}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          className="relative flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-gradient-to-br from-white/15 via-white/[0.06] to-transparent border border-white/20 text-white shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer transition-all"
        >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="sun"
              initial={{ rotate: -90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Sun className="h-4 w-4 text-[#F59E0B]" />
            </motion.div>
          ) : (
            <motion.div
              key="moon"
              initial={{ rotate: 90, scale: 0.6, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Moon className="h-4 w-4 text-[#38BDF8]" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Optional Transition Variant Selector Dropdown */}
      {showVariantSelector && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label="Select transition variant"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-[11px] font-mono font-medium text-white/80 cursor-pointer backdrop-blur-md transition-colors"
          >
            <Sparkles className="h-3 w-3 text-[#E53935]" />
            <span className="capitalize">{variant}</span>
            <ChevronDown className="h-3 w-3 text-white/50" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-36 py-1.5 rounded-xl border border-white/15 bg-[#0C1017]/95 backdrop-blur-2xl shadow-2xl z-50 overflow-hidden"
              >
                {VARIANTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setVariant(item.id);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 text-xs text-left cursor-pointer transition-colors",
                      variant === item.id
                        ? "bg-[#E53935]/15 text-[#E53935] font-semibold"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span>{item.label}</span>
                    {variant === item.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E53935]" />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      </div>
    </div>
  );
};

export default Skiper26;
