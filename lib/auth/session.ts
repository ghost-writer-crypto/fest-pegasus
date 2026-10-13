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
    userId: "demo-admin-uuid",
    fullName: "ZENITHROW Demo Admin",
    role: "admin",
    teamId: null,
    isActive: true,
    email: "admin@zenithrow.internal",
  },
  judge: {
    userId: "demo-judge-uuid",
    fullName: "ZENITHROW Demo Judge",
    role: "judge",
    teamId: null,
    isActive: true,
    email: "judge@zenithrow.internal",
  },
  team_manager: {
    userId: "demo-tm-uuid",
    fullName: "ZENITHROW Demo Team Manager",
    role: "team_manager",
    teamId: "GAR",
    isActive: true,
    email: "teammanager@zenithrow.internal",
  },
  participant: {
    userId: "demo-athlete-uuid",
    fullName: "ZENITHROW Demo Athlete",
    role: "guest",
    teamId: "GAR",
    isActive: true,
    email: "athlete@zenithrow.internal",
  },
  team_manager_garuda: {
    userId: "tm001-garuda-uuid",
    fullName: "ZENITHROW Demo Team Manager (Garuda)",
    role: "team_manager",
    teamId: "GAR",
    isActive: true,
    email: "captain.garuda@zenithrow.internal",
  },
  team_manager_toofan: {
    userId: "tm002-toofan-uuid",
    fullName: "ZENITHROW Demo Team Manager (Toofan)",
    role: "team_manager",
    teamId: "TOF",
    isActive: true,
    email: "captain.toofan@zenithrow.internal",
  },
  desk_operator: {
    userId: "d001-desk-uuid",
    fullName: "Control Desk Operator",
    role: "desk_operator",
    teamId: null,
    isActive: true,
    email: "desk@zenithrow.internal",
  },
};

import crypto from "node:crypto";

let ephemeralDevSecret: string | null = null;
function getEphemeralDevSecret(): string {
  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString("hex");
  }
  return ephemeralDevSecret;
}

/**
 * Resolves the signing secret securely.
 * In production: strictly requires a non-empty SESSION_SECRET with adequate entropy (min 32 chars); fails closed.
 * In development: uses SESSION_SECRET, SUPABASE_SERVICE_ROLE_KEY, or an unguessable in-memory ephemeral random key.
 * Never uses hardcoded or predictable default secret strings.
 */
export function getSessionSigningSecret(): string {
  if (process.env.NODE_ENV === "production") {
    const prodSecret = process.env.SESSION_SECRET?.trim();
    if (!prodSecret || prodSecret.length < 32) {
      throw new Error(
        "Security Configuration Violation: SESSION_SECRET is missing, empty, or insufficient (min 32 characters required) in production. Operator session fallback disabled.",
      );
    }
    return prodSecret;
  }

  const configuredSecret = process.env.SESSION_SECRET?.trim();
  if (configuredSecret && configuredSecret.length >= 16) {
    return configuredSecret;
  }

  const serviceRoleSecret = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceRoleSecret && serviceRoleSecret.length >= 16) {
    return serviceRoleSecret;
  }

  return getEphemeralDevSecret();
}

function signPayload(payload: string): string {
  const secret = getSessionSigningSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

/**
 * Encodes session data securely with a cryptographic HMAC-SHA256 signature and expiration timestamp.
 * Format: `<payload_base64url>.<signature_base64url>`
 */
export function encodeSession(
  data: SessionData,
  maxAgeSeconds: number = 60 * 60 * 24 * 7,
): string {
  const now = Math.floor(Date.now() / 1000);
  const payloadData = {
    ...data,
    iat: now,
    exp: now + maxAgeSeconds,
  };
  const payload = Buffer.from(JSON.stringify(payloadData), "utf-8").toString("base64url");
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

/**
 * Decodes and cryptographically verifies session token.
 * Rejects unsigned, tampered, forged, expired, or unauthorized sessions.
 * Never trusts client-supplied roles or user IDs.
 */
export function decodeSession(str: string): SessionData | null {
  try {
    if (!str || typeof str !== "string") {
      return null;
    }
    const parts = str.split(".");
    if (parts.length !== 2) {
      // Unsigned or malformed token: strictly reject
      return null;
    }
    const [payload, signature] = parts;
    if (!payload || !signature) {
      return null;
    }

    // 1. Cryptographic HMAC verification using constant-time comparison
    const expectedSignature = signPayload(payload);
    const sigBuffer = Buffer.from(signature, "utf-8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf-8");
    if (sigBuffer.length !== expectedBuffer.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    // 2. Parse and validate structure
    const raw = Buffer.from(payload, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.userId !== "string" || typeof parsed.role !== "string") {
      return null;
    }

    // 3. Expiry verification
    if (typeof parsed.exp === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (now > parsed.exp) {
        return null; // Expired session token
      }
    }

    // 4. Server-side verification: identity MUST match an authoritative preset operator
    const matchedPreset = Object.values(PRESET_OPERATORS).find(
      (op) => op.userId === parsed.userId,
    );
    if (!matchedPreset) {
      return null;
    }

    // 5. Role and active status must strictly match server-side preset definition
    if (
      matchedPreset.role !== parsed.role ||
      !matchedPreset.isActive ||
      parsed.isActive === false
    ) {
      return null;
    }

    // 6. Return authoritative server preset values, never client-controlled overrides
    return {
      userId: matchedPreset.userId,
      fullName: matchedPreset.fullName,
      role: matchedPreset.role,
      teamId: matchedPreset.teamId,
      isActive: matchedPreset.isActive,
      email: matchedPreset.email,
    };
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

