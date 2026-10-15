"use client";

import { useState, useMemo, useTransition, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Calendar,
  MapPin,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  Clock3,
  AlertCircle,
  UploadCloud,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  X,
  ImageIcon,
} from "lucide-react";
import type {
  SportWithImage,
  ScheduleRow,
  EventRow,
  VenueRow,
  ResultRow,
} from "@/lib/repositories";
import {
  adminUploadSportImageAction,
  adminSetSportImageAction,
  updateScheduleStatusAction,
} from "@/app/admin/actions";

interface AdminSportsClientProps {
  festivalId: string;
  sports: SportWithImage[];
  schedules: ScheduleRow[];
  events: EventRow[];
  venues: VenueRow[];
  results: ResultRow[];
}

const APPROVED_PRESET_ASSETS = [
  {
    name: "Campus Arena Complex (Aerial)",
    url: "/images/hero/zenithrow-arena-aerial.jpg",
  },
  {
    name: "Minister Logo Unveiling Launch",
    url: "/images/hero/zenithrow-logo-unveiled.jpg",
  },
  {
    name: "Championship Track Stadium",
    url: "/images/showcase/track.jpg",
  },
  {
    name: "Aerodynamics Arena",
    url: "/images/showcase/aerodynamics.jpg",
  },
  {
    name: "Powertrain Pavilion",
    url: "/images/showcase/powertrain.jpg",
  },
];

