"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Sport, FestivalEvent, Venue } from "@/lib/types";
import { resolveFestivalEvent } from "@/lib/competition/eventResolver";
import { CODEX_DIVISIONS } from "@/lib/competition/divisions";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Sparkles,
  ShieldAlert,
  Users,
  SlidersHorizontal,
  Activity,
  Award,
  ChevronRight,
  Info,
} from "lucide-react";
import styles from "./sports.module.css";

interface SportArenaClientProps {
  sport: Sport;
  events: FestivalEvent[];
  venue?: Venue;
}

export default function SportArenaClient({
  sport,
  events,
  venue,
}: SportArenaClientProps) {
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [eventSearch, setEventSearch] = useState<string>("");

  // Extract all distinct divisions for this sport's events
  const divisions = useMemo(() => {
    const list: { id: string; name: string; count: number }[] = [];
    const countMap: Record<string, number> = {};

    for (const ev of events) {
      const divKey = ev.divisionId || ev.category?.toLowerCase() || "general";
      countMap[divKey] = (countMap[divKey] || 0) + 1;
    }

    for (const [key, count] of Object.entries(countMap)) {
      const matchDivision = CODEX_DIVISIONS.find((d) => d.id === key);
      const name = matchDivision ? `${matchDivision.name} (${matchDivision.level})` : key.toUpperCase();
      list.push({ id: key, name, count });
    }

    return list;
  }, [events]);

  // Filter events based on active division and search
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Division filter
      if (selectedDivision !== "all") {
        const divKey = ev.divisionId || ev.category?.toLowerCase() || "general";
        if (divKey !== selectedDivision) return false;
      }

      // Event search
      if (eventSearch.trim()) {
        const q = eventSearch.toLowerCase().trim();
        const matchesName = ev.name.toLowerCase().includes(q);
        const matchesFormat = ev.format?.toLowerCase().includes(q);
        const matchesCat = ev.category?.toLowerCase().includes(q);
        if (!matchesName && !matchesFormat && !matchesCat) return false;
      }

      return true;
    });
  }, [events, selectedDivision, eventSearch]);

  const bgImage =
    sport.coverImage ||
    "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80";

  const venueName = venue?.name || sport.venueName || "Main Arena Complex";
  const venueLocation = venue?.location || "Main Campus";

  return (
    <div className={styles.container}>
      {/* 1. ARENA GRAND HEADER */}
      <section style={{ paddingTop: "140px" }}>
        <div
          className={styles.arenaHeader}
          style={{ backgroundImage: `url(${bgImage})` }}
        >
          <div className={styles.arenaHeaderContent}>
            {/* Breadcrumb Navigation */}
            <nav className={styles.breadcrumbRow} aria-label="Breadcrumb">
              <Link href="/" className={styles.breadcrumbLink}>
                Home
              </Link>
              <ChevronRight size={13} style={{ opacity: 0.5 }} />
              <Link href="/sports" className={styles.breadcrumbLink}>
                Sports Disciplines
              </Link>
              <ChevronRight size={13} style={{ opacity: 0.5 }} />
              <span className={styles.breadcrumbActive}>{sport.name}</span>
            </nav>

            <div className={styles.kickerRow}>
              <div className={styles.kickerBadge}>
                <span className={styles.kickerDot} />
                ZENITHROW 2026 • {sport.category?.toUpperCase() || "DISCIPLINE ARENA"}
              </div>

              {sport.pointClass && (
                <span
                  className={`${styles.pointBadge} ${
                    sport.pointClass === "Z"
                      ? styles.pointBadgeZ
                      : sport.pointClass === "Y"
                      ? styles.pointBadgeY
                      : styles.pointBadgeW
                  }`}
                  style={{ backdropFilter: "blur(8px)" }}
                >
                  Tier {sport.pointClass} Competition
                </span>
              )}

              <span className={styles.typeBadge} style={{ backdropFilter: "blur(8px)" }}>
                {sport.type === "team" ? "Team Discipline" : "Individual Discipline"}
              </span>
            </div>

            <h1 className={styles.arenaTitle}>{sport.name} ARENA</h1>

            <p className={styles.arenaLead}>
              {sport.description || "Official championship draws, division quotas, and adjudication rules."}
            </p>

            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <Link href="/schedules" className="btn primary">
                <Calendar size={15} style={{ marginRight: "6px" }} />
                View Timetable &amp; Fixtures →
              </Link>
              <Link href="/display" className="btn ghost">
                <Activity size={15} style={{ marginRight: "6px" }} />
                Live Arena Display ↗
              </Link>
              <Link href="/sports" className="btn" style={{ marginLeft: "auto" }}>
                <ArrowLeft size={14} style={{ marginRight: "6px" }} />
                All Disciplines
              </Link>
            </div>
          </div>
        </div>

        {/* 2. ARENA TELEMETRY METRIC GRID */}
        <div className={styles.arenaMetaGrid}>
          <div className={styles.arenaMetaCard}>
            <span className={styles.arenaMetaLabel}>
              <Sparkles size={13} style={{ color: "var(--hsu-red2)" }} />
              Configured Draws
            </span>
            <span className={styles.arenaMetaValue}>{events.length} Medal Events</span>
          </div>

          <div className={styles.arenaMetaCard}>
            <span className={styles.arenaMetaLabel}>
              <MapPin size={13} style={{ color: "var(--hsu-red2)" }} />
              Official Arena
            </span>
            <span className={styles.arenaMetaValue} style={{ fontSize: "16px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              {venueName}
            </span>
          </div>

          <div className={styles.arenaMetaCard}>
            <span className={styles.arenaMetaLabel}>
              <Award size={13} style={{ color: "var(--hsu-red2)" }} />
              Max First Place
            </span>
            <span className={styles.arenaMetaValue}>
              {sport.pointClass === "Z"
                ? "10 Championship Pts"
                : sport.pointClass === "Y"
                ? "7 Championship Pts"
                : "5 Championship Pts"}
            </span>
          </div>

          <div className={styles.arenaMetaCard}>
            <span className={styles.arenaMetaLabel}>
              <Users size={13} style={{ color: "var(--hsu-red2)" }} />
              Format Type
            </span>
            <span className={styles.arenaMetaValue} style={{ textTransform: "capitalize" }}>
              {sport.type} Tournament
            </span>
          </div>
        </div>

        {/* 3. EVENT DIVISION FILTER TABS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div>
            <div className="kicker">Certified Competition Draws</div>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 38px)", margin: "6px 0 0", letterSpacing: "-0.04em", fontWeight: 900 }}>
              Scheduled Events ({filteredEvents.length})
            </h2>
          </div>

          {events.length > 3 && (
            <div style={{ minWidth: "240px" }}>
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Filter events in this arena..."
                className={styles.searchInput}
                style={{ padding: "10px 18px", fontSize: "13px" }}
              />
            </div>
          )}
        </div>

        {divisions.length > 1 && (
          <div className={styles.divisionTabBar}>
            <button
              type="button"
              onClick={() => setSelectedDivision("all")}
              className={`${styles.divisionTab} ${selectedDivision === "all" ? styles.divisionTabActive : ""}`}
            >
              All Divisions ({events.length})
            </button>
            {divisions.map((div) => (
              <button
                key={div.id}
                type="button"
                onClick={() => setSelectedDivision(div.id)}
                className={`${styles.divisionTab} ${selectedDivision === div.id ? styles.divisionTabActive : ""}`}
              >
                {div.name} ({div.count})
              </button>
            ))}
          </div>
        )}

        {/* 4. EVENTS LIST */}
        {filteredEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <SlidersHorizontal size={36} style={{ color: "var(--hsu-muted)", margin: "0 auto" }} />
            <h3 className={styles.emptyStateTitle}>No events found for this filter</h3>
            <p className={styles.emptyStateText}>
              There are currently no events configured for the selected division or search query.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedDivision("all");
                setEventSearch("");
              }}
              className="btn primary"
            >
              Show All Events ({events.length})
            </button>
          </div>
        ) : (
          <div className={styles.eventsList}>
            {filteredEvents.map((event) => {
              const resolved = resolveFestivalEvent(event);
              const division = event.divisionId
                ? CODEX_DIVISIONS.find((d) => d.id === event.divisionId)
                : null;

              return (
                <article key={event.id} className={styles.eventCard}>
                  {/* Top Header of Event */}
                  <div className={styles.eventCardTop}>
                    <div className={styles.eventHeaderInfo}>
                      <div className={styles.eventPillRow}>
                        <span className="tag">{event.type?.toUpperCase()}</span>
                        <span style={{ color: "var(--hsu-muted)" }}>•</span>
                        <span className="tag" style={{ color: "var(--hsu-red2)" }}>
                          {event.format?.toUpperCase().replace("_", " ")}
                        </span>
                        {resolved?.classification && (
                          <>
                            <span style={{ color: "var(--hsu-muted)" }}>•</span>
                            <span className="tag" style={{ fontWeight: 800 }}>
                              CLASS {resolved.classification}
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className={styles.eventTitle}>{event.name}</h3>

                      <span className={styles.eventDivisionTag}>
                        {division ? `${division.name} (${division.level}) — ${division.classes}` : event.category || "General Tournament"}
                      </span>
                    </div>

                    <span className="status" style={{ background: "rgba(255,255,255,0.06)", color: "#bbb" }}>
                      OFFICIAL DRAW
                    </span>
                  </div>

                  {/* 4-column Specification Grid */}
                  <div className={styles.eventSpecsGrid}>
                    <div className={styles.specCol}>
                      <span className={styles.specLabel}>Competition Format</span>
                      <span className={styles.specValue}>
                        {event.format.replace("_", " ")}
                      </span>
                    </div>

                    <div className={styles.specCol}>
                      <span className={styles.specLabel}>Division &amp; Level</span>
                      <span className={styles.specValue}>
                        {division ? division.name : event.category || "General"}
                      </span>
                    </div>

                    <div className={styles.specCol}>
                      <span className={styles.specLabel}>Roster Quota</span>
                      <span className={styles.specValue}>
                        {resolved?.quota ? (
                          <>
                            {resolved.quota.mainParticipants} {event.type === "team" ? "athletes" : "entries"}
                            {resolved.quota.substitutes ? ` (+${resolved.quota.substitutes} subs)` : ""}
                          </>
                        ) : (
                          "Standard entry"
                        )}
                      </span>
                    </div>

                    <div className={styles.specCol}>
                      <span className={styles.specLabel}>Championship Points</span>
                      {resolved?.pointsMatrix ? (
                        <div className={styles.pointsPillsGroup}>
                          <span className={styles.goldPill}>1st: {resolved.pointsMatrix.first}pts</span>
                          <span className={styles.silverPill}>2nd: {resolved.pointsMatrix.second}pts</span>
                          <span className={styles.bronzePill}>3rd: {resolved.pointsMatrix.third}pts</span>
                        </div>
                      ) : (
                        <span className={styles.specValue} style={{ color: "var(--hsu-muted)" }}>
                          Pending Confirmation
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rule note callout if present */}
                  {resolved?.quota?.notes && (
                    <div className={styles.ruleNoteCallout}>
                      <ShieldAlert size={15} style={{ color: "var(--hsu-red2)", flexShrink: 0 }} />
                      <span>
                        <strong style={{ color: "var(--hsu-red2)" }}>Adjudication Rule:</strong> {resolved.quota.notes}
                      </span>
                    </div>
                  )}

                  {/* Action row linking to schedules */}
                  <div className={styles.eventActionRow}>
                    <Link
                      href={`/schedules?event=${event.id}`}
                      className="btn"
                      style={{ fontSize: "13px", padding: "8px 18px" }}
                    >
                      <Calendar size={13} style={{ marginRight: "6px" }} />
                      View Fixture Timetable →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* 5. VENUE & REGULATIONS NOTICE */}
        <section
          style={{
            background: "rgba(16, 16, 16, 0.6)",
            border: "1px solid var(--hsu-line, rgba(255, 255, 255, 0.12))",
            borderRadius: "22px",
            padding: "36px",
            marginBottom: "70px",
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: "30px",
          }}
        >
          <div>
            <div className="kicker">Arena Location &amp; Adjudication</div>
            <h3 style={{ fontSize: "28px", fontWeight: 900, margin: "8px 0 12px", letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
              {venueName}
            </h3>
            <p style={{ color: "var(--hsu-muted)", fontSize: "14px", lineHeight: 1.6, margin: 0 }}>
              Located at {venueLocation}. Referees, line judges, and official timekeepers maintain electronic field logs. All event results undergo the 4-phase adjudication lifecycle (Draft → Submitted → Verified → Published) before points reflect on the House Leaderboard.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "13px", color: "var(--hsu-muted)" }}>
              <Info size={16} style={{ color: "var(--hsu-red2)", flexShrink: 0 }} />
              <span>Participants must report to the call room 15 minutes prior to scheduled whistle.</span>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center", fontSize: "13px", color: "var(--hsu-muted)" }}>
              <Info size={16} style={{ color: "var(--hsu-red2)", flexShrink: 0 }} />
              <span>Official chest numbers must remain clearly visible throughout all heats and fixtures.</span>
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap" }}>
              <Link href="/schedules" className="btn primary" style={{ fontSize: "13px" }}>
                Tournament Timetable →
              </Link>
              <Link href="/leaderboard" className="btn" style={{ fontSize: "13px" }}>
                House Standings →
              </Link>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
