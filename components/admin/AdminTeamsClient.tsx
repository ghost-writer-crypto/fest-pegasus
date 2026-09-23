"use client";

import { useState, useTransition } from "react";
import type { TeamRow, AdminParticipantRow } from "@/lib/repositories";
import { createTeamAction, updateTeamAction } from "@/app/admin/actions";

interface AdminTeamsClientProps {
  festivalId: string;
  initialTeams: TeamRow[];
  participants: AdminParticipantRow[];
}

export default function AdminTeamsClient({
  festivalId,
  initialTeams,
  participants,
}: AdminTeamsClientProps) {
  const [teams, setTeams] = useState<TeamRow[]>(initialTeams);
  const [selectedTeam, setSelectedTeam] = useState<TeamRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  function openCreateModal() {
    setSelectedTeam(null);
    setCode("");
    setName("");
    setColor("");
    setSortOrder(teams.length + 1);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(team: TeamRow) {
    setSelectedTeam(team);
    setCode(team.code);
    setName(team.name);
    setColor(team.color || "");
    setSortOrder(team.sort_order);
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Team name is required.");
      return;
    }
    if (!code.trim()) {
      setFormError("Team code is required.");
      return;
    }

    startTransition(async () => {
      if (selectedTeam) {
        const res = await updateTeamAction({
          teamId: selectedTeam.id,
          code,
          name,
          color: color || null,
          sortOrder,
        });
        if (!res.success) {
          setFormError(res.error || "Failed to update team.");
          return;
        }
        setTeams((prev) =>
          prev.map((t) =>
            t.id === selectedTeam.id
              ? { ...t, code: code.toUpperCase(), name, color: color || null, sort_order: sortOrder }
              : t
          )
        );
      } else {
        const res = await createTeamAction({
          festivalId,
          code,
          name,
          color: color || null,
          sortOrder,
        });
        if (!res.success) {
          setFormError(res.error || "Failed to create team.");
          return;
        }
        window.location.reload();
      }
      setIsModalOpen(false);
    });
  }

  // Count athletes per team
  const athleteCountMap = new Map<string, number>();
  for (const p of participants) {
    if (p.team_id) {
      athleteCountMap.set(p.team_id, (athleteCountMap.get(p.team_id) || 0) + 1);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Official Participating Houses</h2>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
            Configure team codes, house branding, roster rosters, and sort order.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="pegasus-button pegasus-button--primary"
          style={{ fontSize: "13px", padding: "8px 16px" }}
        >
          + Add New Team
        </button>
      </div>

      {/* Teams Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
        {teams.map((team) => {
          const athleteCount = athleteCountMap.get(team.id) || 0;
          return (
            <div
              key={team.id}
              className="pegasus-card"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "14px",
                borderLeft: team.color ? `4px solid ${team.color}` : "4px solid var(--accent)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 800,
                      fontSize: "12px",
                      padding: "2px 8px",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "4px",
                      border: "1px solid var(--border)",
                      color: "var(--accent)",
                    }}
                  >
                    CODE: {team.code}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Order: #{team.sort_order}
                  </span>
                </div>

                <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 6px" }}>
                  {team.name}
                </h3>

                <p style={{ fontSize: "13px", color: "var(--muted)", margin: 0 }}>
                  Active Athletes: <strong style={{ color: "var(--foreground)" }}>{athleteCount}</strong>
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  onClick={() => openEditModal(team)}
                  className="pegasus-button pegasus-button--secondary"
                  style={{ fontSize: "12px", padding: "4px 10px", minHeight: "30px" }}
                >
                  Edit House
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            className="pegasus-card"
            style={{
              width: "100%",
              maxWidth: "460px",
              padding: "24px",
              background: "var(--surface)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "0 0 16px" }}>
              {selectedTeam ? `Edit House: ${selectedTeam.name}` : "Create Official House"}
            </h3>

            {formError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(255, 68, 68, 0.1)",
                  border: "1px solid rgba(255, 68, 68, 0.3)",
                  borderRadius: "6px",
                  color: "#ff6b6b",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  House Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Garuda, Toofan"
                  className="pegasus-input"
                  style={{ width: "100%" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    3-Letter Code *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={5}
                    placeholder="e.g. GAR"
                    className="pegasus-input"
                    style={{ width: "100%", textTransform: "uppercase" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                    className="pegasus-input"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "4px" }}>
                  Hex Color (Optional)
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. #FFD700"
                  className="pegasus-input"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="pegasus-button pegasus-button--secondary"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pegasus-button pegasus-button--primary"
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : selectedTeam ? "Update House" : "Create House"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

