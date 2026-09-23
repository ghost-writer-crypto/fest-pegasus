import type { Sport } from "@/lib/types";

export const sports: Sport[] = [
  {
    id: "athletics",
    name: "Athletics",
    slug: "athletics",
    type: "individual",
    category: "Track & Field",
    description: "Speed, strength, endurance and precision.",
  },
  {
    id: "football",
    name: "Football",
    slug: "football",
    type: "team",
    category: "Team Sports",
    description: "The beautiful game. One team, one objective.",
  },
  {
    id: "basketball",
    name: "Basketball",
    slug: "basketball",
    type: "team",
    category: "Team Sports",
    description: "Speed, movement and relentless competition.",
  },
  {
    id: "volleyball",
    name: "Volleyball",
    slug: "volleyball",
    type: "team",
    category: "Team Sports",
    description: "Precision, teamwork and power.",
  },
  {
    id: "cricket",
    name: "Cricket",
    slug: "cricket",
    type: "team",
    category: "Team Sports",
    description: "Strategy, skill and patience under pressure.",
  },
];
