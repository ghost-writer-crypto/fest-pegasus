"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTeamPenaltyAction,
  reverseTeamPenaltyAction,
} from "@/app/admin/actions";
import type { TeamPenalty } from "@/lib/types";
import type { TeamRow, EventRow } from "@/lib/repositories";

interface AdminPenaltiesClientProps {
  festivalId: string;
  initialPenalties: TeamPenalty[];
  teams: TeamRow[];
  events: EventRow[];
}

export default function AdminPenaltiesClient({
  festivalId,
  initialPenalties,
  teams,
  events,
}: AdminPenaltiesClientProps) {
  const router = useRouter();
  const penalties = initialPenalties;
  const [isPending, startTransition] = useTransition();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "reversed">("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modals
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [reversingPenalty, setReversingPenalty] = useState<TeamPenalty | null>(null);

  // Issue Form state
  const [issueForm, setIssueForm] = useState({
    teamId: "",
    eventId: "",
    ruleCode: "POST_EVENT_VIOLATION" as const,
    reason: "",
  });

  // Reversal Form state
  const [reversalReason, setReversalReason] = useState("");

  // Quick lookup maps
  const teamMap = useMemo(() => {
    const map = new Map<string, TeamRow>();
    teams.forEach((t) => map.set(t.id, t));
    return map;
  }, [teams]);

  const eventMap = useMemo(() => {
    const map = new Map<string, EventRow>();
    events.forEach((e) => map.set(e.id, e));
    return map;
  }, [events]);

  // Telemetry KPIs
  const telemetry = useMemo(() => {
    const active = penalties.filter((p) => !p.isReversed);
    const reversed = penalties.filter((p) => p.isReversed);
    const totalDeductions = active.reduce((sum, p) => sum + p.pointsDelta, 0);
    const uniqueTeamsAffected = new Set(active.map((p) => p.teamId)).size;

    return {
      activeCount: active.length,
      reversedCount: reversed.length,
      totalDeductions,
      uniqueTeamsAffected,
    };
  }, [penalties]);

  // Filtered penalties list
  const filteredPenalties = useMemo(() => {
    return penalties.filter((p) => {
      // Status filter
      if (statusFilter === "active" && p.isReversed) return false;
      if (statusFilter === "reversed" && !p.isReversed) return false;

      // Team filter
      if (teamFilter !== "all" && p.teamId !== teamFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const teamName = teamMap.get(p.teamId)?.name.toLowerCase() || "";
        const teamCode = teamMap.get(p.teamId)?.code.toLowerCase() || "";
        const eventName = p.eventId ? (eventMap.get(p.eventId)?.name.toLowerCase() || "") : "";
        const reason = p.reason.toLowerCase();
        const revReason = p.reversalReason ? p.reversalReason.toLowerCase() : "";

        if (
          !teamName.includes(query) &&
          !teamCode.includes(query) &&
          !eventName.includes(query) &&
          !reason.includes(query) &&
          !revReason.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [penalties, statusFilter, teamFilter, searchQuery, teamMap, eventMap]);

  // Handle Issue Penalty Submission
  const handleIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.teamId) {
      setFeedback({ type: "error", message: "Please select a team." });
      return;
    }
    if (!issueForm.reason.trim()) {
      setFeedback({ type: "error", message: "Please enter a justification reason for the penalty." });
      return;
    }

    startTransition(async () => {
      const res = await createTeamPenaltyAction({
        festivalId,
        teamId: issueForm.teamId,
        eventId: issueForm.eventId || null,
        ruleCode: "POST_EVENT_VIOLATION",
        reason: issueForm.reason.trim(),
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: "Team penalty (-10 PTS) successfully issued.",
        });
        setIsIssueModalOpen(false);
        setIssueForm({
          teamId: "",
          eventId: "",
          ruleCode: "POST_EVENT_VIOLATION",
          reason: "",
        });
        // Server component refresh
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to issue penalty.",
        });
      }
    });
  };

  // Handle Reverse Penalty Submission
  const handleReverseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingPenalty) return;
    if (!reversalReason.trim()) {
      setFeedback({ type: "error", message: "A reason is mandatory to reverse a penalty." });
      return;
    }

    startTransition(async () => {
      const res = await reverseTeamPenaltyAction({
        festivalId,
        penaltyId: reversingPenalty.id,
        reversalReason: reversalReason.trim(),
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: "Penalty successfully reversed. Restored points to team leaderboard.",
        });
        setReversingPenalty(null);
        setReversalReason("");
        // Server component refresh
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to reverse penalty.",
        });
      }
    });
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
          <span className="pegasus-eyebrow">ZENITHROW 2026 • STANDINGS & SANCTIONS</span>
          <h1 className="pegasus-page-title" style={{ margin: "4px 0" }}>
            Team Penalty Operations
          </h1>
          <p className="pegasus-page__description" style={{ margin: 0, maxWidth: "680px" }}>
            Issue and audit official house penalties. Deductions are dynamically aggregated
            at the championship level without corrupting raw event marks or sports talent metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFeedback(null);
            setIsIssueModalOpen(true);
          }}
          className="pegasus-button pegasus-button--primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontWeight: 700,
          }}
        >
          <span>⚖️</span>
          <span>Issue Regulation Penalty</span>
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
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div className="pegasus-card" style={{ padding: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Active Deductions
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "#ef4444", marginTop: "4px" }}>
            {telemetry.totalDeductions} <span style={{ fontSize: "14px", fontWeight: 700 }}>PTS</span>
          </div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Total points subtracted across teams
          </span>
        </div>

        <div className="pegasus-card" style={{ padding: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Active Penalties
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--foreground)", marginTop: "4px" }}>
            {telemetry.activeCount}
          </div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Currently enforced sanctions
          </span>
        </div>

        <div className="pegasus-card" style={{ padding: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Teams Affected
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--foreground)", marginTop: "4px" }}>
            {telemetry.uniqueTeamsAffected}
          </div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Houses with active penalties
          </span>
        </div>

        <div className="pegasus-card" style={{ padding: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Reversed Penalties
          </span>
          <div style={{ fontSize: "28px", fontWeight: 900, color: "var(--accent)", marginTop: "4px" }}>
            {telemetry.reversedCount}
          </div>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Restored via audit reversal
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
        <div style={{ flex: "1 1 240px" }}>
          <input
            type="text"
            placeholder="Search by team, event, or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pegasus-input"
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ flex: "0 1 180px" }}>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "reversed")
            }
            className="pegasus-select"
            style={{ width: "100%" }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Sanctions</option>
            <option value="reversed">Reversed Only</option>
          </select>
        </div>

        <div style={{ flex: "0 1 200px" }}>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="pegasus-select"
            style={{ width: "100%" }}
          >
            <option value="all">All Teams • Houses</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.code})
              </option>
            ))}
          </select>
        </div>

        {(searchQuery || statusFilter !== "all" || teamFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
              setTeamFilter("all");
            }}
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "13px", padding: "6px 12px" }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Penalties Records Table */}
      <div className="pegasus-card" style={{ padding: 0, overflow: "hidden" }}>
        {filteredPenalties.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>⚖️</span>
            <strong style={{ display: "block", fontSize: "16px", color: "var(--foreground)" }}>
              No penalty records found
            </strong>
            <p style={{ margin: "4px 0 0", fontSize: "13px" }}>
              {searchQuery || statusFilter !== "all" || teamFilter !== "all"
                ? "Try clearing your filters to view all records."
                : "No sanctions have been issued for this festival."}
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
                  <th style={{ padding: "12px 16px" }}>Status & Points</th>
                  <th style={{ padding: "12px 16px" }}>House • Team</th>
                  <th style={{ padding: "12px 16px" }}>Context • Event</th>
                  <th style={{ padding: "12px 16px" }}>Violation Reason</th>
                  <th style={{ padding: "12px 16px" }}>Issued Details</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPenalties.map((penalty) => {
                  const team = teamMap.get(penalty.teamId);
                  const event = penalty.eventId ? eventMap.get(penalty.eventId) : null;
                  const isReversed = penalty.isReversed;

                  return (
                    <tr
                      key={penalty.id}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        opacity: isReversed ? 0.65 : 1,
                        background: isReversed ? "rgba(0,0,0,0.1)" : "transparent",
                      }}
                    >
                      {/* Status & Points */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {isReversed ? (
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 800,
                                background: "rgba(148, 163, 184, 0.15)",
                                color: "#94a3b8",
                                border: "1px solid rgba(148, 163, 184, 0.3)",
                                textDecoration: "line-through",
                              }}
                            >
                              REVERSED
                            </span>
                          ) : (
                            <span
                              style={{
                                padding: "3px 8px",
                                borderRadius: "4px",
                                fontSize: "11px",
                                fontWeight: 800,
                                background: "rgba(239, 68, 68, 0.15)",
                                color: "#ef4444",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                              }}
                            >
                              {penalty.pointsDelta} PTS
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Team */}
                      <td style={{ padding: "14px 16px" }}>
                        <strong>{team ? team.name : penalty.teamId}</strong>
                        {team?.code && (
                          <span
                            style={{
                              marginLeft: "6px",
                              fontSize: "11px",
                              color: "var(--muted)",
                              background: "rgba(255, 255, 255, 0.06)",
                              padding: "2px 6px",
                              borderRadius: "3px",
                            }}
                          >
                            {team.code}
                          </span>
                        )}
                      </td>

                      {/* Context / Event */}
                      <td style={{ padding: "14px 16px" }}>
                        {event ? (
                          <span>{event.name}</span>
                        ) : (
                          <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
                            Festival Regulation
                          </span>
                        )}
                      </td>

                      {/* Reason */}
                      <td style={{ padding: "14px 16px", maxWidth: "280px" }}>
                        <div style={{ color: "var(--foreground)" }}>{penalty.reason}</div>
                        {isReversed && penalty.reversalReason && (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#eab308",
                              marginTop: "4px",
                              fontStyle: "italic",
                            }}
                          >
                            Reversal Note: {penalty.reversalReason}
                          </div>
                        )}
                      </td>

                      {/* Issued Details */}
                      <td style={{ padding: "14px 16px", fontSize: "12px", color: "var(--muted)" }}>
                        <div>{new Date(penalty.issuedAt).toLocaleDateString()}</div>
                        <div style={{ fontSize: "11px" }}>
                          {new Date(penalty.issuedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        {!isReversed ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFeedback(null);
                              setReversalReason("");
                              setReversingPenalty(penalty);
                            }}
                            className="pegasus-button pegasus-button--subtle"
                            style={{
                              padding: "4px 10px",
                              fontSize: "12px",
                              color: "#eab308",
                            }}
                          >
                            Reverse Sanction
                          </button>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            Restored
                          </span>
                        )}
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
      {/* ISSUE PENALTY MODAL */}
      {/* ============================================================ */}
      {isIssueModalOpen && (
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
                Issue Team Penalty
              </h3>
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
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

            <form onSubmit={handleIssueSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Team Select */}
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
                    Target House • Team *
                  </label>
                  <select
                    value={issueForm.teamId}
                    onChange={(e) => setIssueForm({ ...issueForm, teamId: e.target.value })}
                    required
                    className="pegasus-select"
                    style={{ width: "100%" }}
                  >
                    <option value="">Select Team...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Event Select (Optional) */}
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
                    Associated Event (Optional)
                  </label>
                  <select
                    value={issueForm.eventId}
                    onChange={(e) => setIssueForm({ ...issueForm, eventId: e.target.value })}
                    className="pegasus-select"
                    style={{ width: "100%" }}
                  >
                    <option value="">General Festival Violation (No specific event)</option>
                    {events.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Regulation Rule Dropdown */}
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
                    Codex Regulation Rule *
                  </label>
                  <select
                    value={issueForm.ruleCode}
                    disabled
                    className="pegasus-select"
                    style={{ width: "100%", background: "rgba(255, 255, 255, 0.04)" }}
                  >
                    <option value="POST_EVENT_VIOLATION">
                      Post-event rule violation (-10 points)
                    </option>
                  </select>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      display: "block",
                      marginTop: "4px",
                    }}
                  >
                    Standard ZENITHROW regulation sanction deducted at the championship level.
                  </span>
                </div>

                {/* Violation Reason / Details */}
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
                    Violation Reason & Justification *
                  </label>
                  <textarea
                    value={issueForm.reason}
                    onChange={(e) => setIssueForm({ ...issueForm, reason: e.target.value })}
                    placeholder="Describe the regulation breach, incident time, or steward report details..."
                    required
                    rows={4}
                    className="pegasus-input"
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </div>

                {/* Info Note */}
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "6px",
                    padding: "12px",
                    fontSize: "12px",
                    color: "var(--muted)",
                  }}
                >
                  <strong style={{ color: "#ef4444", display: "block", marginBottom: "2px" }}>
                    Sanction Notice
                  </strong>
                  Submitting this will deduct <strong>10 points</strong> from the selected house on the
                  official leaderboard. Event results and individual athlete marks will remain untouched.
                </div>

                {/* Form Buttons */}
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
                    onClick={() => setIsIssueModalOpen(false)}
                    disabled={isPending}
                    className="pegasus-button pegasus-button--subtle"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="pegasus-button pegasus-button--primary"
                    style={{ background: "#ef4444", borderColor: "#ef4444" }}
                  >
                    {isPending ? "Applying Sanction..." : "Confirm & Issue (-10 PTS)"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* REVERSE PENALTY MODAL */}
      {/* ============================================================ */}
      {reversingPenalty && (
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
              maxWidth: "480px",
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
                Reverse Team Penalty
              </h3>
              <button
                type="button"
                onClick={() => setReversingPenalty(null)}
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

            <form onSubmit={handleReverseSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    padding: "12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ marginBottom: "4px" }}>
                    <span style={{ color: "var(--muted)" }}>House: </span>
                    <strong>
                      {teamMap.get(reversingPenalty.teamId)?.name || reversingPenalty.teamId}
                    </strong>
                  </div>
                  <div style={{ marginBottom: "4px" }}>
                    <span style={{ color: "var(--muted)" }}>Original Penalty: </span>
                    <strong style={{ color: "#ef4444" }}>{reversingPenalty.pointsDelta} PTS</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Reason: </span>
                    <span>{reversingPenalty.reason}</span>
                  </div>
                </div>

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
                    Reversal Justification *
                  </label>
                  <textarea
                    value={reversalReason}
                    onChange={(e) => setReversalReason(e.target.value)}
                    placeholder="Provide reason for reversing sanction (e.g., appeal upheld, steward review)..."
                    required
                    rows={3}
                    className="pegasus-input"
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </div>

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
                    onClick={() => setReversingPenalty(null)}
                    disabled={isPending}
                    className="pegasus-button pegasus-button--subtle"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="pegasus-button pegasus-button--primary"
                    style={{ background: "#eab308", borderColor: "#eab308", color: "#000" }}
                  >
                    {isPending ? "Reversing..." : "Confirm Reversal (+10 PTS)"}
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
