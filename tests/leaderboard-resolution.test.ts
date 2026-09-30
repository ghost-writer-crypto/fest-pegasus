import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateTeamPoints,
  calculateTeamPointsBreakdown,
  calculateAllTeamPoints,
  getResultTeamId,
  ParticipantResolutionError,
} from "../lib/competition/pointsAggregation.ts";
import type { Result, TeamPenalty } from "../lib/types/index.ts";

describe("Dynamic Leaderboard Participant -> Team Resolution", () => {
  // Test A: Real Supabase UUID Participant -> Canonical Team Points
  it("Test A: resolves real Supabase UUID participant to canonical team points", () => {
    const participantId = "a1b2c3d4-e5f6-47a8-b9c0-112233445566";
    const teamId = "house-phoenix";

    const participantLookup = new Map<string, string>([
      [participantId, teamId],
    ]);

    const results: Result[] = [
      {
        id: "res-001",
        eventId: "event-100m",
        participantId: participantId,
        teamId: undefined, // Judge sheet omitted teamId; must be resolved dynamically
        position: 1,
        points: 5, // Tier W 1st place
        status: "published",
        createdAt: new Date().toISOString(),
      },
      {
        id: "res-002",
        eventId: "event-200m",
        participantId: participantId,
        teamId: undefined,
        position: 2,
        points: 3, // Tier W 2nd place
        status: "draft", // Draft must not be counted in published championship points
        createdAt: new Date().toISOString(),
      },
    ];

    const breakdown = calculateTeamPointsBreakdown(
      results,
      teamId,
      [],
      participantLookup,
    );

    assert.equal(breakdown.teamId, teamId);
    assert.equal(breakdown.grossPoints, 5);
    assert.equal(breakdown.penaltyDeductions, 0);
    assert.equal(breakdown.netPoints, 5);

    const singlePoints = calculateTeamPoints(
      results,
      teamId,
      [],
      participantLookup,
    );
    assert.equal(singlePoints, 5);
  });

  // Test B: Multiple Real UUID Participants Across Multiple Houses
  it("Test B: aggregates multiple participants across multiple houses independently with penalties", () => {
    const participantPhoenix1 = "11111111-1111-4111-8111-111111111111";
    const participantPegasus1 = "22222222-2222-4222-8222-222222222222";
    const participantPegasus2 = "33333333-3333-4333-8333-333333333333";

    const participantLookup = new Map<string, string>([
      [participantPhoenix1, "house-phoenix"],
      [participantPegasus1, "house-pegasus"],
      [participantPegasus2, "house-pegasus"],
    ]);

    const results: Result[] = [
      {
        id: "res-p1",
        eventId: "tier-y-event",
        participantId: participantPhoenix1,
        teamId: undefined,
        position: 2,
        points: 5, // Tier Y 2nd place
        status: "published",
        createdAt: new Date().toISOString(),
      },
      {
        id: "res-peg1",
        eventId: "tier-y-event",
        participantId: participantPegasus1,
        teamId: undefined,
        position: 1,
        points: 7, // Tier Y 1st place
        status: "published",
        createdAt: new Date().toISOString(),
      },
      {
        id: "res-peg2",
        eventId: "tier-w-event",
        participantId: participantPegasus2,
        teamId: undefined,
        position: 1,
        points: 5, // Tier W 1st place
        status: "published",
        createdAt: new Date().toISOString(),
      },
    ];

    const penalties: TeamPenalty[] = [
      {
        id: "pen-1",
        festivalId: "fest-2026",
        teamId: "house-pegasus",
        pointsDelta: -2,
        reason: "Late check-in",
        issuedAt: new Date().toISOString(),
        isReversed: false,
      },
      {
        id: "pen-2",
        festivalId: "fest-2026",
        teamId: "house-phoenix",
        pointsDelta: -5,
        reason: "Overturned penalty",
        issuedAt: new Date().toISOString(),
        isReversed: true, // Reversed, should not deduct
      },
    ];

    const pegasusBreakdown = calculateTeamPointsBreakdown(
      results,
      "house-pegasus",
      penalties,
      participantLookup,
    );
    assert.equal(pegasusBreakdown.grossPoints, 12); // 7 + 5
    assert.equal(pegasusBreakdown.penaltyDeductions, -2);
    assert.equal(pegasusBreakdown.netPoints, 10);

    const phoenixBreakdown = calculateTeamPointsBreakdown(
      results,
      "house-phoenix",
      penalties,
      participantLookup,
    );
    assert.equal(phoenixBreakdown.grossPoints, 5);
    assert.equal(phoenixBreakdown.penaltyDeductions, 0);
    assert.equal(phoenixBreakdown.netPoints, 5);

    const allScores = calculateAllTeamPoints(
      results,
      penalties,
      participantLookup,
    );
    const scoreMap = new Map(allScores.map((s) => [s.teamId, s.points]));

    assert.equal(scoreMap.get("house-pegasus"), 10);
    assert.equal(scoreMap.get("house-phoenix"), 5);
  });

  // Test C: Mock Data Independence (UUID not present in static data/participants.ts)
  it("Test C: ensures resolution is completely independent of static mock data", () => {
    const novelSupabaseUuid = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
    const teamId = "house-draco";

    // Works with Record or resolver function as well as Map
    const resolverFn = (id: string) =>
      id === novelSupabaseUuid ? teamId : null;

    const result: Result = {
      id: "res-novel",
      eventId: "event-tier-z",
      participantId: novelSupabaseUuid,
      teamId: undefined,
      position: 1,
      points: 10, // Tier Z 1st place
      status: "published",
      createdAt: new Date().toISOString(),
    };

    const resolvedTeam = getResultTeamId(result, resolverFn);
    assert.equal(resolvedTeam, teamId);

    const breakdown = calculateTeamPointsBreakdown(
      [result],
      teamId,
      [],
      resolverFn,
    );
    assert.equal(breakdown.grossPoints, 10);
    assert.equal(breakdown.netPoints, 10);
  });

  // Test D: Missing Participant Fails Safely and Visibly (throws ParticipantResolutionError)
  it("Test D: fails safely with ParticipantResolutionError when participant cannot be resolved", () => {
    const missingParticipantId = "00000000-0000-0000-0000-000000000404";
    const emptyLookup = new Map<string, string>();

    const unmappedResult: Result = {
      id: "res-unmapped-01",
      eventId: "event-relay",
      participantId: missingParticipantId,
      teamId: undefined,
      position: 1,
      points: 10,
      status: "published",
      createdAt: new Date().toISOString(),
    };

    // Invariant 1: getResultTeamId must throw ParticipantResolutionError
    assert.throws(
      () => {
        getResultTeamId(unmappedResult, emptyLookup);
      },
      (err: unknown) => {
        assert(err instanceof ParticipantResolutionError);
        assert.equal(err.resultId, "res-unmapped-01");
        assert.equal(err.participantId, missingParticipantId);
        return true;
      },
    );

    // Invariant 2: calculateTeamPointsBreakdown must throw instead of silently awarding 0 points
    assert.throws(
      () => {
        calculateTeamPointsBreakdown(
          [unmappedResult],
          "house-phoenix",
          [],
          emptyLookup,
        );
      },
      (err: unknown) => {
        assert(err instanceof ParticipantResolutionError);
        assert.equal(err.resultId, "res-unmapped-01");
        return true;
      },
    );

    // Invariant 3: Result without lookup at all must also throw
    assert.throws(
      () => {
        getResultTeamId(unmappedResult, undefined);
      },
      (err: unknown) => {
        assert(err instanceof ParticipantResolutionError);
        return true;
      },
    );
  });

  // Additional Invariant: Explicit result.teamId is trusted directly without lookup
  it("preserves explicit result.teamId if already set", () => {
    const explicitResult: Result = {
      id: "res-explicit",
      eventId: "event-explicit",
      participantId: "some-uuid",
      teamId: "house-hydra",
      position: 1,
      points: 5,
      status: "published",
      createdAt: new Date().toISOString(),
    };

    // No lookup provided, but teamId exists on the result
    const resolvedTeam = getResultTeamId(explicitResult);
    assert.equal(resolvedTeam, "house-hydra");

    const breakdown = calculateTeamPointsBreakdown([explicitResult], "house-hydra");
    assert.equal(breakdown.grossPoints, 5);
    assert.equal(breakdown.netPoints, 5);
  });
});
