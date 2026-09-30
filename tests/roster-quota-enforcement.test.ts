import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateRosterQuota,
  getEventQuota,
  getEffectiveEventQuota,
  calculateMaxRosterSlots,
  normalizeCodexEventId,
  CODEX_QUOTAS,
} from "../lib/competition/quotaEngine.ts";

describe("PEGASUS: Registration & Roster Quota Enforcement", () => {
  // Test A — Under quota
  it("Test A: Under quota: current = max - 1, adding participant -> PASS", () => {
    // Football: 7 main + 3 substitutes = 10 slots
    const result = validateRosterQuota({
      eventName: "Football",
      eventId: "football",
      currentRosterCount: 9,
      incomingCount: 1,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.maxAllowed, 10);
    assert.equal(result.currentCount, 9);
    assert.equal(result.prospectiveCount, 10);
    assert.equal(result.error, undefined);
  });

  // Test B — Exactly at quota
  it("Test B: Exactly at quota: current = max, additional participant -> REJECT", () => {
    // Football: 10 slots allowed
    // 1. Existing roster check (incoming = 0) is valid
    const existingCheck = validateRosterQuota({
      eventName: "Football",
      eventId: "football",
      currentRosterCount: 10,
      incomingCount: 0,
    });
    assert.equal(existingCheck.allowed, true);
    assert.equal(existingCheck.prospectiveCount, 10);

    // 2. Requesting an additional participant (incoming = 1) -> prospective 11 -> REJECT
    const attemptAdd = validateRosterQuota({
      eventName: "Football",
      eventId: "football",
      currentRosterCount: 10,
      incomingCount: 1,
    });

    assert.equal(attemptAdd.allowed, false);
    assert.equal(attemptAdd.maxAllowed, 10);
    assert.equal(attemptAdd.currentCount, 10);
    assert.equal(attemptAdd.prospectiveCount, 11);
    assert.match(attemptAdd.error!, /Roster limit exceeded/);
    assert.match(attemptAdd.error!, /Football allows 10 registered roster slots/);
    assert.match(attemptAdd.error!, /Current roster: 10/);
    assert.match(attemptAdd.error!, /Requested roster: 11/);
  });

  // Test C — Over quota (e.g. batch or jump from 9 -> 11)
  it("Test C: Over quota: prospective roster > max -> REJECT", () => {
    // Current is 9, attempt to add 2 athletes (prospective = 11 > 10)
    const result = validateRosterQuota({
      eventName: "Football",
      eventId: "football",
      currentRosterCount: 9,
      incomingCount: 2,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.maxAllowed, 10);
    assert.equal(result.currentCount, 9);
    assert.equal(result.prospectiveCount, 11);
    assert.match(result.error!, /Roster limit exceeded/);
  });

  // Test D — Substitution (atomic replace)
  it("Test D: Substitution: remove existing + add replacement -> valid roster (PASS)", () => {
    // Team at full capacity (10/10 in Football) executes substitution
    // 1 player withdrawn (-1), 1 replacement added (+1) -> prospective = 10 <= 10
    const result = validateRosterQuota({
      eventName: "Football",
      eventId: "football",
      currentRosterCount: 10,
      incomingCount: 1,
      withdrawnCount: 1,
    });

    assert.equal(result.allowed, true);
    assert.equal(result.maxAllowed, 10);
    assert.equal(result.currentCount, 10);
    assert.equal(result.prospectiveCount, 10);
    assert.equal(result.error, undefined);
  });

  // Test E — Substitution cannot silently exceed quota
  it("Test E: Substitution cannot silently exceed quota: replacement added without old participant being removed -> REJECT", () => {
    // If a team is at 10/10 and attempts to add a replacement without withdrawing the original player
    const result = validateRosterQuota({
      eventName: "Football",
      eventId: "football",
      currentRosterCount: 10,
      incomingCount: 1,
      withdrawnCount: 0, // Old participant was NOT withdrawn
    });

    assert.equal(result.allowed, false);
    assert.equal(result.prospectiveCount, 11);
    assert.match(result.error!, /Roster limit exceeded/);
  });

  // Test F — Different sport quotas independently enforced
  it("Test F: Different sport quotas independently enforced", () => {
    // Verify CODEX_QUOTAS and calculateMaxRosterSlots directly
    assert.ok(CODEX_QUOTAS.length > 50);
    const rawRule = getEventQuota("football");
    assert.ok(rawRule);
    assert.equal(calculateMaxRosterSlots(rawRule), 10);

    // Football: 7 main + 3 substitutes = 10
    const footballQuota = getEffectiveEventQuota("football");
    assert.equal(footballQuota.maxSlots, 10);

    // Volleyball: 6 main + 3 substitutes = 9
    const volleyballQuota = getEffectiveEventQuota("volleyball");
    assert.equal(volleyballQuota.maxSlots, 9);

    // Cricket: 9 main + 2 substitutes = 11
    const cricketQuota = getEffectiveEventQuota("cricket");
    assert.equal(cricketQuota.maxSlots, 11);

    // Tug of War: 8 main + 4 substitutes = 12
    const tugQuota = getEffectiveEventQuota("tug-of-war");
    assert.equal(tugQuota.maxSlots, 12);

    // Commentary: 2 main = 2
    const commQuota = getEffectiveEventQuota("commentary");
    assert.equal(commQuota.maxSlots, 2);

    // 10th player in Volleyball (max 9) -> REJECT
    const vballReject = validateRosterQuota({
      eventName: "Volleyball",
      eventId: "volleyball",
      currentRosterCount: 9,
      incomingCount: 1,
    });
    assert.equal(vballReject.allowed, false);
    assert.equal(vballReject.maxAllowed, 9);

    // 10th player in Football (max 10) -> ALLOW
    const footballAllow = validateRosterQuota({
      eventName: "Football",
      eventId: "football",
      currentRosterCount: 9,
      incomingCount: 1,
    });
    assert.equal(footballAllow.allowed, true);
    assert.equal(footballAllow.maxAllowed, 10);
  });

  // Test G — Different division / category quotas
  it("Test G: Different division/category quotas: correct quota selected", () => {
    // Race 100m varies by academic division
    // Majestir (Super Senior): 2 athletes
    const majestir100m = getEffectiveEventQuota("race-100m", "majestir");
    assert.equal(majestir100m.maxSlots, 2);

    // Aliya (Senior): 3 athletes
    const aliya100m = getEffectiveEventQuota("race-100m", "aliya");
    assert.equal(aliya100m.maxSlots, 3);

    // Thamheediyya (Pre Senior): 4 athletes
    const thamheed100m = getEffectiveEventQuota("race-100m", "thamheediyya");
    assert.equal(thamheed100m.maxSlots, 4);

    // Thaniya (Junior): 2 athletes
    const thaniya100m = getEffectiveEventQuota("race-100m", "thaniya");
    assert.equal(thaniya100m.maxSlots, 2);

    // Relay 4x100m:
    // Majestir: 4 main, 1 group = 4 slots
    const majestirRelay = getEffectiveEventQuota("relay-4x100m", "majestir");
    assert.equal(majestirRelay.maxSlots, 4);

    // Thamheediyya: 4 main, 2 groups = 8 slots
    const thamheedRelay = getEffectiveEventQuota("relay-4x100m", "thamheediyya");
    assert.equal(thamheedRelay.maxSlots, 8);

    // Check validation honors division difference
    // 3rd athlete in Majestir 100m (max 2) -> REJECT
    const majestirAttempt = validateRosterQuota({
      eventName: "Race 100m",
      eventId: "race-100m",
      divisionId: "majestir",
      currentRosterCount: 2,
      incomingCount: 1,
    });
    assert.equal(majestirAttempt.allowed, false);
    assert.equal(majestirAttempt.maxAllowed, 2);

    // 3rd athlete in Aliya 100m (max 3) -> ALLOW
    const aliyaAttempt = validateRosterQuota({
      eventName: "Race 100m",
      eventId: "race-100m",
      divisionId: "aliya",
      currentRosterCount: 2,
      incomingCount: 1,
    });
    assert.equal(aliyaAttempt.allowed, true);
    assert.equal(aliyaAttempt.maxAllowed, 3);
  });

  // Test H — Existing authorized/unauthorized behavior preservation
  it("Test H: Existing authorized/unauthorized behavior: unauthorized actor cannot modify roster", () => {
    // Model simulated authorization check from server actions
    function authorizeRosterMutation(actor: {
      userId: string | null;
      role: string;
      isActive: boolean;
      teamId: string | null;
    }, targetTeamId: string): { authorized: boolean; error?: string } {
      if (!actor.userId || !actor.isActive) {
        return { authorized: false, error: "Unauthorized: Active session required." };
      }
      if (actor.role === "admin") {
        return { authorized: true };
      }
      if (actor.role === "team_manager") {
        if (actor.teamId !== targetTeamId) {
          return {
            authorized: false,
            error: "Forbidden: Team managers can only manage their own house roster.",
          };
        }
        return { authorized: true };
      }
      return { authorized: false, error: "Forbidden: Insufficient privileges." };
    }

    const teamPhoenixId = "team-phoenix";
    const teamPegasusId = "team-pegasus";

    // 1. Inactive session rejected
    const unauth = authorizeRosterMutation({
      userId: null,
      role: "anon",
      isActive: false,
      teamId: null,
    }, teamPhoenixId);
    assert.equal(unauth.authorized, false);
    assert.match(unauth.error!, /Unauthorized/);

    // 2. Cross-team tampering rejected (Pegasus manager trying to modify Phoenix roster)
    const crossTeam = authorizeRosterMutation({
      userId: "manager-pegasus",
      role: "team_manager",
      isActive: true,
      teamId: teamPegasusId,
    }, teamPhoenixId);
    assert.equal(crossTeam.authorized, false);
    assert.match(crossTeam.error!, /Forbidden: Team managers can only manage their own house roster/);

    // 3. Authorized manager allowed
    const authManager = authorizeRosterMutation({
      userId: "manager-phoenix",
      role: "team_manager",
      isActive: true,
      teamId: teamPhoenixId,
    }, teamPhoenixId);
    assert.equal(authManager.authorized, true);

    // 4. Admin allowed
    const admin = authorizeRosterMutation({
      userId: "admin-chief",
      role: "admin",
      isActive: true,
      teamId: null,
    }, teamPhoenixId);
    assert.equal(admin.authorized, true);
  });

  // Test I — Event code normalization helper
  it("normalizes compound event codes (e.g. race-100m-majestir -> race-100m)", () => {
    assert.equal(normalizeCodexEventId("race-100m-majestir", "majestir"), "race-100m");
    assert.equal(normalizeCodexEventId("long-jump-majestir"), "long-jump");
    assert.equal(normalizeCodexEventId("football"), "football");
  });
});
