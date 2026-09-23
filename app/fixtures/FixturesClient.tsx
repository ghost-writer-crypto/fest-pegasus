"use client";

import { useMemo } from "react";
import type {
  FixtureRow,
  CompetitionRow,
  EventRow,
  TeamRow,
  VenueRow,
} from "@/lib/repositories";
import {
  getFixtureStatusLabel,
  getFixtureStatusBadgeClass,
} from "@/lib/schedule/fixtureUtils";

type Props = {
  initialFixtures: FixtureRow[];
  competitions: CompetitionRow[];
  events: EventRow[];
  teams: TeamRow[];
  venues: VenueRow[];
};

export default function FixturesClient({
  initialFixtures,
  competitions,
  events,
  teams,
  venues,
}: Props) {
  const competitionMap = useMemo(
    () => new Map(competitions.map((c) => [c.id, c])),
    [competitions],
  );
  const eventMap = useMemo(
    () => new Map(events.map((e) => [e.id, e])),
    [events],
  );
  const teamMap = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams],
  );
  const venueMap = useMemo(
    () => new Map(venues.map((v) => [v.id, v])),
    [venues],
  );

  return (
    <section style={{ display: "grid", gap: "16px" }}>
      {initialFixtures.map((fixture) => {
        const competition = competitionMap.get(fixture.competition_id);
        const event = competition ? eventMap.get(competition.event_id) : null;
        const venue = fixture.venue_id ? venueMap.get(fixture.venue_id) : null;

        const homeTeam = fixture.home_team_id
          ? teamMap.get(fixture.home_team_id)
          : null;
        const awayTeam = fixture.away_team_id
          ? teamMap.get(fixture.away_team_id)
          : null;

        const statusLabel = getFixtureStatusLabel(fixture.status);
        const statusClass = getFixtureStatusBadgeClass(fixture.status);

        // Scores are displayed only when both score_home and score_away are genuinely present and official
        const hasScores =
          fixture.score_home !== null &&
          fixture.score_away !== null &&
          fixture.score_home !== undefined &&
          fixture.score_away !== undefined &&
          !isNaN(Number(fixture.score_home)) &&
          !isNaN(Number(fixture.score_away)) &&
          (fixture.status === "live" || fixture.status === "finished");

        const roundLabel =
          competition?.round_name ??
          (fixture.metadata?.round as string | undefined) ??
          (competition?.format ? `${competition.format.toUpperCase()} MATCH` : "MATCHUP");

        const scheduledDate = fixture.scheduled_at
          ? new Date(fixture.scheduled_at)
          : null;
        const formattedSchedule =
          scheduledDate && !isNaN(scheduledDate.getTime())
            ? scheduledDate.toLocaleString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "Schedule Pending";

        return (
          <article
            key={fixture.id}
            className="pegasus-card pegasus-card--interactive"
          >
            {/* Top Bar: Event & Round Info + Status */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span className="pegasus-tag pegasus-tag--accent">
                  {event?.name ?? competition?.name ?? "Tournament Match"}
                </span>
                <span className="pegasus-tag">{roundLabel}</span>
              </div>

              <span className={`pegasus-status ${statusClass}`}>
                <span className="pegasus-status__dot" />
                {statusLabel}
              </span>
            </div>

            {/* Middle: Matchup Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: "16px",
                padding: "16px 0",
                borderTop: "1px solid var(--border)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {/* Home Team */}
              <div style={{ textAlign: "right" }}>
                <strong
                  style={{
                    fontSize: "18px",
                    display: "block",
                    color: "var(--foreground)",
                  }}
                >
                  {homeTeam?.name ?? "TBD"}
                </strong>
                {hasScores ? (
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: 800,
                      color: "var(--accent)",
                    }}
                  >
                    {fixture.score_home}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "14px",
                      color: "var(--muted)",
                      fontWeight: 600,
                      display: "block",
                      marginTop: "2px",
                    }}
                  >
                    —
                  </span>
                )}
              </div>

              {/* VS Divider */}
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 800,
                  color: "var(--muted)",
                  padding: "0 8px",
                }}
              >
                VS
              </span>

              {/* Away Team */}
              <div>
                <strong
                  style={{
                    fontSize: "18px",
                    display: "block",
                    color: "var(--foreground)",
                  }}
                >
                  {awayTeam?.name ?? "TBD"}
                </strong>
                {hasScores ? (
                  <span
                    style={{
                      fontSize: "24px",
                      fontWeight: 800,
                      color: "var(--accent)",
                    }}
                  >
                    {fixture.score_away}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: "14px",
                      color: "var(--muted)",
                      fontWeight: 600,
                      display: "block",
                      marginTop: "2px",
                    }}
                  >
                    —
                  </span>
                )}
              </div>
            </div>


            {/* Bottom Bar: Venue & Scheduled Time */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "12px",
                color: "var(--muted)",
                marginTop: "12px",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span>{venue?.name ?? "Venue Pending"}</span>
              <span>{formattedSchedule}</span>
            </div>
          </article>
        );
      })}
    </section>
  );
}

