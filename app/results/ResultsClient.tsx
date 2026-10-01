"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type {
  ResultRow,
  EventRow,
  TeamRow,
  ParticipantRow,
} from "@/lib/repositories";
import { formatPerformance } from "@/lib/results/resultStatus";
import type { Performance } from "@/lib/types";

type Props = {
  initialResults: ResultRow[];
  events: EventRow[];
  teams: TeamRow[];
  participants: ParticipantRow[];
};

function getRankBadge(rank: number | null, disposition: string) {
  if (disposition && disposition !== "normal") {
    return {
      label: disposition.toUpperCase(),
      bg: "rgba(255, 255, 255, 0.06)",
      color: "var(--text-muted)",
      isPodium: false,
    };
  }
  if (!rank) {
    return {
      label: "—",
      bg: "rgba(255, 255, 255, 0.04)",
      color: "var(--text-muted)",
      isPodium: false,
    };
  }
  if (rank === 1) {
    return {
      label: "#1",
      subLabel: "Gold",
      bg: "rgba(245, 158, 11, 0.12)",
      border: "1px solid rgba(245, 158, 11, 0.4)",
      color: "#F59E0B",
      isPodium: true,
    };
  }
  if (rank === 2) {
    return {
      label: "#2",
      subLabel: "Silver",
      bg: "rgba(148, 163, 184, 0.12)",
      border: "1px solid rgba(148, 163, 184, 0.4)",
      color: "#94A3B8",
      isPodium: true,
    };
  }
  if (rank === 3) {
    return {
      label: "#3",
      subLabel: "Bronze",
      bg: "rgba(217, 119, 6, 0.12)",
      border: "1px solid rgba(217, 119, 6, 0.4)",
      color: "#D97706",
      isPodium: true,
    };
  }
  return {
    label: `#${rank}`,
    bg: "rgba(255, 255, 255, 0.04)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    isPodium: false,
  };
}

