"use client";

import { useState, useTransition } from "react";
import type {
  TeamRow,
  AdminParticipantRow,
  EventRow,
  DivisionRow,
  AdminRegistrationRow,
  AdminSubstitutionRow,
  ResultRow,
} from "@/lib/repositories";
import type {
  ParticipantStatus,
  AdminAppealRow,
  AppealReasonCategory,
} from "@/lib/types";
import {
  createTeamParticipantAction,
  updateTeamParticipantAction,
  createTeamRegistrationAction,
  requestSubstitutionAction,
  submitAppealAction,
} from "@/app/team-manager/actions";
import { getEffectiveEventQuota } from "@/lib/competition/quotaEngine";
import {
  isTugOfWarEvent,
  extractWeightFromMetadata,
  calculateTugOfWarWeight,
  roundWeight,
} from "@/lib/competition/tugOfWarWeight";
import { calculateAppealWindow } from "@/lib/appeals/appealEngine";

interface TeamManagerClientProps {
  festivalId: string;
  currentTeam: TeamRow | null;
  allTeams: TeamRow[];
  participants: AdminParticipantRow[];
  events: EventRow[];
  divisions: DivisionRow[];
  registrations: AdminRegistrationRow[];
  substitutions: AdminSubstitutionRow[];
  appeals?: AdminAppealRow[];
  publishedResults?: ResultRow[];
  managerName?: string;
}

