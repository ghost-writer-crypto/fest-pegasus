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
import { resolveMatchOutcome } from "@/lib/competition/teamMatchResolution";
import {
  adminCreateResultAction,
  adminRecordFlexibleResultsAction,
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
  initialEventId?: string;
}

export default function AdminResultsClient({
  initialResults,
  events,
  participants,
  teams,
  competitions = [],
  festivalId = "",
  initialEventId = "",
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

  // Form State: Direct & Flexible Entry
  const [entryMode, setEntryMode] = useState<"podium" | "match" | "single">("podium");
  const [entryEventId, setEntryEventId] = useState<string>(initialEventId || events[0]?.id || "");
  const [entryCompetitionId, setEntryCompetitionId] = useState<string>("");
  const [entryTargetType, setEntryTargetType] = useState<"participant" | "team">(
    participants.length === 0 ? "team" : "participant"
  );
  const [entryParticipantId, setEntryParticipantId] = useState<string>("");
  const [entryTeamId, setEntryTeamId] = useState<string>("");
  const [entryRank, setEntryRank] = useState<string>("1");
  const [entryMarkValue, setEntryMarkValue] = useState<string>("");
  const [entryMarkMetric, setEntryMarkMetric] = useState<"time" | "distance" | "score" | "reps" | "raw">("time");
  const [entryDisposition, setEntryDisposition] = useState<ResultDisposition>("normal");
  const [entryPoints, setEntryPoints] = useState<string>("10");
  const [entryStatus, setEntryStatus] = useState<ResultStatus>("submitted");
  const [entryNotes, setEntryNotes] = useState<string>("");

  // Multi-House Podium State
  const [podium1Team, setPodium1Team] = useState<string>("");
  const [podium1Mark, setPodium1Mark] = useState<string>("");
  const [podium1Points, setPodium1Points] = useState<string>("10");

  const [podium2Team, setPodium2Team] = useState<string>("");
  const [podium2Mark, setPodium2Mark] = useState<string>("");
  const [podium2Points, setPodium2Points] = useState<string>("7");

  const [podium3Team, setPodium3Team] = useState<string>("");
  const [podium3Mark, setPodium3Mark] = useState<string>("");
  const [podium3Points, setPodium3Points] = useState<string>("5");

  // Team Matchup State
  const [matchHomeTeam, setMatchHomeTeam] = useState<string>("");
  const [matchHomeScore, setMatchHomeScore] = useState<string>("");
  const [matchAwayTeam, setMatchAwayTeam] = useState<string>("");
  const [matchAwayScore, setMatchAwayScore] = useState<string>("");
  const [matchTiebreakWinner, setMatchTiebreakWinner] = useState<string>("");

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
  const updatePodiumDefaultPoints = (eventId: string) => {
    const p1 = getSafeEventPoints(eventId, 1) ?? 10;
    const p2 = getSafeEventPoints(eventId, 2) ?? 7;
    const p3 = getSafeEventPoints(eventId, 3) ?? 5;
    setPodium1Points(String(p1));
    setPodium2Points(String(p2));
    setPodium3Points(String(p3));
  };

  const handleOpenEntryModal = (overrideEventId?: string) => {
    setFeedback(null);
    const selectedEvId = overrideEventId || initialEventId || events[0]?.id || "";
    setEntryEventId(selectedEvId);
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

    // Initialize default podium points
    updatePodiumDefaultPoints(selectedEvId);
    setMatchTiebreakWinner("");

    const initialCalc = getSafeEventPoints(selectedEvId, 1);
    setEntryPoints(initialCalc !== null ? String(initialCalc) : "10");
    setIsEntryModalOpen(true);
  };

  const handleOpenCorrectModal = (result: ResultRow) => {
    setSelectedResultToCorrect(result);
    setCorrectRank(result.rank !== null ? String(result.rank) : "");
    setCorrectPoints(result.points !== undefined && result.points !== null ? String(result.points) : "");
    setCorrectDisposition(result.disposition || "normal");
    setCorrectTargetStatus("corrected");
    setCorrectReason("");
    const perf = (result.performance as Record<string, unknown>) || {};
    setCorrectMarkValue(String(perf.raw || perf.timeMs || perf.distanceMeters || perf.numericValue || ""));
    setCorrectMarkMetric((perf.metric as "time" | "distance" | "score" | "reps" | "raw") || "raw");
    setIsCorrectModalOpen(true);
  };

  function buildPerformancePayload(
    val: string,
    metric: "time" | "distance" | "score" | "reps" | "raw"
  ): Record<string, unknown> {
    if (!val.trim()) return {};
    const num = parseFloat(val.trim());
    return {
      raw: val.trim(),
      metric,
      numericValue: !isNaN(num) ? num : undefined,
    };
  }

  // Submit Multi-House Podium Result Entry
  const handleSaveFlexiblePodium = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podium1Team && !podium2Team && !podium3Team) {
      setFeedback({ type: "error", message: "Please select at least one podium house." });
      return;
    }

    startTransition(async () => {
      const rows = [];
      if (podium1Team) {
        rows.push({
          teamId: podium1Team,
          rank: 1,
          points: podium1Points.trim() ? parseInt(podium1Points, 10) : getSafeEventPoints(entryEventId, 1),
          performance: podium1Mark.trim() ? { raw: podium1Mark.trim() } : {},
          disposition: "normal" as ResultDisposition,
        });
      }
      if (podium2Team) {
        rows.push({
          teamId: podium2Team,
          rank: 2,
          points: podium2Points.trim() ? parseInt(podium2Points, 10) : getSafeEventPoints(entryEventId, 2),
          performance: podium2Mark.trim() ? { raw: podium2Mark.trim() } : {},
          disposition: "normal" as ResultDisposition,
        });
      }
      if (podium3Team) {
        rows.push({
          teamId: podium3Team,
          rank: 3,
          points: podium3Points.trim() ? parseInt(podium3Points, 10) : getSafeEventPoints(entryEventId, 3),
          performance: podium3Mark.trim() ? { raw: podium3Mark.trim() } : {},
          disposition: "normal" as ResultDisposition,
        });
      }

      const res = await adminRecordFlexibleResultsAction({
        festivalId: festivalId || initialResults[0]?.festival_id || "",
        eventId: entryEventId,
        competitionId: entryCompetitionId || null,
        formatType: "podium",
        targetStatus: entryStatus,
        summaryNotes: entryNotes,
        rows,
      });

      if (res.success) {
        setIsEntryModalOpen(false);
        setFeedback({
          type: "success",
          message: `✓ Podium standings recorded with status: ${getResultStatusLabel(entryStatus)}.`,
        });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to record podium." });
      }
    });
  };

  // Submit Dual Team Match Result Entry
  const handleSaveFlexibleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchHomeTeam || !matchAwayTeam) {
      setFeedback({ type: "error", message: "Both home and away teams are required." });
      return;
    }

    if (matchHomeTeam === matchAwayTeam) {
      setFeedback({ type: "error", message: "Home and away teams must be different." });
      return;
    }

    if (matchHomeScore.trim() === "" || matchAwayScore.trim() === "") {
      setFeedback({ type: "error", message: "Please enter numeric scores for both teams." });
      return;
    }

    const homeScoreNum = parseFloat(matchHomeScore);
    const awayScoreNum = parseFloat(matchAwayScore);

    if (isNaN(homeScoreNum) || isNaN(awayScoreNum) || homeScoreNum < 0 || awayScoreNum < 0) {
      setFeedback({ type: "error", message: "Scores must be valid non-negative numbers." });
      return;
    }

    // Reuse canonical match resolver
    const outcome = resolveMatchOutcome({
      homeTeamId: matchHomeTeam,
      awayTeamId: matchAwayTeam,
      scoreHome: homeScoreNum,
      scoreAway: awayScoreNum,
    });

    const rank1Points = getSafeEventPoints(entryEventId, 1) ?? 10;
    const rank2Points = getSafeEventPoints(entryEventId, 2) ?? 7;

    // Critical rule: Equal scores must never award 1st-place points to both teams automatically.
    if (outcome.isDraw) {
      if (!matchTiebreakWinner) {
        setFeedback({
          type: "error",
          message: `The match ended in a draw (${homeScoreNum} - ${awayScoreNum}). Tournament rules forbid awarding duplicate first-place points. Please select the official Shoot-out / Tiebreak winner before saving.`,
        });
        return;
      }
    }

    startTransition(async () => {
      let rows;

      if (outcome.isDraw && matchTiebreakWinner) {
        const isHomeWinner = matchTiebreakWinner === matchHomeTeam;
        const winnerTeamId = isHomeWinner ? matchHomeTeam : matchAwayTeam;
        const loserTeamId = isHomeWinner ? matchAwayTeam : matchHomeTeam;

        rows = [
          {
            teamId: winnerTeamId,
            rank: 1,
            points: rank1Points,
            performance: {
              scoreHome: homeScoreNum,
              scoreAway: awayScoreNum,
              raw: `${homeScoreNum} - ${awayScoreNum} (Tiebreak Winner)`,
              tiebreakResolved: true,
            },
            disposition: "normal" as ResultDisposition,
            notes: `Winner via Shoot-out/Tiebreak (${homeScoreNum} - ${awayScoreNum})`,
          },
          {
            teamId: loserTeamId,
            rank: 2,
            points: rank2Points,
            performance: {
              scoreHome: homeScoreNum,
              scoreAway: awayScoreNum,
              raw: `${homeScoreNum} - ${awayScoreNum} (Tiebreak Runner-up)`,
              tiebreakResolved: true,
            },
            disposition: "normal" as ResultDisposition,
            notes: `Runner-up via Shoot-out/Tiebreak (${homeScoreNum} - ${awayScoreNum})`,
          },
        ];
      } else {
        const homeWon = outcome.winnerTeamId === matchHomeTeam;
        rows = [
          {
            teamId: matchHomeTeam,
            rank: homeWon ? 1 : 2,
            points: homeWon ? rank1Points : rank2Points,
            performance: { scoreHome: homeScoreNum, scoreAway: awayScoreNum, raw: `${homeScoreNum} - ${awayScoreNum}` },
            disposition: "normal" as ResultDisposition,
            notes: homeWon ? "Match Winner" : "Runner-up",
          },
          {
            teamId: matchAwayTeam,
            rank: homeWon ? 2 : 1,
            points: homeWon ? rank2Points : rank1Points,
            performance: { scoreHome: homeScoreNum, scoreAway: awayScoreNum, raw: `${homeScoreNum} - ${awayScoreNum}` },
            disposition: "normal" as ResultDisposition,
            notes: homeWon ? "Runner-up" : "Match Winner",
          },
        ];
      }

      const res = await adminRecordFlexibleResultsAction({
        festivalId: festivalId || initialResults[0]?.festival_id || "",
        eventId: entryEventId,
        competitionId: entryCompetitionId || null,
        formatType: "match",
        targetStatus: entryStatus,
        summaryNotes: entryNotes || `Match: ${homeScoreNum} - ${awayScoreNum}`,
        rows,
      });

      if (res.success) {
        setIsEntryModalOpen(false);
        setFeedback({
          type: "success",
          message: `✓ Match result recorded with status: ${getResultStatusLabel(entryStatus)}.`,
        });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to record match." });
      }
    });
  };

  // Submit Direct Result Entry
  const handleSaveDirectResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (entryMode === "podium") {
      return handleSaveFlexiblePodium(e);
    }
    if (entryMode === "match") {
      return handleSaveFlexibleMatch(e);
    }

    if (!entryEventId) {
      setFeedback({ type: "error", message: "Please select a competition event." });
      return;
    }
    if (entryTargetType === "participant" && !entryParticipantId) {
      if (participants.length === 0) {
        setFeedback({
          type: "error",
          message: "Student records have not been imported yet. Please record results as a Team Entrant or use House Podium / Dual Match.",
        });
        return;
      }
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
            onClick={() => handleOpenEntryModal()}
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

                {/* Result Format Mode Switcher */}
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 750, marginBottom: "8px", color: "var(--foreground)" }}>
                    Competition Format Mode
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {[
                      { id: "podium", label: "🏆 House Podium (1st, 2nd, 3rd)" },
                      { id: "match", label: "⚔️ Dual Match (Home vs Away)" },
                      { id: "single", label: "👤 Single Entrant Record" },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => {
                          setEntryMode(mode.id as any);
                          if (mode.id === "podium") updatePodiumDefaultPoints(entryEventId);
                        }}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          background: entryMode === mode.id ? "var(--foreground)" : "rgba(255,255,255,0.04)",
                          color: entryMode === mode.id ? "var(--background)" : "var(--muted)",
                          border: "1px solid",
                          borderColor: entryMode === mode.id ? "var(--foreground)" : "var(--border)",
                          cursor: "pointer",
                        }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* MODE 1: MULTI-HOUSE PODIUM */}
                {entryMode === "podium" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                      Official House Championship Podium Allocation
                    </span>

                    {/* 1st Place */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 80px", gap: "8px", alignItems: "center" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#10b981", marginBottom: "4px" }}>
                          🥇 1st Place House *
                        </label>
                        <select
                          className="pegasus-select"
                          style={{ width: "100%" }}
                          value={podium1Team}
                          onChange={(e) => setPodium1Team(e.target.value)}
                        >
                          <option value="">Select House...</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}>
                          Mark / Time (Optional)
                        </label>
                        <input
                          type="text"
                          className="pegasus-input"
                          style={{ width: "100%" }}
                          placeholder="e.g. 10.45s or 3-1"
                          value={podium1Mark}
                          onChange={(e) => setPodium1Mark(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}>
                          Points
                        </label>
                        <input
                          type="number"
                          className="pegasus-input"
                          style={{ width: "100%" }}
                          value={podium1Points}
                          onChange={(e) => setPodium1Points(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* 2nd Place */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 80px", gap: "8px", alignItems: "center" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#3b82f6", marginBottom: "4px" }}>
                          🥈 2nd Place House
                        </label>
                        <select
                          className="pegasus-select"
                          style={{ width: "100%" }}
                          value={podium2Team}
                          onChange={(e) => setPodium2Team(e.target.value)}
                        >
                          <option value="">Select House...</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}>
                          Mark / Time (Optional)
                        </label>
                        <input
                          type="text"
                          className="pegasus-input"
                          style={{ width: "100%" }}
                          placeholder="e.g. 10.82s"
                          value={podium2Mark}
                          onChange={(e) => setPodium2Mark(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}>
                          Points
                        </label>
                        <input
                          type="number"
                          className="pegasus-input"
                          style={{ width: "100%" }}
                          value={podium2Points}
                          onChange={(e) => setPodium2Points(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* 3rd Place */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 80px", gap: "8px", alignItems: "center" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#f59e0b", marginBottom: "4px" }}>
                          🥉 3rd Place House
                        </label>
                        <select
                          className="pegasus-select"
                          style={{ width: "100%" }}
                          value={podium3Team}
                          onChange={(e) => setPodium3Team(e.target.value)}
                        >
                          <option value="">Select House...</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}>
                          Mark / Time (Optional)
                        </label>
                        <input
                          type="text"
                          className="pegasus-input"
                          style={{ width: "100%" }}
                          placeholder="e.g. 11.05s"
                          value={podium3Mark}
                          onChange={(e) => setPodium3Mark(e.target.value)}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}>
                          Points
                        </label>
                        <input
                          type="number"
                          className="pegasus-input"
                          style={{ width: "100%" }}
                          value={podium3Points}
                          onChange={(e) => setPodium3Points(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* MODE 2: TEAM MATCHUP */}
                {entryMode === "match" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                      Dual Team Matchup Score Entry
                    </span>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "10px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "4px", color: "var(--foreground)" }}>
                          Home House *
                        </label>
                        <select
                          className="pegasus-select"
                          style={{ width: "100%" }}
                          value={matchHomeTeam}
                          onChange={(e) => setMatchHomeTeam(e.target.value)}
                          required
                        >
                          <option value="">Select Home House...</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "4px", color: "var(--foreground)" }}>
                          Home Score *
                        </label>
                        <input
                          type="number"
                          step="any"
                          className="pegasus-input"
                          style={{ width: "100%" }}
                          placeholder="e.g. 3"
                          value={matchHomeScore}
                          onChange={(e) => setMatchHomeScore(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "10px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "4px", color: "var(--foreground)" }}>
                          Away House *
                        </label>
                        <select
                          className="pegasus-select"
                          style={{ width: "100%" }}
                          value={matchAwayTeam}
                          onChange={(e) => setMatchAwayTeam(e.target.value)}
                          required
                        >
                          <option value="">Select Away House...</option>
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "11px", fontWeight: 700, marginBottom: "4px", color: "var(--foreground)" }}>
                          Away Score *
                        </label>
                        <input
                          type="number"
                          step="any"
                          className="pegasus-input"
                          style={{ width: "100%" }}
                          placeholder="e.g. 1"
                          value={matchAwayScore}
                          onChange={(e) => setMatchAwayScore(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Tiebreak selector if scores are identical */}
                    {matchHomeScore.trim() !== "" &&
                      matchAwayScore.trim() !== "" &&
                      parseFloat(matchHomeScore) === parseFloat(matchAwayScore) && (
                        <div style={{ marginTop: "6px", padding: "10px 12px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "6px" }}>
                          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#f59e0b", marginBottom: "6px" }}>
                            ⚠️ Tie Score ({matchHomeScore} - {matchAwayScore}) • Shoot-out / Tiebreak Winner *
                          </label>
                          <select
                            className="pegasus-select"
                            style={{ width: "100%", borderColor: "rgba(245, 158, 11, 0.5)" }}
                            value={matchTiebreakWinner}
                            onChange={(e) => setMatchTiebreakWinner(e.target.value)}
                            required
                          >
                            <option value="">Select official tiebreak winner...</option>
                            {matchHomeTeam && (
                              <option value={matchHomeTeam}>
                                {teamMap.get(matchHomeTeam)?.name || "Home House"} (Winner)
                              </option>
                            )}
                            {matchAwayTeam && (
                              <option value={matchAwayTeam}>
                                {teamMap.get(matchAwayTeam)?.name || "Away House"} (Winner)
                              </option>
                            )}
                          </select>
                        </div>
                      )}
                  </div>
                )}

                {/* MODE 3: SINGLE ENTRANT RECORD */}
                {entryMode === "single" && (
                  <>
                    {participants.length === 0 && (
                      <div
                        style={{
                          padding: "8px 12px",
                          borderRadius: "6px",
                          background: "rgba(56, 189, 248, 0.08)",
                          border: "1px solid rgba(56, 189, 248, 0.2)",
                          fontSize: "12px",
                          color: "#38bdf8",
                        }}
                      >
                        ℹ️ Student records are not yet imported. Recording results directly at the House/Team level.
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
                  </>
                )}

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
