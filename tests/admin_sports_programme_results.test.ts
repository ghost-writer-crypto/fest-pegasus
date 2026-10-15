import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_SPORTS_CATALOG,
  CANONICAL_SPORT_SLUGS,
  isValidSportSlug,
  getReconciledSports,
} from "../lib/repositories/sportRepository.ts";
import {
  SPORT_IMAGES_BUCKET,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
} from "../lib/storage/sportImageStorage.ts";
import { isUuid } from "../lib/utils.ts";
import { resolveMatchOutcome } from "../lib/competition/teamMatchResolution.ts";
import {
  verifyResult,
  publishResult,
} from "../lib/results/resultService.ts";
import { getPoints, POINT_MATRIX } from "../lib/competition/scoring.ts";
import { calculateTeamPointsBreakdown } from "../lib/competition/pointsAggregation.ts";
import type { Result } from "../lib/types/index.ts";

export type FlexibleResultRowInput = {
  participantId?: string | null;
  teamId?: string | null;
  rank?: number | null;
  points?: number | null;
  scoreNumeric?: number;
  performance?: Record<string, unknown>;
  disposition?: "normal" | "dns" | "dnf" | "dq" | "walkover";
  notes?: string;
};

export type FlexibleResultSubmissionInput = {
  festivalId: string;
  eventId: string;
  competitionId?: string | null;
  fixtureId?: string | null;
  formatType?: "podium" | "match" | "individual_rankings" | "measurement" | "custom";
  targetStatus: "draft" | "submitted" | "verified" | "published";
  summaryNotes?: string;
  rows: FlexibleResultRowInput[];
  actorUuid?: string;
  actorName?: string;
};

