import type { EventQuotaRule } from "@/lib/types";

export type QuotaRule = EventQuotaRule & {
  eventId: string;
  mainParticipants: number;
};

export const CODEX_QUOTAS: QuotaRule[] = [
  // General / Institutional
  { eventId: "cricket", mainParticipants: 9, substitutes: 2 },
  { eventId: "volleyball", mainParticipants: 6, substitutes: 3 },
  {
    eventId: "tug-of-war",
    mainParticipants: 8,
    substitutes: 4,
    maxTeamWeightKg: 600,
    notes: "Total team weight must not exceed 600 kg.",
  },
  { eventId: "commentary", mainParticipants: 2 },
  { eventId: "penalty-shootout", mainParticipants: 4 },
  { eventId: "football", mainParticipants: 7, substitutes: 3 },
  { eventId: "throwball", mainParticipants: 7, substitutes: 3 },
  { eventId: "uriyadi-general", mainParticipants: 2 },
  { eventId: "chess-general", mainParticipants: 1 },

  // Majestir — Super Senior
  { divisionId: "majestir", eventId: "race-100m", mainParticipants: 2 },
  { divisionId: "majestir", eventId: "relay-4x100m", mainParticipants: 4, groups: 1 },
  { divisionId: "majestir", eventId: "long-jump", mainParticipants: 2 },
  { divisionId: "majestir", eventId: "high-jump", mainParticipants: 2 },
  { divisionId: "majestir", eventId: "arm-wrestling", mainParticipants: 2 },
  { divisionId: "majestir", eventId: "push-up", mainParticipants: 2 },
  { divisionId: "majestir", eventId: "pull-up", mainParticipants: 2 },
  { divisionId: "majestir", eventId: "shot-put", mainParticipants: 2 },
  { divisionId: "majestir", eventId: "javelin-throw", mainParticipants: 2 },
  { divisionId: "majestir", eventId: "discus-throw", mainParticipants: 2 },
  { divisionId: "majestir", eventId: "juggling", mainParticipants: 2 },
  { divisionId: "majestir", eventId: "badminton-singles", mainParticipants: 1 },
  { divisionId: "majestir", eventId: "archery", mainParticipants: 1 },
  { divisionId: "majestir", eventId: "basket-throw", mainParticipants: 2 },
  { divisionId: "majestir", eventId: "chess", mainParticipants: 1 },
  { divisionId: "majestir", eventId: "swimming", mainParticipants: 1 },
  { divisionId: "majestir", eventId: "shot-on-target", mainParticipants: 2 },

  // Aliya — Senior
  { divisionId: "aliya", eventId: "race-100m", mainParticipants: 3 },
  { divisionId: "aliya", eventId: "relay-4x200m", mainParticipants: 4, groups: 1 },
  { divisionId: "aliya", eventId: "long-jump", mainParticipants: 3 },
  { divisionId: "aliya", eventId: "high-jump", mainParticipants: 3 },
  { divisionId: "aliya", eventId: "arm-wrestling", mainParticipants: 2 },
  { divisionId: "aliya", eventId: "push-up", mainParticipants: 2 },
  { divisionId: "aliya", eventId: "pull-up", mainParticipants: 2 },
  { divisionId: "aliya", eventId: "shot-put", mainParticipants: 3 },
  { divisionId: "aliya", eventId: "javelin-throw", mainParticipants: 3 },
  { divisionId: "aliya", eventId: "discus-throw", mainParticipants: 3 },
  { divisionId: "aliya", eventId: "freestyle", mainParticipants: 1 },
  { divisionId: "aliya", eventId: "badminton-singles", mainParticipants: 1 },
  { divisionId: "aliya", eventId: "basket-throw", mainParticipants: 3 },
  { divisionId: "aliya", eventId: "dart-board", mainParticipants: 2 },
  { divisionId: "aliya", eventId: "chess", mainParticipants: 1 },
  { divisionId: "aliya", eventId: "swimming", mainParticipants: 1 },
  { divisionId: "aliya", eventId: "corner-kick-goal", mainParticipants: 3 },

  // Thamheediyya — Pre Senior
  { divisionId: "thamheediyya", eventId: "race-100m", mainParticipants: 4 },
  { divisionId: "thamheediyya", eventId: "relay-4x100m", mainParticipants: 4, groups: 2 },
  { divisionId: "thamheediyya", eventId: "long-jump", mainParticipants: 3 },
  { divisionId: "thamheediyya", eventId: "high-jump", mainParticipants: 3 },
  { divisionId: "thamheediyya", eventId: "arm-wrestling", mainParticipants: 2 },
  { divisionId: "thamheediyya", eventId: "push-up", mainParticipants: 4 },
  { divisionId: "thamheediyya", eventId: "pull-up", mainParticipants: 4 },
  { divisionId: "thamheediyya", eventId: "juggling", mainParticipants: 2 },
  { divisionId: "thamheediyya", eventId: "bowling", mainParticipants: 2 },
  { divisionId: "thamheediyya", eventId: "badminton-doubles", mainParticipants: 2 },
  { divisionId: "thamheediyya", eventId: "slow-cycle", mainParticipants: 1 },
  { divisionId: "thamheediyya", eventId: "crossbar-kick", mainParticipants: 3 },
  { divisionId: "thamheediyya", eventId: "uriyadi", mainParticipants: 3 },
  { divisionId: "thamheediyya", eventId: "dart-board", mainParticipants: 3 },
  { divisionId: "thamheediyya", eventId: "chess", mainParticipants: 1 },
  { divisionId: "thamheediyya", eventId: "swimming", mainParticipants: 1 },
  { divisionId: "thamheediyya", eventId: "discus-throw", mainParticipants: 3 },

  // Thaniya — Junior
  { divisionId: "thaniya", eventId: "race-100m", mainParticipants: 2 },
  { divisionId: "thaniya", eventId: "relay-4x100m", mainParticipants: 4 },
  { divisionId: "thaniya", eventId: "long-jump", mainParticipants: 3 },
  { divisionId: "thaniya", eventId: "high-jump", mainParticipants: 3 },
  { divisionId: "thaniya", eventId: "sack-race", mainParticipants: 2 },
  { divisionId: "thaniya", eventId: "slow-cycle", mainParticipants: 1 },
  { divisionId: "thaniya", eventId: "skipping", mainParticipants: 3 },
  { divisionId: "thaniya", eventId: "bowling", mainParticipants: 2 },
  { divisionId: "thaniya", eventId: "badminton-singles", mainParticipants: 1 },
  { divisionId: "thaniya", eventId: "water-filling-group", mainParticipants: 2 },
  { divisionId: "thaniya", eventId: "single-leg-hula-hoop", mainParticipants: 1 },
  { divisionId: "thaniya", eventId: "push-up", mainParticipants: 3 },
  { divisionId: "thaniya", eventId: "bottle-hit", mainParticipants: 2 },
  { divisionId: "thaniya", eventId: "dart-board", mainParticipants: 3 },
  { divisionId: "thaniya", eventId: "swimming", mainParticipants: 1 },

  // Bidaya — Sub Junior
  { divisionId: "bidaya", eventId: "race-100m", mainParticipants: 4 },
  { divisionId: "bidaya", eventId: "relay-4x50m", mainParticipants: 4, groups: 2 },
  { divisionId: "bidaya", eventId: "water-filling", mainParticipants: 3 },
  { divisionId: "bidaya", eventId: "hopscotch", mainParticipants: 3 },
  { divisionId: "bidaya", eventId: "balloon-pyramid", mainParticipants: 3 },
  { divisionId: "bidaya", eventId: "biscuit-eating", mainParticipants: 4 },
  { divisionId: "bidaya", eventId: "balloon-pop", mainParticipants: 3 },
  { divisionId: "bidaya", eventId: "candle-race", mainParticipants: 3 },
  { divisionId: "bidaya", eventId: "musical-chair", mainParticipants: 4 },
  { divisionId: "bidaya", eventId: "skipping", mainParticipants: 3 },
  { divisionId: "bidaya", eventId: "race-walking-100m", mainParticipants: 3 },
  { divisionId: "bidaya", eventId: "long-jump", mainParticipants: 3 },
  { divisionId: "bidaya", eventId: "three-legged-race", mainParticipants: 2 },
  { divisionId: "bidaya", eventId: "kho-kho", mainParticipants: 8 },
];

