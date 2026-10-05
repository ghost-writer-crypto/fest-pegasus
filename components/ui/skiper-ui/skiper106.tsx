"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useId,
  forwardRef,
  type InputHTMLAttributes,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SmoothInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  caretColor?: string;
  caretWidth?: number;
  containerClassName?: string;
  glow?: boolean;
}

/**
 * SmoothInput: Text input featuring a custom animated caret that smoothly
 * tracks the cursor position using offscreen canvas text metrics and spring physics.
 */
export const SmoothInput = forwardRef<HTMLInputElement, SmoothInputProps>(
  (
    {
      className,
      containerClassName,
      style,
      caretColor = "var(--primary, #E53935)",
      caretWidth = 2,
      glow = true,
      type = "text",
      value: controlledValue,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      onKeyDown,
      onSelect,
      onScroll,
      ...props
    },
    forwardedRef
  ) => {
    const innerRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Merge forwarded ref with innerRef
    const setRef = useCallback(
      (element: HTMLInputElement | null) => {
        (innerRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
        if (typeof forwardedRef === "function") {
          forwardedRef(element);
        } else if (forwardedRef) {
          (forwardedRef as React.MutableRefObject<HTMLInputElement | null>).current = element;
        }
      },
      [forwardedRef]
    );

    const [isFocused, setIsFocused] = useState(false);
    const [caretX, setCaretX] = useState<number>(14);
    const [caretY, setCaretY] = useState<number>(10);
    const [caretHeight, setCaretHeight] = useState<number>(20);
    const [hasSelection, setHasSelection] = useState(false);
    const [internalValue, setInternalValue] = useState<string>(
      String(controlledValue ?? defaultValue ?? "")
    );

    // Keep internalValue in sync with controlledValue
    useEffect(() => {
      if (controlledValue !== undefined) {
        setInternalValue(String(controlledValue));
      }
    }, [controlledValue]);

    // Initialize offscreen canvas once
    useEffect(() => {
      if (typeof window !== "undefined" && !canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }
    }, []);

    // Core function to calculate the precise pixel offset of the cursor
    const updateCaretPosition = useCallback(() => {
      const input = innerRef.current;
      if (!input || typeof window === "undefined") return;

      const selectionStart = input.selectionStart ?? 0;
      const selectionEnd = input.selectionEnd ?? 0;

      // Hide custom caret if user selected a range of text
      if (selectionStart !== selectionEnd) {
        setHasSelection(true);
        return;
      }
      setHasSelection(false);

      const computed = window.getComputedStyle(input);
      const canvas = canvasRef.current || document.createElement("canvas");
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Match canvas font to input computed styling
      const fontStyle = computed.fontStyle || "normal";
      const fontVariant = computed.fontVariant || "normal";
      const fontWeight = computed.fontWeight || "400";
      const fontSize = computed.fontSize || "14px";
      const fontFamily = computed.fontFamily || "sans-serif";
      ctx.font = `${fontStyle} ${fontVariant} ${fontWeight} ${fontSize} ${fontFamily}`;

      // Letter spacing support
      if ("letterSpacing" in ctx && computed.letterSpacing && computed.letterSpacing !== "normal") {
        (ctx as unknown as { letterSpacing: string }).letterSpacing = computed.letterSpacing;
      }

      const rawVal = input.value || "";
      const textUpToCaret = rawVal.slice(0, selectionStart);

      // In password fields, replace characters with bullet glyph
      const measuredText =
        input.type === "password"
          ? "•".repeat(textUpToCaret.length)
          : textUpToCaret;

      const textWidth = ctx.measureText(measuredText).width;

      const paddingLeft = parseFloat(computed.paddingLeft) || 12;
      const borderLeft = parseFloat(computed.borderLeftWidth) || 1;
      const paddingTop = parseFloat(computed.paddingTop) || 10;
      const paddingBottom = parseFloat(computed.paddingBottom) || 10;
      const scrollLeft = input.scrollLeft || 0;

      // Compute exact caret position
      const x = paddingLeft + borderLeft + textWidth - scrollLeft;
      const height =
        input.clientHeight - paddingTop - paddingBottom > 0
          ? Math.min(22, input.clientHeight - paddingTop - paddingBottom)
          : 18;
      const y = (input.clientHeight - height) / 2;

      setCaretX(x);
      setCaretY(y);
      setCaretHeight(height);
    }, []);

    // Re-measure on input value changes or selection shifts
    useEffect(() => {
      updateCaretPosition();
    }, [internalValue, isFocused, updateCaretPosition]);

    // Handle document-level selectionchange to catch arrow keys and mouse clicks
    useEffect(() => {
      if (!isFocused) return;

      const handleSelectionChange = () => {
        if (document.activeElement === innerRef.current) {
          updateCaretPosition();
        }
      };

      document.addEventListener("selectionchange", handleSelectionChange);
      return () => {
        document.removeEventListener("selectionchange", handleSelectionChange);
      };
    }, [isFocused, updateCaretPosition]);

    // ResizeObserver to recalibrate on layout adjustments
    useEffect(() => {
      const input = innerRef.current;
      if (!input || typeof ResizeObserver === "undefined") return;

      const ro = new ResizeObserver(() => {
        updateCaretPosition();
      });
      ro.observe(input);

      return () => ro.disconnect();
    }, [updateCaretPosition]);

    return (
      <div className={cn("relative w-full inline-block", containerClassName)}>
        <input
          ref={setRef}
          type={type}
          value={controlledValue}
          defaultValue={defaultValue}
          onFocus={(e) => {
            setIsFocused(true);
            updateCaretPosition();
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          onChange={(e) => {
            setInternalValue(e.target.value);
            updateCaretPosition();
            onChange?.(e);
          }}
          onKeyDown={(e) => {
            // Next frame guarantees selectionStart is updated
            requestAnimationFrame(updateCaretPosition);
            onKeyDown?.(e);
          }}
          onSelect={(e) => {
            updateCaretPosition();
            onSelect?.(e);
          }}
          onScroll={(e) => {
            updateCaretPosition();
            onScroll?.(e);
          }}
          className={cn(
            "w-full transition-colors outline-none",
            className
          )}
          style={{
            caretColor: "transparent",
            ...style,
          }}
          {...props}
        />

        {/* Custom Spring-Animated Caret Overlay */}
        <AnimatePresence>
          {isFocused && !hasSelection && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute z-10 rounded-full"
              initial={{ opacity: 0, scaleY: 0.4 }}
              animate={{
                opacity: 1,
                scaleY: 1,
                x: caretX,
                y: caretY,
                height: caretHeight,
              }}
              exit={{ opacity: 0, scaleY: 0.4 }}
              transition={{
                x: {
                  type: "spring",
                  stiffness: 480,
                  damping: 32,
                  mass: 0.7,
                },
                y: { duration: 0.1 },
                height: { duration: 0.1 },
                opacity: { duration: 0.15 },
              }}
              style={{
                width: caretWidth,
                backgroundColor: caretColor,
                boxShadow: glow
                  ? `0 0 10px ${caretColor}, 0 0 2px ${caretColor}`
                  : "none",
                willChange: "transform",
                left: 0,
                top: 0,
              }}
            >
              {/* Subtle blink pulse animation while stationary */}
              <motion.span
                className="block w-full h-full rounded-full"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{
                  repeat: Infinity,
                  duration: 1.05,
                  ease: "easeInOut",
                }}
                style={{ backgroundColor: caretColor }}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

SmoothInput.displayName = "SmoothInput";

/**
 * Standard baseline input for visual comparison.
 */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder-white/40 focus:border-white/30 focus:outline-none transition-colors",
          className
        )}
        style={style}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

/**
 * Skiper106: Side-by-side comparison showcase component displaying
 * the custom spring-animated caret input beside a standard native input.
 */
export const Skiper106: React.FC<{
  title?: string;
  subtitle?: string;
  className?: string;
}> = ({
  title = "Smooth Caret Physics vs Native Input",
  subtitle = "Offscreen canvas font measurement with spring-mass cursor gliding versus standard browser caret rendering.",
  className,
}) => {
  const [smoothVal, setSmoothVal] = useState("Athletics 100m Sprint");
  const [nativeVal, setNativeVal] = useState("Athletics 100m Sprint");
  const uniqueId = useId();

  return (
    <section
      className={cn(
        "w-full py-12 px-4 sm:px-6 lg:px-8 bg-[#090D14]/90 border border-white/[0.08] rounded-3xl backdrop-blur-2xl shadow-2xl text-white",
        className
      )}
      aria-label="Caret Input Comparison"
    >
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-white/80 text-xs font-mono mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#E53935]" />
            <span>PRECISION INTERACTION // SKIPER-106</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-2">
            {title}
          </h3>
          <p className="text-sm text-[#94A3B8] max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Custom Smooth Animated Caret */}
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E53935] shadow-[0_0_8px_#E53935]" />
                <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                  Smooth Caret Input
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#E53935]/20 text-[#E53935] font-semibold border border-[#E53935]/30">
                SPRING PHYSICS
              </span>
            </div>

            <label
              htmlFor={`${uniqueId}-smooth`}
              className="block text-xs font-medium text-white/70 mb-2"
            >
              Click or arrow-navigate to observe gliding motion:
            </label>

            <SmoothInput
              id={`${uniqueId}-smooth`}
              value={smoothVal}
              onChange={(e) => setSmoothVal(e.target.value)}
              placeholder="Type anything here..."
              caretColor="#E53935"
              className="rounded-xl border border-white/15 bg-black/60 px-4 py-3.5 text-sm text-white placeholder-white/30 focus:border-[#E53935]/60 focus:ring-1 focus:ring-[#E53935]/40 transition-all font-mono"
            />

            <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-white/50">
              <Terminal className="w-3.5 h-3.5 text-[#E53935]" />
              <span>Canvas width tracking • Stiff spring mass: 0.7</span>
            </div>
          </div>

          {/* 2. Standard Native Browser Input */}
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/15 transition-all shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white/40" />
                <span className="font-mono text-xs font-bold text-white/70 uppercase tracking-wider">
                  Standard Native Input
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/60 font-semibold border border-white/10">
                DEFAULT BROWSER
              </span>
            </div>

            <label
              htmlFor={`${uniqueId}-native`}
              className="block text-xs font-medium text-white/60 mb-2"
            >
              Standard instant jumping cursor:
            </label>

            <Input
              id={`${uniqueId}-native`}
              value={nativeVal}
              onChange={(e) => setNativeVal(e.target.value)}
              placeholder="Standard input..."
              className="rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white/80 placeholder-white/30 focus:border-white/30 transition-all font-mono"
            />

            <div className="mt-4 flex items-center gap-2 text-[11px] font-mono text-white/40">
              <Terminal className="w-3.5 h-3.5 text-white/30" />
              <span>Instant step jump • No velocity interpolation</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skiper106;
