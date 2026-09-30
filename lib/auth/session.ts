import { cookies } from "next/headers.js";
import type { IdentityRole } from "@/lib/types";

export interface SessionData {
  userId: string;
  fullName: string;
  role: IdentityRole;
  teamId?: string | null;
  isActive: boolean;
  email?: string | null;
}

export const SESSION_COOKIE_NAME = "pegasus_session";

export const PRESET_OPERATORS: Record<string, SessionData> = {
  admin: {
    userId: "a001-admin-uuid",
    fullName: "Festival Director",
    role: "admin",
    teamId: null,
    isActive: true,
    email: "admin@pegasus.internal",
  },
  judge: {
    userId: "j001-judge-uuid",
    fullName: "Chief Track Referee",
    role: "judge",
    teamId: null,
    isActive: true,
    email: "referee.track@pegasus.internal",
  },
  team_manager_garuda: {
    userId: "tm001-garuda-uuid",
    fullName: "Garuda House Captain",
    role: "team_manager",
    teamId: "GAR",
    isActive: true,
    email: "captain.garuda@pegasus.internal",
  },
  team_manager_toofan: {
    userId: "tm002-toofan-uuid",
    fullName: "Toofan House Captain",
    role: "team_manager",
    teamId: "TOF",
    isActive: true,
    email: "captain.toofan@pegasus.internal",
  },
  desk_operator: {
    userId: "d001-desk-uuid",
    fullName: "Control Desk Operator",
    role: "desk_operator",
    teamId: null,
    isActive: true,
    email: "desk@pegasus.internal",
  },
};

/**
 * Encodes session data safely into base64 JSON string for cookie storage.
 */
function encodeSession(data: SessionData): string {
  return Buffer.from(JSON.stringify(data), "utf-8").toString("base64url");
}

/**
 * Decodes session data from base64 JSON string.
 */
function decodeSession(str: string): SessionData | null {
  try {
    const raw = Buffer.from(str, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.userId === "string" && typeof parsed.role === "string") {
      return parsed as SessionData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sets the operator session cookie on the current request/response context.
 * Strictly forbidden in production environment to prevent unauthenticated session forgery.
 */
export async function setSessionCookie(data: SessionData): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Security Violation: Direct session cookie injection is disabled in production.");
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encodeSession(data), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days in dev
  });
}

/**
 * Retrieves and validates the current operator session cookie.
 * In production, always returns null (Supabase Auth is the exclusive source of truth).
 */
export async function getSessionCookie(): Promise<SessionData | null> {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie || !cookie.value) {
      return null;
    }
    return decodeSession(cookie.value);
  } catch {
    return null;
  }
}


/**
 * Clears the operator session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch {
    // ignore
  }
}

/**
 * Validates and sanitizes a post-login redirect destination.
 * Protects against open-redirect attacks via protocol-relative URLs (//) or external schemes.
 */
export function getSafeRedirectDestination(
  redirectTo: string | undefined | null,
  defaultPath: string,
): string {
  if (
    redirectTo &&
    typeof redirectTo === "string" &&
    redirectTo.startsWith("/") &&
    !redirectTo.startsWith("//") &&
    !redirectTo.startsWith("/\\")
  ) {
    return redirectTo;
  }
  return defaultPath;
}