export default function ResultsClient({
  initialResults,
  events,
  teams,
  participants,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState("all");

  const eventMap = useMemo(
    () => new Map(events.map((e) => [e.id, e])),
    [events],
  );
  const teamMap = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams],
  );
  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  );

  // Derive distinct sports from events
  const sports = useMemo(() => {
    const sportNames = new Set<string>();
    for (const ev of events) {
      if (ev.competition_type) sportNames.add(ev.competition_type);
    }
    return Array.from(sportNames).sort();
  }, [events]);

  // Group published results by event_id
  const eventGroups = useMemo(() => {
    const map = new Map<string, ResultRow[]>();
    for (const res of initialResults) {
      const list = map.get(res.event_id) ?? [];
      list.push(res);
      map.set(res.event_id, list);
    }

    const groups = Array.from(map.entries()).map(([eventId, rows]) => {
      const event = eventMap.get(eventId);
      // Sort: ranks 1, 2, 3, etc. (nulls placed last)
      const sortedRows = [...rows].sort((a, b) => {
        if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
        if (a.rank !== null) return -1;
        if (b.rank !== null) return 1;
        return 0;
      });

      return {
        eventId,
        event,
        results: sortedRows,
      };
    });

    return groups;
  }, [initialResults, eventMap]);

  // Filter event groups by search query and sport filter
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return eventGroups.filter((group) => {
      const eventName = group.event?.name?.toLowerCase() ?? "";
      const eventCode = group.event?.code?.toLowerCase() ?? "";
      const compType = group.event?.competition_type?.toLowerCase() ?? "";

      // Sport filter
      if (sportFilter !== "all") {
        if (compType !== sportFilter.toLowerCase()) {
          return false;
        }
      }

      // Search matching event name, code, sport, or any athlete/team in the group
      if (q) {
        const matchesEvent =
          eventName.includes(q) ||
          eventCode.includes(q) ||
          compType.includes(q);

        const matchesAthlete = group.results.some((r) => {
          const p = r.participant_id
            ? participantMap.get(r.participant_id)
            : null;
          const t = r.team_id ? teamMap.get(r.team_id) : null;
          return (
            p?.name?.toLowerCase().includes(q) ||
            p?.public_id?.toLowerCase().includes(q) ||
            p?.chest_number?.toLowerCase().includes(q) ||
            t?.name?.toLowerCase().includes(q)
          );
        });

        if (!matchesEvent && !matchesAthlete) {
          return false;
        }
      }

      return true;
    });
  }, [eventGroups, searchQuery, sportFilter, participantMap, teamMap]);

  const isFiltering = searchQuery.trim() !== "" || sportFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSportFilter("all");
  };

  return (
    <section>
      {/* Search and Filters Bar */}
      <div className="pegasus-filter-row">
        <div style={{ flex: "1 1 280px" }}>
          <div className="pegasus-search">
            <span className="pegasus-search__icon" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by event, athlete, team, or chest number..."
              className="pegasus-search__input"
              aria-label="Search results"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "14px",
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "4px",
                }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {sports.length > 0 && (
          <div style={{ minWidth: "160px" }}>
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="pegasus-select"
              aria-label="Filter by sport"
            >
              <option value="all">All Disciplines</option>
              {sports.map((sp) => (
                <option key={sp} value={sp}>
                  {sp}
                </option>
              ))}
            </select>
          </div>
        )}

        {isFiltering && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="pegasus-button pegasus-button--secondary"
            style={{ padding: "0 16px", minHeight: "48px" }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Results Status Count */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          fontSize: "13px",
          color: "var(--muted)",
        }}
      >
        <span>
          Showing <strong>{filteredGroups.length}</strong> published event
          {filteredGroups.length === 1 ? "" : "s"}
        </span>

        {isFiltering && (
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "13px",
              padding: 0,
            }}
          >
            Clear active filters
          </button>
        )}
      </div>

      {/* Filtered Empty State */}
      {filteredGroups.length === 0 ? (
        <div
          className="pegasus-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            marginTop: "16px",
          }}
        >
          <p
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: "8px",
            }}
          >
            No published results match your search
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              marginBottom: "20px",
            }}
          >
            Try adjusting your search terms or clearing the selected filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="pegasus-button pegasus-button--secondary"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        /* Event Result Groups */
        <div style={{ display: "grid", gap: "28px" }}>
          {filteredGroups.map((group) => {
            const eventName = group.event?.name ?? "Event";
            const eventCode = group.event?.code ?? "EVT";
            const sportName = group.event?.competition_type ?? "Athletics";

            return (
              <section
                key={group.eventId}
                className="pegasus-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                  padding: "24px",
                }}
              >
                {/* Event Header */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: "12px",
                    borderBottom: "1px solid var(--border)",
                    paddingBottom: "16px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <span className="pegasus-eyebrow" style={{ margin: 0 }}>
                        {sportName}
                      </span>
                      <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                        •
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 750,
                          letterSpacing: "0.08em",
                          color: "var(--muted)",
                          textTransform: "uppercase",
                        }}
                      >
                        {eventCode}
                      </span>
                    </div>

                    <h2
                      style={{
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        color: "var(--foreground)",
                      }}
                    >
                      {eventName}
                    </h2>
                  </div>

                  <span className="zenith-signal zenith-signal-verified">
                    <span className="zenith-signal-dot" />
                    OFFICIALLY PUBLISHED
                  </span>
                </div>

                {/* Results Podium List */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {group.results.map((result) => {
                    const participant = result.participant_id
                      ? participantMap.get(result.participant_id)
                      : null;
                    const team = result.team_id
                      ? teamMap.get(result.team_id)
                      : participant?.team_id
                        ? teamMap.get(participant.team_id)
                        : null;

                    const entityName =
                      participant?.name ?? team?.name ?? "Competitor";
                    const metaInfo = participant
                      ? `${team?.name ?? "Team"} ${
                          participant.chest_number
                            ? `• Chest #${participant.chest_number}`
                            : ""
                        }`
                      : team?.name ?? "Team Event";

                    const badge = getRankBadge(result.rank, result.disposition);
                    const performanceText = formatPerformance(
                      result.performance as unknown as Performance,
                    );

                    return (
                      <article
                        key={result.id}
                        className="zenith-surface-1 zenith-edge"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "14px",
                          padding: "14px 18px",
                          borderRadius: "var(--radius-medium)",
                          border: "1px solid var(--border)",
                          background: badge.isPodium
                            ? "var(--surface-raised)"
                            : "var(--surface)",
                        }}
                      >
                        {/* Left: Podium Rank + Competitor Info */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "14px",
                          }}
                        >
                          {/* Rank Badge */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "38px",
                              height: "38px",
                              borderRadius: "var(--radius-micro)",
                              background: badge.bg,
                              border: badge.border ?? "1px solid var(--border)",
                              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                              color: badge.color,
                              fontWeight: 900,
                              fontSize: "14px",
                              flexShrink: 0,
                            }}
                          >
                            <span>{badge.label}</span>
                          </div>

                          <div>
                            {participant ? (
                              <Link
                                href={`/participants/${encodeURIComponent(
                                  participant.public_id,
                                )}`}
                                style={{
                                  margin: 0,
                                  fontSize: "16px",
                                  fontWeight: 750,
                                  color: "var(--foreground)",
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                }}
                              >
                                {entityName}
                                <span
                                  style={{
                                    color: "var(--muted)",
                                    fontSize: "13px",
                                  }}
                                >
                                  ↗
                                </span>
                              </Link>
                            ) : (
                              <span
                                style={{
                                  margin: 0,
                                  fontSize: "16px",
                                  fontWeight: 750,
                                  color: "var(--foreground)",
                                }}
                              >
                                {entityName}
                              </span>
                            )}
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--muted)",
                                marginTop: "2px",
                              }}
                            >
                              {metaInfo}
                            </div>
                          </div>
                        </div>

                        {/* Right: Performance Mark + Points */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "20px",
                          }}
                        >
                          {performanceText && (
                            <div style={{ textAlign: "right" }}>
                              <span
                                style={{
                                  fontSize: "10px",
                                  color: "var(--muted)",
                                  textTransform: "uppercase",
                                  display: "block",
                                  letterSpacing: "0.08em",
                                  fontWeight: 750,
                                }}
                              >
                                Official Mark
                              </span>
                              <span
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 750,
                                  color: "var(--foreground)",
                                }}
                              >
                                {performanceText}
                              </span>
                            </div>
                          )}

                          <div
                            style={{
                              textAlign: "right",
                              minWidth: "54px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "10px",
                                color: "var(--muted)",
                                textTransform: "uppercase",
                                display: "block",
                                letterSpacing: "0.08em",
                                fontWeight: 750,
                              }}
                            >
                              Points
                            </span>
                            <span
                              style={{
                                fontSize: "16px",
                                fontWeight: 900,
                                color:
                                  result.points > 0
                                    ? "var(--accent)"
                                    : "var(--muted)",
                              }}
                            >
                              +{result.points}
                            </span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

