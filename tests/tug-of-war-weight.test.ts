import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isTugOfWarEvent,
  extractWeightFromMetadata,
  roundWeight,
  validateTugOfWarWeight,
  validateTugOfWarSubstitutionWeight,
  DEFAULT_TUG_OF_WAR_MAX_WEIGHT_KG,
  TUG_OF_WAR_MAIN_PARTICIPANTS,
  TUG_OF_WAR_SUBSTITUTES,
  TUG_OF_WAR_TOTAL_ROSTER,
  type TugOfWarParticipantWeight,
} from "../lib/competition/tugOfWarWeight.ts";
import {
  getEventQuota,
  calculateMaxRosterSlots,
  validateRosterQuota,
} from "../lib/competition/quotaEngine.ts";

describe("PEGASUS: Tug-of-War 600kg Weight Validation Engine", () => {
  // Test A — Exact boundary at 600.00 kg
  it("Test A: Exact boundary at 600.00 kg: 8 participants @ 75.00kg -> PASS", () => {
    const athletes: TugOfWarParticipantWeight[] = Array.from({ length: 8 }, (_, i) => ({
      participantId: `athlete-${i + 1}`,
      participantName: `Athlete ${i + 1}`,
      weightKg: 75.0,
      isSubstitute: false,
    }));

    const result = validateTugOfWarWeight(athletes);

    assert.equal(result.valid, true);
    assert.equal(result.totalWeightKg, 600.0);
    assert.equal(result.maxWeightKg, 600);
    assert.equal(result.remainingWeightKg, 0.0);
    assert.equal(result.excessWeightKg, 0.0);
    assert.equal(result.activeCount, 8);
    assert.equal(result.isFullTeam, true);
    assert.equal(result.error, undefined);
  });

  // Test B — Under limit at 599.90 kg
  it("Test B: Under limit at 599.90 kg: 7 @ 75.00kg + 1 @ 74.90kg -> PASS", () => {
    const athletes: TugOfWarParticipantWeight[] = [
      ...Array.from({ length: 7 }, (_, i) => ({
        participantId: `athlete-${i + 1}`,
        weightKg: 75.0,
        isSubstitute: false,
      })),
      {
        participantId: "athlete-8",
        weightKg: 74.9,
        isSubstitute: false,
      },
    ];

    const result = validateTugOfWarWeight(athletes);

    assert.equal(result.valid, true);
    assert.equal(result.totalWeightKg, 599.9);
    assert.equal(result.remainingWeightKg, 0.1);
    assert.equal(result.excessWeightKg, 0.0);
    assert.equal(result.activeCount, 8);
    assert.equal(result.error, undefined);
  });

  // Test C — Exceeded limit at 600.10 kg
  it("Test C: Exceeded limit at 600.10 kg: 7 @ 75.00kg + 1 @ 75.10kg -> REJECT with excess", () => {
    const athletes: TugOfWarParticipantWeight[] = [
      ...Array.from({ length: 7 }, (_, i) => ({
        participantId: `athlete-${i + 1}`,
        weightKg: 75.0,
        isSubstitute: false,
      })),
      {
        participantId: "athlete-8",
        weightKg: 75.1,
        isSubstitute: false,
      },
    ];

    const result = validateTugOfWarWeight(athletes);

    assert.equal(result.valid, false);
    assert.equal(result.totalWeightKg, 600.1);
    assert.equal(result.remainingWeightKg, 0.0);
    assert.equal(result.excessWeightKg, 0.1);
    assert.match(result.error!, /exceeds the maximum permitted limit of 600 kg by 0.10 kg/);
  });

  // Test D — Partial main team (7 participants, 550kg total)
  it("Test D: Partial main team (7 participants, 550kg total): prospective pass, flags incomplete if full team required", () => {
    const athletes: TugOfWarParticipantWeight[] = [
      { participantId: "p1", weightKg: 80.0, isSubstitute: false },
      { participantId: "p2", weightKg: 80.0, isSubstitute: false },
      { participantId: "p3", weightKg: 80.0, isSubstitute: false },
      { participantId: "p4", weightKg: 80.0, isSubstitute: false },
      { participantId: "p5", weightKg: 75.0, isSubstitute: false },
      { participantId: "p6", weightKg: 75.0, isSubstitute: false },
      { participantId: "p7", weightKg: 80.0, isSubstitute: false },
    ];

    // Progressive registration check (allow partial team)
    const progressive = validateTugOfWarWeight(athletes, { requireFullTeam: false });
    assert.equal(progressive.valid, true);
    assert.equal(progressive.totalWeightKg, 550.0);
    assert.equal(progressive.remainingWeightKg, 50.0);
    assert.equal(progressive.activeCount, 7);
    assert.equal(progressive.isFullTeam, false);

    // Call-room / match readiness check (require full team)
    const fullCheck = validateTugOfWarWeight(athletes, { requireFullTeam: true });
    assert.equal(fullCheck.valid, false);
    assert.match(fullCheck.error!, /Tug-of-War main team is incomplete/);
  });

  // Test E — Main team exceeding 8 participants
  it("Test E: Main team exceeding 8 participants (9 active) -> REJECT", () => {
    // 9 athletes weighing 50kg each = 450kg (under 600kg, but violates 8-person main roster rule)
    const athletes: TugOfWarParticipantWeight[] = Array.from({ length: 9 }, (_, i) => ({
      participantId: `athlete-${i + 1}`,
      weightKg: 50.0,
      isSubstitute: false,
    }));

    const result = validateTugOfWarWeight(athletes);

    assert.equal(result.valid, false);
    assert.equal(result.activeCount, 9);
    assert.match(result.error!, /cannot exceed 8 active participants/);
  });

  // Test F — Main team participant with missing weight
  it("Test F: Main team participant with missing weight (null/undefined/0/NaN) -> REJECT", () => {
    const athletesWithNull: TugOfWarParticipantWeight[] = [
      ...Array.from({ length: 7 }, (_, i) => ({
        participantId: `athlete-${i + 1}`,
        weightKg: 75.0,
        isSubstitute: false,
      })),
      {
        participantId: "unweighed-athlete",
        weightKg: null,
        isSubstitute: false,
      },
    ];

    const resultNull = validateTugOfWarWeight(athletesWithNull);
    assert.equal(resultNull.valid, false);
    assert.deepEqual(resultNull.unweighedParticipantIds, ["unweighed-athlete"]);
    assert.match(resultNull.error!, /without valid weigh-in records/);

    const athletesWithZero: TugOfWarParticipantWeight[] = [
      { participantId: "zero-athlete", weightKg: 0, isSubstitute: false },
    ];
    const resultZero = validateTugOfWarWeight(athletesWithZero);
    assert.equal(resultZero.valid, false);
    assert.deepEqual(resultZero.unweighedParticipantIds, ["zero-athlete"]);
  });

  // Test G — Substitutes excluded from the 600kg calculation
  it("Test G: Substitutes excluded from the 600kg calculation: 8 main (600kg) + 4 substitutes (340kg) = 940kg total -> PASS", () => {
    const athletes: TugOfWarParticipantWeight[] = [
      // 8 main participants = exactly 600.00kg
      ...Array.from({ length: 8 }, (_, i) => ({
        participantId: `main-${i + 1}`,
        weightKg: 75.0,
        isSubstitute: false,
      })),
      // 4 substitutes = 340.00kg
      ...Array.from({ length: 4 }, (_, i) => ({
        participantId: `sub-${i + 1}`,
        weightKg: 85.0,
        isSubstitute: true,
      })),
    ];

    const result = validateTugOfWarWeight(athletes);

    assert.equal(result.valid, true);
    assert.equal(result.activeCount, 8);
    assert.equal(result.substituteCount, 4);
    assert.equal(result.totalWeightKg, 600.0);
    assert.equal(result.remainingWeightKg, 0.0);
    assert.equal(result.excessWeightKg, 0.0);
    assert.equal(result.error, undefined);
  });

  // Test H — Prospective substitution exceeding limit
  it("Test H: Prospective substitution exceeding limit: current 595kg - outgoing 70kg + replacement 80kg = 605kg -> REJECT", () => {
    // Current active team: 7 athletes @ 75kg (525kg) + 1 athlete @ 70kg = 595kg
    const currentMainWeights = [75, 75, 75, 75, 75, 75, 75, 70];

    const result = validateTugOfWarSubstitutionWeight({
      currentMainWeights,
      outgoingWeightKg: 70,
      incomingWeightKg: 80,
    });

    assert.equal(result.valid, false);
    assert.equal(result.totalWeightKg, 605.0);
    assert.equal(result.excessWeightKg, 5.0);
    assert.match(result.error!, /Prospective Tug-of-War team weight of 605.00 kg exceeds the 600 kg limit by 5.00 kg/);
  });

  // Test I — Prospective substitution under limit
  it("Test I: Prospective substitution under limit: current 595kg - outgoing 75kg + replacement 74kg = 594kg -> PASS", () => {
    const currentMainWeights = [75, 75, 75, 75, 75, 75, 75, 70];

    const result = validateTugOfWarSubstitutionWeight({
      currentMainWeights,
      outgoingWeightKg: 75,
      incomingWeightKg: 74,
    });

    assert.equal(result.valid, true);
    assert.equal(result.totalWeightKg, 594.0);
    assert.equal(result.remainingWeightKg, 6.0);
    assert.equal(result.excessWeightKg, 0.0);
    assert.equal(result.error, undefined);
  });

  // Test J — Non-Tug-of-War events bypass weight check
  it("Test J: Non-Tug-of-War events bypass weight check", () => {
    assert.equal(isTugOfWarEvent("football"), false);
    assert.equal(isTugOfWarEvent("cricket"), false);
    assert.equal(isTugOfWarEvent("race-100m"), false);
    assert.equal(isTugOfWarEvent("volleyball"), false);
    assert.equal(isTugOfWarEvent(null), false);
    assert.equal(isTugOfWarEvent(undefined), false);

    assert.equal(isTugOfWarEvent("tug-of-war"), true);
    assert.equal(isTugOfWarEvent("tug-of-war-general"), true);
    assert.equal(isTugOfWarEvent("tow"), true);
  });

  // Test K — Quota system preserves 8 main + 4 substitutes = 12 total roster limit
  it("Test K: Quota system preserves 8 main + 4 substitutes = 12 total roster limit", () => {
    const quota = getEventQuota("tug-of-war");
    assert.ok(quota, "Tug-of-War quota rule must exist in CODEX_QUOTAS");
    assert.equal(quota.mainParticipants, TUG_OF_WAR_MAIN_PARTICIPANTS);
    assert.equal(quota.substitutes, TUG_OF_WAR_SUBSTITUTES);
    assert.equal(quota.maxTeamWeightKg, DEFAULT_TUG_OF_WAR_MAX_WEIGHT_KG);

    const maxSlots = calculateMaxRosterSlots(quota);
    assert.equal(maxSlots, TUG_OF_WAR_TOTAL_ROSTER); // 8 + 4 = 12

    // 12th athlete is allowed
    const under = validateRosterQuota({
      eventName: "Tug of War",
      eventId: "tug-of-war",
      currentRosterCount: 11,
      incomingCount: 1,
    });
    assert.equal(under.allowed, true);
    assert.equal(under.prospectiveCount, 12);

    // 13th athlete is rejected by quota engine
    const over = validateRosterQuota({
      eventName: "Tug of War",
      eventId: "tug-of-war",
      currentRosterCount: 12,
      incomingCount: 1,
    });
    assert.equal(over.allowed, false);
    assert.equal(over.prospectiveCount, 13);
    assert.match(over.error!, /Roster limit exceeded/);
  });

  // Helper metadata extraction & rounding tests
  it("Extracts and rounds weights from various metadata shapes accurately", () => {
    assert.equal(extractWeightFromMetadata({ weightKg: 75.543 }), 75.54);
    assert.equal(extractWeightFromMetadata({ weight_kg: "82.1" }), 82.1);
    assert.equal(extractWeightFromMetadata({ weight: 90 }), 90.0);
    assert.equal(extractWeightFromMetadata({ weightKg: -5 }), null);
    assert.equal(extractWeightFromMetadata({ weightKg: 0 }), null);
    assert.equal(extractWeightFromMetadata({}), null);
    assert.equal(extractWeightFromMetadata(null), null);
    assert.equal(roundWeight(599.999), 600.0);
    assert.equal(roundWeight(0.1 + 0.2), 0.3);
  });
});
