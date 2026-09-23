export type CodexDivision = {
  id: string;
  name: string;
  level: string;
  classes: string;
  maxParticipants: number;
};

export const CODEX_DIVISIONS: CodexDivision[] = [
  {
    id: "bidaya",
    name: "Bidaya",
    level: "Sub Junior",
    classes: "School of Quran — Classes 6 & 7",
    maxParticipants: 6,
  },
  {
    id: "thaniya",
    name: "Thaniya",
    level: "Junior",
    classes: "School of Quran — Classes 8, 9 & 10",
    maxParticipants: 6,
  },
  {
    id: "thamheediyya",
    name: "Thamheediyya",
    level: "Pre Senior",
    classes: "Integrated Studies — Classes 1 & 2",
    maxParticipants: 6,
  },
  {
    id: "aliya",
    name: "Aliya",
    level: "Senior",
    classes: "Integrated Studies — Classes 3 & 4",
    maxParticipants: 7,
  },
  {
    id: "majestir",
    name: "Majestir",
    level: "Super Senior",
    classes: "Integrated Studies — Classes 5, 6 & 7",
    maxParticipants: 7,
  },
];
