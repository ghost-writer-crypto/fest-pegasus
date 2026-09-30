"use client";

import { useState, useTransition } from "react";
import {
  saveDraftScoreSheetAction,
  submitScoreSheetAction,
} from "@/app/judge/actions";

import type { ScoreSheetEntry } from "@/lib/results";
import type { ResultDisposition, ResultStatus } from "@/lib/types";
import { resolveMatchOutcome } from "@/lib/competition/teamMatchResolution";

export type CompetitorItem = {
  id: string; // participant id
  name: string;
  chestNumber: string;
  teamName: string;
  teamId?: string;
  category: string;
  existingResultId?: string;
  existingRank?: number | null;
  existingPerformance?: string;
  existingDisposition?: ResultDisposition;
  existingStatus?: ResultStatus;
};

export type FixtureItem = {
  id: string; // fixture id
  homeTeamId?: string;
  awayTeamId?: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamCode: string;
  awayTeamCode: string;
  venueName?: string;
  round?: string;
  status: string;
  scoreHome?: number | null;
  scoreAway?: number | null;
  existingResultId?: string;
  homeResultId?: string;
  awayResultId?: string;
  homeRank?: number | null;
  awayRank?: number | null;
  existingStatus?: ResultStatus;
};

export type JudgeScoreSheetClientProps = {
  festivalId: string;
  eventId: string;
  eventName: string;
  eventSport: string;
  eventCategory: string;
  eventType: "individual" | "team";
  pointClass: string | null;
  isAssigned: boolean;
  competitors: CompetitorItem[];
  fixtures: FixtureItem[];
  initialStatus: ResultStatus;
  initialSubmittedBy?: string | null;
  authJudgeName?: string | null;
  isTransitional?: boolean;
};

// Points matrix helper for live client preview (replicates official competition engine)
function getPreviewPoints(
  pointClass: string | null,
  rank: number | null | undefined,
  disposition: ResultDisposition,
): { points: number | null; label: string } {
  if (disposition !== "normal" || !rank) {
    return { points: 0, label: "0 pts" };
  }

  if (!pointClass) {
    return { points: null, label: "Points pending confirmation" };
  }

  const matrix: Record<string, { [pos: number]: number }> = {
    W: { 1: 5, 2: 3, 3: 1 },
    X: { 1: 5, 2: 3, 3: 1 },
    Y: { 1: 7, 2: 5, 3: 3 },
    Z: { 1: 10, 2: 7, 3: 5 },
  };

  const classPoints = matrix[pointClass];
  if (!classPoints) {
    return { points: null, label: "Points pending confirmation" };
  }

  const pts = classPoints[rank] ?? 0;
  return { points: pts, label: pts > 0 ? `+${pts} pts (Rank ${rank})` : "0 pts" };
}

