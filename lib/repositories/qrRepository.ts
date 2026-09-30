import { randomBytes } from "crypto";
import { CODEX_DIVISIONS } from "../competition/divisions.ts";
import { participants as staticParticipants } from "../../data/participants.ts";
import { judges as staticJudges } from "../../data/judges.ts";
import { admins as staticAdmins } from "../../data/admins.ts";

export type QrStatus = "active" | "revoked";
export type QrEntityType = "participant" | "profile";

export type QrIdentityRow = {
  id: string;
  entity_type: QrEntityType;
  entity_id: string;
  qr_token: string;
  status: QrStatus;
  created_at: string;
  revoked_at: string | null;
  rotated_at: string | null;
};

export type QrResolutionResult =
  | {
      valid: true;
      token: string;
      entityType: "participant";
      role: "student";
      isPrivileged: false;
      student: {
        id: string;
        publicId: string;
        chestNumber: string | null;
        name: string;
        teamName: string | null;
        teamColor: string | null;
        divisionName: string | null;
        status: string;
        profileImageUrl: string | null;
      };
      verifiedAt: string;
      redirectUrl: string;
    }
  | {
      valid: true;
      token: string;
      entityType: "profile";
      role: "judge" | "admin" | "team_manager" | "desk_operator" | "guest";
      isPrivileged: boolean;
      profile: {
        id: string;
        fullName: string;
        role: string;
        roleTitle: string;
        identifier: string;
        isActive: boolean;
      };
      verifiedAt: string;
      redirectUrl: string;
    }
  | {
      valid: false;
      error: string;
    };

const QR_IDENTITY_COLUMNS =
  "id, entity_type, entity_id, qr_token, status, created_at, revoked_at, rotated_at" as const;

/**
 * Fallback in-memory store for local testing / transitional mode when Supabase is not configured.
 */
const inMemoryQrIdentities: Map<string, QrIdentityRow> = new Map();

/**
 * Securely generates a cryptographically random, non-guessable QR token.
 * Example: 'pgsqr_8f9a2b1c4e6d7f0a3b5c8e1d2f4a6b8c'
 */
export function generateSecureQrToken(): string {
  return `pgsqr_${randomBytes(16).toString("hex")}`;
}

async function getSupabaseServerClient() {
  const { createClient } = await import("../supabase/server");
  return createClient();
}

/**
 * Retrieves the active QR identity for an entity, or creates a new one if none exists.
 */
