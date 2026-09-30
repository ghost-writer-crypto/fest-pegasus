/**
 * PEGASUS Sports Festival — Tug-of-War Weight Validation Engine
 *
 * Official Competition Rules:
 * - 8 main participants
 * - 4 substitutes
 * - Maximum roster slots: 12
 * - Maximum active/main-team weight: 600 kg
 *
 * Business Rules Enforced:
 * 1. Only the 8 main/active participants count toward the 600 kg limit.
 * 2. Substitutes do not count toward the active 600 kg limit until substituted in.
 * 3. Exact 2-decimal rounded arithmetic (e.g. 600.00 kg is allowed, 600.10 kg is rejected).
 * 4. Missing, null, 0, or negative weights for main-team participants strictly invalidate the team.
 * 5. Prospective validation for substitutions: (current - outgoing + incoming) <= 600 kg.
 */

export const TUG_OF_WAR_EVENT_ID = "tug-of-war";
export const DEFAULT_TUG_OF_WAR_MAX_WEIGHT_KG = 600;
export const TUG_OF_WAR_MAIN_PARTICIPANTS = 8;
export const TUG_OF_WAR_SUBSTITUTES = 4;
export const TUG_OF_WAR_TOTAL_ROSTER = 12;

export interface TugOfWarParticipantWeight {
  participantId: string;
  participantName?: string;
  weightKg: number | null | undefined;
  isSubstitute?: boolean;
}

export interface TugOfWarWeightValidationResult {
  valid: boolean;
  totalWeightKg: number;
  maxWeightKg: number;
  remainingWeightKg: number;
  excessWeightKg: number;
  activeCount: number;
  substituteCount: number;
  unweighedParticipantIds: string[];
  error?: string;
  isFullTeam?: boolean;
}

export interface ProspectiveWeightCheckParams {
  currentMainWeights: (number | TugOfWarParticipantWeight)[];
  outgoingWeightKg?: number | null;
  incomingWeightKg: number | null | undefined;
  maxWeightKg?: number;
}

/**
 * Checks whether an event identifier or code corresponds to Tug of War.
 */
export function isTugOfWarEvent(eventIdOrCode: string | null | undefined): boolean {
  if (!eventIdOrCode) return false;
  const normalized = eventIdOrCode.toLowerCase().trim();
  return (
    normalized === "tug-of-war" ||
    normalized.startsWith("tug-of-war-") ||
    normalized === "tow" ||
    normalized.includes("tug-of-war")
  );
}

/**
 * Extracts and validates athlete weight in kilograms from registration metadata.
 */
export function extractWeightFromMetadata(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object") return null;
  const meta = metadata as Record<string, unknown>;

  const rawWeight = meta.weightKg ?? meta.weight_kg ?? meta.weight;
  if (rawWeight === null || rawWeight === undefined || rawWeight === "") {
    return null;
  }

  const parsed = typeof rawWeight === "number" ? rawWeight : parseFloat(String(rawWeight));
  if (isNaN(parsed) || parsed <= 0) {
    return null;
  }

  return roundWeight(parsed);
}

/**
 * Normalizes a number to 2 decimal places to prevent IEEE 754 floating point drift.
 */
