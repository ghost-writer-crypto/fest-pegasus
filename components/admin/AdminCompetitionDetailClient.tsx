"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  ArrowLeft,
  Sparkles,
  Plus,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  Users,
} from "lucide-react";
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
  festivalId: _festivalId,
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
    <div className="zenithrow-competition-page">
      <style>{`
        .zenithrow-competition-page {
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
          max-width: 1380px;
          margin: 0 auto;
          padding: 24px 20px 48px;
          color: var(--fg);
          font-family: Inter, system-ui, -apple-system, sans-serif;
        }

        .zenithrow-competition-page .top-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .zenithrow-competition-page .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line);
          border-radius: 9px;
          color: var(--muted);
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.18s ease;
        }
        .zenithrow-competition-page .back-link:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border-color: var(--line2);
        }

        .zenithrow-competition-page .kicker {
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.16em;
          color: var(--red);
          text-transform: uppercase;
          margin-bottom: 6px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }

        .zenithrow-competition-page .header-card {
          background: linear-gradient(145deg, rgba(20, 24, 30, 0.92), rgba(10, 12, 15, 0.98));
          border: 1px solid var(--line);
          border-radius: 20px;
          padding: 24px 28px;
          margin-bottom: 22px;
          box-shadow: 0 16px 45px rgba(0, 0, 0, 0.35);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 20px;
        }

        .zenithrow-competition-page .title {
          font-size: 28px;
          font-weight: 850;
          letter-spacing: -0.03em;
          margin: 4px 0 8px;
          color: #fff;
        }

        .zenithrow-competition-page .meta-tags {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 12px;
          color: var(--muted);
        }
        .zenithrow-competition-page .meta-tag {
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--line);
          border-radius: 7px;
          font-size: 11px;
        }
        .zenithrow-competition-page .meta-tag strong {
          color: #e2e8f0;
        }

        .zenithrow-competition-page .btn {
          height: 34px;
          border-radius: 9px;
          border: 1px solid var(--line);
          background: #11151a;
          color: #dce2ea;
          padding: 0 12px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.18s ease;
          text-decoration: none;
        }
        .zenithrow-competition-page .btn:hover:not(:disabled) {
          background: #191f26;
          border-color: var(--line2);
          transform: translateY(-1px);
        }
        .zenithrow-competition-page .btn-primary {
          background: var(--red) !important;
          border-color: var(--red) !important;
          color: #fff !important;
        }
        .zenithrow-competition-page .btn-primary:hover:not(:disabled) {
          filter: brightness(1.1);
        }
        .zenithrow-competition-page .btn-ready {
          background: var(--green) !important;
          border-color: var(--green) !important;
          color: #000 !important;
        }
        .zenithrow-competition-page .btn-complete {
          background: #d7ff3f !important;
          border-color: #d7ff3f !important;
          color: #000 !important;
        }
        .zenithrow-competition-page .btn-danger {
          color: #ef4444 !important;
          border-color: rgba(239, 68, 68, 0.25) !important;
        }
        .zenithrow-competition-page .btn-danger:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.08) !important;
        }

        .zenithrow-competition-page .tabs-nav {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid var(--line);
          margin-bottom: 22px;
          padding-bottom: 8px;
        }
        .zenithrow-competition-page .tab-button {
          background: transparent;
          border: 1px solid transparent;
          border-radius: 9px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 750;
          color: var(--muted);
          cursor: pointer;
          transition: all 0.18s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .zenithrow-competition-page .tab-button:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.03);
        }
        .zenithrow-competition-page .tab-button.active {
          background: rgba(255, 255, 255, 0.07);
          border-color: var(--line);
          color: #fff;
        }

        .zenithrow-competition-page .card {
          background: rgba(14, 17, 21, 0.85);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        .zenithrow-competition-page .fixture-card {
          background: linear-gradient(180deg, #111419, #0d0f12);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 18px 20px;
          transition: border-color 0.18s ease;
        }
        .zenithrow-competition-page .fixture-card:hover {
          border-color: var(--line2);
        }

        .zenithrow-competition-page .score-box {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.04);
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--line);
        }
        .zenithrow-competition-page .score-input {
          width: 44px;
          height: 32px;
          text-align: center;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid var(--line);
          color: #fff;
          border-radius: 6px;
          font-size: 15px;
          font-weight: 850;
        }
        .zenithrow-competition-page .score-input:focus {
          outline: none;
          border-color: var(--blue);
        }

        .zenithrow-competition-page .table-container {
          background: #0d1014;
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
        }
        .zenithrow-competition-page table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .zenithrow-competition-page th {
          background: #14181e;
          padding: 11px 16px;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
          font-weight: 800;
          border-bottom: 1px solid var(--line);
        }
        .zenithrow-competition-page td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--line);
          color: #cbd5e1;
        }
        .zenithrow-competition-page tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .zenithrow-competition-page .modal-backdrop {
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
        .zenithrow-competition-page .modal-box {
          background: #101317;
          border: 1px solid var(--line2);
          border-radius: 18px;
          padding: 24px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 25px 70px rgba(0, 0, 0, 0.6);
        }
        .zenithrow-competition-page input,
        .zenithrow-competition-page select,
        .zenithrow-competition-page textarea {
          background: #15191f;
          border: 1px solid var(--line);
          border-radius: 8px;
          color: #fff;
          font-size: 12px;
          padding: 8px 12px;
        }
        .zenithrow-competition-page input:focus,
        .zenithrow-competition-page select:focus,
        .zenithrow-competition-page textarea:focus {
          outline: none;
          border-color: var(--blue);
        }
      `}</style>

      {/* Top Bar Navigation */}
      <div className="top-bar">
        <Link href="/admin/competitions" className="back-link">
          <ArrowLeft size={14} />
          <span>Back to Competitions</span>
        </Link>
        <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "ui-monospace, monospace" }}>
          COMPETITION CONSOLE • {competition.id.slice(0, 8)}
        </div>
      </div>

      {/* Header Banner */}
      <div className="header-card">
        <div>
          <div className="kicker">08 • TOURNAMENT BRACKET &amp; MATCHUP CONSOLE</div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
            <span
              style={{
                padding: "3px 8px",
                borderRadius: "5px",
                fontSize: "10px",
                fontWeight: 850,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                ...getStatusBadgeStyle(competition.status),
              }}
            >
              ● {competition.status}
            </span>
            <span
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                padding: "3px 8px",
                borderRadius: "5px",
                fontSize: "10px",
                fontWeight: 800,
                textTransform: "uppercase",
                color: "#60a5fa",
              }}
            >
              {competition.format}
            </span>
            {competition.round_name && (
              <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>
                Stage: {competition.round_name}
              </span>
            )}
          </div>

          <h1 className="title">{competition.name}</h1>

          <div className="meta-tags">
            <span className="meta-tag">
              <strong>Event:</strong> {event ? event.name : competition.event_id}
            </span>
            <span className="meta-tag">
              <strong>Division:</strong> {division ? `${division.name} (${division.code})` : "Open • All"}
            </span>
            <span className="meta-tag">
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
              className="btn"
            >
              <Edit3 size={13} />
              <span>Edit Details</span>
            </button>
          )}

          {/* Draft -> Ready */}
          {(competition.status === "draft" || competition.status === "scheduled") && (
            <button
              type="button"
              onClick={() => setStatusConfirm("ready")}
              className="btn btn-ready"
            >
              <CheckCircle2 size={13} />
              <span>Mark Ready</span>
            </button>
          )}

          {/* Ready -> Live or Revert to Draft */}
          {competition.status === "ready" && (
            <>
              <button
                type="button"
                onClick={() => setStatusConfirm("live")}
                className="btn btn-primary"
              >
                <span>Start Competition (Live)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusConfirm("draft")}
                className="btn"
              >
                <span>Revert to Draft</span>
              </button>
            </>
          )}

          {/* Live -> Completed */}
          {competition.status === "live" && (
            <button
              type="button"
              onClick={() => setStatusConfirm("completed")}
              className="btn btn-complete"
            >
              <Trophy size={13} />
              <span>Complete Competition</span>
            </button>
          )}

          {/* Cancel button */}
          {!isTerminal && (
            <button
              type="button"
              onClick={() => setStatusConfirm("cancelled")}
              className="btn btn-danger"
            >
              <span>Cancel</span>
            </button>
          )}
        </div>
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
            {feedback.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
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

      {/* Tab Navigation */}
      <div className="tabs-nav">
        <button
          type="button"
          onClick={() => setActiveTab("fixtures")}
          className={`tab-button ${activeTab === "fixtures" ? "active" : ""}`}
        >
          <Calendar size={13} />
          <span>Fixtures &amp; Matchups ({initialFixtures.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("entrants")}
          className={`tab-button ${activeTab === "entrants" ? "active" : ""}`}
        >
          <Users size={13} />
          <span>Eligible Entrants ({participants.length > 0 ? participants.length : teams.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`tab-button ${activeTab === "audit" ? "active" : ""}`}
        >
          <History size={13} />
          <span>Audit History ({auditEntries.length})</span>
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
            <div style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#cbd5e1" }}>
              Operational Matchups &amp; Heat Cards
            </div>

            {!isTerminal && (
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsAddFixtureModalOpen(true)}
                  className="btn"
                >
                  <Plus size={13} />
                  <span>Add Single Fixture</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(true)}
                  className="btn btn-primary"
                >
                  <Sparkles size={13} />
                  <span>Generate Knockout Pairs</span>
                </button>
              </div>
            )}
          </div>

          {initialFixtures.length === 0 ? (
            <div
              className="card"
              style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}
            >
              <span style={{ fontSize: "36px", display: "block", marginBottom: "8px" }}>🏟️</span>
              <strong style={{ display: "block", fontSize: "16px", color: "#f8fafc" }}>
                No fixtures configured yet
              </strong>
              <p style={{ margin: "6px auto 0", fontSize: "13px", maxWidth: "420px" }}>
                Use &quot;Generate Knockout Pairs&quot; or &quot;Add Single Fixture&quot; to configure match pairings for this stage.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "14px" }}>
              {initialFixtures.map((fixture, index) => {
                const homeTeam = fixture.home_team_id ? teamMap.get(fixture.home_team_id) : null;
                const awayTeam = fixture.away_team_id ? teamMap.get(fixture.away_team_id) : null;
                const venue = fixture.venue_id ? venueMap.get(fixture.venue_id) : null;
                const roundLabel = (fixture.metadata?.round as string) || `Match ${index + 1}`;
                const scores = scoreInputs[fixture.id] || { home: "", away: "" };

                return (
                  <article
                    key={fixture.id}
                    className="fixture-card"
                    style={{
                      borderLeft: `4px solid ${
                        fixture.status === "live"
                          ? "#ef4444"
                          : fixture.status === "finished"
                          ? "#10b981"
                          : "var(--line)"
                      }`,
                    }}
                  >
                    {/* Fixture Header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: "1px solid var(--line)",
                        paddingBottom: "10px",
                        marginBottom: "14px",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong style={{ fontSize: "13px", color: "#60a5fa" }}>
                          {roundLabel}
                        </strong>
                        {venue && (
                          <span style={{ fontSize: "11px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            • <MapPin size={11} /> {venue.name}
                          </span>
                        )}
                        {fixture.scheduled_at && (
                          <span style={{ fontSize: "11px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                            • <Clock size={11} /> {new Date(fixture.scheduled_at).toLocaleString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <select
                          value={fixture.status}
                          onChange={(e) =>
                            handleFixtureStatusChange(fixture.id, e.target.value as FixtureStatus)
                          }
                          disabled={isPending}
                          style={{
                            fontSize: "11px",
                            padding: "4px 8px",
                            height: "28px",
                            background: "#15191f",
                            border: "1px solid var(--line)",
                            borderRadius: "6px",
                            color: "#dce2ea",
                          }}
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
                        <div style={{ fontSize: "15px", fontWeight: 800, color: "#fff" }}>
                          {homeTeam ? homeTeam.name : "TBD (Home)"}
                        </div>
                        {homeTeam?.code && (
                          <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>
                            {homeTeam.code}
                          </span>
                        )}
                      </div>

                      {/* Operational Score Box */}
                      <div className="score-box">
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
                          className="score-input"
                        />
                        <span style={{ fontWeight: 900, color: "var(--muted)" }}>:</span>
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
                          className="score-input"
                        />

                        <button
                          type="button"
                          onClick={() => handleSaveScore(fixture.id)}
                          disabled={isPending}
                          className="btn"
                          style={{ fontSize: "10px", padding: "0 8px", height: "28px" }}
                          title="Save operational match score"
                        >
                          <Save size={11} />
                          <span>Save</span>
                        </button>
                      </div>

                      {/* Away Team */}
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "15px", fontWeight: 800, color: "#fff" }}>
                          {awayTeam ? awayTeam.name : "TBD (Away)"}
                        </div>
                        {awayTeam?.code && (
                          <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>
                            {awayTeam.code}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: "12px",
                        fontSize: "11px",
                        color: "var(--muted2)",
                        textAlign: "center",
                      }}
                    >
                      • Live operational score tracking. Official result verification occurs via the Result Desk.
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
        <div className="table-container">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            <strong style={{ fontSize: "13px", color: "#fff" }}>
              Verified Event Registrations &amp; Rosters
            </strong>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--muted)" }}>
              Eligible entrants for {event?.name || "this event"} derived from official registrations.
            </p>
          </div>

          {participants.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th style={{ width: "110px" }}>Chest #</th>
                  <th>Athlete Name</th>
                  <th>House • Team</th>
                  <th style={{ width: "120px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => {
                  const t = p.team_id ? teamMap.get(p.team_id) : null;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#60a5fa" }}>
                        {p.chest_number || "—"}
                      </td>
                      <td style={{ fontWeight: 700, color: "#fff" }}>
                        {p.name}
                      </td>
                      <td>
                        {t ? t.name : "Unassigned"}
                      </td>
                      <td>
                        <span style={{ fontSize: "11px", color: "#4ade80", textTransform: "uppercase", fontWeight: 800 }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "18px 20px" }}>
              <strong style={{ display: "block", marginBottom: "10px", fontSize: "12px", color: "var(--muted)" }}>
                Teams in Festival:
              </strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px" }}>
                {teams.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "10px",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <strong style={{ color: "#fff" }}>{t.name}</strong>
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
        <div className="table-container">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            <strong style={{ fontSize: "13px", color: "#fff" }}>Competition Change History</strong>
          </div>

          {auditEntries.length === 0 ? (
            <div style={{ padding: "36px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
              No recorded change events for this competition.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: "180px" }}>Timestamp</th>
                  <th style={{ width: "160px" }}>Action</th>
                  <th>Reason • Summary</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map((a) => (
                  <tr key={a.id}>
                    <td style={{ color: "var(--muted)", fontSize: "11px" }}>
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 800, color: "#60a5fa" }}>
                      {a.action}
                    </td>
                    <td>
                      {a.reason || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* STATUS TRANSITION CONFIRM MODAL */}
      {statusConfirm && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3 style={{ margin: "0 0 10px", fontSize: "17px", fontWeight: 850 }}>
              Confirm Status Transition → {statusConfirm.toUpperCase()}
            </h3>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--muted)", lineHeight: 1.5 }}>
              Are you sure you want to transition this competition from <strong style={{ color: "#fff" }}>{competition.status}</strong> to{" "}
              <strong style={{ color: "#60a5fa" }}>{statusConfirm}</strong>?
            </p>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 750, marginBottom: "6px", color: "var(--muted)" }}>
                Operational Reason (Optional)
              </label>
              <input
                type="text"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g., Fixtures verified, Ready for court entry"
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setStatusConfirm(null)}
                disabled={isPending}
                className="btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusTransition(statusConfirm)}
                disabled={isPending}
                className="btn btn-primary"
              >
                {isPending ? "Transitioning..." : "Confirm Transition"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD FIXTURE MODAL */}
      {isAddFixtureModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: "520px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 850 }}>Add Fixture Matchup</h3>
              <button
                type="button"
                onClick={() => setIsAddFixtureModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddFixtureSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 750, marginBottom: "6px", color: "var(--muted)" }}>
                    Round • Match Label *
                  </label>
                  <input
                    type="text"
                    value={addFixtureForm.round}
                    onChange={(e) => setAddFixtureForm({ ...addFixtureForm, round: e.target.value })}
                    required
                    placeholder="e.g. Semi Final 1, Heat 2"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 750, marginBottom: "6px", color: "var(--muted)" }}>
                      Home Team (Side A)
                    </label>
                    <select
                      value={addFixtureForm.homeTeamId}
                      onChange={(e) => setAddFixtureForm({ ...addFixtureForm, homeTeamId: e.target.value })}
                      style={{ width: "100%" }}
                    >
                      <option value="">TBD • Open</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 750, marginBottom: "6px", color: "var(--muted)" }}>
                      Away Team (Side B)
                    </label>
                    <select
                      value={addFixtureForm.awayTeamId}
                      onChange={(e) => setAddFixtureForm({ ...addFixtureForm, awayTeamId: e.target.value })}
                      style={{ width: "100%" }}
                    >
                      <option value="">TBD • Open</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 750, marginBottom: "6px", color: "var(--muted)" }}>
                    Venue • Court
                  </label>
                  <select
                    value={addFixtureForm.venueId}
                    onChange={(e) => setAddFixtureForm({ ...addFixtureForm, venueId: e.target.value })}
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
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 750, marginBottom: "6px", color: "var(--muted)" }}>
                    Scheduled Time
                  </label>
                  <input
                    type="datetime-local"
                    value={addFixtureForm.scheduledAt}
                    onChange={(e) => setAddFixtureForm({ ...addFixtureForm, scheduledAt: e.target.value })}
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setIsAddFixtureModalOpen(false)}
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
                    {isPending ? "Adding..." : "Add Fixture"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATE KNOCKOUT FIXTURES MODAL */}
      {isGenerateModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-box" style={{ maxWidth: "520px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 850 }}>
                Generate Knockout Fixtures
              </h3>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleGenerateKnockout}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 750, marginBottom: "6px", color: "var(--muted)" }}>
                    Round Name *
                  </label>
                  <input
                    type="text"
                    value={generateRoundName}
                    onChange={(e) => setGenerateRoundName(e.target.value)}
                    required
                    placeholder="e.g. Quarter Finals, Semi Finals"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 750, color: "var(--muted)" }}>
                      Select Participating Teams ({selectedTeamIds.length} selected)
                    </label>
                    <div style={{ fontSize: "10px", display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => setSelectedTeamIds(teams.map((t) => t.id))}
                        className="btn"
                        style={{ height: "24px", padding: "0 6px", fontSize: "10px" }}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTeamIds([])}
                        className="btn"
                        style={{ height: "24px", padding: "0 6px", fontSize: "10px" }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: "180px",
                      overflowY: "auto",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      padding: "8px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      background: "#0d1014",
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
                            fontSize: "12px",
                            cursor: "pointer",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            background: isSelected ? "rgba(255,255,255,0.06)" : "transparent",
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
                          <span style={{ fontWeight: 700, color: "#fff" }}>{t.name}</span>
                          <span style={{ fontSize: "10px", color: "var(--muted)" }}>({t.code})</span>
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
                      borderRadius: "6px",
                      padding: "10px",
                      fontSize: "12px",
                      color: "#fca5a5",
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
                    className="btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || selectedTeamIds.length < 2 || selectedTeamIds.length % 2 !== 0}
                    className="btn btn-primary"
                  >
                    {isPending ? "Generating..." : "Generate Matches"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COMPETITION MODAL */}
      {isEditModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3 style={{ margin: "0 0 16px", fontSize: "17px", fontWeight: 850 }}>
              Edit Competition Details
            </h3>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 750, marginBottom: "6px", color: "var(--muted)" }}>
                    Competition Name *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 750, marginBottom: "6px", color: "var(--muted)" }}>
                    Tournament Format *
                  </label>
                  <select
                    value={editForm.format}
                    onChange={(e) =>
                      setEditForm({ ...editForm, format: e.target.value as CompetitionFormat })
                    }
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
                  <label style={{ display: "block", fontSize: "11px", fontWeight: 750, marginBottom: "6px", color: "var(--muted)" }}>
                    Stage • Round Tag
                  </label>
                  <input
                    type="text"
                    value={editForm.roundName}
                    onChange={(e) => setEditForm({ ...editForm, roundName: e.target.value })}
                    placeholder="e.g. Main Championship"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
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
                    {isPending ? "Saving..." : "Save Changes"}
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
