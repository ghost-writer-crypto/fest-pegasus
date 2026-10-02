"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  X,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import type { ScheduleRow, EventRow, VenueRow } from "@/lib/repositories";

type Props = {
  initialSchedules: ScheduleRow[];
  events: EventRow[];
  venues: VenueRow[];
};

export default function SchedulesClient({
  initialSchedules,
  events,
  venues,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | "live" | "scheduled" | "finished">("all");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [selectedVenue, setSelectedVenue] = useState<string>("all");

  const eventMap = useMemo(
    () => new Map(events.map((e) => [e.id, e])),
    [events],
  );
  const venueMap = useMemo(
    () => new Map(venues.map((v) => [v.id, v])),
    [venues],
  );

  // Chronologically sorted schedules
  const sortedSchedules = useMemo(() => {
    return [...initialSchedules].sort((a, b) => {
      return new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
  }, [initialSchedules]);

  // Telemetry counts
  const telemetry = useMemo(() => {
    const total = sortedSchedules.length;
    const live = sortedSchedules.filter((s) => (s.status as string).toLowerCase() === "live").length;
    const finished = sortedSchedules.filter((s) => {
      const st = (s.status as string).toLowerCase();
      return st === "finished" || st === "completed" || st === "done";
    }).length;
    const scheduled = total - live - finished;
    const activeVenues = new Set(sortedSchedules.map((s) => s.venue_id).filter(Boolean)).size;

    return { total, live, finished, scheduled, activeVenues };
  }, [sortedSchedules]);

  // Derive distinct sports from official events and schedule categories (excluding any Basketball or Chess)
  const officialSports = useMemo(() => {
    const list = new Set<string>();
    for (const e of events) {
      if (
        e.competition_type &&
        e.competition_type.toLowerCase() !== "basketball" &&
        e.competition_type.toLowerCase() !== "chess"
      ) {
        list.add(e.competition_type);
      }
    }
    for (const s of initialSchedules) {
      if (
        s.category &&
        s.category.toLowerCase() !== "basketball" &&
        s.category.toLowerCase() !== "chess"
      ) {
        list.add(s.category);
      }
    }
    // Ensure primary disciplines are always present
    ["Athletics", "Football", "Tug of War", "Volleyball", "Badminton", "Cricket"].forEach(
      (s) => list.add(s),
    );
    return Array.from(list);
  }, [events, initialSchedules]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return sortedSchedules.filter((s) => {
      const event = s.event_id ? eventMap.get(s.event_id) : null;
      const venue = s.venue_id ? venueMap.get(s.venue_id) : null;
      const rawStatus = (s.status as string).toLowerCase();
      const compType = (s.category || event?.competition_type || "").toLowerCase();
      const eventName = (s.title || event?.name || "").toLowerCase();
      const venueName = venue?.name?.toLowerCase() || "";
      const notes = s.notes?.toLowerCase() || "";

      // Exclude basketball or chess strictly
      if (compType.includes("basketball") || compType.includes("chess")) {
        return false;
      }

      // Status filter
      if (activeStatus === "live" && rawStatus !== "live") return false;
      if (
        activeStatus === "finished" &&
        rawStatus !== "finished" &&
        rawStatus !== "completed" &&
        rawStatus !== "done"
      ) {
        return false;
      }
      if (
        activeStatus === "scheduled" &&
        (rawStatus === "live" || rawStatus === "finished" || rawStatus === "completed" || rawStatus === "done")
      ) {
        return false;
      }

      // Sport filter
      if (selectedSport !== "all") {
        const targetSport = selectedSport.toLowerCase();
        if (!compType.includes(targetSport) && !eventName.includes(targetSport) && !notes.includes(targetSport)) {
          return false;
        }
      }

      // Venue filter
      if (selectedVenue !== "all" && s.venue_id !== selectedVenue) {
        return false;
      }

      // Text search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = eventName.includes(q);
        const matchesSport = compType.includes(q);
        const matchesVenue = venueName.includes(q);
        const matchesNotes = notes.includes(q);
        if (!matchesName && !matchesSport && !matchesVenue && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [sortedSchedules, activeStatus, selectedSport, selectedVenue, searchQuery, eventMap, venueMap]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setActiveStatus("all");
    setSelectedSport("all");
    setSelectedVenue("all");
  };

  return (
    <section>
      {/* 1. Telemetry Velocity Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            backdropFilter: "blur(12px)",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              display: "block",
            }}
          >
            Total Programme
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, lineHeight: 1.2, color: "var(--foreground)" }}>
            {telemetry.total}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
            Official Festival Heats
          </span>
        </div>

        <div
          style={{
            padding: "16px 20px",
            background: telemetry.live > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.03)",
            border: telemetry.live > 0 ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: telemetry.live > 0 ? "#ef4444" : "var(--muted)",
                boxShadow: telemetry.live > 0 ? "0 0 10px #ef4444" : "none",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: telemetry.live > 0 ? "#ef4444" : "var(--muted)",
              }}
            >
              Live Heats Now
            </span>
          </div>
          <strong style={{ fontSize: "28px", fontWeight: 900, lineHeight: 1.2, color: telemetry.live > 0 ? "#ef4444" : "var(--foreground)" }}>
            {telemetry.live}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
            Electronic timing active
          </span>
        </div>

        <div
          style={{
            padding: "16px 20px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            backdropFilter: "blur(12px)",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              display: "block",
            }}
          >
            Queued Heats
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, lineHeight: 1.2, color: "#f59e0b" }}>
            {telemetry.scheduled}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
            Next on track & courts
          </span>
        </div>

        <div
          style={{
            padding: "16px 20px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            backdropFilter: "blur(12px)",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--muted)",
              display: "block",
            }}
          >
            Completed
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, lineHeight: 1.2, color: "#10b981" }}>
            {telemetry.finished}
          </strong>
          <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
            Verified on ledger
          </span>
        </div>
      </div>

      {/* 2. Interactive Search & Filter Controls */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          marginBottom: "24px",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          padding: "18px 20px",
          borderRadius: "18px",
        }}
      >
        {/* Search Row */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              position: "relative",
              flex: "1 1 280px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "14px",
                color: "var(--muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by heat, discipline, stage, or arena..."
              style={{
                width: "100%",
                padding: "10px 38px 10px 40px",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "999px",
                color: "var(--foreground)",
                fontSize: "13px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Venue Dropdown */}
          <div style={{ minWidth: "180px" }}>
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "999px",
                color: "var(--foreground)",
                fontSize: "12px",
                fontWeight: 700,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All Arenas & Grounds</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || activeStatus !== "all" || selectedSport !== "all" || selectedVenue !== "all") && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn"
              style={{
                fontSize: "12px",
                padding: "8px 16px",
                minHeight: "36px",
                borderRadius: "999px",
              }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Status Filters Bar */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--muted)",
              marginRight: "4px",
            }}
          >
            Status:
          </span>
          <button
            type="button"
            onClick={() => setActiveStatus("all")}
            className={`filter ${activeStatus === "all" ? "active" : ""}`}
            style={{ padding: "8px 16px" }}
          >
            All Slots ({telemetry.total})
          </button>
          <button
            type="button"
            onClick={() => setActiveStatus("live")}
            className={`filter ${activeStatus === "live" ? "active" : ""}`}
            style={{
              padding: "8px 16px",
              borderColor: activeStatus === "live" ? "#ef4444" : undefined,
              color: activeStatus === "live" ? "#fff" : telemetry.live > 0 ? "#ef4444" : undefined,
              background: activeStatus === "live" ? "#ef4444" : undefined,
            }}
          >
            ● Live Heats ({telemetry.live})
          </button>
          <button
            type="button"
            onClick={() => setActiveStatus("scheduled")}
            className={`filter ${activeStatus === "scheduled" ? "active" : ""}`}
            style={{ padding: "8px 16px" }}
          >
            Upcoming ({telemetry.scheduled})
          </button>
          <button
            type="button"
            onClick={() => setActiveStatus("finished")}
            className={`filter ${activeStatus === "finished" ? "active" : ""}`}
            style={{ padding: "8px 16px" }}
          >
            Completed ({telemetry.finished})
          </button>
        </div>

        {/* Sport Discipline Filter Pills */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--muted)",
              marginRight: "4px",
            }}
          >
            Sport:
          </span>
          <button
            type="button"
            onClick={() => setSelectedSport("all")}
            className={`filter ${selectedSport === "all" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "11px" }}
          >
            All Sports
          </button>
          {officialSports.map((sport) => (
            <button
              key={sport}
              type="button"
              onClick={() => setSelectedSport(sport)}
              className={`filter ${selectedSport === sport ? "active" : ""}`}
              style={{ padding: "6px 14px", fontSize: "11px" }}
            >
              {sport}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Empty States */}
      {initialSchedules.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "60px 24px",
            textAlign: "center",
            marginTop: "16px",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px dashed rgba(255, 255, 255, 0.15)",
          }}
        >
          <div className="kicker" style={{ color: "var(--muted)" }}>
            OFFICIAL TIMETABLE
          </div>
          <h3
            style={{
              margin: "12px 0 8px",
              fontSize: "24px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            Timetable in Preparation
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              marginBottom: "24px",
              maxWidth: "520px",
              margin: "0 auto 24px",
              lineHeight: 1.6,
            }}
          >
            Official festival timetable slots are being synchronized from the production database. Check back shortly as program heats, knockouts, and ceremonial slots are published.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/events" className="btn primary">
              View Events & Rules →
            </Link>
            <Link href="/sports" className="btn">
              Explore Sports →
            </Link>
          </div>
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div
          className="card"
          style={{
            padding: "54px 24px",
            textAlign: "center",
            marginTop: "16px",
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px dashed rgba(255, 255, 255, 0.15)",
          }}
        >
          <div className="kicker" style={{ color: "var(--muted)" }}>
            ZERO FIXTURES IN QUEUE
          </div>
          <h3
            style={{
              margin: "12px 0 8px",
              fontSize: "22px",
              fontWeight: 900,
              letterSpacing: "-0.02em",
            }}
          >
            No timetable slots match the selected criteria
          </h3>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              marginBottom: "20px",
              maxWidth: "460px",
              margin: "0 auto 20px",
            }}
          >
            Try adjusting your search query, choosing a different sport discipline, or clearing active status filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn primary"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        /* 4. Championship Schedule Table */
        <div className="table" style={{ background: "rgba(13, 13, 13, 0.95)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div className="tr th" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
            <span>Time & Date</span>
            <span>Programme & Discipline</span>
            <span className="hide-sm">Venue Arena</span>
            <span>Status</span>
          </div>

          {filteredSchedules.map((item) => {
            const event = item.event_id ? eventMap.get(item.event_id) : null;
            const venue = item.venue_id ? venueMap.get(item.venue_id) : null;

            const startDate = new Date(item.starts_at);
            const isValidDate = !isNaN(startDate.getTime());
            const dateFormatted = isValidDate
              ? startDate.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  timeZone: "Asia/Kolkata",
                })
              : "";
            const timeFormatted = isValidDate
              ? startDate.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Kolkata",
                })
              : item.starts_at;

            const endDate = item.ends_at ? new Date(item.ends_at) : null;
            const endTimeFormatted = endDate && !isNaN(endDate.getTime())
              ? endDate.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Kolkata",
                })
              : null;

            const rawStatus = (item.status as string).toLowerCase();
            const isLive = rawStatus === "live";
            const isDone = rawStatus === "finished" || rawStatus === "completed" || rawStatus === "done";
            const isDelayed = rawStatus === "delayed";
            const isCancelled = rawStatus === "cancelled";

            let statusClass = "";
            let statusLabel = "Scheduled";

            if (isLive) {
              statusClass = "live";
              statusLabel = "● Live Now";
            } else if (isDone) {
              statusClass = "done";
              statusLabel = "✓ Completed";
            } else if (isDelayed) {
              statusLabel = "Delayed";
            } else if (isCancelled) {
              statusLabel = "Cancelled";
            } else {
              statusLabel = "Scheduled";
            }

            const eventName = item.title || event?.name || item.notes || "Festival Programme";
            const categoryTag = item.category || event?.competition_type || "Championship";
            const noteText = item.notes && item.notes !== eventName ? item.notes.replace(/\//g, "•") : categoryTag;

            return (
              <div
                key={item.id}
                className="tr"
                style={{
                  transition: "background 0.15s ease",
                  background: isLive ? "rgba(239, 68, 68, 0.03)" : undefined,
                }}
              >
                {/* Time & Date Column */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {dateFormatted && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--accent, #f59e0b)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {dateFormatted}
                    </span>
                  )}
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 900,
                      fontSize: "15px",
                      color: isLive ? "#ef4444" : "var(--foreground)",
                    }}
                  >
                    {timeFormatted}{endTimeFormatted ? ` – ${endTimeFormatted}` : ""}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>
                    IST
                  </span>
                </div>

                {/* Programme Details */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <strong style={{ fontSize: "15px", color: "var(--foreground)" }}>
                      {eventName}
                    </strong>
                    {event?.point_class === "W" && (
                      <span
                        style={{
                          fontSize: "9px",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: "rgba(242, 184, 75, 0.15)",
                          color: "#d97706",
                          border: "1px solid rgba(242, 184, 75, 0.3)",
                        }}
                      >
                        Tier 1 Point Matrix
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {noteText}
                    </span>
                    {isLive && (
                      <Link
                        href="/display"
                        style={{
                          fontSize: "11px",
                          color: "#ef4444",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          textDecoration: "none",
                        }}
                      >
                        Watch Stream <ArrowUpRight size={12} />
                      </Link>
                    )}
                    {isDone && (
                      <Link
                        href="/results"
                        style={{
                          fontSize: "11px",
                          color: "#10b981",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          textDecoration: "none",
                        }}
                      >
                        View Official Scores <ArrowUpRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>

                {/* Venue Column */}
                <div className="hide-sm" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <MapPin size={13} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  <span style={{ color: "var(--foreground)", fontSize: "13px", fontWeight: 600 }}>
                    {venue?.name ?? "Main Campus Grounds / TBA"}
                  </span>
                </div>

                {/* Status Column */}
                <div>
                  <span
                    className={`status ${statusClass}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      minWidth: "90px",
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