export default function JudgeScoreSheetClient({
  festivalId,
  eventId,
  eventName,
  eventSport,
  eventCategory,
  eventType,
  pointClass,
  isAssigned,
  competitors: initialCompetitors,
  fixtures: initialFixtures,
  initialStatus,
  initialSubmittedBy,
  authJudgeName,
  isTransitional,
}: JudgeScoreSheetClientProps) {
  // Score sheet status lifecycle
  const [sheetStatus, setSheetStatus] = useState<ResultStatus>(initialStatus);
  const [submittedBy, setSubmittedBy] = useState<string>(
    initialSubmittedBy || authJudgeName || "Field Referee Desk",
  );


  // Individual competitor entries state
  const [competitorEntries, setCompetitorEntries] = useState<CompetitorItem[]>(
    initialCompetitors,
  );

  // Team fixtures state
  const [fixtureEntries, setFixtureEntries] = useState<FixtureItem[]>(
    initialFixtures,
  );

  // Operational feedback states
  const [isPending, startTransition] = useTransition();
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Check if sheet is locked (submitted, verified, or published)
  const isLocked =
    sheetStatus === "submitted" ||
    sheetStatus === "verified" ||
    sheetStatus === "published";

  // Handle individual input changes
  const updateCompetitor = (
    id: string,
    field: "existingRank" | "existingPerformance" | "existingDisposition",
    value: unknown,
  ) => {
    if (isLocked) return;
    setCompetitorEntries((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
    setSaveNotice(null);
    setErrorMessage(null);
  };

  // Handle fixture score changes
  const updateFixtureScore = (
    fixtureId: string,
    field: "scoreHome" | "scoreAway",
    value: number | null,
  ) => {
    if (isLocked) return;
    setFixtureEntries((prev) =>
      prev.map((f) => (f.id === fixtureId ? { ...f, [field]: value } : f)),
    );
    setSaveNotice(null);
    setErrorMessage(null);
  };

  // Prepare standard ScoreSheetEntry array for server action
  const buildScoreSheetEntries = (): ScoreSheetEntry[] => {
    if (eventType === "individual") {
      return competitorEntries.map((c) => ({
        resultId: c.existingResultId,
        participantId: c.id,
        teamId: c.teamId,
        rank: c.existingRank ?? null,
        performanceRaw: c.existingPerformance ?? "",
        disposition: c.existingDisposition || "normal",
      }));
    } else {
      const entries: ScoreSheetEntry[] = [];
      for (const f of fixtureEntries) {
        const outcome = resolveMatchOutcome({
          homeTeamId: f.homeTeamId,
          awayTeamId: f.awayTeamId,
          scoreHome: f.scoreHome,
          scoreAway: f.scoreAway,
          round: f.round,
        });

        if (outcome.isComplete && outcome.winnerTeamId && outcome.loserTeamId) {
          const isHomeWinner = outcome.winnerTeamId === f.homeTeamId;
          const homeRank = isHomeWinner ? outcome.winnerRank : outcome.loserRank;
          const awayRank = isHomeWinner ? outcome.loserRank : outcome.winnerRank;

          if (f.homeTeamId) {
            entries.push({
              resultId:
                f.homeResultId ||
                (f.existingResultId && !f.awayResultId
                  ? f.existingResultId
                  : undefined),
              fixtureId: f.id,
              teamId: f.homeTeamId,
              rank: homeRank,
              performanceRaw: `${f.scoreHome} - ${f.scoreAway}`,
              disposition: "normal",
            });
          }
          if (f.awayTeamId) {
            entries.push({
              resultId: f.awayResultId,
              fixtureId: f.id,
              teamId: f.awayTeamId,
              rank: awayRank,
              performanceRaw: `${f.scoreAway} - ${f.scoreHome}`,
              disposition: "normal",
            });
          }
        } else {
          // Unresolved, tied, or unscored match: emit entries with null rank to preserve auditability without fabricating points
          if (f.homeTeamId) {
            entries.push({
              resultId:
                f.homeResultId ||
                (f.existingResultId && !f.awayResultId
                  ? f.existingResultId
                  : undefined),
              fixtureId: f.id,
              teamId: f.homeTeamId,
              rank: null,
              performanceRaw: outcome.performanceRaw,
              disposition: "normal",
            });
          }
          if (f.awayTeamId) {
            entries.push({
              resultId: f.awayResultId,
              fixtureId: f.id,
              teamId: f.awayTeamId,
              rank: null,
              performanceRaw: outcome.performanceRaw,
              disposition: "normal",
            });
          }
          if (!f.homeTeamId && !f.awayTeamId) {
            entries.push({
              resultId: f.existingResultId,
              fixtureId: f.id,
              rank: null,
              performanceRaw: outcome.performanceRaw,
              disposition: "normal",
            });
          }
        }
      }
      return entries;
    }
  };

  // Save Draft Handler
  const handleSaveDraft = () => {
    setErrorMessage(null);
    setSaveNotice(null);

    const entries = buildScoreSheetEntries();
    if (entries.length === 0) {
      setErrorMessage("No competitor entries to save.");
      return;
    }

    startTransition(async () => {
      const res = await saveDraftScoreSheetAction({
        festivalId,
        eventId,
        stationLabel: submittedBy,
        entries,
      });

      if (res.success) {
        setSheetStatus("draft");
        const timeStr = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setSaveNotice(`Draft saved successfully at ${timeStr}`);
      } else {
        setErrorMessage(res.error || "Failed to save draft results.");
      }
    });
  };

  // Pre-submission validation
  const validateBeforeSubmit = (): boolean => {
    if (eventType === "individual") {
      const assignedRanks = new Map<number, number>();
      for (let i = 0; i < competitorEntries.length; i++) {
        const c = competitorEntries[i];
        if (c.existingDisposition === "normal") {
          if (!c.existingRank && !c.existingPerformance) {
            setErrorMessage(
              `Competitor #${c.chestNumber} (${c.name}) requires a position or performance mark.`,
            );
            return false;
          }
          if (c.existingRank) {
            const count = assignedRanks.get(c.existingRank) ?? 0;
            assignedRanks.set(c.existingRank, count + 1);
          }
        }
      }

      for (const [rank, count] of assignedRanks.entries()) {
        if (count > 1) {
          setErrorMessage(
            `Conflicting position: Rank ${rank} is assigned to ${count} competitors. Please verify finishing order.`,
          );
          return false;
        }
      }
    } else {
      for (const f of fixtureEntries) {
        if (f.scoreHome === null || f.scoreAway === null) {
          setErrorMessage(
            `Fixture (${f.homeTeamName} vs ${f.awayTeamName}) requires both home and away scores.`,
          );
          return false;
        }
      }
    }

    return true;
  };

  const handleOpenSubmitModal = () => {
    setErrorMessage(null);
    if (validateBeforeSubmit()) {
      setShowConfirmModal(true);
    }
  };

  // Official Submit Handler
  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    setErrorMessage(null);
    setSaveNotice(null);

    const entries = buildScoreSheetEntries();

    startTransition(async () => {
      const res = await submitScoreSheetAction({
        festivalId,
        eventId,
        stationLabel: submittedBy.trim(),
        entries,
      });

      if (res.success) {
        setSheetStatus("submitted");
        setSaveNotice(
          `Official score sheet submitted to Chief Scorer! Field entries are now locked.`,
        );
      } else {
        setErrorMessage(res.error || "Submission failed validation.");
      }
    });
  };

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {/* 1. Status & Operational Banners */}
      {isLocked ? (
        <div
          className="pegasus-card"
          style={{
            padding: "16px 20px",
            background: "rgba(251, 191, 36, 0.08)",
            border: "1px solid rgba(251, 191, 36, 0.3)",
            color: "var(--status-pending)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>🔒</span>
            <div>
              <strong style={{ fontSize: "14px", display: "block", color: "var(--foreground)" }}>
                SCORE SHEET SEALED & LOCKED ({sheetStatus.toUpperCase()})
              </strong>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Submitted by {submittedBy}. This sheet is routed to the Chief Scorer verification queue.
              </span>
            </div>
          </div>
          <span
            className="pegasus-status pegasus-status--pending"
            style={{ fontSize: "11px", textTransform: "uppercase" }}
          >
            <span className="pegasus-status__dot" />
            {sheetStatus}
          </span>
        </div>
      ) : (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "8px",
            background: isAssigned
              ? "rgba(215, 255, 63, 0.08)"
              : "rgba(255, 255, 255, 0.04)",
            border: isAssigned
              ? "1px solid rgba(215, 255, 63, 0.25)"
              : "1px solid var(--border)",
            color: isAssigned ? "var(--status-live)" : "var(--foreground)",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 800 }}>
              {isAssigned
                ? "● OFFICIAL ASSIGNMENT CONFIRMED"
                : "○ FIELD REFEREE SCORING DESK"}
            </span>
            <span>•</span>
            <span style={{ color: "var(--muted)" }}>
              {pointClass
                ? `Authoritative Codex Class ${pointClass}`
                : "Codex Classification Pending"}
            </span>
            {isTransitional && (
              <>
                <span>•</span>
                <span style={{ color: "var(--status-pending, #fbbf24)", fontWeight: 600 }}>
                  TRANSITIONAL DEV MODE
                </span>
              </>
            )}
          </div>

          <span
            style={{
              fontFamily: "monospace",
              fontSize: "11px",
              color: "var(--muted)",
            }}
          >
            STATUS: DRAFT (UNSEALED)
          </span>
        </div>
      )}

      {/* 2. Error / Notice Banners */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: "14px 18px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "var(--status-failed, #ef4444)",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>⚠</span>
          <strong style={{ fontWeight: 600 }}>{errorMessage}</strong>
        </div>
      )}

      {saveNotice && (
        <div
          role="status"
          style={{
            padding: "14px 18px",
            borderRadius: "8px",
            background: "rgba(215, 255, 63, 0.08)",
            border: "1px solid rgba(215, 255, 63, 0.25)",
            color: "var(--accent)",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span>✓</span>
          <span>{saveNotice}</span>
        </div>
      )}

      {/* 3. Individual Competitor Sheet */}
      {eventType === "individual" ? (
        <section style={{ display: "grid", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <p className="pegasus-eyebrow" style={{ margin: 0 }}>
                FIELD SCORE SHEET
              </p>
              <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "2px 0 0" }}>
                Competitors ({competitorEntries.length})
              </h2>
            </div>

            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              {pointClass
                ? `Class ${pointClass} points matrix active`
                : "Points ratified at verification"}
            </span>
          </div>

          {competitorEntries.length === 0 ? (
            <div
              className="pegasus-card"
              style={{
                textAlign: "center",
                padding: "48px 24px",
                color: "var(--muted)",
              }}
            >
              <p className="pegasus-eyebrow" style={{ color: "var(--muted)", margin: 0 }}>
                NO COMPETITORS
              </p>
              <h3 style={{ fontSize: "18px", fontWeight: 750, margin: "8px 0" }}>
                No participants registered for this event yet
              </h3>
              <p style={{ fontSize: "13px", maxWidth: "420px", margin: "0 auto" }}>
                Competitor registrations for this event are either pending team confirmation or unassigned in the database.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {competitorEntries.map((comp) => {
                const preview = getPreviewPoints(
                  pointClass,
                  comp.existingRank,
                  comp.existingDisposition || "normal",
                );

                return (
                  <article
                    key={comp.id}
                    className="pegasus-card"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "16px",
                      padding: "16px 20px",
                      background: "var(--surface)",
                      border: comp.existingRank === 1 ? "1px solid var(--accent)" : "1px solid var(--border)",
                      opacity: isLocked ? 0.85 : 1,
                    }}
                  >
                    {/* Athlete Identification */}
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: "220px" }}>
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "8px",
                          background: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid var(--border)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "14px",
                          fontWeight: 800,
                          color: "var(--accent)",
                          flexShrink: 0,
                        }}
                      >
                        #{comp.chestNumber || "—"}
                      </div>

                      <div>
                        <strong style={{ fontSize: "16px", display: "block" }}>
                          {comp.name}
                        </strong>
                        <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                          <span>{comp.teamName}</span>
                          <span> • </span>
                          <span>{comp.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Score Sheet Inputs */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-end",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Mark / Performance Input */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label
                          htmlFor={`mark-${comp.id}`}
                          style={{
                            fontSize: "10px",
                            fontWeight: 750,
                            letterSpacing: "0.06em",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          Mark / Time
                        </label>
                        <input
                          id={`mark-${comp.id}`}
                          type="text"
                          value={comp.existingPerformance || ""}
                          onChange={(e) =>
                            updateCompetitor(comp.id, "existingPerformance", e.target.value)
                          }
                          placeholder="e.g. 11.42s"
                          disabled={isLocked || isPending}
                          style={{
                            height: "44px",
                            minWidth: "110px",
                            padding: "0 12px",
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            color: "var(--foreground)",
                            fontSize: "15px",
                            fontFamily: "monospace",
                            outline: "none",
                            cursor: isLocked ? "not-allowed" : "text",
                          }}
                        />
                      </div>

                      {/* Position / Rank Input */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label
                          htmlFor={`pos-${comp.id}`}
                          style={{
                            fontSize: "10px",
                            fontWeight: 750,
                            letterSpacing: "0.06em",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          Rank
                        </label>
                        <input
                          id={`pos-${comp.id}`}
                          type="number"
                          min="1"
                          max={competitorEntries.length}
                          value={comp.existingRank ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value, 10) : null;
                            updateCompetitor(comp.id, "existingRank", val);
                          }}
                          placeholder="Pos"
                          disabled={isLocked || isPending}
                          style={{
                            height: "44px",
                            width: "74px",
                            padding: "0 10px",
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            color: "var(--foreground)",
                            fontSize: "15px",
                            fontFamily: "monospace",
                            textAlign: "center",
                            outline: "none",
                            cursor: isLocked ? "not-allowed" : "text",
                          }}
                        />
                      </div>

                      {/* Disposition Selector */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <label
                          htmlFor={`disp-${comp.id}`}
                          style={{
                            fontSize: "10px",
                            fontWeight: 750,
                            letterSpacing: "0.06em",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          Outcome
                        </label>
                        <select
                          id={`disp-${comp.id}`}
                          value={comp.existingDisposition || "normal"}
                          onChange={(e) =>
                            updateCompetitor(
                              comp.id,
                              "existingDisposition",
                              e.target.value as ResultDisposition,
                            )
                          }
                          disabled={isLocked || isPending}
                          style={{
                            height: "44px",
                            padding: "0 10px",
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            color: "var(--foreground)",
                            fontSize: "13px",
                            outline: "none",
                            cursor: isLocked ? "not-allowed" : "pointer",
                          }}
                        >
                          <option value="normal">Normal</option>
                          <option value="dns">DNS (Did Not Start)</option>
                          <option value="dnf">DNF (Did Not Finish)</option>
                          <option value="dq">DQ (Disqualified)</option>
                        </select>
                      </div>

                      {/* Projected Points Badge */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "90px" }}>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 750,
                            letterSpacing: "0.06em",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          Projected Pts
                        </span>
                        <div
                          style={{
                            height: "44px",
                            padding: "0 12px",
                            background:
                              preview.points && preview.points > 0
                                ? "rgba(215, 255, 63, 0.12)"
                                : "rgba(255, 255, 255, 0.03)",
                            border:
                              preview.points && preview.points > 0
                                ? "1px solid var(--accent)"
                                : "1px solid var(--border)",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "12px",
                            fontWeight: 750,
                            color:
                              preview.points && preview.points > 0
                                ? "var(--accent)"
                                : "var(--muted)",
                          }}
                        >
                          {preview.label}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        /* 4. Team Match Sheet */
        <section style={{ display: "grid", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <p className="pegasus-eyebrow" style={{ margin: 0 }}>
                MATCH RECORDING
              </p>
              <h2 style={{ fontSize: "20px", fontWeight: 800, margin: "2px 0 0" }}>
                Tournament Matchups ({fixtureEntries.length})
              </h2>
            </div>
          </div>

          {fixtureEntries.length === 0 ? (
            <div
              className="pegasus-card"
              style={{
                textAlign: "center",
                padding: "48px 24px",
                color: "var(--muted)",
              }}
            >
              <p className="pegasus-eyebrow" style={{ color: "var(--muted)", margin: 0 }}>
                MATCHUPS PENDING
              </p>
              <h3 style={{ fontSize: "18px", fontWeight: 750, margin: "8px 0" }}>
                No fixtures drawn for this event yet
              </h3>
              <p style={{ fontSize: "13px", maxWidth: "420px", margin: "0 auto" }}>
                Tournament court allocations and fixtures will appear once drawn by the technical committee.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {fixtureEntries.map((fixture) => {
                const outcome = resolveMatchOutcome({
                  homeTeamId: fixture.homeTeamId,
                  awayTeamId: fixture.awayTeamId,
                  scoreHome: fixture.scoreHome,
                  scoreAway: fixture.scoreAway,
                  round: fixture.round,
                });

                const isHomeWinner =
                  outcome.isComplete &&
                  outcome.winnerTeamId === fixture.homeTeamId;
                const isAwayWinner =
                  outcome.isComplete &&
                  outcome.winnerTeamId === fixture.awayTeamId;

                const homeRank = outcome.isComplete
                  ? isHomeWinner
                    ? outcome.winnerRank
                    : outcome.loserRank
                  : null;
                const awayRank = outcome.isComplete
                  ? isAwayWinner
                    ? outcome.winnerRank
                    : outcome.loserRank
                  : null;

                const homePointsPreview = getPreviewPoints(
                  pointClass,
                  homeRank,
                  "normal",
                );
                const awayPointsPreview = getPreviewPoints(
                  pointClass,
                  awayRank,
                  "normal",
                );

                return (
                  <article
                    key={fixture.id}
                    className="pegasus-card"
                    style={{
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                      border: outcome.isComplete
                        ? "1px solid var(--accent)"
                        : "1px solid var(--border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: "10px",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                        {fixture.venueName ?? "Venue TBD"} • {fixture.round ?? "Match"}
                      </span>
                      <span className="pegasus-status pegasus-status--upcoming">
                        <span className="pegasus-status__dot" />
                        {fixture.status.toUpperCase()}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "20px",
                      }}
                    >
                      {/* Home Team */}
                      <div style={{ flex: 1, minWidth: "140px" }}>
                        <strong style={{ fontSize: "18px", display: "block" }}>
                          {fixture.homeTeamName}
                        </strong>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {fixture.homeTeamCode}
                        </span>
                      </div>

                      {/* Score Inputs */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <input
                          type="number"
                          min="0"
                          value={fixture.scoreHome ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value, 10) : null;
                            updateFixtureScore(fixture.id, "scoreHome", val);
                          }}
                          disabled={isLocked || isPending}
                          placeholder="0"
                          style={{
                            height: "48px",
                            width: "60px",
                            textAlign: "center",
                            fontSize: "20px",
                            fontWeight: 800,
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            color: "var(--foreground)",
                            fontFamily: "monospace",
                          }}
                        />
                        <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--muted)" }}>
                          :
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={fixture.scoreAway ?? ""}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value, 10) : null;
                            updateFixtureScore(fixture.id, "scoreAway", val);
                          }}
                          disabled={isLocked || isPending}
                          placeholder="0"
                          style={{
                            height: "48px",
                            width: "60px",
                            textAlign: "center",
                            fontSize: "20px",
                            fontWeight: 800,
                            background: "var(--surface-raised)",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            color: "var(--foreground)",
                            fontFamily: "monospace",
                          }}
                        />
                      </div>

                      {/* Away Team */}
                      <div style={{ flex: 1, minWidth: "140px", textAlign: "right" }}>
                        <strong style={{ fontSize: "18px", display: "block" }}>
                          {fixture.awayTeamName}
                        </strong>
                        <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {fixture.awayTeamCode}
                        </span>
                      </div>
                    </div>

                    {/* Live Match Outcome Projection */}
                    {outcome.isComplete && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "rgba(255, 255, 255, 0.03)",
                          padding: "8px 14px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          borderTop: "1px solid var(--border)",
                        }}
                      >
                        <span style={{ color: isHomeWinner ? "var(--accent)" : "var(--muted)" }}>
                          {isHomeWinner ? "🏆 Winner" : "Runner-up"}: Rank {homeRank} ({homePointsPreview.label})
                        </span>
                        <span style={{ color: isAwayWinner ? "var(--accent)" : "var(--muted)" }}>
                          {isAwayWinner ? "🏆 Winner" : "Runner-up"}: Rank {awayRank} ({awayPointsPreview.label})
                        </span>
                      </div>
                    )}
                    {outcome.isDraw && (
                      <div
                        style={{
                          textAlign: "center",
                          background: "rgba(255, 255, 255, 0.03)",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          color: "var(--muted)",
                          borderTop: "1px solid var(--border)",
                        }}
                      >
                        Match score tied — Awaiting tiebreaker / shootout resolution
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* 5. Field Operations Action Bar */}
      {!isLocked && (
        <section
          className="pegasus-card"
          style={{
            marginTop: "16px",
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div>
            <strong style={{ fontSize: "15px", display: "block" }}>
              Field Score Sheet Operations
            </strong>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Save drafts incrementally or submit official outcomes to the Chief Scorer verification queue.
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isPending}
              className="pegasus-button pegasus-button--subtle"
              style={{ minHeight: "44px", padding: "0 20px" }}
            >
              {isPending ? "Saving..." : "Save Draft"}
            </button>

            <button
              type="button"
              onClick={handleOpenSubmitModal}
              disabled={isPending}
              className="pegasus-button pegasus-button--primary"
              style={{ minHeight: "44px", padding: "0 24px" }}
            >
              Submit to Chief Scorer <span>→</span>
            </button>
          </div>
        </section>
      )}

      {/* 6. Confirmation Modal for Irreversible Submission */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              maxWidth: "520px",
              width: "100%",
              padding: "28px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <p className="pegasus-eyebrow" style={{ color: "var(--status-pending)", margin: 0 }}>
              OFFICIAL FIELD PROTOCOL
            </p>
            <h2 id="modal-title" style={{ fontSize: "20px", fontWeight: 800, margin: "6px 0 12px" }}>
              Confirm Official Result Submission
            </h2>

            <p style={{ fontSize: "14px", color: "var(--muted)", lineHeight: 1.6, margin: "0 0 16px" }}>
              You are submitting official results for <strong style={{ color: "var(--foreground)" }}>{eventName}</strong> ({eventSport} • {eventCategory}).
            </p>


            <div
              style={{
                padding: "14px 16px",
                background: "rgba(251, 191, 36, 0.08)",
                border: "1px solid rgba(251, 191, 36, 0.25)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "var(--foreground)",
                lineHeight: 1.6,
                marginBottom: "20px",
              }}
            >
              <strong style={{ color: "var(--status-pending)", display: "block", marginBottom: "4px" }}>
                Notice: Irreversible Field Submission
              </strong>
              Once submitted, this score sheet will be sealed and locked. Results transition to &quot;submitted&quot; status and route to the Chief Scorer for audit and verification. Field edits will no longer be permitted.
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="judge-name-input"
                style={{
                  fontSize: "11px",
                  fontWeight: 750,
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  display: "block",
                  marginBottom: "6px",
                }}
              >
                Submitting Referee / Desk Name
              </label>
              <input
                id="judge-name-input"
                type="text"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                placeholder="e.g. Field Referee 1"
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 12px",
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--foreground)",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="pegasus-button pegasus-button--subtle"
                style={{ minHeight: "44px", padding: "0 20px" }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isPending || !submittedBy.trim()}
                className="pegasus-button pegasus-button--primary"
                style={{ minHeight: "44px", padding: "0 24px" }}
              >
                {isPending ? "Submitting..." : "Confirm & Submit to Chief Scorer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

