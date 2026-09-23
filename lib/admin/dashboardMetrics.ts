import {
  getActiveFestival,
  getEventsByFestival,
  getParticipantsByFestival,
  getTeamsByFestival,
  getVenuesByFestival,
  getSchedulesByFestival,
  getFixturesByFestival,
  getResultsByFestivalOperational,
  getRecentResultAuditEntries,
  type EventRow,
  type ScheduleRow,
  type FixtureRow,
  type ResultRow,
  type VenueRow,
  type TeamRow,
  type ParticipantRow,
  type ResultAuditRow,
} from "@/lib/repositories";
import { detectVenueClashes } from "@/lib/schedule/clashDetection";

export type EventTelemetry = {
  totalEvents: number;
  scheduledEvents: number;
  liveEvents: number;
  finishedEvents: number;
  postponedEvents: number;
  cancelledEvents: number;
};

export type ResultTelemetry = {
  totalResults: number;
  draftResults: number;
  submittedResults: number;
  verifiedResults: number;
  publishedResults: number;
  correctedResults: number;
};

export type AttentionItem = {
  id: string;
  priority: 1 | 2 | 3 | 4;
  category: "verification" | "publication" | "schedule" | "fixtures" | "general";
  title: string;
  description: string;
  count: number;
  href: string;
  actionLabel: string;
  severity: "urgent" | "warning" | "info";
};

export type LiveOperationItem = {
  id: string;
  eventCode: string;
  eventName: string;
  sportName: string;
  venueName: string;
  status: string;
  startTime: string;
  type: "schedule" | "fixture";
  fixtureSummary?: string;
  scoreSummary?: string;
};

export type UpcomingOperationItem = {
  id: string;
  eventCode: string;
  eventName: string;
  sportName: string;
  venueName: string;
  startsAt: string;
  status: string;
  fixtureSummary?: string;
};

export type RecentActivityItem = {
  id: string;
  action: string;
  actionLabel: string;
  eventSummary: string;
  competitorSummary?: string;
  reason?: string | null;
  timestamp: string;
  relativeTime: string;
  statusBadgeClass: string;
};

export type GeneralTelemetry = {
  participantCount: number;
  teamCount: number;
  venueCount: number;
  fixtureCount: number;
  scheduleCount: number;
};

export type AdminDashboardData = {
  festivalName: string;
  festivalStatus: {
    isActive: boolean;
    label: string;
    description: string;
  };
  events: EventTelemetry;
  results: ResultTelemetry;
  attentionItems: AttentionItem[];
  liveOperations: LiveOperationItem[];
  upcomingOperations: UpcomingOperationItem[];
  recentActivities: RecentActivityItem[];
  general: GeneralTelemetry;
};

/**
 * Derives human-friendly relative time string (e.g. "2m ago", "1h ago").
 */
export function formatRelativeTime(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime();
    if (isNaN(timestamp)) return "Recent";

    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSeconds < 45) return "Just now";
    if (diffSeconds < 90) return "1m ago";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 7200) return "1h ago";
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    if (diffSeconds < 172800) return "1d ago";
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  } catch {
    return "Recent";
  }
}

/**
 * Pure helper to map audit actions to display labels and badge CSS classes.
 */
function getActionDisplay(action: string): { label: string; badgeClass: string } {
  switch (action) {
    case "publish_result":
      return { label: "PUBLISHED", badgeClass: "pegasus-status--published" };
    case "verify_result":
      return { label: "VERIFIED", badgeClass: "pegasus-status--live" };
    case "submit_result":
      return { label: "SUBMITTED", badgeClass: "pegasus-status--pending" };
    case "unlock_result":
      return { label: "UNLOCKED", badgeClass: "pegasus-status--disqualified" };
    case "save_draft":
      return { label: "DRAFT SAVED", badgeClass: "pegasus-status--upcoming" };
    default:
      return { label: action.toUpperCase().replace(/_/g, " "), badgeClass: "pegasus-status--upcoming" };
  }
}

/**
 * Server-side aggregator that retrieves real database telemetry for the Admin Command Center.
 * Respects RLS and database invariants. Returns empty states if no data is found without throwing.
 */
