---
name: PEGASUS Sports Fest OS
description: Official tournament operating system and student sports festival platform
colors:
  primary: "#1A3663"
  action: "#E53737"
  secondary: "#5B9BD5"
  highlight: "#F2B84B"
  canvas: "#FFFFFF"
  surface-raised: "#F8FAFC"
  surface-sunken: "#E8EDF3"
  text-primary: "#1A3663"
  text-body: "#26364A"
  text-secondary: "#64748B"
  text-muted: "#8492A6"
  text-inverse: "#FFFFFF"
  border-default: "#E8EDF3"
  border-strong: "#C9D3DF"
  border-brand: "#1A3663"
  border-active: "#E53737"
typography:
  display:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "clamp(2rem, 3.6vw, 2.8rem)"
    fontWeight: 850
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "clamp(1.5rem, 2.5vw, 2rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "1.25rem"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    fontSize: "11px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "0.16em"
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "#C52929"
    textColor: "{colors.text-inverse}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.primary}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
---

# Design System: PEGASUS Sports Fest OS

## Overview

**Creative North Star: "The Championship Arena"**

PEGASUS is an athletic, editorial tournament operating system built for high-stakes collegiate competition. The visual language blends the speed and precision of live sports broadcast chyrons with the disciplined typography of contemporary sports journalism. The system communicates momentum, hierarchy, and indisputable mathematical accuracy.

Surfaces feel fast, sharp, and physically grounded. Rather than floating cards or diffuse SaaS shadows, the interface is structured around crisp architectural dividing rules, razor-sharp hairlines, and high-contrast typographic anchors. White space is expansive and intentional, framed by deep collegiate navy and punctuated by high-voltage competition red.

**Key Characteristics:**
- **Broadcast Kinetic Hierarchy**: Clear operational states (Live Now, In Adjudication, Verified, Meet Record) with distinct visual cues.
- **Architectural Line Gridwork**: Continuous horizontal rules anchor elements to baselines, acting as rails for data and state transitions.
- **Disciplined Form Language**: Micro-radii (2px–4px) maintain an engineered, hardware-like edge rather than bubbly consumer aesthetics.
- **Tabular Rigor**: High-density numerical alignment for times, distances, scores, and rankings across all devices.

---

## Colors

The palette is rooted in collegiate athletic heritage, engineered for high contrast and immediate status recognition under bright outdoor sun.

### Primary
- **Deep Stadium Navy** (`#1A3663`): The authoritative foundation. Used for primary headlines, solid interactive frames, navigation rules, brand marks, and dark architectural anchors.

### Secondary
- **Competition Crimson** (`#E53737`): The active energy vector. Strictly reserved for live states, primary call-to-action buttons, active radar pulses, and urgent time-sensitive alerts.
- **Atmospheric Sky Blue** (`#5B9BD5`): The editorial secondary. Used for section kickers, sub-category markers, and secondary graphic rules.

### Tertiary
- **Championship Gold** (`#F2B84B`): The achievement highlight. Reserved for first-place podium finishes, tournament leader highlights, and pending status tags.

### Neutral
- **Pure White Canvas** (`#FFFFFF`): The primary public surface canvas and card background.
- **Ice Support Gray** (`#E8EDF3`): Architectural divider rules, container outlines, and light resting badge fills.
- **Slate Frame Border** (`#C9D3DF`): Strong interactive borders and hover boundaries.
- **Carbon Body** (`#26364A`): High-legibility long-form body text and descriptive summaries.
- **Muted Press Slate** (`#64748B`): Secondary timestamps, category metadata, and tabular column labels.
- **Subtle Muted Gray** (`#8492A6`): Fine print, copyright notices, and inactive status indicators.

### Operational Worlds Dark Palette (Admin / Judge / Display)
The operational shells (`.pegasus-admin-shell`, `.pegasus-judge-shell`, `.pegasus-tm-shell`, `.pegasus-display-shell`) maintain an isolated dark identity:
- Canvas: `#070707`
- Surface: `#101010`
- Border: `rgba(255, 255, 255, 0.09)`
- Operational Lime Accent: `#D7FF3F` (high-visibility field scoring under direct sunlight)

### Named Rules
**The 10% Accent Rule.** Competition Crimson (`#E53737`) is an emergency and action beacon. It must never cover more than 10% of any viewport. Its power comes from restraint.
**The No-Neon Public Rule.** Arbitrary neon green, purple, cyan, or pastel gradients are strictly prohibited in the public festival world. Use only the approved palette.

---

## Typography

**Display Font:** System Sans-Serif stack (`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)  
**Body Font:** System Sans-Serif stack  
**Label / Monospace Font:** System Monospace stack (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`)  

**Character:** Heavy athletic display headlines set in ultra-bold weights (`850`), tight tracking (`-0.035em`), and uppercase editorial transformations, paired with technical monospace labels and tabular numerical figures.

### Hierarchy
- **Display** (`weight: 850`, `size: clamp(2rem, 3.6vw, 2.8rem)`, `line-height: 1.05`, `letter-spacing: -0.035em`): Section headings (`THE SPORTS`, `TODAY`, `HOUSE STANDINGS`). Uppercase.
- **Headline** (`weight: 800`, `size: clamp(1.5rem, 2.5vw, 2rem)`, `line-height: 1.15`, `letter-spacing: -0.025em`): Hero headlines and major card titles.
- **Title** (`weight: 750`, `size: 1.25rem`, `line-height: 1.25`, `letter-spacing: -0.015em`): Row items, event titles, and fixture matchups.
- **Body** (`weight: 400`, `size: 1rem`, `line-height: 1.5`, `letter-spacing: normal`): Event descriptions and editorial notes. Max line length: 65ch.
- **Label** (`weight: 750`, `size: 11px`, `line-height: 1.2`, `letter-spacing: 0.16em`): Monospace section kickers (`04 / THE DISCIPLINES`, `LIVE NOW`), badge chips, and status tags. Uppercase.

