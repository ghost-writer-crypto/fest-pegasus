import Link from "next/link";
import { notFound } from "next/navigation";
import { events as staticEvents } from "@/data/events";
import { participants as staticParticipants } from "@/data/participants";
import { teams as staticTeams } from "@/data/teams";
import { fixtures as staticFixtures } from "@/data/fixtures";
import { venues as staticVenues } from "@/data/venues";
import { results as staticResults } from "@/data/results";
import {
  judgeAssignments,
  isJudgeAssignedToEvent,
} from "@/lib/judging";
import {
  getActiveFestival,
  getEventById,
  getParticipantsByEvent,
  getResultsByEvent,
  getTeamsByFestival,
  getFixturesByFestival,
  getVenuesByFestival,
  getAuthenticatedProfile,
  isJudgeAssignedToEventInDb,
  type EventRow,
  type ParticipantRow,
  type ResultRow,
  type TeamRow,
  type FixtureRow,
  type VenueRow,
} from "@/lib/repositories";

import { resolveFestivalEvent } from "@/lib/competition";
import { formatPerformance } from "@/lib/results";
import type { ResultDisposition, ResultStatus } from "@/lib/types";
import JudgeScoreSheetClient, {
  type CompetitorItem,
  type FixtureItem,
} from "./JudgeScoreSheetClient";

export const dynamic = "force-dynamic";

type JudgeEventPageProps = {
  params: Promise<{ id: string }>;
};