/**
 * Normalizes an event ID / code by stripping common division suffixes
 * (e.g., "race-100m-majestir" -> "race-100m" if division is "majestir")
 * to match canonical CODEX_QUOTAS.
 */
export function normalizeCodexEventId(
  eventId: string,
  divisionId?: string,
): string {
  if (!eventId) return "";
  let normalized = eventId.toLowerCase().trim();

  if (divisionId) {
    const divSuffix = `-${divisionId.toLowerCase().trim()}`;
    if (normalized.endsWith(divSuffix)) {
      normalized = normalized.slice(0, -divSuffix.length);
    }
  }

  // Also check if any known division suffix is present
  const knownDivisions = [
    "majestir",
    "aliya",
    "thamheediyya",
    "thaniya",
    "bidaya",
  ];
  for (const div of knownDivisions) {
    const suffix = `-${div}`;
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }

  return normalized;
}

/**
 * Retrieves the canonical QuotaRule for an event and optional division.
 */
export function getEventQuota(
  eventId: string,
  divisionId?: string,
): QuotaRule | null {
  const normEventId = normalizeCodexEventId(eventId, divisionId);
  const normDivId = divisionId?.toLowerCase().trim();

  // 1. Exact match with normalized eventId and divisionId
  if (normDivId) {
    const exact = CODEX_QUOTAS.find(
      (quota) =>
        (quota.eventId === eventId || quota.eventId === normEventId) &&
        quota.divisionId?.toLowerCase().trim() === normDivId,
    );
    if (exact) return exact;
  }

  // 2. Exact match on raw eventId
  const rawExact = CODEX_QUOTAS.find((quota) => quota.eventId === eventId);
  if (rawExact) return rawExact;

  // 3. General match on normalized eventId without division
  const general = CODEX_QUOTAS.find(
    (quota) => quota.eventId === normEventId && !quota.divisionId,
  );

  return general ?? null;
}

