"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { publishResultAction } from "@/app/admin/actions";
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

interface AdminPublishClientProps {
  initialResults: ResultRow[];
  events: EventRow[];
  participants: ParticipantRow[];
  teams: TeamRow[];
}

export default function AdminPublishClient({
  initialResults,
  events,
  participants,
  teams,
}: AdminPublishClientProps) {
  const [results, setResults] = useState<ResultRow[]>(initialResults);
  const [selectedResult, setSelectedResult] = useState<ResultRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const eventMap = new Map(events.map((e) => [e.id, e]));
  const participantMap = new Map(participants.map((p) => [p.id, p]));
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const awaitingPublication = results.filter((r) => r.status === "verified");
  const publishedResults = results.filter((r) => r.status === "published");

  const handlePublish = (result: ResultRow) => {
    setSelectedResult(result);
  };

  const confirmPublish = () => {
    if (!selectedResult) return;

    setFeedback(null);
    startTransition(async () => {
      const res = await publishResultAction(selectedResult.id);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Result #${selectedResult.id.slice(0, 8)} published! It is now live in public standings and championship points.`,
        });
        setResults((prev) =>
          prev.map((r) =>
            r.id === selectedResult.id
              ? {
                  ...r,
                  status: "published" as ResultStatus,
                  published_at: new Date().toISOString(),
                  is_official: true,
                }
              : r,
          ),
        );
        setSelectedResult(null);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to publish result.",
        });
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
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

      {/* Navigation Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <Link
          href="/admin/verification"
          className="pegasus-button pegasus-button--subtle"
          style={{ fontSize: "12px", minHeight: "36px" }}
        >
          <span>←</span> Return to Verification Queue
        </Link>

        <Link
          href="/results"
          className="pegasus-button pegasus-button--secondary"
          style={{ fontSize: "12px", minHeight: "36px" }}
        >
          Inspect Public Results Portal <span>↗</span>
        </Link>
      </div>

      {/* Section 1: Awaiting Publication Queue */}
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
            alignItems: "flex-start",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "14px",
            flexWrap: "wrap",
            gap: "12px",
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
                PENDING OFFICIAL RELEASE
              </span>
              <span className="pegasus-status pegasus-status--live">
                <span className="pegasus-status__dot" />
                {awaitingPublication.length}{" "}
                {awaitingPublication.length === 1 ? "Result" : "Results"}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
              Results Awaiting Publication
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                color: "var(--muted)",
              }}
            >
              Audited and verified by referees; ready for final festival release.
            </p>
          </div>
        </div>

        {awaitingPublication.length === 0 ? (
          <div
            style={{
              padding: "36px 24px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "13px",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "8px",
              border: "1px dashed var(--border)",
            }}
          >
            No verified results currently awaiting publication. All verified
            records are up to date.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {awaitingPublication.map((result) => {
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
                      <span className="pegasus-status pegasus-status--live">
                        <span className="pegasus-status__dot" />
                        Verified
                      </span>

                      <button
                        type="button"
                        onClick={() => handlePublish(result)}
                        className="pegasus-button pegasus-button--primary"
                        style={{
                          fontSize: "12px",
                          padding: "6px 14px",
                          minHeight: "34px",
                        }}
                        disabled={isPending}
                      >
                        Publish Live <span>↗</span>
                      </button>
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
                      Audited by: <strong>Chief Scorer & Referee</strong>
                    </span>
                    <span>
                      Status: <strong>Ready for Public Display</strong>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 2: Active Published Results */}
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
            alignItems: "flex-start",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "14px",
            flexWrap: "wrap",
            gap: "12px",
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
                ACTIVE PUBLIC STANDINGS
              </span>
              <span
                className={`pegasus-status ${getResultStatusBadgeClass(
                  "published",
                )}`}
              >
                <span className="pegasus-status__dot" />
                {publishedResults.length}{" "}
                {publishedResults.length === 1 ? "Result" : "Results"}
              </span>
            </div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
              Currently Published Results
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                color: "var(--muted)",
              }}
            >
              Live records actively visible on public results pages and
              awarding championship points.
            </p>
          </div>
        </div>

        {publishedResults.length === 0 ? (
          <div
            style={{
              padding: "36px 24px",
              textAlign: "center",
              color: "var(--muted)",
              fontSize: "13px",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "8px",
              border: "1px dashed var(--border)",
            }}
          >
            No results published to the live public portal yet.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {publishedResults.map((result) => {
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
                    gap: "10px",
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
                    </div>

                    <span
                      className={`pegasus-status ${getResultStatusBadgeClass(
                        result.status,
                      )}`}
                    >
                      <span className="pegasus-status__dot" />
                      {getResultStatusLabel(result.status)}
                    </span>
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
                    <span>
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
                    </span>

                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        alignItems: "center",
                      }}
                    >
                      {result.rank && (
                        <span>
                          Position: <strong>#{result.rank}</strong>
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
                        }}
                      >
                        +{result.points} pts
                      </span>
                    </div>
                  </div>

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
                    {result.published_at && (
                      <span>
                        Published:{" "}
                        <strong>
                          {new Date(result.published_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                      </span>
                    )}
                    <span>
                      Official Standing: <strong>Active in Leaderboard</strong>
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Publication Confirmation Modal */}
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
                📢
              </span>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                Confirm Official Public Release
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
              Publishing will make Result{" "}
              <strong>#{selectedResult.id.slice(0, 8)}</strong> immediately
              accessible to the public on the Festival Results page and award{" "}
              <strong>+{selectedResult.points} points</strong> to the team
              standings.
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
                Accrued Points: <strong>+{selectedResult.points} pts</strong>
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
                onClick={confirmPublish}
                disabled={isPending}
              >
                {isPending ? "Publishing..." : "Confirm & Publish Live"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

