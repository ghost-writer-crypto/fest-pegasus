import test from "node:test";
import assert from "node:assert/strict";
import {
  PRESET_OPERATORS,
  setSessionCookie,
  getSessionCookie,
  getSafeRedirectDestination,
  encodeSession,
  decodeSession,
  getSessionSigningSecret,
  type SessionData,
} from "../lib/auth/session.ts";

// Authorization helper functions matching server layout implementations
function checkAdminAccess(profile: SessionData | null): { allowed: boolean; redirectUrl?: string } {
  if (!profile || profile.role !== "admin" || !profile.isActive) {
    return { allowed: false, redirectUrl: "/login?redirect=/admin&error=unauthorized_admin" };
  }
  return { allowed: true };
}

function checkJudgeAccess(profile: SessionData | null): { allowed: boolean; redirectUrl?: string } {
  if (!profile || (profile.role !== "judge" && profile.role !== "admin") || !profile.isActive) {
    return { allowed: false, redirectUrl: "/login?redirect=/judge&error=unauthorized_judge" };
  }
  return { allowed: true };
}

function checkTeamManagerAccess(profile: SessionData | null): { allowed: boolean; redirectUrl?: string } {
  if (!profile || (profile.role !== "team_manager" && profile.role !== "admin") || !profile.isActive) {
    return { allowed: false, redirectUrl: "/login?redirect=/team-manager&error=unauthorized_tm" };
  }
  return { allowed: true };
}

