"use client";

import { useState, useMemo, useTransition } from "react";
import {
  createVenueAction,
  updateVenueAction,
  updateVenueStatusAction,
} from "@/app/admin/actions";
import type { VenueRow } from "@/lib/repositories";

interface AdminVenuesClientProps {
  festivalId: string;
  initialVenues: VenueRow[];
  venueSlotCounts: Record<string, number>;
}

export default function AdminVenuesClient({
  festivalId,
  initialVenues,
  venueSlotCounts,
}: AdminVenuesClientProps) {
  const [venues, setVenues] = useState<VenueRow[]>(initialVenues);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueRow | null>(null);

  // Add form state
  const [addForm, setAddForm] = useState({
    name: "",
    slug: "",
    location: "",
    capacity: "",
    isActive: true,
  });

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    location: "",
    capacity: "",
    isActive: true,
  });

  // Telemetry metrics
  const telemetry = useMemo(() => {
    const totalCount = venues.length;
    const activeCount = venues.filter((v) => v.is_active).length;
    const inactiveCount = venues.filter((v) => !v.is_active).length;
    const totalCapacity = venues.reduce((acc, v) => acc + (v.capacity || 0), 0);

    return {
      totalCount,
      activeCount,
      inactiveCount,
      totalCapacity,
    };
  }, [venues]);

  // Filtered venues
  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.trim().toLowerCase();
        const matchName = venue.name.toLowerCase().includes(q);
        const matchSlug = venue.slug.toLowerCase().includes(q);
        const matchLocation = (venue.location || "").toLowerCase().includes(q);
        if (!matchName && !matchSlug && !matchLocation) return false;
      }

      if (statusFilter === "active" && !venue.is_active) return false;
      if (statusFilter === "inactive" && venue.is_active) return false;

      return true;
    });
  }, [venues, searchQuery, statusFilter]);

  // Open Edit Modal
  const handleOpenEdit = (v: VenueRow) => {
    setEditingVenue(v);
    setEditForm({
      name: v.name,
      slug: v.slug,
      location: v.location || "",
      capacity: v.capacity !== null && v.capacity !== undefined ? String(v.capacity) : "",
      isActive: v.is_active,
    });
    setFeedback(null);
  };

  // Toggle active/inactive
  const handleToggleStatus = (venue: VenueRow) => {
    const newStatus = !venue.is_active;
    setFeedback(null);

    // Optimistic update
    setVenues((prev) =>
      prev.map((v) => (v.id === venue.id ? { ...v, is_active: newStatus } : v)),
    );

    startTransition(async () => {
      const res = await updateVenueStatusAction(venue.id, newStatus);
      if (res.success) {
        setFeedback({
          type: "success",
          message: `Venue "${venue.name}" is now ${newStatus ? "Active" : "Inactive"}.`,
        });
      } else {
        // Revert
        setVenues((prev) =>
          prev.map((v) => (v.id === venue.id ? { ...v, is_active: venue.is_active } : v)),
        );
        setFeedback({
          type: "error",
          message: res.error || "Failed to update venue status.",
        });
      }
    });
  };

  // Submit Add
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) {
      setFeedback({ type: "error", message: "Venue name is required." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const capNum = addForm.capacity.trim() !== "" ? parseInt(addForm.capacity, 10) : null;
      const res = await createVenueAction({
        festivalId,
        name: addForm.name.trim(),
        slug: addForm.slug.trim() || undefined,
        location: addForm.location.trim() || null,
        capacity: capNum !== null && !isNaN(capNum) ? capNum : null,
        isActive: addForm.isActive,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Venue "${addForm.name}" created successfully.`,
        });
        const newRow: VenueRow = {
          id: res.venueId || String(Date.now()),
          festival_id: festivalId,
          name: addForm.name.trim(),
          slug: addForm.slug.trim() || addForm.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          location: addForm.location.trim() || null,
          capacity: capNum !== null && !isNaN(capNum) ? capNum : null,
          is_active: addForm.isActive,
          metadata: {},
          created_at: new Date().toISOString(),
        };
        setVenues((prev) => [...prev, newRow]);
        setIsAddModalOpen(false);
        setAddForm({
          name: "",
          slug: "",
          location: "",
          capacity: "",
          isActive: true,
        });
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to create venue.",
        });
      }
    });
  };

  // Submit Edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVenue) return;
    if (!editForm.name.trim()) {
      setFeedback({ type: "error", message: "Venue name cannot be empty." });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const capNum = editForm.capacity.trim() !== "" ? parseInt(editForm.capacity, 10) : null;
      const res = await updateVenueAction({
        venueId: editingVenue.id,
        name: editForm.name.trim(),
        slug: editForm.slug.trim() || undefined,
        location: editForm.location.trim() || null,
        capacity: capNum !== null && !isNaN(capNum) ? capNum : null,
        isActive: editForm.isActive,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          message: `Venue "${editForm.name}" updated successfully.`,
        });
        setVenues((prev) =>
          prev.map((v) =>
            v.id === editingVenue.id
              ? {
                  ...v,
                  name: editForm.name.trim(),
                  slug: editForm.slug.trim() || v.slug,
                  location: editForm.location.trim() || null,
                  capacity: capNum !== null && !isNaN(capNum) ? capNum : null,
                  is_active: editForm.isActive,
                }
              : v,
          ),
        );
        setEditingVenue(null);
      } else {
        setFeedback({
          type: "error",
          message: res.error || "Failed to update venue.",
        });
      }
    });
  };

  return (
    <div className="pegasus-animate-fade" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header */}
      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <p className="pegasus-eyebrow" style={{ margin: "0 0 6px" }}>
            ZENITHROW 2026 • VENUES & INFRASTRUCTURE
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
            Venue Management
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
            Configure campus grounds, tracks, indoor arenas, court allocations, and availability.
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
          <span style={{ fontSize: "16px", fontWeight: "bold" }}>+</span> Add Venue
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

      {/* Telemetry Bar */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "10px",
        }}
      >
        {[
          { label: "Total Venues", value: telemetry.totalCount },
          { label: "Active Facilities", value: telemetry.activeCount, color: "var(--success, #10b981)" },
          { label: "Inactive • Closed", value: telemetry.inactiveCount, color: telemetry.inactiveCount > 0 ? "var(--warning, #f59e0b)" : "var(--muted)" },
          { label: "Total Capacity", value: telemetry.totalCapacity > 0 ? telemetry.totalCapacity.toLocaleString() : "—" },
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
                color: item.color ?? "var(--foreground)",
              }}
            >
              {item.value}
            </strong>
          </div>
        ))}
      </section>

      {/* Filter Bar */}
      <section className="pegasus-admin-filter-bar">
        <div style={{ flex: "1 1 240px", minWidth: "200px" }}>
          <input
            type="text"
            className="pegasus-admin-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search venue by name, code, or location..."
            style={{ width: "100%", boxSizing: "border-box" }}
            aria-label="Search venues"
          />
        </div>

        <div style={{ minWidth: "150px" }}>
          <select
            className="pegasus-admin-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            aria-label="Filter venue status"
            style={{ width: "100%" }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {(searchQuery || statusFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className="pegasus-button pegasus-button--subtle"
            style={{ fontSize: "12px", height: "38px", padding: "0 14px" }}
          >
            ✕ Clear
          </button>
        )}
      </section>

      {/* Empty State or Venues List */}
      {venues.length === 0 ? (
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
            🏟️
          </div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
            No venues registered
          </h2>
          <p style={{ margin: 0, maxWidth: "460px", fontSize: "14px", color: "var(--muted)" }}>
            Create sports grounds, courts, or tracks to allocate timetable program slots.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="pegasus-button pegasus-button--primary"
            style={{ marginTop: "8px" }}
          >
            + Create First Venue
          </button>
        </section>
      ) : filteredVenues.length === 0 ? (
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
            No venues match search criteria
          </h3>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
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
              <table className="pegasus-admin-table" aria-label="Campus Venues">
                <thead>
                  <tr>
                    <th>Venue Name</th>
                    <th>Code • Slug</th>
                    <th>Location • Campus</th>
                    <th>Capacity</th>
                    <th>Scheduled Slots</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVenues.map((venue) => {
                    const slotCount = venueSlotCounts[venue.id] || 0;
                    return (
                      <tr key={venue.id}>
                        <td>
                          <strong style={{ fontSize: "14px", color: "var(--foreground)" }}>
                            {venue.name}
                          </strong>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "11px",
                              fontFamily: "monospace",
                              padding: "2px 6px",
                              background: "rgba(255,255,255,0.05)",
                              borderRadius: "4px",
                              color: "var(--muted)",
                            }}
                          >
                            {venue.slug}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "13px", color: "var(--foreground)" }}>
                            {venue.location || "—"}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                            {venue.capacity ? `${venue.capacity.toLocaleString()} seats` : "—"}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              color: slotCount > 0 ? "var(--accent)" : "var(--muted)",
                            }}
                          >
                            {slotCount} slot{slotCount === 1 ? "" : "s"}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`pegasus-status ${
                              venue.is_active ? "pegasus-status--live" : "pegasus-status--upcoming"
                            }`}
                          >
                            <span className="pegasus-status__dot" />
                            {venue.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(venue)}
                              className="pegasus-button pegasus-button--subtle"
                              style={{ fontSize: "11px", padding: "6px 10px", minHeight: "30px" }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleToggleStatus(venue)}
                              className="pegasus-button pegasus-button--subtle"
                              style={{
                                fontSize: "11px",
                                padding: "6px 10px",
                                minHeight: "30px",
                                color: venue.is_active ? "var(--warning, #f59e0b)" : "var(--success, #10b981)",
                              }}
                            >
                              {venue.is_active ? "Deactivate" : "Activate"}
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

          {/* Mobile Cards */}
          <div className="pegasus-admin-mobile-cards">
            {filteredVenues.map((venue) => {
              const slotCount = venueSlotCounts[venue.id] || 0;
              return (
                <article
                  key={venue.id}
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
                      <strong style={{ fontSize: "16px", display: "block" }}>{venue.name}</strong>
                      <span
                        style={{
                          fontSize: "11px",
                          fontFamily: "monospace",
                          color: "var(--muted)",
                        }}
                      >
                        {venue.slug}
                      </span>
                    </div>

                    <span
                      className={`pegasus-status ${
                        venue.is_active ? "pegasus-status--live" : "pegasus-status--upcoming"
                      }`}
                    >
                      <span className="pegasus-status__dot" />
                      {venue.is_active ? "Active" : "Inactive"}
                    </span>
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
                    <span>{venue.location || "Campus Venue"}</span>
                    <span>•</span>
                    <span>{venue.capacity ? `${venue.capacity} seats` : "Capacity open"}</span>
                    <span>•</span>
                    <strong style={{ color: "var(--foreground)" }}>{slotCount} slots</strong>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "4px" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(venue)}
                      className="pegasus-button pegasus-button--secondary"
                      style={{ minHeight: "40px", fontSize: "12px" }}
                    >
                      Edit Venue
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggleStatus(venue)}
                      className="pegasus-button pegasus-button--subtle"
                      style={{
                        minHeight: "40px",
                        fontSize: "12px",
                        color: venue.is_active ? "var(--warning, #f59e0b)" : "var(--success, #10b981)",
                      }}
                    >
                      {venue.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* ============================================================ */}
      {/* ADD VENUE MODAL                                             */}
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
              maxWidth: "480px",
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
                <p className="pegasus-eyebrow" style={{ margin: 0 }}>INFRASTRUCTURE</p>
                <h3 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800 }}>
                  Create Campus Venue
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
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Venue Name *
                </label>
                <input
                  type="text"
                  required
                  className="pegasus-admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  placeholder="e.g. Main Athletic Stadium"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Slug • Identifier
                  </label>
                  <input
                    type="text"
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    placeholder="auto-derived"
                    value={addForm.slug}
                    onChange={(e) => setAddForm({ ...addForm, slug: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Capacity (Seats)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    placeholder="e.g. 500"
                    value={addForm.capacity}
                    onChange={(e) => setAddForm({ ...addForm, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Location • Zone
                </label>
                <input
                  type="text"
                  className="pegasus-admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  placeholder="e.g. North Sports Complex, Ground Floor"
                  value={addForm.location}
                  onChange={(e) => setAddForm({ ...addForm, location: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="add-venue-active"
                  checked={addForm.isActive}
                  onChange={(e) => setAddForm({ ...addForm, isActive: e.target.checked })}
                />
                <label htmlFor="add-venue-active" style={{ fontSize: "13px", cursor: "pointer" }}>
                  Active and available for event scheduling
                </label>
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
                  {isPending ? "Creating..." : "Create Venue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT VENUE MODAL                                            */}
      {/* ============================================================ */}
      {editingVenue && (
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
            if (e.target === e.currentTarget) setEditingVenue(null);
          }}
        >
          <div
            className="pegasus-card pegasus-animate-fade"
            style={{
              width: "100%",
              maxWidth: "480px",
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
                <p className="pegasus-eyebrow" style={{ margin: 0 }}>VENUE DETAILS</p>
                <h3 style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: 800 }}>
                  Edit {editingVenue.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingVenue(null)}
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
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Venue Name *
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Slug • Code
                  </label>
                  <input
                    type="text"
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={editForm.slug}
                    onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                    Capacity (Seats)
                  </label>
                  <input
                    type="number"
                    min={0}
                    className="pegasus-admin-input"
                    style={{ width: "100%", boxSizing: "border-box" }}
                    value={editForm.capacity}
                    onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>
                  Location • Zone
                </label>
                <input
                  type="text"
                  className="pegasus-admin-input"
                  style={{ width: "100%", boxSizing: "border-box" }}
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <input
                  type="checkbox"
                  id="edit-venue-active"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                />
                <label htmlFor="edit-venue-active" style={{ fontSize: "13px", cursor: "pointer" }}>
                  Active and available for event scheduling
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setEditingVenue(null)}
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
    </div>
  );
}