/**
 * Computes maximum roster slots permitted for a given QuotaRule.
 * - Team sports: (mainParticipants * (groups ?? 1)) + (substitutes ?? 0)
 * - Individual sports: mainParticipants
 * - Respects quotaPerTeam and maxTeamParticipants if explicitly specified.
 */
export function calculateMaxRosterSlots(quota: QuotaRule): number {
  if (quota.quotaPerTeam !== undefined) {
    return quota.quotaPerTeam;
  }
  if (quota.maxTeamParticipants !== undefined) {
    return quota.maxTeamParticipants;
  }
  const groups = quota.groups ?? 1;
  const substitutes = quota.substitutes ?? 0;
  return quota.mainParticipants * groups + substitutes;
}

/**
 * Retrieves effective quota rule and calculated max slots.
 */
export function getEffectiveEventQuota(
  eventId: string,
  divisionId?: string | null,
): { quotaRule: QuotaRule | null; maxSlots: number | null } {
  const quotaRule = getEventQuota(eventId, divisionId ?? undefined);
  if (!quotaRule) {
    return { quotaRule: null, maxSlots: null };
  }
  return {
    quotaRule,
    maxSlots: calculateMaxRosterSlots(quotaRule),
  };
}

export type ValidateRosterQuotaParams = {
  eventName: string;
  eventId: string;
  divisionId?: string | null;
  currentRosterCount: number;
  incomingCount?: number; // default: 1
  withdrawnCount?: number; // default: 0 (e.g. 1 in a substitution)
  customMaxQuota?: number | null; // optional override from public.event_quotas
};

export type QuotaValidationResult = {
  allowed: boolean;
  maxAllowed: number | null;
  currentCount: number;
  prospectiveCount: number;
  eventName: string;
  quotaRule: QuotaRule | null;
  error?: string;
};

/**
 * Pure domain validator evaluating prospective roster changes against canonical quotas.
 */
export function validateRosterQuota({
  eventName,
  eventId,
  divisionId,
  currentRosterCount,
  incomingCount = 1,
  withdrawnCount = 0,
  customMaxQuota,
}: ValidateRosterQuotaParams): QuotaValidationResult {
  const effective = getEffectiveEventQuota(eventId, divisionId);
  const maxAllowed = customMaxQuota ?? effective.maxSlots;

  const prospectiveCount =
    Math.max(0, currentRosterCount - withdrawnCount) + incomingCount;

  // If no quota is defined in Codex or database, allow without restriction
  if (maxAllowed === null) {
    return {
      allowed: true,
      maxAllowed: null,
      currentCount: currentRosterCount,
      prospectiveCount,
      eventName,
      quotaRule: effective.quotaRule,
    };
  }

  if (prospectiveCount > maxAllowed) {
    return {
      allowed: false,
      maxAllowed,
      currentCount: currentRosterCount,
      prospectiveCount,
      eventName,
      quotaRule: effective.quotaRule,
      error: `Roster limit exceeded: ${eventName} allows ${maxAllowed} registered roster slots. Current roster: ${currentRosterCount}. Requested roster: ${prospectiveCount}.`,
    };
  }

  return {
    allowed: true,
    maxAllowed,
    currentCount: currentRosterCount,
    prospectiveCount,
    eventName,
    quotaRule: effective.quotaRule,
  };
}
