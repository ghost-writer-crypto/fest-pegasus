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

/**
 * Authoritative organizer-approved category mappings:
 * Bidaya -> Sub Junior
 * Thaniya -> Junior
 * Thamheediyya -> Pre Senior
 * Aliya -> Senior
 * Majestir -> Super Senior
 *
 * These are five renamed categories, NOT ten separate categories.
 */
export const CATEGORY_MAP: Record<string, string> = {
  bidaya: "Sub Junior",
  thaniya: "Junior",
  thamheediyya: "Pre Senior",
  aliya: "Senior",
  majestir: "Super Senior",
};

export const REVERSE_CATEGORY_MAP: Record<string, string> = {
  "sub junior": "bidaya",
  "sub-junior": "bidaya",
  junior: "thaniya",
  "pre senior": "thamheediyya",
  "pre-senior": "thamheediyya",
  senior: "aliya",
  "super senior": "majestir",
  "super-senior": "majestir",
};

/**
 * Resolves the canonical display name for an academic division / category.
 */
export function getConfirmedCategoryDisplayName(codeOrName: string | null | undefined): string {
  if (!codeOrName) return "";
  const normalized = codeOrName.trim().toLowerCase();
  if (CATEGORY_MAP[normalized]) return CATEGORY_MAP[normalized];
  const rev = REVERSE_CATEGORY_MAP[normalized];
  if (rev && CATEGORY_MAP[rev]) return CATEGORY_MAP[rev];
  return codeOrName.trim();
}
