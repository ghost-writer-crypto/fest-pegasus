"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Search,
  X,
  AlertCircle,
} from "lucide-react";
import styles from "./leaderboard.module.css";

export type LeaderboardDisplayTeam = {
  id: string;
  name: string;
  code?: string;
  rank: number;
  grossPoints: number;
  penaltyDeductions: number;
  points: number; // Net points
};

interface LeaderboardClientProps {
  standings: LeaderboardDisplayTeam[];
  totalPoints: number;
  integrityError?: string;
}

export default function LeaderboardClient({
  standings,
  totalPoints,
  integrityError,
}: LeaderboardClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"net" | "gross" | "penalties">("net");

  const maxPoints = useMemo(() => {
    return Math.max(...standings.map((t) => t.points), 1);
  }, [standings]);

  // Sorted and filtered list
  const filteredTeams = useMemo(() => {
    let list = [...standings];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.code && t.code.toLowerCase().includes(q))
      );
    }

    if (sortMode === "gross") {
      list.sort((a, b) => b.grossPoints - a.grossPoints);
    } else if (sortMode === "penalties") {
      list.sort((a, b) => a.penaltyDeductions - b.penaltyDeductions);
    } else {
      list.sort((a, b) => b.points - a.points);
    }

    return list;
  }, [standings, searchQuery, sortMode]);

  // Top 3 for Podium
  const leader = standings[0];
  const second = standings[1];
  const third = standings[2];

  return (
    <div>
      {/* 1. Data Integrity Notice (if any) */}
      {integrityError && (
        <aside
          style={{
            margin: "0 0 28px 0",
            borderLeft: "4px solid #f59e0b",
            background: "rgba(245, 158, 11, 0.06)",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid rgba(245, 158, 11, 0.2)",
          }}
          role="alert"
          aria-live="assertive"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle size={18} style={{ color: "#f59e0b" }} />
            <strong
              style={{
                fontSize: "12px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--foreground)",
              }}
            >
              Data Integrity Telemetry
            </strong>
          </div>
          <p
            style={{
              margin: "6px 0 0 0",
              fontSize: "13px",
              color: "var(--muted)",
              lineHeight: 1.5,
            }}
          >
            {integrityError}. Preserving verified fallback standings for regulatory audit safety.
          </p>
        </aside>
      )}

      {/* 2. Operational Telemetry Strip */}
      <div className={styles.telemetryGrid}>
        <div className={styles.telemetryCard}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
            }}
          >
            Active Collegiate Houses
          </span>
          <strong
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: "var(--foreground)",
              fontFamily: "monospace",
            }}
          >
            {standings.length}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            Four-House Shield Competition
          </span>
        </div>

        <div className={styles.telemetryCard}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
            }}
          >
            Total Championship Points
          </span>
          <strong
            style={{
              fontSize: "28px",
              fontWeight: 900,
              color: "#38bdf8",
              fontFamily: "monospace",
            }}
          >
            {totalPoints} PTS
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            Accrued across all disciplines
          </span>
        </div>

        <div className={styles.telemetryCard}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
            }}
          >
            Shield Pacesetter
          </span>
          <strong
            style={{
              fontSize: "22px",
              fontWeight: 900,
              color: "#f59e0b",
              lineHeight: 1.3,
            }}
          >
            {leader ? leader.name : "House 01"}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            {leader ? `${leader.points} Net PTS accrued` : "Championship Lead"}
          </span>
        </div>

        <div className={styles.telemetryCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 10px #10b981",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#10b981",
              }}
            >
              Audited & Certified
            </span>
          </div>
          <strong
            style={{
              fontSize: "18px",
              fontWeight: 800,
              color: "var(--foreground)",
              marginTop: "4px",
            }}
          >
            ZERO MANUAL OVERRIDE
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
            Cryptographically synced to chief scorer ledger
          </span>
        </div>
      </div>

      {/* 3. Flagship Olympic Podium Showcase */}
      {standings.length >= 3 && (
        <section className={styles.podiumSection}>
          <div style={{ marginBottom: "14px" }}>
            <span
              className="zenith-kicker"
              style={{ fontSize: "10px", display: "block", marginBottom: "4px" }}
            >
              01 • CHAMPIONSHIP PODIUM
            </span>
            <h2 style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>
              The House Shield Leaders
            </h2>
          </div>

          <div className={styles.podiumGrid}>
            {/* Rank 2 — Silver */}
            {second && (
              <div className={`${styles.podiumCard} ${styles.podiumSilver}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#94a3b8",
                      background: "rgba(148, 163, 184, 0.15)",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      border: "1px solid rgba(148, 163, 184, 0.3)",
                    }}
                  >
                    🥈 RANK 02 • SILVER
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>
                    -{leader.points - second.points} PTS
                  </span>
                </div>

                <h3 style={{ fontSize: "22px", fontWeight: 900, margin: "0 0 4px", color: "var(--foreground)" }}>
                  {second.name}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "16px" }}>
                  Championship Contender
                </span>

                <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ fontSize: "36px", fontWeight: 900, fontFamily: "monospace", color: "#e2e8f0" }}>
                    {second.points}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>
                    PTS
                  </span>
                </div>
              </div>
            )}

            {/* Rank 1 — Gold (Center & Elevated) */}
            {leader && (
              <div className={`${styles.podiumCard} ${styles.podiumLeader}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#f59e0b",
                      background: "rgba(245, 158, 11, 0.2)",
                      padding: "5px 12px",
                      borderRadius: "999px",
                      border: "1px solid rgba(245, 158, 11, 0.4)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    👑 RANK 01 • SHIELD LEADER
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#f59e0b",
                      letterSpacing: "0.05em",
                    }}
                  >
                    PACEMAKER
                  </span>
                </div>

                <h3 style={{ fontSize: "28px", fontWeight: 900, margin: "0 0 6px", color: "#fff" }}>
                  {leader.name}
                </h3>
                <p style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)", margin: "0 0 20px" }}>
                  Currently holding pole position for the 2026 ZENITHROW Championship Shield.
                </p>

                <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: "8px" }}>
                  <span style={{ fontSize: "48px", fontWeight: 900, fontFamily: "monospace", color: "#f59e0b", lineHeight: 1 }}>
                    {leader.points}
                  </span>
                  <span style={{ fontSize: "14px", fontWeight: 900, color: "rgba(255, 255, 255, 0.8)", textTransform: "uppercase" }}>
                    NET PTS
                  </span>
                </div>
              </div>
            )}

            {/* Rank 3 — Bronze */}
            {third && (
              <div className={`${styles.podiumCard} ${styles.podiumBronze}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "12px",
                      fontWeight: 800,
                      color: "#d97706",
                      background: "rgba(217, 119, 6, 0.15)",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      border: "1px solid rgba(217, 119, 6, 0.3)",
                    }}
                  >
                    🥉 RANK 03 • BRONZE
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>
                    -{leader.points - third.points} PTS
                  </span>
                </div>

                <h3 style={{ fontSize: "22px", fontWeight: 900, margin: "0 0 4px", color: "var(--foreground)" }}>
                  {third.name}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "16px" }}>
                  Championship Contender
                </span>

                <div style={{ marginTop: "auto", display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <span style={{ fontSize: "36px", fontWeight: 900, fontFamily: "monospace", color: "#fbbf24" }}>
                    {third.points}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>
                    PTS
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Interactive Search & Sort Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
          marginBottom: "18px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 240px", maxWidth: "380px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search collegiate house..."
            style={{
              width: "100%",
              padding: "10px 36px 10px 38px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "999px",
              color: "var(--foreground)",
              fontSize: "13px",
              outline: "none",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort Pills */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", color: "var(--muted)" }}>
            Sort:
          </span>
          <button
            type="button"
            onClick={() => setSortMode("net")}
            className={`filter ${sortMode === "net" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "11px" }}
          >
            Net Championship PTS
          </button>
          <button
            type="button"
            onClick={() => setSortMode("gross")}
            className={`filter ${sortMode === "gross" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "11px" }}
          >
            Gross Won PTS
          </button>
          <button
            type="button"
            onClick={() => setSortMode("penalties")}
            className={`filter ${sortMode === "penalties" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "11px" }}
          >
            Clean Ledger
          </button>
        </div>
      </div>

      {/* 5. Master Standings Table / Cards */}
      <div className={styles.standingsList}>
        {filteredTeams.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: "16px",
              border: "1px dashed rgba(255, 255, 255, 0.12)",
            }}
          >
            <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)" }}>
              No collegiate house found matching &quot;{searchQuery}&quot;.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="btn"
              style={{ marginTop: "12px", fontSize: "12px" }}
            >
              Clear Search
            </button>
          </div>
        ) : (
          filteredTeams.map((team) => {
            const rankFormatted = String(team.rank).padStart(2, "0");
            const isLeader = team.rank === 1;
            const pct = Math.round((team.points / maxPoints) * 100);

            return (
              <Link
                key={team.id}
                href="/teams"
                className={styles.standingRow}
                style={{
                  borderLeft: isLeader ? "4px solid #f59e0b" : undefined,
                }}
              >
                {/* 1. Dominant Rank */}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: "clamp(24px, 3vw, 36px)",
                      fontWeight: 900,
                      lineHeight: 1,
                      color: isLeader ? "#f59e0b" : "var(--foreground)",
                    }}
                  >
                    {rankFormatted}
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: isLeader ? "#f59e0b" : "var(--muted)",
                      marginTop: "3px",
                    }}
                  >
                    {isLeader ? "LEADER" : `RANK ${team.rank}`}
                  </span>
                </div>

                {/* 2. House Identity & Relative Performance Bar */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "18px", color: "var(--foreground)" }}>
                      {team.name}
                    </strong>
                    {team.code && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "monospace",
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "rgba(255, 255, 255, 0.06)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          color: "var(--muted)",
                        }}
                      >
                        {team.code}
                      </span>
                    )}
                    {isLeader && (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: "rgba(245, 158, 11, 0.15)",
                          color: "#f59e0b",
                          border: "1px solid rgba(245, 158, 11, 0.3)",
                        }}
                      >
                        ★ SHIELD PACESETTER
                      </span>
                    )}
                  </div>

                  {/* Relative Progress Bar */}
                  <div
                    style={{
                      width: "100%",
                      height: "5px",
                      background: "rgba(255, 255, 255, 0.06)",
                      borderRadius: "999px",
                      overflow: "hidden",
                      maxWidth: "400px",
                    }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: isLeader
                          ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                          : "linear-gradient(90deg, #38bdf8, #818cf8)",
                        borderRadius: "999px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>

                  {/* Ledger Breakdown Meta */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "var(--muted)", flexWrap: "wrap" }}>
                    <span>Gross {team.grossPoints} PTS</span>
                    {team.penaltyDeductions < 0 && (
                      <span style={{ color: "#ef4444", fontWeight: 700 }}>
                        {team.penaltyDeductions} PTS Penalty
                      </span>
                    )}
                    <span>•</span>
                    <span style={{ color: "#38bdf8", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "2px" }}>
                      Inspect Squad Roster <ArrowUpRight size={11} />
                    </span>
                  </div>
                </div>

                {/* 3. Dominant Points Value */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                    <span
                      style={{
                        fontSize: "clamp(24px, 3.5vw, 34px)",
                        fontWeight: 900,
                        fontFamily: "monospace",
                        color: isLeader ? "#f59e0b" : "var(--foreground)",
                        lineHeight: 1,
                      }}
                    >
                      {team.points}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 800,
                        fontFamily: "monospace",
                        color: "var(--muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      PTS
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "9px",
                      fontFamily: "monospace",
                      fontWeight: 800,
                      color: "var(--muted)",
                      letterSpacing: "0.06em",
                      marginTop: "3px",
                    }}
                  >
                    NET TOTAL
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* 6. Championship Codex Point Matrix Explainer Deck */}
      <section style={{ marginTop: "54px" }}>
        <div style={{ marginBottom: "16px" }}>
          <span
            className="zenith-kicker"
            style={{ fontSize: "10px", display: "block", marginBottom: "4px" }}
          >
            02 • CODEX REGULATION MATRIX
          </span>
          <h2 style={{ fontSize: "20px", fontWeight: 900, letterSpacing: "-0.02em", margin: 0 }}>
            Championship Point Allocations
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--muted)" }}>
            Standard points contributed directly to the house shield upon Chief Scorer certification.
          </p>
        </div>

        <div className={styles.matrixGrid}>
          <div className={styles.matrixCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#f59e0b", letterSpacing: "0.06em" }}>
                CLASS W
              </span>
              <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b", borderRadius: "4px", fontWeight: 800 }}>
                TIER 1
              </span>
            </div>
            <strong style={{ fontSize: "15px", display: "block", color: "var(--foreground)" }}>
              High Stakes Championship
            </strong>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 12px", lineHeight: 1.4 }}>
              Tug of War 600kg, 100m Sprint Grand Final, Football Championship Knockout.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "monospace", color: "var(--foreground)", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px" }}>
              <span>🥇 10 PTS</span>
              <span>🥈 7 PTS</span>
              <span>🥉 5 PTS</span>
              <span>4th: 3 PTS</span>
            </div>
          </div>

          <div className={styles.matrixCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#38bdf8", letterSpacing: "0.06em" }}>
                CLASS X
              </span>
              <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", borderRadius: "4px", fontWeight: 800 }}>
                TIER 2
              </span>
            </div>
            <strong style={{ fontSize: "15px", display: "block", color: "var(--foreground)" }}>
              Major Bracket Heats
            </strong>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 12px", lineHeight: 1.4 }}>
              Volleyball Tournament, Badminton Men&apos;s & Women&apos;s Singles, 4x100m Relay.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "monospace", color: "var(--foreground)", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px" }}>
              <span>🥇 7 PTS</span>
              <span>🥈 5 PTS</span>
              <span>🥉 3 PTS</span>
              <span>4th: 1 PT</span>
            </div>
          </div>

          <div className={styles.matrixCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#a855f7", letterSpacing: "0.06em" }}>
                CLASS Y
              </span>
              <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(168, 85, 247, 0.15)", color: "#a855f7", borderRadius: "4px", fontWeight: 800 }}>
                TIER 3
              </span>
            </div>
            <strong style={{ fontSize: "15px", display: "block", color: "var(--foreground)" }}>
              Field & Precision Events
            </strong>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 12px", lineHeight: 1.4 }}>
              Long Jump, High Jump, Shot Put, Archery & Target Precision disciplines.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "monospace", color: "var(--foreground)", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px" }}>
              <span>🥇 5 PTS</span>
              <span>🥈 3 PTS</span>
              <span>🥉 2 PTS</span>
              <span>4th: 1 PT</span>
            </div>
          </div>

          <div className={styles.matrixCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: "#10b981", letterSpacing: "0.06em" }}>
                CLASS Z
              </span>
              <span style={{ fontSize: "10px", padding: "2px 6px", background: "rgba(16, 185, 129, 0.15)", color: "#10b981", borderRadius: "4px", fontWeight: 800 }}>
                TIER 4
              </span>
            </div>
            <strong style={{ fontSize: "15px", display: "block", color: "var(--foreground)" }}>
              Consolation & Traditions
            </strong>
            <p style={{ fontSize: "12px", color: "var(--muted)", margin: "4px 0 12px", lineHeight: 1.4 }}>
              Plate fixtures, consolation finals, and official campus tradition challenges.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "monospace", color: "var(--foreground)", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px" }}>
              <span>🥇 3 PTS</span>
              <span>🥈 2 PTS</span>
              <span>🥉 1 PT</span>
              <span>4th: 0 PTS</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Action Navigation Footer Banner */}
      <section
        style={{
          marginTop: "48px",
          padding: "28px 32px",
          borderRadius: "20px",
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <span
            className="zenith-kicker"
            style={{ fontSize: "10px", display: "block", marginBottom: "4px" }}
          >
            03 • TOURNAMENT ROSTERS
          </span>
          <h3 style={{ fontSize: "20px", fontWeight: 900, margin: 0, color: "var(--foreground)" }}>
            Inspect Registered Athletes & Squads
          </h3>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0", maxWidth: "520px" }}>
            Explore athlete rosters, team managers, and verified participant draw lists across all four collegiate houses.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/teams" className="btn primary">
            View All Teams →
          </Link>
          <Link href="/results" className="btn">
            Verified Results Ledger →
          </Link>
        </div>
      </section>
    </div>
  );
}
