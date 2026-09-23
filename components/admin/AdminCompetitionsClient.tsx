"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCompetitionAction } from "@/app/admin/actions";
import type {
  CompetitionRow,
  EventRow,
  DivisionRow,
  FixtureRow,
} from "@/lib/repositories";
import type { CompetitionFormat, CompetitionStatus } from "@/lib/types";

interface AdminCompetitionsClientProps {
  festivalId: string;
  initialCompetitions: CompetitionRow[];
  events: EventRow[];
  divisions: DivisionRow[];
  fixtures: FixtureRow[];
}

export default function AdminCompetitionsClient({
  festivalId,
  initialCompetitions,
  events,
  divisions,
  fixtures,
}: AdminCompetitionsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState<CompetitionFormat | "all">("all");
  const [statusFilter, setStatusFilter] = useState<CompetitionStatus | "all">("all");

  // Notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    eventId: "",
    divisionId: "",
    format: "knockout" as CompetitionFormat,
    name: "",
    roundName: "",
  });

  // Maps
  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const divisionMap = useMemo(() => new Map(divisions.map((d) => [d.id, d])), [divisions]);

  // Fixture count per competition
  const fixtureCountMap = useMemo(() => {
    const map = new Map<string, number>();
    fixtures.forEach((f) => {
      map.set(f.competition_id, (map.get(f.competition_id) || 0) + 1);
    });
    return map;
  }, [fixtures]);

  // Telemetry KPIs
  const telemetry = useMemo(() => {
    const total = initialCompetitions.length;
    const ready = initialCompetitions.filter((c) => c.status === "ready").length;
    const live = initialCompetitions.filter((c) => c.status === "live").length;
    const completed = initialCompetitions.filter((c) => c.status === "completed" || c.status === "finished").length;
    const draft = initialCompetitions.filter((c) => c.status === "draft" || c.status === "scheduled").length;

    return { total, ready, live, completed, draft };
  }, [initialCompetitions]);

  // Filtered competitions
  const filteredCompetitions = useMemo(() => {
    return initialCompetitions.filter((comp) => {
      if (eventFilter !== "all" && comp.event_id !== eventFilter) return false;
      if (divisionFilter !== "all" && comp.division_id !== divisionFilter) return false;
      if (formatFilter !== "all" && comp.format !== formatFilter) return false;
      if (statusFilter !== "all" && comp.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const eventName = eventMap.get(comp.event_id)?.name.toLowerCase() || "";
        const divName = comp.division_id ? (divisionMap.get(comp.division_id)?.name.toLowerCase() || "") : "";
        const compName = comp.name.toLowerCase();
        const round = comp.round_name ? comp.round_name.toLowerCase() : "";

        if (
          !compName.includes(query) &&
          !eventName.includes(query) &&
          !divName.includes(query) &&
          !round.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [initialCompetitions, eventFilter, divisionFilter, formatFilter, statusFilter, searchQuery, eventMap, divisionMap]);

  // Handle Event selection in Create Modal to auto-fill name
  const handleEventChange = (eventId: string) => {
    const event = eventMap.get(eventId);
    const div = divisionMap.get(createForm.divisionId);
    let autoName = event ? event.name : "";
    if (div && autoName) {
      autoName += ` — ${div.name}`;
    }

    setCreateForm((prev) => ({
      ...prev,
      eventId,
      name: autoName || prev.name,
    }));
  };

  const handleDivisionChange = (divisionId: string) => {
    const event = eventMap.get(createForm.eventId);
    const div = divisionMap.get(divisionId);
    let autoName = event ? event.name : "";
    if (div && autoName) {
      autoName += ` — ${div.name}`;
    }

    setCreateForm((prev) => ({
      ...prev,
      divisionId,
      name: autoName || prev.name,
    }));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.eventId) {
      setFeedback({ type: "error", message: "Please select an event." });
      return;
    }
    if (!createForm.name.trim()) {
      setFeedback({ type: "error", message: "Please provide a competition name." });
      return;
    }

    startTransition(async () => {
      const res = await createCompetitionAction({
        festivalId,
        eventId: createForm.eventId,
        divisionId: createForm.divisionId || null,
        format: createForm.format,
        name: createForm.name.trim(),
        roundName: createForm.roundName.trim() || null,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Competition "${createForm.name}" created successfully.`,
        });
        setIsCreateModalOpen(false);
        setCreateForm({
          eventId: "",
          divisionId: "",
          format: "knockout",
          name: "",
          roundName: "",
        });
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to create competition.",
        });
      }
    });
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "live":
        return {
          background: "rgba(239, 68, 68, 0.15)",
          color: "#ef4444",
          border: "1px solid rgba(239, 68, 68, 0.3)",
        };
      case "ready":
        return {
          background: "rgba(16, 185, 129, 0.15)",
          color: "#10b981",
          border: "1px solid rgba(16, 185, 129, 0.3)",
        };
      case "completed":
      case "finished":
        return {
          background: "rgba(148, 163, 184, 0.15)",
          color: "#94a3b8",
          border: "1px solid rgba(148, 163, 184, 0.3)",
        };
      case "cancelled":
        return {
          background: "rgba(100, 116, 139, 0.15)",
          color: "#64748b",
          border: "1px solid rgba(100, 116, 139, 0.3)",
          textDecoration: "line-through",
        };
      case "draft":
      case "scheduled":
      default:
        return {
          background: "rgba(234, 179, 8, 0.15)",
          color: "#eab308",
          border: "1px solid rgba(234, 179, 8, 0.3)",
        };
    }
  };

  return (
    <div className="pegasus-admin-content">
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <span className="pegasus-eyebrow">TOURNAMENTS & MATCHUPS</span>
          <h1 className="pegasus-page-title" style={{ margin: "4px 0" }}>
            Competition Operations
          </h1>
          <p className="pegasus-page__description" style={{ margin: 0, maxWidth: "680px" }}>
            Create and orchestrate operational tournament instances, knockout brackets,
            and heat fixtures from verified event registrations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFeedback(null);
            setIsCreateModalOpen(true);
          }}
          className="pegasus-button pegasus-button--primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 700,
          }}
        >
          <span>🏆</span>
          <span>Create Competition</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "6px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background:
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.4)"
                : "rgba(239, 68, 68, 0.4)"
            }`,
            color: feedback.type === "success" ? "#10b981" : "#ef4444",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Telemetry KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="pegasus-card" style={{ padding: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Total Competitions
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--foreground)", marginTop: "4px" }}>
            {telemetry.total}
          </div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Configured instances
          </span>
        </div>

        <div className="pegasus-card" style={{ padding: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Drafting / Setup
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#eab308", marginTop: "4px" }}>
            {telemetry.draft}
          </div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Awaiting entrant draw
          </span>
        </div>

        <div className="pegasus-card" style={{ padding: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Operational Ready
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#10b981", marginTop: "4px" }}>
            {telemetry.ready}
          </div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Fixtures confirmed
          </span>
        </div>

        <div className="pegasus-card" style={{ padding: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Live In Action
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#ef4444", marginTop: "4px" }}>
            {telemetry.live}
          </div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Underway on courts
          </span>
        </div>

        <div className="pegasus-card" style={{ padding: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Completed
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--accent)", marginTop: "4px" }}>
            {telemetry.completed}
          </div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            All fixtures concluded
          </span>
        </div>
      </div>

      {/* Filter Controls */}
      <div
        className="pegasus-card"
        style={{
          padding: "16px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <input
            type="text"
            placeholder="Search competitions or events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pegasus-input"
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ flex: "0 1 170px" }}>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="pegasus-select"
            style={{ width: "100%" }}
          >
            <option value="all">All Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "0 1 170px" }}>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="pegasus-select"
            style={{ width: "100%" }}
          >
            <option value="all">All Divisions</option>
            {divisions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "0 1 150px" }}>
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as any)}
            className="pegasus-select"
            style={{ width: "100%" }}
          >
            <option value="all">All Formats</option>
            <option value="knockout">Knockout</option>
            <option value="heats">Heats</option>
            <option value="final">Final</option>
            <option value="round_robin">Round Robin</option>
            <option value="match">Single Match</option>
          </select>
        </div>

        <div style={{ flex: "0 1 150px" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="pegasus-select"
            style={{ width: "100%" }}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {(searchQuery || eventFilter !== "all" || divisionFilter !== "all" || formatFilter !== "all" || statusFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setEventFilter("all");
              setDivisionFilter("all");
              setFormatFilter("all");
              setStatusFilter("all");
            }}
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "13px", padding: "6px 12px" }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Competitions Table */}
      <div className="pegasus-card" style={{ padding: 0, overflow: "hidden" }}>
        {filteredCompetitions.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>🏆</span>
            <strong style={{ display: "block", fontSize: "16px", color: "var(--foreground)" }}>
              No competitions found
            </strong>
            <p style={{ margin: "4px 0 0", fontSize: "13px" }}>
              {searchQuery || eventFilter !== "all" || divisionFilter !== "all" || formatFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "Create your first competition instance to begin scheduling matchups."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--muted)",
                    fontSize: "11px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>Status</th>
                  <th style={{ padding: "12px 16px" }}>Competition Instance</th>
                  <th style={{ padding: "12px 16px" }}>Event & Division</th>
                  <th style={{ padding: "12px 16px" }}>Format & Round</th>
                  <th style={{ padding: "12px 16px" }}>Fixtures</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompetitions.map((comp) => {
                  const event = eventMap.get(comp.event_id);
                  const division = comp.division_id ? divisionMap.get(comp.division_id) : null;
                  const fixCount = fixtureCountMap.get(comp.id) || 0;
                  const statusStyle = getStatusBadgeStyle(comp.status);

                  return (
                    <tr
                      key={comp.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {/* Status */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            ...statusStyle,
                          }}
                        >
                          {comp.status}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: "14px 16px" }}>
                        <Link
                          href={`/admin/competitions/${comp.id}`}
                          style={{
                            fontWeight: 750,
                            fontSize: "14px",
                            color: "var(--foreground)",
                            textDecoration: "none",
                          }}
                        >
                          {comp.name}
                        </Link>
                      </td>

                      {/* Event & Division */}
                      <td style={{ padding: "14px 16px" }}>
                        <div>{event ? event.name : comp.event_id}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                          {division ? `${division.name} (${division.code})` : "All Divisions"}
                        </div>
                      </td>

                      {/* Format & Round */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            background: "rgba(255, 255, 255, 0.06)",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontSize: "11px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                          }}
                        >
                          {comp.format}
                        </span>
                        {comp.round_name && (
                          <span style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "6px" }}>
                            {comp.round_name}
                          </span>
                        )}
                      </td>

                      {/* Fixtures Count */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: fixCount > 0 ? "var(--accent)" : "var(--muted)",
                          }}
                        >
                          {fixCount} {fixCount === 1 ? "fixture" : "fixtures"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <Link
                          href={`/admin/competitions/${comp.id}`}
                          className="pegasus-button pegasus-button--subtle"
                          style={{
                            padding: "4px 10px",
                            fontSize: "12px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span>Manage</span>
                          <span>↗</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* CREATE COMPETITION MODAL */}
      {/* ============================================================ */}
      {isCreateModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            className="pegasus-card"
            style={{
              width: "100%",
              maxWidth: "520px",
              padding: "24px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                Create Competition Instance
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Event Select */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                      color: "var(--muted)",
                    }}
                  >
                    Event *
                  </label>
                  <select
                    value={createForm.eventId}
                    onChange={(e) => handleEventChange(e.target.value)}
                    required
                    className="pegasus-select"
                    style={{ width: "100%" }}
                  >
                    <option value="">Select Event...</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Division Select */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                      color: "var(--muted)",
                    }}
                  >
                    Division (Optional / Specific Cohort)
                  </label>
                  <select
                    value={createForm.divisionId}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    className="pegasus-select"
                    style={{ width: "100%" }}
                  >
                    <option value="">All Divisions / Open</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Format Select */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                      color: "var(--muted)",
                    }}
                  >
                    Tournament Format *
                  </label>
                  <select
                    value={createForm.format}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        format: e.target.value as CompetitionFormat,
                      })
                    }
                    required
                    className="pegasus-select"
                    style={{ width: "100%" }}
                  >
                    <option value="knockout">Knockout Tournament (Head-to-head bracket)</option>
                    <option value="heats">Heats & Lane Progression (Track/Pool)</option>
                    <option value="final">Direct Final (Field / Timed)</option>
                    <option value="round_robin">Round Robin (League Stage)</option>
                    <option value="match">Single Match / Exhibition</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                      color: "var(--muted)",
                    }}
                  >
                    Competition Title *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g., Football — Senior Boys"
                    required
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>

                {/* Round / Sub-stage (Optional) */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginBottom: "6px",
                      color: "var(--muted)",
                    }}
                  >
                    Stage / Round Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={createForm.roundName}
                    onChange={(e) => setCreateForm({ ...createForm, roundName: e.target.value })}
                    placeholder="e.g., Main Championship, Quarter Finals"
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>

                {/* Buttons */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    marginTop: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isPending}
                    className="pegasus-button pegasus-button--subtle"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="pegasus-button pegasus-button--primary"
                  >
                    {isPending ? "Creating..." : "Confirm & Create"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

