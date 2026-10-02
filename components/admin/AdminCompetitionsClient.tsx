"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Play,
  CheckCircle2,
  Clock,
  Search,
  ArrowUpRight,
  X,
  Layers,
} from "lucide-react";
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
          border: "1px solid rgba(239, 68, 68, 0.35)",
        };
      case "ready":
        return {
          background: "rgba(16, 185, 129, 0.15)",
          color: "#10b981",
          border: "1px solid rgba(16, 185, 129, 0.35)",
        };
      case "completed":
      case "finished":
        return {
          background: "rgba(148, 163, 184, 0.15)",
          color: "#94a3b8",
          border: "1px solid rgba(148, 163, 184, 0.35)",
        };
      case "cancelled":
        return {
          background: "rgba(100, 116, 139, 0.15)",
          color: "#64748b",
          border: "1px solid rgba(100, 116, 139, 0.35)",
          textDecoration: "line-through",
        };
      case "draft":
      case "scheduled":
      default:
        return {
          background: "rgba(234, 179, 8, 0.15)",
          color: "#eab308",
          border: "1px solid rgba(234, 179, 8, 0.35)",
        };
    }
  };

  return (
    <div className="zenithrow-competitions-page">
      <style>{`
        .zenithrow-competitions-page {
          --z0: #070809;
          --z1: #0e1013;
          --z2: #15181c;
          --z3: #1e2228;
          --z4: #262b33;
          --line: rgba(255, 255, 255, 0.085);
          --line2: rgba(255, 255, 255, 0.14);
          --fg: #f8fafc;
          --muted: #94a3b8;
          --muted2: #64748b;
          --red: #e53935;
          --red2: #ff5252;
          --blue: #2563eb;
          --green: #22c55e;
          --amber: #f59e0b;
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px 20px 48px;
          color: var(--fg);
          font-family: Inter, system-ui, -apple-system, sans-serif;
        }

        .zenithrow-competitions-page .kicker {
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.16em;
          color: var(--red);
          text-transform: uppercase;
          margin-bottom: 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .zenithrow-competitions-page .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
        }

        .zenithrow-competitions-page .title {
          font-size: 30px;
          font-weight: 850;
          letter-spacing: -0.035em;
          margin: 4px 0 6px;
          color: #fff;
        }

        .zenithrow-competitions-page .subtitle {
          margin: 0;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.55;
          max-width: 720px;
        }

        .zenithrow-competitions-page .btn {
          height: 36px;
          border-radius: 9px;
          border: 1px solid var(--line);
          background: #11151a;
          color: #dce2ea;
          padding: 0 14px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.18s ease;
          text-decoration: none;
        }
        .zenithrow-competitions-page .btn:hover:not(:disabled) {
          background: #191f26;
          border-color: var(--line2);
          transform: translateY(-1px);
        }
        .zenithrow-competitions-page .btn-primary {
          background: var(--red) !important;
          border-color: var(--red) !important;
          color: #fff !important;
        }
        .zenithrow-competitions-page .btn-primary:hover:not(:disabled) {
          filter: brightness(1.1);
        }

        .zenithrow-competitions-page .telemetry-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 14px;
          margin-bottom: 22px;
        }
        .zenithrow-competitions-page .telemetry-card {
          background: linear-gradient(180deg, #111419, #0d0f12);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 16px 18px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
          position: relative;
          overflow: hidden;
        }
        .zenithrow-competitions-page .telemetry-label {
          font-size: 10px;
          font-weight: 800;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .zenithrow-competitions-page .telemetry-value {
          font-size: 28px;
          font-weight: 900;
          margin: 6px 0 2px;
          color: #fff;
          font-variant-numeric: tabular-nums;
        }
        .zenithrow-competitions-page .telemetry-sub {
          font-size: 11px;
          color: var(--muted2);
        }

        .zenithrow-competitions-page .filters-bar {
          background: rgba(14, 17, 21, 0.85);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .zenithrow-competitions-page input,
        .zenithrow-competitions-page select {
          height: 34px;
          background: #11151a;
          border: 1px solid var(--line);
          border-radius: 8px;
          color: #fff;
          font-size: 12px;
          padding: 0 12px;
          transition: border-color 0.18s ease;
        }
        .zenithrow-competitions-page input:focus,
        .zenithrow-competitions-page select:focus {
          outline: none;
          border-color: var(--blue);
        }

        .zenithrow-competitions-page .table-shell {
          background: #0d1014;
          border: 1px solid var(--line);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 16px 45px rgba(0, 0, 0, 0.3);
        }
        .zenithrow-competitions-page table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
          text-align: left;
        }
        .zenithrow-competitions-page th {
          background: #14181e;
          padding: 13px 18px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
          font-weight: 800;
          border-bottom: 1px solid var(--line);
        }
        .zenithrow-competitions-page td {
          padding: 14px 18px;
          border-bottom: 1px solid var(--line);
          color: #cbd5e1;
        }
        .zenithrow-competitions-page tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .zenithrow-competitions-page .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.82);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
        }
        .zenithrow-competitions-page .modal-box {
          background: #101317;
          border: 1px solid var(--line2);
          border-radius: 18px;
          padding: 24px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6);
        }
      `}</style>

      {/* Page Header */}
      <div className="header-section">
        <div>
          <div className="kicker">09 • TOURNAMENT OPERATIONS &amp; BRACKETS</div>
          <h1 className="title">Competition Operations</h1>
          <p className="subtitle">
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
          className="btn btn-primary"
        >
          <Trophy size={14} />
          <span>Create Competition</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "10px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background:
              feedback.type === "success"
                ? "rgba(34, 197, 94, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${
              feedback.type === "success"
                ? "rgba(34, 197, 94, 0.35)"
                : "rgba(239, 68, 68, 0.35)"
            }`,
            color: feedback.type === "success" ? "#86efac" : "#fca5a5",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {feedback.type === "success" ? <CheckCircle2 size={15} /> : <X size={15} />}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Telemetry KPIs */}
      <div className="telemetry-grid">
        <div className="telemetry-card">
          <div className="telemetry-label">
            <Layers size={12} />
            <span>Total Competitions</span>
          </div>
          <div className="telemetry-value">{telemetry.total}</div>
          <div className="telemetry-sub">Configured instances</div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-label" style={{ color: "#facc15" }}>
            <Clock size={12} />
            <span>Drafting • Setup</span>
          </div>
          <div className="telemetry-value" style={{ color: "#facc15" }}>
            {telemetry.draft}
          </div>
          <div className="telemetry-sub">Awaiting entrant draw</div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-label" style={{ color: "#4ade80" }}>
            <CheckCircle2 size={12} />
            <span>Operational Ready</span>
          </div>
          <div className="telemetry-value" style={{ color: "#4ade80" }}>
            {telemetry.ready}
          </div>
          <div className="telemetry-sub">Fixtures confirmed</div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-label" style={{ color: "#f87171" }}>
            <Play size={12} />
            <span>Live In Action</span>
          </div>
          <div className="telemetry-value" style={{ color: "#f87171" }}>
            {telemetry.live}
          </div>
          <div className="telemetry-sub">Underway on courts</div>
        </div>

        <div className="telemetry-card">
          <div className="telemetry-label" style={{ color: "#60a5fa" }}>
            <Trophy size={12} />
            <span>Completed</span>
          </div>
          <div className="telemetry-value" style={{ color: "#60a5fa" }}>
            {telemetry.completed}
          </div>
          <div className="telemetry-sub">All fixtures concluded</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="filters-bar">
        <div style={{ flex: "1 1 220px", position: "relative" }}>
          <input
            type="text"
            placeholder="Search competitions or events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: "100%", paddingLeft: "32px" }}
          />
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          />
        </div>

        <div style={{ flex: "0 1 180px" }}>
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
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

        <div style={{ flex: "0 1 180px" }}>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
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

        <div style={{ flex: "0 1 160px" }}>
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as any)}
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

        <div style={{ flex: "0 1 160px" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
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
            className="btn"
            style={{ fontSize: "11px" }}
          >
            <X size={12} />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Competitions Table */}
      <div className="table-shell">
        {filteredCompetitions.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>🏆</span>
            <strong style={{ display: "block", fontSize: "16px", color: "#f8fafc" }}>
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
            <table>
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>Status</th>
                  <th>Competition Instance</th>
                  <th>Event &amp; Division</th>
                  <th>Format &amp; Round</th>
                  <th style={{ width: "140px" }}>Fixtures</th>
                  <th style={{ width: "120px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompetitions.map((comp) => {
                  const event = eventMap.get(comp.event_id);
                  const division = comp.division_id ? divisionMap.get(comp.division_id) : null;
                  const fixCount = fixtureCountMap.get(comp.id) || 0;
                  const statusStyle = getStatusBadgeStyle(comp.status);

                  return (
                    <tr key={comp.id}>
                      {/* Status */}
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "5px",
                            fontSize: "10px",
                            fontWeight: 850,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            ...statusStyle,
                          }}
                        >
                          ● {comp.status}
                        </span>
                      </td>

                      {/* Name */}
                      <td>
                        <Link
                          href={`/admin/competitions/${comp.id}`}
                          style={{
                            fontWeight: 800,
                            fontSize: "14px",
                            color: "#fff",
                            textDecoration: "none",
                            display: "inline-block",
                          }}
                        >
                          {comp.name}
                        </Link>
                      </td>

                      {/* Event & Division */}
                      <td>
                        <div style={{ fontWeight: 700, color: "#e2e8f0" }}>
                          {event ? event.name : comp.event_id}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                          {division ? `${division.name} (${division.code})` : "All Divisions"}
                        </div>
                      </td>

                      {/* Format & Round */}
                      <td>
                        <span
                          style={{
                            background: "rgba(255, 255, 255, 0.06)",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            color: "#60a5fa",
                          }}
                        >
                          {comp.format}
                        </span>
                        {comp.round_name && (
                          <span style={{ fontSize: "12px", color: "var(--muted)", marginLeft: "8px" }}>
                            {comp.round_name}
                          </span>
                        )}
                      </td>

                      {/* Fixtures Count */}
                      <td>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: "12px",
                            color: fixCount > 0 ? "#86efac" : "var(--muted)",
                          }}
                        >
                          {fixCount} {fixCount === 1 ? "fixture" : "fixtures"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/admin/competitions/${comp.id}`}
                          className="btn"
                          style={{
                            padding: "0 10px",
                            height: "28px",
                            fontSize: "11px",
                          }}
                        >
                          <span>Manage</span>
                          <ArrowUpRight size={13} />
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

      {/* CREATE COMPETITION MODAL */}
      {isCreateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 850 }}>
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
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Event Select */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 750,
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
                      fontSize: "11px",
                      fontWeight: 750,
                      marginBottom: "6px",
                      color: "var(--muted)",
                    }}
                  >
                    Division (Optional • Specific Cohort)
                  </label>
                  <select
                    value={createForm.divisionId}
                    onChange={(e) => handleDivisionChange(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="">All Divisions • Open</option>
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
                      fontSize: "11px",
                      fontWeight: 750,
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
                    style={{ width: "100%" }}
                  >
                    <option value="knockout">Knockout Tournament (Head-to-head bracket)</option>
                    <option value="heats">Heats &amp; Lane Progression (Track • Pool)</option>
                    <option value="final">Direct Final (Field • Timed)</option>
                    <option value="round_robin">Round Robin (League Stage)</option>
                    <option value="match">Single Match • Exhibition</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 750,
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
                    style={{ width: "100%" }}
                  />
                </div>

                {/* Round / Sub-stage (Optional) */}
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 750,
                      marginBottom: "6px",
                      color: "var(--muted)",
                    }}
                  >
                    Stage • Round Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={createForm.roundName}
                    onChange={(e) => setCreateForm({ ...createForm, roundName: e.target.value })}
                    placeholder="e.g., Main Championship, Quarter Finals"
                    style={{ width: "100%" }}
                  />
                </div>

                {/* Buttons */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "10px",
                    marginTop: "8px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isPending}
                    className="btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn btn-primary"
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
