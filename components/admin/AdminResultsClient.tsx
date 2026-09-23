"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  getResultStatusLabel,
  getResultStatusBadgeClass,
  formatPerformance,
} from "@/lib/results";
import type {
  ResultRow,
  EventRow,
  ParticipantRow,
  TeamRow,
} from "@/lib/repositories";
import type { Performance } from "@/lib/types";

interface AdminResultsClientProps {
  initialResults: ResultRow[];
  events: EventRow[];
  participants: ParticipantRow[];
  teams: TeamRow[];
}

export default function AdminResultsClient({
  initialResults,
  events,
  participants,
  teams,
}: AdminResultsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");

  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const participantMap = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants],
  );
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  // Metrics computed from real data
  const metrics = useMemo(() => {
    const total = initialResults.length;
    const submitted = initialResults.filter((r) => r.status === "submitted").length;
    const verified = initialResults.filter((r) => r.status === "verified").length;
    const published = initialResults.filter((r) => r.status === "published").length;
    const attention = initialResults.filter(
      (r) => r.status === "submitted" || r.status === "corrected",
    ).length;

    return { total, submitted, verified, published, attention };
  }, [initialResults]);

  // Filtered results
  const filteredResults = useMemo(() => {
    return initialResults.filter((r) => {
      // Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) {
        return false;
      }

      // Event filter
      if (eventFilter !== "all" && r.event_id !== eventFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const event = eventMap.get(r.event_id);
        const participant = r.participant_id
          ? participantMap.get(r.participant_id)
          : undefined;
        const team = r.team_id
          ? teamMap.get(r.team_id)
          : participant?.team_id
            ? teamMap.get(participant.team_id)
            : undefined;

        const matchesId = r.id.toLowerCase().includes(query);
        const matchesEvent =
          event?.name.toLowerCase().includes(query) ||
          event?.code.toLowerCase().includes(query);
        const matchesParticipant =
          participant?.name.toLowerCase().includes(query) ||
          participant?.chest_number?.toLowerCase().includes(query) ||
          participant?.public_id.toLowerCase().includes(query);
        const matchesTeam =
          team?.name.toLowerCase().includes(query) ||
          team?.code.toLowerCase().includes(query);

        if (
          !matchesId &&
          !matchesEvent &&
          !matchesParticipant &&
          !matchesTeam
        ) {
          return false;
        }
      }

      return true;
    });
  }, [initialResults, statusFilter, eventFilter, searchQuery, eventMap, participantMap, teamMap]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Metrics Row */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
        }}
      >
        <div
          className="pegasus-card"
          style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span className="pegasus-eyebrow" style={{ margin: 0 }}>
            TOTAL ENTRIES
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900 }}>
            {metrics.total}
          </strong>
        </div>

        <div
          className="pegasus-card"
          style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span className="pegasus-eyebrow" style={{ margin: 0, color: "var(--status-pending)" }}>
            SUBMITTED (IN QUEUE)
          </span>
          <strong
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: metrics.submitted > 0 ? "var(--status-pending)" : "inherit",
            }}
          >
            {metrics.submitted}
          </strong>
        </div>

        <div
          className="pegasus-card"
          style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span className="pegasus-eyebrow" style={{ margin: 0, color: "var(--accent)" }}>
            VERIFIED (READY)
          </span>
          <strong
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: metrics.verified > 0 ? "var(--accent)" : "inherit",
            }}
          >
            {metrics.verified}
          </strong>
        </div>

        <div
          className="pegasus-card"
          style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span className="pegasus-eyebrow" style={{ margin: 0, color: "var(--status-live)" }}>
            PUBLISHED (LIVE)
          </span>
          <strong
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: metrics.published > 0 ? "var(--status-live)" : "inherit",
            }}
          >
            {metrics.published}
          </strong>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section
        className="pegasus-card pegasus-admin-filter-bar"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", flex: 1, minWidth: "260px" }}>
          <input
            type="text"
            className="pegasus-admin-input"
            placeholder="Search competitor, chest #, event, team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: "200px" }}
          />

          <select
            className="pegasus-admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses ({initialResults.length})</option>
            <option value="submitted">Submitted ({metrics.submitted})</option>
            <option value="verified">Verified ({metrics.verified})</option>
            <option value="published">Published ({metrics.published})</option>
            <option value="draft">Drafts</option>
            <option value="corrected">Corrected</option>
          </select>

          <select
            className="pegasus-admin-select"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="all">All Events ({events.length})</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.code})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Link
            href="/admin/verification"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "11px", padding: "6px 12px", minHeight: "34px" }}
          >
            Verification Station ↗
          </Link>
          <Link
            href="/admin/publish"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "11px", padding: "6px 12px", minHeight: "34px" }}
          >
            Publishing Desk ↗
          </Link>
        </div>
      </section>

      {/* Results Table & Mobile Cards */}
      <section>
        {filteredResults.length === 0 ? (
          <div
            className="pegasus-card"
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "14px",
            }}
          >
            No results match the current filters.
          </div>
        ) : (
          <div className="pegasus-admin-table-wrapper">
            <table className="pegasus-admin-table">
              <thead>
                <tr>
                  <th>Result ID / Status</th>
                  <th>Event</th>
                  <th>Competitor / Team</th>
                  <th>Position</th>
                  <th>Mark</th>
                  <th>Points</th>
                  <th>Provenance</th>
                  <th style={{ textAlign: "right" }}>Workflow</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((result) => {
                  const event = eventMap.get(result.event_id);
                  const participant = result.participant_id
                    ? participantMap.get(result.participant_id)
                    : undefined;
                  const team = result.team_id
                    ? teamMap.get(result.team_id)
                    : participant?.team_id
                      ? teamMap.get(participant.team_id)
                      : undefined;
                  const performanceText = formatPerformance(
                    result.performance as unknown as Performance,
                  );

                  return (
                    <tr key={result.id}>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontSize: "11px",
                              color: "var(--accent)",
                              fontWeight: 700,
                            }}
                          >
                            #{result.id.slice(0, 8)}
                          </span>
                          <span
                            className={`pegasus-status ${getResultStatusBadgeClass(
                              result.status,
                            )}`}
                            style={{ padding: "2px 6px", fontSize: "10px", width: "fit-content" }}
                          >
                            <span className="pegasus-status__dot" />
                            {getResultStatusLabel(result.status)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <strong style={{ fontSize: "13px" }}>
                            {event?.name ?? "Event"}
                          </strong>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {event?.code ?? ""}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <strong style={{ fontSize: "13px" }}>
                            {participant?.name ?? team?.name ?? "Competitor"}
                          </strong>
                          {participant && (
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                              {team?.name ?? "Team"} • #{participant.chest_number || "—"}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        {result.rank ? (
                          <strong>#{result.rank}</strong>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>

                      <td>
                        <span style={{ color: "var(--muted-strong)" }}>
                          {performanceText || "—"}
                        </span>
                      </td>

                      <td>
                        <strong
                          style={{
                            color: result.points > 0 ? "var(--accent)" : "inherit",
                          }}
                        >
                          +{result.points} pts
                        </strong>
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column", fontSize: "11px", color: "var(--muted)" }}>
                          {result.published_at ? (
                            <span>
                              Live: {new Date(result.published_at).toLocaleDateString()}
                            </span>
                          ) : result.verified_by ? (
                            <span>Audited by Chief Scorer</span>
                          ) : (
                            <span>Created: {new Date(result.created_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        {result.status === "submitted" && (
                          <Link
                            href="/admin/verification"
                            className="pegasus-button pegasus-button--primary"
                            style={{ fontSize: "11px", padding: "4px 8px", minHeight: "28px" }}
                          >
                            Verify
                          </Link>
                        )}
                        {result.status === "verified" && (
                          <Link
                            href="/admin/publish"
                            className="pegasus-button pegasus-button--primary"
                            style={{ fontSize: "11px", padding: "4px 8px", minHeight: "28px" }}
                          >
                            Publish
                          </Link>
                        )}
                        {result.status === "published" && (
                          <Link
                            href="/results"
                            className="pegasus-button pegasus-button--subtle"
                            style={{ fontSize: "11px", padding: "4px 8px", minHeight: "28px" }}
                          >
                            Public ↗
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
