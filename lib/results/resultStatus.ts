import type { Result, ResultStatus, Performance } from "@/lib/types";

/**
 * Checks if a result is in 'draft' status.
 */
export function isDraftResult(result: Result): boolean {
  return result.status === "draft";
}

/**
 * Checks if a result is in 'submitted' status.
 */
export function isSubmittedResult(result: Result): boolean {
  return result.status === "submitted";
}

/**
 * Checks if a result is in 'verified' status.
 */
export function isVerifiedResult(result: Result): boolean {
  return result.status === "verified";
}

/**
 * Checks if a result is in 'published' status.
 */
export function isPublishedResult(result: Result): boolean {
  return result.status === "published";
}

/**
 * Checks if a result is in 'corrected' status.
 */
export function isCorrectedResult(result: Result): boolean {
  return result.status === "corrected";
}

export const RESULT_STATUS_LABELS: Record<ResultStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  verified: "Verified",
  published: "Published",
  corrected: "Corrected",
};

/**
 * Derives a human-readable display label from the canonical ResultStatus.
 */
export function getResultStatusLabel(status: ResultStatus): string {
  return RESULT_STATUS_LABELS[status] ?? "Unknown";
}

/**
 * Maps a ResultStatus to the corresponding Pegasus status badge CSS modifier.
 */
export function getResultStatusBadgeClass(status: ResultStatus): string {
  switch (status) {
    case "published":
      return "pegasus-status--published";
    case "verified":
      return "pegasus-status--live";
    case "submitted":
    case "corrected":
      return "pegasus-status--pending";
    case "draft":
    default:
      return "pegasus-status--upcoming";
  }
}

/**
 * Safely formats a Result's Performance (string or structured) for human-readable display.
 */
export function formatPerformance(performance?: Performance): string {
  if (!performance) return "";
  if (typeof performance === "string") return performance;
  if (performance.raw) return performance.raw;
  if (performance.timeMs !== undefined) return `${(performance.timeMs / 1000).toFixed(2)}s`;
  if (performance.distanceM !== undefined) return `${performance.distanceM}m`;
  if (performance.heightM !== undefined) return `${performance.heightM}m`;
  if (performance.score !== undefined) return `${performance.score}`;
  if (performance.reps !== undefined) return `${performance.reps} reps`;
  return "";
}
