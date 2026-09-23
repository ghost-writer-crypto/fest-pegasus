import type { Result } from "@/lib/types";

export type ResultValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Pure validation layer for competition results.
 * Detects invalid states without throwing exceptions.
 */
export function validateResult(
  result: Result,
  eventType?: "team" | "individual",
): ResultValidationResult {
  const errors: string[] = [];

  // Core identifiers
  if (!result.id || result.id.trim() === "") {
    errors.push("Missing result ID.");
  }
  if (!result.eventId || result.eventId.trim() === "") {
    errors.push("Missing event ID.");
  }

  // Position validation (optional, but if provided must be a positive integer)
  if (result.position !== undefined) {
    if (!Number.isInteger(result.position) || result.position < 1) {
      errors.push("Position must be a positive integer greater than or equal to 1.");
    }
  }

  // Points validation (points must be a non-negative number)
  if (result.points !== undefined) {
    if (
      typeof result.points !== "number" ||
      isNaN(result.points) ||
      result.points < 0
    ) {
      errors.push("Points must be a non-negative number.");
    }
  } else {
    errors.push("Points value is required.");
  }

  // Lifecycle provenance requirements
  if (
    result.status === "submitted" ||
    result.status === "verified" ||
    result.status === "published" ||
    result.status === "corrected"
  ) {
    if (!result.submittedBy || result.submittedBy.trim() === "") {
      errors.push("Submitted result requires a valid submittedBy identifier.");
    }
  }

  if (result.status === "verified" || result.status === "published") {
    if (!result.verifiedBy || result.verifiedBy.trim() === "") {
      errors.push("Verified result requires a valid verifiedBy identifier.");
    }
  }

  if (result.status === "published") {
    if (!result.publishedAt || result.publishedAt.trim() === "") {
      errors.push("Published result requires a valid publishedAt timestamp.");
    }
  }

  // Entity association checks
  if (eventType === "team") {
    if (!result.teamId && !result.fixtureId) {
      errors.push("Team event result requires teamId or fixtureId relation.");
    }
  } else if (eventType === "individual") {
    if (!result.participantId) {
      errors.push("Individual event result requires participantId relation.");
    }
  } else {
    // If eventType not specified, at least one relation must exist
    if (!result.participantId && !result.teamId && !result.fixtureId) {
      errors.push(
        "Result must be associated with a participantId, teamId, or fixtureId.",
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Shape of a competitor or fixture row on an operational score sheet.
 */
export type ScoreSheetEntry = {
  resultId?: string;
  participantId?: string;
  teamId?: string;
  fixtureId?: string;
  rank?: number | null;
  performanceRaw?: string;
  disposition: "normal" | "dns" | "dnf" | "dq";
  isTie?: boolean;
};

export type ScoreSheetValidationResult = {
  valid: boolean;
  errors: string[];
};

/**
 * Validates a batch score sheet submitted from the field.
 * Checks individual row invariants and cross-entry invariants (duplicate ranks without tie, etc.).
 */
export function validateScoreSheetEntries(
  entries: ScoreSheetEntry[],
  eventType: "individual" | "team" = "individual",
  isFinalSubmission = false,
): ScoreSheetValidationResult {
  const errors: string[] = [];

  if (!entries || entries.length === 0) {
    errors.push("Score sheet contains no competitor entries.");
    return { valid: false, errors };
  }

  const assignedRanks = new Map<number, number>();

  entries.forEach((entry, idx) => {
    const entryLabel = `Entry #${idx + 1}`;

    if (eventType === "individual" && !entry.participantId) {
      errors.push(`${entryLabel}: Missing participant identification.`);
    }
    if (eventType === "team" && !entry.teamId && !entry.fixtureId) {
      errors.push(`${entryLabel}: Missing team or fixture identification.`);
    }

    // Rank validation
    if (entry.rank !== undefined && entry.rank !== null) {
      if (!Number.isInteger(entry.rank) || entry.rank < 1) {
        errors.push(
          `${entryLabel}: Position must be a positive integer greater than or equal to 1.`,
        );
      } else if (entry.disposition === "normal") {
        const count = assignedRanks.get(entry.rank) ?? 0;
        assignedRanks.set(entry.rank, count + 1);
      }
    }

    // On final submission, validate that active competitors have recorded outcomes
    if (isFinalSubmission && entry.disposition === "normal") {
      const hasRank = entry.rank !== undefined && entry.rank !== null;
      const hasMark = Boolean(
        entry.performanceRaw && entry.performanceRaw.trim() !== "",
      );
      if (!hasRank && !hasMark) {
        errors.push(
          `${entryLabel}: Active competitor requires an entered position or performance mark.`,
        );
      }
    }
  });

  // Cross-entry rank conflicts (check for accidental duplicates when isTie is not set)
  assignedRanks.forEach((count, rank) => {
    if (count > 1) {
      const duplicateEntries = entries.filter(
        (e) => e.rank === rank && !e.isTie,
      );
      if (duplicateEntries.length > 1) {
        errors.push(
          `Conflicting position: Rank ${rank} is assigned to ${count} competitors without an official tie designation.`,
        );
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}