export default function AdminSportsClient({
  festivalId: _festivalId,
  sports,
  schedules,
  events,
  venues,
  results,
}: AdminSportsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"disciplines" | "programmes">(
    "disciplines"
  );

  // Feedback State
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Image Management Modal State
  const [selectedSportForImage, setSelectedSportForImage] =
    useState<SportWithImage | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Programme Search & Filter State
  const [programmeSearch, setProgrammeSearch] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "scheduled" | "finished">("all");

  // In-flight action tracking
  const [inFlightScheduleId, setInFlightScheduleId] = useState<string | null>(null);

  // Venue and Event lookups
  const venueMap = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);
  const eventMap = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  // Map results to schedule or event
  const eventResultMap = useMemo(() => {
    const map = new Map<string, ResultRow[]>();
    for (const r of results) {
      const arr = map.get(r.event_id) || [];
      arr.push(r);
      map.set(r.event_id, arr);
    }
    return map;
  }, [results]);

  // Filtered Programmes
  const filteredProgrammes = useMemo(() => {
    return schedules.filter((item) => {
      // Division filter
      if (divisionFilter !== "all") {
        const cat = (item.category || "").toUpperCase();
        if (divisionFilter === "junior") {
          const tokens = cat.split(",").map((s) => s.trim());
          if (!tokens.includes("JUNIOR")) return false;
        } else if (divisionFilter === "pre-senior") {
          if (!cat.includes("PRE-SENIOR")) return false;
        } else if (divisionFilter === "senior") {
          const tokens = cat.split(",").map((s) => s.trim());
          if (!tokens.includes("SENIOR")) return false;
        } else if (divisionFilter === "super-senior") {
          if (!cat.includes("SUPER SENIOR")) return false;
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        if (item.status !== statusFilter) return false;
      }

      // Search query
      if (programmeSearch.trim() !== "") {
        const q = programmeSearch.toLowerCase().trim();
        const venue = item.venue_id ? venueMap.get(item.venue_id) : null;
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesCategory = item.category?.toLowerCase().includes(q);
        const matchesVenue = venue?.name.toLowerCase().includes(q);
        const matchesNotes = item.notes?.toLowerCase().includes(q);

        if (!matchesTitle && !matchesCategory && !matchesVenue && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [schedules, divisionFilter, statusFilter, programmeSearch, venueMap]);

  // Programme counts
  const programmeCounts = useMemo(() => {
    const total = schedules.length;
    const completed = schedules.filter((s) => s.status === "finished").length;
    const upcoming = schedules.filter((s) => s.status === "scheduled").length;
    return { total, completed, upcoming };
  }, [schedules]);

  // Open Image Modal
  const handleOpenImageModal = (sport: SportWithImage) => {
    setSelectedSportForImage(sport);
    setImagePreview(sport.coverImage || null);
    setSelectedFile(null);
  };

  // Close Image Modal
  const handleCloseImageModal = () => {
    setSelectedSportForImage(null);
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback({
        type: "error",
        message: "Invalid file format. Please upload JPEG, PNG, or WebP images.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: "error",
        message: `File exceeds 5MB size limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`,
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  // Save Image
  const handleSaveImage = () => {
    if (!selectedSportForImage) return;

    startTransition(async () => {
      try {
        if (selectedFile) {
          const fd = new FormData();
          fd.append("sportSlug", selectedSportForImage.slug);
          fd.append("file", selectedFile);
          const res = await adminUploadSportImageAction(fd);
          if (!res.success) {
            setFeedback({ type: "error", message: res.error || "Upload failed." });
            return;
          }
          setFeedback({
            type: "success",
            message: `✓ Image uploaded and saved persistently for ${selectedSportForImage.name}.`,
          });
        } else if (imagePreview && imagePreview !== selectedSportForImage.coverImage) {
          const res = await adminSetSportImageAction(
            selectedSportForImage.slug,
            imagePreview
          );
          if (!res.success) {
            setFeedback({ type: "error", message: res.error || "Update failed." });
            return;
          }
          setFeedback({
            type: "success",
            message: `✓ Selected asset set for ${selectedSportForImage.name}.`,
          });
        }
        handleCloseImageModal();
        router.refresh();
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Image update error.",
        });
      }
    });
  };

  // Reset to default image
  const handleResetToDefault = () => {
    if (!selectedSportForImage) return;

    startTransition(async () => {
      try {
        const res = await adminSetSportImageAction(
          selectedSportForImage.slug,
          null
        );
        if (!res.success) {
          setFeedback({ type: "error", message: res.error || "Reset failed." });
          return;
        }
        setFeedback({
          type: "success",
          message: `✓ Image reset to default for ${selectedSportForImage.name}.`,
        });
        handleCloseImageModal();
        router.refresh();
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Reset error.",
        });
      }
    });
  };

  // Toggle Programme Status (Upcoming <-> Completed) with safe guards for special operational states
  const handleToggleProgrammeStatus = (schedule: ScheduleRow) => {
    const isSpecial =
      schedule.status === "delayed" ||
      schedule.status === "cancelled" ||
      schedule.status === "live" ||
      schedule.status === "postponed" ||
      schedule.status === "venue_changed";

    if (isSpecial) {
      const confirmed = typeof window !== "undefined" && window.confirm(
        `Notice: This programme is currently marked as ${schedule.status.toUpperCase()}.\n\nAre you sure you want to transition it to COMPLETED? This will resolve and overwrite the special operational status.`
      );
      if (!confirmed) {
        return;
      }
    }

    const nextStatus = schedule.status === "finished" ? "scheduled" : "finished";
    const reason = isSpecial
      ? `Special operational status '${schedule.status}' resolved to finished by administrator`
      : nextStatus === "finished"
      ? "Programme concluded on field by administrator"
      : "Programme reset to scheduled status by administrator";

    setInFlightScheduleId(schedule.id);
    startTransition(async () => {
      try {
        const res = await updateScheduleStatusAction(
          schedule.id,
          nextStatus,
          reason
        );
        if (!res.success) {
          setFeedback({
            type: "error",
            message: res.error || "Failed to update programme status.",
          });
        } else {
          setFeedback({
            type: "success",
            message: `✓ Programme status updated to ${nextStatus === "finished" ? "COMPLETED" : "UPCOMING"}. (Results remain independent).`,
          });
          router.refresh();
        }
      } catch (err: unknown) {
        setFeedback({
          type: "error",
          message: err instanceof Error ? err.message : "Status update error.",
        });
      } finally {
        setInFlightScheduleId(null);
      }
    });
  };

  return (
    <div className="pegasus-admin-content" style={{ paddingBottom: "60px" }}>
      {/* Top Header */}
      <header style={{ marginBottom: "24px" }}>
        <p className="pegasus-eyebrow">ZENITHROW 2026 • ATHLETIC OPERATIONS</p>
        <h1 className="pegasus-page-title">Sports & Programme Management</h1>
        <p className="pegasus-page__description">
          Unified administration for discipline presentation, cover images, official timetable completion, and direct result entry access.
        </p>
      </header>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          style={{
            marginBottom: "20px",
            padding: "14px 18px",
            borderRadius: "8px",
            background:
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.3)"
                : "rgba(239, 68, 68, 0.3)"
            }`,
            color: feedback.type === "success" ? "#10b981" : "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            style={{
              background: "none",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              padding: "4px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary KPI Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Total Disciplines
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px" }}>
            {sports.length}
          </strong>
        </div>
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Scheduled Programmes
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px" }}>
            {programmeCounts.total}
          </strong>
        </div>
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Programmes Completed
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px", color: "#10b981" }}>
            {programmeCounts.completed}
          </strong>
        </div>
        <div className="pegasus-card" style={{ padding: "16px 20px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Programmes Upcoming
          </span>
          <strong style={{ fontSize: "28px", fontWeight: 900, display: "block", marginTop: "4px", color: "#3b82f6" }}>
            {programmeCounts.upcoming}
          </strong>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "12px",
        }}
      >
        <button
          onClick={() => setActiveTab("disciplines")}
          style={{
            padding: "8px 18px",
            borderRadius: "6px",
            background: activeTab === "disciplines" ? "var(--foreground)" : "transparent",
            color: activeTab === "disciplines" ? "var(--background)" : "var(--muted)",
            border: "1px solid",
            borderColor: activeTab === "disciplines" ? "var(--foreground)" : "var(--border)",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Trophy size={15} />
          Discipline Presentation & Images ({sports.length})
        </button>
        <button
          onClick={() => setActiveTab("programmes")}
          style={{
            padding: "8px 18px",
            borderRadius: "6px",
            background: activeTab === "programmes" ? "var(--foreground)" : "transparent",
            color: activeTab === "programmes" ? "var(--background)" : "var(--muted)",
            border: "1px solid",
            borderColor: activeTab === "programmes" ? "var(--foreground)" : "var(--border)",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Calendar size={15} />
          Programme Status & Operations ({schedules.length})
        </button>
      </div>

      {/* TAB 1: Disciplines & Images */}
      {activeTab === "disciplines" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          {sports.map((sport) => {
            const sportEvents = events.filter((e) => e.sport_id === sport.id);
            return (
              <div
                key={sport.slug}
                className="pegasus-card"
                style={{
                  padding: "0",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid var(--border)",
                }}
              >
                {/* Image Banner */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "160px",
                    background: "#18181b",
                    overflow: "hidden",
                  }}
                >
                  {sport.coverImage ? (
                    <Image
                      src={sport.coverImage}
                      alt={sport.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 360px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--muted)",
                      }}
                    >
                      <ImageIcon size={32} opacity={0.4} />
                    </div>
                  )}
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "12px",
                      background: "rgba(0,0,0,0.75)",
                      backdropFilter: "blur(6px)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#fff",
                      textTransform: "uppercase",
                    }}
                  >
                    {sport.category}
                  </div>
                </div>

                {/* Body Content */}
                <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                      <h3 style={{ fontSize: "17px", fontWeight: 800, margin: 0 }}>
                        {sport.name}
                      </h3>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: sport.type === "team" ? "rgba(59, 130, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
                          color: sport.type === "team" ? "#3b82f6" : "#10b981",
                        }}
                      >
                        {sport.type.toUpperCase()}
                      </span>
                    </div>

                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.5 }}>
                      {sport.description || "Official tournament discipline."}
                    </p>

                    <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--muted)", marginBottom: "16px" }}>
                      <span>
                        <b>{sportEvents.length}</b> events linked
                      </span>
                      <span>•</span>
                      <span>
                        Status: <b>{sport.isDatabaseConfigured ? "Database Row" : "Festival Catalog"}</b>
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{ display: "flex", gap: "8px", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
                    <button
                      onClick={() => handleOpenImageModal(sport)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.06)",
                        border: "1px solid var(--border)",
                        color: "var(--foreground)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <UploadCloud size={14} />
                      Manage Image
                    </button>
                    <Link
                      href={`/sports/${sport.slug}`}
                      target="_blank"
                      style={{
                        padding: "8px 12px",
                        borderRadius: "6px",
                        background: "transparent",
                        border: "1px solid var(--border)",
                        color: "var(--muted)",
                        fontSize: "12px",
                        fontWeight: 700,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="View Public Page"
                    >
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Programme Operations & Status */}
      {activeTab === "programmes" && (
        <div className="pegasus-card" style={{ padding: "0", overflow: "hidden" }}>
          {/* Controls Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(255,255,255,0.01)",
            }}
          >
            {/* Search Input */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: "1 1 240px", maxWidth: "360px" }}>
              <Search size={15} color="var(--muted)" />
              <input
                type="text"
                placeholder="Search programmes, venues, or notes..."
                value={programmeSearch}
                onChange={(e) => setProgrammeSearch(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  color: "var(--foreground)",
                  fontSize: "13px",
                }}
              />
            </div>

            {/* Division Filters */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                { id: "all", label: "All Divisions" },
                { id: "junior", label: "Junior" },
                { id: "pre-senior", label: "Pre-Senior" },
                { id: "senior", label: "Senior" },
                { id: "super-senior", label: "Super Senior" },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDivisionFilter(d.id)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    background: divisionFilter === d.id ? "var(--foreground)" : "transparent",
                    color: divisionFilter === d.id ? "var(--background)" : "var(--muted)",
                    border: "1px solid",
                    borderColor: divisionFilter === d.id ? "var(--foreground)" : "var(--border)",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div style={{ display: "flex", gap: "6px" }}>
              {[
                { id: "all", label: "All Status" },
                { id: "scheduled", label: "Upcoming" },
                { id: "finished", label: "Completed" },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id as any)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "4px",
                    background: statusFilter === s.id ? "rgba(255, 255, 255, 0.12)" : "transparent",
                    color: statusFilter === s.id ? "#fff" : "var(--muted)",
                    border: "1px solid var(--border)",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Programmes Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px 18px", fontWeight: 750, color: "var(--muted)" }}>SCHEDULED TIME</th>
                  <th style={{ padding: "12px 18px", fontWeight: 750, color: "var(--muted)" }}>PROGRAMME TITLE</th>
                  <th style={{ padding: "12px 18px", fontWeight: 750, color: "var(--muted)" }}>DIVISION / CATEGORY</th>
                  <th style={{ padding: "12px 18px", fontWeight: 750, color: "var(--muted)" }}>VENUE</th>
                  <th style={{ padding: "12px 18px", fontWeight: 750, color: "var(--muted)" }}>PROGRAMME STATUS</th>
                  <th style={{ padding: "12px 18px", fontWeight: 750, color: "var(--muted)" }}>RESULT STATUS</th>
                  <th style={{ padding: "12px 18px", fontWeight: 750, color: "var(--muted)", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredProgrammes.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "32px 20px", textAlign: "center", color: "var(--muted)" }}>
                      No programmes matched the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredProgrammes.map((item) => {
                    const venue = item.venue_id ? venueMap.get(item.venue_id) : null;
                    const event = item.event_id ? eventMap.get(item.event_id) : null;
                    const linkedResults = item.event_id ? eventResultMap.get(item.event_id) || [] : [];
                    const hasPublishedResult = linkedResults.some((r) => r.status === "published");
                    const hasDraftResult = linkedResults.some((r) => r.status === "submitted" || r.status === "draft");

                    const startDate = new Date(item.starts_at);
                    const dateFormatted = startDate.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    });
                    const timeFormatted = startDate.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });

                    const isCompleted = item.status === "finished";

                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: "1px solid var(--border)",
                          background: isCompleted ? "rgba(16, 185, 129, 0.02)" : "transparent",
                        }}
                      >
                        {/* Time */}
                        <td style={{ padding: "12px 18px", whiteSpace: "nowrap" }}>
                          <strong style={{ display: "block" }}>{dateFormatted}</strong>
                          <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>
                            {timeFormatted}
                          </span>
                        </td>

                        {/* Title & Notes */}
                        <td style={{ padding: "12px 18px" }}>
                          <span style={{ fontWeight: 800, color: "#fff", display: "block" }}>
                            {item.title || (event?.name ? event.name : "Festival Programme")}
                          </span>
                          {item.notes && (
                            <span style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginTop: "2px" }}>
                              {item.notes}
                            </span>
                          )}
                        </td>

                        {/* Division */}
                        <td style={{ padding: "12px 18px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: "rgba(255, 255, 255, 0.06)",
                              color: "var(--foreground)",
                            }}
                          >
                            {item.category || "GENERAL"}
                          </span>
                        </td>

                        {/* Venue */}
                        <td style={{ padding: "12px 18px" }}>
                          <span style={{ fontSize: "12px", color: venue ? "var(--foreground)" : "var(--muted)" }}>
                            {venue?.name || "TBA"}
                          </span>
                        </td>

                        {/* Programme Status */}
                        <td style={{ padding: "12px 18px" }}>
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              padding: "3px 8px",
                              borderRadius: "4px",
                              background: isCompleted ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)",
                              color: isCompleted ? "#10b981" : "#3b82f6",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {isCompleted ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
                            {isCompleted ? "COMPLETED" : "UPCOMING"}
                          </span>
                        </td>

                        {/* Result Status */}
                        <td style={{ padding: "12px 18px" }}>
                          {hasPublishedResult ? (
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#10b981" }}>
                              ✓ Official Result Published
                            </span>
                          ) : hasDraftResult ? (
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#f59e0b" }}>
                              Draft Pending Review
                            </span>
                          ) : (
                            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                              No results entered
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "12px 18px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                            {/* Status Toggle Button */}
                            <button
                              onClick={() => handleToggleProgrammeStatus(item)}
                              disabled={isPending && inFlightScheduleId === item.id}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "4px",
                                background: isCompleted ? "rgba(255, 255, 255, 0.06)" : "rgba(16, 185, 129, 0.15)",
                                border: `1px solid ${isCompleted ? "var(--border)" : "rgba(16, 185, 129, 0.4)"}`,
                                color: isCompleted ? "var(--muted)" : "#10b981",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              {inFlightScheduleId === item.id
                                ? "Updating..."
                                : isCompleted
                                ? "Mark Upcoming"
                                : "Mark Completed"}
                            </button>

                            {/* Direct Results Link */}
                            <Link
                              href={`/admin/results${item.event_id ? `?event=${item.event_id}` : ""}`}
                              style={{
                                padding: "6px 10px",
                                borderRadius: "4px",
                                background: "var(--foreground)",
                                color: "var(--background)",
                                textDecoration: "none",
                                fontSize: "11px",
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              Enter Results →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Image Management Modal */}
      {selectedSportForImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
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
              maxWidth: "540px",
              padding: "24px",
              background: "#121214",
              border: "1px solid var(--border)",
              borderRadius: "12px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>
                  Manage Image: {selectedSportForImage.name}
                </h3>
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Upload a photo or select an approved authentic asset
                </span>
              </div>
              <button
                onClick={handleCloseImageModal}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  padding: "4px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Preview Area */}
            <div
              style={{
                width: "100%",
                height: "220px",
                position: "relative",
                background: "#18181b",
                borderRadius: "8px",
                overflow: "hidden",
                marginBottom: "16px",
                border: "1px solid var(--border)",
              }}
            >
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Preview"
                  fill
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--muted)",
                    fontSize: "13px",
                  }}
                >
                  No image selected
                </div>
              )}
            </div>

            {/* Upload Option */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                Upload Replacement Image (JPEG, PNG, WebP • Max 5MB)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                style={{
                  width: "100%",
                  fontSize: "12px",
                  padding: "8px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--foreground)",
                }}
              />
            </div>

            {/* Approved Presets */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", fontWeight: 700, display: "block", marginBottom: "8px", color: "var(--muted)" }}>
                Or select an approved authentic festival photo:
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {APPROVED_PRESET_ASSETS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setImagePreview(preset.url);
                    }}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: imagePreview === preset.url ? "var(--foreground)" : "rgba(255,255,255,0.04)",
                      color: imagePreview === preset.url ? "var(--background)" : "var(--foreground)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={handleResetToDefault}
                disabled={isPending}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <RotateCcw size={13} />
                Reset Default
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handleCloseImageModal}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveImage}
                  disabled={isPending}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "6px",
                    background: "var(--foreground)",
                    color: "var(--background)",
                    border: "none",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {isPending ? "Saving..." : "Save Image"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
