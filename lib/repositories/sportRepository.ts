import { createClient } from "../supabase/server.ts";
import { getSportImageManifest } from "../storage/sportImageStorage.ts";

/**
 * Shape of a row in public.sports matching migration 20260920000100.
 */
export type SportRow = {
  id: string;
  festival_id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
};

export type SportWithImage = SportRow & {
  category: string;
  type: "individual" | "team";
  coverImage?: string;
  isDatabaseConfigured: boolean;
};

/**
 * Authoritative canonical festival sports definitions.
 * Reconciles the database sports with the complete 11 campus disciplines.
 */
export const CANONICAL_SPORTS_CATALOG = [
  {
    slug: "athletics",
    name: "Athletics",
    category: "Track & Field",
    type: "individual" as const,
    description: "Speed, explosive strength, endurance and field precision on the championship track.",
    sort_order: 1,
    defaultImage: "/images/hero/zenithrow-arena-aerial.jpg",
  },
  {
    slug: "football",
    name: "Football",
    category: "Team Sports",
    type: "team" as const,
    description: "The premier collegiate football tournament. High intensity knockout fixtures under floodlights.",
    sort_order: 2,
    defaultImage: "/images/hero/zenithrow-arena-aerial.jpg",
  },
  {
    slug: "cricket",
    name: "Cricket",
    category: "Team Sports",
    type: "team" as const,
    description: "Strategy, tactical bowling and boundary power in high-pressure knockout cup rounds.",
    sort_order: 3,
    defaultImage: "/images/hero/zenithrow-arena-aerial.jpg",
  },
  {
    slug: "tug-of-war",
    name: "Tug of War",
    category: "Strength & Power",
    type: "team" as const,
    description: "The iconic collegiate clash. 8 athletes per house with strict 600kg total team weigh-in adjudication.",
    sort_order: 4,
    defaultImage: "/images/hero/zenithrow-arena-aerial.jpg",
  },
  {
    slug: "volleyball",
    name: "Volleyball",
    category: "Team Sports",
    type: "team" as const,
    description: "Tactical sets, lightning blocks and thunderous spikes across the net in elimination brackets.",
    sort_order: 5,
    defaultImage: "/images/hero/zenithrow-arena-aerial.jpg",
  },
  {
    slug: "basketball",
    name: "Basketball",
    category: "Team Sports",
    type: "team" as const,
    description: "Fast-break transitions, rim attacks and defensive intensity on the indoor court.",
    sort_order: 6,
    defaultImage: "/images/hero/zenithrow-arena-aerial.jpg",
  },
  {
    slug: "badminton",
    name: "Badminton",
    category: "Racquet Sports",
    type: "individual" as const,
    description: "Singles and doubles mastery. Rapid shuttle speeds, court deception and razor-thin margins.",
    sort_order: 7,
    defaultImage: "/images/hero/zenithrow-arena-aerial.jpg",
  },
  {
    slug: "power-strength",
    name: "Power & Strength",
    category: "Strength & Power",
    type: "individual" as const,
    description: "Arm Wrestling showdowns, maximum Push-Up endurance and Pull-Up power duels across divisions.",
    sort_order: 8,
    defaultImage: "/images/hero/zenithrow-arena-aerial.jpg",
  },
  {
    slug: "field-games",
    name: "Field Games",
    category: "Field Games",
    type: "team" as const,
    description: "Tactical tag-and-chase in Kho-Kho, fast-reflex Dodgeball, and Throwball house tournaments.",
    sort_order: 9,
    defaultImage: "/images/hero/zenithrow-arena-aerial.jpg",
  },
  {
    slug: "precision-sports",
    name: "Target & Precision",
    category: "Precision Sports",
    type: "individual" as const,
    description: "Carroms, chess, dart board accuracy, penalty shootouts and bowling duels.",
    sort_order: 10,
    defaultImage: "/images/hero/zenithrow-arena-aerial.jpg",
  },
  {
    slug: "traditional-games",
    name: "Campus Traditions",
    category: "Campus Traditions",
    type: "individual" as const,
    description: "Time-honored campus heritage events and traditional clashes.",
    sort_order: 11,
    defaultImage: "/images/hero/zenithrow-arena-aerial.jpg",
  },
];

