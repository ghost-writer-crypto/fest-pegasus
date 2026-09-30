import type { Result } from "../lib/types/index.ts";
import { getEventPoints } from "../lib/competition/engine.ts";

const published = (eventId: string, position: number) => ({
  points: getEventPoints(eventId, position),
  status: "published" as const,
  submittedBy: "Track Referee",
  verifiedBy: "Chief Scorer",
  publishedAt: "2026-09-18T16:00:00Z",
  isOfficial: true,
  createdAt: "2026-09-18T15:30:00Z",
  updatedAt: "2026-09-18T16:00:00Z",
});

export const results: Result[] = [
  {
    id: "r001",
    eventId: "race-100m-majestir",
    competitionId: "comp-race-100m-majestir",
    participantId: "p001",
    position: 1,
    performance: "11.42s",
    ...published("race-100m", 1),
  },
  {
    id: "r002",
    eventId: "race-100m-majestir",
    competitionId: "comp-race-100m-majestir",
    participantId: "p002",
    position: 2,
    performance: "11.68s",
    ...published("race-100m", 2),
  },
  {
    id: "r003",
    eventId: "long-jump-majestir",
    competitionId: "comp-long-jump-majestir",
    participantId: "p003",
    position: 1,
    performance: "5.82m",
    ...published("long-jump", 1),
  },
  {
    id: "r004",
    eventId: "high-jump-majestir",
    competitionId: "comp-high-jump-majestir",
    participantId: "p004",
    position: 1,
    performance: "1.68m",
    ...published("high-jump", 1),
  },
];