export default async function JudgeEventPage({ params }: JudgeEventPageProps) {
  const { id } = await params;

  let festivalId = "";
  let dbEvent: EventRow | null = null;
  let dbParticipants: ParticipantRow[] = [];
  let dbResults: ResultRow[] = [];
  let dbTeams: TeamRow[] = [];
  let dbFixtures: FixtureRow[] = [];
  let dbVenues: VenueRow[] = [];

  try {
    const activeFestival = await getActiveFestival();
    if (activeFestival) {
      festivalId = activeFestival.id;
      dbEvent = await getEventById(id, activeFestival.id);

      if (dbEvent) {
        [dbParticipants, dbResults, dbTeams, dbFixtures, dbVenues] =
          await Promise.all([
            getParticipantsByEvent(activeFestival.id, dbEvent.id),
            getResultsByEvent(activeFestival.id, dbEvent.id),
            getTeamsByFestival(activeFestival.id),
            getFixturesByFestival(activeFestival.id),
            getVenuesByFestival(activeFestival.id),
          ]);
      }
    }
  } catch (err) {
    console.error("[JudgeEventPage] Database query error:", err);
  }

  // Fallback to static data if no database event was resolved
  const staticEvent = staticEvents.find(
    (e) => e.id === id || e.codexEventId === id,
  );

  if (!dbEvent && !staticEvent) {
    notFound();
  }

  const eventIdentifier = dbEvent ? dbEvent.id : staticEvent!.id;
  const eventCode = dbEvent ? dbEvent.code : staticEvent!.codexEventId;
  const eventName = dbEvent ? dbEvent.name : staticEvent!.name;
  const eventCategory = staticEvent ? staticEvent.category : "Festival Event";
  const eventSport = staticEvent
    ? staticEvent.sport
    : dbEvent?.competition_type || "Athletics";

  // Resolve classification and engine info
  const resolved = resolveFestivalEvent(eventCode);
  const pointClass = dbEvent?.point_class || resolved?.classification || null;

  // Determine event type
  const isTeam = staticEvent
    ? staticEvent.type === "team"
    : dbEvent?.competition_type === "knockout" ||
      dbEvent?.competition_type === "match";
  const eventType: "individual" | "team" = isTeam ? "team" : "individual";

  // 1. Resolve server-side authenticated identity
  let authProfile = null;
  try {
    authProfile = await getAuthenticatedProfile();
  } catch (error) {
    console.error("[JudgeEventPage] Failed to resolve auth profile:", error);
  }

  // 2. Server-side assignment check: DB first, fallback to static in transitional mode
  let isAssigned = false;
  if (authProfile && festivalId) {
    isAssigned = await isJudgeAssignedToEventInDb(
      festivalId,
      authProfile.userId,
      eventIdentifier,
    );
  } else {
    isAssigned = isJudgeAssignedToEvent(
      authProfile?.userId ?? "",
      eventIdentifier,
      judgeAssignments,
    );
  }


  // Build competitor items
  let competitors: CompetitorItem[] = [];
  if (dbParticipants.length > 0) {
    competitors = dbParticipants.map((p) => {
      const team = dbTeams.find((t) => t.id === p.team_id);
      const existingResult = dbResults.find((r) => r.participant_id === p.id);

      return {
        id: p.id,
        name: p.name,
        chestNumber: p.chest_number ?? "",
        teamName: team?.name ?? "Independent",
        category: p.division_id ? `Division ${p.division_id}` : eventCategory,
        existingResultId: existingResult?.id,
        existingRank: existingResult?.rank,
        existingPerformance: existingResult?.performance
          ? (existingResult.performance.raw as string) ||
            formatPerformance(existingResult.performance as Record<string, unknown>)
          : "",
        existingDisposition: existingResult?.disposition as ResultDisposition,
        existingStatus: existingResult?.status as ResultStatus,
      };
    });
  } else if (staticEvent && staticEvent.type === "individual") {
    const eventStaticParticipants = staticParticipants.filter((p) =>
      p.eventIds.includes(staticEvent.id),
    );

    competitors = eventStaticParticipants.map((p, idx) => {
      const team = staticTeams.find((t) => t.id === p.teamId);
      const existingResult = staticResults.find(
        (r) => r.participantId === p.id && r.eventId === staticEvent.id,
      );

      return {
        id: p.id,
        name: p.name,
        chestNumber: String(p.chestNumber),
        teamName: team?.name ?? "Independent",
        category: p.category,
        existingResultId: existingResult?.id,
        existingRank: existingResult?.position ?? idx + 1,
        existingPerformance: formatPerformance(existingResult?.performance),
        existingDisposition: (existingResult?.disposition as ResultDisposition) || "normal",
        existingStatus: (existingResult?.status as ResultStatus) || "draft",
      };
    });
  }

  // Build fixture items for team events
  let fixtures: FixtureItem[] = [];
  if (dbFixtures.length > 0) {
    fixtures = dbFixtures.map((f) => {
      const homeTeam = dbTeams.find((t) => t.id === f.home_team_id);
      const awayTeam = dbTeams.find((t) => t.id === f.away_team_id);
      const venue = dbVenues.find((v) => v.id === f.venue_id);
      const existingResult = dbResults.find((r) => r.fixture_id === f.id);

      return {
        id: f.id,
        homeTeamName: homeTeam?.name ?? "Team Home",
        awayTeamName: awayTeam?.name ?? "Team Away",
        homeTeamCode: homeTeam?.code ?? "HOM",
        awayTeamCode: awayTeam?.code ?? "AWY",
        venueName: venue?.name,
        status: f.status,
        scoreHome: f.score_home !== null ? Number(f.score_home) : null,
        scoreAway: f.score_away !== null ? Number(f.score_away) : null,
        existingResultId: existingResult?.id,
        existingStatus: existingResult?.status as ResultStatus,
      };
    });
  } else if (staticEvent && staticEvent.type === "team") {
    const eventStaticFixtures = staticFixtures.filter(
      (f) => f.eventId === staticEvent.id,
    );

    fixtures = eventStaticFixtures.map((f) => {
      const teamA = staticTeams.find((t) => t.id === f.teamAId);
      const teamB = staticTeams.find((t) => t.id === f.teamBId);
      const venue = staticVenues.find((v) => v.id === f.venueId);

      return {
        id: f.id,
        homeTeamName: teamA?.name ?? "Team A",
        awayTeamName: teamB?.name ?? "Team B",
        homeTeamCode: teamA?.code ?? "TMA",
        awayTeamCode: teamB?.code ?? "TMB",
        venueName: venue?.name,
        round: f.round,
        status: f.status,
        scoreHome: f.teamAScore !== undefined ? f.teamAScore : null,
        scoreAway: f.teamBScore !== undefined ? f.teamBScore : null,
        existingStatus: "draft",
      };

    });
  }

  // Derive initial status from existing results
  let initialStatus: ResultStatus = "draft";
  let initialSubmittedBy: string | null = null;

  if (dbResults.length > 0) {
    if (dbResults.some((r) => r.status === "published")) {
      initialStatus = "published";
    } else if (dbResults.some((r) => r.status === "verified")) {
      initialStatus = "verified";
    } else if (dbResults.some((r) => r.status === "submitted")) {
      initialStatus = "submitted";
    }

    const firstSubmitted = dbResults.find((r) => r.submitted_by);
    if (firstSubmitted?.submitted_by) {
      initialSubmittedBy = firstSubmitted.submitted_by;
    }
  }

  return (
    <main className="pegasus-page pegasus-animate-fade">
      <div style={{ marginBottom: "16px" }}>
        <Link
          href="/judge"
          className="pegasus-back"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          ← Back to Judge Control Center
        </Link>
      </div>

      {/* Event Operational Header */}
      <section className="pegasus-page__header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "6px",
          }}
        >
          <span className="pegasus-eyebrow" style={{ margin: 0 }}>
            {eventSport}
          </span>
          <span style={{ color: "var(--muted)", fontSize: "12px" }}>•</span>
          <span
            style={{
              color: "var(--muted)",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            {eventCategory}
          </span>
        </div>

        <h1 className="pegasus-page-title" style={{ margin: "0 0 10px" }}>
          {eventName}
        </h1>

        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            fontSize: "12px",
            color: "var(--muted)",
          }}
        >
          <span>
            Discipline:{" "}
            <strong style={{ color: "var(--foreground)" }}>
              {eventSport.toUpperCase()}
            </strong>
          </span>
          <span>•</span>
          <span>
            Type:{" "}
            <strong style={{ color: "var(--foreground)" }}>
              {eventType.toUpperCase()}
            </strong>
          </span>
          <span>•</span>
          <span>
            Point Class:{" "}
            <strong
              style={{
                color: pointClass ? "var(--accent)" : "var(--status-pending)",
              }}
            >
              {pointClass ? `CLASS ${pointClass}` : "UNCONFIRMED"}
            </strong>
          </span>
        </div>
      </section>

      {/* Interactive Client Score Sheet */}
      <JudgeScoreSheetClient
        festivalId={festivalId || "pegasus-2026"}
        eventId={eventIdentifier}
        eventName={eventName}
        eventSport={eventSport}
        eventCategory={eventCategory}
        eventType={eventType}
        pointClass={pointClass}
        isAssigned={isAssigned}
        competitors={competitors}
        fixtures={fixtures}
        initialStatus={initialStatus}
        initialSubmittedBy={initialSubmittedBy}
        authJudgeName={authProfile?.fullName ?? null}
        isTransitional={!authProfile}
      />
    </main>
  );
}