export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const activeFestival = await getActiveFestival();

  if (!activeFestival) {
    return {
      festivalName: "Pegasus Sports Festival",
      festivalStatus: {
        isActive: false,
        label: "Festival Unconfigured",
        description: "No active festival record found in database.",
      },
      events: {
        totalEvents: 0,
        scheduledEvents: 0,
        liveEvents: 0,
        finishedEvents: 0,
        postponedEvents: 0,
        cancelledEvents: 0,
      },
      results: {
        totalResults: 0,
        draftResults: 0,
        submittedResults: 0,
        verifiedResults: 0,
        publishedResults: 0,
        correctedResults: 0,
      },
      attentionItems: [],
      liveOperations: [],
      upcomingOperations: [],
      recentActivities: [],
      general: {
        participantCount: 0,
        teamCount: 0,
        venueCount: 0,
        fixtureCount: 0,
        scheduleCount: 0,
      },
    };
  }

  const festivalId = activeFestival.id;

  // 1. Concurrent queries for festival operational entities
  const [
    events,
    schedules,
    fixtures,
    results,
    participants,
    teams,
    venues,
    auditRows,
  ] = await Promise.all([
    getEventsByFestival(festivalId).catch(() => [] as EventRow[]),
    getSchedulesByFestival(festivalId).catch(() => [] as ScheduleRow[]),
    getFixturesByFestival(festivalId).catch(() => [] as FixtureRow[]),
    getResultsByFestivalOperational(festivalId).catch(() => [] as ResultRow[]),
    getParticipantsByFestival(festivalId).catch(() => [] as ParticipantRow[]),
    getTeamsByFestival(festivalId).catch(() => [] as TeamRow[]),
    getVenuesByFestival(festivalId).catch(() => [] as VenueRow[]),
    getRecentResultAuditEntries(20).catch(() => [] as ResultAuditRow[]),
  ]);

  // Lookup maps for fast entity resolution
  const eventMap = new Map(events.map((e) => [e.id, e]));
  const venueMap = new Map(venues.map((v) => [v.id, v]));
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const resultMap = new Map(results.map((r) => [r.id, r]));

  // 2. Compute Event Metrics
  const liveSchedulesCount = schedules.filter((s) => s.status === "live").length;
  const finishedSchedulesCount = schedules.filter((s) => s.status === "finished").length;
  const postponedSchedulesCount = schedules.filter(
    (s) => s.status === "postponed" || s.status === "delayed",
  ).length;
  const cancelledSchedulesCount = schedules.filter((s) => s.status === "cancelled").length;

  const eventMetrics: EventTelemetry = {
    totalEvents: events.length,
    scheduledEvents: events.filter((e) => e.status === "active" || e.status === "scheduled").length,
    liveEvents: liveSchedulesCount,
    finishedEvents: finishedSchedulesCount,
    postponedEvents: postponedSchedulesCount,
    cancelledEvents: cancelledSchedulesCount,
  };

  // 3. Compute Result Metrics
  const resultMetrics: ResultTelemetry = {
    totalResults: results.length,
    draftResults: results.filter((r) => r.status === "draft").length,
    submittedResults: results.filter((r) => r.status === "submitted").length,
    verifiedResults: results.filter((r) => r.status === "verified").length,
    publishedResults: results.filter((r) => r.status === "published").length,
    correctedResults: results.filter((r) => r.status === "corrected").length,
  };

  // 4. Compute Attention Queue (Actionable operational tasks)
  const attentionItems: AttentionItem[] = [];

  // Priority 1: Submitted results waiting for verification
  if (resultMetrics.submittedResults > 0) {
    attentionItems.push({
      id: "attn-verification",
      priority: 1,
      category: "verification",
      title: `${resultMetrics.submittedResults} submitted result${
        resultMetrics.submittedResults === 1 ? "" : "s"
      } awaiting verification`,
      description: "Referee score sheets submitted from track and field pending Chief Scorer sign-off.",
      count: resultMetrics.submittedResults,
      href: "/admin/verification",
      actionLabel: "Open Verification Queue",
      severity: "urgent",
    });
  }

  // Priority 2: Verified results ready for public release
  if (resultMetrics.verifiedResults > 0) {
    attentionItems.push({
      id: "attn-publishing",
      priority: 2,
      category: "publication",
      title: `${resultMetrics.verifiedResults} verified result${
        resultMetrics.verifiedResults === 1 ? "" : "s"
      } ready to publish`,
      description: "Audited results ready to release to public standings and championship leaderboard.",
      count: resultMetrics.verifiedResults,
      href: "/admin/publish",
      actionLabel: "Open Publishing Desk",
      severity: "warning",
    });
  }

  // Priority 3: Timetable Clashes
  if (schedules.length > 0) {
    const clashItems = schedules
      .filter((s) => Boolean(s.venue_id))
      .map((s) => ({
        id: s.id,
        venueId: s.venue_id!,
        startsAt: s.starts_at,
        endsAt: s.ends_at ?? undefined,
      }));

    const clashes = detectVenueClashes(clashItems);
    if (clashes.length > 0) {
      attentionItems.push({
        id: "attn-timetable-clash",
        priority: 3,
        category: "schedule",
        title: `${clashes.length} venue schedule clash${
          clashes.length === 1 ? "" : "es"
        } detected`,
        description: "Overlapping start and end time windows assigned to the same venue location.",
        count: clashes.length,
        href: "/schedules",
        actionLabel: "Inspect Timetable",
        severity: "urgent",
      });
    }
  }

  // Priority 4: Delayed or Postponed Events
  if (postponedSchedulesCount > 0) {
    attentionItems.push({
      id: "attn-postponed",
      priority: 3,
      category: "schedule",
      title: `${postponedSchedulesCount} schedule slot${
        postponedSchedulesCount === 1 ? "" : "s"
      } delayed or postponed`,
      description: "Weather or court delays recorded on the festival timetable.",
      count: postponedSchedulesCount,
      href: "/schedules",
      actionLabel: "View Delayed Slots",
      severity: "warning",
    });
  }

  // Priority 5: Unassigned Fixtures
  if (fixtures.length > 0) {
    const unassigned = fixtures.filter((f) => !f.home_team_id || !f.away_team_id);
    if (unassigned.length > 0) {
      attentionItems.push({
        id: "attn-fixture-unassigned",
        priority: 4,
        category: "fixtures",
        title: `${unassigned.length} fixture${
          unassigned.length === 1 ? "" : "s"
        } missing team pairings`,
        description: "Tournament matchups or bracket slots without confirmed team assignments.",
        count: unassigned.length,
        href: "/fixtures",
        actionLabel: "Inspect Matchups",
        severity: "info",
      });
    }
  }

  // 5. Compute Live Operations
  const liveOperations: LiveOperationItem[] = [];

  // Check live schedules
  schedules
    .filter((s) => s.status === "live")
    .forEach((s) => {
      const event = s.event_id ? eventMap.get(s.event_id) : undefined;
      const venue = s.venue_id ? venueMap.get(s.venue_id) : undefined;

      liveOperations.push({
        id: s.id,
        eventCode: event?.code ?? "EVENT",
        eventName: event?.name ?? "Live Event",
        sportName: event?.competition_type ?? "Track & Field",
        venueName: venue?.name ?? "Venue Pending",
        status: "LIVE NOW",
        startTime: s.starts_at,
        type: "schedule",
      });
    });

  // Check live fixtures
  fixtures
    .filter((f) => f.status === "live")
    .forEach((f) => {
      const homeTeam = f.home_team_id ? teamMap.get(f.home_team_id) : undefined;
      const awayTeam = f.away_team_id ? teamMap.get(f.away_team_id) : undefined;
      const venue = f.venue_id ? venueMap.get(f.venue_id) : undefined;

      const fixtureSummary =
        homeTeam && awayTeam
          ? `${homeTeam.name} vs ${awayTeam.name}`
          : "Matchup in progress";

      const scoreSummary =
        f.score_home !== null && f.score_away !== null
          ? `${f.score_home} - ${f.score_away}`
          : undefined;

      liveOperations.push({
        id: f.id,
        eventCode: "MATCH",
        eventName: fixtureSummary,
        sportName: "Tournament Match",
        venueName: venue?.name ?? "Arena Court",
        status: "LIVE MATCH",
        startTime: f.scheduled_at ?? new Date().toISOString(),
        type: "fixture",
        fixtureSummary,
        scoreSummary,
      });
    });

  // 6. Compute Upcoming Operations
  const now = Date.now();
  const upcomingSchedules = schedules
    .filter((s) => {
      if (s.status === "finished" || s.status === "cancelled") return false;
      const startMs = new Date(s.starts_at).getTime();
      return !isNaN(startMs) && (s.status === "scheduled" || startMs >= now - 3600000);
    })
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 6);

  const upcomingOperations: UpcomingOperationItem[] = upcomingSchedules.map((s) => {
    const event = s.event_id ? eventMap.get(s.event_id) : undefined;
    const venue = s.venue_id ? venueMap.get(s.venue_id) : undefined;

    return {
      id: s.id,
      eventCode: event?.code ?? "EVENT",
      eventName: event?.name ?? "Scheduled Event",
      sportName: event?.competition_type ?? "Sport",
      venueName: venue?.name ?? "Venue Pending",
      startsAt: s.starts_at,
      status: s.status.charAt(0).toUpperCase() + s.status.slice(1),
    };
  });

  // 7. Compute Recent Activity from Audit Entries
  const recentActivities: RecentActivityItem[] = auditRows.map((audit) => {
    const relatedResult = resultMap.get(audit.result_id);
    const event = relatedResult?.event_id ? eventMap.get(relatedResult.event_id) : undefined;
    const participant = relatedResult?.participant_id
      ? participantMap.get(relatedResult.participant_id)
      : undefined;
    const team = relatedResult?.team_id
      ? teamMap.get(relatedResult.team_id)
      : participant?.team_id
        ? teamMap.get(participant.team_id)
        : undefined;

    const { label, badgeClass } = getActionDisplay(audit.action);
    const eventSummary = event?.name ?? `Result #${audit.result_id.slice(0, 8)}`;
    const competitorSummary = participant?.name ?? team?.name ?? undefined;

    return {
      id: audit.id,
      action: audit.action,
      actionLabel: label,
      eventSummary,
      competitorSummary,
      reason: audit.reason,
      timestamp: audit.created_at,
      relativeTime: formatRelativeTime(audit.created_at),
      statusBadgeClass: badgeClass,
    };
  });

  return {
    festivalName: activeFestival.name,
    festivalStatus: {
      isActive: activeFestival.is_active,
      label: activeFestival.is_active ? "Live & Active" : "Planned",
      description: activeFestival.is_active
        ? "Official festival command center operating in active status."
        : "Festival is currently in scheduled state.",
    },
    events: eventMetrics,
    results: resultMetrics,
    attentionItems,
    liveOperations,
    upcomingOperations,
    recentActivities,
    general: {
      participantCount: participants.length,
      teamCount: teams.length,
      venueCount: venues.length,
      fixtureCount: fixtures.length,
      scheduleCount: schedules.length,
    },
  };
}
