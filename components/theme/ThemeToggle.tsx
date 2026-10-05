"use client";

import React from "react";
import Skiper26, {
  type ThemeTransitionVariant,
} from "@/components/ui/skiper-ui/skiper26";

export interface ThemeToggleProps {
  variant?: ThemeTransitionVariant;
  showVariantSelector?: boolean;
  floating?: boolean;
  className?: string;
}

export default function ThemeToggle({
  variant = "circle",
  showVariantSelector = false,
  floating = false,
  className,
}: ThemeToggleProps) {
  return (
    <Skiper26
      defaultVariant={variant}
      showVariantSelector={showVariantSelector}
      floating={floating}
      className={className}
    />
  );
}
