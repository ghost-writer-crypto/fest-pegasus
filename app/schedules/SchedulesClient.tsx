"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  X,
  MapPin,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { ScheduleRow, EventRow, VenueRow } from "@/lib/repositories";

type Props = {
  initialSchedules: ScheduleRow[];
  events: EventRow[];
  venues: VenueRow[];
};

const DIVISION_FILTERS = [
  { id: "all", label: "All Divisions" },
  { id: "sub-junior", label: "Sub Junior" },
  { id: "junior", label: "Junior" },
  { id: "pre-senior", label: "Pre-Senior" },
  { id: "senior", label: "Senior" },
  { id: "super-senior", label: "Super Senior" },
];

export default function SchedulesClient({
  initialSchedules,
  events,
  venues,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedVenue, setSelectedVenue] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"all" | "upcoming" | "completed">("all");

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

  // Helper to determine division match strictly from explicit assigned division values
  const matchesDivision = (item: ScheduleRow, divisionKey: string): boolean => {
    if (divisionKey === "all") return true;

    // Strictly rely on explicit assigned division/category values, not title or notes
    const rawCategory = (item.category || "").trim().toUpperCase();
    if (!rawCategory) return false;

    // Tokenize on comma or delimiter to support legitimate combined division assignments
    // Normalize internal spaces to hyphens so "PRE SENIOR" -> "PRE-SENIOR" and "SUPER SENIOR" -> "SUPER-SENIOR"
    const tokens = rawCategory
      .split(/[,/|]/)
      .map((t) => t.trim().replace(/\s+/g, "-"));

    if (divisionKey === "sub-junior") {
      return tokens.some((t) => t === "SUB-JUNIOR" || t === "BIDAYA");
    }
    if (divisionKey === "junior") {
      return tokens.some((t) => t === "JUNIOR" || t === "THANIYA");
    }
    if (divisionKey === "pre-senior") {
      return tokens.some((t) => t === "PRE-SENIOR" || t === "THAMHEEDIYYA");
    }
    if (divisionKey === "senior") {
      return tokens.some((t) => t === "SENIOR" || t === "ALIYA");
    }
    if (divisionKey === "super-senior") {
      return tokens.some((t) => t === "SUPER-SENIOR" || t === "MAJESTIR");
    }
    return false;
  };

  // Helper to check if an item is completed
  const isCompletedItem = (item: ScheduleRow): boolean => {
    const rawStatus = (item.status as string || "").toLowerCase();
    return rawStatus === "finished" || rawStatus === "completed" || rawStatus === "done";
  };

  // Filter schedules: excluding any basketball/chess, excluding Integrated section
  const filteredSchedules = useMemo(() => {
    return sortedSchedules.filter((s) => {
      const event = s.event_id ? eventMap.get(s.event_id) : null;
      const venue = s.venue_id ? venueMap.get(s.venue_id) : null;
      const compType = (s.category || event?.competition_type || "").toLowerCase();
      const eventName = (s.title || event?.name || "").toLowerCase();
      const venueName = venue?.name?.toLowerCase() || "";
      const notes = s.notes?.toLowerCase() || "";
      const combined = `${compType} ${eventName} ${notes}`.toLowerCase();

      // Exclude basketball or chess strictly
      if (compType.includes("basketball") || compType.includes("chess")) {
        return false;
      }

      // Remove the Integrated section from visible schedule layout
      if (combined.includes("integrated")) {
        return false;
      }

      // Division filter
      if (!matchesDivision(s, selectedDivision)) {
        return false;
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
        const matchesVenueText = venueName.includes(q);
        const matchesNotesText = notes.includes(q);
        if (!matchesName && !matchesSport && !matchesVenueText && !matchesNotesText) {
          return false;
        }
      }

      return true;
    });
  }, [sortedSchedules, selectedDivision, selectedVenue, searchQuery, eventMap, venueMap]);

  // Partition into two clear sections: Upcoming and Completed
  const upcomingSchedules = useMemo(() => {
    return filteredSchedules.filter((s) => !isCompletedItem(s));
  }, [filteredSchedules]);

  const completedSchedules = useMemo(() => {
    return filteredSchedules.filter((s) => isCompletedItem(s));
  }, [filteredSchedules]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDivision("all");
    setSelectedVenue("all");
    setActiveTab("all");
  };

  // Render individual schedule table row
  const renderScheduleRow = (item: ScheduleRow) => {
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

    const completed = isCompletedItem(item);
    const rawStatus = (item.status as string || "").toLowerCase();
    const isDelayed = rawStatus === "delayed";
    const isCancelled = rawStatus === "cancelled";

    let statusLabel = "Scheduled";
    let statusClass = "";

    if (completed) {
      statusClass = "done";
      statusLabel = "Completed";
    } else if (isDelayed) {
      statusLabel = "Delayed";
    } else if (isCancelled) {
      statusLabel = "Cancelled";
    } else {
      statusLabel = "Upcoming";
    }

    const eventName = item.title || event?.name || item.notes || "Festival Programme";
    const categoryTag = item.category || event?.competition_type || "Championship";
    const noteText = item.notes && item.notes !== eventName ? item.notes.replace(/\//g, " • ") : categoryTag;

    return (
      <div
        key={item.id}
        className="tr"
        style={{
          transition: "background 0.15s ease",
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
              color: "var(--foreground)",
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
            {item.category && (
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  background: "rgba(255, 255, 255, 0.06)",
                  color: "var(--foreground)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                {item.category}
              </span>
            )}
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
                Tier 1 Event
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              {noteText}
            </span>
            {completed && (
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
                View Results <ArrowUpRight size={12} />
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
  };

  return (
    <section>
      {/* 1. Schedule Telemetry Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "2px",
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
            Total Programme Slots
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, lineHeight: 1.2, color: "var(--foreground)" }}>
            {initialSchedules.length}
          </strong>
        </div>

        <div
          style={{
            padding: "16px 20px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "2px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={13} style={{ color: "#f59e0b" }} />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted)",
              }}
            >
              Upcoming Fixtures
            </span>
          </div>
          <strong style={{ fontSize: "28px", fontWeight: 900, lineHeight: 1.2, color: "#f59e0b" }}>
            {upcomingSchedules.length}
          </strong>
        </div>

        <div
          style={{
            padding: "16px 20px",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "14px",
            backdropFilter: "blur(12px)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "2px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckCircle2 size={13} style={{ color: "#10b981" }} />
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted)",
              }}
            >
              Completed Events
            </span>
          </div>
          <strong style={{ fontSize: "28px", fontWeight: 900, lineHeight: 1.2, color: "#10b981" }}>
            {completedSchedules.length}
          </strong>
        </div>
      </div>

      {/* 2. Interactive Search & Division Filter Controls */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          marginBottom: "28px",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
          padding: "18px 20px",
          borderRadius: "18px",
        }}
      >
        {/* Top Controls Row */}
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Input */}
          <div
            style={{
              position: "relative",
              flex: "1 1 260px",
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
              placeholder="Search by event title, division, or notes..."
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
              aria-label="Filter by venue"
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

          {(searchQuery || selectedDivision !== "all" || selectedVenue !== "all" || activeTab !== "all") && (
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

        {/* Division Filter Row */}
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
            Division:
          </span>
          {DIVISION_FILTERS.map((div) => (
            <button
              key={div.id}
              type="button"
              onClick={() => setSelectedDivision(div.id)}
              className={`filter ${selectedDivision === div.id ? "active" : ""}`}
              style={{ padding: "6px 14px", fontSize: "11px" }}
            >
              {div.label}
            </button>
          ))}
        </div>

        {/* Section View Tabs: All, Upcoming, Completed */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "12px" }}>
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
            View:
          </span>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`filter ${activeTab === "all" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            Both Sections ({filteredSchedules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`filter ${activeTab === "upcoming" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            Upcoming Only ({upcomingSchedules.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("completed")}
            className={`filter ${activeTab === "completed" ? "active" : ""}`}
            style={{ padding: "6px 14px", fontSize: "12px" }}
          >
            Completed Only ({completedSchedules.length})
          </button>
        </div>
      </div>

      {/* 3. Empty State Handling */}
      {filteredSchedules.length === 0 ? (
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
            Try selecting a different division, adjusting your search query, or resetting filters.
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
        <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
          {/* SECTION A: UPCOMING SCHEDULE */}
          {(activeTab === "all" || activeTab === "upcoming") && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Clock size={18} style={{ color: "#f59e0b" }} />
                  <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                    Upcoming
                  </h2>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#f59e0b",
                    }}
                  >
                    {upcomingSchedules.length}
                  </span>
                </div>
              </div>

              {upcomingSchedules.length === 0 ? (
                <div
                  style={{
                    padding: "32px 20px",
                    textAlign: "center",
                    borderRadius: "14px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "var(--muted)",
                    fontSize: "14px",
                  }}
                >
                  No upcoming fixtures for the selected division or criteria.
                </div>
              ) : (
                <div className="table" style={{ background: "rgba(13, 13, 13, 0.95)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div className="tr th" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                    <span>Time & Date</span>
                    <span>Programme & Division</span>
                    <span className="hide-sm">Venue Arena</span>
                    <span>Status</span>
                  </div>
                  {upcomingSchedules.map(renderScheduleRow)}
                </div>
              )}
            </div>
          )}

          {/* SECTION B: COMPLETED SCHEDULE */}
          {(activeTab === "all" || activeTab === "completed") && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <CheckCircle2 size={18} style={{ color: "#10b981" }} />
                  <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "var(--foreground)" }}>
                    Completed
                  </h2>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                    }}
                  >
                    {completedSchedules.length}
                  </span>
                </div>
              </div>

              {completedSchedules.length === 0 ? (
                <div
                  style={{
                    padding: "32px 20px",
                    textAlign: "center",
                    borderRadius: "14px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.06)",
                    color: "var(--muted)",
                    fontSize: "14px",
                  }}
                >
                  No completed fixtures for the selected division or criteria.
                </div>
              ) : (
                <div className="table" style={{ background: "rgba(13, 13, 13, 0.95)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <div className="tr th" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                    <span>Time & Date</span>
                    <span>Programme & Division</span>
                    <span className="hide-sm">Venue Arena</span>
                    <span>Status</span>
                  </div>
                  {completedSchedules.map(renderScheduleRow)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