export async function getOrCreateQrIdentity(
  entityType: QrEntityType,
  entityId: string,
): Promise<QrIdentityRow> {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  if (hasSupabaseConfig) {
    try {
      const supabase = await getSupabaseServerClient();

      // 1. Query for an existing active QR identity
      const { data: existing, error: fetchError } = await supabase
        .from("qr_identities")
        .select(QR_IDENTITY_COLUMNS)
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (!fetchError && existing) {
        return existing as QrIdentityRow;
      }

      // 2. Generate a new cryptographically secure token
      const newToken = generateSecureQrToken();
      const newRow = {
        entity_type: entityType,
        entity_id: entityId,
        qr_token: newToken,
        status: "active" as QrStatus,
      };

      const { data: created, error: insertError } = await supabase
        .from("qr_identities")
        .insert(newRow)
        .select(QR_IDENTITY_COLUMNS)
        .single();

      if (!insertError && created) {
        return created as QrIdentityRow;
      }

      console.warn("[qrRepository.getOrCreateQrIdentity] Supabase insert fallback:", insertError?.message);
    } catch (err) {
      console.warn("[qrRepository.getOrCreateQrIdentity] Error in Supabase client, using fallback:", err);
    }
  }

  // Fallback in-memory resolution for development / testing
  for (const row of inMemoryQrIdentities.values()) {
    if (
      row.entity_type === entityType &&
      row.entity_id === entityId &&
      row.status === "active"
    ) {
      return row;
    }
  }

  const token = generateSecureQrToken();
  const row: QrIdentityRow = {
    id: `local_qr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    entity_type: entityType,
    entity_id: entityId,
    qr_token: token,
    status: "active",
    created_at: new Date().toISOString(),
    revoked_at: null,
    rotated_at: null,
  };
  inMemoryQrIdentities.set(token, row);
  return row;
}

/**
 * Revokes a QR identity by token.
 */
export async function revokeQrIdentity(qrToken: string): Promise<{ success: boolean; error?: string }> {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  const now = new Date().toISOString();

  if (hasSupabaseConfig) {
    try {
      const supabase = await getSupabaseServerClient();
      const { error } = await supabase
        .from("qr_identities")
        .update({ status: "revoked", revoked_at: now })
        .eq("qr_token", qrToken);

      if (error) {
        return { success: false, error: error.message };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Revocation failed" };
    }
  }

  const local = inMemoryQrIdentities.get(qrToken);
  if (local) {
    local.status = "revoked";
    local.revoked_at = now;
  }

  return { success: true };
}

/**
 * Rotates a QR identity for an entity: revokes the previous token(s) and issues a new active token.
 */
export async function rotateQrIdentity(
  entityType: QrEntityType,
  entityId: string,
): Promise<{ success: boolean; newIdentity?: QrIdentityRow; error?: string }> {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  const now = new Date().toISOString();

  if (hasSupabaseConfig) {
    try {
      const supabase = await getSupabaseServerClient();

      // 1. Revoke existing tokens
      await supabase
        .from("qr_identities")
        .update({ status: "revoked", revoked_at: now, rotated_at: now })
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .eq("status", "active");

      // 2. Insert new token
      const newToken = generateSecureQrToken();
      const { data: created, error } = await supabase
        .from("qr_identities")
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          qr_token: newToken,
          status: "active",
        })
        .select(QR_IDENTITY_COLUMNS)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, newIdentity: created as QrIdentityRow };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Rotation failed" };
    }
  }

  // Local fallback
  for (const row of inMemoryQrIdentities.values()) {
    if (
      row.entity_type === entityType &&
      row.entity_id === entityId &&
      row.status === "active"
    ) {
      row.status = "revoked";
      row.revoked_at = now;
      row.rotated_at = now;
    }
  }

  const token = generateSecureQrToken();
  const row: QrIdentityRow = {
    id: `local_qr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    entity_type: entityType,
    entity_id: entityId,
    qr_token: token,
    status: "active",
    created_at: now,
    revoked_at: null,
    rotated_at: null,
  };
  inMemoryQrIdentities.set(token, row);
  return { success: true, newIdentity: row };
}

/**
 * Server-side resolver for scanned QR tokens.
 * Performs rigorous identity resolution without granting privileged access.
 */
