"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateCompetitionAction,
  updateCompetitionStatusAction,
  createFixtureAction,
  updateFixtureAction,
  updateFixtureStatusAction,
  updateFixtureScoreAction,
  generateKnockoutFixturesAction,
} from "@/app/admin/actions";
import type {
  CompetitionRow,
  EventRow,
  DivisionRow,
  FixtureRow,
  TeamRow,
  ParticipantRow,
  VenueRow,
  CompetitionChangeRow,
} from "@/lib/repositories";
import type { CompetitionFormat, CompetitionStatus, FixtureStatus } from "@/lib/types";

interface AdminCompetitionDetailClientProps {
  festivalId: string;
  competition: CompetitionRow;
  event: EventRow | null;
  division: DivisionRow | null;
  initialFixtures: FixtureRow[];
  teams: TeamRow[];
  participants: ParticipantRow[];
  venues: VenueRow[];
  auditEntries: CompetitionChangeRow[];
}

export default function AdminCompetitionDetailClient({
  competition,
  event,
  division,
  initialFixtures,
  teams,
  participants,
  venues,
  auditEntries,
}: AdminCompetitionDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"fixtures" | "entrants" | "audit">("fixtures");

  // Notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddFixtureModalOpen, setIsAddFixtureModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [editingFixture, setEditingFixture] = useState<FixtureRow | null>(null);

  // Status Change Dialog
  const [statusConfirm, setStatusConfirm] = useState<CompetitionStatus | null>(null);
  const [statusReason, setStatusReason] = useState("");

  // Edit Form state
  const [editForm, setEditForm] = useState({
    name: competition.name,
    format: competition.format,
    roundName: competition.round_name || "",
  });

  // Add Fixture state
  const [addFixtureForm, setAddFixtureForm] = useState({
    homeTeamId: "",
    awayTeamId: "",
    round: competition.round_name || "Matchup",
    scheduledAt: "",
    venueId: "",
  });

  // Generate Fixtures state
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(teams.map((t) => t.id));
  const [generateRoundName, setGenerateRoundName] = useState(
    teams.length === 8 ? "Quarter Finals" : teams.length === 4 ? "Semi Finals" : "Round 1"
  );

  // Inline fixture score editing state
  const [scoreInputs, setScoreInputs] = useState<
    Record<string, { home: string; away: string }>
  >(() => {
    const initial: Record<string, { home: string; away: string }> = {};
    initialFixtures.forEach((f) => {
      initial[f.id] = {
        home: f.score_home !== null && f.score_home !== undefined ? String(f.score_home) : "",
        away: f.score_away !== null && f.score_away !== undefined ? String(f.score_away) : "",
      };
    });
    return initial;
  });

  // Maps
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const venueMap = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);

  const isTerminal = competition.status === "completed" || competition.status === "cancelled";

  // Handle Competition Metadata Update
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setFeedback({ type: "error", message: "Name is required." });
      return;
    }

    startTransition(async () => {
      const res = await updateCompetitionAction({
        competitionId: competition.id,
        name: editForm.name.trim(),
        format: editForm.format,
        roundName: editForm.roundName.trim() || null,
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Competition updated successfully." });
        setIsEditModalOpen(false);
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update competition." });
      }
    });
  };

  // Handle Lifecycle Status Transition
  const handleStatusTransition = (newStatus: CompetitionStatus) => {
    startTransition(async () => {
      const res = await updateCompetitionStatusAction(
        competition.id,
        newStatus,
        statusReason.trim() || undefined
      );

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Competition status transitioned to ${newStatus.toUpperCase()}.`,
        });
        setStatusConfirm(null);
        setStatusReason("");
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to transition status.",
        });
      }
    });
  };

  // Handle Create Fixture
  const handleAddFixtureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addFixtureForm.homeTeamId && addFixtureForm.awayTeamId && addFixtureForm.homeTeamId === addFixtureForm.awayTeamId) {
      setFeedback({ type: "error", message: "Home and Away teams cannot be the same." });
      return;
    }

    startTransition(async () => {
      const res = await createFixtureAction({
        competitionId: competition.id,
        homeTeamId: addFixtureForm.homeTeamId || null,
        awayTeamId: addFixtureForm.awayTeamId || null,
        scheduledAt: addFixtureForm.scheduledAt || null,
        venueId: addFixtureForm.venueId || null,
        metadata: {
          round: addFixtureForm.round.trim() || "Matchup",
        },
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Fixture added successfully." });
        setIsAddFixtureModalOpen(false);
        setAddFixtureForm({
          homeTeamId: "",
          awayTeamId: "",
          round: competition.round_name || "Matchup",
          scheduledAt: "",
          venueId: "",
        });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to add fixture." });
      }
    });
  };

  // Handle Edit Fixture
  const handleUpdateFixtureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFixture) return;

    startTransition(async () => {
      const res = await updateFixtureAction(competition.id, {
        fixtureId: editingFixture.id,
        homeTeamId: editingFixture.home_team_id,
        awayTeamId: editingFixture.away_team_id,
        scheduledAt: editingFixture.scheduled_at,
        venueId: editingFixture.venue_id,
        status: editingFixture.status,
        metadata: editingFixture.metadata,
      });

      if (res.success) {
        setFeedback({ type: "success", message: "Fixture details updated." });
        setEditingFixture(null);
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update fixture." });
      }
    });
  };

  // Handle Fixture Score Save
  const handleSaveScore = (fixtureId: string) => {
    const input = scoreInputs[fixtureId];
    if (!input) return;

    const homeVal = input.home.trim() === "" ? null : Number(input.home);
    const awayVal = input.away.trim() === "" ? null : Number(input.away);

    if (homeVal !== null && (isNaN(homeVal) || homeVal < 0)) {
      setFeedback({ type: "error", message: "Home score must be a non-negative number." });
      return;
    }
    if (awayVal !== null && (isNaN(awayVal) || awayVal < 0)) {
      setFeedback({ type: "error", message: "Away score must be a non-negative number." });
      return;
    }

    startTransition(async () => {
      const res = await updateFixtureScoreAction(competition.id, fixtureId, homeVal, awayVal);
      if (res.success) {
        setFeedback({ type: "success", message: "Operational match score recorded." });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to record score." });
      }
    });
  };

  // Handle Fixture Status Change
  const handleFixtureStatusChange = (fixtureId: string, newStatus: FixtureStatus) => {
    startTransition(async () => {
      const res = await updateFixtureStatusAction(competition.id, fixtureId, newStatus);
      if (res.success) {
        setFeedback({ type: "success", message: `Fixture status updated to ${newStatus.toUpperCase()}.` });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to update status." });
      }
    });
  };

  // Handle Knockout Generation
  const handleGenerateKnockout = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTeamIds.length < 2) {
      setFeedback({ type: "error", message: "Select at least 2 teams to generate fixtures." });
      return;
    }
    if (selectedTeamIds.length % 2 !== 0) {
      setFeedback({
        type: "error",
        message: `Manual fixture setup required for this entrant count (odd count: ${selectedTeamIds.length}). Automated knockout pairings require an even number of entrants.`,
      });
      return;
    }

    startTransition(async () => {
      const res = await generateKnockoutFixturesAction(
        competition.id,
        selectedTeamIds,
        generateRoundName.trim() || "Round 1"
      );

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Generated ${res.count} knockout fixtures for ${generateRoundName}.`,
        });
        setIsGenerateModalOpen(false);
        router.refresh();
      } else {
        setFeedback({ type: "error", message: res.error || "Failed to generate fixtures." });
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
      {/* Back Link */}
      <div style={{ marginBottom: "16px" }}>
        <Link
          href="/admin/competitions"
          className="pegasus-button pegasus-button--subtle"
          style={{ padding: "4px 10px", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span>←</span>
          <span>Back to Competitions</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div
        className="pegasus-card"
        style={{
          padding: "24px",
          marginBottom: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
            <span
              style={{
                padding: "3px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                ...getStatusBadgeStyle(competition.status),
              }}
            >
              {competition.status}
            </span>
            <span
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                color: "var(--accent)",
              }}
            >
              {competition.format}
            </span>
            {competition.round_name && (
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                Stage: {competition.round_name}
              </span>
            )}
          </div>

          <h1 className="pegasus-page-title" style={{ margin: "4px 0 6px" }}>
            {competition.name}
          </h1>

          <div style={{ fontSize: "13px", color: "var(--muted)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <span>
              <strong>Event:</strong> {event ? event.name : competition.event_id}
            </span>
            <span>
              <strong>Division:</strong> {division ? `${division.name} (${division.code})` : "Open / All"}
            </span>
            <span>
              <strong>Fixtures:</strong> {initialFixtures.length}
            </span>
          </div>
        </div>

        {/* Lifecycle Action Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          {!isTerminal && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="pegasus-button pegasus-button--subtle"
              style={{ fontSize: "13px", padding: "6px 12px" }}
            >
              Edit Details
            </button>
          )}

          {/* Draft -> Ready */}
          {(competition.status === "draft" || competition.status === "scheduled") && (
            <button
              type="button"
              onClick={() => setStatusConfirm("ready")}
              className="pegasus-button pegasus-button--primary"
              style={{ background: "#10b981", borderColor: "#10b981", color: "#000", fontSize: "13px", padding: "6px 14px", fontWeight: 700 }}
            >
              Mark Ready
            </button>
          )}

          {/* Ready -> Live or Revert to Draft */}
          {competition.status === "ready" && (
            <>
              <button
                type="button"
                onClick={() => setStatusConfirm("live")}
                className="pegasus-button pegasus-button--primary"
                style={{ background: "#ef4444", borderColor: "#ef4444", fontSize: "13px", padding: "6px 14px", fontWeight: 700 }}
              >
                Start Competition (Live)
              </button>
              <button
                type="button"
                onClick={() => setStatusConfirm("draft")}
                className="pegasus-button pegasus-button--subtle"
                style={{ fontSize: "13px", padding: "6px 12px" }}
              >
                Revert to Draft
              </button>
            </>
          )}

          {/* Live -> Completed */}
          {competition.status === "live" && (
            <button
              type="button"
              onClick={() => setStatusConfirm("completed")}
              className="pegasus-button pegasus-button--primary"
              style={{ background: "#d7ff3f", borderColor: "#d7ff3f", color: "#000", fontSize: "13px", padding: "6px 14px", fontWeight: 700 }}
            >
              Complete Competition
            </button>
          )}

          {/* Cancel button */}
          {!isTerminal && (
            <button
              type="button"
              onClick={() => setStatusConfirm("cancelled")}
              className="pegasus-button pegasus-button--subtle"
              style={{ color: "#ef4444", fontSize: "13px", padding: "6px 12px" }}
            >
              Cancel
            </button>
          )}
        </div>
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

      {/* Tab Navigation */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "20px",
          paddingBottom: "8px",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("fixtures")}
          style={{
            background: activeTab === "fixtures" ? "rgba(255, 255, 255, 0.08)" : "transparent",
            color: activeTab === "fixtures" ? "var(--accent)" : "var(--muted)",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Fixtures & Matchups ({initialFixtures.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("entrants")}
          style={{
            background: activeTab === "entrants" ? "rgba(255, 255, 255, 0.08)" : "transparent",
            color: activeTab === "entrants" ? "var(--accent)" : "var(--muted)",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Eligible Entrants ({participants.length > 0 ? participants.length : teams.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          style={{
            background: activeTab === "audit" ? "rgba(255, 255, 255, 0.08)" : "transparent",
            color: activeTab === "audit" ? "var(--accent)" : "var(--muted)",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Audit History ({auditEntries.length})
        </button>
      </div>

      {/* TAB 1: FIXTURES */}
      {activeTab === "fixtures" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 700 }}>
              Operational Matchups & Heat Cards
            </div>

            {!isTerminal && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsAddFixtureModalOpen(true)}
                  className="pegasus-button pegasus-button--subtle"
                  style={{ fontSize: "13px", padding: "6px 12px" }}
                >
                  + Add Single Fixture
                </button>
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="pegasus-button pegasus-button--primary"
                  style={{ fontSize: "13px", padding: "6px 14px", fontWeight: 700 }}
                >
                  ⚡ Generate Knockout Pairs
                </button>
              </div>
            )}
          </div>

          {initialFixtures.length === 0 ? (
            <div
              className="pegasus-card"
              style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}
            >
              <span style={{ fontSize: "32px", display: "block", marginBottom: "8px" }}>🏟️</span>
              <strong style={{ display: "block", fontSize: "16px", color: "var(--foreground)" }}>
                No fixtures configured yet
              </strong>
              <p style={{ margin: "4px 0 16px", fontSize: "13px" }}>
                Use &ldquo;Generate Knockout Pairs&rdquo; or &ldquo;Add Single Fixture&rdquo; to configure match pairings.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "16px" }}>
              {initialFixtures.map((fixture, index) => {
                const homeTeam = fixture.home_team_id ? teamMap.get(fixture.home_team_id) : null;
                const awayTeam = fixture.away_team_id ? teamMap.get(fixture.away_team_id) : null;
                const venue = fixture.venue_id ? venueMap.get(fixture.venue_id) : null;
                const roundLabel = (fixture.metadata?.round as string) || `Match ${index + 1}`;
                const scores = scoreInputs[fixture.id] || { home: "", away: "" };

                return (
                  <article
                    key={fixture.id}
                    className="pegasus-card"
                    style={{
                      padding: "20px",
                      borderLeft: `4px solid ${
                        fixture.status === "live"
                          ? "#ef4444"
                          : fixture.status === "finished"
                          ? "#10b981"
                          : "var(--border)"
                      }`,
                    }}
                  >
                    {/* Fixture Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: "10px",
                        marginBottom: "14px",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "14px", color: "var(--accent)" }}>
                          {roundLabel}
                        </strong>
                        {venue && (
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            • 📍 {venue.name}
                          </span>
                        )}
                        {fixture.scheduled_at && (
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            • 🕒 {new Date(fixture.scheduled_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                          type="button"
                          onClick={() => setEditingFixture(fixture)}
                          className="pegasus-button pegasus-button--subtle"
                          style={{ padding: "2px 8px", fontSize: "11px" }}
                        >
                          Edit
                        </button>
                        <select
                          value={fixture.status}
                          onChange={(e) =>
                            handleFixtureStatusChange(fixture.id, e.target.value as FixtureStatus)
                          }
                          disabled={isPending}
                          className="pegasus-select"
                          style={{ fontSize: "11px", padding: "3px 8px", height: "auto" }}
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="live">Live</option>
                          <option value="finished">Finished</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* Matchup Teams & Live Scores */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto 1fr",
                        alignItems: "center",
                        gap: "16px",
                        textAlign: "center",
                      }}
                    >
                      {/* Home Team */}
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "16px", fontWeight: 800 }}>
                          {homeTeam ? homeTeam.name : "TBD (Home)"}
                        </div>
                        {homeTeam?.code && (
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {homeTeam.code}
                          </span>
                        )}
                      </div>

                      {/* Operational Score Box */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "rgba(255, 255, 255, 0.04)",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <input
                          type="number"
                          value={scores.home}
                          onChange={(e) =>
                            setScoreInputs({
                              ...scoreInputs,
                              [fixture.id]: { ...scores, home: e.target.value },
                            })
                          }
                          placeholder="-"
                          style={{
                            width: "44px",
                            textAlign: "center",
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid var(--border)",
                            color: "var(--foreground)",
                            borderRadius: "4px",
                            fontSize: "16px",
                            fontWeight: 800,
                            padding: "4px",
                          }}
                        />
                        <span style={{ fontWeight: 800, color: "var(--muted)" }}>:</span>
                        <input
                          type="number"
                          value={scores.away}
                          onChange={(e) =>
                            setScoreInputs({
                              ...scoreInputs,
                              [fixture.id]: { ...scores, away: e.target.value },
                            })
                          }
                          placeholder="-"
                          style={{
                            width: "44px",
                            textAlign: "center",
                            background: "rgba(0,0,0,0.4)",
                            border: "1px solid var(--border)",
                            color: "var(--foreground)",
                            borderRadius: "4px",
                            fontSize: "16px",
                            fontWeight: 800,
                            padding: "4px",
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => handleSaveScore(fixture.id)}
                          disabled={isPending}
                          className="pegasus-button pegasus-button--subtle"
                          style={{ fontSize: "11px", padding: "4px 8px" }}
                          title="Save operational match score"
                        >
                          Save
                        </button>
                      </div>

                      {/* Away Team */}
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "16px", fontWeight: 800 }}>
                          {awayTeam ? awayTeam.name : "TBD (Away)"}
                        </div>
                        {awayTeam?.code && (
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {awayTeam.code}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "12px",
                        fontSize: "11px",
                        color: "var(--muted)",
                        fontStyle: "italic",
                        textAlign: "center",
                      }}
                    >
                      * Live operational score tracking. Official result verification occurs via the Result Desk.
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ENTRANTS */}
      {activeTab === "entrants" && (
        <div className="pegasus-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <strong style={{ fontSize: "14px" }}>
              Verified Event Registrations & Rosters
            </strong>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
              Eligible entrants for {event?.name || "this event"} derived from official registrations.
            </p>
          </div>

          {participants.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left" }}>Chest #</th>
                  <th style={{ padding: "10px 16px", textAlign: "left" }}>Athlete Name</th>
                  <th style={{ padding: "10px 16px", textAlign: "left" }}>House / Team</th>
                  <th style={{ padding: "10px 16px", textAlign: "left" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const t = p.team_id ? teamMap.get(p.team_id) : null;
                  return (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 700 }}>
                        {p.chest_number || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>
                        {p.name}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {t ? t.name : "Unassigned"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: "11px", color: "#10b981", textTransform: "uppercase" }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "16px" }}>
              <strong style={{ display: "block", marginBottom: "8px" }}>Teams in Festival:</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                {teams.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: "10px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <strong>{t.name}</strong>
                    <span style={{ marginLeft: "6px", fontSize: "11px", color: "var(--muted)" }}>
                      ({t.code})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT */}
      {activeTab === "audit" && (
        <div className="pegasus-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
            <strong style={{ fontSize: "14px" }}>Competition Change History</strong>
          </div>

          {auditEntries.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
              No recorded change events for this competition.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", color: "var(--muted)", textTransform: "uppercase", fontSize: "11px" }}>
                  <th style={{ padding: "10px 16px", textAlign: "left" }}>Timestamp</th>
                  <th style={{ padding: "10px 16px", textAlign: "left" }}>Action</th>
                  <th style={{ padding: "10px 16px", textAlign: "left" }}>Reason / Summary</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 16px", color: "var(--muted)" }}>
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 16px", fontWeight: 700 }}>
                      {a.action}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      {a.reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* STATUS TRANSITION CONFIRM MODAL */}
      {/* ============================================================ */}
      {statusConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div className="pegasus-card" style={{ maxWidth: "480px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>
              Confirm Status Transition → {statusConfirm.toUpperCase()}
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--muted)" }}>
              Are you sure you want to transition this competition from <strong>{competition.status}</strong> to{" "}
              <strong>{statusConfirm}</strong>?
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                Operational Reason (Optional)
              </label>
              <input
                type="text"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g., Fixtures verified, Ready for court entry"
                className="pegasus-input"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setStatusConfirm(null)}
                disabled={isPending}
                className="pegasus-button pegasus-button--subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusTransition(statusConfirm)}
                disabled={isPending}
                className="pegasus-button pegasus-button--primary"
              >
                {isPending ? "Transitioning..." : "Confirm Transition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD FIXTURE MODAL */}
      {/* ============================================================ */}
      {isAddFixtureModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div className="pegasus-card" style={{ maxWidth: "520px", width: "100%", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>Add Fixture Matchup</h3>
              <button
                type="button"
                onClick={() => setIsAddFixtureModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFixtureSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Round / Match Label *
                  </label>
                  <input
                    type="text"
                    value={addFixtureForm.round}
                    onChange={(e) => setAddFixtureForm({ ...addFixtureForm, round: e.target.value })}
                    required
                    placeholder="e.g. Semi Final 1, Heat 2"
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Home Team (Side A)
                    </label>
                    <select
                      value={addFixtureForm.homeTeamId}
                      onChange={(e) => setAddFixtureForm({ ...addFixtureForm, homeTeamId: e.target.value })}
                      className="pegasus-select"
                      style={{ width: "100%" }}
                    >
                      <option value="">TBD / Open</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Away Team (Side B)
                    </label>
                    <select
                      value={addFixtureForm.awayTeamId}
                      onChange={(e) => setAddFixtureForm({ ...addFixtureForm, awayTeamId: e.target.value })}
                      className="pegasus-select"
                      style={{ width: "100%" }}
                    >
                      <option value="">TBD / Open</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Venue / Court
                  </label>
                  <select
                    value={addFixtureForm.venueId}
                    onChange={(e) => setAddFixtureForm({ ...addFixtureForm, venueId: e.target.value })}
                    className="pegasus-select"
                    style={{ width: "100%" }}
                  >
                    <option value="">Venue Allocation Pending</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Scheduled Time
                  </label>
                  <input
                    type="datetime-local"
                    value={addFixtureForm.scheduledAt}
                    onChange={(e) => setAddFixtureForm({ ...addFixtureForm, scheduledAt: e.target.value })}
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setIsAddFixtureModalOpen(false)}
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
                    {isPending ? "Adding..." : "Add Fixture"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* GENERATE KNOCKOUT FIXTURES MODAL */}
      {/* ============================================================ */}
      {isGenerateModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div className="pegasus-card" style={{ maxWidth: "520px", width: "100%", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                Generate Knockout Fixtures
              </h3>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateKnockout}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Round Name *
                  </label>
                  <input
                    type="text"
                    value={generateRoundName}
                    onChange={(e) => setGenerateRoundName(e.target.value)}
                    required
                    placeholder="e.g. Quarter Finals, Semi Finals"
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>
                      Select Participating Teams ({selectedTeamIds.length} selected)
                    </label>
                    <div style={{ fontSize: "11px", display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedTeamIds(teams.map((t) => t.id))}
                        className="pegasus-button pegasus-button--subtle"
                        style={{ padding: "2px 6px", fontSize: "10px" }}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTeamIds([])}
                        className="pegasus-button pegasus-button--subtle"
                        style={{ padding: "2px 6px", fontSize: "10px" }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: "180px",
                      overflowY: "auto",
                      border: "1px solid var(--border)",
                      borderRadius: "6px",
                      padding: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {teams.map((t) => {
                      const isSelected = selectedTeamIds.includes(t.id);
                      return (
                        <label
                          key={t.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                            cursor: "pointer",
                            padding: "4px 6px",
                            borderRadius: "4px",
                            background: isSelected ? "rgba(255,255,255,0.04)" : "transparent",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTeamIds([...selectedTeamIds, t.id]);
                              } else {
                                setSelectedTeamIds(selectedTeamIds.filter((id) => id !== t.id));
                              }
                            }}
                          />
                          <span>{t.name}</span>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>({t.code})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {selectedTeamIds.length % 2 !== 0 && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "4px",
                      padding: "10px",
                      fontSize: "12px",
                      color: "#ef4444",
                    }}
                  >
                    ⚠️ Selected count is odd ({selectedTeamIds.length}). Knockout generation requires an even count of entrants.
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setIsGenerateModalOpen(false)}
                    disabled={isPending}
                    className="pegasus-button pegasus-button--subtle"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || selectedTeamIds.length < 2 || selectedTeamIds.length % 2 !== 0}
                    className="pegasus-button pegasus-button--primary"
                  >
                    {isPending ? "Generating..." : "Generate Matches"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT COMPETITION MODAL */}
      {/* ============================================================ */}
      {isEditModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div className="pegasus-card" style={{ maxWidth: "480px", width: "100%", padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px", fontWeight: 800 }}>
              Edit Competition Details
            </h3>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Competition Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Tournament Format *
                  </label>
                  <select
                    value={editForm.format}
                    onChange={(e) =>
                      setEditForm({ ...editForm, format: e.target.value as CompetitionFormat })
                    }
                    className="pegasus-select"
                    style={{ width: "100%" }}
                  >
                    <option value="knockout">Knockout</option>
                    <option value="heats">Heats</option>
                    <option value="final">Final</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="match">Single Match</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Stage / Round Tag
                  </label>
                  <input
                    type="text"
                    value={editForm.roundName}
                    onChange={(e) => setEditForm({ ...editForm, roundName: e.target.value })}
                    placeholder="e.g. Main Championship"
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
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
                    {isPending ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT FIXTURE MODAL */}
      {/* ============================================================ */}
      {editingFixture && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div className="pegasus-card" style={{ maxWidth: "520px", width: "100%", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>Edit Fixture Matchup</h3>
              <button
                type="button"
                onClick={() => setEditingFixture(null)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateFixtureSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Round / Match Label
                  </label>
                  <input
                    type="text"
                    value={(editingFixture.metadata?.round as string) || ""}
                    onChange={(e) =>
                      setEditingFixture({
                        ...editingFixture,
                        metadata: { ...editingFixture.metadata, round: e.target.value },
                      })
                    }
                    placeholder="e.g. Semi Final 1"
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Home Team (Side A)
                    </label>
                    <select
                      value={editingFixture.home_team_id || ""}
                      onChange={(e) =>
                        setEditingFixture({
                          ...editingFixture,
                          home_team_id: e.target.value || null,
                        })
                      }
                      className="pegasus-select"
                      style={{ width: "100%" }}
                    >
                      <option value="">TBD / Open</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                      Away Team (Side B)
                    </label>
                    <select
                      value={editingFixture.away_team_id || ""}
                      onChange={(e) =>
                        setEditingFixture({
                          ...editingFixture,
                          away_team_id: e.target.value || null,
                        })
                      }
                      className="pegasus-select"
                      style={{ width: "100%" }}
                    >
                      <option value="">TBD / Open</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Venue / Court
                  </label>
                  <select
                    value={editingFixture.venue_id || ""}
                    onChange={(e) =>
                      setEditingFixture({
                        ...editingFixture,
                        venue_id: e.target.value || null,
                      })
                    }
                    className="pegasus-select"
                    style={{ width: "100%" }}
                  >
                    <option value="">Venue Allocation Pending</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Scheduled Time
                  </label>
                  <input
                    type="datetime-local"
                    value={
                      editingFixture.scheduled_at
                        ? new Date(editingFixture.scheduled_at).toISOString().slice(0, 16)
                        : ""
                    }
                    onChange={(e) =>
                      setEditingFixture({
                        ...editingFixture,
                        scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setEditingFixture(null)}
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
                    {isPending ? "Saving..." : "Save Fixture"}
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
