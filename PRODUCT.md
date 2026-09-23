# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Spectators & Student Athletes (Public)**: Students, alumni, and participants looking up live fixtures, event schedules, heat sheets, individual times/distances, verified results, and the overall House Championship leaderboard from mobile phones and personal devices during the festival.
2. **Judges & Field Referees (Operational)**: Adjudicators on the field recording track times, field event distances/heights, and match scorelines on touch devices, needing low-latency, unambiguous input mechanisms and immediate submission verification.
3. **Team Managers (House Representatives)**: House captains managing athlete entries, verifying division/quota eligibility, monitoring squad rosters, and tracking team fixtures and protest/appeal windows.
4. **Adjudication & Meet Directors (Admin)**: Tournament administrators managing festival schedules, clash detection, live score verification lifecycles, dispute resolutions, penalties, certificate generation, and official result publication.
5. **Stadium & Arena Operators (Display)**: Technical staff operating high-contrast full-screen stadium displays, big-screen radar leaderboards, and award ceremony medal podium boards.

## Product Purpose

PEGASUS is a **Sports Fest Operating System**, not merely a sports-fest website. It exists to provide an authoritative, tamper-proof, real-time operating core for a high-intensity student sports festival. Success means:
- Zero scheduling confusion and instant clash detection.
- Complete operational integrity from on-field judge entry to official verification and publication.
- A high-energy, broadcast-grade public experience that celebrates student athletic excellence and house pride without friction or delay.

## Positioning

Unlike generic festival marketing sites or static bracket generators, PEGASUS integrates the entire competition lifecycle into a unified, state-driven operating system:
`SPORT → EVENT → COMPETITION FORMAT → FIXTURE / HEAT → PARTICIPANTS / TEAMS → LIVE / FINAL RESULT → POINTS → LEADERBOARD`
Every scoreline, point allocation, and house ranking is derived deterministically through official adjudication rules and verified state transitions.

## Operating Context

- **Environment**: High-decibel campus sports arenas, open tracks under bright outdoor sunlight, crowded gymnasiums, and simultaneous multi-sport fixtures.
- **Hardware**: Handheld mobile devices with intermittent outdoor cellular connectivity (referees, athletes, students) alongside fixed high-resolution stadium displays and admin desktop workstations.
- **Cadence**: Fast-moving festival days with compressed turnaround times between heats, semi-finals, and medal rounds.

## Capabilities and Constraints

### Capabilities
- **Multi-world Architecture**: Strict segregation between Public, Judge/Referee, Team Manager, Admin, and Display surfaces.
- **Competition Engine**: Configurable event formats (Track & Field, Knockout Tournaments, League Draws), qualification quotas, and rule-based points aggregation.
- **Result Adjudication Lifecycle**: Draft → Submitted → Verified → Published, with audit trails and dispute/appeal handling.
- **Live Broadcast & Radar**: Real-time ticker, active heat monitors, and proportional House Championship standings.

### Technical Constraints
- Built with **Next.js 16 (Turbopack)**, **React 19**, **TypeScript**, **Vanilla CSS Modules**, and **Supabase PostgreSQL**.
- Zero external client animation libraries (no Framer Motion, GSAP, or heavy canvas runtimes) to preserve sub-second interaction speed on low-end mobile devices.
- Hardware-accelerated CSS transforms (`transform`, `opacity`, `clip-path`) and strict compositor budgets.

### Data Truths & Undecided Items
- **Official Team & House Identities**: **UNKNOWN / PENDING CONFIRMATION**. Official house names, codes, crests, and assigned brand colors are unconfirmed. Fictional official names, rosters, and points must never be fabricated. Development placeholders (`House 01`, `House 02`, `House 03`, `House 04`) are utilized until administrative sign-off.
- **Meet Schedule & Official Roster**: **UNKNOWN / PENDING CONFIRMATION**. Athlete rosters, heats, and timestamps in seed files represent structural test data only.
- **Rulebook Amendments**: Final division weight classes and individual entry quota caps are pending committee ratification.

## Brand Commitments

- **Name**: PEGASUS (Students' Sports Festival 2026).
- **Tone & Voice**: Sharp, energetic, authoritative, athletic, journalistic, and competitive.
- **Aesthetic Direction**: SPORTS × FESTIVAL × STUDENTS × COMPETITION × PREMIUM DIGITAL EXPERIENCE.
- **Cultural Stance**: Religious identity remains natural and contextual; neither an Islamic visual theme nor an anti-Islamic visual theme is imposed. PEGASUS is an inclusive, competitive festival operating system.

## Evidence on Hand

- **Foundation Migrations**: [`supabase/migrations/20260920000100_pegasus_core_foundation.sql`](file:///c:/Projects/Fest/supabase/migrations/20260920000100_pegasus_core_foundation.sql).
- **Seed Data Structures**: [`data/sports.ts`](file:///c:/Projects/Fest/data/sports.ts), [`data/events.ts`](file:///c:/Projects/Fest/data/events.ts), [`data/competitions.ts`](file:///c:/Projects/Fest/data/competitions.ts), [`data/leaderboard.ts`](file:///c:/Projects/Fest/data/leaderboard.ts).
- **Repository Abstractions**: [`lib/repositories/`](file:///c:/Projects/Fest/lib/repositories/).
- **Engine Rules**: [`lib/competition/`](file:///c:/Projects/Fest/lib/competition/).

## Product Principles

1. **Domain Over Decoration**: `DOMAIN → RULES → STATE → OPERATIONS → DATA → UI`. Visual interfaces reflect underlying competition state, never arbitrary ornamental noise.
2. **Zero Fictional Truth**: Never invent or display unverified team identities, athlete biographies, or points. Clearly indicate placeholders or unconfirmed items.
3. **Operational Isolation**: Field operations (referees, judges, scoring tables) must function reliably without dependency on marketing or public animations.
4. **Speed and Certainty**: Information hierarchy must be immediately scannable in high-pressure competition environments.
5. **Continuity of Stage**: State changes and transitions preserve spatial memory and hardware anchors across all viewports.

## Accessibility & Inclusion

- Responsive from 320px mobile viewports up to 4K ultra-wide stadium displays.
- High-contrast compliance across all text and UI elements against backgrounds.
- Tabular numeric alignment (`font-variant-numeric: tabular-nums`) across all scoreboards, timing, and point tallies.
- Comprehensive `prefers-reduced-motion` conformance across all motion and transition modules.
