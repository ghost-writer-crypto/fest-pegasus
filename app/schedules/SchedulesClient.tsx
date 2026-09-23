"use client";

import { useState, useMemo } from "react";
import type { ScheduleRow, EventRow, VenueRow } from "@/lib/repositories";
import {
  getScheduleStatusLabel,
  getScheduleStatusBadgeClass,
} from "@/lib/schedule/scheduleUtils";

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
  const [selectedDate, setSelectedDate] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

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

  // Derive distinct calendar dates
  const distinctDates = useMemo(() => {
    const dates = new Set<string>();
    for (const item of sortedSchedules) {
      const d = new Date(item.starts_at);
      if (!isNaN(d.getTime())) {
        const key = item.starts_at.split("T")[0];
        dates.add(key);
      }
    }
    return Array.from(dates).sort();
  }, [sortedSchedules]);

  // Filtered schedule list
  const filteredSchedules = useMemo(() => {
    return sortedSchedules.filter((item) => {
      // Date filter
      if (selectedDate !== "all") {
        if (!item.starts_at.startsWith(selectedDate)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "live" && item.status !== "live") {
          return false;
        }
        if (statusFilter === "scheduled" && item.status !== "scheduled") {
          return false;
        }
        if (statusFilter === "finished" && item.status !== "finished") {
          return false;
        }
      }

      return true;
    });
  }, [sortedSchedules, selectedDate, statusFilter]);

  const isFiltering = selectedDate !== "all" || statusFilter !== "all";

  const handleResetFilters = () => {
    setSelectedDate("all");
    setStatusFilter("all");
  };

  return (
    <section>
      {/* Date Tabs and Status Filters Bar */}
      <div
        className="pegasus-filter-row"
        style={{ justifyContent: "space-between" }}
      >
        {/* Date Tabs */}
        {distinctDates.length > 1 && (
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setSelectedDate("all")}
              className={`pegasus-button ${
                selectedDate === "all"
                  ? "pegasus-button--primary"
                  : "pegasus-button--secondary"
              }`}
              style={{ padding: "0 14px", minHeight: "40px", fontSize: "12px" }}
            >
              All Days
            </button>
            {distinctDates.map((dateKey) => {
              const d = new Date(`${dateKey}T00:00:00.000Z`);
              const label = isNaN(d.getTime())
                ? dateKey
                : d.toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  });

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(dateKey)}
                  className={`pegasus-button ${
                    selectedDate === dateKey
                      ? "pegasus-button--primary"
                      : "pegasus-button--secondary"
                  }`}
                  style={{
                    padding: "0 14px",
                    minHeight: "40px",
                    fontSize: "12px",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Status Dropdown */}
        <div style={{ minWidth: "160px" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pegasus-select"
            style={{ minHeight: "40px", fontSize: "12px" }}
            aria-label="Filter by schedule status"
          >
            <option value="all">All Timetable Slots</option>
            <option value="live">Live Now</option>
            <option value="scheduled">Scheduled</option>
            <option value="finished">Finished</option>
          </select>
        </div>
      </div>

      {/* Status Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          fontSize: "13px",
          color: "var(--muted)",
        }}
      >
        <span>
          Showing <strong>{filteredSchedules.length}</strong> of{" "}
          {initialSchedules.length} program slot
          {initialSchedules.length === 1 ? "" : "s"}
        </span>

        {isFiltering && (
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              fontSize: "13px",
              padding: 0,
            }}
          >
            Clear active filters
          </button>
        )}
      </div>

      {/* Filtered Empty State */}
      {filteredSchedules.length === 0 ? (
        <div
          className="pegasus-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            marginTop: "16px",
          }}
        >
          <p
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--foreground)",
              marginBottom: "8px",
            }}
          >
            No timetable slots match your filter
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              marginBottom: "20px",
            }}
          >
            Try selecting a different date or clearing the status filter.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="pegasus-button pegasus-button--secondary"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Schedule Items List */
        <div style={{ display: "grid", gap: "16px" }}>
          {filteredSchedules.map((item) => {
            const event = item.event_id ? eventMap.get(item.event_id) : null;
            const venue = item.venue_id ? venueMap.get(item.venue_id) : null;
            const statusLabel = getScheduleStatusLabel(item.status);
            const statusClass = getScheduleStatusBadgeClass(item.status);

            const startDate = new Date(item.starts_at);
            const timeFormatted = isNaN(startDate.getTime())
              ? item.starts_at
              : startDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
            const dateFormatted = isNaN(startDate.getTime())
              ? ""
              : startDate.toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });

            return (
              <article
                key={item.id}
                className="pegasus-card pegasus-card--interactive"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "14px",
                  }}
                >
                  {/* Left: Time + Event + Venue */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "2px",
                        minWidth: "75px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "16px",
                          fontWeight: 800,
                          color: "var(--accent)",
                        }}
                      >
                        {timeFormatted}
                      </span>
                      {dateFormatted && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          {dateFormatted}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: 750,
                          color: "var(--foreground)",
                        }}
                      >
                        {event?.name ?? "Scheduled Program Slot"}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          marginTop: "4px",
                          fontSize: "12px",
                          color: "var(--muted)",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>{event?.competition_type ?? "Event"}</span>
                        <span>•</span>
                        <span>{venue?.name ?? "Venue Pending"}</span>
                        {item.notes && (
                          <>
                            <span>•</span>
                            <span style={{ color: "var(--muted-strong)" }}>
                              {item.notes}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Badge */}
                  <span className={`pegasus-status ${statusClass}`}>
                    <span className="pegasus-status__dot" />
                    {statusLabel}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