export const CANONICAL_SPORT_SLUGS = new Set(
  CANONICAL_SPORTS_CATALOG.map((s) => s.slug)
);

/**
 * Validates that an input sport identifier is a recognized canonical slug
 * and strictly prevents path traversal or arbitrary string injection.
 */
export function isValidSportSlug(slug: unknown): slug is string {
  if (typeof slug !== "string") return false;
  const trimmed = slug.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(trimmed)) return false;
  return CANONICAL_SPORT_SLUGS.has(trimmed);
}

/**
 * Explicit columns queried from public.sports.
 */
const SPORT_COLUMNS =
  "id, festival_id, name, slug, description, sort_order, created_at" as const;

/**
 * Retrieves all sports configured for a given festival directly from database.
 */
export async function getSportsByFestival(
  festivalId: string,
): Promise<SportRow[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return [];
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sports")
      .select(SPORT_COLUMNS)
      .eq("festival_id", festivalId)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error(
        `[sportRepository.getSportsByFestival] Failed to retrieve sports for festival ${festivalId}:`,
        error,
      );
      return [];
    }

    return (data as SportRow[]) ?? [];
  } catch (err) {
    console.error(
      `[sportRepository.getSportsByFestival] Unexpected error:`,
      err,
    );
    return [];
  }
}

/**
 * Retrieves the complete reconciled sports catalog for the festival.
 * Combines database records with canonical disciplines and applies admin custom images.
 */
export async function getReconciledSports(
  festivalId: string,
): Promise<SportWithImage[]> {
  const [dbSports, imageManifest] = await Promise.all([
    getSportsByFestival(festivalId),
    getSportImageManifest().catch(() => ({} as Record<string, string>)),
  ]);

  const dbMap = new Map(dbSports.map((s) => [s.slug, s]));

  return CANONICAL_SPORTS_CATALOG.map((canonical) => {
    const existing = dbMap.get(canonical.slug);
    const customImage = imageManifest[canonical.slug];

    if (existing) {
      return {
        ...existing,
        category: canonical.category,
        type: canonical.type,
        coverImage: customImage || canonical.defaultImage,
        isDatabaseConfigured: true,
      };
    }

    // Synthesized canonical representation for unseeded disciplines
    return {
      id: `canonical-${canonical.slug}`,
      festival_id: festivalId,
      name: canonical.name,
      slug: canonical.slug,
      description: canonical.description,
      sort_order: canonical.sort_order,
      created_at: new Date().toISOString(),
      category: canonical.category,
      type: canonical.type,
      coverImage: customImage || canonical.defaultImage,
      isDatabaseConfigured: false,
    };
  });
}

/**
 * Retrieves a single sport by primary key ID or slug.
 */
export async function getSportById(
  sportIdOrSlug: string,
  festivalId?: string,
): Promise<SportRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return null;
  }

  try {
    const supabase = await createClient();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        sportIdOrSlug,
      );

    let query = supabase.from("sports").select(SPORT_COLUMNS);

    if (isUuid) {
      query = query.eq("id", sportIdOrSlug);
    } else {
      query = query.eq("slug", sportIdOrSlug);
    }

    if (festivalId) {
      query = query.eq("festival_id", festivalId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(
        `[sportRepository.getSportById] Failed to retrieve sport ${sportIdOrSlug}:`,
        error,
      );
      return null;
    }

    if (data) return data as SportRow;

    // Check canonical catalog fallback if not found in db
    const canonical = CANONICAL_SPORTS_CATALOG.find(
      (c) => c.slug === sportIdOrSlug || `canonical-${c.slug}` === sportIdOrSlug
    );
    if (canonical) {
      return {
        id: `canonical-${canonical.slug}`,
        festival_id: festivalId || "",
        name: canonical.name,
        slug: canonical.slug,
        description: canonical.description,
        sort_order: canonical.sort_order,
        created_at: new Date().toISOString(),
      };
    }

    return null;
  } catch (err) {
    console.error(
      `[sportRepository.getSportById] Unexpected error:`,
      err,
    );
    return null;
  }
}
