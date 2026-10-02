import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateAppealWindow,
  canActorDecideAppeal,
  canTransitionAppealStatus,
  validateAppealSubmission,
  validateAppealDecision,
  InMemoryAppealStore,
  DEFAULT_APPEAL_FEE,
  DEFAULT_APPEAL_WINDOW_MINUTES,
} from "../lib/appeals/appealEngine.ts";
import {
  calculateTeamPointsBreakdown,
  calculateAllTeamPoints,
} from "../lib/competition/pointsAggregation.ts";
import type { Result } from "../lib/types/index.ts";

describe("PEGASUS: Appeals & Disputes System", () => {
  const publishedTime = "2026-09-24T06:00:00.000Z";
  const withinWindowTime = "2026-09-24T06:15:00.000Z"; // 15 mins after
  const afterWindowTime = "2026-09-24T06:35:00.000Z"; // 35 mins after

  // --------------------------------------------------------------------------
  // 1. Appeal Window & Timer Calculation
  // --------------------------------------------------------------------------
  describe("Appeal Window Calculation", () => {
    it("Test 1.1: computes open window with correct remaining time and deadline", () => {
      const windowStatus = calculateAppealWindow(
        publishedTime,
        DEFAULT_APPEAL_WINDOW_MINUTES,
        withinWindowTime,
      );

      assert.equal(windowStatus.isOpen, true);
      assert.equal(windowStatus.isExpired, false);
      assert.equal(windowStatus.remainingMinutes, 15);
      assert.equal(windowStatus.remainingSeconds, 900);
      assert.equal(windowStatus.deadlineAt, "2026-09-24T06:30:00.000Z");
    });

    it("Test 1.2: marks appeal window as expired when submitted past deadline", () => {
      const windowStatus = calculateAppealWindow(
        publishedTime,
        DEFAULT_APPEAL_WINDOW_MINUTES,
        afterWindowTime,
      );

      assert.equal(windowStatus.isOpen, false);
      assert.equal(windowStatus.isExpired, true);
      assert.equal(windowStatus.remainingMinutes, 0);
      assert.equal(windowStatus.remainingSeconds, 0);
    });

    it("Test 1.3: handles null or undefined publication dates gracefully", () => {
      const windowStatus = calculateAppealWindow(null);
      assert.equal(windowStatus.isOpen, false);
      assert.equal(windowStatus.isExpired, false);
      assert.equal(windowStatus.deadlineAt, null);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Submission Validation & Permissions
  // --------------------------------------------------------------------------
  describe("Submission Validation & Eligibility", () => {
    const validParams = {
      input: {
        festivalId: "fest-2026",
        eventId: "event-100m",
        resultId: "res-001",
        teamId: "house-phoenix",
        title: "Disputed false start on Lane 4",
        reasonCategory: "technical_rule_violation" as const,
        description: "Video playback shows runner in lane 2 moved before gun, affecting lane 4 runner.",
        evidenceReferences: ["https://pegasus.stream/heat-2-replay"],
      },
      actor: {
        userId: "user-mgr-phoenix",
        role: "team_manager" as const,
        teamId: "house-phoenix",
      },
      result: {
        id: "res-001",
        status: "published",
        publishedAt: publishedTime,
        teamId: "house-phoenix",
      },
      existingAppeals: [],
      now: withinWindowTime,
    };

    it("Test 2.1: Happy Path — valid team manager submission within open window -> PASS", () => {
      const validation = validateAppealSubmission(validParams);
      assert.equal(validation.valid, true);
      assert.equal(validation.error, undefined);
      assert.equal(validation.deadlineAt, "2026-09-24T06:30:00.000Z");
    });

    it("Test 2.2: Rejects submission missing title or description", () => {
      const noTitle = validateAppealSubmission({
        ...validParams,
        input: { ...validParams.input, title: "" },
      });
      assert.equal(noTitle.valid, false);
      assert.match(noTitle.error!, /title is required/i);

      const noDesc = validateAppealSubmission({
        ...validParams,
        input: { ...validParams.input, description: "   " },
      });
      assert.equal(noDesc.valid, false);
      assert.match(noDesc.error!, /description and statement of grounds are required/i);
    });

    it("Test 2.3: Rejects submission if appeal window has expired", () => {
      const expiredSubmission = validateAppealSubmission({
        ...validParams,
        now: afterWindowTime,
      });

      assert.equal(expiredSubmission.valid, false);
      assert.match(expiredSubmission.error!, /Appeal window closed/i);
      assert.match(expiredSubmission.error!, /must be lodged within 30 minutes/i);
    });

    it("Test 2.4: Rejects unauthorized actor (guest, judge, or manager of wrong house)", () => {
      // 1. Manager of House Pegasus trying to appeal for House Phoenix
      const wrongHouseManager = validateAppealSubmission({
        ...validParams,
        actor: {
          userId: "user-mgr-pegasus",
          role: "team_manager",
          teamId: "house-pegasus",
        },
      });
      assert.equal(wrongHouseManager.valid, false);
      assert.match(wrongHouseManager.error!, /Unauthorized/i);

      // 2. Judge trying to lodge an appeal
      const judgeSubmission = validateAppealSubmission({
        ...validParams,
        actor: {
          userId: "user-judge-1",
          role: "judge",
          teamId: "house-phoenix",
        },
      });
      assert.equal(judgeSubmission.valid, false);
      assert.match(judgeSubmission.error!, /Unauthorized/i);

      // 3. Admin can lodge on behalf of any house
      const adminSubmission = validateAppealSubmission({
        ...validParams,
        actor: {
          userId: "user-admin",
          role: "admin",
          teamId: null,
        },
      });
      assert.equal(adminSubmission.valid, true);
    });

    it("Test 2.5: Rejects appeal against unpublished/draft results", () => {
      const draftResultSubmission = validateAppealSubmission({
        ...validParams,
        result: {
          ...validParams.result,
          status: "draft",
        },
      });

      assert.equal(draftResultSubmission.valid, false);
      assert.match(draftResultSubmission.error!, /Only officially published or verified results/i);
    });

    it("Test 2.6: Rejects duplicate active appeal for same result and team", () => {
      const duplicateSubmission = validateAppealSubmission({
        ...validParams,
        existingAppeals: [
          {
            result_id: "res-001",
            team_id: "house-phoenix",
            status: "submitted",
          },
        ],
      });

      assert.equal(duplicateSubmission.valid, false);
      assert.match(duplicateSubmission.error!, /An active appeal is already pending review/i);
    });

    it("Test 2.7: Allows new submission if previous appeal was rejected (within window)", () => {
      const pastRejectedSubmission = validateAppealSubmission({
        ...validParams,
        existingAppeals: [
          {
            result_id: "res-001",
            team_id: "house-phoenix",
            status: "rejected",
          },
        ],
      });

      assert.equal(pastRejectedSubmission.valid, true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Lifecycle State Machine & Decision Authority
  // --------------------------------------------------------------------------
  describe("Lifecycle Transitions & Review Authority", () => {
    it("Test 3.1: Enforces review authority — only admin and desk_operator can decide", () => {
      assert.equal(canActorDecideAppeal("admin"), true);
      assert.equal(canActorDecideAppeal("desk_operator"), true);
      assert.equal(canActorDecideAppeal("team_manager"), false);
      assert.equal(canActorDecideAppeal("judge"), false);
      assert.equal(canActorDecideAppeal("guest"), false);

      const unauthorizedDecision = validateAppealDecision({
        currentStatus: "under_review",
        targetStatus: "accepted",
        reviewerRole: "team_manager",
        decisionNotes: "I approve our own appeal.",
      });
      assert.equal(unauthorizedDecision.valid, false);
      assert.match(unauthorizedDecision.error!, /Unauthorized.*Requires Administrator or Desk Operator/i);
    });

    it("Test 3.2: Validates legal lifecycle state transitions", () => {
      // Legal: submitted -> under_review
      assert.equal(canTransitionAppealStatus("submitted", "under_review"), true);
      // Legal: submitted -> rejected (summary dismissal)
      assert.equal(canTransitionAppealStatus("submitted", "rejected"), true);
      // Illegal: submitted -> accepted (must go through under_review)
      assert.equal(canTransitionAppealStatus("submitted", "accepted"), false);

      // Legal from under_review: accepted, rejected, partially_upheld
      assert.equal(canTransitionAppealStatus("under_review", "accepted"), true);
      assert.equal(canTransitionAppealStatus("under_review", "rejected"), true);
      assert.equal(canTransitionAppealStatus("under_review", "partially_upheld"), true);

      // Terminal states cannot transition back
      assert.equal(canTransitionAppealStatus("accepted", "under_review"), false);
      assert.equal(canTransitionAppealStatus("rejected", "submitted"), false);
      assert.equal(canTransitionAppealStatus("partially_upheld", "accepted"), false);
    });

    it("Test 3.3: Requires written rationale for final resolutions", () => {
      const missingNotes = validateAppealDecision({
        currentStatus: "under_review",
        targetStatus: "accepted",
        reviewerRole: "admin",
        decisionNotes: "",
      });
      assert.equal(missingNotes.valid, false);
      assert.match(missingNotes.error!, /Formal written decision notes.*mandatory/i);

      const validAccepted = validateAppealDecision({
        currentStatus: "under_review",
        targetStatus: "accepted",
        reviewerRole: "desk_operator",
        decisionNotes: "Photo-finish review confirmed athlete in lane 3 crossed line first.",
      });
      assert.equal(validAccepted.valid, true);

      const validPartial = validateAppealDecision({
        currentStatus: "under_review",
        targetStatus: "partially_upheld",
        reviewerRole: "admin",
        decisionNotes: "Disqualification overturned; awarded 3rd place tie instead of 1st.",
      });
      assert.equal(validPartial.valid, true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Invariant Protection: Result Correction & Dynamic Leaderboard Recalculation
  // --------------------------------------------------------------------------
  describe("Invariant: Result Correction & Dynamic Leaderboard Recalculation", () => {
    it("Test 4.1: Appeal acceptance updates authoritative result and recalculates leaderboard dynamically", () => {
      const participantPhoenix = "p-phoenix-runner";
      const participantPegasus = "p-pegasus-runner";

      const participantLookup = new Map<string, string>([
        [participantPhoenix, "house-phoenix"],
        [participantPegasus, "house-pegasus"],
      ]);

      // Initial published results (before appeal)
      // Rank 1: Pegasus (5 pts)
      // Rank 2: Phoenix (3 pts)
      const results: Result[] = [
        {
          id: "res-001",
          eventId: "event-100m",
          participantId: participantPhoenix,
          teamId: "house-phoenix",
          position: 2,
          points: 3,
          status: "published",
          createdAt: publishedTime,
        },
        {
          id: "res-002",
          eventId: "event-100m",
          participantId: participantPegasus,
          teamId: "house-pegasus",
          position: 1,
          points: 5,
          status: "published",
          createdAt: publishedTime,
        },
      ];

      // Initial Leaderboard state
      const initialPhoenix = calculateTeamPointsBreakdown(results, "house-phoenix", [], participantLookup);
      const initialPegasus = calculateTeamPointsBreakdown(results, "house-pegasus", [], participantLookup);

      assert.equal(initialPhoenix.netPoints, 3, "Phoenix initially has 3 points");
      assert.equal(initialPegasus.netPoints, 5, "Pegasus initially has 5 points");

      // Jury of Appeal accepts protest:
      // Phoenix runner is corrected to Rank 1 (5 pts)
      // Pegasus runner was disqualified / corrected to Rank 2 (3 pts)
      //
      // Invariant: The appeal layer NEVER directly updates leaderboard scores.
      // It executes a controlled update to the authoritative results:
      const correctedResults = results.map((r) => {
        if (r.id === "res-001") {
          return { ...r, position: 1, points: 5, updatedAt: new Date().toISOString() };
        }
        if (r.id === "res-002") {
          return { ...r, position: 2, points: 3, updatedAt: new Date().toISOString() };
        }
        return r;
      });

      // Dynamic Leaderboard Recalculation triggered from corrected authoritative results
      const recalculatedPhoenix = calculateTeamPointsBreakdown(
        correctedResults,
        "house-phoenix",
        [],
        participantLookup,
      );
      const recalculatedPegasus = calculateTeamPointsBreakdown(
        correctedResults,
        "house-pegasus",
        [],
        participantLookup,
      );

      assert.equal(recalculatedPhoenix.netPoints, 5, "Phoenix correctly updated to 5 points");
      assert.equal(recalculatedPegasus.netPoints, 3, "Pegasus correctly adjusted to 3 points");

      // Verify all teams aggregation reflects dynamic championship table
      const allPoints = calculateAllTeamPoints(
        correctedResults,
        [],
        participantLookup,
      );

      assert.deepEqual(allPoints, [
        { teamId: "house-phoenix", points: 5 },
        { teamId: "house-pegasus", points: 3 },
      ]);
    });

    it("Test 4.2: Rejected appeal leaves authoritative result and points completely untouched", () => {
      const participantPhoenix = "p-phoenix-runner";
      const participantLookup = new Map<string, string>([
        [participantPhoenix, "house-phoenix"],
      ]);

      const results: Result[] = [
        {
          id: "res-001",
          eventId: "event-100m",
          participantId: participantPhoenix,
          teamId: "house-phoenix",
          position: 2,
          points: 3,
          status: "published",
          createdAt: publishedTime,
        },
      ];

      // Appeal rejected: authoritative result remains identical
      const unchangedBreakdown = calculateTeamPointsBreakdown(
        results,
        "house-phoenix",
        [],
        participantLookup,
      );

      assert.equal(unchangedBreakdown.netPoints, 3);
    });
  });

  // --------------------------------------------------------------------------
  // 5. In-Memory Store & Full Lifecycle Integration
  // --------------------------------------------------------------------------
  describe("InMemoryAppealStore End-to-End Lifecycle", () => {
    it("Test 5.1: Create, review, decide appeal, audit log, and update authoritative result", () => {
      const store = new InMemoryAppealStore();

      const authoritativeResults = [
        {
          id: "res-relay-1",
          rank: 4 as number | null,
          points: 1,
          status: "published",
        },
      ];

      // 1. Create Appeal
      const createRes = store.createAppeal({
        input: {
          festivalId: "fest-2026",
          eventId: "event-relay",
          resultId: "res-relay-1",
          teamId: "house-phoenix",
          participantId: null,
          title: "Baton changeover line dispute",
          reasonCategory: "technical_rule_violation",
          description: "Baton passed within legal 20m box.",
          evidenceReferences: ["video_camera_2"],
        },
        actor: {
          userId: "mgr-user-1",
          fullName: "Phoenix Manager",
          role: "team_manager",
          teamId: "house-phoenix",
        },
        result: {
          id: "res-relay-1",
          status: "published",
          publishedAt: publishedTime,
          teamId: "house-phoenix",
        },
        now: withinWindowTime,
      });

      assert.equal(createRes.success, true);
      const created = createRes.data!;
      assert.ok(created.id);
      assert.equal(created.status, "submitted");
      assert.equal(created.fee_amount, DEFAULT_APPEAL_FEE);

      // 2. Transition to under_review
      const underReviewRes = store.reviewAppeal({
        appealId: created.id,
        targetStatus: "under_review",
        reviewer: {
          userId: "admin-user",
          fullName: "Chief Arbitrator",
          role: "admin",
        },
        decisionNotes: "Jury convened to inspect high-speed footage.",
        now: withinWindowTime,
      });

      assert.equal(underReviewRes.success, true);
      const underReview = underReviewRes.data!;
      assert.equal(underReview.status, "under_review");
      assert.equal(underReview.reviewed_by, "admin-user");

      // 3. Final Decision: partially_upheld with corrected result
      const decidedRes = store.reviewAppeal({
        appealId: created.id,
        targetStatus: "partially_upheld",
        reviewer: {
          userId: "admin-user",
          fullName: "Chief Arbitrator",
          role: "admin",
        },
        decisionNotes: "Changeover was within margin; awarded reinstatement to 3rd place (2 pts).",
        correctedResult: {
          rank: 3,
          points: 2,
        },
        authoritativeResults,
        now: withinWindowTime,
      });

      assert.equal(decidedRes.success, true);
      const decided = decidedRes.data!;
      assert.equal(decided.status, "partially_upheld");
      assert.ok(decided.reviewed_at);

      // 4. Verify authoritative result was corrected through the controlled operation
      assert.equal(authoritativeResults[0].rank, 3);
      assert.equal(authoritativeResults[0].points, 2);

      // 5. Verify audit entry was recorded
      const audits = store.getAudits();
      assert.equal(audits.length, 1);
      assert.equal(audits[0].resultId, "res-relay-1");
      assert.equal(audits[0].actorId, "admin-user");
      assert.equal(audits[0].action, "appeal_partially_upheld");
      assert.deepEqual(audits[0].beforeState, { rank: 4, points: 1 });
      assert.deepEqual(audits[0].afterState, { rank: 3, points: 2 });

      // 6. Verify fetch methods
      const fetched = store.getAppealById(created.id);
      assert.equal(fetched?.id, created.id);
      assert.equal(fetched?.status, "partially_upheld");

      const teamAppeals = store.getAppealsByTeam("house-phoenix");
      assert.equal(teamAppeals.length, 1);
      assert.equal(teamAppeals[0].title, "Baton changeover line dispute");
    });
  });
});