### Named Rules
**The Tabular Number Rule.** All numerical figures (scores, ranks, times, metrics, distances) must render with `font-variant-numeric: tabular-nums` to prevent layout shift and enable instant vertical column scanning.
**The Monospace Anchor Rule.** Every major section title must be preceded by a numbered monospace kicker (`01 / ...`, `04 / ...`) to maintain narrative continuity down the festival timeline.

---

## Layout

**Container Model:** Centered container with a maximum width of `1280px` (`width: min(100% - 64px, 1280px)`). Mobile padding drops to `16px` on viewports under 640px.
**Vertical Rhythm:** Generous section breathing room with standard vertical padding of `96px 0`. Each major section is demarcated by a 1px architectural divider.
**Breakpoints:**
- Desktop: `1280px+`
- Tablet / Compact Desktop: `960px` (editorial columns compress, secondary copy truncates)
- Mobile: `640px` and `390px` (stacked rows, full-width actions, zero horizontal scrollbar)

---

## Elevation & Depth

PEGASUS rejects heavy drop shadows and blurred glassmorphism. Depth is achieved through **tonal contrast, hairline borders, and hardware-style inset rules**.

### Shadow Vocabulary
- **Subtle Surface** (`box-shadow: 0 1px 2px rgba(26, 54, 99, 0.05)`): Light resting separation for interactive cards.
- **Card Focus** (`box-shadow: 0 2px 8px rgba(26, 54, 99, 0.06)`): Hover state for public listing tiles.
- **Elevation Lift** (`box-shadow: 0 8px 24px -4px rgba(26, 54, 99, 0.08)`): Raised modal drawers and verification dialogs.

### Named Rules
**The Flat-By-Default Rule.** All components sit flat against the canvas at rest. Elevation increases only in response to direct pointer interaction or modal overlay states.

---

## Shapes

- **Architectural Radii**: Disciplined `2px` (`--radius-sm`) for buttons, badges, and action pills; `4px` (`--radius-md`) for cards; `9999px` (`--radius-full`) exclusively for circular status pulse dots and pill tags.
- **Borders**: Crisp `1px solid` hairlines. Neutral resting borders use `#E8EDF3`; interactive borders strengthen to `#1A3663` or `#E53737`.
- **Mask Windows**: Kinetic typography and status changes roll within strict rectangular clipping windows (`overflow: hidden`).

---

## Components

### Buttons
- **Shape:** Rectangular with disciplined 2px corners (`border-radius: 2px`).
- **Primary:** Background `#E53737`, text `#FFFFFF`, padding `12px 24px`, font weight 750, uppercase. Hover shifts to `#C52929` with `scale(0.985)` press response.
- **Secondary / Ghost:** Background `#FFFFFF`, text `#1A3663`, border `1px solid #E8EDF3`, padding `8px 16px`. Hover background `#E8EDF3`.

### Status Badges & Chips
- **Live Badge:** Background `#FEE2E2`, text `#E53737`, monospace font, with an active pulsating red dot (`#E53737`).
- **Verified Badge:** Background `#E8EDF3`, text `#1A3663`, monospace font.
- **Pending Badge:** Background `#FEF3C7`, text `#F2B84B`, monospace font.

### Broadcast Bar (`.broadcastStrip`)
- High-contrast operational ribbon anchoring live events (`LIVE NOW: 100M FINAL`). Left side features live event metadata; right side displays pulse indicator and direct schedule action.

### Standings Radar (`.standingsTable`)
- Proportional progress meter representing points relative to the tournament leader. The first-place house features a championship gold star (`★`) and gold bar accent.

### Sports Index Rows (`.sportRow`)
- Editorial row featuring index anchor (`01`), sport title, discipline tag, narrative synopsis, event count pill, and diagonal action arrow (`↗`).

### 🔒 FROZEN COMPONENTS
- **Hero Carousel Stage (`components/home/HeroCarousel.tsx` & `HeroCarousel.module.css`)**: **🔒 FROZEN**. Operates as a continuous scene transformation with directional shutter reveal, counter-pan focal planes, and coordinated kinetic typography. Do not refactor, retime, or modify.

---

## Do's and Don'ts

### Do:
- **Do** use the approved palette (`#1A3663`, `#E53737`, `#5B9BD5`, `#F2B84B`, `#FFFFFF`, `#E8EDF3`).
- **Do** use `font-variant-numeric: tabular-nums` for all scoreboards, point tables, and timing displays.
- **Do** respect the 10% limit on Competition Crimson (`#E53737`).
- **Do** preserve 100% resting layout fidelity when designing motion transitions.
- **Do** provide instant zero-duration fallbacks for users with `prefers-reduced-motion: reduce`.
- **Do** maintain strict isolation between the clean public world and high-contrast dark operational shells.

### Don't:
- **Don't** modify or refactor the frozen Hero Carousel (`components/home/HeroCarousel.tsx`).
- **Don't** introduce lime, purple, teal, magenta, or arbitrary neon colors into the public interface.
- **Don't** use generic floating cards, multi-color gradient blobs, or glassmorphism.
- **Don't** use bouncy, elastic, or constant-floating animations.
- **Don't** invent fictional official team names, logos, colors, or athlete data. Use development placeholders (`House 01`–`House 04`).
- **Don't** force an Islamic or anti-Islamic visual theme. Religious identity remains organic and contextual.
