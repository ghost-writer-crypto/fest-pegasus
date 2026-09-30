import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveMatchOutcome,
  deriveTeamMatchResults,
} from "../lib/competition/teamMatchResolution.ts";
import {
  calculateTeamPoints,
  calculateTeamPointsBreakdown,
  calculateAllTeamPoints,
  getResultTeamId,
} from "../lib/competition/pointsAggregation.ts";
import { POINT_MATRIX } from "../lib/competition/scoring.ts";
import type { Result, TeamPenalty } from "../lib/types/index.ts";

describe("PEGASUS Critical Fix #2: Team-Match Result -> Championship Points Pipeline", () => {
  const housePhoenixId = "11111111-0000-4000-a000-000000000001";
  const housePegasusId = "22222222-0000-4000-a000-000000000002";
  const footballEventId = "football"; // Class Z (10 / 7 / 5)
  const tugOfWarEventId = "tug-of-war"; // Class Y (7 / 5 / 3)

  // Test A — Team match winner receives championship points
  it("Test A: Team match winner receives canonical 1st-place championship points", () => {
    const fixtureId = "fix-foot-final-01";

    // Team A (Phoenix) defeats Team B (Pegasus) 3 - 1 in Football (Class Z)
    const matchResults = deriveTeamMatchResults({
      fixtureId,
      festivalId: "fest-2026",
      eventId: footballEventId,
      homeTeamId: housePhoenixId,
      awayTeamId: housePegasusId,
      scoreHome: 3,
      scoreAway: 1,
      status: "published",
    });

    const winnerResult = matchResults.find(
      (r) => r.team_id === housePhoenixId,
    );
    assert(winnerResult, "Winner result must exist for Phoenix");
    assert.equal(winnerResult.rank, 1);
    assert.equal(winnerResult.points, POINT_MATRIX.Z.first); // 10 points
    assert.equal(winnerResult.status, "published");

    // Pass to championship aggregation
    const domainResults: Result[] = matchResults.map((r, idx) => ({
      id: `res-${idx}`,
      eventId: r.event_id,
      fixtureId: r.fixture_id ?? undefined,
      teamId: r.team_id ?? undefined,
      position: r.rank ?? undefined,
      points: Number(r.points),
      status: r.status,
    }));

    const phoenixPoints = calculateTeamPoints(
      domainResults,
      housePhoenixId,
    );
    assert.equal(phoenixPoints, 10);
  });

  // Test B — Losing team receives correct placement
  it("Test B: Losing team receives canonical 2nd-place championship points where matrix allows", () => {
    const fixtureId = "fix-tow-final-01";

    // Team A (Phoenix: 2) vs Team B (Pegasus: 0) in Tug-of-War (Class Y: 7 / 5 / 3)
    const matchResults = deriveTeamMatchResults({
      fixtureId,
      festivalId: "fest-2026",
      eventId: tugOfWarEventId,
      homeTeamId: housePhoenixId,
      awayTeamId: housePegasusId,
      scoreHome: 2,
      scoreAway: 0,
      status: "published",
    });

    const loserResult = matchResults.find(
      (r) => r.team_id === housePegasusId,
    );
    assert(loserResult, "Runner-up result must exist for Pegasus");
    assert.equal(loserResult.rank, 2);
    assert.equal(loserResult.points, POINT_MATRIX.Y.second); // 5 points for 2nd place in Class Y
    assert.equal(loserResult.status, "published");

    const domainResults: Result[] = matchResults.map((r, idx) => ({
      id: `res-${idx}`,
      eventId: r.event_id,
      fixtureId: r.fixture_id ?? undefined,
      teamId: r.team_id ?? undefined,
      position: r.rank ?? undefined,
      points: Number(r.points),
      status: r.status,
    }));

    const pegasusPoints = calculateTeamPoints(
      domainResults,
      housePegasusId,
    );
    assert.equal(pegasusPoints, 5);
  });

  // Test C — Correct house receives team points (no leakage)
  it("Test C: Correct house receives team points with zero cross-house leakage", () => {
    const fixtureId = "fix-foot-02";

    // Match between Phoenix and Pegasus in Football (Class Z: 10 / 7 / 5)
    // Pegasus wins 2 - 0
    const matchResults = deriveTeamMatchResults({
      fixtureId,
      festivalId: "fest-2026",
      eventId: footballEventId,
      homeTeamId: housePhoenixId,
      awayTeamId: housePegasusId,
      scoreHome: 0,
      scoreAway: 2,
      status: "published",
    });

    const domainResults: Result[] = matchResults.map((r, idx) => ({
      id: `res-${idx}`,
      eventId: r.event_id,
      fixtureId: r.fixture_id ?? undefined,
      teamId: r.team_id ?? undefined,
      position: r.rank ?? undefined,
      points: Number(r.points),
      status: r.status,
    }));

    const phoenixBreakdown = calculateTeamPointsBreakdown(
      domainResults,
      housePhoenixId,
    );
    const pegasusBreakdown = calculateTeamPointsBreakdown(
      domainResults,
      housePegasusId,
    );

    // Away team (Pegasus) won -> 10 points
    assert.equal(pegasusBreakdown.grossPoints, 10);
    assert.equal(pegasusBreakdown.netPoints, 10);

    // Home team (Phoenix) lost -> 7 points
    assert.equal(phoenixBreakdown.grossPoints, 7);
    assert.equal(phoenixBreakdown.netPoints, 7);

    // Assert all team scores match exact segregation
    const allScores = calculateAllTeamPoints(domainResults);
    const scoreMap = new Map(allScores.map((s) => [s.teamId, s.points]));

    assert.equal(scoreMap.get(housePegasusId), 10);
    assert.equal(scoreMap.get(housePhoenixId), 7);
  });

  // Test D — Published vs draft
  it("Test D: Draft match results contribute 0 points; published results contribute championship points", () => {
    const fixtureId = "fix-foot-draft";

    // Draft match result (match complete in field, but awaiting official review)
    const draftResults = deriveTeamMatchResults({
      fixtureId,
      festivalId: "fest-2026",
      eventId: footballEventId,
      homeTeamId: housePhoenixId,
      awayTeamId: housePegasusId,
      scoreHome: 3,
      scoreAway: 1,
      status: "draft",
    });

    const draftDomainResults: Result[] = draftResults.map((r, idx) => ({
      id: `res-draft-${idx}`,
      eventId: r.event_id,
      fixtureId: r.fixture_id ?? undefined,
      teamId: r.team_id ?? undefined,
      position: r.rank ?? undefined,
      points: Number(r.points),
      status: r.status,
    }));

    // Draft must contribute 0 championship points
    const draftPhoenixPoints = calculateTeamPoints(
      draftDomainResults,
      housePhoenixId,
    );
    const draftPegasusPoints = calculateTeamPoints(
      draftDomainResults,
      housePegasusId,
    );
    assert.equal(draftPhoenixPoints, 0);
    assert.equal(draftPegasusPoints, 0);

    // Once published, championship points must immediately become active
    const publishedDomainResults = draftDomainResults.map((r) => ({
      ...r,
      status: "published" as const,
    }));

    const publishedPhoenixPoints = calculateTeamPoints(
      publishedDomainResults,
      housePhoenixId,
    );
    const publishedPegasusPoints = calculateTeamPoints(
      publishedDomainResults,
      housePegasusId,
    );
    assert.equal(publishedPhoenixPoints, 10);
    assert.equal(publishedPegasusPoints, 7);
  });

  // Test E — Existing individual scoring remains unchanged
  it("Test E: Existing individual participant resolution remains completely unaffected", () => {
    const participantId = "participant-uuid-athlete-01";
    const participantLookup = new Map<string, string>([
      [participantId, housePhoenixId],
    ]);

    const results: Result[] = [
      // Individual result (Tier W 100m race: 1st place -> 5 pts)
      {
        id: "res-ind-1",
        eventId: "race-100m",
        participantId: participantId,
        teamId: undefined, // Resolved dynamically via participantLookup
        position: 1,
        points: 5,
        status: "published",
      },
      // Team result (Tier Z Football: 1st place -> 10 pts)
      {
        id: "res-team-1",
        eventId: "football",
        fixtureId: "fix-01",
        participantId: undefined,
        teamId: housePhoenixId, // Direct team association
        position: 1,
        points: 10,
        status: "published",
      },
    ];

    const breakdown = calculateTeamPointsBreakdown(
      results,
      housePhoenixId,
      [],
      participantLookup,
    );

    // Individual (5) + Team (10) = 15 total gross and net points
    assert.equal(breakdown.grossPoints, 15);
    assert.equal(breakdown.netPoints, 15);
  });

  // Test F — No double counting
  it("Test F: Exactly one championship contribution per finalized match entrant (no double counting)", () => {
    const fixtureId = "fix-foot-nodouble";

    const matchResults = deriveTeamMatchResults({
      fixtureId,
      festivalId: "fest-2026",
      eventId: footballEventId,
      homeTeamId: housePhoenixId,
      awayTeamId: housePegasusId,
      scoreHome: 2,
      scoreAway: 1,
      status: "published",
    });

    const domainResults: Result[] = matchResults.map((r, idx) => ({
      id: `res-${idx}`,
      eventId: r.event_id,
      fixtureId: r.fixture_id ?? undefined,
      teamId: r.team_id ?? undefined,
      position: r.rank ?? undefined,
      points: Number(r.points),
      status: r.status,
    }));

    // Invariant: exactly 2 result entries generated for a 2-team fixture
    assert.equal(domainResults.length, 2);

    const phoenixPoints = calculateTeamPoints(
      domainResults,
      housePhoenixId,
    );
    assert.equal(phoenixPoints, 10); // Winner points counted once, not twice
  });

  // Test G — Invalid/incomplete match produces no fabricated points
  it("Test G: Incomplete or tied match without resolution produces no fabricated ranks or points", () => {
    // 1. Unscored / Incomplete Match
    const incompleteOutcome = resolveMatchOutcome({
      homeTeamId: housePhoenixId,
      awayTeamId: housePegasusId,
      scoreHome: null,
      scoreAway: null,
    });
    assert.equal(incompleteOutcome.isComplete, false);
    assert.equal(incompleteOutcome.winnerTeamId, null);
    assert.equal(incompleteOutcome.winnerRank, null);

    const incompleteResults = deriveTeamMatchResults({
      fixtureId: "fix-incomplete",
      festivalId: "fest-2026",
      eventId: footballEventId,
      homeTeamId: housePhoenixId,
      awayTeamId: housePegasusId,
      scoreHome: null,
      scoreAway: null,
      status: "published",
    });

    for (const r of incompleteResults) {
      assert.equal(r.rank, null, "Rank must not be fabricated");
      assert.equal(r.points, 0, "Points must be 0 for incomplete match");
    }

    // 2. Tied Match without Shootout / Decider
    const tiedOutcome = resolveMatchOutcome({
      homeTeamId: housePhoenixId,
      awayTeamId: housePegasusId,
      scoreHome: 1,
      scoreAway: 1,
    });
    assert.equal(tiedOutcome.isComplete, false);
    assert.equal(tiedOutcome.isDraw, true);
    assert.equal(tiedOutcome.winnerTeamId, null);
    assert.equal(tiedOutcome.winnerRank, null);

    const tiedResults = deriveTeamMatchResults({
      fixtureId: "fix-tied",
      festivalId: "fest-2026",
      eventId: footballEventId,
      homeTeamId: housePhoenixId,
      awayTeamId: housePegasusId,
      scoreHome: 1,
      scoreAway: 1,
      status: "published",
    });

    const domainResults: Result[] = tiedResults.map((r, idx) => ({
      id: `res-tied-${idx}`,
      eventId: r.event_id,
      fixtureId: r.fixture_id ?? undefined,
      teamId: r.team_id ?? undefined,
      position: r.rank ?? undefined,
      points: Number(r.points),
      status: r.status,
    }));

    const phoenixPoints = calculateTeamPoints(
      domainResults,
      housePhoenixId,
    );
    const pegasusPoints = calculateTeamPoints(
      domainResults,
      housePegasusId,
    );

    assert.equal(phoenixPoints, 0, "No championship points fabricated for tied match");
    assert.equal(pegasusPoints, 0, "No championship points fabricated for tied match");
  });

  // Additional Invariant: 3rd-place match properly awards Rank 3 & Rank 4
  it("honors 3rd-place match round designation awarding Rank 3 points", () => {
    const fixtureId = "fix-foot-bronze";

    const matchResults = deriveTeamMatchResults({
      fixtureId,
      festivalId: "fest-2026",
      eventId: footballEventId,
      homeTeamId: housePhoenixId,
      awayTeamId: housePegasusId,
      scoreHome: 4,
      scoreAway: 2,
      round: "3rd Place Match",
      status: "published",
    });

    const winnerResult = matchResults.find(
      (r) => r.team_id === housePhoenixId,
    );
    const loserResult = matchResults.find(
      (r) => r.team_id === housePegasusId,
    );

    assert.equal(winnerResult?.rank, 3);
    assert.equal(winnerResult?.points, POINT_MATRIX.Z.third); // 5 points for 3rd place in Class Z

    assert.equal(loserResult?.rank, 4);
    assert.equal(loserResult?.points, 0); // Rank 4 receives 0 points
  });
});
