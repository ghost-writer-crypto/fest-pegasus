"use client";

import { useState, useMemo, useTransition } from "react";
import {
  createScheduleAction,
  updateScheduleAction,
  updateScheduleStatusAction,
} from "@/app/admin/actions";
import {
  getScheduleStatusLabel,
  getScheduleStatusBadgeClass,
} from "@/lib/schedule/scheduleUtils";
import type {
  ScheduleRow,
  EventRow,
  VenueRow,
  ScheduleChangeRow,
} from "@/lib/repositories";
import type { ScheduleStatus } from "@/lib/types";

interface AdminScheduleClientProps {
  festivalId: string;
  initialSchedules: ScheduleRow[];
  events: EventRow[];
  venues: VenueRow[];
  initialChanges?: ScheduleChangeRow[];
}

export default function AdminScheduleClient({
  festivalId,
  initialSchedules,
  events,
  venues,
  initialChanges = [],
}: AdminScheduleClientProps) {
  const [schedules, setSchedules] = useState<ScheduleRow[]>(initialSchedules);
  const [changes, setChanges] = useState<ScheduleChangeRow[]>(initialChanges);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("all");
  const [selectedVenue, setSelectedVenue] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<ScheduleStatus | "all">("all");

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleRow | null>(null);
  const [statusDialogSchedule, setStatusDialogSchedule] = useState<ScheduleRow | null>(null);
  const [historySchedule, setHistorySchedule] = useState<ScheduleRow | null>(null);

  // Add form state
  const [addForm, setAddForm] = useState({
    eventId: "",
    venueId: "",
    startsAt: "",
    endsAt: "",
    status: "scheduled" as ScheduleStatus,
    notes: "",
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    eventId: "",
    venueId: "",
    startsAt: "",
    endsAt: "",
    status: "scheduled" as ScheduleStatus,
    notes: "",
    reason: "",
  });

  // Status dialog state
  const [newStatus, setNewStatus] = useState<ScheduleStatus>("scheduled");
  const [statusReason, setStatusReason] = useState("");

  // Lookup maps
  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const venueMap = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);

  // Distinct dates in UTC
  const distinctDates = useMemo(() => {
    const dates = new Set<string>();
    for (const item of schedules) {
      if (item.starts_at) {
        dates.add(item.starts_at.split("T")[0]);
      }
    }
    return Array.from(dates).sort();
  }, [schedules]);

  // Telemetry metrics
  const telemetry = useMemo(() => {
    const totalCount = schedules.length;
    const scheduledCount = schedules.filter((s) => s.status === "scheduled").length;
    const liveCount = schedules.filter((s) => s.status === "live").length;
    const finishedCount = schedules.filter((s) => s.status === "finished").length;
    const delayedCount = schedules.filter(
      (s) => s.status === "delayed" || s.status === "postponed" || s.status === "venue_changed",
    ).length;
    const cancelledCount = schedules.filter((s) => s.status === "cancelled").length;

    const usedVenues = new Set(
      schedules.map((s) => s.venue_id).filter((v): v is string => Boolean(v)),
    );

    return {
      totalCount,
      scheduledCount,
      liveCount,
      finishedCount,
      delayedCount,
      cancelledCount,
      venuesInUse: usedVenues.size,
    };
  }, [schedules]);

  // Filtered schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter((item) => {
      // 1. Search Query
      if (searchQuery.trim() !== "") {
        const q = searchQuery.trim().toLowerCase();
        const eventName = item.event_id ? (eventMap.get(item.event_id)?.name || "").toLowerCase() : "";
        const venueName = item.venue_id ? (venueMap.get(item.venue_id)?.name || "").toLowerCase() : "";
        const notes = (item.notes || "").toLowerCase();

        if (!eventName.includes(q) && !venueName.includes(q) && !notes.includes(q)) {
          return false;
        }
      }

      // 2. Date Filter
      if (selectedDate !== "all") {
        if (!item.starts_at.startsWith(selectedDate)) {
          return false;
        }
      }

      // 3. Venue Filter
      if (selectedVenue !== "all") {
        if (item.venue_id !== selectedVenue) {
          return false;
        }
      }

      // 4. Event Filter
      if (selectedEvent !== "all") {
        if (item.event_id !== selectedEvent) {
          return false;
        }
      }

      // 5. Status Filter
      if (selectedStatus !== "all") {
        if (item.status !== selectedStatus) {
          return false;
        }
      }

      return true;
    });
  }, [schedules, searchQuery, selectedDate, selectedVenue, selectedEvent, selectedStatus, eventMap, venueMap]);

  const isFiltering =
    searchQuery.trim() !== "" ||
    selectedDate !== "all" ||
    selectedVenue !== "all" ||
    selectedEvent !== "all" ||
    selectedStatus !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDate("all");
    setSelectedVenue("all");
    setSelectedEvent("all");
    setSelectedStatus("all");
  };

  // Helper to format ISO to datetime-local string (YYYY-MM-DDTHH:mm)
  const formatForInput = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Open Edit Modal
  const handleOpenEdit = (s: ScheduleRow) => {
    setEditingSchedule(s);
    setEditForm({
      eventId: s.event_id || "",
      venueId: s.venue_id || "",
      startsAt: formatForInput(s.starts_at),
      endsAt: formatForInput(s.ends_at),
      status: s.status,
      notes: s.notes || "",
      reason: "",
    });
    setFeedback(null);
  };

  // Open Status Dialog
  const handleOpenStatusDialog = (s: ScheduleRow) => {
    setStatusDialogSchedule(s);
    setNewStatus(s.status);
    setStatusReason("");
    setFeedback(null);
  };

  // Submit Status Change Dialog
  const handleStatusDialogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusDialogSchedule) return;
    const targetId = statusDialogSchedule.id;
    const oldStatus = statusDialogSchedule.status;

    if (newStatus === oldStatus) {
      setStatusDialogSchedule(null);
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await updateScheduleStatusAction(
        targetId,
        newStatus,
        statusReason.trim() || `Status updated to ${newStatus}`,
      );

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Schedule status updated to "${getScheduleStatusLabel(newStatus)}".`,
        });
        setSchedules((prev) =>
          prev.map((s) => (s.id === targetId ? { ...s, status: newStatus } : s)),
        );
        setChanges((prev) => [
          {
            id: String(Date.now()),
            schedule_id: targetId,
            actor_id: null,
            action: `status_${newStatus}`,
            reason: statusReason.trim() || `Status updated to ${newStatus}`,
            before_state: statusDialogSchedule,
            after_state: { ...statusDialogSchedule, status: newStatus },
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        setStatusDialogSchedule(null);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update schedule status.",
        });
      }
    });
  };

  // Submit Add Schedule Slot
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.eventId) {
      setFeedback({ type: "error", message: "Event is required." });
      return;
    }
    if (!addForm.startsAt) {
      setFeedback({ type: "error", message: "Start date and time are required." });
      return;
    }

    const startsIso = new Date(addForm.startsAt).toISOString();
    const endsIso = addForm.endsAt ? new Date(addForm.endsAt).toISOString() : null;

    if (endsIso && new Date(endsIso) <= new Date(startsIso)) {
      setFeedback({ type: "error", message: "End time must be after start time." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await createScheduleAction({
        festivalId,
        eventId: addForm.eventId,
        venueId: addForm.venueId || null,
        startsAt: startsIso,
        endsAt: endsIso,
        status: addForm.status,
        notes: addForm.notes.trim() || null,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: "Timetable schedule slot created successfully.",
        });
        const newRow: ScheduleRow = {
          id: res.scheduleId || String(Date.now()),
          festival_id: festivalId,
          event_id: addForm.eventId,
          venue_id: addForm.venueId || null,
          competition_id: null,
          fixture_id: null,
          starts_at: startsIso,
          ends_at: endsIso,
          status: addForm.status,
          notes: addForm.notes.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setSchedules((prev) =>
          [...prev, newRow].sort(
            (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
          ),
        );
        setIsAddModalOpen(false);
        setAddForm({
          eventId: "",
          venueId: "",
          startsAt: "",
          endsAt: "",
          status: "scheduled",
          notes: "",
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to create schedule slot.",
        });
      }
    });
  };

  // Submit Edit Schedule Slot
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    if (!editForm.eventId) {
      setFeedback({ type: "error", message: "Event is required." });
      return;
    }
    if (!editForm.startsAt) {
      setFeedback({ type: "error", message: "Start date and time are required." });
      return;
    }

    const startsIso = new Date(editForm.startsAt).toISOString();
    const endsIso = editForm.endsAt ? new Date(editForm.endsAt).toISOString() : null;

    if (endsIso && new Date(endsIso) <= new Date(startsIso)) {
      setFeedback({ type: "error", message: "End time must be after start time." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await updateScheduleAction({
        scheduleId: editingSchedule.id,
        eventId: editForm.eventId,
        venueId: editForm.venueId || null,
        startsAt: startsIso,
        endsAt: endsIso,
        status: editForm.status,
        notes: editForm.notes.trim() || null,
        reason: editForm.reason.trim() || "Administrative reschedule / update",
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: "Schedule slot updated successfully.",
        });
        setSchedules((prev) =>
          prev
            .map((s) =>
              s.id === editingSchedule.id
                ? {
                    ...s,
                    event_id: editForm.eventId,
                    venue_id: editForm.venueId || null,
                    starts_at: startsIso,
                    ends_at: endsIso,
                    status: editForm.status,
                    notes: editForm.notes.trim() || null,
                    updated_at: new Date().toISOString(),
                  }
                : s,
            )
            .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
        );
        setChanges((prev) => [
          {
            id: String(Date.now()),
            schedule_id: editingSchedule.id,
            actor_id: null,
            action: editForm.startsAt !== formatForInput(editingSchedule.starts_at)
              ? "rescheduled"
              : editForm.venueId !== editingSchedule.venue_id
                ? "venue_changed"
                : "updated",
            reason: editForm.reason.trim() || "Administrative reschedule / update",
            before_state: editingSchedule,
            after_state: {
              ...editingSchedule,
              event_id: editForm.eventId,
              venue_id: editForm.venueId || null,
              starts_at: startsIso,
              ends_at: endsIso,
              status: editForm.status,
              notes: editForm.notes.trim() || null,
            },
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        setEditingSchedule(null);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update schedule slot.",
        });
      }
    });
  };

  return (
    <div className="pegasus-animate-fade" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header with Add Slot Button */}
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <p className="pegasus-eyebrow" style={{ margin: "0 0 6px" }}>
            CONTROL ROOM • MASTER TIMETABLE
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
            Schedule Control Center
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
            Create, assign venues, reschedule, monitor live program slots, and manage conflict-free event operations.
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
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: "bold" }}>+</span> Schedule Event
        </button>
      </section>

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
          { label: "Total Slots", value: telemetry.totalCount },
          { label: "Live Now", value: telemetry.liveCount, color: "var(--accent)" },
          { label: "Scheduled", value: telemetry.scheduledCount },
          { label: "Finished", value: telemetry.finishedCount },
          { label: "Delayed / Postponed", value: telemetry.delayedCount, color: telemetry.delayedCount > 0 ? "var(--warning, #f59e0b)" : "var(--muted)" },
          { label: "Cancelled", value: telemetry.cancelledCount, color: telemetry.cancelledCount > 0 ? "var(--destructive, #ef4444)" : "var(--muted)" },
          { label: "Venues in Use", value: telemetry.venuesInUse },
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

      {/* Date Day Filter Pills (if multiple days) */}
      {distinctDates.length > 1 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setSelectedDate("all")}
            className={`pegasus-button ${
              selectedDate === "all" ? "pegasus-button--primary" : "pegasus-button--secondary"
            }`}
            style={{ fontSize: "12px", padding: "0 14px", minHeight: "36px" }}
          >
            All Dates ({schedules.length})
          </button>
          {distinctDates.map((dateKey) => {
            const count = schedules.filter((s) => s.starts_at.startsWith(dateKey)).length;
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
                  selectedDate === dateKey ? "pegasus-button--primary" : "pegasus-button--secondary"
                }`}
                style={{ fontSize: "12px", padding: "0 14px", minHeight: "36px" }}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Search & Filters Bar */}
      <section className="pegasus-admin-filter-bar">
        <div style={{ flex: "1 1 200px", minWidth: "180px" }}>
          <input
            type="text"
            className="pegasus-admin-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search event, venue, or notes..."
            style={{ width: "100%", boxSizing: "border-box" }}
            aria-label="Search schedule"
          />
        </div>

        <div style={{ minWidth: "140px" }}>
          <select
            className="pegasus-admin-select"
            value={selectedVenue}
            onChange={(e) => setSelectedVenue(e.target.value)}
            aria-label="Filter by Venue"
            style={{ width: "100%" }}
          >
            <option value="all">All Venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: "150px" }}>
          <select
            className="pegasus-admin-select"
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            aria-label="Filter by Event"
            style={{ width: "100%" }}
          >
            <option value="all">All Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: "140px" }}>
          <select
            className="pegasus-admin-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ScheduleStatus | "all")}
            aria-label="Filter by Status"
            style={{ width: "100%" }}
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="delayed">Delayed</option>
            <option value="postponed">Postponed</option>
            <option value="venue_changed">Venue Changed</option>
            <option value="finished">Finished</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {isFiltering && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "12px", height: "38px", padding: "0 14px" }}
          >
            ✕ Clear Filters
          </button>
        )}
      </section>

      {/* Timetable Slot List */}
      {schedules.length === 0 ? (
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
            ⏱️
          </div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
            No schedule slots created
          </h2>
          <p style={{ margin: 0, maxWidth: "460px", fontSize: "14px", color: "var(--muted)" }}>
            Use &quot;Schedule Event&quot; above to allocate competition slots, venues, and program timings.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="pegasus-button pegasus-button--primary"
            style={{ marginTop: "8px" }}
          >
            + Create First Slot
          </button>
        </section>
      ) : filteredSchedules.length === 0 ? (
        <section
          className="pegasus-card"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 750 }}>
            No schedule slots match filter criteria
          </h3>
          <button
            type="button"
            onClick={handleResetFilters}
            className="pegasus-button pegasus-button--secondary"
            style={{ fontSize: "12px" }}
          >
            Reset Filters
          </button>
        </section>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="pegasus-admin-desktop-table">
            <div className="pegasus-admin-table-wrapper">
              <table className="pegasus-admin-table" aria-label="Master Timetable">
                <thead>
                  <tr>
                    <th>Time & Date</th>
                    <th>Event / Discipline</th>
                    <th>Venue</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map((slot) => {
                    const event = slot.event_id ? eventMap.get(slot.event_id) : undefined;
                    const venue = slot.venue_id ? venueMap.get(slot.venue_id) : undefined;
                    const statusLabel = getScheduleStatusLabel(slot.status);
                    const statusClass = getScheduleStatusBadgeClass(slot.status);

                    const startDate = new Date(slot.starts_at);
                    const endDate = slot.ends_at ? new Date(slot.ends_at) : null;

                    const timeStr = isNaN(startDate.getTime())
                      ? slot.starts_at
                      : `${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${
                          endDate && !isNaN(endDate.getTime())
                            ? ` - ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : ""
                        }`;

                    const dateStr = isNaN(startDate.getTime())
                      ? ""
                      : startDate.toLocaleDateString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        });

                    return (
                      <tr key={slot.id}>
                        {/* Time & Date */}
                        <td>
                          <div>
                            <strong style={{ fontSize: "14px", color: "var(--accent)" }}>
                              {timeStr}
                            </strong>
                            <span
                              style={{
                                display: "block",
                                fontSize: "11px",
                                color: "var(--muted)",
                                textTransform: "uppercase",
                              }}
                            >
                              {dateStr}
                            </span>
                          </div>
                        </td>

                        {/* Event */}
                        <td>
                          <strong style={{ fontSize: "14px", color: "var(--foreground)", display: "block" }}>
                            {event?.name ?? "Event Slot"}
                          </strong>
                          <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                            {event?.code ?? "—"} • {event?.competition_type ?? "Standard"}
                          </span>
                        </td>

                        {/* Venue */}
                        <td>
                          <strong style={{ fontSize: "13px", color: "var(--foreground)", display: "block" }}>
                            {venue?.name ?? "Venue Unassigned"}
                          </strong>
                          {venue?.location && (
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                              {venue.location}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td>
                          <button
                            type="button"
                            onClick={() => handleOpenStatusDialog(slot)}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                            title="Click to transition status"
                          >
                            <span className={`pegasus-status ${statusClass}`} style={{ cursor: "pointer" }}>
                              <span className="pegasus-status__dot" />
                              {statusLabel}
                            </span>
                          </button>
                        </td>

                        {/* Notes */}
                        <td>
                          <span style={{ fontSize: "12px", color: "var(--muted)", maxWidth: "200px", display: "block" }}>
                            {slot.notes || "—"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(slot)}
                              className="pegasus-button pegasus-button--subtle"
                              style={{ fontSize: "11px", padding: "6px 10px", minHeight: "30px" }}
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => setHistorySchedule(slot)}
                              className="pegasus-button pegasus-button--subtle"
                              style={{ fontSize: "11px", padding: "6px 10px", minHeight: "30px" }}
                            >
                              Audit Log
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="pegasus-admin-mobile-cards">
            {filteredSchedules.map((slot) => {
              const event = slot.event_id ? eventMap.get(slot.event_id) : undefined;
              const venue = slot.venue_id ? venueMap.get(slot.venue_id) : undefined;
              const statusLabel = getScheduleStatusLabel(slot.status);
              const statusClass = getScheduleStatusBadgeClass(slot.status);

              const startDate = new Date(slot.starts_at);
              const endDate = slot.ends_at ? new Date(slot.ends_at) : null;
              const timeStr = isNaN(startDate.getTime())
                ? slot.starts_at
                : `${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${
                    endDate ? ` - ${endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""
                  }`;
              const dateStr = isNaN(startDate.getTime())
                ? ""
                : startDate.toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });

              return (
                <article
                  key={slot.id}
                  className="pegasus-card"
                  style={{
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ fontSize: "16px", display: "block" }}>
                        {event?.name ?? "Event Slot"}
                      </strong>
                      <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 700 }}>
                        {timeStr}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--muted)", marginLeft: "6px" }}>
                        ({dateStr})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenStatusDialog(slot)}
                      style={{ background: "none", border: "none", padding: 0 }}
                    >
                      <span className={`pegasus-status ${statusClass}`}>
                        <span className="pegasus-status__dot" />
                        {statusLabel}
                      </span>
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "12px",
                      color: "var(--muted)",
                      paddingTop: "6px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <span>{venue?.name ?? "Venue Unassigned"}</span>
                    {slot.notes && (
                      <>
                        <span>•</span>
                        <span>{slot.notes}</span>
                      </>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(slot)}
                      className="pegasus-button pegasus-button--secondary"
                      style={{ minHeight: "40px", fontSize: "12px" }}
                    >
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistorySchedule(slot)}
                      className="pegasus-button pegasus-button--subtle"
                      style={{ minHeight: "40px", fontSize: "12px" }}
                    >
                      Audit Log
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* ADD SCHEDULE MODAL                                          */}
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
              maxWidth: "520px",
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
                <p className="pegasus-eyebrow" style={{ margin: 0 }}>TIMETABLE SLOT</p>
                <h3 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800 }}>
                  Schedule Event Slot
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
              {/* Event selection */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Event *
                </label>
                <select
                  required
                  className="pegasus-admin-select"
                  style={{ width: "100%" }}
                  value={addForm.eventId}
                  onChange={(e) => setAddForm({ ...addForm, eventId: e.target.value })}
                >
                  <option value="">Select Event</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Venue selection */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Venue
                </label>
                <select
                  className="pegasus-admin-select"
                  style={{ width: "100%" }}
                  value={addForm.venueId}
                  onChange={(e) => setAddForm({ ...addForm, venueId: e.target.value })}
                >
                  <option value="">Unassigned Venue</option>
                  {venues
                    .filter((v) => v.is_active)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.location || "Campus"})
                      </option>
                    ))}
                </select>
              </div>

              {/* Starts At & Ends At */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={addForm.startsAt}
                    onChange={(e) => setAddForm({ ...addForm, startsAt: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    End Time (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={addForm.endsAt}
                    onChange={(e) => setAddForm({ ...addForm, endsAt: e.target.value })}
                  />
                </div>
              </div>

              {/* Status & Notes */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Initial Status
                </label>
                <select
                  className="pegasus-admin-select"
                  style={{ width: "100%" }}
                  value={addForm.status}
                  onChange={(e) => setAddForm({ ...addForm, status: e.target.value as ScheduleStatus })}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Operational Notes
                </label>
                <textarea
                  className="pegasus-admin-input"
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
                  placeholder="e.g. Heats 1 to 3, Track inspection at 09:30"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
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
                  {isPending ? "Validating & Creating..." : "Save Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT / RESCHEDULE MODAL                                     */}
      {/* ============================================================ */}
      {editingSchedule && (
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
            if (e.target === e.currentTarget) setEditingSchedule(null);
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              width: "100%",
              maxWidth: "540px",
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
                <p className="pegasus-eyebrow" style={{ margin: 0 }}>OPERATIONAL CONTROL</p>
                <h3 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800 }}>
                  Reschedule / Edit Slot
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSchedule(null)}
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

            {/* Current vs Proposed summary card */}
            <div
              style={{
                padding: "12px 14px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div>
                <strong style={{ color: "var(--muted)" }}>Current Slot: </strong>
                <span style={{ color: "var(--foreground)" }}>
                  {new Date(editingSchedule.starts_at).toLocaleString()}
                </span>
              </div>
              <div>
                <strong style={{ color: "var(--muted)" }}>Current Venue: </strong>
                <span style={{ color: "var(--foreground)" }}>
                  {editingSchedule.venue_id ? venueMap.get(editingSchedule.venue_id)?.name : "Unassigned"}
                </span>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Event selection */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Event *
                </label>
                <select
                  required
                  className="pegasus-admin-select"
                  style={{ width: "100%" }}
                  value={editForm.eventId}
                  onChange={(e) => setEditForm({ ...editForm, eventId: e.target.value })}
                >
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Venue selection */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Venue
                </label>
                <select
                  className="pegasus-admin-select"
                  style={{ width: "100%" }}
                  value={editForm.venueId}
                  onChange={(e) => setEditForm({ ...editForm, venueId: e.target.value })}
                >
                  <option value="">Unassigned Venue</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} {!v.is_active ? "(Inactive)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Starts At & Ends At */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={editForm.startsAt}
                    onChange={(e) => setEditForm({ ...editForm, startsAt: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={editForm.endsAt}
                    onChange={(e) => setEditForm({ ...editForm, endsAt: e.target.value })}
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Status
                </label>
                <select
                  className="pegasus-admin-select"
                  style={{ width: "100%" }}
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ScheduleStatus })}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="delayed">Delayed</option>
                  <option value="postponed">Postponed</option>
                  <option value="venue_changed">Venue Changed</option>
                  <option value="finished">Finished</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Reason for change */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--accent)" }}>
                  Reason for Change / Reschedule (Recorded in Audit History)
                </label>
                <input
                  type="text"
                  className="pegasus-admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  placeholder="e.g. Inclement weather delay, court maintenance, coordinator request"
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Operational Notes
                </label>
                <textarea
                  className="pegasus-admin-input"
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setEditingSchedule(null)}
                  className="pegasus-button pegasus-button--subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="pegasus-button pegasus-button--primary"
                >
                  {isPending ? "Validating & Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* QUICK STATUS CHANGE DIALOG                                  */}
      {/* ============================================================ */}
      {statusDialogSchedule && (
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
            if (e.target === e.currentTarget) setStatusDialogSchedule(null);
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              width: "100%",
              maxWidth: "440px",
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
              <p className="pegasus-eyebrow" style={{ margin: 0 }}>LIFECYCLE TRANSITION</p>
              <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800 }}>
                Update Schedule Status
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                {statusDialogSchedule.event_id
                  ? eventMap.get(statusDialogSchedule.event_id)?.name
                  : "Program Slot"}
              </p>
            </div>

            <form onSubmit={handleStatusDialogSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  New Operational Status
                </label>
                <select
                  className="pegasus-admin-select"
                  style={{ width: "100%" }}
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ScheduleStatus)}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live (Currently in Progress)</option>
                  <option value="delayed">Delayed</option>
                  <option value="postponed">Postponed</option>
                  <option value="venue_changed">Venue Changed</option>
                  <option value="finished">Finished (Completed)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Reason for Transition (Optional)
                </label>
                <input
                  type="text"
                  className="pegasus-admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  placeholder="e.g. Started on time, event ended, rain delay"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setStatusDialogSchedule(null)}
                  className="pegasus-button pegasus-button--subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="pegasus-button pegasus-button--primary"
                >
                  {isPending ? "Updating..." : "Update Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* AUDIT LOG SLIDE-OVER / MODAL                                */}
      {/* ============================================================ */}
      {historySchedule && (
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
            if (e.target === e.currentTarget) setHistorySchedule(null);
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              width: "100%",
              maxWidth: "560px",
              maxHeight: "85vh",
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
                <p className="pegasus-eyebrow" style={{ margin: 0 }}>OPERATIONAL AUDIT TRAIL</p>
                <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: 800 }}>
                  Schedule History
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--muted)" }}>
                  Slot #{historySchedule.id.slice(0, 8)} •{" "}
                  {historySchedule.event_id ? eventMap.get(historySchedule.event_id)?.name : "Slot"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHistorySchedule(null)}
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

            {/* Filter relevant changes */}
            {(() => {
              const slotChanges = changes.filter((c) => c.schedule_id === historySchedule.id);
              if (slotChanges.length === 0) {
                return (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--muted)", fontSize: "13px" }}>
                    No audit records recorded yet for this slot.
                  </div>
                );
              }

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {slotChanges.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        padding: "12px 14px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            background: "rgba(255, 107, 0, 0.15)",
                            color: "var(--accent)",
                          }}
                        >
                          {entry.action}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>

                      {entry.reason && (
                        <p style={{ margin: 0, fontSize: "13px", color: "var(--foreground)" }}>
                          &quot;{entry.reason}&quot;
                        </p>
                      )}

                      {entry.before_state && entry.after_state && (
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                          {entry.before_state.starts_at !== entry.after_state.starts_at && (
                            <div>
                              Rescheduled: {new Date(entry.before_state.starts_at || "").toLocaleTimeString()} →{" "}
                              {new Date(entry.after_state.starts_at || "").toLocaleTimeString()}
                            </div>
                          )}
                          {entry.before_state.status !== entry.after_state.status && (
                            <div>
                              Status: {entry.before_state.status} → {entry.after_state.status}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setHistorySchedule(null)}
                className="pegasus-button pegasus-button--secondary"
                style={{ fontSize: "12px" }}
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
