"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
type LiveCard = {
  title: string;
  subtitle: string;
  value: string;
  status: "live" | "done" | "upcoming" | string;
  statusText: string;
};

type LiveBoardRow = {
  id: string;
  houseName: string;
  houseInitial: string;
  houseColor?: string;
  eventName: string;
  score: string;
  stateClass: string;
  stateText: string;
};

type Props = {
  cards: LiveCard[];
  boardRows: LiveBoardRow[];
  totalActive: number;
};

export default function LiveDisplayClient({ cards, boardRows, totalActive: _totalActive }: Props) {
  const [isJumbotronMode, setIsJumbotronMode] = useState(false);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      {/* Stadium Jumbotron / Live Mode Action Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "var(--hsu-red)",
              boxShadow: "0 0 12px var(--hsu-red)",
            }}
          />
          <span
            style={{
              fontSize: "12px",
              fontFamily: "monospace",
              color: "#aaa",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            FIELD TELEMETRY · {clock || "SYNCED"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsJumbotronMode(!isJumbotronMode)}
          className="btn"
          style={{
            fontSize: "11px",
            padding: "8px 16px",
            background: isJumbotronMode ? "#fff" : "#141414",
            color: isJumbotronMode ? "#090909" : "#fff",
            borderColor: isJumbotronMode ? "#fff" : "var(--hsu-line)",
          }}
        >
          {isJumbotronMode ? "✕ Exit Stadium Mode" : "⛶ Stadium Jumbotron Mode"}
        </button>
      </div>

      {isJumbotronMode ? (
        /* =========================================================================
           STADIUM JUMBOTRON MODE (High-readability, large arena projector view)
           ========================================================================= */
        <div
          style={{
            background: "#050505",
            border: "1px solid var(--hsu-line)",
            borderRadius: "24px",
            padding: "36px 30px",
            boxShadow: "0 30px 90px rgba(0,0,0,0.8)",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--hsu-line)",
              paddingBottom: "20px",
              marginBottom: "30px",
            }}
          >
            <div>
              <span className="status live" style={{ fontSize: "12px", padding: "6px 14px" }}>
                LIVE BROADCAST FEED
              </span>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", margin: "10px 0 0" }}>
                CAMPUS JUMBOTRON
              </h2>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "36px", fontFamily: "monospace", fontWeight: 900 }}>
                {clock}
              </div>
              <small style={{ color: "#777", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Official Time Gate
              </small>
            </div>
          </div>

          <div className="grid grid3" style={{ gap: "20px" }}>
            {cards.map((c, i) => (
              <div
                key={i}
                className="card"
                style={{
                  background: "#0c0c0c",
                  borderColor: c.status === "live" ? "var(--hsu-red)" : "var(--hsu-line)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    className={`status ${
                      c.status === "live" ? "live" : c.status === "done" ? "done" : ""
                    }`}
                  >
                    {c.statusText}
                  </span>
                  <span style={{ fontSize: "11px", color: "#666", fontFamily: "monospace" }}>
                    SLOT 0{i + 1}
                  </span>
                </div>
                <h3 style={{ fontSize: "28px", marginTop: "16px", marginBottom: "4px" }}>
                  {c.title}
                </h3>
                <p className="sub" style={{ fontSize: "13px" }}>{c.subtitle}</p>
                <div
                  className="num"
                  style={{
                    fontSize: "56px",
                    color: c.status === "live" ? "var(--hsu-red)" : "#fff",
                    marginTop: "20px",
                  }}
                >
                  {c.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* =========================================================================
         COMMITTEE HSU / ZENITHROW 3-CARD SHOWCASE (live.html)
         ========================================================================= */}
      <div className="grid grid3" style={{ marginTop: "20px" }}>
        {cards.map((card, idx) => (
          <div key={idx} className="card">
            <span
              className={`status ${
                card.status === "live"
                  ? "live"
                  : card.status === "done"
                  ? "done"
                  : ""
              }`}
            >
              {card.statusText}
            </span>
            <h3 style={{ fontSize: "28px", marginTop: "14px", marginBottom: "6px" }}>
              {card.title}
            </h3>
            <p className="sub">{card.subtitle}</p>
            <div className="num" style={{ fontSize: "58px", marginTop: "16px" }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* =========================================================================
         SECTION HEAD: LIVE BOARD
         ========================================================================= */}
      <div
        className="section-head"
        style={{
          marginTop: "80px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <div className="kicker">Live board</div>
          <h2>Follow the action.</h2>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link href="/schedules" className="btn">
            View Schedule →
          </Link>
          <Link href="/results" className="btn primary">
            Official Results →
          </Link>
        </div>
      </div>

      {/* =========================================================================
         COMMITTEE HSU / ZENITHROW LIVE BOARD TABLE (live.html)
         ========================================================================= */}
      <div className="table live-table">
        <div className="tr th">
          <span>House</span>
          <span>Event</span>
          <span>Score</span>
          <span>State</span>
        </div>

        {boardRows.map((row) => (
          <div key={row.id} className="tr">
            <span className="team">
              <i
                className="crest"
                style={{
                  color: row.houseColor || "#fff",
                  borderColor: `${row.houseColor}44` || "rgba(255,255,255,0.1)",
                }}
              >
                {row.houseInitial}
              </i>
              <b>{row.houseName}</b>
            </span>

            <span>
              <b>{row.eventName}</b>
            </span>

            <span>
              <b style={{ fontSize: "16px", letterSpacing: "-0.02em" }}>{row.score}</b>
            </span>

            <span className={`status ${row.stateClass}`}>
              {row.stateText}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
