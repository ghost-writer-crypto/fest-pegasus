import test from "node:test";
import assert from "node:assert/strict";
import {
  PRESET_OPERATORS,
  setSessionCookie,
  getSessionCookie,
  getSafeRedirectDestination,
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
});