test("PEGASUS: Production Lock & Access Control Security Matrix", async (t) => {
  const adminSession: SessionData = PRESET_OPERATORS.admin;
  const judgeSession: SessionData = PRESET_OPERATORS.judge;
  const tmGarudaSession: SessionData = PRESET_OPERATORS.team_manager_garuda;
  const tmToofanSession: SessionData = PRESET_OPERATORS.team_manager_toofan;
  const deskOpSession: SessionData = PRESET_OPERATORS.desk_operator;
  const inactiveAdmin: SessionData = { ...adminSession, isActive: false };
  const unauthenticated = null;

  const participantSession: SessionData = PRESET_OPERATORS.participant;

  await t.test("1. Unauthenticated -> /admin blocked", () => {
    const res = checkAdminAccess(unauthenticated);
    assert.equal(res.allowed, false);
    assert.equal(res.redirectUrl, "/login?redirect=/admin&error=unauthorized_admin");
  });

  await t.test("2. Unauthenticated -> /judge blocked", () => {
    const res = checkJudgeAccess(unauthenticated);
    assert.equal(res.allowed, false);
    assert.equal(res.redirectUrl, "/login?redirect=/judge&error=unauthorized_judge");
  });

  await t.test("3. Unauthenticated -> /team-manager blocked", () => {
    const res = checkTeamManagerAccess(unauthenticated);
    assert.equal(res.allowed, false);
    assert.equal(res.redirectUrl, "/login?redirect=/team-manager&error=unauthorized_tm");
  });

  await t.test("4. Authenticated Admin -> /admin allowed", () => {
    const res = checkAdminAccess(adminSession);
    assert.equal(res.allowed, true);
  });

  await t.test("5. Authenticated Judge -> /judge allowed", () => {
    const res = checkJudgeAccess(judgeSession);
    assert.equal(res.allowed, true);
  });

  await t.test("6. Authenticated Team Manager -> /team-manager allowed", () => {
    const res = checkTeamManagerAccess(PRESET_OPERATORS.team_manager);
    assert.equal(res.allowed, true);

    const resGaruda = checkTeamManagerAccess(tmGarudaSession);
    assert.equal(resGaruda.allowed, true);

    const resToofan = checkTeamManagerAccess(tmToofanSession);
    assert.equal(resToofan.allowed, true);
  });

  await t.test("7. Judge -> /admin rejected", () => {
    const res = checkAdminAccess(judgeSession);
    assert.equal(res.allowed, false);
    assert.equal(res.redirectUrl, "/login?redirect=/admin&error=unauthorized_admin");
  });

  await t.test("8. Team Manager -> /admin rejected", () => {
    const res = checkAdminAccess(PRESET_OPERATORS.team_manager);
    assert.equal(res.allowed, false);
    assert.equal(res.redirectUrl, "/login?redirect=/admin&error=unauthorized_admin");
  });

  await t.test("9. Team Manager -> /judge rejected", () => {
    const res = checkJudgeAccess(PRESET_OPERATORS.team_manager);
    assert.equal(res.allowed, false);
    assert.equal(res.redirectUrl, "/login?redirect=/judge&error=unauthorized_judge");
  });

  await t.test("10. Inactive Admin account rejected on all operational surfaces", () => {
    assert.equal(checkAdminAccess(inactiveAdmin).allowed, false);
    assert.equal(checkJudgeAccess(inactiveAdmin).allowed, false);
    assert.equal(checkTeamManagerAccess(inactiveAdmin).allowed, false);
  });

  await t.test("11. Desk Operator cannot access Admin dashboard", () => {
    const res = checkAdminAccess(deskOpSession);
    assert.equal(res.allowed, false);
  });

  await t.test("12. Production Security: Session cookie injection strictly blocked in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = "production";

      // Attempting to set session cookie in production must throw
      await assert.rejects(
        async () => {
          await setSessionCookie(adminSession);
        },
        /Security Violation/
      );

      // Attempting to read session cookie in production must unconditionally return null
      const cookieRes = await getSessionCookie();
      assert.equal(cookieRes, null);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });

  await t.test("13. Open-Redirect Prevention: Protocol-relative URLs and malicious destinations are neutralized", () => {
    // Malicious open-redirect targets must fallback to default path
    assert.equal(getSafeRedirectDestination("//attacker.com", "/admin"), "/admin");
    assert.equal(getSafeRedirectDestination("/\\attacker.com", "/judge"), "/judge");
    assert.equal(getSafeRedirectDestination("https://evil.com/phish", "/team-manager"), "/team-manager");
    assert.equal(getSafeRedirectDestination("javascript:alert(1)", "/admin"), "/admin");
    assert.equal(getSafeRedirectDestination("", "/admin"), "/admin");
    assert.equal(getSafeRedirectDestination(undefined, "/judge"), "/judge");
    assert.equal(getSafeRedirectDestination(null, "/team-manager"), "/team-manager");

    // Legitimate internal paths must be preserved
    assert.equal(getSafeRedirectDestination("/admin", "/"), "/admin");
    assert.equal(getSafeRedirectDestination("/admin/publish", "/admin"), "/admin/publish");
    assert.equal(getSafeRedirectDestination("/judge/events/evt-100", "/judge"), "/judge/events/evt-100");
    assert.equal(getSafeRedirectDestination("/team-manager", "/"), "/team-manager");
  });

  await t.test("14. Participant (Guest role) -> /admin, /judge, /team-manager rejected", () => {
    assert.equal(checkAdminAccess(participantSession).allowed, false);
    assert.equal(checkJudgeAccess(participantSession).allowed, false);
    assert.equal(checkTeamManagerAccess(participantSession).allowed, false);
  });

  await t.test("15. Cryptographic Security: Unsigned forged session cookie (raw base64url JSON) is strictly rejected", () => {
    // Attack vector: Client crafts base64url JSON with fabricated role=admin without HMAC signature
    const forgedRawJson = Buffer.from(
      JSON.stringify({ userId: "attacker-uuid-001", role: "admin", isActive: true }),
      "utf-8"
    ).toString("base64url");

    const decoded = decodeSession(forgedRawJson);
    assert.equal(decoded, null, "Unsigned session cookie must decode to null");
    assert.equal(checkAdminAccess(decoded).allowed, false, "Unsigned forged session must be denied admin access");
  });

  await t.test("16. Cryptographic Security: Tampered session signature is strictly rejected", () => {
    // Attack vector: Client provides valid-looking token but with an invalid/random signature
    const payload = Buffer.from(
      JSON.stringify({ userId: "demo-admin-uuid", role: "admin", isActive: true }),
      "utf-8"
    ).toString("base64url");
    const tamperedToken = `${payload}.invalid_forged_hmac_signature_xyz`;

    const decoded = decodeSession(tamperedToken);
    assert.equal(decoded, null, "Tampered signature must fail cryptographic verification");
    assert.equal(checkAdminAccess(decoded).allowed, false);
  });

  await t.test("17. Identity Verification: Fabricated user ID with role=admin is rejected against server whitelist", () => {
    // Attack vector: Even if an attacker knew the signing key, they cannot forge non-whitelisted operator IDs
    const fakeData: SessionData = {
      userId: "rogue-intruder-id-999",
      fullName: "Rogue Intruder",
      role: "admin",
      teamId: null,
      isActive: true,
      email: "rogue@attacker.com",
    };
    const signedRogueToken = encodeSession(fakeData);

    const decoded = decodeSession(signedRogueToken);
    assert.equal(decoded, null, "Non-whitelisted operator ID must be rejected");
    assert.equal(checkAdminAccess(decoded).allowed, false);
  });

  await t.test("18. Privilege Escalation Prevention: Modifying role in signed payload breaks HMAC seal", () => {
    // Attack vector: Legitimate judge takes their signed token and modifies role from 'judge' to 'admin'
    const judgeToken = encodeSession(judgeSession);
    const [judgePayload, judgeSig] = judgeToken.split(".");

    // Attacker modifies the payload to elevate privileges
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...judgeSession, role: "admin" }),
      "utf-8"
    ).toString("base64url");
    const privilegeEscalationToken = `${tamperedPayload}.${judgeSig}`;

    const decoded = decodeSession(privilegeEscalationToken);
    assert.equal(decoded, null, "Privilege escalation attempt must break cryptographic seal");
    assert.equal(checkAdminAccess(decoded).allowed, false);
  });

  await t.test("19. Legitimate Authentication: Authoritative signed admin session decodes and grants admin access", () => {
    const validAdminToken = encodeSession(adminSession);
    const decoded = decodeSession(validAdminToken);

    assert.notEqual(decoded, null, "Valid signed admin token must decode successfully");
    assert.equal(decoded?.role, "admin");
    assert.equal(decoded?.userId, adminSession.userId);
    assert.equal(checkAdminAccess(decoded).allowed, true);
  });

  await t.test("20. Legitimate Authentication: Authoritative signed judge session is strictly denied admin access", () => {
    const validJudgeToken = encodeSession(judgeSession);
    const decoded = decodeSession(validJudgeToken);

    assert.notEqual(decoded, null, "Valid signed judge token must decode successfully");
    assert.equal(decoded?.role, "judge");
    // Allowed on judge surface
    assert.equal(checkJudgeAccess(decoded).allowed, true);
    // Strictly rejected on admin surface
    assert.equal(checkAdminAccess(decoded).allowed, false);
    assert.equal(checkAdminAccess(decoded).redirectUrl, "/login?redirect=/admin&error=unauthorized_admin");
  });

  await t.test("21. Signing Secret Safety: In production, missing or insufficient SESSION_SECRET throws and fails closed without falling back to any default string", () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.SESSION_SECRET;
    try {
      (process.env as any).NODE_ENV = "production";
      delete (process.env as any).SESSION_SECRET;

      // Must throw configuration violation when secret is missing
      assert.throws(
        () => {
          getSessionSigningSecret();
        },
        /Security Configuration Violation/
      );

      // Must also throw if secret is too short / insufficient entropy (< 32 chars)
      (process.env as any).SESSION_SECRET = "too-short";
      assert.throws(
        () => {
          getSessionSigningSecret();
        },
        /Security Configuration Violation/
      );
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      if (originalSecret !== undefined) {
        (process.env as any).SESSION_SECRET = originalSecret;
      } else {
        delete (process.env as any).SESSION_SECRET;
      }
    }
  });

  await t.test("22. Token Expiry: Expired session token is strictly rejected by decodeSession", () => {
    // Generate a token with negative maxAge (expired 10 seconds ago)
    const expiredToken = encodeSession(adminSession, -10);
    const decoded = decodeSession(expiredToken);

    assert.equal(decoded, null, "Expired token must decode to null");
    assert.equal(checkAdminAccess(decoded).allowed, false, "Expired session must be denied admin access");
  });

  await t.test("23. Inactive Account Safety: Inactive preset account is strictly rejected even if signed", () => {
    const inactiveSignedToken = encodeSession(inactiveAdmin);
    const decoded = decodeSession(inactiveSignedToken);

    assert.equal(decoded, null, "Inactive account token must be rejected during verification");
    assert.equal(checkAdminAccess(decoded).allowed, false);
  });
});
