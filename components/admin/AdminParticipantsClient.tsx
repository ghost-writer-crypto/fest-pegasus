"use client";

import { useState, useMemo, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  createParticipantAction,
  updateParticipantAction,
  updateParticipantStatusAction,
  updateParticipantChestNumberAction,
} from "@/app/admin/actions";
import {
  getParticipantInitials,
  getParticipantStatusLabel,
  getParticipantStatusBadgeClass,
} from "@/lib/participants";
import type {
  AdminParticipantRow,
  TeamRow,
  DivisionRow,
  EventRow,
} from "@/lib/repositories";
import type { ParticipantStatus } from "@/lib/types";

interface AdminParticipantsClientProps {
  festivalId: string;
  initialParticipants: AdminParticipantRow[];
  teams: TeamRow[];
  divisions: DivisionRow[];
  events: EventRow[];
}

export default function AdminParticipantsClient({
  festivalId,
  initialParticipants,
  teams,
  divisions,
  events,
}: AdminParticipantsClientProps) {
  const [participants, setParticipants] =
    useState<AdminParticipantRow[]>(initialParticipants);
  const [isPending, startTransition] = useTransition();

  // Search and filter criteria state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedDivision, setSelectedDivision] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<ParticipantStatus | "all">("all");
  const [selectedEvent, setSelectedEvent] = useState("all");

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] =
    useState<AdminParticipantRow | null>(null);
  const [chestModalParticipant, setChestModalParticipant] =
    useState<AdminParticipantRow | null>(null);
  const [quickChestInput, setQuickChestInput] = useState("");

  // Add form fields
  const [addForm, setAddForm] = useState({
    name: "",
    teamId: "",
    divisionId: "",
    chestNumber: "",
    status: "registered" as ParticipantStatus,
    phone: "",
    email: "",
    dateOfBirth: "",
    notes: "",
  });

  // Edit form fields
  const [editForm, setEditForm] = useState({
    name: "",
    teamId: "",
    divisionId: "",
    chestNumber: "",
    status: "registered" as ParticipantStatus,
    phone: "",
    email: "",
    dateOfBirth: "",
    notes: "",
  });

  // Fast lookup maps
  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const divisionMap = useMemo(
    () => new Map(divisions.map((d) => [d.id, d])),
    [divisions],
  );
  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  // Derived telemetry metrics from real database participants
  const telemetry = useMemo(() => {
    const totalCount = participants.length;
    const confirmedCount = participants.filter((p) => p.status === "confirmed").length;
    const registeredCount = participants.filter((p) => p.status === "registered").length;
    const withdrawnCount = participants.filter((p) => p.status === "withdrawn").length;
    const disqualifiedCount = participants.filter((p) => p.status === "disqualified").length;

    const uniqueTeams = new Set(
      participants.map((p) => p.team_id).filter((id): id is string => Boolean(id)),
    );
    const uniqueDivisions = new Set(
      participants.map((p) => p.division_id).filter((id): id is string => Boolean(id)),
    );
    const totalEventRegistrationsCount = participants.reduce(
      (acc, p) => acc + (p.registeredEventIds ? p.registeredEventIds.length : 0),
      0,
    );

    return {
      totalCount,
      confirmedCount,
      registeredCount,
      withdrawnCount,
      disqualifiedCount,
      teamsRepresentedCount: uniqueTeams.size,
      divisionsRepresentedCount: uniqueDivisions.size,
      totalEventRegistrationsCount,
    };
  }, [participants]);

  // Filtered participants calculation
  const filteredParticipants = useMemo(() => {
    return participants.filter((p) => {
      // 1. Search Query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.trim().toLowerCase();
        const teamName = p.team_id ? (teamMap.get(p.team_id)?.name || "").toLowerCase() : "";
        const nameMatch = p.name.toLowerCase().includes(query);
        const publicIdMatch = (p.public_id || "").toLowerCase().includes(query);
        const chestMatch = (p.chest_number || "").toLowerCase().includes(query);
        const teamMatch = teamName.includes(query);

        if (!nameMatch && !publicIdMatch && !chestMatch && !teamMatch) {
          return false;
        }
      }

      // 2. Team Filter
      if (selectedTeam !== "all") {
        if (p.team_id !== selectedTeam) {
          return false;
        }
      }

      // 3. Division Filter
      if (selectedDivision !== "all") {
        if (p.division_id !== selectedDivision) {
          return false;
        }
      }

      // 4. Status Filter
      if (selectedStatus !== "all") {
        if (p.status !== selectedStatus) {
          return false;
        }
      }

      // 5. Event Filter
      if (selectedEvent !== "all") {
        if (!p.registeredEventIds || !p.registeredEventIds.includes(selectedEvent)) {
          return false;
        }
      }

      return true;
    });
  }, [participants, searchQuery, selectedTeam, selectedDivision, selectedStatus, selectedEvent, teamMap]);

  const filterActive = Boolean(
    searchQuery.trim() !== "" ||
      selectedTeam !== "all" ||
      selectedDivision !== "all" ||
      selectedStatus !== "all" ||
      selectedEvent !== "all",
  );

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedTeam("all");
    setSelectedDivision("all");
    setSelectedStatus("all");
    setSelectedEvent("all");
  };

  // Open Edit Modal with participant data
  const handleOpenEdit = (p: AdminParticipantRow) => {
    setEditingParticipant(p);
    setEditForm({
      name: p.name,
      teamId: p.team_id || "",
      divisionId: p.division_id || "",
      chestNumber: p.chest_number || "",
      status: p.status,
      phone: p.phone || "",
      email: p.email || "",
      dateOfBirth: p.date_of_birth ? p.date_of_birth.split("T")[0] : "",
      notes: p.notes || "",
    });
    setFeedback(null);
  };

  // Open Quick Chest Number Modal
  const handleOpenChestModal = (p: AdminParticipantRow) => {
    setChestModalParticipant(p);
    setQuickChestInput(p.chest_number || "");
    setFeedback(null);
  };

  // Submit Quick Chest Allocation
  const handleQuickChestSubmit = () => {
    if (!chestModalParticipant) return;
    const targetId = chestModalParticipant.id;
    const targetName = chestModalParticipant.name;
    const trimmed = quickChestInput.trim();

    setFeedback(null);
    startTransition(async () => {
      const res = await updateParticipantChestNumberAction(targetId, trimmed);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Chest number for ${targetName} updated to "${trimmed || "None"}".`,
        });
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === targetId ? { ...p, chest_number: trimmed || null } : p,
          ),
        );
        setChestModalParticipant(null);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update chest number.",
        });
      }
    });
  };

  // Quick Status Transition directly from row dropdown
  const handleQuickStatusChange = (
    participant: AdminParticipantRow,
    newStatus: ParticipantStatus,
  ) => {
    if (participant.status === newStatus) return;

    setFeedback(null);
    const previousStatus = participant.status;

    // Optimistic update
    setParticipants((prev) =>
      prev.map((p) => (p.id === participant.id ? { ...p, status: newStatus } : p)),
    );

    startTransition(async () => {
      const res = await updateParticipantStatusAction(participant.id, newStatus);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Status of ${participant.name} updated to "${getParticipantStatusLabel(newStatus)}".`,
        });
      } else {
        // Revert on error
        setParticipants((prev) =>
          prev.map((p) => (p.id === participant.id ? { ...p, status: previousStatus } : p)),
        );
        setFeedback({
          type: "error",
          message: res.error || "Failed to update participant status.",
        });
      }
    });
  };

  // Submit Add Participant Form
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      setFeedback({ type: "error", message: "Athlete full name is required." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await createParticipantAction({
        festivalId,
        name: addForm.name.trim(),
        teamId: addForm.teamId || null,
        divisionId: addForm.divisionId || null,
        chestNumber: addForm.chestNumber.trim() || null,
        status: addForm.status,
        phone: addForm.phone.trim() || null,
        email: addForm.email.trim() || null,
        dateOfBirth: addForm.dateOfBirth || null,
        notes: addForm.notes.trim() || null,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Athlete "${addForm.name}" registered successfully.`,
        });
        // Add new participant optimistically / refresh state
        const newRow: AdminParticipantRow = {
          id: res.participantId || String(Date.now()),
          festival_id: festivalId,
          name: addForm.name.trim(),
          public_id: "PGS-PENDING",
          team_id: addForm.teamId || null,
          division_id: addForm.divisionId || null,
          chest_number: addForm.chestNumber.trim() || null,
          status: addForm.status,
          phone: addForm.phone.trim() || null,
          email: addForm.email.trim() || null,
          date_of_birth: addForm.dateOfBirth || null,
          notes: addForm.notes.trim() || null,
          profile_image_url: null,
          registeredEventIds: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setParticipants((prev) => [newRow, ...prev]);
        setIsAddModalOpen(false);
        setAddForm({
          name: "",
          teamId: "",
          divisionId: "",
          chestNumber: "",
          status: "registered",
          phone: "",
          email: "",
          dateOfBirth: "",
          notes: "",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to create participant record.",
        });
      }
    });
  };

  // Submit Edit Participant Form
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParticipant) return;
    if (!editForm.name.trim()) {
      setFeedback({ type: "error", message: "Athlete full name cannot be empty." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await updateParticipantAction({
        participantId: editingParticipant.id,
        name: editForm.name.trim(),
        teamId: editForm.teamId || null,
        divisionId: editForm.divisionId || null,
        chestNumber: editForm.chestNumber.trim() || null,
        status: editForm.status,
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        dateOfBirth: editForm.dateOfBirth || null,
        notes: editForm.notes.trim() || null,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Athlete "${editForm.name}" updated successfully.`,
        });
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === editingParticipant.id
              ? {
                  ...p,
                  name: editForm.name.trim(),
                  team_id: editForm.teamId || null,
                  division_id: editForm.divisionId || null,
                  chest_number: editForm.chestNumber.trim() || null,
                  status: editForm.status,
                  phone: editForm.phone.trim() || null,
                  email: editForm.email.trim() || null,
                  date_of_birth: editForm.dateOfBirth || null,
                  notes: editForm.notes.trim() || null,
                  updated_at: new Date().toISOString(),
                }
              : p,
          ),
        );
        setEditingParticipant(null);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update participant record.",
        });
      }
    });
  };

  return (
    <div className="pegasus-animate-fade" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header with Add Athlete button */}
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <p className="pegasus-eyebrow" style={{ margin: "0 0 6px" }}>
            CONTROL ROOM • ATHLETE ROSTER
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(26px, 4vw, 36px)",
              fontWeight: 850,
              letterSpacing: "-0.03em",
              color: "var(--foreground)",
            }}
          >
            Participant Registry
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "14px",
              color: "var(--muted)",
              maxWidth: "680px",
              lineHeight: 1.5,
            }}
          >
            Official competitor directory, chest allocations, division assignments,
            and event registrations across all festival teams.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsAddModalOpen(true);
            setFeedback(null);
          }}
          className="pegasus-button pegasus-button--primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            padding: "10px 18px",
            minHeight: "42px",
            boxShadow: "0 4px 14px rgba(255, 107, 0, 0.25)",
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: "bold" }}>+</span> Add Athlete
        </button>
      </section>

      {/* Feedback Alert Banner */}
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
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Registry Telemetry Metrics */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
        }}
      >
        {[
          { label: "Total Athletes", value: telemetry.totalCount, highlight: true },
          { label: "Confirmed", value: telemetry.confirmedCount, color: "var(--accent)" },
          { label: "Registered", value: telemetry.registeredCount },
          { label: "Withdrawn", value: telemetry.withdrawnCount },
          { label: "Disqualified", value: telemetry.disqualifiedCount },
          { label: "Teams Represented", value: telemetry.teamsRepresentedCount },
          { label: "Divisions Active", value: telemetry.divisionsRepresentedCount },
          { label: "Event Entries", value: telemetry.totalEventRegistrationsCount },
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
                fontSize: "24px",
                fontWeight: 850,
                lineHeight: 1.1,
                color: item.color ?? (item.value > 0 ? "var(--foreground)" : "var(--muted)"),
              }}
            >
              {item.value}
            </strong>
          </div>
        ))}
      </section>

      {/* Search and Filters Bar */}
      <section className="pegasus-admin-filter-bar">
        {/* Search input */}
        <div style={{ flex: "1 1 240px", minWidth: "200px" }}>
          <input
            type="text"
            className="pegasus-admin-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, chest #, public ID, or team..."
            style={{ width: "100%", boxSizing: "border-box" }}
            aria-label="Search participants"
          />
        </div>

        {/* Team filter */}
        <div style={{ minWidth: "130px" }}>
          <select
            className="pegasus-admin-select"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            aria-label="Filter by Team"
            style={{ width: "100%" }}
          >
            <option value="all">All Teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </div>

        {/* Division filter */}
        <div style={{ minWidth: "140px" }}>
          <select
            className="pegasus-admin-select"
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            aria-label="Filter by Division"
            style={{ width: "100%" }}
          >
            <option value="all">All Divisions</option>
            {divisions.map((div) => (
              <option key={div.id} value={div.id}>
                {div.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div style={{ minWidth: "130px" }}>
          <select
            className="pegasus-admin-select"
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as ParticipantStatus | "all")
            }
            aria-label="Filter by Status"
            style={{ width: "100%" }}
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="registered">Registered</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="disqualified">Disqualified</option>
          </select>
        </div>

        {/* Event filter */}
        <div style={{ minWidth: "150px" }}>
          <select
            className="pegasus-admin-select"
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            aria-label="Filter by Event"
            style={{ width: "100%" }}
          >
            <option value="all">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>

        {/* Clear filters button */}
        {filterActive && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="pegasus-button pegasus-button--subtle"
            style={{
              fontSize: "12px",
              height: "38px",
              padding: "0 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ✕ Clear Filters
          </button>
        )}
      </section>

      {/* Filter Readout Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          fontSize: "13px",
          color: "var(--muted)",
        }}
      >
        <span>
          Showing{" "}
          <strong style={{ color: "var(--foreground)" }}>
            {filteredParticipants.length}
          </strong>{" "}
          of {participants.length} registered athletes
        </span>

        {filterActive && (
          <span className="pegasus-admin-pill pegasus-admin-pill--active">
            Filtered View Active
          </span>
        )}
      </div>

      {/* Empty States */}
      {participants.length === 0 ? (
        <section
          className="pegasus-card"
          style={{
            textAlign: "center",
            padding: "60px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              color: "var(--muted)",
            }}
          >
            📋
          </div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
            No participants registered in database
          </h2>
          <p
            style={{
              margin: 0,
              maxWidth: "460px",
              fontSize: "14px",
              color: "var(--muted)",
              lineHeight: 1.6,
            }}
          >
            Add competitors using the &quot;Add Athlete&quot; button above to populate the
            official festival roster.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="pegasus-button pegasus-button--primary"
            style={{ marginTop: "12px" }}
          >
            + Register First Athlete
          </button>
        </section>
      ) : filteredParticipants.length === 0 ? (
        <section
          className="pegasus-card"
          style={{
            textAlign: "center",
            padding: "54px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "var(--muted)",
            }}
          >
            🔍
          </div>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
            No participants match these filters
          </h2>
          <p
            style={{
              margin: 0,
              maxWidth: "420px",
              fontSize: "13px",
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            No athlete records matched your search query or selected filter
            criteria.
          </p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="pegasus-button pegasus-button--secondary"
            style={{ marginTop: "6px", fontSize: "12px" }}
          >
            Clear Active Filters
          </button>
        </section>
      ) : (
        <>
          {/* Desktop Table View (>= 769px) */}
          <div className="pegasus-admin-desktop-table">
            <div className="pegasus-admin-table-wrapper">
              <table className="pegasus-admin-table" aria-label="Participant Roster">
                <thead>
                  <tr>
                    <th>Participant</th>
                    <th>Chest</th>
                    <th>Team</th>
                    <th>Division</th>
                    <th>Events</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParticipants.map((participant) => {
                    const team = participant.team_id
                      ? teamMap.get(participant.team_id)
                      : undefined;
                    const division = participant.division_id
                      ? divisionMap.get(participant.division_id)
                      : undefined;
                    const registeredEvents = (participant.registeredEventIds || [])
                      .map((id) => eventMap.get(id))
                      .filter((e): e is EventRow => Boolean(e));

                    const statusClass = getParticipantStatusBadgeClass(participant.status);

                    return (
                      <tr key={participant.id}>
                        {/* Participant info */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {participant.profile_image_url ? (
                              <Image
                                src={participant.profile_image_url}
                                alt={participant.name}
                                width={32}
                                height={32}
                                style={{
                                  borderRadius: "6px",
                                  objectFit: "cover",
                                  border: "1px solid var(--border)",
                                }}
                              />
                            ) : (
                              <span className="pegasus-admin-avatar-initials">
                                {getParticipantInitials(participant.name)}
                              </span>
                            )}
                            <div>
                              <strong
                                style={{
                                  fontSize: "14px",
                                  color: "var(--foreground)",
                                  display: "block",
                                }}
                              >
                                {participant.name}
                              </strong>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontFamily: "monospace",
                                  color: "var(--muted)",
                                }}
                              >
                                {participant.public_id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Chest # with quick edit trigger */}
                        <td>
                          <button
                            type="button"
                            onClick={() => handleOpenChestModal(participant)}
                            title="Click to change chest number"
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <span className="pegasus-admin-chest-badge" style={{ cursor: "pointer" }}>
                              {participant.chest_number
                                ? `CHEST ${participant.chest_number}`
                                : "+ Assign Chest"}
                            </span>
                          </button>
                        </td>

                        {/* Team */}
                        <td>
                          <strong style={{ color: "var(--foreground)" }}>
                            {team?.name ?? "—"}
                          </strong>
                        </td>

                        {/* Division */}
                        <td>
                          <span style={{ color: "var(--foreground)" }}>
                            {division?.name ?? "—"}
                          </span>
                          {division?.code && (
                            <span
                              style={{
                                display: "block",
                                fontSize: "11px",
                                color: "var(--muted)",
                                textTransform: "capitalize",
                              }}
                            >
                              {division.code}
                            </span>
                          )}
                        </td>

                        {/* Events */}
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "260px" }}>
                            {registeredEvents.length === 0 ? (
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                None
                              </span>
                            ) : (
                              registeredEvents.map((e) => (
                                <span
                                  key={e.id}
                                  style={{
                                    fontSize: "10px",
                                    padding: "2px 6px",
                                    background: "rgba(255, 255, 255, 0.04)",
                                    border: "1px solid var(--border)",
                                    borderRadius: "4px",
                                    color: "var(--muted)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {e.name}
                                </span>
                              ))
                            )}
                          </div>
                        </td>

                        {/* Fast Status Selector */}
                        <td>
                          <select
                            className={`pegasus-status ${statusClass}`}
                            value={participant.status}
                            disabled={isPending}
                            onChange={(e) =>
                              handleQuickStatusChange(
                                participant,
                                e.target.value as ParticipantStatus,
                              )
                            }
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "4px 8px",
                              borderRadius: "4px",
                            }}
                            aria-label={`Change status for ${participant.name}`}
                          >
                            <option value="registered" style={{ background: "#18181b", color: "#fff" }}>
                              Registered
                            </option>
                            <option value="confirmed" style={{ background: "#18181b", color: "#fff" }}>
                              Confirmed
                            </option>
                            <option value="withdrawn" style={{ background: "#18181b", color: "#fff" }}>
                              Withdrawn
                            </option>
                            <option value="disqualified" style={{ background: "#18181b", color: "#fff" }}>
                              Disqualified
                            </option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(participant)}
                              className="pegasus-button pegasus-button--subtle"
                              style={{
                                fontSize: "11px",
                                padding: "6px 10px",
                                minHeight: "30px",
                              }}
                            >
                              Edit
                            </button>
                            <Link
                              href={`/participants/${participant.id}`}
                              className="pegasus-button pegasus-button--subtle"
                              style={{
                                fontSize: "11px",
                                padding: "6px 10px",
                                minHeight: "30px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "2px",
                              }}
                            >
                              View <span>↗</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (<= 768px) */}
          <div className="pegasus-admin-mobile-cards">
            {filteredParticipants.map((participant) => {
              const team = participant.team_id
                ? teamMap.get(participant.team_id)
                : undefined;
              const division = participant.division_id
                ? divisionMap.get(participant.division_id)
                : undefined;
              const registeredEvents = (participant.registeredEventIds || [])
                .map((id) => eventMap.get(id))
                .filter((e): e is EventRow => Boolean(e));

              const statusClass = getParticipantStatusBadgeClass(participant.status);

              return (
                <article
                  key={participant.id}
                  className="pegasus-card"
                  style={{
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {/* Top: Avatar, Name, Public ID, Status selector */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {participant.profile_image_url ? (
                        <Image
                          src={participant.profile_image_url}
                          alt={participant.name}
                          width={36}
                          height={36}
                          style={{
                            borderRadius: "6px",
                            objectFit: "cover",
                            border: "1px solid var(--border)",
                          }}
                        />
                      ) : (
                        <span
                          className="pegasus-admin-avatar-initials"
                          style={{ width: "36px", height: "36px", fontSize: "13px" }}
                        >
                          {getParticipantInitials(participant.name)}
                        </span>
                      )}
                      <div>
                        <strong style={{ fontSize: "15px", display: "block" }}>
                          {participant.name}
                        </strong>
                        <span
                          style={{
                            fontSize: "11px",
                            fontFamily: "monospace",
                            color: "var(--muted)",
                          }}
                        >
                          {participant.public_id}
                        </span>
                      </div>
                    </div>

                    <select
                      className={`pegasus-status ${statusClass}`}
                      value={participant.status}
                      disabled={isPending}
                      onChange={(e) =>
                        handleQuickStatusChange(
                          participant,
                          e.target.value as ParticipantStatus,
                        )
                      }
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "4px 8px",
                      }}
                      aria-label={`Status for ${participant.name}`}
                    >
                      <option value="registered" style={{ background: "#18181b", color: "#fff" }}>
                        Registered
                      </option>
                      <option value="confirmed" style={{ background: "#18181b", color: "#fff" }}>
                        Confirmed
                      </option>
                      <option value="withdrawn" style={{ background: "#18181b", color: "#fff" }}>
                        Withdrawn
                      </option>
                      <option value="disqualified" style={{ background: "#18181b", color: "#fff" }}>
                        Disqualified
                      </option>
                    </select>
                  </div>

                  {/* Meta: Chest, Team, Division */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "8px",
                      fontSize: "12px",
                      paddingTop: "6px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleOpenChestModal(participant)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <span className="pegasus-admin-chest-badge">
                        {participant.chest_number
                          ? `CHEST ${participant.chest_number}`
                          : "+ Assign Chest"}
                      </span>
                    </button>
                    <span style={{ color: "var(--muted)" }}>•</span>
                    <strong>{team?.name ?? "No Team"}</strong>
                    <span style={{ color: "var(--muted)" }}>•</span>
                    <span style={{ color: "var(--muted)" }}>
                      {division?.name ?? "No Division"}
                    </span>
                  </div>

                  {/* Registered events */}
                  {registeredEvents.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {registeredEvents.map((e) => (
                        <span
                          key={e.id}
                          style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            background: "rgba(255, 255, 255, 0.04)",
                            border: "1px solid var(--border)",
                            borderRadius: "4px",
                            color: "var(--muted)",
                          }}
                        >
                          {e.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(participant)}
                      className="pegasus-button pegasus-button--secondary"
                      style={{
                        minHeight: "40px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      Edit Details
                    </button>
                    <Link
                      href={`/participants/${participant.id}`}
                      className="pegasus-button pegasus-button--subtle"
                      style={{
                        minHeight: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                      }}
                    >
                      View Profile <span>↗</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* ADD ATHLETE MODAL                                           */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div
          className="pegasus-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              width: "100%",
              maxWidth: "540px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              background: "#121214",
              border: "1px solid var(--border)",
              borderRadius: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p className="pegasus-eyebrow" style={{ margin: 0 }}>REGISTRATION DESK</p>
                <h3 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800 }}>
                  Register New Athlete
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Full Name */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  className="pegasus-admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  placeholder="e.g. Zayd Ibrahim"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                />
              </div>

              {/* Team & Division */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Team
                  </label>
                  <select
                    className="pegasus-admin-select"
                    style={{ width: "100%" }}
                    value={addForm.teamId}
                    onChange={(e) => setAddForm({ ...addForm, teamId: e.target.value })}
                  >
                    <option value="">Select Team (None)</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Division
                  </label>
                  <select
                    className="pegasus-admin-select"
                    style={{ width: "100%" }}
                    value={addForm.divisionId}
                    onChange={(e) => setAddForm({ ...addForm, divisionId: e.target.value })}
                  >
                    <option value="">Select Division (None)</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chest Number & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Chest Number
                  </label>
                  <input
                    type="text"
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    placeholder="e.g. 101"
                    value={addForm.chestNumber}
                    onChange={(e) => setAddForm({ ...addForm, chestNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Status
                  </label>
                  <select
                    className="pegasus-admin-select"
                    style={{ width: "100%" }}
                    value={addForm.status}
                    onChange={(e) =>
                      setAddForm({
                        ...addForm,
                        status: e.target.value as ParticipantStatus,
                      })
                    }
                  >
                    <option value="registered">Registered</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="disqualified">Disqualified</option>
                  </select>
                </div>
              </div>

              {/* Private Fields: Phone & Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Phone (Private)
                  </label>
                  <input
                    type="tel"
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    placeholder="+91 98765 43210"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Email (Private)
                  </label>
                  <input
                    type="email"
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    placeholder="athlete@domain.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Date of Birth & Notes */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                  Date of Birth (Private)
                </label>
                <input
                  type="date"
                  className="pegasus-admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  value={addForm.dateOfBirth}
                  onChange={(e) => setAddForm({ ...addForm, dateOfBirth: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                  Operational Notes (Private)
                </label>
                <textarea
                  className="pegasus-admin-input"
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
                  placeholder="Medical clearances, special desk instructions..."
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                />
              </div>

              {/* Form Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsAddModalOpen(false)}
                  className="pegasus-button pegasus-button--subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="pegasus-button pegasus-button--primary"
                >
                  {isPending ? "Registering..." : "Create Athlete Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT ATHLETE MODAL                                          */}
      {/* ============================================================ */}
      {editingParticipant && (
        <div
          className="pegasus-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingParticipant(null);
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              width: "100%",
              maxWidth: "540px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              background: "#121214",
              border: "1px solid var(--border)",
              borderRadius: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <p className="pegasus-eyebrow" style={{ margin: 0 }}>ATHLETE PROFILE</p>
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "monospace",
                      padding: "2px 6px",
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: "4px",
                    }}
                  >
                    {editingParticipant.public_id} (Immutable)
                  </span>
                </div>
                <h3 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800 }}>
                  Edit {editingParticipant.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingParticipant(null)}
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

            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Full Name */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  className="pegasus-admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              {/* Team & Division */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Team
                  </label>
                  <select
                    className="pegasus-admin-select"
                    style={{ width: "100%" }}
                    value={editForm.teamId}
                    onChange={(e) => setEditForm({ ...editForm, teamId: e.target.value })}
                  >
                    <option value="">Select Team (None)</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Division
                  </label>
                  <select
                    className="pegasus-admin-select"
                    style={{ width: "100%" }}
                    value={editForm.divisionId}
                    onChange={(e) => setEditForm({ ...editForm, divisionId: e.target.value })}
                  >
                    <option value="">Select Division (None)</option>
                    {divisions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chest Number & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Chest Number
                  </label>
                  <input
                    type="text"
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    placeholder="e.g. 101"
                    value={editForm.chestNumber}
                    onChange={(e) => setEditForm({ ...editForm, chestNumber: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Status
                  </label>
                  <select
                    className="pegasus-admin-select"
                    style={{ width: "100%" }}
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        status: e.target.value as ParticipantStatus,
                      })
                    }
                  >
                    <option value="registered">Registered</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="withdrawn">Withdrawn</option>
                    <option value="disqualified">Disqualified</option>
                  </select>
                </div>
              </div>

              {/* Private Fields: Phone & Email */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Phone (Private)
                  </label>
                  <input
                    type="tel"
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                    Email (Private)
                  </label>
                  <input
                    type="email"
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  />
                </div>
              </div>

              {/* Date of Birth & Notes */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                  Date of Birth (Private)
                </label>
                <input
                  type="date"
                  className="pegasus-admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  value={editForm.dateOfBirth}
                  onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--muted)" }}>
                  Operational Notes (Private)
                </label>
                <textarea
                  className="pegasus-admin-input"
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              {/* Form Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setEditingParticipant(null)}
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
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* QUICK CHEST NUMBER MODAL                                    */}
      {/* ============================================================ */}
      {chestModalParticipant && (
        <div
          className="pegasus-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setChestModalParticipant(null);
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              background: "#121214",
              border: "1px solid var(--border)",
              borderRadius: "12px",
            }}
          >
            <div>
              <p className="pegasus-eyebrow" style={{ margin: 0 }}>CHEST ALLOCATION</p>
              <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800 }}>
                {chestModalParticipant.name}
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                Assign an official festival chest bib number. Must be unique within the festival.
              </p>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                Chest Number
              </label>
              <input
                type="text"
                autoFocus
                className="pegasus-admin-input"
                style={{ width: "100%", boxSizing: "border-box", fontSize: "16px", fontWeight: "bold" }}
                placeholder="e.g. 104"
                value={quickChestInput}
                onChange={(e) => setQuickChestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickChestSubmit();
                  }
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => setChestModalParticipant(null)}
                className="pegasus-button pegasus-button--subtle"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleQuickChestSubmit}
                className="pegasus-button pegasus-button--primary"
              >
                {isPending ? "Assigning..." : "Save Chest"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
