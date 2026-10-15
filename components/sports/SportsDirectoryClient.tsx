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
  }, [sports, events, selectedCategory, searchQuery]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCategory !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
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
          <span className={styles.heroTitleOutline}>& EVENTS.</span>
        </h1>

        <p className={styles.heroLead}>
          Explore certified festival sports, medal events, division eligibility, official roster quotas, and tournament draws across all collegiate teams.
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
            <span className={styles.telemetryValue}>{categories.length}</span>
            <span className={styles.telemetryLabel}>Categories</span>
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
            <div className={styles.searchWrapper} style={{ width: "100%" }}>
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
          </div>

          {/* Category Pills Horizontal Scroll */}
          <div
            className={styles.categoryScroll}
            style={{
              display: "flex",
              flexWrap: "nowrap",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              paddingBottom: "4px",
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`${styles.filterChip} ${selectedCategory === "all" ? styles.filterChipActive : ""}`}
              style={{ flexShrink: 0, whiteSpace: "nowrap" }}
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
                  style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Results Count & Reset Filter */}
          <div className={styles.resultsCountRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", justifyContent: "space-between" }}>
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
              const hasValidRealImage =
                sport.coverImage &&
                !sport.coverImage.includes("unsplash.com") &&
                !sport.coverImage.includes("images.unsplash");
              const bgImage = hasValidRealImage
                ? sport.coverImage
                : sport.category === "Track & Field"
                ? "/images/hero/zenithrow-arena-aerial.jpg"
                : undefined;

              return (
                <Link
                  key={sport.id}
                  href={`/sports/${sport.slug || sport.id}`}
                  className={styles.sportCard}
                  style={bgImage ? { backgroundImage: `url(${bgImage})` } : undefined}
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

        {/* 4. CALL TO ACTION BAND */}
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
          </div>
        </section>
      </section>
    </div>
  );
}
