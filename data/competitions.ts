import type { Competition } from "@/lib/types";

/**
 * Official competition instances linked to events and formats.
 */
export const competitions: Competition[] = [
  {
    id: "comp-race-100m-majestir",
    eventId: "race-100m-majestir",
    format: "final",
    status: "finished",
    venueId: "main-track",
    scheduledAt: "2026-09-18T10:00:00Z",
    completedAt: "2026-09-18T10:30:00Z",
  },
  {
    id: "comp-long-jump-majestir",
    eventId: "long-jump-majestir",
    format: "final",
    status: "finished",
    venueId: "long-jump-pit",
    scheduledAt: "2026-09-18T11:00:00Z",
    completedAt: "2026-09-18T11:45:00Z",
  },
  {
    id: "comp-high-jump-majestir",
    eventId: "high-jump-majestir",
    format: "final",
    status: "finished",
    venueId: "high-jump-mat",
    scheduledAt: "2026-09-18T14:00:00Z",
    completedAt: "2026-09-18T14:45:00Z",
  },
];

