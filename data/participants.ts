import type { Participant } from "@/lib/types";

export const participants: Participant[] = [
  {
    id: "p001",
    publicId: "PGS-0001",
    chestNumber: "1001",
    name: "Participant One",
    teamId: "falcons",
    divisionId: "majestir",
    category: "Super Senior",
    eventIds: ["race-100m-majestir", "long-jump-majestir"],
    status: "confirmed",
  },
  {
    id: "p002",
    publicId: "PGS-0002",
    chestNumber: "1002",
    name: "Participant Two",
    teamId: "titans",
    divisionId: "majestir",
    category: "Super Senior",
    eventIds: ["race-100m-majestir", "high-jump-majestir"],
    status: "confirmed",
  },
  {
    id: "p003",
    publicId: "PGS-0003",
    chestNumber: "1003",
    name: "Participant Three",
    teamId: "phoenix",
    divisionId: "majestir",
    category: "Super Senior",
    eventIds: ["long-jump-majestir"],
    status: "confirmed",
  },
  {
    id: "p004",
    publicId: "PGS-0004",
    chestNumber: "1004",
    name: "Participant Four",
    teamId: "warriors",
    divisionId: "majestir",
    category: "Super Senior",
    eventIds: ["high-jump-majestir"],
    status: "confirmed",
  },
];

