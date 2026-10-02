"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { verifyResultAction } from "@/app/admin/actions";
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
import type { Performance, ResultStatus } from "@/lib/types";

interface AdminVerificationClientProps {
  initialResults: ResultRow[];
  events: EventRow[];
  participants: ParticipantRow[];
  teams: TeamRow[];
}

export default function AdminVerificationClient({
  initialResults,
  events,
  participants,
  teams,
}: AdminVerificationClientProps) {
  const [results, setResults] = useState<ResultRow[]>(initialResults);
  const [selectedResult, setSelectedResult] = useState<ResultRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"submitted" | "verified" | "all">(
    "submitted",
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const participantMap = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const submittedResults = useMemo(
    () => results.filter((r) => r.status === "submitted"),
    [results],
  );
  const verifiedResults = useMemo(
    () => results.filter((r) => r.status === "verified"),
    [results],
  );

  // Telemetry metrics
  const telemetry = useMemo(() => {
    const totalCount = results.length;
    const awaitingAudit = submittedResults.length;
    const verifiedCount = verifiedResults.length;
    const publishedCount = results.filter((r) => r.status === "published").length;
    const correctedCount = results.filter((r) => r.status === "corrected").length;

    return {
      totalCount,
      awaitingAudit,
      verifiedCount,
      publishedCount,
      correctedCount,
    };
  }, [results, submittedResults, verifiedResults]);

  // Tab-selected candidates
  const tabResults = useMemo(() => {
    if (activeTab === "submitted") return submittedResults;
    if (activeTab === "verified") return verifiedResults;
    return results;
  }, [activeTab, submittedResults, verifiedResults, results]);

  // Filtered results
  const displayedResults = useMemo(() => {
    return tabResults.filter((result) => {
      // 1. Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.trim().toLowerCase();
        const event = eventMap.get(result.event_id);
        const participant = result.participant_id ? participantMap.get(result.participant_id) : undefined;
        const team = result.team_id
          ? teamMap.get(result.team_id)
          : participant?.team_id
            ? teamMap.get(participant.team_id)
            : undefined;

        const eventName = (event?.name || "").toLowerCase();
        const eventCode = (event?.code || "").toLowerCase();
        const partName = (participant?.name || "").toLowerCase();
        const chestNo = (participant?.chest_number || "").toLowerCase();
        const teamName = (team?.name || "").toLowerCase();
        const teamCode = (team?.code || "").toLowerCase();
        const resId = result.id.toLowerCase();

        if (
          !eventName.includes(q) &&
          !eventCode.includes(q) &&
          !partName.includes(q) &&
          !chestNo.includes(q) &&
          !teamName.includes(q) &&
          !teamCode.includes(q) &&
          !resId.includes(q)
        ) {
          return false;
        }
      }

      // 2. Event filter
      if (eventFilter !== "all" && result.event_id !== eventFilter) {
        return false;
      }

      // 3. Team filter
      if (teamFilter !== "all") {
        const participant = result.participant_id ? participantMap.get(result.participant_id) : undefined;
        const effectiveTeamId = result.team_id || participant?.team_id;
        if (effectiveTeamId !== teamFilter) {
          return false;
        }
      }

      return true;
    });
  }, [tabResults, searchQuery, eventFilter, teamFilter, eventMap, participantMap, teamMap]);

  const isFiltering = searchQuery.trim() !== "" || eventFilter !== "all" || teamFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setEventFilter("all");
    setTeamFilter("all");
  };

  const handleVerify = (result: ResultRow) => {
    setSelectedResult(result);
  };

  const confirmVerify = () => {
    if (!selectedResult) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await verifyResultAction(selectedResult.id);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Result #${selectedResult.id.slice(0, 8)} successfully verified and queued for publication.`,
        });
        // Optimistically update local state
        setResults((prev) =>
          prev.map((r) =>
            r.id === selectedResult.id
              ? { ...r, status: "verified" as ResultStatus }
              : r,
          ),
        );
        setSelectedResult(null);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to verify result.",
        });
      }
    });
  };

  return (
    <div className="pegasus-animate-fade" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Feedback Banner */}
      {feedback && (
        <div
          className="pegasus-animate-fade"
          style={{
            padding: "12px 18px",
            borderRadius: "6px",
            border: `1px solid ${
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.35)"
                : "rgba(239, 68, 68, 0.35)"
            }`,
            background:
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.1)"
                : "rgba(239, 68, 68, 0.1)",
            color:
              feedback.type === "success"
                ? "var(--success, #10b981)"
                : "var(--destructive, #ef4444)",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span>{feedback.type === "success" ? "✓" : "⚠"}</span>
            <strong>{feedback.message}</strong>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{
              background: "none",
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

      {/* Telemetry Metrics Bar */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
        }}
      >
        {[
          { label: "Total Outcomes", value: telemetry.totalCount },
          {
            label: "Awaiting Audit",
            value: telemetry.awaitingAudit,
            color: telemetry.awaitingAudit > 0 ? "var(--accent)" : "var(--muted)",
          },
          { label: "Verified Queue", value: telemetry.verifiedCount, color: "var(--success, #10b981)" },
          { label: "Released • Public", value: telemetry.publishedCount, color: "#2563eb" },
          {
            label: "Corrected Marks",
            value: telemetry.correctedCount,
            color: telemetry.correctedCount > 0 ? "var(--warning, #f59e0b)" : "var(--muted)",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="pegasus-card"
            style={{
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {item.label}
            </span>
            <strong
              style={{
                fontSize: "22px",
                fontWeight: 850,
                lineHeight: 1.1,
                color: item.color,
              }}
            >
              {item.value}
            </strong>
          </div>
        ))}
      </section>

      {/* Navigation Tabs and Destination Link */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className={`pegasus-button ${
              activeTab === "submitted"
                ? "pegasus-button--primary"
                : "pegasus-button--secondary"
            }`}
            onClick={() => setActiveTab("submitted")}
            style={{ fontSize: "12px", minHeight: "38px" }}
          >
            Awaiting Verification ({submittedResults.length})
          </button>
          <button
            type="button"
            className={`pegasus-button ${
              activeTab === "verified"
                ? "pegasus-button--primary"
                : "pegasus-button--secondary"
            }`}
            onClick={() => setActiveTab("verified")}
            style={{ fontSize: "12px", minHeight: "38px" }}
          >
            Verified Queue ({verifiedResults.length})
          </button>
          <button
            type="button"
            className={`pegasus-button ${
              activeTab === "all"
                ? "pegasus-button--primary"
                : "pegasus-button--secondary"
            }`}
            onClick={() => setActiveTab("all")}
            style={{ fontSize: "12px", minHeight: "38px" }}
          >
            All Lifecycle ({results.length})
          </button>
        </div>

        <Link
          href="/admin/publish"
          className="pegasus-button pegasus-button--secondary"
          style={{ fontSize: "12px", minHeight: "38px", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          Go to Publishing Surface <span>→</span>
        </Link>
      </div>

      {/* Search and Filters Bar */}
      <section className="pegasus-admin-filter-bar">
        <div style={{ flex: "1 1 200px", minWidth: "180px" }}>
          <input
            type="text"
            className="pegasus-admin-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search competitor, chest #, or event..."
            style={{ width: "100%", boxSizing: "border-box" }}
            aria-label="Search verification queue"
          />
        </div>

        {events.length > 0 && (
          <div style={{ minWidth: "160px" }}>
            <select
              className="pegasus-admin-select"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              aria-label="Filter by Event"
              style={{ width: "100%" }}
            >
              <option value="all">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {teams.length > 0 && (
          <div style={{ minWidth: "140px" }}>
            <select
              className="pegasus-admin-select"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              aria-label="Filter by House"
              style={{ width: "100%" }}
            >
              <option value="all">All Houses</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {isFiltering && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "12px", height: "38px", padding: "0 14px" }}
          >
            ✕ Clear Filters
          </button>
        )}
      </section>

      {/* Main Results Queue */}
      <section
        className="pegasus-card"
        style={{
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "14px",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
              {activeTab === "submitted"
                ? `Results Requiring Admin Attention (${submittedResults.length})`
                : activeTab === "verified"
                  ? `Verified Results Ready for Release (${verifiedResults.length})`
                  : `Master Lifecycle Queue (${results.length})`}
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                color: "var(--muted)",
              }}
            >
              {activeTab === "submitted"
                ? "Referee-submitted results waiting for Chief Scorer audit and official sign-off."
                : "Audited results with verified provenance ready to advance to the publishing surface."}
            </p>
          </div>
        </div>

        {displayedResults.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "14px",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "8px",
              border: "1px dashed var(--border)",
            }}
          >
            {isFiltering
              ? "No outcomes match your search and filter criteria."
              : activeTab === "submitted"
                ? "No pending marks in this queue. All submitted results have been audited."
                : "No results currently in this queue."}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {displayedResults.map((result) => {
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
                <article
                  key={result.id}
                  className="pegasus-card"
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    background: "rgba(18, 20, 24, 0.9)",
                    borderLeft: result.status === "submitted" ? "4px solid var(--accent)" : "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
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
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontSize: "12px",
                          color: "var(--accent)",
                          fontWeight: 700,
                        }}
                      >
                        #{result.id.slice(0, 8)}
                      </span>
                      <strong style={{ fontSize: "15px", color: "var(--foreground)" }}>
                        {event?.name ?? "Event Slot"}
                      </strong>
                      {event?.code && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: "var(--muted)",
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid var(--border)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                          }}
                        >
                          {event.code}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span
                        className={`pegasus-status ${getResultStatusBadgeClass(
                          result.status,
                        )}`}
                      >
                        <span className="pegasus-status__dot" />
                        {getResultStatusLabel(result.status)}
                      </span>

                      {/* Verify Action Button (only if currently submitted) */}
                      {result.status === "submitted" && (
                        <button
                          type="button"
                          onClick={() => handleVerify(result)}
                          className="pegasus-button pegasus-button--primary"
                          style={{
                            fontSize: "12px",
                            padding: "7px 16px",
                            minHeight: "34px",
                          }}
                          disabled={isPending}
                        >
                          Verify Mark <span>✓</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                      fontSize: "13px",
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--foreground)" }}>
                        {participant?.name ?? team?.name ?? "Competitor"}
                      </strong>
                      {participant && (
                        <span
                          style={{
                            color: "var(--muted)",
                            marginLeft: "8px",
                          }}
                        >
                          ({team?.name ?? "Team"} • Chest #{participant.chest_number || "—"})
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      {result.rank && (
                        <span>
                          Rank: <strong style={{ color: "var(--foreground)" }}>#{result.rank}</strong>
                        </span>
                      )}
                      {performanceText && (
                        <span>
                          Mark: <strong style={{ color: "var(--foreground)" }}>{performanceText}</strong>
                        </span>
                      )}
                      <span
                        style={{
                          color: "var(--accent)",
                          fontWeight: 800,
                          fontSize: "14px",
                        }}
                      >
                        +{result.points} pts
                      </span>
                    </div>
                  </div>

                  {/* Provenance Footer */}
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      flexWrap: "wrap",
                      fontSize: "11px",
                      color: "var(--muted)",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "8px",
                    }}
                  >
                    <span>
                      Submitted:{" "}
                      <strong>
                        {new Date(result.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                    </span>
                    {result.verified_by && (
                      <span>
                        Verified: <strong>Audited by Desk</strong>
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Verification Confirmation Modal */}
      {selectedResult && (
        <div
          className="pegasus-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setSelectedResult(null);
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              maxWidth: "480px",
              width: "100%",
              padding: "26px",
              background: "#121418",
              border: "1px solid var(--border)",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.7)",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p className="pegasus-eyebrow" style={{ margin: 0 }}>
                  CHIEF SCORER AUDIT
                </p>
                <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800, color: "var(--foreground)" }}>
                  Confirm Official Verification
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                disabled={isPending}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <p
              style={{
                margin: 0,
                fontSize: "13px",
                color: "var(--muted)",
                lineHeight: 1.6,
              }}
            >
              You are officially verifying Result{" "}
              <strong>#{selectedResult.id.slice(0, 8)}</strong> with{" "}
              <strong>+{selectedResult.points} points</strong>. Once verified,
              this outcome will advance to the Publishing Surface for release.
            </p>

            <div
              style={{
                padding: "12px 16px",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              <div>
                <span style={{ color: "var(--muted)" }}>Event: </span>
                <strong style={{ color: "var(--foreground)" }}>
                  {eventMap.get(selectedResult.event_id)?.name ?? "Event"}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Competitor: </span>
                <strong style={{ color: "var(--foreground)" }}>
                  {participantMap.get(selectedResult.participant_id ?? "")?.name ??
                    teamMap.get(selectedResult.team_id ?? "")?.name ??
                    "Competitor"}
                </strong>
              </div>
              <div>
                <span style={{ color: "var(--muted)" }}>Awarded Points: </span>
                <strong style={{ color: "var(--accent)" }}>+{selectedResult.points} pts</strong>
              </div>
            </div>

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
                className="pegasus-button pegasus-button--subtle"
                onClick={() => setSelectedResult(null)}
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pegasus-button pegasus-button--primary"
                onClick={confirmVerify}
                disabled={isPending}
              >
                {isPending ? "Verifying..." : "Confirm & Verify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
