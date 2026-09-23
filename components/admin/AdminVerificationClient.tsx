"use client";

import { useState, useTransition } from "react";
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

  const eventMap = new Map(events.map((e) => [e.id, e]));
  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const submittedResults = results.filter((r) => r.status === "submitted");
  const verifiedResults = results.filter((r) => r.status === "verified");

  const displayedResults =
    activeTab === "submitted"
      ? submittedResults
      : activeTab === "verified"
        ? verifiedResults
        : results;

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
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Feedback Banner */}
      {feedback && (
        <div
          className="pegasus-animate-fade"
          style={{
            padding: "12px 18px",
            borderRadius: "6px",
            border: `1px solid ${
              feedback.type === "success"
                ? "rgba(215, 255, 63, 0.4)"
                : "rgba(255, 80, 80, 0.4)"
            }`,
            background:
              feedback.type === "success"
                ? "rgba(215, 255, 63, 0.08)"
                : "rgba(255, 80, 80, 0.08)",
            color:
              feedback.type === "success"
                ? "var(--accent)"
                : "var(--status-dns)",
            fontSize: "13px",
            fontWeight: 650,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
              fontWeight: "bold",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Navigation / Publishing Link */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            type="button"
            className={`pegasus-button ${
              activeTab === "submitted"
                ? "pegasus-button--primary"
                : "pegasus-button--subtle"
            }`}
            onClick={() => setActiveTab("submitted")}
            style={{ fontSize: "12px", minHeight: "36px" }}
          >
            Awaiting Verification ({submittedResults.length})
          </button>
          <button
            type="button"
            className={`pegasus-button ${
              activeTab === "verified"
                ? "pegasus-button--primary"
                : "pegasus-button--subtle"
            }`}
            onClick={() => setActiveTab("verified")}
            style={{ fontSize: "12px", minHeight: "36px" }}
          >
            Verified Queue ({verifiedResults.length})
          </button>
          <button
            type="button"
            className={`pegasus-button ${
              activeTab === "all"
                ? "pegasus-button--primary"
                : "pegasus-button--subtle"
            }`}
            onClick={() => setActiveTab("all")}
            style={{ fontSize: "12px", minHeight: "36px" }}
          >
            All Stages ({results.length})
          </button>
        </div>

        <Link
          href="/admin/publish"
          className="pegasus-button pegasus-button--secondary"
          style={{ fontSize: "12px", minHeight: "36px" }}
        >
          Go to Publishing Surface <span>→</span>
        </Link>
      </div>

      {/* Main Results Queue */}
      <section
        className="pegasus-card"
        style={{
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
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
            <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
              {activeTab === "submitted"
                ? `Results Requiring Admin Attention (${submittedResults.length})`
                : activeTab === "verified"
                  ? `Verified Results (${verifiedResults.length})`
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
                ? "Referee-submitted results waiting for Chief Scorer audit and sign-off."
                : "Audited results with verified provenance ready for release."}
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
            No results in this queue. All submitted records are up to date.
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
                    background: "var(--surface)",
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
                      <strong style={{ fontSize: "15px" }}>
                        {event?.name ?? "Event"}
                      </strong>
                      {event?.code && (
                        <span
                          style={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: "var(--muted)",
                            background: "rgba(255, 255, 255, 0.04)",
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
                            padding: "6px 14px",
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
                      <strong>
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
                      }}
                    >
                      {result.rank && (
                        <span>
                          Rank: <strong>#{result.rank}</strong>
                        </span>
                      )}
                      {performanceText && (
                        <span>
                          Mark: <strong>{performanceText}</strong>
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
                        Verified: <strong>Audited by Admin</strong>
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
          className="pegasus-admin-drawer-backdrop is-open"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              maxWidth: "480px",
              width: "100%",
              padding: "28px",
              background: "var(--surface)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.8)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  fontSize: "18px",
                  color: "var(--accent)",
                }}
              >
                ⚖️
              </span>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                Confirm Official Verification
              </h3>
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
              this outcome will advance to the Publishing Surface for final
              release.
            </p>

            <div
              style={{
                padding: "12px 16px",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span>
                Event:{" "}
                <strong>
                  {eventMap.get(selectedResult.event_id)?.name ?? "Event"}
                </strong>
              </span>
              <span>
                Competitor:{" "}
                <strong>
                  {participantMap.get(selectedResult.participant_id ?? "")
                    ?.name ??
                    teamMap.get(selectedResult.team_id ?? "")?.name ??
                    "Competitor"}
                </strong>
              </span>
              <span>
                Awarded Points: <strong>+{selectedResult.points} pts</strong>
              </span>
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

