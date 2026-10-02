import { createClient } from "@/lib/supabase/server";
import type { IdentityRole } from "@/lib/types";

/**
 * Shape of a row in public.profiles matching migration 20260920000100.
 */
export type ProfileRow = {
  id: string;
  full_name: string | null;
  role: IdentityRole;
  team_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const PROFILE_COLUMNS =
  "id, full_name, role, team_id, is_active, created_at, updated_at" as const;

/**
 * Retrieves a user profile by primary key ID (linking to auth.users.id).
 *
 * @param userId - The UUID of the authenticated user
 * @returns The ProfileRow if found, or null
 */
export async function getProfileById(
  userId: string,
): Promise<ProfileRow | null> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return null;
  }

  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error(
        `[profileRepository.getProfileById] Failed to retrieve profile ${userId}:`,
        error,
      );
      return null;
    }

    return (data as ProfileRow) ?? null;
  } catch (error) {
    console.error(
      `[profileRepository.getProfileById] Unexpected error for user ${userId}:`,
      error,
    );
    return null;
  }
}

import { getSessionCookie } from "@/lib/auth/session";

/**
 * Server-side helper to resolve the currently authenticated session and its verified profile.
 * Source of truth for server-side authorization.
 *
 * @returns An object with authenticated user and verified profile, or null if unauthenticated
 */
export async function getAuthenticatedProfile(): Promise<{
  userId: string;
  fullName: string;
  role: IdentityRole;
  teamId?: string | null;
  isActive: boolean;
  email?: string | null;
} | null> {
  // 1. First, attempt to resolve via Supabase Auth
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!authError && user) {
        const profile = await getProfileById(user.id);
        if (profile && profile.is_active) {
          return {
            userId: user.id,
            fullName: profile.full_name || user.email || "Official User",
            role: profile.role,
            teamId: profile.team_id || null,
            isActive: profile.is_active,
            email: user.email ?? null,
          };
        }
      }
    } catch (error) {
      console.error("[profileRepository.getAuthenticatedProfile] Supabase Auth Error:", error);
    }
  }

  // 2. Fall back to verified operator session cookie (supports local dev / live Union presentation mode)
  try {
    const session = await getSessionCookie();
    if (session && session.isActive) {
      return {
        userId: session.userId,
        fullName: session.fullName,
        role: session.role,
        teamId: session.teamId || null,
        isActive: session.isActive,
        email: session.email ?? null,
      };
    }
  } catch (error) {
    console.error("[profileRepository.getAuthenticatedProfile] Session Cookie Error:", error);
  }

  return null;
}


