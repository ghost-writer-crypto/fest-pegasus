"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import type { Sport, FestivalEvent, Venue } from "@/lib/types";
import {
  Search,
  X,
  Trophy,
  ArrowRight,
  SlidersHorizontal,
  Calendar,
  Sparkles,
  Users,
  User,
  Activity,
} from "lucide-react";
import styles from "./sports.module.css";

interface SportsDirectoryClientProps {
  sports: Sport[];
  events: FestivalEvent[];
  venues: Venue[];
}

export default function SportsDirectoryClient({
  sports,
  events,
  venues,
}: SportsDirectoryClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPointClass, setSelectedPointClass] = useState<string>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: press '/' to focus search, 'Escape' to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement !== searchInputRef.current &&
        !["INPUT", "TEXTAREA"].includes((document.activeElement?.tagName || ""))
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        setSearchQuery("");
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute event counts per sport
  const eventCountBySport = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sport of sports) {
      const matchCount = events.filter(
        (e) =>
          e.sport.toLowerCase() === sport.name.toLowerCase() ||
          e.sport.toLowerCase() === sport.id.toLowerCase() ||
          (sport.slug && e.sport.toLowerCase() === sport.slug.toLowerCase()),
      ).length;
      counts[sport.id] = matchCount;
    }
    return counts;
  }, [sports, events]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const sport of sports) {
      if (sport.category) set.add(sport.category);
    }
    return Array.from(set);
  }, [sports]);

  // Total certified draws
  const totalDraws = useMemo(() => {
    return Object.values(eventCountBySport).reduce((acc, c) => acc + c, 0);
  }, [eventCountBySport]);

  // Filtered sports
  const filteredSports = useMemo(() => {
    return sports.filter((sport) => {
      // Category filter
      if (selectedCategory !== "all" && sport.category !== selectedCategory) {
        return false;
      }

      // Type filter (team vs individual)
      if (selectedType !== "all" && sport.type !== selectedType) {
        return false;
      }

      // Point class filter
      if (selectedPointClass !== "all" && sport.pointClass !== selectedPointClass) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = sport.name.toLowerCase().includes(query);
        const matchesCategory = sport.category?.toLowerCase().includes(query);
        const matchesDesc = sport.description?.toLowerCase().includes(query);
        const matchesVenue = sport.venueName?.toLowerCase().includes(query);
        const matchesDraw = events.some(
          (e) =>
            (e.sport.toLowerCase() === sport.name.toLowerCase() ||
              e.sport.toLowerCase() === sport.id.toLowerCase()) &&
            e.name.toLowerCase().includes(query),
        );

        if (!matchesName && !matchesCategory && !matchesDesc && !matchesVenue && !matchesDraw) {
          return false;
        }
      }

      return true;
    });
  }, [sports, events, selectedCategory, selectedType, selectedPointClass, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "all" ||
    selectedType !== "all" ||
    selectedPointClass !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedType("all");
    setSelectedPointClass("all");
  };

  return (
    <div className={styles.container}>
      {/* 1. HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.kickerRow}>
          <div className={styles.kickerBadge}>
            <span className={styles.kickerDot} />
            ZENITHROW 2026 • OFFICIAL CHAMPIONSHIP DISCIPLINES
          </div>
        </div>

        <h1 className={styles.heroTitle}>
          DISCIPLINES<br />
          <span className={styles.heroTitleOutline}>&amp; ARENAS.</span>
        </h1>

        <p className={styles.heroLead}>
          Explore certified festival sports, medal events, division eligibility, official roster quotas, and championship point distributions across all collegiate houses.
        </p>

        {/* Telemetry Metric Strip */}
        <div className={styles.telemetryStrip}>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryValue}>{sports.length}</span>
            <span className={styles.telemetryLabel}>Certified Disciplines</span>
          </div>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryValue}>{totalDraws}</span>
            <span className={styles.telemetryLabel}>Official Medal Draws</span>
          </div>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryValue}>4</span>
            <span className={styles.telemetryLabel}>Point Tiers (Z · Y · X · W)</span>
          </div>
          <div className={styles.telemetryItem}>
            <span className={styles.telemetryValue}>{venues.length}</span>
            <span className={styles.telemetryLabel}>Active Arenas</span>
          </div>
        </div>

        {/* 2. SEARCH & CONTROLS BOX */}
        <div className={styles.controlsBox}>
          {/* Main search input */}
          <div className={styles.searchRow}>
            <div className={styles.searchWrapper}>
              <Search size={18} className={styles.searchIcon} />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search disciplines, events, draws, rules or venues..."
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={styles.clearButton}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Type Filter */}
            <div className={styles.typeFilterRow}>
              <button
                type="button"
                onClick={() => setSelectedType("all")}
                className={`${styles.filterChip} ${selectedType === "all" ? styles.filterChipActive : ""}`}
              >
                All Formats
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("team")}
                className={`${styles.filterChip} ${selectedType === "team" ? styles.filterChipActive : ""}`}
              >
                <Users size={13} />
                Team Sports
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("individual")}
                className={`${styles.filterChip} ${selectedType === "individual" ? styles.filterChipActive : ""}`}
              >
                <User size={13} />
                Individual
              </button>
            </div>
          </div>

          {/* Category Pills Horizontal Scroll */}
          <div className={styles.categoryScroll}>
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`${styles.filterChip} ${selectedCategory === "all" ? styles.filterChipActive : ""}`}
            >
              All Categories ({sports.length})
            </button>
            {categories.map((cat) => {
              const count = sports.filter((s) => s.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`${styles.filterChip} ${selectedCategory === cat ? styles.filterChipActive : ""}`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Point Tier Filter & Results Count Row */}
          <div className={styles.resultsCountRow}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--hsu-muted)" }}>
                Codex Tier:
              </span>
              <button
                type="button"
                onClick={() => setSelectedPointClass("all")}
                className={`${styles.filterChip} ${selectedPointClass === "all" ? styles.filterChipActive : ""}`}
                style={{ padding: "4px 10px", fontSize: "11px" }}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedPointClass("Z")}
                className={`${styles.filterChip} ${selectedPointClass === "Z" ? styles.filterChipActive : ""}`}
                style={{ padding: "4px 10px", fontSize: "11px" }}
              >
                Tier Z (10 pts)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPointClass("Y")}
                className={`${styles.filterChip} ${selectedPointClass === "Y" ? styles.filterChipActive : ""}`}
                style={{ padding: "4px 10px", fontSize: "11px" }}
              >
                Tier Y (7 pts)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPointClass("X")}
                className={`${styles.filterChip} ${selectedPointClass === "X" ? styles.filterChipActive : ""}`}
                style={{ padding: "4px 10px", fontSize: "11px" }}
              >
                Tier X (5 pts)
              </button>
              <button
                type="button"
                onClick={() => setSelectedPointClass("W")}
                className={`${styles.filterChip} ${selectedPointClass === "W" ? styles.filterChipActive : ""}`}
                style={{ padding: "4px 10px", fontSize: "11px" }}
              >
                Tier W (5 pts)
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span>
                Showing <strong style={{ color: "var(--text-primary)" }}>{filteredSports.length}</strong> of {sports.length} disciplines
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--hsu-red2)",
                    fontWeight: 800,
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: "12px",
                  }}
                >
                  Reset filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. DISCIPLINE CARDS GRID */}
        {filteredSports.length === 0 ? (
          <div className={styles.emptyState}>
            <SlidersHorizontal size={36} style={{ color: "var(--hsu-muted)", margin: "0 auto" }} />
            <h3 className={styles.emptyStateTitle}>No matching disciplines found</h3>
            <p className={styles.emptyStateText}>
              Try adjusting your search query or reset the active category and format filters.
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="btn primary"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className={styles.sportsGrid}>
            {filteredSports.map((sport, index) => {
              const tagNumber = String(index + 1).padStart(2, "0");
              const drawCount = eventCountBySport[sport.id] || 0;
              const bgImage =
                sport.coverImage ||
                "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80";

              return (
                <Link
                  key={sport.id}
                  href={`/sports/${sport.slug || sport.id}`}
                  className={styles.sportCard}
                  style={{ backgroundImage: `url(${bgImage})` }}
                >
                  <div className={styles.sportCardContent}>
                    {/* Top Row: Index Tag & Badges */}
                    <div className={styles.cardTopRow}>
                      <span className={styles.indexTag}>
                        {tagNumber} • {sport.category || "DISCIPLINE"}
                      </span>

                      <div className={styles.badgeStack}>
                        {sport.pointClass && (
                          <span
                            className={`${styles.pointBadge} ${
                              sport.pointClass === "Z"
                                ? styles.pointBadgeZ
                                : sport.pointClass === "Y"
                                ? styles.pointBadgeY
                                : styles.pointBadgeW
                            }`}
                          >
                            Tier {sport.pointClass}
                          </span>
                        )}
                        <span className={styles.typeBadge}>
                          {sport.type === "team" ? "Team" : "Individual"}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Info: Title, Description, Meta & CTA */}
                    <div className={styles.cardBottomInfo}>
                      <h3 className={styles.cardSportName}>{sport.name}</h3>
                      <p className={styles.cardDescription}>{sport.description}</p>

                      <div className={styles.cardMetaRow}>
                        <span className={styles.drawsCount}>
                          <Sparkles size={13} style={{ color: "var(--hsu-red2)" }} />
                          {drawCount} certified {drawCount === 1 ? "draw" : "draws"}
                        </span>
                        <span className={styles.exploreCta}>
                          Arena draws <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* 4. CODEX SCORING MATRIX DECK */}
        <section className={styles.codexSection}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <div className="kicker">Official Adjudication Architecture</div>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", margin: "8px 0 0", letterSpacing: "-0.04em", fontWeight: 900 }}>
                Championship Point Matrix
              </h2>
            </div>
            <p style={{ maxWidth: "480px", fontSize: "14px", color: "var(--hsu-muted)", margin: 0, lineHeight: 1.5 }}>
              Every point allocated at ZENITHROW is mathematically derived through four canonical tiers. All verified results instantly compound into the House Championship leaderboard.
            </p>
          </div>

          <div className={styles.codexGrid}>
            <div className={styles.codexTierCard} style={{ borderColor: "rgba(229, 57, 53, 0.4)" }}>
              <div>
                <div className={styles.tierHeader}>
                  <span className={styles.tierLetter} style={{ color: "var(--hsu-red2)" }}>Z</span>
                  <span className={styles.pointBadge} style={{ background: "rgba(229, 57, 53, 0.2)", color: "#ff6d63" }}>
                    General Heavyweight
                  </span>
                </div>
                <div className={styles.tierTitle}>Major Team &amp; Power Events</div>
                <div className={styles.tierPointsRow}>
                  <span className={styles.tierPill}>1st: 10 pts</span>
                  <span className={styles.tierPill}>2nd: 7 pts</span>
                  <span className={styles.tierPill}>3rd: 5 pts</span>
                </div>
              </div>
              <div className={styles.tierExamples}>
                Football, Cricket, Volleyball, Arm Wrestling, Push-Up &amp; Pull-Up.
              </div>
            </div>

            <div className={styles.codexTierCard} style={{ borderColor: "rgba(242, 184, 75, 0.4)" }}>
              <div>
                <div className={styles.tierHeader}>
                  <span className={styles.tierLetter} style={{ color: "#f2b84b" }}>Y</span>
                  <span className={styles.pointBadge} style={{ background: "rgba(242, 184, 75, 0.15)", color: "#f2b84b" }}>
                    Prestige Team &amp; Show
                  </span>
                </div>
                <div className={styles.tierTitle}>House Clashes &amp; Pageantry</div>
                <div className={styles.tierPointsRow}>
                  <span className={styles.tierPill}>1st: 7 pts</span>
                  <span className={styles.tierPill}>2nd: 5 pts</span>
                  <span className={styles.tierPill}>3rd: 3 pts</span>
                </div>
              </div>
              <div className={styles.tierExamples}>
                Tug of War (600kg), Penalty Shootout, March Past, Zenithrow Branding, Commentary.
              </div>
            </div>

            <div className={styles.codexTierCard} style={{ borderColor: "rgba(91, 155, 213, 0.4)" }}>
              <div>
                <div className={styles.tierHeader}>
                  <span className={styles.tierLetter} style={{ color: "#7bb4eb" }}>X</span>
                  <span className={styles.pointBadge} style={{ background: "rgba(91, 155, 213, 0.15)", color: "#7bb4eb" }}>
                    Group Athletic Games
                  </span>
                </div>
                <div className={styles.tierTitle}>Relays &amp; Field Games</div>
                <div className={styles.tierPointsRow}>
                  <span className={styles.tierPill}>1st: 5 pts</span>
                  <span className={styles.tierPill}>2nd: 3 pts</span>
                  <span className={styles.tierPill}>3rd: 1 pt</span>
                </div>
              </div>
              <div className={styles.tierExamples}>
                Relays (4x50m, 4x100m, 4x200m), Kho-Kho, Dodge Ball, Badminton Doubles, Three-Legged Race.
              </div>
            </div>

            <div className={styles.codexTierCard} style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}>
              <div>
                <div className={styles.tierHeader}>
                  <span className={styles.tierLetter}>W</span>
                  <span className={styles.pointBadge} style={{ background: "rgba(255, 255, 255, 0.1)", color: "#ddd" }}>
                    Individual Honours
                  </span>
                </div>
                <div className={styles.tierTitle}>Track &amp; Field, Skill &amp; Mind</div>
                <div className={styles.tierPointsRow}>
                  <span className={styles.tierPill}>1st: 5 pts</span>
                  <span className={styles.tierPill}>2nd: 3 pts</span>
                  <span className={styles.tierPill}>3rd: 1 pt</span>
                </div>
              </div>
              <div className={styles.tierExamples}>
                100m Dash, Long Jump, High Jump, Shot Put, Javelin, Archery, Badminton Singles.
              </div>
            </div>
          </div>
        </section>

        {/* 5. CALL TO ACTION BAND */}
        <section className={styles.ctaBand}>
          <div className={styles.ctaText}>
            <h3>Ready for the whistle.</h3>
            <p>
              Access live tournament schedules, track real-time fixture delays, and follow the House Championship standings.
            </p>
          </div>
          <div className={styles.ctaButtonGroup}>
            <Link href="/schedules" className="btn primary">
              <Calendar size={15} style={{ marginRight: "6px" }} />
              Full Fixture Timetable →
            </Link>
            <Link href="/leaderboard" className="btn">
              <Trophy size={15} style={{ marginRight: "6px" }} />
              House Standings →
            </Link>
            <Link href="/display" className="btn ghost">
              <Activity size={15} style={{ marginRight: "6px" }} />
              Live Arena Radar ↗
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}
