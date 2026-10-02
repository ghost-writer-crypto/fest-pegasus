"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TeamRow, AdminParticipantRow } from "@/lib/repositories";
import { createTeamAction, updateTeamAction } from "@/app/admin/actions";

interface AdminTeamsClientProps {
  festivalId: string;
  initialTeams: TeamRow[];
  participants: AdminParticipantRow[];
}

const PRESET_COLORS = [
  { name: "Crimson", hex: "#e53935" },
  { name: "Royal Blue", hex: "#2563eb" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Amber", hex: "#f59e0b" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Cyan", hex: "#06b6d4" },
  { name: "Orange", hex: "#f97316" },
  { name: "Rose", hex: "#f43f5e" },
];

export default function AdminTeamsClient({
  festivalId,
  initialTeams,
  participants,
}: AdminTeamsClientProps) {
  const router = useRouter();
  const [teams, setTeams] = useState<TeamRow[]>(initialTeams);
  const [selectedTeam, setSelectedTeam] = useState<TeamRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  // Count athletes per team
  const athleteCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of participants) {
      if (p.team_id) {
        map.set(p.team_id, (map.get(p.team_id) || 0) + 1);
      }
    }
    return map;
  }, [participants]);

  // Telemetry metrics
  const telemetry = useMemo(() => {
    const totalHouses = teams.length;
    const totalAthletes = participants.length;
    const avgRoster = totalHouses > 0 ? Math.round(totalAthletes / totalHouses) : 0;

    let largestHouse = "—";
    let maxCount = -1;
    for (const t of teams) {
      const count = athleteCountMap.get(t.id) || 0;
      if (count > maxCount) {
        maxCount = count;
        largestHouse = `${t.name} (${count})`;
      }
    }

    return {
      totalHouses,
      totalAthletes,
      avgRoster,
      largestHouse,
    };
  }, [teams, participants, athleteCountMap]);

  // Filtered teams
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.trim().toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.color || "").toLowerCase().includes(q),
    );
  }, [teams, searchQuery]);

  function openCreateModal() {
    setSelectedTeam(null);
    setCode("");
    setName("");
    setColor("#e53935");
    setSortOrder(teams.length + 1);
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(team: TeamRow) {
    setSelectedTeam(team);
    setCode(team.code);
    setName(team.name);
    setColor(team.color || "#e53935");
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
          code: code.trim().toUpperCase(),
          name: name.trim(),
          color: color.trim() || null,
          sortOrder,
        });

        if (!res.success) {
          setFormError(res.error || "Failed to update team.");
          return;
        }

        setTeams((prev) =>
          prev.map((t) =>
            t.id === selectedTeam.id
              ? {
                  ...t,
                  code: code.trim().toUpperCase(),
                  name: name.trim(),
                  color: color.trim() || null,
                  sort_order: sortOrder,
                }
              : t,
          ),
        );

        setFeedback({
          type: "success",
          message: `House "${name.trim()}" (${code.trim().toUpperCase()}) updated successfully.`,
        });
      } else {
        const res = await createTeamAction({
          festivalId,
          code: code.trim().toUpperCase(),
          name: name.trim(),
          color: color.trim() || null,
          sortOrder,
        });

        if (!res.success) {
          setFormError(res.error || "Failed to create team.");
          return;
        }

        const newTeam: TeamRow = {
          id: (res as any).teamId || String(Date.now()),
          festival_id: festivalId,
          code: code.trim().toUpperCase(),
          name: name.trim(),
          color: color.trim() || null,
          logo_url: null,
          sort_order: sortOrder,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setTeams((prev) => [...prev, newTeam].sort((a, b) => a.sort_order - b.sort_order));
        router.refresh();

        setFeedback({
          type: "success",
          message: `Official house "${name.trim()}" (${code.trim().toUpperCase()}) registered successfully.`,
        });
      }

      setIsModalOpen(false);
    });
  }

  return (
    <div className="pegasus-animate-fade" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Feedback Banner */}
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
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Telemetry Metrics Bar */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
        }}
      >
        {[
          { label: "Total Houses", value: telemetry.totalHouses, color: "var(--foreground)" },
          { label: "Active Athletes", value: telemetry.totalAthletes, color: "var(--accent)" },
          { label: "Average Roster", value: telemetry.avgRoster, color: "var(--foreground)" },
          { label: "Largest Roster", value: telemetry.largestHouse, color: "var(--foreground)" },
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
                fontSize: typeof item.value === "string" && item.value.length > 10 ? "16px" : "22px",
                fontWeight: 850,
                lineHeight: 1.1,
                color: item.color,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {item.value}
            </strong>
          </div>
        ))}
      </section>

      {/* Action and Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ flex: "1 1 240px", maxWidth: "420px" }}>
          <input
            type="text"
            className="pegasus-admin-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search house by name or 3-letter code..."
            style={{ width: "100%", boxSizing: "border-box" }}
            aria-label="Search house"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="pegasus-button pegasus-button--primary"
          style={{ fontSize: "13px", padding: "9px 18px", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <span style={{ fontSize: "16px", fontWeight: "bold" }}>+</span> Add New House
        </button>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div
          className="pegasus-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: "14px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <strong style={{ fontSize: "16px", color: "var(--foreground)" }}>
            {teams.length === 0 ? "No participating houses registered" : "No houses match your search query"}
          </strong>
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="pegasus-button pegasus-button--secondary"
              style={{ fontSize: "12px" }}
            >
              Clear Search
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreateModal}
              className="pegasus-button pegasus-button--primary"
              style={{ fontSize: "12px", marginTop: "4px" }}
            >
              + Create First House
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {filteredTeams.map((team) => {
            const athleteCount = athleteCountMap.get(team.id) || 0;
            const houseColor = team.color || "var(--accent)";

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
                  borderLeft: `4px solid ${houseColor}`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: houseColor,
                          display: "inline-block",
                          boxShadow: `0 0 8px ${houseColor}`,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "monospace",
                          fontWeight: 800,
                          fontSize: "12px",
                          padding: "2px 8px",
                          background: "rgba(255,255,255,0.06)",
                          borderRadius: "4px",
                          border: "1px solid var(--border)",
                          color: "var(--foreground)",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {team.code}
                      </span>
                    </div>

                    <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>
                      Order: #{team.sort_order}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: 850,
                      margin: "0 0 8px",
                      color: "var(--foreground)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {team.name}
                  </h3>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "13px",
                      color: "var(--muted)",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      background: "rgba(255, 255, 255, 0.03)",
                    }}
                  >
                    <span>Roster:</span>
                    <strong style={{ color: "var(--foreground)", fontSize: "14px" }}>{athleteCount}</strong>
                    <span>Athletes</span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                    paddingTop: "12px",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openEditModal(team)}
                    className="pegasus-button pegasus-button--secondary"
                    style={{ fontSize: "12px", padding: "6px 14px", minHeight: "32px" }}
                  >
                    Edit House
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create • Edit Modal */}
      {isModalOpen && (
        <div
          className="pegasus-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isPending) setIsModalOpen(false);
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "24px",
              background: "#121418",
              border: "1px solid var(--border)",
              boxShadow: "0 24px 48px rgba(0, 0, 0, 0.6)",
              borderRadius: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <p className="pegasus-eyebrow" style={{ margin: 0 }}>
                  HOUSE CONFIGURATION
                </p>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: "4px 0 0", color: "var(--foreground)" }}>
                  {selectedTeam ? `Edit House: ${selectedTeam.name}` : "Register Official House"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
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

            {formError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "6px",
                  color: "var(--destructive, #ef4444)",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                  House Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Garuda, Toofan, Agni"
                  className="pegasus-admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                    3-Letter Code *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={5}
                    placeholder="e.g. GAR"
                    className="pegasus-admin-input"
                    style={{ width: "100%", textTransform: "uppercase", boxSizing: "border-box" }}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "6px" }}>
                    Display Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted)" }}>
                    House Identity Color
                  </label>
                  {color && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: color,
                          display: "inline-block",
                          border: "1px solid rgba(255,255,255,0.4)",
                        }}
                      />
                      <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--muted)" }}>
                        {color}
                      </span>
                    </div>
                  )}
                </div>

                {/* Preset color swatches */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setColor(preset.hex)}
                      title={preset.name}
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        background: preset.hex,
                        border: color.toLowerCase() === preset.hex.toLowerCase() ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.15)",
                        boxShadow: color.toLowerCase() === preset.hex.toLowerCase() ? `0 0 10px ${preset.hex}` : "none",
                        cursor: "pointer",
                        transition: "transform 0.15s ease",
                      }}
                    />
                  ))}
                </div>

                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. #e53935"
                  className="pegasus-admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  {isPending ? "Saving..." : selectedTeam ? "Update House" : "Register House"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