export default function TeamManagerClient({
  festivalId,
  currentTeam,
  allTeams: _allTeams,
  participants,
  events,
  divisions,
  registrations,
  substitutions,
  appeals = [],
  publishedResults = [],
  managerName,
}: TeamManagerClientProps) {
  const [activeTab, setActiveTab] = useState<"roster" | "registrations" | "substitutions" | "appeals" | "results">("roster");

  // Appeal Modal
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealResultId, setAppealResultId] = useState(publishedResults[0]?.id || "");
  const [appealTitle, setAppealTitle] = useState("");
  const [appealCategory, setAppealCategory] = useState<AppealReasonCategory>("scoring_discrepancy");
  const [appealDescription, setAppealDescription] = useState("");
  const [appealEvidence, setAppealEvidence] = useState("");

  // Athlete Modal
  const [isAthleteModalOpen, setIsAthleteModalOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<AdminParticipantRow | null>(null);
  const [athleteName, setAthleteName] = useState("");
  const [athleteChest, setAthleteChest] = useState("");
  const [athleteDivision, setAthleteDivision] = useState(divisions[0]?.id || "");
  const [athletePhone, setAthletePhone] = useState("");
  const [athleteEmail, setAthleteEmail] = useState("");
  const [athleteStatus, setAthleteStatus] = useState<ParticipantStatus>("confirmed");

  // Registration Modal
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regParticipantId, setRegParticipantId] = useState("");
  const [regEventId, setRegEventId] = useState(events[0]?.id || "");
  const [regWeightKg, setRegWeightKg] = useState("");
  const [regIsSubstitute, setRegIsSubstitute] = useState(false);

  // Substitution Modal
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [subOrigParticipantId, setSubOrigParticipantId] = useState("");
  const [subEventId, setSubEventId] = useState("");
  const [subRepParticipantId, setSubRepParticipantId] = useState("");
  const [subReplacementWeightKg, setSubReplacementWeightKg] = useState("");
  const [subReason, setSubReason] = useState("");

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!currentTeam) {
    return (
      <div className="pegasus-card" style={{ padding: "32px", textAlign: "center" }}>
        <h2 style={{ fontSize: "18px", color: "var(--foreground)" }}>No House Assigned</h2>
        <p style={{ color: "var(--muted)", fontSize: "14px" }}>
          Your user profile is not yet assigned to an official house. Contact an administrator to link your profile to a team.
        </p>
      </div>
    );
  }

  // --- Handlers ---
  function openAddAthleteModal() {
    setSelectedAthlete(null);
    setAthleteName("");
    setAthleteChest("");
    setAthleteDivision(divisions[0]?.id || "");
    setAthletePhone("");
    setAthleteEmail("");
    setAthleteStatus("confirmed");
    setErrorMessage(null);
    setIsAthleteModalOpen(true);
  }

  function openEditAthleteModal(athlete: AdminParticipantRow) {
    setSelectedAthlete(athlete);
    setAthleteName(athlete.name);
    setAthleteChest(athlete.chest_number || "");
    setAthleteDivision(athlete.division_id || divisions[0]?.id || "");
    setAthletePhone(athlete.phone || "");
    setAthleteEmail(athlete.email || "");
    setAthleteStatus(athlete.status);
    setErrorMessage(null);
    setIsAthleteModalOpen(true);
  }

  function handleSaveAthlete(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    startTransition(async () => {
      if (selectedAthlete) {
        const res = await updateTeamParticipantAction({
          participantId: selectedAthlete.id,
          name: athleteName,
          chestNumber: athleteChest || null,
          divisionId: athleteDivision || null,
          phone: athletePhone || null,
          email: athleteEmail || null,
          status: athleteStatus,
        });
        if (!res.success) {
          setErrorMessage(res.error || "Failed to update athlete.");
          return;
        }
      } else {
        const res = await createTeamParticipantAction({
          festivalId,
          name: athleteName,
          chestNumber: athleteChest || null,
          divisionId: athleteDivision || null,
          phone: athletePhone || null,
          email: athleteEmail || null,
          status: athleteStatus,
        });
        if (!res.success) {
          setErrorMessage(res.error || "Failed to add athlete.");
          return;
        }
      }
      window.location.reload();
    });
  }

  function openAddRegistrationModal(athleteId?: string) {
    setRegParticipantId(athleteId || participants[0]?.id || "");
    setRegEventId(events[0]?.id || "");
    setRegWeightKg("");
    setRegIsSubstitute(false);
    setErrorMessage(null);
    setIsRegModalOpen(true);
  }

  function handleSaveRegistration(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const evObj = events.find((ev) => ev.id === regEventId);
    const isTow = isTugOfWarEvent(evObj?.code || evObj?.id);

    const metadata: Record<string, unknown> = {};
    if (regIsSubstitute) {
      metadata.isSubstitute = true;
    }
    if (regWeightKg) {
      const parsed = parseFloat(regWeightKg);
      if (!isNaN(parsed) && parsed > 0) {
        metadata.weightKg = roundWeight(parsed);
      }
    }

    if (isTow && !regIsSubstitute && !metadata.weightKg) {
      setErrorMessage(
        "Official athlete weigh-in (weight in kg) is strictly required for Tug-of-War main team registration."
      );
      return;
    }

    startTransition(async () => {
      const res = await createTeamRegistrationAction({
        festivalId,
        participantId: regParticipantId,
        eventId: regEventId,
        status: "approved",
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
      if (!res.success) {
        setErrorMessage(res.error || "Failed to create registration.");
        return;
      }
      window.location.reload();
    });
  }

  function openSubstitutionModal(origPartId?: string, eventId?: string) {
    setSubOrigParticipantId(origPartId || participants[0]?.id || "");
    setSubEventId(eventId || events[0]?.id || "");
    setSubRepParticipantId("");
    setSubReplacementWeightKg("");
    setSubReason("");
    setErrorMessage(null);
    setIsSubModalOpen(true);
  }

  function handleSubmitSubstitution(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!subRepParticipantId) {
      setErrorMessage("Please select an eligible replacement athlete.");
      return;
    }

    const subEvObj = events.find((ev) => ev.id === subEventId);
    const isTow = isTugOfWarEvent(subEvObj?.code || subEvObj?.id);

    const metadata: Record<string, unknown> = {};
    if (subReplacementWeightKg) {
      const parsed = parseFloat(subReplacementWeightKg);
      if (!isNaN(parsed) && parsed > 0) {
        metadata.weightKg = roundWeight(parsed);
      }
    }

    if (isTow && !metadata.weightKg) {
      setErrorMessage(
        "Replacement athlete weigh-in (weight in kg) is strictly required for Tug-of-War substitutions."
      );
      return;
    }

    startTransition(async () => {
      const res = await requestSubstitutionAction({
        festivalId,
        eventId: subEventId,
        originalParticipantId: subOrigParticipantId,
        replacementParticipantId: subRepParticipantId,
        reason: subReason,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
      if (!res.success) {
        setErrorMessage(res.error || "Failed to submit substitution.");
        return;
      }
      window.location.reload();
    });
  }

  function openCreateAppealModal(resultId?: string) {
    setAppealResultId(resultId || publishedResults[0]?.id || "");
    setAppealTitle("");
    setAppealCategory("scoring_discrepancy");
    setAppealDescription("");
    setAppealEvidence("");
    setErrorMessage(null);
    setIsAppealModalOpen(true);
  }

  function handleSubmitAppeal(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!currentTeam) {
      setErrorMessage("No team assigned to current manager.");
      return;
    }

    const targetResult = publishedResults.find((r) => r.id === appealResultId);
    if (!targetResult) {
      setErrorMessage("Please select an official result to appeal.");
      return;
    }

    startTransition(async () => {
      const res = await submitAppealAction({
        festivalId,
        eventId: targetResult.event_id,
        competitionId: targetResult.competition_id,
        fixtureId: targetResult.fixture_id,
        resultId: targetResult.id,
        teamId: currentTeam.id,
        participantId: targetResult.participant_id,
        title: appealTitle.trim(),
        reasonCategory: appealCategory,
        description: appealDescription.trim(),
        evidenceReferences: appealEvidence.trim()
          ? appealEvidence.split("\n").map((s) => s.trim()).filter(Boolean)
          : undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to lodge appeal.");
        return;
      }

      window.location.reload();
    });
  }

  // Map division names
  const divMap = new Map(divisions.map((d) => [d.id, d.name]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header Banner */}
      <div
        className="pegasus-card"
        style={{
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          borderLeft: `5px solid ${currentTeam.color || "var(--accent)"}`,
        }}
      >
        <div>
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--accent)", letterSpacing: "0.08em" }}>
            HOUSE COMMAND TERMINAL
          </span>
          <h2 style={{ fontSize: "22px", fontWeight: 850, margin: "2px 0 4px" }}>
            {currentTeam.name} ({currentTeam.code})
          </h2>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
            Manager: <strong>{managerName || "House Captain"}</strong> • Roster Size:{" "}
            <strong>{participants.length} Athletes</strong> • Active Entries:{" "}
            <strong>{registrations.length} Entries</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={openAddAthleteModal}
            className="pegasus-button pegasus-button--secondary"
            style={{ fontSize: "13px", padding: "8px 14px" }}
          >
            + Add Athlete
          </button>
          <button
            onClick={() => openAddRegistrationModal()}
            className="pegasus-button pegasus-button--primary"
            style={{ fontSize: "13px", padding: "8px 16px" }}
          >
            + Register for Event
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
        <button
          onClick={() => setActiveTab("roster")}
          className={`pegasus-button ${activeTab === "roster" ? "pegasus-button--primary" : "pegasus-button--secondary"}`}
          style={{ fontSize: "13px", padding: "6px 16px" }}
        >
          Athletes Roster ({participants.length})
        </button>
        <button
          onClick={() => setActiveTab("registrations")}
          className={`pegasus-button ${activeTab === "registrations" ? "pegasus-button--primary" : "pegasus-button--secondary"}`}
          style={{ fontSize: "13px", padding: "6px 16px" }}
        >
          Event Registrations ({registrations.length})
        </button>
        <button
          onClick={() => setActiveTab("substitutions")}
          className={`pegasus-button ${activeTab === "substitutions" ? "pegasus-button--primary" : "pegasus-button--secondary"}`}
          style={{ fontSize: "13px", padding: "6px 16px" }}
        >
          Substitutions ({substitutions.length})
        </button>
        <button
          onClick={() => setActiveTab("appeals")}
          className={`pegasus-button ${activeTab === "appeals" ? "pegasus-button--primary" : "pegasus-button--secondary"}`}
          style={{ fontSize: "13px", padding: "6px 16px" }}
        >
          Appeals & Protests ({appeals.length})
        </button>
        <button
          onClick={() => setActiveTab("results")}
          className={`pegasus-button ${activeTab === "results" ? "pegasus-button--primary" : "pegasus-button--secondary"}`}
          style={{ fontSize: "13px", padding: "6px 16px" }}
        >
          House Results ({publishedResults.length})
        </button>
      </div>

      {/* TAB 1: ROSTER */}
      {activeTab === "roster" && (
        <div className="pegasus-table-container">
          <table className="pegasus-table">
            <thead>
              <tr>
                <th>Athlete Name</th>
                <th>Chest No</th>
                <th>Public ID</th>
                <th>Academic Division</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                  </td>
                  <td>
                    {p.chest_number ? (
                      <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent)" }}>
                        #{p.chest_number}
                      </span>
                    ) : (
                      <span style={{ color: "var(--muted)", fontSize: "12px" }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)" }}>
                      {p.public_id}
                    </span>
                  </td>
                  <td>{p.division_id ? divMap.get(p.division_id) || "—" : "—"}</td>
                  <td>
                    <span className={`pegasus-status pegasus-status--${p.status === "confirmed" ? "confirmed" : "pending"}`}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => openEditAthleteModal(p)}
                        className="pegasus-button pegasus-button--secondary"
                        style={{ fontSize: "11px", padding: "2px 8px", minHeight: "26px" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openAddRegistrationModal(p.id)}
                        className="pegasus-button pegasus-button--subtle"
                        style={{ fontSize: "11px", padding: "2px 8px", minHeight: "26px" }}
                      >
                        + Entry
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: REGISTRATIONS */}
      {activeTab === "registrations" && (
        <div className="pegasus-table-container">
          <table className="pegasus-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Athlete Name</th>
                <th>Chest No</th>
                <th>Academic Division</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.eventName || r.eventCode}</strong>
                  </td>
                  <td>{r.participantName}</td>
                  <td>
                    {r.participantChestNumber ? `#${r.participantChestNumber}` : "—"}
                  </td>
                  <td>{r.divisionName || "—"}</td>
                  <td>
                    <span
                      className={`pegasus-status pegasus-status--${r.status === "approved" ? "confirmed" : r.status === "withdrawn" ? "delayed" : "pending"}`}
                    >
                      {r.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {r.status === "approved" && (
                      <button
                        onClick={() => openSubstitutionModal(r.participant_id, r.event_id)}
                        className="pegasus-button pegasus-button--secondary"
                        style={{ fontSize: "11px", padding: "3px 8px", minHeight: "26px" }}
                      >
                        Substitute Athlete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: SUBSTITUTIONS */}
      {activeTab === "substitutions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {substitutions.length === 0 ? (
            <div className="pegasus-card" style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>
              No substitutions requested for your house.
            </div>
          ) : (
            <div className="pegasus-table-container">
              <table className="pegasus-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Original Athlete</th>
                    <th>Replacement</th>
                    <th>Timing & Fee</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {substitutions.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.eventName}</strong>
                      </td>
                      <td style={{ color: "#ff6b6b" }}>
                        {s.originalParticipantName} {s.originalParticipantChest && `(#${s.originalParticipantChest})`}
                      </td>
                      <td style={{ color: "#51cf66" }}>
                        {s.replacementParticipantName} {s.replacementParticipantChest && `(#${s.replacementParticipantChest})`}
                      </td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
                          {s.timing.toUpperCase()} (₹{s.fee_amount})
                        </span>
                      </td>
                      <td>
                        <span
                          className={`pegasus-status pegasus-status--${s.status === "approved" ? "confirmed" : s.status === "rejected" ? "live" : "pending"}`}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: APPEALS & PROTESTS */}
      {activeTab === "appeals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0 }}>Official House Appeals & Protests</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "2px 0 0" }}>
                Protests must be submitted within 30 minutes of result publication (Codex fee: ₹70).
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreateAppealModal()}
              className="pegasus-button pegasus-button--primary"
              style={{ fontSize: "13px", padding: "6px 14px" }}
            >
              + Lodge Official Appeal
            </button>
          </div>

          {appeals.length === 0 ? (
            <div className="pegasus-card" style={{ padding: "32px", textAlign: "center" }}>
              <p style={{ color: "var(--muted)", fontSize: "14px", margin: 0 }}>
                No appeals or protests have been filed by {currentTeam.name}.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {appeals.map((a) => (
                <div key={a.id} className="pegasus-card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>
                          {a.status.replace("_", " ").toUpperCase()}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--accent)", fontWeight: 700 }}>
                          {a.reason_category.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <h4 style={{ fontSize: "15px", fontWeight: 800, margin: "2px 0" }}>{a.title}</h4>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        Event: <strong>{a.eventName || a.eventCode}</strong> • Lodged by: <strong>{a.submitter_name}</strong> • Fee: ₹{a.fee_amount} ({a.fee_status.toUpperCase()})
                      </div>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div style={{ background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: "6px", fontSize: "13px", lineHeight: "1.4" }}>
                    {a.description}
                  </div>

                  {a.decision_notes && (
                    <div style={{ background: "rgba(0,188,212,0.06)", border: "1px solid rgba(0,188,212,0.2)", padding: "10px 12px", borderRadius: "6px", fontSize: "13px" }}>
                      <strong style={{ color: "var(--accent)", display: "block", marginBottom: "2px" }}>Jury of Appeal Verdict:</strong>
                      {a.decision_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: RESULTS */}
      {activeTab === "results" && (
        <div className="pegasus-table-container">
          {publishedResults.length === 0 ? (
            <div className="pegasus-card" style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>
              No official results published for your house yet. Results will populate as heats and finals conclude.
            </div>
          ) : (
            <table className="pegasus-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Athlete</th>
                  <th>Position / Mark</th>
                  <th>Points</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {publishedResults.map((r) => {
                  const ev = events.find((e) => e.id === r.event_id);
                  const athlete = participants.find((p) => p.id === r.participant_id);
                  const perfStr = typeof r.performance === "string" ? r.performance : (r.performance as any)?.raw || "Official Mark";
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{ev?.name || r.event_id}</strong>
                      </td>
                      <td>{athlete?.name || "Team Squad"}</td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--accent)" }}>
                          #{r.rank} · {perfStr}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: r.points > 0 ? "var(--accent)" : "var(--muted)" }}>
                          +{r.points} pts
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => openCreateAppealModal(r.id)}
                          className="pegasus-button pegasus-button--secondary"
                          style={{ fontSize: "11px", padding: "4px 10px" }}
                        >
                          File Protest / Appeal
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ATHLETE MODAL */}
      {isAthleteModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div className="pegasus-card" style={{ width: "100%", maxWidth: "460px", padding: "24px", background: "var(--surface)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 16px" }}>
              {selectedAthlete ? "Edit Athlete Profile" : `Add Athlete to ${currentTeam.name}`}
            </h3>

            {errorMessage && (
              <div style={{ padding: "10px", background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: "6px", color: "#ff6b6b", fontSize: "13px", marginBottom: "14px" }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveAthlete} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Athlete Full Name *
                </label>
                <input
                  type="text"
                  value={athleteName}
                  onChange={(e) => setAthleteName(e.target.value)}
                  className="pegasus-input"
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Chest Number
                  </label>
                  <input
                    type="text"
                    value={athleteChest}
                    onChange={(e) => setAthleteChest(e.target.value)}
                    placeholder="e.g. 1001"
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Academic Division *
                  </label>
                  <select
                    value={athleteDivision}
                    onChange={(e) => setAthleteDivision(e.target.value)}
                    className="pegasus-input"
                    style={{ width: "100%" }}
                    required
                  >
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Phone (Private)
                  </label>
                  <input
                    type="text"
                    value={athletePhone}
                    onChange={(e) => setAthletePhone(e.target.value)}
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Email (Private)
                  </label>
                  <input
                    type="email"
                    value={athleteEmail}
                    onChange={(e) => setAthleteEmail(e.target.value)}
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
                <button type="button" onClick={() => setIsAthleteModalOpen(false)} className="pegasus-button pegasus-button--secondary" disabled={isPending}>
                  Cancel
                </button>
                <button type="submit" className="pegasus-button pegasus-button--primary" disabled={isPending}>
                  {isPending ? "Saving..." : selectedAthlete ? "Update Athlete" : "Add Athlete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {isRegModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div className="pegasus-card" style={{ width: "100%", maxWidth: "440px", padding: "24px", background: "var(--surface)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 16px" }}>Register Athlete into Event</h3>

            {errorMessage && (
              <div style={{ padding: "10px", background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: "6px", color: "#ff6b6b", fontSize: "13px", marginBottom: "14px" }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveRegistration} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Select Athlete *
                </label>
                <select
                  value={regParticipantId}
                  onChange={(e) => setRegParticipantId(e.target.value)}
                  className="pegasus-input"
                  style={{ width: "100%" }}
                  required
                >
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.chest_number && `(#${p.chest_number})`} — {p.division_id ? divMap.get(p.division_id) : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Select Event *
                </label>
                <select
                  value={regEventId}
                  onChange={(e) => setRegEventId(e.target.value)}
                  className="pegasus-input"
                  style={{ width: "100%" }}
                  required
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.code})
                    </option>
                  ))}
                </select>
                {(() => {
                  const evObj = events.find((e) => e.id === regEventId) || events[0];
                  const athleteObj = participants.find((p) => p.id === regParticipantId) || participants[0];
                  const divCode = athleteObj?.division_id ? divMap.get(athleteObj.division_id)?.toLowerCase() : undefined;
                  const qInfo = evObj ? getEffectiveEventQuota(evObj.code, divCode) : null;
                  const activeCount = registrations.filter(
                    (r) => r.event_id === regEventId && (r.status === "approved" || r.status === "submitted")
                  ).length;
                  const isFull = qInfo?.maxSlots != null && activeCount >= qInfo.maxSlots;

                  if (qInfo?.maxSlots == null) return null;

                  return (
                    <div
                      style={{
                        fontSize: "12px",
                        marginTop: "6px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        background: isFull ? "rgba(255,107,107,0.12)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isFull ? "rgba(255,107,107,0.3)" : "var(--border)"}`,
                        color: isFull ? "#ff6b6b" : "var(--muted)",
                      }}
                    >
                      {isFull ? (
                        <span>⚠️ <strong>Roster Full:</strong> {activeCount}/{qInfo.maxSlots} slots filled for {evObj?.name}. No additional entries allowed.</span>
                      ) : (
                        <span>House Roster: <strong>{activeCount}/{qInfo.maxSlots}</strong> slots filled ({qInfo.maxSlots - activeCount} remaining).</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Tug-of-War Weight & Role Controls */}
              {(() => {
                const evObj = events.find((e) => e.id === regEventId);
                const isTow = isTugOfWarEvent(evObj?.code || evObj?.id);
                if (!isTow) return null;

                const towRegs = registrations.filter(
                  (r) => r.event_id === regEventId && (r.status === "approved" || r.status === "submitted")
                );
                const activeTowRegs = towRegs.filter((r) => !r.metadata?.isSubstitute);
                const currentMainWeight = calculateTugOfWarWeight(
                  activeTowRegs.map((r) => extractWeightFromMetadata(r.metadata) ?? 0)
                );
                const incomingWeight = !regIsSubstitute && regWeightKg ? (parseFloat(regWeightKg) || 0) : 0;
                const prospectiveWeight = roundWeight(currentMainWeight + incomingWeight);
                const maxLimit = 600;
                const isOverweight = prospectiveWeight > maxLimit;

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Tug-of-War 600kg Ceiling
                      </span>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", cursor: "pointer", color: "var(--foreground)" }}>
                        <input
                          type="checkbox"
                          checked={regIsSubstitute}
                          onChange={(e) => setRegIsSubstitute(e.target.checked)}
                        />
                        <span>Reserve / Substitute</span>
                      </label>
                    </div>

                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                        Athlete Weigh-in (kg) {regIsSubstitute ? "(Optional for Reserve)" : "*"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="30"
                        max="200"
                        value={regWeightKg}
                        onChange={(e) => setRegWeightKg(e.target.value)}
                        placeholder="e.g. 74.5"
                        className="pegasus-input"
                        style={{ width: "100%" }}
                        required={!regIsSubstitute}
                      />
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: isOverweight ? "rgba(255,107,107,0.15)" : "rgba(0,255,150,0.08)",
                        border: `1px solid ${isOverweight ? "rgba(255,107,107,0.4)" : "rgba(0,255,150,0.2)"}`,
                        color: isOverweight ? "#ff6b6b" : "var(--foreground)",
                      }}
                    >
                      <div>
                        Active 8-Person Weight: <strong>{currentMainWeight.toFixed(1)} / {maxLimit} kg</strong>
                        {activeTowRegs.length > 0 && ` (${activeTowRegs.length} weighed)`}
                      </div>
                      {!regIsSubstitute && regWeightKg && (
                        <div style={{ marginTop: "4px", fontWeight: 600 }}>
                          {isOverweight ? (
                            <span>🚨 Exceeds 600kg limit by <strong>{(prospectiveWeight - maxLimit).toFixed(1)} kg</strong> (Prospective: {prospectiveWeight.toFixed(1)} kg)</span>
                          ) : (
                            <span>✅ Prospective Total: <strong>{prospectiveWeight.toFixed(1)} kg</strong> ({(maxLimit - prospectiveWeight).toFixed(1)} kg remaining)</span>
                          )}
                        </div>
                      )}
                      {regIsSubstitute && (
                        <div style={{ marginTop: "4px", color: "var(--muted)", fontSize: "11px" }}>
                          ℹ️ Substitutes are held in reserve and do not count toward the active 600 kg limit until fielded.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsRegModalOpen(false)} className="pegasus-button pegasus-button--secondary" disabled={isPending}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pegasus-button pegasus-button--primary"
                  disabled={(() => {
                    if (isPending) return true;
                    const evObj = events.find((e) => e.id === regEventId) || events[0];
                    const athleteObj = participants.find((p) => p.id === regParticipantId) || participants[0];
                    const divCode = athleteObj?.division_id ? divMap.get(athleteObj.division_id)?.toLowerCase() : undefined;
                    const qInfo = evObj ? getEffectiveEventQuota(evObj.code, divCode) : null;
                    const activeCount = registrations.filter(
                      (r) => r.event_id === regEventId && (r.status === "approved" || r.status === "submitted")
                    ).length;
                    const isRosterFull = qInfo?.maxSlots != null && activeCount >= qInfo.maxSlots;
                    if (isRosterFull) return true;

                    // Tug-of-War weight check
                    if (isTugOfWarEvent(evObj?.code || evObj?.id)) {
                      if (!regIsSubstitute) {
                        const parsed = parseFloat(regWeightKg);
                        if (isNaN(parsed) || parsed <= 0) return true;
                        const towRegs = registrations.filter(
                          (r) => r.event_id === regEventId && (r.status === "approved" || r.status === "submitted")
                        );
                        const currentMainWeight = calculateTugOfWarWeight(
                          towRegs.filter((r) => !r.metadata?.isSubstitute).map((r) => extractWeightFromMetadata(r.metadata) ?? 0)
                        );
                        if (roundWeight(currentMainWeight + parsed) > 600) return true;
                      }
                    }
                    return false;
                  })()}
                >
                  {isPending ? "Submitting..." : "Submit Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUBSTITUTION MODAL */}
      {isSubModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div className="pegasus-card" style={{ width: "100%", maxWidth: "480px", padding: "24px", background: "var(--surface)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 14px" }}>Request Athlete Substitution</h3>

            {errorMessage && (
              <div style={{ padding: "10px", background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: "6px", color: "#ff6b6b", fontSize: "13px", marginBottom: "14px" }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitSubstitution} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Event Entry
                </label>
                <select
                  value={subEventId}
                  onChange={(e) => setSubEventId(e.target.value)}
                  className="pegasus-input"
                  style={{ width: "100%" }}
                  required
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Athlete Substituted Out *
                </label>
                <select
                  value={subOrigParticipantId}
                  onChange={(e) => setSubOrigParticipantId(e.target.value)}
                  className="pegasus-input"
                  style={{ width: "100%" }}
                  required
                >
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.chest_number && `(#${p.chest_number})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Replacement Athlete (Same House & Division) *
                </label>
                <select
                  value={subRepParticipantId}
                  onChange={(e) => setSubRepParticipantId(e.target.value)}
                  className="pegasus-input"
                  style={{ width: "100%" }}
                  required
                >
                  <option value="">-- Select Replacement Athlete --</option>
                  {participants
                    .filter((p) => p.id !== subOrigParticipantId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.chest_number && `(#${p.chest_number})`} — {p.division_id ? divMap.get(p.division_id) : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Reason for Substitution *
                </label>
                <textarea
                  value={subReason}
                  onChange={(e) => setSubReason(e.target.value)}
                  placeholder="e.g. Minor ankle strain, call-room rotation"
                  className="pegasus-input"
                  style={{ width: "100%", minHeight: "70px" }}
                  required
                />
              </div>

              {/* Tug-of-War Substitution Weight */}
              {(() => {
                const evObj = events.find((e) => e.id === subEventId);
                const isTow = isTugOfWarEvent(evObj?.code || evObj?.id);
                if (!isTow) return null;

                const origReg = registrations.find(
                  (r) => r.participant_id === subOrigParticipantId && r.event_id === subEventId
                );
                const origWeight = extractWeightFromMetadata(origReg?.metadata) ?? 0;

                const towRegs = registrations.filter(
                  (r) => r.event_id === subEventId && (r.status === "approved" || r.status === "submitted")
                );
                const otherActiveRegs = towRegs.filter(
                  (r) => r.participant_id !== subOrigParticipantId && !r.metadata?.isSubstitute
                );
                const otherWeight = calculateTugOfWarWeight(
                  otherActiveRegs.map((r) => extractWeightFromMetadata(r.metadata) ?? 0)
                );
                const incomingWeight = subReplacementWeightKg ? (parseFloat(subReplacementWeightKg) || 0) : 0;
                const prospectiveWeight = roundWeight(otherWeight + incomingWeight);
                const isOver = prospectiveWeight > 600;

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", border: "1px solid var(--border)" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Tug-of-War Substitution Weigh-in
                    </span>

                    <div>
                      <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                        Replacement Athlete Weigh-in (kg) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="30"
                        max="200"
                        value={subReplacementWeightKg}
                        onChange={(e) => setSubReplacementWeightKg(e.target.value)}
                        placeholder="e.g. 73.0"
                        className="pegasus-input"
                        style={{ width: "100%" }}
                        required
                      />
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: isOver ? "rgba(255,107,107,0.15)" : "rgba(0,255,150,0.08)",
                        border: `1px solid ${isOver ? "rgba(255,107,107,0.4)" : "rgba(0,255,150,0.2)"}`,
                        color: isOver ? "#ff6b6b" : "var(--foreground)",
                      }}
                    >
                      <div>
                        Outgoing Athlete Weight: <strong>{origWeight > 0 ? `${origWeight} kg` : "Unweighed"}</strong>
                      </div>
                      {subReplacementWeightKg && (
                        <div style={{ marginTop: "4px", fontWeight: 600 }}>
                          {isOver ? (
                            <span>🚨 Prospective Team Weight: <strong>{prospectiveWeight.toFixed(1)} kg</strong> (Exceeds 600 kg limit by {(prospectiveWeight - 600).toFixed(1)} kg)</span>
                          ) : (
                            <span>✅ Prospective Team Weight: <strong>{prospectiveWeight.toFixed(1)} / 600 kg</strong> ({(600 - prospectiveWeight).toFixed(1)} kg remaining)</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsSubModalOpen(false)} className="pegasus-button pegasus-button--secondary" disabled={isPending}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pegasus-button pegasus-button--primary"
                  disabled={(() => {
                    if (isPending) return true;
                    const subEvObj = events.find((ev) => ev.id === subEventId);
                    if (isTugOfWarEvent(subEvObj?.code || subEvObj?.id)) {
                      const parsed = parseFloat(subReplacementWeightKg);
                      if (isNaN(parsed) || parsed <= 0) return true;

                      const towRegs = registrations.filter(
                        (r) => r.event_id === subEventId && (r.status === "approved" || r.status === "submitted")
                      );
                      const otherActiveRegs = towRegs.filter(
                        (r) => r.participant_id !== subOrigParticipantId && !r.metadata?.isSubstitute
                      );
                      const otherWeight = calculateTugOfWarWeight(
                        otherActiveRegs.map((r) => extractWeightFromMetadata(r.metadata) ?? 0)
                      );
                      if (roundWeight(otherWeight + parsed) > 600) return true;
                    }
                    return false;
                  })()}
                >
                  {isPending ? "Submitting..." : "Submit to Desk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPEAL MODAL */}
      {isAppealModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div className="pegasus-card" style={{ width: "100%", maxWidth: "520px", padding: "24px", background: "var(--surface)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 4px" }}>Lodge Official Appeal / Protest</h3>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 16px" }}>
              Appeals are governed by the Pegasus Codex 2026. A non-refundable fee of ₹70 applies. Must be lodged within 30 minutes of result publication.
            </p>

            {errorMessage && (
              <div style={{ padding: "10px", background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: "6px", color: "#ff6b6b", fontSize: "13px", marginBottom: "14px" }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmitAppeal} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Select Published Result *
                </label>
                {publishedResults.length === 0 ? (
                  <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0" }}>
                    No published results available to appeal at this time.
                  </p>
                ) : (
                  <select
                    value={appealResultId}
                    onChange={(e) => setAppealResultId(e.target.value)}
                    className="pegasus-input"
                    style={{ width: "100%" }}
                    required
                  >
                    {publishedResults.map((r) => {
                      const ev = events.find((e) => e.id === r.event_id);
                      return (
                        <option key={r.id} value={r.id}>
                          {ev ? `${ev.name} (${ev.code})` : r.event_id} — Rank: {r.rank ?? "N/A"}, Pts: {r.points}
                        </option>
                      );
                    })}
                  </select>
                )}
                {(() => {
                  const selRes = publishedResults.find((r) => r.id === appealResultId);
                  if (!selRes?.published_at) return null;
                  const win = calculateAppealWindow(selRes.published_at);
                  return (
                    <div style={{ fontSize: "11px", marginTop: "4px", color: win.isExpired ? "#ff6b6b" : "var(--accent)" }}>
                      {win.isExpired
                        ? `⏱️ Protest window expired ${Math.abs(win.remainingMinutes)} minutes ago.`
                        : `⏱️ Window closes in ${win.remainingMinutes} minutes (${win.deadlineAt ? new Date(win.deadlineAt).toLocaleTimeString() : ""}).`}
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Reason Category *
                  </label>
                  <select
                    value={appealCategory}
                    onChange={(e) => setAppealCategory(e.target.value as AppealReasonCategory)}
                    className="pegasus-input"
                    style={{ width: "100%" }}
                    required
                  >
                    <option value="scoring_discrepancy">Scoring Discrepancy</option>
                    <option value="ineligible_participant">Ineligible Participant</option>
                    <option value="technical_rule_violation">Rule Violation</option>
                    <option value="equipment_infraction">Equipment Infraction</option>
                    <option value="conduct_violation">Conduct Violation</option>
                    <option value="timing_measurement_error">Timing / Measurement Error</option>
                    <option value="other">Other Official Ground</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Appeal Title *
                  </label>
                  <input
                    type="text"
                    value={appealTitle}
                    onChange={(e) => setAppealTitle(e.target.value)}
                    placeholder="e.g. Disputed 3rd leg finish time"
                    className="pegasus-input"
                    style={{ width: "100%" }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Detailed Description & Grounds *
                </label>
                <textarea
                  value={appealDescription}
                  onChange={(e) => setAppealDescription(e.target.value)}
                  placeholder="Provide precise details, heat number, rule clause, or discrepancies observed..."
                  className="pegasus-input"
                  style={{ width: "100%", minHeight: "80px" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Evidence References (Optional, 1 per line)
                </label>
                <textarea
                  value={appealEvidence}
                  onChange={(e) => setAppealEvidence(e.target.value)}
                  placeholder="e.g. Video timestamp 14:32, Chief Timer Sheet #2"
                  className="pegasus-input"
                  style={{ width: "100%", minHeight: "50px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" onClick={() => setIsAppealModalOpen(false)} className="pegasus-button pegasus-button--secondary" disabled={isPending}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pegasus-button pegasus-button--primary"
                  disabled={isPending || !appealResultId || publishedResults.length === 0}
                >
                  {isPending ? "Submitting..." : "Lodge Appeal (₹70)"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