export function roundWeight(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates the total weight in kg of main/active Tug-of-War participants.
 * Excludes substitutes.
 */
export function calculateTugOfWarWeight(
  participants: (TugOfWarParticipantWeight | number)[],
): number {
  let total = 0;
  for (const item of participants) {
    if (typeof item === "number") {
      if (item > 0) total += item;
    } else {
      if (!item.isSubstitute && typeof item.weightKg === "number" && item.weightKg > 0) {
        total += item.weightKg;
      }
    }
  }
  return roundWeight(total);
}

/**
 * Validates a roster of Tug-of-War participants against the 600 kg limit.
 */
export function validateTugOfWarWeight(
  participants: TugOfWarParticipantWeight[],
  options?: {
    maxWeightKg?: number;
    requireFullTeam?: boolean;
  },
): TugOfWarWeightValidationResult {
  const maxWeightKg = options?.maxWeightKg ?? DEFAULT_TUG_OF_WAR_MAX_WEIGHT_KG;
  const requireFullTeam = options?.requireFullTeam ?? false;

  const mainParticipants: TugOfWarParticipantWeight[] = [];
  const substituteParticipants: TugOfWarParticipantWeight[] = [];
  const unweighedParticipantIds: string[] = [];

  for (const p of participants) {
    if (p.isSubstitute) {
      substituteParticipants.push(p);
    } else {
      mainParticipants.push(p);
      if (p.weightKg === null || p.weightKg === undefined || isNaN(p.weightKg) || p.weightKg <= 0) {
        unweighedParticipantIds.push(p.participantId);
      }
    }
  }

  const activeCount = mainParticipants.length;
  const substituteCount = substituteParticipants.length;
  const totalWeightKg = calculateTugOfWarWeight(mainParticipants);
  const remainingWeightKg = roundWeight(Math.max(0, maxWeightKg - totalWeightKg));
  const excessWeightKg = roundWeight(Math.max(0, totalWeightKg - maxWeightKg));
  const isFullTeam = activeCount === TUG_OF_WAR_MAIN_PARTICIPANTS;

  // 1. Check for unweighed main participants
  if (unweighedParticipantIds.length > 0) {
    return {
      valid: false,
      totalWeightKg,
      maxWeightKg,
      remainingWeightKg,
      excessWeightKg,
      activeCount,
      substituteCount,
      unweighedParticipantIds,
      isFullTeam,
      error: `Tug-of-War main team contains ${unweighedParticipantIds.length} participant(s) without valid weigh-in records. All active Tug-of-War athletes must be officially weighed.`,
    };
  }

  // 2. Check main team roster size limit
  if (activeCount > TUG_OF_WAR_MAIN_PARTICIPANTS) {
    return {
      valid: false,
      totalWeightKg,
      maxWeightKg,
      remainingWeightKg,
      excessWeightKg,
      activeCount,
      substituteCount,
      unweighedParticipantIds,
      isFullTeam,
      error: `Tug-of-War main team cannot exceed ${TUG_OF_WAR_MAIN_PARTICIPANTS} active participants (current: ${activeCount}).`,
    };
  }

  // 3. Check if full team is required
  if (requireFullTeam && activeCount < TUG_OF_WAR_MAIN_PARTICIPANTS) {
    return {
      valid: false,
      totalWeightKg,
      maxWeightKg,
      remainingWeightKg,
      excessWeightKg,
      activeCount,
      substituteCount,
      unweighedParticipantIds,
      isFullTeam: false,
      error: `Tug-of-War main team is incomplete (${activeCount}/${TUG_OF_WAR_MAIN_PARTICIPANTS} participants registered).`,
    };
  }

  // 4. Check weight limit
  if (totalWeightKg > maxWeightKg) {
    return {
      valid: false,
      totalWeightKg,
      maxWeightKg,
      remainingWeightKg: 0,
      excessWeightKg,
      activeCount,
      substituteCount,
      unweighedParticipantIds,
      isFullTeam,
      error: `Tug-of-War total team weight of ${totalWeightKg.toFixed(2)} kg exceeds the maximum permitted limit of ${maxWeightKg} kg by ${excessWeightKg.toFixed(2)} kg.`,
    };
  }

  return {
    valid: true,
    totalWeightKg,
    maxWeightKg,
    remainingWeightKg,
    excessWeightKg: 0,
    activeCount,
    substituteCount,
    unweighedParticipantIds: [],
    isFullTeam,
  };
}

/**
 * Evaluates prospective team weight for a Tug-of-War substitution.
 * Formula: prospectiveWeight = currentActiveWeight - outgoingWeight + incomingWeight
 */
export function validateTugOfWarSubstitutionWeight(
  params: ProspectiveWeightCheckParams,
): TugOfWarWeightValidationResult {
  const maxWeightKg = params.maxWeightKg ?? DEFAULT_TUG_OF_WAR_MAX_WEIGHT_KG;

  // Validate incoming weight
  if (
    params.incomingWeightKg === null ||
    params.incomingWeightKg === undefined ||
    isNaN(params.incomingWeightKg) ||
    params.incomingWeightKg <= 0
  ) {
    return {
      valid: false,
      totalWeightKg: 0,
      maxWeightKg,
      remainingWeightKg: 0,
      excessWeightKg: 0,
      activeCount: 0,
      substituteCount: 0,
      unweighedParticipantIds: ["incoming-replacement"],
      error: "Substitution rejected: Replacement athlete does not have a valid weigh-in record.",
    };
  }

  const incomingWeight = roundWeight(params.incomingWeightKg);
  const outgoingWeight = params.outgoingWeightKg ? roundWeight(params.outgoingWeightKg) : 0;

  // Calculate current active weight
  const currentActiveWeight = calculateTugOfWarWeight(params.currentMainWeights);

  // Prospective weight
  const prospectiveWeight = roundWeight(currentActiveWeight - outgoingWeight + incomingWeight);
  const remainingWeightKg = roundWeight(Math.max(0, maxWeightKg - prospectiveWeight));
  const excessWeightKg = roundWeight(Math.max(0, prospectiveWeight - maxWeightKg));

  if (prospectiveWeight > maxWeightKg) {
    return {
      valid: false,
      totalWeightKg: prospectiveWeight,
      maxWeightKg,
      remainingWeightKg: 0,
      excessWeightKg,
      activeCount: TUG_OF_WAR_MAIN_PARTICIPANTS,
      substituteCount: 0,
      unweighedParticipantIds: [],
      error: `Substitution rejected: Prospective Tug-of-War team weight of ${prospectiveWeight.toFixed(2)} kg exceeds the ${maxWeightKg} kg limit by ${excessWeightKg.toFixed(2)} kg.`,
    };
  }

  return {
    valid: true,
    totalWeightKg: prospectiveWeight,
    maxWeightKg,
    remainingWeightKg,
    excessWeightKg: 0,
    activeCount: TUG_OF_WAR_MAIN_PARTICIPANTS,
    substituteCount: 0,
    unweighedParticipantIds: [],
  };
}
