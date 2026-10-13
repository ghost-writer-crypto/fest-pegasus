import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  unlockResultForCorrection,
  correctResult,
  reverifyResult,
  republishResult,
  verifyResult,
  publishResult,
} from "../lib/results/resultService.ts";
import {
  calculateTeamPointsBreakdown,
  calculateTeamPoints,
} from "../lib/competition/pointsAggregation.ts";
import { getPoints, POINT_MATRIX } from "../lib/competition/scoring.ts";
import type { Result } from "../lib/types/index.ts";

describe("Admin Result Lifecycle, Direct Entry & Audit Correction Control", () => {
  const festId = "test-festival-2026";
  const sprintEventId = "race-100m";
  const phoenixTeamId = "house-phoenix";
  const pegasusTeamId = "house-pegasus";

  it("1. Automatically computes championship points based on event tier and rank", () => {
    // Class W event: 5 / 3 / 1
    assert.equal(getPoints("W", 1), POINT_MATRIX.W.first);
    assert.equal(getPoints("W", 2), POINT_MATRIX.W.second);
    assert.equal(getPoints("W", 3), POINT_MATRIX.W.third);
    assert.equal(getPoints("W", 4), 0);

    // Class Z event (Team/High Stake): 10 / 7 / 5
    assert.equal(getPoints("Z", 1), POINT_MATRIX.Z.first);
    assert.equal(getPoints("Z", 2), POINT_MATRIX.Z.second);
    assert.equal(getPoints("Z", 3), POINT_MATRIX.Z.third);
    assert.equal(getPoints("Z", 99), 0);
  });

  it("2. Non-normal dispositions (DNS, DNF, DQ) yield 0 points", () => {
    const publishedResultNormal: Result = {
      id: "res-001",
      eventId: sprintEventId,
      teamId: phoenixTeamId,
      position: 1,
      points: 10,
      status: "published",
      disposition: "normal",
      performance: { timeMs: 10500, raw: "10.50s" },
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const initialBreakdown = calculateTeamPointsBreakdown([publishedResultNormal], phoenixTeamId);
    assert.equal(initialBreakdown.netPoints, 10, "Normal result awards full points");

    // If runner is DQ'd, points are revoked
    const disqualifiedResult: Result = {
      ...publishedResultNormal,
      disposition: "dq",
      points: 0,
    };

    const dqBreakdown = calculateTeamPointsBreakdown([disqualifiedResult], phoenixTeamId);
    assert.equal(dqBreakdown.netPoints, 0, "Disqualified runner awards 0 points to house");
  });

  it("3. Result correction lifecycle: Published -> Unlocked -> Corrected -> Re-verified -> Re-published", () => {
    const publishedResult: Result = {
      id: "res-sprint-001",
      eventId: sprintEventId,
      teamId: phoenixTeamId,
      position: 1,
      points: 10,
      status: "published",
      disposition: "normal",
      performance: { timeMs: 10500, raw: "10.50s" },
      isOfficial: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedBy: "Judge Desk",
      verifiedBy: "Chief Scorer",
      publishedAt: new Date().toISOString(),
    };

    // 1. Admin unlocks for correction with mandatory reason
    const unlockRes = unlockResultForCorrection(
      publishedResult,
      "Admin Chief Scorer",
      "Official photo-finish timing audit following protest review #12",
    );
    assert.equal(unlockRes.success, true, "Unlock transition must succeed");
    assert.equal(unlockRes.result?.status, "corrected", "Status transitions to corrected");

    // 2. Admin applies correction
    const correctRes = correctResult(
      unlockRes.result!,
      {
        position: 2,
        points: 7,
        performance: { timeMs: 10580, raw: "10.58s" },
      },
      "Admin Chief Scorer",
    );
    assert.equal(correctRes.success, true, "Correction must succeed");
    assert.equal(correctRes.result?.position, 2, "Position amended to 2");
    assert.equal(correctRes.result?.points, 7, "Points amended to 7");

    // 3. Re-verification
    const reverifyRes = reverifyResult(correctRes.result!, "Admin Chief Scorer");
    assert.equal(reverifyRes.success, true, "Re-verification must succeed");
    assert.equal(reverifyRes.result?.status, "verified");

    // 4. Re-publication
    const republishRes = republishResult(reverifyRes.result!);
    assert.equal(republishRes.success, true, "Re-publication must succeed");
    assert.equal(republishRes.result?.status, "published");
    assert.equal(republishRes.result?.points, 7);
  });

  it("4. Result correction updates leaderboard total dynamically without historical leakage", () => {
    const initialResults: Result[] = [
      {
        id: "res-phoenix-100m",
        eventId: sprintEventId,
        teamId: phoenixTeamId,
        position: 1,
        points: 10,
        status: "published",
        disposition: "normal",
        performance: { timeMs: 10500, raw: "10.50s" },
        isOfficial: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "res-pegasus-100m",
        eventId: sprintEventId,
        teamId: pegasusTeamId,
        position: 2,
        points: 7,
        status: "published",
        disposition: "normal",
        performance: { timeMs: 10620, raw: "10.62s" },
        isOfficial: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    assert.equal(calculateTeamPoints(initialResults, phoenixTeamId), 10);
    assert.equal(calculateTeamPoints(initialResults, pegasusTeamId), 7);

    // After Chief Scorer photo-finish audit, Pegasus actually won Rank 1 and Phoenix was Rank 2
    const correctedResults: Result[] = [
      {
        ...initialResults[0],
        position: 2,
        points: 7,
        performance: { timeMs: 10580, raw: "10.58s" },
      },
      {
        ...initialResults[1],
        position: 1,
        points: 10,
        performance: { timeMs: 10520, raw: "10.52s" },
      },
    ];

    assert.equal(calculateTeamPoints(correctedResults, phoenixTeamId), 7, "Phoenix amended to 7 points");
    assert.equal(calculateTeamPoints(correctedResults, pegasusTeamId), 10, "Pegasus promoted to 10 points");
  });

  it("5. Draft and un-republished corrected results do not count toward leaderboard until published", () => {
    const unverifiedCorrectedResult: Result = {
      id: "res-test-unverified",
      eventId: sprintEventId,
      teamId: phoenixTeamId,
      position: 1,
      points: 10,
      status: "corrected", // Unlocked and corrected, awaiting re-verification and re-publication
      disposition: "normal",
      performance: { raw: "10.40s" },
      isOfficial: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const points = calculateTeamPoints([unverifiedCorrectedResult], phoenixTeamId);
    assert.equal(points, 0, "Unpublished corrected results must not leak points to the public leaderboard");
  });
});
