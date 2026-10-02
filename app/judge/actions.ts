"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  saveJudgeScoreSheetDraft,
  submitJudgeScoreSheet,
} from "@/lib/judging";
import {
  getProfileById,
  isJudgeAssignedToEventInDb,
} from "@/lib/repositories";
import type { ScoreSheetEntry } from "@/lib/results";

export type SaveDraftActionParams = {
  festivalId: string;
  eventId: string;
  entries: ScoreSheetEntry[];
  stationLabel?: string;
  judgeName?: string;
};

export type SubmitSheetActionParams = {
  festivalId: string;
  eventId: string;
  entries: ScoreSheetEntry[];
  stationLabel?: string;
  judgeName?: string;
};

export type ActionResponse = {
  success: boolean;
  count?: number;
  error?: string;
  isTransitional?: boolean;
};

type VerifiedJudgeSession = {
  isAuthenticated: boolean;
  userId: string | null;
  judgeName: string;
  role: "judge" | "admin" | "transitional_guest";
  isTransitional: boolean;
};

/**
 * Resolves the authenticated judge identity strictly from server session and public.profiles.
 * Never trusts client-provided identity or query parameters.
 */
async function resolveServerVerifiedSession(
  clientStationLabel?: string,
): Promise<VerifiedJudgeSession> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Production Security Violation: Supabase credentials are missing. Production mutations fail closed.",
      );
    }
    // Unconfigured development environment (e.g. local build/dev without Supabase credentials)
    return {
      isAuthenticated: false,
      userId: null,
      judgeName: clientStationLabel?.trim() || "TRANSITIONAL NON-PRODUCTION DESK",
      role: "transitional_guest",
      isTransitional: true,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Non-production transitional mode: allow operational desk testing only in development
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Production Security Boundary Violation: An authenticated judge session is mandatory for result mutations in production.",
      );
    }

    return {
      isAuthenticated: false,
      userId: null,
      judgeName:
        clientStationLabel?.trim() ||
        "NON-PRODUCTION UNVERIFIED FIELD STATION",
      role: "transitional_guest",
      isTransitional: true,
    };
  }

  // Cryptographically verified user: resolve profile and role from database
  const profile = await getProfileById(user.id);
  if (!profile || !profile.is_active) {
    throw new Error(
      "Authorization Security Violation: Official user profile is inactive or not found.",
    );
  }

  if (profile.role !== "judge" && profile.role !== "admin") {
    throw new Error(
      `Security Boundary Violation: User role '${profile.role}' is not authorized to officiate or record scores.`,
    );
  }

  return {
    isAuthenticated: true,
    userId: user.id,
    judgeName: profile.full_name || user.email || "Official Referee",
    role: profile.role,
    isTransitional: false,
  };
}

/**
 * Server-side authorization check: verifies that the judge is assigned to the event.
 */
async function verifyServerJudgeAssignment(
  festivalId: string,
  session: VerifiedJudgeSession,
  eventId: string,
): Promise<void> {
  if (session.isTransitional) {
    console.warn(
      `[TRANSITIONAL AUDIT] Result mutation executed without cryptographic session for event ${eventId}. Status: NON-PRODUCTION.`,
    );
    return;
  }

  // Admins have festival-wide operational oversight
  if (session.role === "admin") {
    return;
  }

  // Verify database assignment in public.judge_assignments
  const isAssigned = await isJudgeAssignedToEventInDb(
    festivalId,
    session.userId!,
    eventId,
  );

  if (!isAssigned) {
    throw new Error(
      `Security Boundary Violation: Authenticated judge '${session.userId}' is not officially assigned to event '${eventId}'.`,
    );
  }
}

/**
 * Server Action: Saves draft entries for a field score sheet without advancing lifecycle status.
 * Enforces server-side authentication, role verification, and assignment boundaries.
 */
export async function saveDraftScoreSheetAction(
  params: SaveDraftActionParams,
): Promise<ActionResponse> {
  try {
    const { festivalId, eventId, entries, stationLabel } = params;

    if (!festivalId || !eventId) {
      return {
        success: false,
        error: "Missing required festival or event identifier.",
      };
    }

    if (!entries || entries.length === 0) {
      return {
        success: false,
        error: "Score sheet contains no entries to save.",
      };
    }

    // 1. Resolve server-side cryptographic identity and profile
    const session = await resolveServerVerifiedSession(stationLabel);

    // 2. Enforce assignment boundary
    await verifyServerJudgeAssignment(festivalId, session, eventId);

    // 3. Persist draft via domain service
    const result = await saveJudgeScoreSheetDraft({
      festivalId,
      eventId,
      judgeId: session.userId ?? "",
      judgeName: session.isTransitional
        ? `[TRANSITIONAL] ${session.judgeName}`
        : session.judgeName,
      entries,
    });

    if (result.success) {
      revalidatePath(`/judge/events/${eventId}`);
      revalidatePath("/judge");
    }

    return {
      ...result,
      isTransitional: session.isTransitional,
    };
  } catch (err) {
    console.error("[saveDraftScoreSheetAction] Security/operational error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}

/**
 * Server Action: Submits official score sheet to Chief Scorer verification queue.
 * Advances lifecycle status strictly from 'draft' to 'submitted'.
 * Enforces server-side authentication, role verification, assignment boundaries,
 * provenance attribution, and authoritative Codex points calculation.
 */
export async function submitScoreSheetAction(
  params: SubmitSheetActionParams,
): Promise<ActionResponse> {
  try {
    const { festivalId, eventId, entries, stationLabel } = params;

    if (!festivalId || !eventId) {
      return {
        success: false,
        error: "Missing required festival or event identifier.",
      };
    }

    if (!entries || entries.length === 0) {
      return {
        success: false,
        error: "Score sheet contains no entries to submit.",
      };
    }

    // 1. Resolve server-side cryptographic identity and profile
    const session = await resolveServerVerifiedSession(stationLabel);

    // 2. Enforce assignment boundary
    await verifyServerJudgeAssignment(festivalId, session, eventId);

    // 3. Submit score sheet via domain service
    const result = await submitJudgeScoreSheet({
      festivalId,
      eventId,
      judgeId: session.userId ?? "",
      judgeName: session.isTransitional
        ? `[TRANSITIONAL] ${session.judgeName}`
        : session.judgeName,
      entries,
    });

    if (result.success) {
      revalidatePath(`/judge/events/${eventId}`);
      revalidatePath("/judge");
      revalidatePath("/admin/verification");
    }

    return {
      ...result,
      isTransitional: session.isTransitional,
    };
  } catch (err) {
    console.error("[submitScoreSheetAction] Security/operational error:", err);
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "An unexpected error occurred.",
    };
  }
}
