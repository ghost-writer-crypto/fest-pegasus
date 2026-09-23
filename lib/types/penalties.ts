/**
 * PEGASUS — Domain Types for Team Penalties & Deductions
 */

export type TeamPenalty = {
  id: string;
  festivalId: string;
  teamId: string;
  eventId?: string | null;
  pointsDelta: number; // Stored in database as points (e.g. -10)
  reason: string;
  issuedBy?: string | null;
  issuedAt: string;
  isReversed: boolean;
  reversalReason?: string | null;
  reversedBy?: string | null;
  reversedAt?: string | null;
};

export type CreatePenaltyInput = {
  festivalId: string;
  teamId: string;
  eventId?: string | null;
  ruleCode: "POST_EVENT_VIOLATION";
  reason: string;
};

export type ReversePenaltyInput = {
  festivalId: string;
  penaltyId: string;
  reversalReason: string;
};

export type PenaltyRule = {
  code: string;
  label: string;
  pointsDelta: number;
  description: string;
};

export const STANDARD_PENALTY_RULES: readonly PenaltyRule[] = [
  {
    code: "POST_EVENT_VIOLATION",
    label: "Post-event rule violation",
    pointsDelta: -10,
    description: "Official festival regulation deduction (-10 points)",
  },
] as const;