export async function resolveQrToken(qrToken: string): Promise<QrResolutionResult> {
  if (!qrToken || typeof qrToken !== "string" || qrToken.trim() === "") {
    return { valid: false, error: "Invalid or missing QR token." };
  }

  const cleanToken = qrToken.trim();
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  let qrRow: QrIdentityRow | null = null;

  if (hasSupabaseConfig) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data, error } = await supabase
        .from("qr_identities")
        .select(QR_IDENTITY_COLUMNS)
        .eq("qr_token", cleanToken)
        .maybeSingle();

      if (!error && data) {
        qrRow = data as QrIdentityRow;
      }
    } catch (err) {
      console.warn("[qrRepository.resolveQrToken] Supabase resolve error:", err);
    }
  }

  if (!qrRow) {
    qrRow = inMemoryQrIdentities.get(cleanToken) ?? null;
  }

  if (!qrRow) {
    return {
      valid: false,
      error: "QR token not found in the official PEGASUS identity registry.",
    };
  }

  if (qrRow.status !== "active") {
    return {
      valid: false,
      error: "This QR Code has been revoked or rotated and is no longer valid.",
    };
  }

  const verifiedAt = new Date().toISOString();

  // 1. Participant (Student) Resolution
  if (qrRow.entity_type === "participant") {
    let participant: any = null;
    if (hasSupabaseConfig) {
      try {
        const { getParticipantById, getParticipantByPublicId } = await import("./participantRepository.ts");
        participant = await getParticipantById(qrRow.entity_id).catch(() => null);
        if (!participant) {
          participant = await getParticipantByPublicId(qrRow.entity_id).catch(() => null);
        }
      } catch {}
    }
    if (!participant) {
      const staticMatch = staticParticipants.find(
        (p) => p.id === qrRow?.entity_id || p.publicId === qrRow?.entity_id,
      );
      if (staticMatch) {
        participant = {
          id: staticMatch.id,
          festival_id: "default-festival",
          team_id: staticMatch.teamId || null,
          division_id: staticMatch.divisionId || null,
          public_id: staticMatch.publicId,
          chest_number: staticMatch.chestNumber || null,
          name: staticMatch.name,
          profile_image_url: null,
          status: staticMatch.status as any,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    if (!participant) {
      return {
        valid: false,
        error: "Associated participant record not found.",
      };
    }

    let teamName: string | null = null;
    let teamColor: string | null = null;
    if (participant.team_id) {
      if (hasSupabaseConfig) {
        try {
          const { getTeamById } = await import("./teamRepository.ts");
          const team = await getTeamById(participant.team_id).catch(() => null);
          if (team) {
            teamName = team.name;
            teamColor = team.color;
          }
        } catch {}
      }
    }

    const division = CODEX_DIVISIONS.find(
      (d) =>
        d.id === participant?.division_id ||
        d.id === participant?.division_id?.toLowerCase() ||
        d.name.toLowerCase() === participant?.division_id?.toLowerCase(),
    );
    const divisionName = division?.name ?? participant.division_id ?? "Open Division";

    return {
      valid: true,
      token: cleanToken,
      entityType: "participant",
      role: "student",
      isPrivileged: false,
      student: {
        id: participant.id,
        publicId: participant.public_id,
        chestNumber: participant.chest_number,
        name: participant.name,
        teamName,
        teamColor,
        divisionName,
        status: participant.status,
        profileImageUrl: participant.profile_image_url,
      },
      verifiedAt,
      redirectUrl: `/participants/${participant.public_id}`,
    };
  }

  // 2. Profile (Judge, Admin, Team Manager, etc.) Resolution
  if (qrRow.entity_type === "profile") {
    let profile: any = null;
    if (hasSupabaseConfig) {
      try {
        const { getProfileById } = await import("./profileRepository.ts");
        profile = await getProfileById(qrRow.entity_id).catch(() => null);
      } catch {}
    }

    if (!profile) {
      // Check static fallback admins / judges
      const adminMatch = staticAdmins.find((a) => a.id === qrRow?.entity_id);
      if (adminMatch) {
        profile = {
          id: adminMatch.id,
          full_name: adminMatch.name,
          role: "admin",
          team_id: null,
          is_active: adminMatch.status === "Active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      } else {
        const judgeMatch = staticJudges.find((j) => j.id === qrRow?.entity_id);
        if (judgeMatch) {
          profile = {
            id: judgeMatch.id,
            full_name: judgeMatch.name,
            role: "judge",
            team_id: null,
            is_active: judgeMatch.status === "Active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }
    }

    if (!profile) {
      return {
        valid: false,
        error: "Associated user profile record not found.",
      };
    }

    let roleTitle = "Official Staff";
    let redirectUrl = "/";
    let isPrivileged = false;

    if (profile.role === "admin") {
      roleTitle = "Festival Administrator";
      redirectUrl = "/admin";
      isPrivileged = true;
    } else if (profile.role === "judge") {
      roleTitle = "Official Event Judge / Referee";
      redirectUrl = "/judge";
      isPrivileged = true;
    } else if (profile.role === "team_manager") {
      roleTitle = "Official Team Manager";
      redirectUrl = "/team-manager";
      isPrivileged = true;
    } else if (profile.role === "desk_operator") {
      roleTitle = "Jury / Desk Operator";
      redirectUrl = "/admin/verification";
      isPrivileged = true;
    }

    return {
      valid: true,
      token: cleanToken,
      entityType: "profile",
      role: profile.role,
      isPrivileged,
      profile: {
        id: profile.id,
        fullName: profile.full_name || "Official User",
        role: profile.role,
        roleTitle,
        identifier: profile.id.startsWith("a") || profile.id.startsWith("j") ? profile.id.toUpperCase() : `UID-${profile.id.slice(0, 8).toUpperCase()}`,
        isActive: profile.is_active,
      },
      verifiedAt,
      redirectUrl,
    };
  }

  return { valid: false, error: "Unsupported entity type for QR resolution." };
}
