"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ParticipantRow, TeamRow } from "@/lib/repositories";
import { CODEX_DIVISIONS } from "@/lib/competition/divisions";

type Props = {
  initialParticipants: ParticipantRow[];
  teams: TeamRow[];
};

function getInitials(name: string): string {
  if (!name || name.trim() === "") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ParticipantDirectoryClient({
  initialParticipants,
  teams,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

  const teamMap = useMemo(() => {
    return new Map(teams.map((t) => [t.id, t]));
  }, [teams]);

  // Resolves human-readable division name
  const resolveDivisionName = (divisionId: string | null): string => {
    if (!divisionId) return "Unassigned Division";
    const found = CODEX_DIVISIONS.find(
      (d) =>
        d.id === divisionId ||
        d.id === divisionId.toLowerCase() ||
        d.name.toLowerCase() === divisionId.toLowerCase(),
    );
    return found?.name ?? divisionId;
  };

  // Filtered participant list
  const filteredParticipants = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return initialParticipants.filter((participant) => {
      // Search matching: public name, chest number, or public ID
      if (query) {
        const matchesName = participant.name.toLowerCase().includes(query);
        const matchesPublicId = participant.public_id
          .toLowerCase()
          .includes(query);
        const matchesChest = participant.chest_number
          ? participant.chest_number.toLowerCase().includes(query)
          : false;

        if (!matchesName && !matchesPublicId && !matchesChest) {
          return false;
        }
      }

      // Division filter
      if (divisionFilter !== "all") {
        const divName = resolveDivisionName(participant.division_id);
        const matchesDiv =
          participant.division_id === divisionFilter ||
          divName.toLowerCase() === divisionFilter.toLowerCase();
        if (!matchesDiv) {
          return false;
        }
      }

      // Team filter
      if (teamFilter !== "all") {
        if (participant.team_id !== teamFilter) {
          return false;
        }
      }

      return true;
    });
  }, [initialParticipants, searchQuery, divisionFilter, teamFilter]);

  const isFiltering =
    searchQuery.trim() !== "" ||
    divisionFilter !== "all" ||
    teamFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setDivisionFilter("all");
    setTeamFilter("all");
  };

  return (
    <section>
      {/* Search and Filters Bar */}
      <div className="pegasus-filter-row">
        {/* Instant Search Input */}
        <div style={{ flex: "1 1 280px" }}>
          <div className="pegasus-search">
            <span className="pegasus-search__icon" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by competitor name, chest number, or public ID..."
              className="pegasus-search__input"
              aria-label="Search competitors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "14px",
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  cursor: "pointer",
                  fontSize: "16px",
                  padding: "4px",
                }}
                aria-label="Clear search query"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Division Filter */}
        <div style={{ minWidth: "160px" }}>
          <select
            value={divisionFilter}
            onChange={(e) => setDivisionFilter(e.target.value)}
            className="pegasus-select"
            aria-label="Filter by division"
          >
            <option value="all">All Divisions</option>
            {CODEX_DIVISIONS.map((div) => (
              <option key={div.id} value={div.id}>
                {div.name}
              </option>
            ))}
          </select>
        </div>

        {/* Team Filter */}
        <div style={{ minWidth: "160px" }}>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="pegasus-select"
            aria-label="Filter by team"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Action */}
        {isFiltering && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="pegasus-button pegasus-button--secondary"
            style={{ padding: "0 16px", minHeight: "48px" }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Results Status Bar */}
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
          Showing <strong>{filteredParticipants.length}</strong> of{" "}
          {initialParticipants.length} competitor
          {initialParticipants.length === 1 ? "" : "s"}
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

      {/* Empty Filtered State */}
      {filteredParticipants.length === 0 ? (
        <div
          className="pegasus-card"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            marginTop: "20px",
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
            No competitors match your criteria
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "var(--muted)",
              marginBottom: "20px",
            }}
          >
            Try modifying your search term or resetting the selected filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="pegasus-button pegasus-button--secondary"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        /* Participant Grid */
        <div className="pegasus-participants">
          {filteredParticipants.map((participant) => {
            const team = participant.team_id
              ? teamMap.get(participant.team_id)
              : null;
            const teamName = team?.name ?? "Unassigned Team";
            const divisionName = resolveDivisionName(participant.division_id);

            return (
              <Link
                key={participant.id}
                href={`/participants/${encodeURIComponent(participant.public_id)}`}
                className="pegasus-participant-card"
              >
                {/* Avatar */}
                <div className="pegasus-participant-card__image">
                  {participant.profile_image_url ? (
                    <Image
                      src={participant.profile_image_url}
                      alt={participant.name}
                      width={68}
                      height={68}
                    />
                  ) : (
                    <span>{getInitials(participant.name)}</span>
                  )}
                </div>

                {/* Content */}
                <div className="pegasus-participant-card__content">
                  {/* Top Identification: Chest & Public ID */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {participant.chest_number && (
                      <span className="pegasus-chest-badge">
                        #{participant.chest_number}
                      </span>
                    )}
                    <span className="pegasus-participant-card__id">
                      {participant.public_id}
                    </span>
                  </div>

                  <h2>{participant.name}</h2>

                  {/* Metadata */}
                  <div className="pegasus-participant-card__meta">
                    <span>{teamName}</span>
                    <span>{divisionName}</span>
                  </div>
                </div>

                <span className="pegasus-participant-card__arrow" aria-hidden="true">
                  ↗
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

