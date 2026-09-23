import type { Result } from "@/lib/types";
import { validateResult } from "./resultValidation";

export type LifecycleTransitionResult = {
  success: boolean;
  result?: Result;
  error?: string;
};

/**
 * Creates a new draft result record.
 */
export function createDraftResult(params: {
  id: string;
  eventId: string;
  participantId?: string;
  teamId?: string;
  fixtureId?: string;
  position?: number;
  performance?: string;
  points: number;
}): LifecycleTransitionResult {
  const draft: Result = {
    ...params,
    status: "draft",
  };

  const validation = validateResult(draft);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join("; ")}`,
    };
  }

  return {
    success: true,
    result: draft,
  };
}

/**
 * Advances a result from DRAFT to SUBMITTED.
 * Enforces:
 * - Can only submit from 'draft'
 * - Requires submittedBy
 */
export function submitResult(
  current: Result,
  submittedBy: string,
): LifecycleTransitionResult {
  if (current.status !== "draft") {
    return {
      success: false,
      error: `Illegal lifecycle transition: Cannot submit from status '${current.status}'. Expected 'draft'.`,
    };
  }

  if (!submittedBy || submittedBy.trim() === "") {
    return {
      success: false,
      error: "Cannot submit result without a valid submittedBy identifier.",
    };
  }

  const updated: Result = {
    ...current,
    status: "submitted",
    submittedBy: submittedBy.trim(),
  };

  const validation = validateResult(updated);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join("; ")}`,
    };
  }

  return {
    success: true,
    result: updated,
  };
}

/**
 * Advances a result from SUBMITTED to VERIFIED.
 * Enforces:
 * - Can only verify from 'submitted'
 * - Requires verifiedBy
 * - submittedBy must already exist
 */
export function verifyResult(
  current: Result,
  verifiedBy: string,
): LifecycleTransitionResult {
  if (current.status !== "submitted") {
    return {
      success: false,
      error: `Illegal lifecycle transition: Cannot verify from status '${current.status}'. Expected 'submitted'.`,
    };
  }

  if (!verifiedBy || verifiedBy.trim() === "") {
    return {
      success: false,
      error: "Cannot verify result without a valid verifiedBy identifier.",
    };
  }

  const updated: Result = {
    ...current,
    status: "verified",
    verifiedBy: verifiedBy.trim(),
  };

  const validation = validateResult(updated);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join("; ")}`,
    };
  }

  return {
    success: true,
    result: updated,
  };
}

/**
 * Advances a result from VERIFIED to PUBLISHED.
 * Enforces:
 * - Can only publish from 'verified'
 * - Requires submittedBy, verifiedBy, and publishedAt
 * - Disallows jumping directly from 'draft' or 'submitted'
 */
export function publishResult(
  current: Result,
  publishedAt?: string,
): LifecycleTransitionResult {
  if (current.status !== "verified") {
    return {
      success: false,
      error: `Illegal lifecycle transition: Cannot publish from status '${current.status}'. Expected 'verified'.`,
    };
  }

  const timestamp = publishedAt || new Date().toISOString();

  const updated: Result = {
    ...current,
    status: "published",
    publishedAt: timestamp,
    updatedAt: timestamp,
  };

  const validation = validateResult(updated);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join("; ")}`,
    };
  }

  return {
    success: true,
    result: updated,
  };
}

/**
 * Unlocks a published or verified result for formal correction (e.g. following an appeal or clerical error).
 * Enforces:
 * - Current status must be 'published' or 'verified'
 * - Actor and reason are mandatory
 * - Status transitions to 'corrected'
 */
export function unlockResultForCorrection(
  current: Result,
  actor: string,
  reason: string,
): LifecycleTransitionResult {
  if (current.status !== "published" && current.status !== "verified") {
    return {
      success: false,
      error: `Illegal lifecycle transition: Cannot unlock for correction from status '${current.status}'. Expected 'published' or 'verified'.`,
    };
  }

  if (!actor || actor.trim() === "") {
    return {
      success: false,
      error: "Cannot unlock result without a valid actor identifier.",
    };
  }

  if (!reason || reason.trim() === "") {
    return {
      success: false,
      error: "Correction reason is mandatory to unlock a result.",
    };
  }

  const timestamp = new Date().toISOString();

  const updated: Result = {
    ...current,
    status: "corrected",
    updatedAt: timestamp,
  };

  return {
    success: true,
    result: updated,
  };
}

/**
 * Applies amended scores/positions/performance to a corrected result.
 * Enforces:
 * - Current status must be 'corrected'
 * - Preserves immutability
 */
export function correctResult(
  current: Result,
  updates: Partial<Result>,
  actor: string,
): LifecycleTransitionResult {
  if (current.status !== "corrected") {
    return {
      success: false,
      error: `Illegal operation: Cannot apply corrections to a result with status '${current.status}'. Must be unlocked into 'corrected' status first.`,
    };
  }

  if (!actor || actor.trim() === "") {
    return {
      success: false,
      error: "Cannot apply corrections without a valid actor identifier.",
    };
  }

  const timestamp = new Date().toISOString();

  const updated: Result = {
    ...current,
    ...updates,
    status: "corrected",
    submittedBy: actor.trim(),
    updatedAt: timestamp,
  };

  const validation = validateResult(updated);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join("; ")}`,
    };
  }

  return {
    success: true,
    result: updated,
  };
}

/**
 * Advances a corrected result back to VERIFIED.
 * Enforces:
 * - Current status must be 'corrected'
 * - Requires verifiedBy identifier
 */
export function reverifyResult(
  current: Result,
  verifiedBy: string,
): LifecycleTransitionResult {
  if (current.status !== "corrected") {
    return {
      success: false,
      error: `Illegal lifecycle transition: Cannot re-verify from status '${current.status}'. Expected 'corrected'.`,
    };
  }

  if (!verifiedBy || verifiedBy.trim() === "") {
    return {
      success: false,
      error: "Cannot re-verify result without a valid verifiedBy identifier.",
    };
  }

  const timestamp = new Date().toISOString();

  const updated: Result = {
    ...current,
    status: "verified",
    verifiedBy: verifiedBy.trim(),
    updatedAt: timestamp,
  };

  const validation = validateResult(updated);
  if (!validation.valid) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.join("; ")}`,
    };
  }

  return {
    success: true,
    result: updated,
  };
}

/**
 * Re-publishes an amended, reverified result to the public domain.
 */
export function republishResult(
  current: Result,
  publishedAt?: string,
): LifecycleTransitionResult {
  return publishResult(current, publishedAt);
}


