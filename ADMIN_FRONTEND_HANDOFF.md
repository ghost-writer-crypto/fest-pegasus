# PEGASUS / ZENITHROW Admin Frontend — Technical Handoff Document

> **CRITICAL ARCHITECTURAL NOTICE FOR FRONTEND DESIGNERS & ENGINEERS**  
> The PEGASUS / ZENITHROW Admin frontend is **already fully functional and production-wired**. It connects directly to live PostgreSQL / Supabase databases via dedicated server actions, repositories, domain calculators, clash-detection engines, and authentication gates.  
> **DO NOT** replace these functional React components with static HTML templates or mock data. Any mockups provided by committees are **visual references only**.

---

## 1. Admin Entry & Shell Architecture

### 1.1 Root Entry Route: `/admin`
* **File:** [`app/admin/page.tsx`](file:///c:/Projects/Fest/app/admin/page.tsx)
* **Rendering:** `force-dynamic` Server Component.
* **Functionality:** Central Command Center & Operational Telemetry. Fetches real-time festival statistics via `getAdminDashboardData()`, resolves administrator identity via `getAuthenticatedProfile()`, fetches/generates QR identity credentials, renders KPI tiles, active call queues, attention items, operational tables, and embeds the interactive [`AdminHeroMediaClient`](file:///c:/Projects/Fest/components/admin/AdminHeroMediaClient.tsx).

### 1.2 Layout & Security Gate: `AdminLayout`
* **File:** [`app/admin/layout.tsx`](file:///c:/Projects/Fest/app/admin/layout.tsx)
* **Functionality:** 
  1. Resolves server-side identity via `getAuthenticatedProfile()`.
  2. Enforces hard redirect to `/login?redirect=/admin&error=unauthorized_admin` if profile is missing, `role !== "admin"`, or `!isActive`.
  3. Pre-fetches or mints cryptographic QR identity tokens (`getOrCreateQrIdentity("profile", adminId)`).
  4. Passes authenticated administrator identity to `AdminShellClient`.

### 1.3 Client Shell Container: `AdminShellClient`
* **File:** [`components/admin/AdminShellClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminShellClient.tsx)
* **Functionality:**
  - Manages mobile navigation drawer state (`isDrawerOpen`), handles `Escape` key close listener, and locks body scrolling when open.
  - Automatically closes drawer on route navigation (`usePathname`).
  - Injects [`ZenithrowAdminTheme`](file:///c:/Projects/Fest/components/admin/ZenithrowAdminTheme.tsx) style tokens into the DOM.
  - Renders sidebar, backdrop, sticky topbar header, and the children workspace container (`.pegasus-admin-content`).

### 1.4 Navigation Sidebar: `AdminSidebar`
* **File:** [`components/admin/AdminSidebar.tsx`](file:///c:/Projects/Fest/components/admin/AdminSidebar.tsx)
* **Functionality:**
  - Renders 18 primary administrative destinations with active path highlighting (`usePathname`).
  - Distinguishes active vs available routes, provides mobile dismiss button, and displays live station indicator badge (`CR-ALPHA-01`).

### 1.5 Sticky Control Room Header: `AdminHeader`
* **File:** [`components/admin/AdminHeader.tsx`](file:///c:/Projects/Fest/components/admin/AdminHeader.tsx)
* **Functionality:**
  - Mobile hamburger toggle button.
  - Cockpit eyebrow kicker (`ZENITHROW 2026 • CENTRAL COCKPIT`).
  - Authenticated admin badge (display name, email, `ADMIN` badge).
  - Admin QR badge modal trigger (`<ShowQrButton>`).
  - Live operational heartbeat pill (`OPERATIONAL`).
  - External link to Public Portal (`/`).
  - Form action executing secure `logoutAction` server action.

---

## 2. Complete Admin Modules Matrix

Below is the definitive inventory of all 19 Admin modules.

| Module | Route | Client Component / UI File | Server Actions Used | Data Source / Repositories | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | `/admin` | [`app/admin/page.tsx`](file:///c:/Projects/Fest/app/admin/page.tsx), [`AdminHeroMediaClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminHeroMediaClient.tsx) | `logoutAction` | `getAdminDashboardData()`, `getAuthenticatedProfile()`, `getOrCreateQrIdentity()` | **REAL** |
| **Participants** | `/admin/participants` | [`AdminParticipantsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminParticipantsClient.tsx) | `createParticipantAction`, `updateParticipantAction`, `updateParticipantStatusAction`, `updateParticipantChestNumberAction`, `deleteParticipantAction`, `checkParticipantDependenciesAction` | `getParticipantsByFestivalAdmin()`, `getTeamsByFestival()`, `getDivisionsByFestival()`, `getEventsByFestival()` | **REAL** |
| **Competitions** | `/admin/competitions`, `/admin/competitions/[id]` | [`AdminCompetitionsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminCompetitionsClient.tsx), [`AdminCompetitionDetailClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminCompetitionDetailClient.tsx) | `createCompetitionAction`, `updateCompetitionAction`, `updateCompetitionStatusAction`, `createFixtureAction`, `updateFixtureAction`, `updateFixtureStatusAction`, `updateFixtureScoreAction`, `generateKnockoutFixturesAction` | `getCompetitionsByFestival()`, `getCompetitionById()`, `getFixturesByCompetition()`, `getParticipantsByEvent()`, `getCompetitionChangeEntries()` | **REAL** |
| **Events** | `/admin/events` | [`app/admin/events/page.tsx`](file:///c:/Projects/Fest/app/admin/events/page.tsx) (Server Component) | *None (Read-only matrix)* | `getEventsByFestival()`, `getSportsByFestival()` | **REAL** |
| **Sports** | `/admin/sports` | [`app/admin/sports/page.tsx`](file:///c:/Projects/Fest/app/admin/sports/page.tsx) (Server Component) | *None (Read-only roster)* | `getSportsByFestival()`, `getEventsByFestival()` | **REAL** |
| **Schedule** | `/admin/schedule` | [`AdminScheduleClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminScheduleClient.tsx) | `createScheduleAction`, `updateScheduleAction`, `updateScheduleStatusAction`, `deleteScheduleAction` | `getSchedulesByFestival()`, `getEventsByFestival()`, `getVenuesByFestival()`, `getRecentScheduleChangesByFestival()`, `detectVenueClashes()` | **REAL** |
| **Fixtures** | `/admin/fixtures` | [`app/admin/fixtures/page.tsx`](file:///c:/Projects/Fest/app/admin/fixtures/page.tsx) (Server Component) | *None (Links to competitions)* | `getFixturesByFestival()`, `getCompetitionsByFestival()`, `getEventsByFestival()`, `getTeamsByFestival()`, `getVenuesByFestival()` | **REAL** |
| **Results** | `/admin/results` | [`AdminResultsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminResultsClient.tsx) | *None (Navigation to verification)* | `getResultsByFestivalOperational()`, `getEventsByFestival()`, `getParticipantsByFestival()`, `getTeamsByFestival()` | **REAL** |
| **Verification** | `/admin/verification` | [`AdminVerificationClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminVerificationClient.tsx) | `verifyResultAction` | `getResultsByFestivalOperational()`, `getEventsByFestival()`, `getParticipantsByFestival()`, `getTeamsByFestival()` | **REAL** |
| **Publish** | `/admin/publish` | [`AdminPublishClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminPublishClient.tsx) | `publishResultAction` | `getResultsByFestivalOperational()`, `getEventsByFestival()`, `getParticipantsByFestival()`, `getTeamsByFestival()` | **REAL** |
| **Penalties** | `/admin/penalties` | [`AdminPenaltiesClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminPenaltiesClient.tsx) | `createTeamPenaltyAction`, `reverseTeamPenaltyAction` | `getPenaltiesByFestival()`, `getTeamsByFestival()`, `getEventsByFestival()` | **REAL** |
| **Substitutions** | `/admin/substitutions` | [`AdminSubstitutionsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminSubstitutionsClient.tsx) | `reviewSubstitutionAction` | `getSubstitutionsByFestival()`, `getActiveFestival()` | **REAL** |
| **Appeals** | `/admin/appeals` | [`AdminAppealsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminAppealsClient.tsx) | `reviewAppealAction` | `getAppealsByFestival()`, `getActiveFestival()` | **REAL** |
| **Venues** | `/admin/venues` | [`AdminVenuesClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminVenuesClient.tsx) | `createVenueAction`, `updateVenueAction`, `updateVenueStatusAction` | `getVenuesByFestival()`, `getSchedulesByFestival()` | **REAL** |
| **Teams** | `/admin/teams` | [`AdminTeamsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminTeamsClient.tsx) | `createTeamAction`, `updateTeamAction` | `getTeamsByFestival()`, `getParticipantsByFestivalAdmin()` | **REAL** |
| **Import** | `/admin/import` | [`AdminImportClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminImportClient.tsx) | `validateFestivalImportAction`, `executeFestivalImportAction` | `lib/import` (Excel workbook parser & validator), `getActiveFestival()` | **REAL** |
| **Live** | `/admin/live` | [`AdminModulePlaceholder.tsx`](file:///c:/Projects/Fest/components/admin/AdminModulePlaceholder.tsx) | *None* | *None* | **PLACEHOLDER** |
| **Certificates** | `/admin/certificates` | [`AdminModulePlaceholder.tsx`](file:///c:/Projects/Fest/components/admin/AdminModulePlaceholder.tsx) | *None* | *None* | **PLACEHOLDER** |
| **Settings** | `/admin/settings` | [`AdminModulePlaceholder.tsx`](file:///c:/Projects/Fest/components/admin/AdminModulePlaceholder.tsx) | *None* | *None* | **PLACEHOLDER** |

---

## 3. Deep-Dive Module Specifications

### 3.1 Dashboard & Central Telemetry
* **UI Files:** [`app/admin/page.tsx`](file:///c:/Projects/Fest/app/admin/page.tsx) & [`components/admin/AdminHeroMediaClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminHeroMediaClient.tsx)
* **Server Actions:** `logoutAction` (via Header).
* **Repositories & Functions:** `getAdminDashboardData()` (in `lib/admin/dashboardMetrics.ts`), `getAuthenticatedProfile()`, `getOrCreateQrIdentity()`.
* **Current Functionality:**
  - Real-time KPI counters: scheduled, live, finished, postponed, and cancelled events; draft, submitted, verified, and published results; total athletes, houses, and venues.
  - Priority Action Queue: Highlights submitted results requiring verification, verified results ready to publish, and timetable clashes.
  - Live in-progress matches and upcoming schedule lists.
  - Recent verification audit logs with relative timestamps.
  - Hero Media Manager: Staging and activating 2560 × 1170 px (2.19:1 ratio) homepage carousel banners.
* **Safe to Change:** Tile layouts, badge colors, typography, hero media preview card styling.
* **DO NOT Change:** Telemetry data binding, route redirects in attention links, QR token association.

### 3.2 Participants Registry
* **UI File:** [`components/admin/AdminParticipantsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminParticipantsClient.tsx)
* **Server Actions:** `createParticipantAction`, `updateParticipantAction`, `updateParticipantStatusAction`, `updateParticipantChestNumberAction`, `deleteParticipantAction`, `checkParticipantDependenciesAction`.
* **Repositories & Functions:** `getParticipantsByFestivalAdmin()`, `getTeamsByFestival()`, `getDivisionsByFestival()`, `getEventsByFestival()`.
* **Current Functionality:**
  - Search by athlete name, chest number, or student ID.
  - Multi-filter by team/house, division, gender, and status (`active`, `scratched`, `disqualified`, `injured`).
  - Create athlete modal with instant chest number duplication check.
  - Inline chest number editor.
  - Status toggle menu.
  - Safe athlete deletion: runs dependency audit (`checkParticipantDependenciesAction`) to block deletion if athlete has event registrations or recorded marks.
  - Pop-up athlete credential QR badge via `<ShowQrButton>`.
* **Safe to Change:** Roster table styling, search input appearance, filter pill UI, modal backdrop and transitions.
* **DO NOT Change:** Form parameter names passed to server actions, participant status enums, dependency check validation logic.

### 3.3 Competitions & Brackets
* **UI Files:** [`components/admin/AdminCompetitionsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminCompetitionsClient.tsx) & [`components/admin/AdminCompetitionDetailClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminCompetitionDetailClient.tsx)
* **Server Actions:** `createCompetitionAction`, `updateCompetitionAction`, `updateCompetitionStatusAction`, `createFixtureAction`, `updateFixtureAction`, `updateFixtureStatusAction`, `updateFixtureScoreAction`, `generateKnockoutFixturesAction`.
* **Repositories & Functions:** `getCompetitionsByFestival()`, `getCompetitionById()`, `getFixturesByCompetition()`, `getParticipantsByEvent()`, `getCompetitionChangeEntries()`.
* **Current Functionality:**
  - List view: Filter by sport, division, format (single elimination, double elimination, round robin, ladder, heats/timed final), status.
  - Detail view: Interactive knockout bracket visualizer, automatic seed pairing generation (`generateKnockoutFixturesAction`), live score entry (`score_home`, `score_away`, `winner_team_id`), match status advancement (`scheduled` -> `in_progress` -> `completed`), and audit history timeline.
* **Safe to Change:** Bracket tree visual CSS, match card layouts, score input UI, status badges.
* **DO NOT Change:** Knockout bracket tree pairing algorithm, match state progression rules, fixture score payload structure.

### 3.4 Event Point Matrix & Rules
* **UI File:** [`app/admin/events/page.tsx`](file:///c:/Projects/Fest/app/admin/events/page.tsx)
* **Server Actions:** None (Read-only matrix).
* **Repositories & Functions:** `getEventsByFestival()`, `getSportsByFestival()`.
* **Current Functionality:** Official festival event point classification: displays event codes, point classification (Class W: 5-3-1 individual, Class Z: 10-7-5 major team, etc.), scoring engine rules (`track_timed`, `distance_field`, `height_field`, `match_points`), max entries per team, and direct links to manage competitions.
* **Safe to Change:** Table styling, classification badge colors, KPI card styles.
* **DO NOT Change:** Point class classifications (W, X, Y, Z), scoring engine mappings, event IDs.

### 3.5 Sports Disciplines
* **UI File:** [`app/admin/sports/page.tsx`](file:///c:/Projects/Fest/app/admin/sports/page.tsx)
* **Server Actions:** None (Read-only roster).
* **Repositories & Functions:** `getSportsByFestival()`, `getEventsByFestival()`.
* **Current Functionality:** Displays active sports disciplines, discipline categories (Track & Field, Team Sports, Strength & Power), competition types (individual vs team), and associated event counts.
* **Safe to Change:** Discipline card designs, category tags, icons, typography.
* **DO NOT Change:** Sport slugs and IDs linked to Supabase `public.sports`.

### 3.6 Schedule & Timetable Control Room
* **UI File:** [`components/admin/AdminScheduleClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminScheduleClient.tsx)
* **Server Actions:** `createScheduleAction`, `updateScheduleAction`, `updateScheduleStatusAction`, `deleteScheduleAction`.
* **Repositories & Functions:** `getSchedulesByFestival()`, `getEventsByFestival()`, `getVenuesByFestival()`, `getRecentScheduleChangesByFestival()`, `detectVenueClashes()`.
* **Current Functionality:**
  - Chronological timetable grid with multi-filter (date, venue, category, status).
  - Real-time clash detection engine: warns if two events overlap in the same venue or if an event is double-scheduled.
  - Create slot modal with automated venue conflict checking.
  - Reschedule modal enforcing mandatory audit change reason.
  - Slot status updates (`scheduled`, `in_progress`, `completed`, `postponed`, `cancelled`).
  - Historical timetable change log drawer.
* **Safe to Change:** Timetable calendar UI, filter pills, clash alert visual banners, modal form styling.
* **DO NOT Change:** Date-time ISO parsing, clash detection parameters, mandatory change reason enforcement in server actions.

### 3.7 Fixtures Global Overview
* **UI File:** [`app/admin/fixtures/page.tsx`](file:///c:/Projects/Fest/app/admin/fixtures/page.tsx)
* **Server Actions:** None (Read-only roster; deep links to `/admin/competitions/[id]`).
* **Repositories & Functions:** `getFixturesByFestival()`, `getCompetitionsByFestival()`, `getEventsByFestival()`, `getTeamsByFestival()`, `getVenuesByFestival()`.
* **Current Functionality:** Master roster of all active matchups across all sports: displays stage (Quarter-Final, Semi-Final, Final), team pairings, venue, scheduled time, current score summary, and deep links into the bracket console.
* **Safe to Change:** Match card UI, table layout, stage kicker tags.
* **DO NOT Change:** Relationship mapping and links to competition detail routes.

### 3.8 Results Ledger
* **UI File:** [`components/admin/AdminResultsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminResultsClient.tsx)
* **Server Actions:** None (Read-only master ledger).
* **Repositories & Functions:** `getResultsByFestivalOperational()`, `getEventsByFestival()`, `getParticipantsByFestival()`, `getTeamsByFestival()`.
* **Current Functionality:** Central administrative ledger of all competition marks: filters by lifecycle status (`draft`, `submitted`, `verified`, `published`, `corrected`) or event; displays athlete name, house, mark (seconds, meters, points), referee notes, and direct links: "Verify Now" (opens `/admin/verification`) or "Publish" (opens `/admin/publish`).
* **Safe to Change:** Table styling, search bar appearance, status badge classes.
* **DO NOT Change:** Formatted mark resolution (`formatPerformance`), lifecycle filter logic.

### 3.9 Result Verification (Two-Man Rule Gate)
* **UI File:** [`components/admin/AdminVerificationClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminVerificationClient.tsx)
* **Server Actions:** `verifyResultAction`.
* **Repositories & Functions:** `getResultsByFestivalOperational()`, `getEventsByFestival()`, `getParticipantsByFestival()`, `getTeamsByFestival()`.
* **Current Functionality:**
  - Filters submitted referee marks awaiting official verification.
  - Review drawer displaying raw referee mark, athlete details, points earned, and timestamp.
  - One-click "Verify & Sign Off" action: executes `verifyResultAction`, advances status from `submitted` to `verified`, stamps `verified_by` and `verified_at`, and writes to `result_audit_log`.
* **Safe to Change:** Verification queue table, review drawer layout, sign-off button styling, toast alerts.
* **DO NOT Change:** Result status transition lifecycle (`submitted` -> `verified`), verifier profile authorization checks.

### 3.10 Result Publication Surface
* **UI File:** [`components/admin/AdminPublishClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminPublishClient.tsx)
* **Server Actions:** `publishResultAction`.
* **Repositories & Functions:** `getResultsByFestivalOperational()`, `getEventsByFestival()`, `getParticipantsByFestival()`, `getTeamsByFestival()`.
* **Current Functionality:**
  - Lists verified results awaiting public release.
  - Executes `publishResultAction`: marks status as `published`, stamps `published_at`, updates championship team points, and invalidates public cache paths (`/results`, `/leaderboard`, `/participants`, `/my-result`).
  - Displays historical log of published marks.
* **Safe to Change:** Release table styling, confirmation modal appearance, published log UI.
* **DO NOT Change:** Publication precondition requiring `verified` status first, cache revalidation paths.

### 3.11 Team Penalties & Disciplinary Sanctions
* **UI File:** [`components/admin/AdminPenaltiesClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminPenaltiesClient.tsx)
* **Server Actions:** `createTeamPenaltyAction`, `reverseTeamPenaltyAction`.
* **Repositories & Functions:** `getPenaltiesByFestival()`, `getTeamsByFestival()`, `getEventsByFestival()`.
* **Current Functionality:**
  - Table of active and reversed house sanctions.
  - "Issue Penalty" modal with preset rule codes (`LATE_CALL_ROOM_PENALTY`: -5 pts, `MISCONDUCT_LEVEL_1`: -10 pts, `MISCONDUCT_LEVEL_2`: -25 pts, `MISCONDUCT_LEVEL_3`: -50 pts, `FALSE_START_REPEATED`: -5 pts, `EQUIPMENT_TAMPERING`: -15 pts, `CUSTOM`).
  - "Reverse Penalty" action with mandatory reversal reason.
  - Dynamically recalculates net house championship standings.
* **Safe to Change:** Sanction list styling, rule code badges, modal layout.
* **DO NOT Change:** Rule codes and associated point deductions, mandatory reversal reason validation.

### 3.12 Athlete Substitutions Desk
* **UI File:** [`components/admin/AdminSubstitutionsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminSubstitutionsClient.tsx)
* **Server Actions:** `reviewSubstitutionAction`.
* **Repositories & Functions:** `getSubstitutionsByFestival()`, `getActiveFestival()`.
* **Current Functionality:**
  - Review athlete scratches and substitutions submitted by house captains.
  - Tabbed filters: `all`, `submitted`, `approved`, `rejected`.
  - Review modal displaying incoming vs outgoing athlete, medical certificates, and fee tiers (Standard: ₹20, Emergency: ₹50).
  - Approving swaps athletes in the event roster; rejecting requires mandatory reason.
* **Safe to Change:** Substitution cards/table, fee tier badges, medical certificate preview styling.
* **DO NOT Change:** Fee tier values (₹20 standard, ₹50 emergency), athlete replacement mutation logic.

### 3.13 Appeals & Protests Desk (Jury of Appeal)
* **UI File:** [`components/admin/AdminAppealsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminAppealsClient.tsx)
* **Server Actions:** `reviewAppealAction`.
* **Repositories & Functions:** `getAppealsByFestival()`, `getActiveFestival()`.
* **Current Functionality:**
  - Adjudicates formal protests lodged under Codex 2026 rules (Statutory Fee: ₹70).
  - Adjudication modal: record verdict (`under_review`, `accepted`, `rejected`, `partially_upheld`), official decision notes, and fee payment disposition (`paid`, `refunded`, `forfeited`).
  - Option to directly amend authoritative result marks and recalculate points.
* **Safe to Change:** Protest dossier layout, status timeline, decision dialog aesthetics.
* **DO NOT Change:** Statutory fee rules (₹70 deposit), verdict states, result amendment mutation logic.

### 3.14 Venues & Facilities
* **UI File:** [`components/admin/AdminVenuesClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminVenuesClient.tsx)
* **Server Actions:** `createVenueAction`, `updateVenueAction`, `updateVenueStatusAction`.
* **Repositories & Functions:** `getVenuesByFestival()`, `getSchedulesByFestival()`.
* **Current Functionality:**
  - Registry of campus grounds, courts, tracks, and facilities.
  - Displays capacity and scheduled event slot counts per venue.
  - Modals to create, edit, or toggle venue status.
* **Safe to Change:** Venue cards/table layout, capacity indicator badges, toggle button styling.
* **DO NOT Change:** Slug generation, venue foreign key constraints.

### 3.15 Teams & Houses Administration
* **UI File:** [`components/admin/AdminTeamsClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminTeamsClient.tsx)
* **Server Actions:** `createTeamAction`, `updateTeamAction`.
* **Repositories & Functions:** `getTeamsByFestival()`, `getParticipantsByFestivalAdmin()`.
* **Current Functionality:**
  - Management of official houses with 3-letter codes, official hex colors, roster counts, and team captains.
  - Modals to create new teams or update name, code, color swatch, and display order.
* **Safe to Change:** House cards, color picker preview, athlete count badges, grid layout.
* **DO NOT Change:** 3-letter unique codes, team IDs linked to athletes, points, and standings.

### 3.16 Festival Data Import Engine
* **UI File:** [`components/admin/AdminImportClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminImportClient.tsx)
* **Server Actions:** `validateFestivalImportAction`, `executeFestivalImportAction`.
* **Repositories & Functions:** `lib/import` (Excel workbook parser & validator), `getActiveFestival()`.
* **Current Functionality:**
  - 4-step ingestion wizard: Upload -> Preview -> Confirm -> Completed.
  - Drag-and-drop `.xlsx` upload.
  - Step 1 parses workbook into Students, Events, and Registrations.
  - Step 2 interactive validation table: highlights schema errors, invalid team codes, duplicate chest numbers, or missing event IDs.
  - Step 3 atomic transaction execution: inserts/updates database records with rollback on fatal failure.
  - Step 4 summary report of inserted vs updated rows.
* **Safe to Change:** Drag-and-drop dropzone UI, wizard stepper styling, error table row highlights.
* **DO NOT Change:** Sheet name expectations ("Students", "Events", "Registrations"), column mappings, validation rules.

### 3.17 Placeholders (Live, Certificates, Settings)
* **UI Files:** 
  - `app/admin/live/page.tsx`
  - `app/admin/certificates/page.tsx`
  - `app/admin/settings/page.tsx`
* **Shared Component:** [`components/admin/AdminModulePlaceholder.tsx`](file:///c:/Projects/Fest/components/admin/AdminModulePlaceholder.tsx)
* **Status:** **PLACEHOLDERS**. These routes are currently intentionally held as upcoming operational features.
* **Safe to Change:** Placeholder teaser copy, badge styling, feature roadmap lists.

---

## 4. Shared QR Components

1. **[`ShowQrButton.tsx`](file:///c:/Projects/Fest/components/qr/ShowQrButton.tsx)**:
   - Reusable button component accepting `ProfileQrData` (`name`, `role`, `roleLabel`, `identifier`, `qrUrl`, `isPrivileged`).
   - Supports button variants: `"primary"`, `"secondary"`, `"subtle"`.
   - Mounts and controls the `<ProfileQrModal>` dialog.
2. **[`ProfileQrModal.tsx`](file:///c:/Projects/Fest/components/qr/ProfileQrModal.tsx)**:
   - Accessible modal dialog (`role="dialog"`, `aria-modal="true"`, `Escape` key close).
   - Generates pure SVG QR code on the fly via `generateQrSvgString(qrUrl)` (from [`lib/qr/qrMatrix.ts`](file:///c:/Projects/Fest/lib/qr/qrMatrix.ts)).
   - Renders security badge, identifier pill, copy URL button, and print credentials button.
3. **QR Backend Security:**
   - Backed by cryptographic tokens minted via `getOrCreateQrIdentity("profile", entityId)` from [`supabase/migrations/20260930001300_pegasus_profile_qr_system.sql`](file:///c:/Projects/Fest/supabase/migrations/20260930001300_pegasus_profile_qr_system.sql).

---

## 5. Global Admin CSS Architecture

1. **Structural Shell Grid (`app/globals.css`, lines 3180–3580):**
   - `.pegasus-admin-shell`: Root 2-column grid (`260px 1fr`) with responsive collapse at `900px`.
   - `.pegasus-admin-sidebar`: Sticky navigation sidebar with custom scrollbars.
   - `.pegasus-admin-drawer-backdrop`: Mobile overlay backdrop.
   - `.pegasus-admin-main`: Main content wrapper with sticky topbar.
2. **Zenithrow Admin Design System Tokens (`components/admin/ZenithrowAdminTheme.tsx`):**
   - Injected into the root of `AdminShellClient`.
   - Variables:
     - `--ztr-obsidian: #070809`
     - `--ztr-surface-0: #0b0c0e`, `--ztr-surface-1: #101216`, `--ztr-surface-2: #161920`, `--ztr-surface-3: #1c2028`
     - `--ztr-border: rgba(255, 255, 255, 0.08)`, `--ztr-border-hover: rgba(255, 255, 255, 0.16)`
     - `--ztr-crimson: #e53935`, `--ztr-crimson-hover: #ff5252`, `--ztr-crimson-glow: rgba(229, 57, 53, 0.22)`
     - `--ztr-fg: #f8fafc`, `--ztr-muted: #94a3b8`
   - Component classes: `.pegasus-card`, `.pegasus-admin-input`, `.pegasus-admin-select`, `.pegasus-button--primary`, `.pegasus-button--subtle`, `.pegasus-eyebrow`, `.pegasus-admin-table`.
3. **Header Inlined CSS (`components/admin/AdminHeader.tsx`):**
   - `.zenithrow-admin-header`: Glassmorphic sticky topbar (`backdrop-filter: blur(20px)`), mobile `.nav-toggle`, `.status-pill`, and `.user-badge`.

---

## 6. Authentication Boundary & RLS Security

### 6.1 Server-Side Authentication Resolution
- **Function:** `getAuthenticatedProfile()` in [`lib/repositories/profileRepository.ts`](file:///c:/Projects/Fest/lib/repositories/profileRepository.ts).
- **Two-Tier Resolution:**
  1. **Primary:** Reads Supabase Auth session via `supabase.auth.getUser()`, resolving profile metadata from `public.profiles`. Requires `role === "admin"` and `is_active === true`.
  2. **Secondary (Local / Dev / Presentation):** Reads signed HMAC session cookie via `getSessionCookie()`.

### 6.2 Route Protection
- Enforced at layout level in [`app/admin/layout.tsx`](file:///c:/Projects/Fest/app/admin/layout.tsx). Unauthenticated users or non-admin accounts are immediately redirected to `/login?redirect=/admin&error=unauthorized_admin`.

### 6.3 Server Action Security Gate
- Every administrative action in [`app/admin/actions.ts`](file:///c:/Projects/Fest/app/admin/actions.ts) re-executes `getAuthenticatedProfile()` before modifying database records. If the caller does not hold active administrator privileges, the action returns `{ success: false, error: "Unauthorized: Active administrator privileges required..." }`.

### 6.4 Supabase Row Level Security (RLS) Dependencies
- Defined in `supabase/migrations/`:
  - `20260920000100_pegasus_core_foundation.sql`
  - `20260920000500_pegasus_admin_result_lifecycle.sql`
  - `20260921000600_pegasus_admin_participant_management.sql`
  - `20260921000700_pegasus_admin_schedule_venue_operations.sql`
  - `20260921000800_pegasus_team_penalty_operations.sql`
  - `20260921000900_pegasus_competition_fixture_operations.sql`
  - `20260923001000_pegasus_registration_team_operations.sql`
  - `20260924001100_pegasus_appeals_system.sql`
- **Policy Enforcement:** Public roles are restricted to `SELECT` on verified/published data. Only service roles or users with authenticated admin role policies can perform `INSERT`, `UPDATE`, or `DELETE`.
- **Audit Trails:** Administrative mutations automatically record into `public.result_audit_log`, `public.schedule_change_entries`, and `public.competition_change_entries`.

---

## 7. Designer & Frontend Engineer Rules of Engagement

### What You CAN Safely Modify
1. **Visual Styling:** Colors, font weights, padding, borders, shadows, and glassmorphic surface tokens in [`ZenithrowAdminTheme.tsx`](file:///c:/Projects/Fest/components/admin/ZenithrowAdminTheme.tsx).
2. **Component Presentation:** Table layout, mobile card layouts, tab pill styles, search and filter input styling.
3. **Empty States & Illustrations:** Visual graphics, icons (from `lucide-react`), and empty state illustrations.
4. **Hero Media Carousel Assets:** Uploading, organizing, and selecting banner images in [`AdminHeroMediaClient.tsx`](file:///c:/Projects/Fest/components/admin/AdminHeroMediaClient.tsx).

### What You MUST NEVER Modify
1. **DO NOT replace client components with static HTML.** The UI is live and interactive.
2. **DO NOT bypass server actions.** All mutations must flow through `app/admin/actions.ts`.
3. **DO NOT change form payload fields or types.** Server actions expect typed DTOs defined in `lib/repositories` and `lib/types`.
4. **DO NOT alter the verification/publication pipeline.** A result must transition `submitted` -> `verified` -> `published`. It cannot jump straight to `published`.
5. **DO NOT remove change reason fields.** Timetable adjustments, penalty reversals, and appeal verdicts require audit justification.
6. **DO NOT change scoring engine formulas or point classes (W, X, Y, Z).** Scoring is defined by festival regulations.
