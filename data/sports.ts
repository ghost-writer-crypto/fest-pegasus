export type Sport = {
  id: string;
  name: string;
  category: string;
  description: string;
  events: string[];
};

export const sports: Sport[] = [
  {
    id: "athletics",
    name: "Athletics",
    category: "Track & Field",
    description: "Speed, strength, endurance and precision.",
    events: [
      "100m",
      "200m",
      "400m",
      "800m",
      "1500m",
      "Long Jump",
      "High Jump",
      "Shot Put",
    ],
  },

  {
    id: "football",
    name: "Football",
    category: "Team Sports",
    description: "The beautiful game. One team, one objective.",
    events: [
      "Football",
    ],
  },

  {
    id: "basketball",
    name: "Basketball",
    category: "Team Sports",
    description: "Speed, movement and relentless competition.",
    events: [
      "Basketball",
    ],
  },

  {
    id: "volleyball",
    name: "Volleyball",
    category: "Team Sports",
    description: "Precision, teamwork and power.",
    events: [
      "Volleyball",
    ],
  },

  {
    id: "cricket",
    name: "Cricket",
    category: "Team Sports",
    description: "Strategy, skill and patience under pressure.",
    events: [
      "Cricket",
    ],
  },
];