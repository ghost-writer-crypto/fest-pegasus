"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  CompetitionRow,
} from "@/lib/repositories";
import type { Performance, ResultDisposition, ResultStatus } from "@/lib/types";
import { getSafeEventPoints } from "@/lib/competition";
import {
  adminCreateResultAction,
  adminCorrectResultAction,
  verifyResultAction,
  publishResultAction,
} from "@/app/admin/actions";

interface AdminResultsClientProps {
  initialResults: ResultRow[];
  events: EventRow[];
  participants: ParticipantRow[];
  teams: TeamRow[];
  competitions?: CompetitionRow[];
  festivalId?: string;
}

export default function AdminResultsClient({
  initialResults,
  events,
  participants,
  teams,
  competitions = [],
  festivalId = "",
}: AdminResultsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");

  // Feedback State
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals State
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isCorrectModalOpen, setIsCorrectModalOpen] = useState(false);
  const [selectedResultToCorrect, setSelectedResultToCorrect] = useState<ResultRow | null>(null);

  // In-flight row action tracking
  const [activeRowActionId, setActiveRowActionId] = useState<string | null>(null);

  // Form State: Direct Entry
  const [entryEventId, setEntryEventId] = useState<string>(events[0]?.id || "");
  const [entryCompetitionId, setEntryCompetitionId] = useState<string>("");
  const [entryTargetType, setEntryTargetType] = useState<"participant" | "team">("participant");
  const [entryParticipantId, setEntryParticipantId] = useState<string>("");
  const [entryTeamId, setEntryTeamId] = useState<string>("");
  const [entryRank, setEntryRank] = useState<string>("1");
  const [entryMarkValue, setEntryMarkValue] = useState<string>("");
  const [entryMarkMetric, setEntryMarkMetric] = useState<"time" | "distance" | "score" | "reps" | "raw">("time");
  const [entryDisposition, setEntryDisposition] = useState<ResultDisposition>("normal");
  const [entryPoints, setEntryPoints] = useState<string>("10");
  const [entryStatus, setEntryStatus] = useState<ResultStatus>("submitted");
  const [entryNotes, setEntryNotes] = useState<string>("");

  // Form State: Correction
  const [correctRank, setCorrectRank] = useState<string>("");
  const [correctMarkValue, setCorrectMarkValue] = useState<string>("");
  const [correctMarkMetric, setCorrectMarkMetric] = useState<"time" | "distance" | "score" | "reps" | "raw">("raw");
  const [correctDisposition, setCorrectDisposition] = useState<ResultDisposition>("normal");
  const [correctPoints, setCorrectPoints] = useState<string>("");
  const [correctTargetStatus, setCorrectTargetStatus] = useState<"corrected" | "verified" | "published">("corrected");
  const [correctReason, setCorrectReason] = useState<string>("");

  // Mappings
  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const participantMap = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants]);
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  // Metrics
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
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (eventFilter !== "all" && r.event_id !== eventFilter) return false;

      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const event = eventMap.get(r.event_id);
        const participant = r.participant_id ? participantMap.get(r.participant_id) : undefined;
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

        if (!matchesId && !matchesEvent && !matchesParticipant && !matchesTeam) {
          return false;
        }
      }

      return true;
    });
  }, [initialResults, statusFilter, eventFilter, searchQuery, eventMap, participantMap, teamMap]);

  // Auto-calculate points on entry rank or event change
  const handleEntryRankOrEventChange = (eventId: string, rankStr: string, disp: ResultDisposition) => {
    if (disp !== "normal") {
      setEntryPoints("0");
      return;
    }
    const numRank = parseInt(rankStr, 10);
    if (!isNaN(numRank) && numRank > 0) {
      const calculated = getSafeEventPoints(eventId, numRank);
      if (calculated !== null) {
        setEntryPoints(String(calculated));
      }
    }
  };

  // Open Direct Entry Modal
  const handleOpenEntryModal = () => {
    setFeedback(null);
    const firstEventId = events[0]?.id || "";
    setEntryEventId(firstEventId);
    setEntryCompetitionId("");
    setEntryTargetType("participant");
    setEntryParticipantId(participants[0]?.id || "");
    setEntryTeamId(teams[0]?.id || "");
    setEntryRank("1");
    setEntryMarkValue("");
    setEntryMarkMetric("time");
    setEntryDisposition("normal");
    setEntryStatus("submitted");
    setEntryNotes("");

    const initialCalc = getSafeEventPoints(firstEventId, 1);
    setEntryPoints(initialCalc !== null ? String(initialCalc) : "10");
    setIsEntryModalOpen(true);
  };

  // Open Correction Modal
  const handleOpenCorrectModal = (result: ResultRow) => {
    setFeedback(null);
    setSelectedResultToCorrect(result);
    setCorrectRank(result.rank ? String(result.rank) : "");
    setCorrectDisposition(result.disposition || "normal");
    setCorrectPoints(String(result.points || 0));

    // Determine performance raw/value
    const perf = result.performance as Record<string, unknown> | null;
    if (perf) {
      if (typeof perf.timeMs === "number") {
        setCorrectMarkValue(String((perf.timeMs / 1000).toFixed(2)));
        setCorrectMarkMetric("time");
      } else if (typeof perf.distanceM === "number") {
        setCorrectMarkValue(String(perf.distanceM));
        setCorrectMarkMetric("distance");
      } else if (perf.score !== undefined) {
        setCorrectMarkValue(String(perf.score));
        setCorrectMarkMetric("score");
      } else if (perf.raw) {
        setCorrectMarkValue(String(perf.raw));
        setCorrectMarkMetric("raw");
      } else {
        setCorrectMarkValue("");
        setCorrectMarkMetric("raw");
      }
    } else {
      setCorrectMarkValue("");
      setCorrectMarkMetric("raw");
    }

    setCorrectTargetStatus(result.status === "published" ? "published" : result.status === "verified" ? "verified" : "corrected");
    setCorrectReason("");
    setIsCorrectModalOpen(true);
  };

  // Helper to build structured performance payload
  const buildPerformancePayload = (val: string, metric: "time" | "distance" | "score" | "reps" | "raw") => {
    const trimmed = val.trim();
    if (!trimmed) return {};
    if (metric === "time") {
      const parsedSec = parseFloat(trimmed);
      return !isNaN(parsedSec)
        ? { timeMs: Math.round(parsedSec * 1000), raw: `${parsedSec}s` }
        : { raw: trimmed };
    }
    if (metric === "distance") {
      const parsedM = parseFloat(trimmed);
      return !isNaN(parsedM) ? { distanceM: parsedM, raw: `${parsedM}m` } : { raw: trimmed };
    }
    if (metric === "score") {
      const parsedScore = parseFloat(trimmed);
      return !isNaN(parsedScore) ? { score: parsedScore, raw: trimmed } : { score: trimmed, raw: trimmed };
    }
    if (metric === "reps") {
      const parsedReps = parseInt(trimmed, 10);
      return !isNaN(parsedReps) ? { reps: parsedReps, raw: `${parsedReps} reps` } : { raw: trimmed };
    }
    return { raw: trimmed };
  };

  // Submit Direct Result Entry
  const handleSaveDirectResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryEventId) {
      setFeedback({ type: "error", message: "Please select a competition event." });
      return;
    }
    if (entryTargetType === "participant" && !entryParticipantId) {
      setFeedback({ type: "error", message: "Please select an athlete/participant." });
      return;
    }
    if (entryTargetType === "team" && !entryTeamId) {
      setFeedback({ type: "error", message: "Please select a team." });
      return;
    }

    startTransition(async () => {
      const performancePayload = buildPerformancePayload(entryMarkValue, entryMarkMetric);
      const parsedRank = entryRank.trim() ? parseInt(entryRank.trim(), 10) : null;
      const parsedPoints = entryPoints.trim() ? parseInt(entryPoints.trim(), 10) : 0;

      const res = await adminCreateResultAction({
        festivalId: festivalId || initialResults[0]?.festival_id || "",
        eventId: entryEventId,
        competitionId: entryCompetitionId || null,
        participantId: entryTargetType === "participant" ? entryParticipantId : null,
        teamId: entryTargetType === "team" ? entryTeamId : null,
        rank: !isNaN(Number(parsedRank)) ? parsedRank : null,
        points: !isNaN(Number(parsedPoints)) ? parsedPoints : 0,
        performance: performancePayload,
        disposition: entryDisposition,
        status: entryStatus,
        notes: entryNotes,
      });

      if (res.success) {
        setIsEntryModalOpen(false);
        setFeedback({
          type: "success",
          message: `Result successfully recorded with status: ${getResultStatusLabel(entryStatus)}.`,
        });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to record result." });
      }
    });
  };

  // Submit Result Correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResultToCorrect) return;

    if (!correctReason.trim()) {
      setFeedback({ type: "error", message: "A formal correction reason is mandatory for the audit log." });
      return;
    }

    startTransition(async () => {
      const performancePayload = buildPerformancePayload(correctMarkValue, correctMarkMetric);
      const parsedRank = correctRank.trim() ? parseInt(correctRank.trim(), 10) : null;
      const parsedPoints = correctPoints.trim() ? parseInt(correctPoints.trim(), 10) : 0;

      const res = await adminCorrectResultAction({
        resultId: selectedResultToCorrect.id,
        reason: correctReason.trim(),
        rank: !isNaN(Number(parsedRank)) ? parsedRank : null,
        points: !isNaN(Number(parsedPoints)) ? parsedPoints : 0,
        performance: performancePayload,
        disposition: correctDisposition,
        targetStatus: correctTargetStatus,
      });

      if (res.success) {
        setIsCorrectModalOpen(false);
        setSelectedResultToCorrect(null);
        setFeedback({
          type: "success",
          message: `Result #${selectedResultToCorrect.id.slice(0, 8)} successfully corrected and audited.`,
        });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to apply result correction." });
      }
    });
  };

  // Quick Direct Row Actions
  const handleVerifyRow = async (resultId: string) => {
    setActiveRowActionId(resultId);
    setFeedback(null);
    startTransition(async () => {
      const res = await verifyResultAction(resultId);
      setActiveRowActionId(null);
      if (res.success) {
        setFeedback({ type: "success", message: `Result #${resultId.slice(0, 8)} verified successfully.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Verification failed." });
      }
    });
  };

  const handlePublishRow = async (resultId: string) => {
    setActiveRowActionId(resultId);
    setFeedback(null);
    startTransition(async () => {
      const res = await publishResultAction(resultId);
      setActiveRowActionId(null);
      if (res.success) {
        setFeedback({ type: "success", message: `Result #${resultId.slice(0, 8)} published live to official leaderboard.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Publication failed." });
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`pegasus-callout pegasus-callout--${feedback.type === "success" ? "info" : "danger"}`}
          style={{
            padding: "12px 18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderRadius: "10px",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 600 }}>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontWeight: 800 }}
          >
            ✕
          </button>
        </div>
      )}

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
          <span style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>
            Total Marks
          </span>
          <strong style={{ fontSize: "28px", fontFamily: "monospace", color: "var(--foreground)" }}>
            {metrics.total}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Recorded marks</span>
        </div>

        <div
          className="pegasus-card"
          style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span style={{ fontSize: "11px", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>
            Awaiting Verification
          </span>
          <strong style={{ fontSize: "28px", fontFamily: "monospace", color: "#f59e0b" }}>
            {metrics.submitted}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Pending Chief Scorer</span>
        </div>

        <div
          className="pegasus-card"
          style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span style={{ fontSize: "11px", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>
            Verified
          </span>
          <strong style={{ fontSize: "28px", fontFamily: "monospace", color: "#38bdf8" }}>
            {metrics.verified}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Ready to publish</span>
        </div>

        <div
          className="pegasus-card"
          style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span style={{ fontSize: "11px", color: "#10b981", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>
            Live Published
          </span>
          <strong style={{ fontSize: "28px", fontFamily: "monospace", color: "#10b981" }}>
            {metrics.published}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Public leaderboard</span>
        </div>

        <div
          className="pegasus-card"
          style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <span style={{ fontSize: "11px", color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 800 }}>
            Attention Queue
          </span>
          <strong style={{ fontSize: "28px", fontFamily: "monospace", color: "#ef4444" }}>
            {metrics.attention}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>Unpublished changes</span>
        </div>
      </section>

      {/* Action Bar & Controls */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", gap: "12px", flex: 1, flexWrap: "wrap", minWidth: "260px" }}>
          <input
            type="text"
            className="pegasus-admin-input"
            placeholder="Search marks, events, chest numbers or teams..."
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

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleOpenEntryModal}
            className="pegasus-button pegasus-button--primary"
            style={{ fontWeight: 800, padding: "8px 16px", minHeight: "36px" }}
          >
            + Enter Result
          </button>
          <Link
            href="/admin/verification"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "11px", padding: "6px 12px", minHeight: "36px" }}
          >
            Verification Station ↗
          </Link>
          <Link
            href="/admin/publish"
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "11px", padding: "6px 12px", minHeight: "36px" }}
          >
            Publishing Desk ↗
          </Link>
        </div>
      </section>

      {/* Results Table */}
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
            No results match the current filter criteria.
          </div>
        ) : (
          <div className="pegasus-admin-table-wrapper">
            <table className="pegasus-admin-table">
              <thead>
                <tr>
                  <th>Result ID • Status</th>
                  <th>Event</th>
                  <th>Competitor • Team</th>
                  <th>Position</th>
                  <th>Mark</th>
                  <th>Points</th>
                  <th>Provenance</th>
                  <th style={{ textAlign: "right" }}>Workflow & Control</th>
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
                  const isRowActionActive = activeRowActionId === result.id || isPending;

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
                          <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
                            <span
                              className={`pegasus-status ${getResultStatusBadgeClass(result.status)}`}
                              style={{ padding: "2px 6px", fontSize: "10px", width: "fit-content" }}
                            >
                              <span className="pegasus-status__dot" />
                              {getResultStatusLabel(result.status)}
                            </span>
                            {result.disposition && result.disposition !== "normal" && (
                              <span
                                style={{
                                  fontSize: "9px",
                                  fontWeight: 800,
                                  padding: "1px 5px",
                                  borderRadius: "4px",
                                  background: "rgba(239, 68, 68, 0.2)",
                                  color: "#ef4444",
                                  border: "1px solid rgba(239, 68, 68, 0.4)",
                                  textTransform: "uppercase",
                                }}
                              >
                                {result.disposition}
                              </span>
                            )}
                          </div>
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
                          <strong style={{ fontFamily: "monospace", fontSize: "14px" }}>
                            #{result.rank}
                          </strong>
                        ) : (
                          <span style={{ color: "var(--muted)" }}>—</span>
                        )}
                      </td>

                      <td>
                        <span style={{ color: "var(--muted-strong)", fontWeight: 600 }}>
                          {performanceText || "—"}
                        </span>
                      </td>

                      <td>
                        <strong
                          style={{
                            color: result.points > 0 ? "var(--accent)" : "inherit",
                            fontFamily: "monospace",
                            fontSize: "13px",
                          }}
                        >
                          +{result.points} pts
                        </strong>
                      </td>

                      <td>
                        <div style={{ display: "flex", flexDirection: "column", fontSize: "11px", color: "var(--muted)" }}>
                          {result.published_at ? (
                            <span style={{ color: "#10b981", fontWeight: 600 }}>
                              Published: {new Date(result.published_at).toLocaleDateString()}
                            </span>
                          ) : result.verified_by ? (
                            <span style={{ color: "#38bdf8" }}>Audited by Chief Scorer</span>
                          ) : (
                            <span>Created: {new Date(result.created_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={() => handleOpenCorrectModal(result)}
                            className="pegasus-button pegasus-button--subtle"
                            style={{ fontSize: "11px", padding: "4px 8px", minHeight: "28px" }}
                            title="Edit or correct this result"
                          >
                            Edit / Correct
                          </button>

                          {result.status === "submitted" && (
                            <button
                              type="button"
                              onClick={() => handleVerifyRow(result.id)}
                              disabled={isRowActionActive}
                              className="pegasus-button pegasus-button--primary"
                              style={{ fontSize: "11px", padding: "4px 8px", minHeight: "28px" }}
                            >
                              Verify
                            </button>
                          )}

                          {result.status === "verified" && (
                            <button
                              type="button"
                              onClick={() => handlePublishRow(result.id)}
                              disabled={isRowActionActive}
                              className="pegasus-button pegasus-button--primary"
                              style={{ fontSize: "11px", padding: "4px 8px", minHeight: "28px" }}
                            >
                              Publish
                            </button>
                          )}

                          {result.status === "corrected" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleVerifyRow(result.id)}
                                disabled={isRowActionActive}
                                className="pegasus-button pegasus-button--subtle"
                                style={{ fontSize: "11px", padding: "4px 8px", minHeight: "28px", color: "#38bdf8" }}
                              >
                                Re-verify
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePublishRow(result.id)}
                                disabled={isRowActionActive}
                                className="pegasus-button pegasus-button--primary"
                                style={{ fontSize: "11px", padding: "4px 8px", minHeight: "28px" }}
                              >
                                Publish
                              </button>
                            </>
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* DIRECT RESULT ENTRY MODAL                                    */}
      {/* ============================================================ */}
      {isEntryModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.78)",
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
              maxWidth: "600px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "26px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "18px",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                  Record Competition Result
                </h3>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Direct administrative result entry
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsEntryModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDirectResult}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Event Select */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Event / Discipline *
                  </label>
                  <select
                    className="pegasus-select"
                    style={{ width: "100%" }}
                    value={entryEventId}
                    onChange={(e) => {
                      setEntryEventId(e.target.value);
                      handleEntryRankOrEventChange(e.target.value, entryRank, entryDisposition);
                    }}
                    required
                  >
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name} ({ev.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Competition Select if available */}
                {competitions.length > 0 && (
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Competition / Bracket Round (Optional)
                    </label>
                    <select
                      className="pegasus-select"
                      style={{ width: "100%" }}
                      value={entryCompetitionId}
                      onChange={(e) => setEntryCompetitionId(e.target.value)}
                    >
                      <option value="">General Event Mark (Direct Final)</option>
                      {competitions
                        .filter((c) => !entryEventId || c.event_id === entryEventId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name || `Competition #${c.id.slice(0, 6)}`}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Competitor Target: Athlete or Team */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Entrant Type
                    </label>
                    <select
                      className="pegasus-select"
                      style={{ width: "100%" }}
                      value={entryTargetType}
                      onChange={(e) => setEntryTargetType(e.target.value as "participant" | "team")}
                    >
                      <option value="participant">Individual Athlete</option>
                      <option value="team">Team Entrant</option>
                    </select>
                  </div>

                  {entryTargetType === "participant" ? (
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                        Athlete / Competitor *
                      </label>
                      <select
                        className="pegasus-select"
                        style={{ width: "100%" }}
                        value={entryParticipantId}
                        onChange={(e) => setEntryParticipantId(e.target.value)}
                        required
                      >
                        <option value="">Select Athlete...</option>
                        {participants.map((p) => {
                          const t = p.team_id ? teamMap.get(p.team_id) : undefined;
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.chest_number ? `(#${p.chest_number})` : ""} - {t?.name || "Independent"}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                        Team *
                      </label>
                      <select
                        className="pegasus-select"
                        style={{ width: "100%" }}
                        value={entryTeamId}
                        onChange={(e) => setEntryTeamId(e.target.value)}
                        required
                      >
                        <option value="">Select Team...</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Rank & Mark */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Rank / Position
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className="pegasus-input"
                      style={{ width: "100%" }}
                      value={entryRank}
                      onChange={(e) => {
                        setEntryRank(e.target.value);
                        handleEntryRankOrEventChange(entryEventId, e.target.value, entryDisposition);
                      }}
                      placeholder="e.g. 1"
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Performance Mark / Score
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        className="pegasus-input"
                        style={{ flex: 1 }}
                        value={entryMarkValue}
                        onChange={(e) => setEntryMarkValue(e.target.value)}
                        placeholder="e.g. 10.45 or 7.82"
                      />
                      <select
                        className="pegasus-select"
                        style={{ width: "120px" }}
                        value={entryMarkMetric}
                        onChange={(e) => setEntryMarkMetric(e.target.value as any)}
                      >
                        <option value="time">Seconds (s)</option>
                        <option value="distance">Meters (m)</option>
                        <option value="score">Score/Goals</option>
                        <option value="reps">Reps</option>
                        <option value="raw">Custom/Raw</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Disposition & Championship Points */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Disposition
                    </label>
                    <select
                      className="pegasus-select"
                      style={{ width: "100%" }}
                      value={entryDisposition}
                      onChange={(e) => {
                        const disp = e.target.value as ResultDisposition;
                        setEntryDisposition(disp);
                        handleEntryRankOrEventChange(entryEventId, entryRank, disp);
                      }}
                    >
                      <option value="normal">Normal / Standard Finish</option>
                      <option value="dns">DNS — Did Not Start (0 pts)</option>
                      <option value="dnf">DNF — Did Not Finish (0 pts)</option>
                      <option value="dq">DQ — Disqualified (0 pts)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Championship Points
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="pegasus-input"
                      style={{ width: "100%" }}
                      value={entryPoints}
                      onChange={(e) => setEntryPoints(e.target.value)}
                    />
                  </div>
                </div>

                {/* Target Status */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Initial Result Status
                  </label>
                  <select
                    className="pegasus-select"
                    style={{ width: "100%" }}
                    value={entryStatus}
                    onChange={(e) => setEntryStatus(e.target.value as ResultStatus)}
                  >
                    <option value="submitted">Submitted (Awaiting Chief Scorer Verification)</option>
                    <option value="verified">Verified (Audited Chief Scorer mark)</option>
                    <option value="published">Published (Make live on festival leaderboard immediately)</option>
                  </select>
                </div>

                {/* Administrative Notes */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Administrative Notes (Optional)
                  </label>
                  <input
                    type="text"
                    className="pegasus-input"
                    style={{ width: "100%" }}
                    value={entryNotes}
                    onChange={(e) => setEntryNotes(e.target.value)}
                    placeholder="e.g. Official manual timing backup, Chief Judge signed"
                  />
                </div>

                {/* Form Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setIsEntryModalOpen(false)}
                    className="pegasus-button pegasus-button--subtle"
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="pegasus-button pegasus-button--primary"
                    disabled={isPending}
                  >
                    {isPending ? "Recording..." : "Save Result"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* RESULT CORRECTION & AMENDMENT MODAL                          */}
      {/* ============================================================ */}
      {isCorrectModalOpen && selectedResultToCorrect && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.78)",
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
              maxWidth: "580px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "26px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
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
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                  Correct Result #{selectedResultToCorrect.id.slice(0, 8)}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Audited mark correction and point amendment
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCorrectModalOpen(false);
                  setSelectedResultToCorrect(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "20px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            {/* Warning if published or verified */}
            {(selectedResultToCorrect.status === "published" || selectedResultToCorrect.status === "verified") && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "#f59e0b",
                  fontSize: "12px",
                  marginBottom: "16px",
                }}
              >
                ⚠️ <strong>Audit Notice:</strong> This result is currently{" "}
                <strong>{selectedResultToCorrect.status.toUpperCase()}</strong>.
                Applying corrections will maintain the immutable historical record and require a detailed reason for the log.
              </div>
            )}

            <form onSubmit={handleSaveCorrection}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Result Context Info */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    fontSize: "12px",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--muted)", display: "block" }}>Event</span>
                    <strong>{eventMap.get(selectedResultToCorrect.event_id)?.name || "Event"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)", display: "block" }}>Competitor</span>
                    <strong>
                      {participantMap.get(selectedResultToCorrect.participant_id || "")?.name ||
                        teamMap.get(selectedResultToCorrect.team_id || "")?.name ||
                        "Competitor"}
                    </strong>
                  </div>
                </div>

                {/* Rank & Mark */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Amended Rank
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      className="pegasus-input"
                      style={{ width: "100%" }}
                      value={correctRank}
                      onChange={(e) => {
                        setCorrectRank(e.target.value);
                        if (correctDisposition === "normal") {
                          const num = parseInt(e.target.value, 10);
                          if (!isNaN(num) && num > 0) {
                            const pts = getSafeEventPoints(selectedResultToCorrect.event_id, num);
                            if (pts !== null) setCorrectPoints(String(pts));
                          }
                        }
                      }}
                      placeholder="e.g. 1"
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Amended Mark
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input
                        type="text"
                        className="pegasus-input"
                        style={{ flex: 1 }}
                        value={correctMarkValue}
                        onChange={(e) => setCorrectMarkValue(e.target.value)}
                        placeholder="e.g. 10.42 or 7.90"
                      />
                      <select
                        className="pegasus-select"
                        style={{ width: "120px" }}
                        value={correctMarkMetric}
                        onChange={(e) => setCorrectMarkMetric(e.target.value as any)}
                      >
                        <option value="time">Seconds (s)</option>
                        <option value="distance">Meters (m)</option>
                        <option value="score">Score/Goals</option>
                        <option value="reps">Reps</option>
                        <option value="raw">Custom/Raw</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Disposition & Points */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Disposition
                    </label>
                    <select
                      className="pegasus-select"
                      style={{ width: "100%" }}
                      value={correctDisposition}
                      onChange={(e) => {
                        const disp = e.target.value as ResultDisposition;
                        setCorrectDisposition(disp);
                        if (disp !== "normal") {
                          setCorrectPoints("0");
                        } else {
                          const num = parseInt(correctRank, 10);
                          if (!isNaN(num)) {
                            const pts = getSafeEventPoints(selectedResultToCorrect.event_id, num);
                            if (pts !== null) setCorrectPoints(String(pts));
                          }
                        }
                      }}
                    >
                      <option value="normal">Normal / Standard Finish</option>
                      <option value="dns">DNS — Did Not Start (0 pts)</option>
                      <option value="dnf">DNF — Did Not Finish (0 pts)</option>
                      <option value="dq">DQ — Disqualified (0 pts)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Championship Points
                    </label>
                    <input
                      type="number"
                      min={0}
                      className="pegasus-input"
                      style={{ width: "100%" }}
                      value={correctPoints}
                      onChange={(e) => setCorrectPoints(e.target.value)}
                    />
                  </div>
                </div>

                {/* Target Status */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Target Status After Correction
                  </label>
                  <select
                    className="pegasus-select"
                    style={{ width: "100%" }}
                    value={correctTargetStatus}
                    onChange={(e) => setCorrectTargetStatus(e.target.value as any)}
                  >
                    <option value="corrected">Corrected (Unlock mark; requires Chief Scorer re-verification)</option>
                    <option value="verified">Verified (Directly re-verify corrected mark)</option>
                    <option value="published">Published (Directly re-publish to live leaderboard)</option>
                  </select>
                </div>

                {/* Mandatory Correction Reason */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Correction Reason & Audit Justification *
                  </label>
                  <textarea
                    rows={3}
                    className="pegasus-input"
                    style={{ width: "100%", resize: "vertical" }}
                    placeholder="Provide justification (e.g. Chief Scorer clerical audit, appeal tribunal decision #14, electronic timing recalibration)..."
                    value={correctReason}
                    onChange={(e) => setCorrectReason(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "3px" }}>
                    This reason is permanently preserved in the official festival result audit ledger.
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCorrectModalOpen(false);
                      setSelectedResultToCorrect(null);
                    }}
                    className="pegasus-button pegasus-button--subtle"
                    disabled={isPending}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="pegasus-button pegasus-button--primary"
                    disabled={isPending}
                  >
                    {isPending ? "Applying..." : "Apply Correction"}
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