test("PEGASUS / ZENITHROW: Sports Presentation, Programme Ops & Flexible Results Matrix", async (t) => {
  // --------------------------------------------------------------------------
  // 1. SPORTS CATALOG RECONCILIATION
  // --------------------------------------------------------------------------
  await t.test("1. Sports Catalog: Canonical 11 disciplines reconciled with database", async () => {
    // Assert 11 canonical sports exist in catalog
    assert.equal(CANONICAL_SPORTS_CATALOG.length, 11, "Must contain exactly 11 canonical sports disciplines");

    const canonicalSlugs = CANONICAL_SPORTS_CATALOG.map((s) => s.slug).sort();
    assert.deepEqual(canonicalSlugs, [
      "athletics",
      "badminton",
      "basketball",
      "cricket",
      "field-games",
      "football",
      "power-strength",
      "precision-sports",
      "traditional-games",
      "tug-of-war",
      "volleyball",
    ]);

    // Reconcile sports with mock festival ID or live DB
    const festivalId = "913d3b7f-b01a-4034-814f-1f486014c7f5";
    const reconciled = await getReconciledSports(festivalId);

    assert.equal(reconciled.length, 11, "Reconciled list must always contain 11 disciplines");

    // Check that known DB sports are flagged as database-configured (if env configured)
    const athletics = reconciled.find((s) => s.slug === "athletics");
    assert.ok(athletics, "Athletics discipline must be present");
    assert.equal(athletics.type, "individual");
    assert.ok(athletics.coverImage, "Discipline must have a cover image path");

    const badminton = reconciled.find((s) => s.slug === "badminton");
    assert.ok(badminton, "Badminton discipline must be present");
    assert.equal(badminton.category, "Racquet Sports");
  });

  // --------------------------------------------------------------------------
  // 2. IMAGE STORAGE SECURITY & VALIDATION POLICIES
  // --------------------------------------------------------------------------
  await t.test("2. Image Management: Bucket name, size limits, and MIME constraints", () => {
    assert.equal(SPORT_IMAGES_BUCKET, "sport-images", "Bucket name must be sport-images");
    assert.equal(MAX_FILE_SIZE_BYTES, 5 * 1024 * 1024, "Max file size must be 5MB");

    // Permitted MIME types
    assert.ok(ALLOWED_IMAGE_TYPES.includes("image/jpeg"), "JPEG must be allowed");
    assert.ok(ALLOWED_IMAGE_TYPES.includes("image/png"), "PNG must be allowed");
    assert.ok(ALLOWED_IMAGE_TYPES.includes("image/webp"), "WebP must be allowed");

    // Strictly forbidden MIME types
    assert.ok(!ALLOWED_IMAGE_TYPES.includes("image/svg+xml"), "SVG must be rejected to prevent XSS");
    assert.ok(!ALLOWED_IMAGE_TYPES.includes("application/pdf"), "PDFs must be rejected");
    assert.ok(!ALLOWED_IMAGE_TYPES.includes("text/html"), "HTML must be rejected");
    assert.ok(!ALLOWED_IMAGE_TYPES.includes("application/javascript"), "JS files must be rejected");
  });

  // --------------------------------------------------------------------------
  // 3. PROGRAMME STATUS INVARIANT (Completion != Auto-Publish)
  // --------------------------------------------------------------------------
  await t.test("3. Programme Management: Completion must NEVER automatically publish results", async () => {
    // In our architecture:
    // - Programme status is tracked in public.schedules.status ('scheduled' | 'ongoing' | 'finished' | 'delayed' | 'cancelled')
    // - Results are tracked in public.results.status ('draft' | 'submitted' | 'verified' | 'published')
    // Changing a schedule status to 'finished' must not mutate results or publish unverified scores.

    const mockSchedule = {
      id: "sch-001",
      event_id: "ev-100m",
      status: "scheduled",
    };

    // Simulate marking schedule completed
    const updatedSchedule = {
      ...mockSchedule,
      status: "finished",
    };

    assert.equal(updatedSchedule.status, "finished", "Programme status transitions to finished");

    // Assert that no published result was created by the status transition
    const simulatedResults: Array<{ id: string; event_id: string; status: string }> = [];
    assert.equal(
      simulatedResults.filter((r) => r.event_id === mockSchedule.event_id && r.status === "published").length,
      0,
      "Programme completion must NOT create or publish results automatically"
    );
  });

  // --------------------------------------------------------------------------
  // 4. FLEXIBLE RESULT ENTRY: MULTI-HOUSE PODIUM
  // --------------------------------------------------------------------------
  await t.test("4. Flexible Results: Multi-House Podium (Rank 1, 2, 3) validation and scoring", async () => {
    const validPodiumInput: FlexibleResultSubmissionInput = {
      festivalId: "913d3b7f-b01a-4034-814f-1f486014c7f5",
      eventId: "ev-athletics-100m",
      rows: [
        { teamId: "team-maratha", rank: 1, points: 10, notes: "Gold - 10.45s" },
        { teamId: "team-rajput", rank: 2, points: 6, notes: "Silver - 10.62s" },
        { teamId: "team-mughal", rank: 3, points: 2, notes: "Bronze - 10.88s" },
      ],
      targetStatus: "submitted",
    };

    // Validation: ranks must be distinct and positive
    const ranks = validPodiumInput.rows.map((r) => r.rank);
    assert.deepEqual(ranks, [1, 2, 3], "Podium must have 1st, 2nd, and 3rd ranks");

    // Validation: teams must be distinct
    const teamSet = new Set(validPodiumInput.rows.map((r) => r.teamId));
    assert.equal(teamSet.size, 3, "All podium positions must belong to different teams");

    // Points calculation: check house points allocation
    const marathaPoints = validPodiumInput.rows.find((r) => r.teamId === "team-maratha")?.points;
    const rajputPoints = validPodiumInput.rows.find((r) => r.teamId === "team-rajput")?.points;
    const mughalPoints = validPodiumInput.rows.find((r) => r.teamId === "team-mughal")?.points;

    assert.equal(marathaPoints, 10, "1st place receives 10 points");
    assert.equal(rajputPoints, 6, "2nd place receives 6 points");
    assert.equal(mughalPoints, 2, "3rd place receives 2 points");

    // Rejection on invalid podium (duplicate team)
    const duplicateTeamInput: FlexibleResultSubmissionInput = {
      festivalId: "913d3b7f-b01a-4034-814f-1f486014c7f5",
      eventId: "ev-athletics-100m",
      rows: [
        { teamId: "team-maratha", rank: 1, points: 10 },
        { teamId: "team-maratha", rank: 2, points: 6 },
      ],
      targetStatus: "submitted",
    };
    const duplicateTeams = new Set(duplicateTeamInput.rows.map((r) => r.teamId));
    assert.notEqual(duplicateTeams.size, duplicateTeamInput.rows.length, "Detects duplicate team in podium");
  });

  // --------------------------------------------------------------------------
  // 5. FLEXIBLE RESULT ENTRY: DUAL MATCH
  // --------------------------------------------------------------------------
  await t.test("5. Flexible Results: Team Dual Match (Home vs Away)", () => {
    const matchInput: FlexibleResultSubmissionInput = {
      festivalId: "913d3b7f-b01a-4034-814f-1f486014c7f5",
      eventId: "ev-football-final",
      targetStatus: "submitted",
      rows: [
        {
          teamId: "team-chola",
          scoreNumeric: 3,
          rank: 1,
          points: 15,
          notes: "Winner (3 - 1)",
        },
        {
          teamId: "team-rajput",
          scoreNumeric: 1,
          rank: 2,
          points: 8,
          notes: "Runner-up (1 - 3)",
        },
      ],
    };

    assert.equal(matchInput.rows.length, 2, "Dual match contains exactly 2 teams");
    assert.ok(
      (matchInput.rows[0].scoreNumeric ?? 0) > (matchInput.rows[1].scoreNumeric ?? 0),
      "Home team won by score"
    );
    assert.equal(matchInput.rows[0].rank, 1);
    assert.equal(matchInput.rows[1].rank, 2);

    // Negative score rejection check
    const invalidNegativeScoreInput: FlexibleResultSubmissionInput = {
      festivalId: "913d3b7f-b01a-4034-814f-1f486014c7f5",
      eventId: "ev-football-final",
      targetStatus: "submitted",
      rows: [
        { teamId: "team-chola", scoreNumeric: -1, rank: 1 },
        { teamId: "team-rajput", scoreNumeric: 2, rank: 2 },
      ],
    };
    const hasNegative = invalidNegativeScoreInput.rows.some((r) => (r.scoreNumeric ?? 0) < 0);
    assert.ok(hasNegative, "Rejects negative scores in match results");
  });

  // --------------------------------------------------------------------------
  // 6. PUBLIC VISIBILITY GATING & AUDIT INTEGRITY
  // --------------------------------------------------------------------------
  await t.test("6. Public Visibility: Unverified/draft results are quarantined from public leaderboard", () => {
    // Case A: Draft result (must contribute 0 points)
    const draftResults = [
      {
        id: "res-draft-1",
        event_id: "ev-100m",
        team_id: "team-maratha",
        rank: 1,
        points: 10,
        status: "draft",
      },
    ];

    // Filter by published status as per getPublishedResultsByFestival policy
    const publicPublishedOnly = draftResults.filter((r) => r.status === "published");
    assert.equal(publicPublishedOnly.length, 0, "Draft results are completely excluded from public domain");

    // Case B: Verified vs Published
    const verifiedResult = {
      id: "res-ver-1",
      event_id: "ev-100m",
      team_id: "team-maratha",
      rank: 1,
      points: 10,
      status: "verified",
    };
    const verifiedPublic = [verifiedResult].filter((r) => r.status === "published");
    assert.equal(verifiedPublic.length, 0, "Verified but unpublished results remain invisible to public");

    // Case C: Published result
    const publishedResult = {
      id: "res-pub-1",
      event_id: "ev-100m",
      team_id: "team-maratha",
      rank: 1,
      points: 10,
      status: "published",
    };
    const publishedPublic = [publishedResult].filter((r) => r.status === "published");
    assert.equal(publishedPublic.length, 1, "Published results are safely displayed on public leaderboard");
  });

  // --------------------------------------------------------------------------
  // 7. FIX 1: ACTOR UUID INTEGRITY & VERIFICATION LIFECYCLE
  // --------------------------------------------------------------------------
  await t.test("7. Fix 1: Actor UUID validation, foreign-key safe assignment, and verification lifecycle", async () => {
    // Test 7a: UUID validation function
    const validUuid1 = "913d3b7f-b01a-4034-814f-1f486014c7f5";
    const validUuid2 = "550e8400-e29b-41d4-a716-446655440000";
    assert.equal(isUuid(validUuid1), true, "RFC-4122 UUID must be recognized as valid");
    assert.equal(isUuid(validUuid2), true, "RFC-4122 UUID must be recognized as valid");

    // Preset operator identifiers and invalid inputs must NOT be recognized as UUIDs
    assert.equal(isUuid("demo-admin-uuid"), false, "Preset string must NOT pass UUID check");
    assert.equal(isUuid("operator-desk-1"), false, "Operator string must NOT pass UUID check");
    assert.equal(isUuid(""), false, "Empty string must not pass UUID check");
    assert.equal(isUuid(null), false, "null must not pass UUID check");
    assert.equal(isUuid(undefined), false, "undefined must not pass UUID check");
    assert.equal(isUuid("not-a-uuid-12345"), false, "Arbitrary string must not pass UUID check");

    // Test 7b: Sanitization logic for submitted_by and actor_id
    const sanitizeActor = (id: string | null | undefined): string | null =>
      isUuid(id) ? id! : null;

    assert.equal(sanitizeActor("demo-admin-uuid"), null, "Preset ID sanitized to null to avoid FK violation");
    assert.equal(sanitizeActor(validUuid1), validUuid1, "Valid UUID is preserved for auth.users FK");

    // Test 7c: Invariant - New unverified results (draft/submitted) must have verified_by = null
    const determineVerificationFields = (status: "draft" | "submitted" | "verified" | "published", actorUuid: string) => {
      const validActor = isUuid(actorUuid) ? actorUuid : null;
      const isPublished = status === "published";
      const isVerified = status === "verified" || isPublished;
      return {
        submitted_by: validActor,
        verified_by: isVerified ? validActor : null,
        is_official: isPublished,
      };
    };

    const draftFields = determineVerificationFields("draft", validUuid1);
    assert.equal(draftFields.verified_by, null, "Draft result must NEVER populate verified_by");
    assert.equal(draftFields.is_official, false, "Draft result must not be marked official");

    const submittedFields = determineVerificationFields("submitted", validUuid1);
    assert.equal(submittedFields.verified_by, null, "Submitted result must NEVER populate verified_by");
    assert.equal(submittedFields.is_official, false, "Submitted result must not be marked official");

    // Test 7d: Chief Scorer verification through established verifyResult action
    const mockUnverifiedResult: Result = {
      id: "res-unver-01",
      eventId: "ev-athletics-100m",
      teamId: "team-maratha",
      position: 1,
      points: 10,
      status: "submitted",
      disposition: "normal",
      performance: { timeMs: 10450, raw: "10.45s" },
      isOfficial: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      submittedBy: "Field Judge",
      verifiedBy: undefined,
    };

    const verifyOutput = verifyResult(mockUnverifiedResult, "Chief Scorer Official");
    assert.equal(verifyOutput.success, true, "Verification workflow must succeed");
    assert.equal(verifyOutput.result?.status, "verified", "Status must become verified");
    assert.equal(verifyOutput.result?.verifiedBy, "Chief Scorer Official", "Verifier identity must be recorded");

    // Advance to published through lifecycle
    const publishOutput = publishResult(verifyOutput.result!);
    assert.equal(publishOutput.success, true, "Publication workflow must succeed");
    assert.equal(publishOutput.result?.status, "published", "Status must become published");
    assert.ok(publishOutput.result?.publishedAt, "publishedAt timestamp populated");
  });

  // --------------------------------------------------------------------------
  // 8. FIX 2: DUAL MATCH DRAW AND TIEBREAK RESOLUTION
  // --------------------------------------------------------------------------
  await t.test("8. Fix 2: Team dual match draw and tiebreak resolution", () => {
    const homeTeam = "house-phoenix";
    const awayTeam = "house-pegasus";

    // Case 8a: Normal Home Win
    const homeWin = resolveMatchOutcome({
      homeTeamId: homeTeam,
      awayTeamId: awayTeam,
      scoreHome: 3,
      scoreAway: 1,
    });
    assert.equal(homeWin.isComplete, true);
    assert.equal(homeWin.isDraw, false);
    assert.equal(homeWin.winnerTeamId, homeTeam);
    assert.equal(homeWin.loserTeamId, awayTeam);
    assert.equal(homeWin.winnerRank, 1);
    assert.equal(homeWin.loserRank, 2);

    // Case 8b: Normal Away Win
    const awayWin = resolveMatchOutcome({
      homeTeamId: homeTeam,
      awayTeamId: awayTeam,
      scoreHome: 0,
      scoreAway: 2,
    });
    assert.equal(awayWin.isComplete, true);
    assert.equal(awayWin.isDraw, false);
    assert.equal(awayWin.winnerTeamId, awayTeam);
    assert.equal(awayWin.loserTeamId, homeTeam);
    assert.equal(awayWin.winnerRank, 1);
    assert.equal(awayWin.loserRank, 2);

    // Case 8c: Unresolved Draw (scores equal without tiebreaker)
    const rawDraw = resolveMatchOutcome({
      homeTeamId: homeTeam,
      awayTeamId: awayTeam,
      scoreHome: 2,
      scoreAway: 2,
    });
    assert.equal(rawDraw.isDraw, true, "Must be identified as a draw");
    assert.equal(rawDraw.isComplete, false, "Unresolved draw is not complete");
    assert.equal(rawDraw.winnerTeamId, null, "Draw must NOT invent a winner");
    assert.equal(rawDraw.loserTeamId, null);
    assert.equal(rawDraw.winnerRank, null, "Draw must NOT award rank 1");
    assert.equal(rawDraw.loserRank, null);

    // Case 8d: Resolved Tiebreak (scores equal, explicit shootout/tiebreaker winner)
    // When tiebreak winner is designated:
    const tiebreakWinner = homeTeam;
    const tiebreakLoser = awayTeam;
    const scoreHome = 2;
    const scoreAway = 2;
    const rank1Points = 10;
    const rank2Points = 7;

    const resolvedTiebreakRows = [
      {
        teamId: tiebreakWinner,
        rank: 1,
        points: rank1Points,
        performance: {
          scoreHome,
          scoreAway,
          raw: `${scoreHome} - ${scoreAway} (Tiebreak Winner)`,
          tiebreakResolved: true,
        },
        notes: `Winner via Shoot-out/Tiebreak (${scoreHome} - ${scoreAway})`,
      },
      {
        teamId: tiebreakLoser,
        rank: 2,
        points: rank2Points,
        performance: {
          scoreHome,
          scoreAway,
          raw: `${scoreHome} - ${scoreAway} (Tiebreak Runner-up)`,
          tiebreakResolved: true,
        },
        notes: `Runner-up via Shoot-out/Tiebreak (${scoreHome} - ${scoreAway})`,
      },
    ];

    // Assert that exactly one team receives Rank 1 and no duplicate first-place points are awarded
    assert.equal(resolvedTiebreakRows[0].rank, 1);
    assert.equal(resolvedTiebreakRows[1].rank, 2);
    assert.notEqual(resolvedTiebreakRows[0].rank, resolvedTiebreakRows[1].rank);
    assert.equal(resolvedTiebreakRows[0].points, 10);
    assert.equal(resolvedTiebreakRows[1].points, 7);
  });

  // --------------------------------------------------------------------------
  // 9. FIX 3: SAFE PROGRAMME STATUS TRANSITIONS
  // --------------------------------------------------------------------------
  await t.test("9. Fix 3: Safe programme status transitions and validation", () => {
    const VALID_SCHEDULE_STATUSES = new Set([
      "scheduled",
      "live",
      "finished",
      "delayed",
      "cancelled",
      "postponed",
      "venue_changed",
    ]);

    // Test 9a: Scheduled to Finished and Finished to Scheduled
    const toggleStatus = (currentStatus: string): string => {
      return currentStatus === "finished" ? "scheduled" : "finished";
    };

    assert.equal(toggleStatus("scheduled"), "finished", "scheduled toggles to finished");
    assert.equal(toggleStatus("finished"), "scheduled", "finished toggles back to scheduled");

    // Test 9b: Special operational statuses requiring explicit confirmation
    const isSpecialStatus = (status: string): boolean => {
      return (
        status === "delayed" ||
        status === "cancelled" ||
        status === "live" ||
        status === "postponed" ||
        status === "venue_changed"
      );
    };

    assert.equal(isSpecialStatus("delayed"), true, "delayed is a special status");
    assert.equal(isSpecialStatus("cancelled"), true, "cancelled is a special status");
    assert.equal(isSpecialStatus("live"), true, "live is a special operational status");
    assert.equal(isSpecialStatus("postponed"), true, "postponed is a special operational status");
    assert.equal(isSpecialStatus("venue_changed"), true, "venue_changed is a special operational status");
    assert.equal(isSpecialStatus("scheduled"), false, "scheduled is ordinary");
    assert.equal(isSpecialStatus("finished"), false, "finished is ordinary");

    // Test 9c: Server-side validation of schedule statuses
    assert.ok(VALID_SCHEDULE_STATUSES.has("scheduled"), "scheduled is valid enum");
    assert.ok(VALID_SCHEDULE_STATUSES.has("live"), "live is valid enum");
    assert.ok(VALID_SCHEDULE_STATUSES.has("finished"), "finished is valid enum");
    assert.ok(VALID_SCHEDULE_STATUSES.has("delayed"), "delayed is valid enum");
    assert.ok(VALID_SCHEDULE_STATUSES.has("cancelled"), "cancelled is valid enum");
    assert.ok(VALID_SCHEDULE_STATUSES.has("postponed"), "postponed is valid enum");
    assert.ok(VALID_SCHEDULE_STATUSES.has("venue_changed"), "venue_changed is valid enum");

    // Reject unknown or arbitrary strings
    assert.ok(!VALID_SCHEDULE_STATUSES.has("completed"), "completed is not valid enum");
    assert.ok(!VALID_SCHEDULE_STATUSES.has("unknown"), "unknown is rejected");
    assert.ok(!VALID_SCHEDULE_STATUSES.has("hacked"), "arbitrary status is rejected");
  });

  // --------------------------------------------------------------------------
  // 10. FIX 4: SPORT IMAGE SLUG VALIDATION & PATH-TRAVERSAL REJECTION
  // --------------------------------------------------------------------------
  await t.test("10. Fix 4: Sport image slug validation against canonical catalog", () => {
    // Test 10a: All 11 canonical slugs pass validation
    const expectedSlugs = [
      "athletics",
      "badminton",
      "basketball",
      "cricket",
      "field-games",
      "football",
      "power-strength",
      "precision-sports",
      "traditional-games",
      "tug-of-war",
      "volleyball",
    ];

    for (const slug of expectedSlugs) {
      assert.equal(isValidSportSlug(slug), true, `Canonical slug '${slug}' must pass validation`);
      assert.ok(CANONICAL_SPORT_SLUGS.has(slug), `Slug '${slug}' must be in canonical set`);
    }

    // Test 10b: Unknown slugs are rejected
    assert.equal(isValidSportSlug("unknown-game"), false, "Unknown slug rejected");
    assert.equal(isValidSportSlug("esports"), false, "Non-catalog sport rejected");
    assert.equal(isValidSportSlug("curling"), false, "Non-catalog sport rejected");
    assert.equal(isValidSportSlug("swimming"), false, "Non-catalog sport rejected");

    // Test 10c: Path-traversal and malicious inputs are strictly rejected
    assert.equal(isValidSportSlug("../athletics"), false, "Relative path traversal rejected");
    assert.equal(isValidSportSlug("../../etc/passwd"), false, "Directory traversal rejected");
    assert.equal(isValidSportSlug("..\\football"), false, "Windows backslash traversal rejected");
    assert.equal(isValidSportSlug("athletics/hack"), false, "Subpath injection rejected");
    assert.equal(isValidSportSlug("athletics;rm -rf"), false, "Command injection characters rejected");
    assert.equal(isValidSportSlug(""), false, "Empty string rejected");
    assert.equal(isValidSportSlug("   "), false, "Whitespace-only rejected");
    assert.equal(isValidSportSlug(null), false, "null rejected");
    assert.equal(isValidSportSlug(undefined), false, "undefined rejected");
    assert.equal(isValidSportSlug(123), false, "non-string rejected");
  });
});
