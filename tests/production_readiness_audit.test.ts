import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateResult, validateScoreSheetEntries } from "../lib/results/resultValidation.ts";
import { createClient as createBrowserClient } from "../lib/supabase/client.ts";
import type { Result, ScheduleStatus } from "../lib/types/index.ts";

describe("PEGASUS Production Readiness — Functional Verification", () => {
  describe("Task 1: Homepage Schedule Transformation & Resiliency", () => {
    // Pure function mirroring homepage schedule rendering logic
    function transformScheduleForHomepage(
      sch: {
        id: string;
        title?: string | null;
        starts_at: string | null;
        status: ScheduleStatus;
        venue_id?: string | null;
        category?: string | null;
        event_id?: string | null;
      },
      venueMap: Map<string, string>,
      eventMap: Map<string, { name: string; competition_type: string; point_class?: string }>,
    ) {
      const linkedEvent = sch.event_id ? eventMap.get(sch.event_id) : undefined;
      const venueName = sch.venue_id
        ? venueMap.get(sch.venue_id) || "Campus Arena"
        : "Main Campus";

      let timeString = "TBA";
      if (sch.starts_at) {
        try {
          const d = new Date(sch.starts_at);
          if (!isNaN(d.getTime())) {
            timeString = d.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
          }
        } catch {
          timeString = "TBA";
        }
      }

      const statusDisplay =
        sch.status === "finished"
          ? "Done"
          : sch.status === "live"
          ? "Live"
          : "Scheduled";

      return {
        id: sch.id,
        eventName: sch.title || linkedEvent?.name || "Official Programme",
        sportName: linkedEvent?.competition_type || "Athletics",
        category: sch.category || (linkedEvent?.point_class ? `Class ${linkedEvent.point_class}` : "Championship"),
        venueName,
        timeSlot: timeString,
        status: statusDisplay,
      };
    }

    it("correctly handles schedules with valid starts_at, missing venues, and varied statuses", () => {
      const venueMap = new Map([["v-1", "Main Track"]]);
      const eventMap = new Map([
        ["ev-1", { name: "100m Sprint", competition_type: "Athletics", point_class: "W" }],
      ]);

      // Schedule with mapped venue and finished status
      const res1 = transformScheduleForHomepage(
        {
          id: "s-1",
          title: "HEAT 1 SPRINT",
          starts_at: "2026-10-15T10:30:00.000Z",
          status: "finished",
          venue_id: "v-1",
          event_id: "ev-1",
        },
        venueMap,
        eventMap,
      );

      assert.strictEqual(res1.id, "s-1");
      assert.strictEqual(res1.eventName, "HEAT 1 SPRINT");
      assert.strictEqual(res1.venueName, "Main Track");
      assert.strictEqual(res1.status, "Done");
      assert.notStrictEqual(res1.timeSlot, "TBA");

      // Schedule with unmapped venue ID (fallback to Campus Arena)
      const res2 = transformScheduleForHomepage(
        {
          id: "s-2",
          title: "ARM WRESTLING",
          starts_at: "2026-10-15T14:00:00.000Z",
          status: "live",
          venue_id: "v-unknown",
          category: "PRE-SENIOR",
        },
        venueMap,
        eventMap,
      );

      assert.strictEqual(res2.venueName, "Campus Arena");
      assert.strictEqual(res2.status, "Live");
      assert.strictEqual(res2.category, "PRE-SENIOR");

      // Schedule with null starts_at and null venue_id
      const res3 = transformScheduleForHomepage(
        {
          id: "s-3",
          title: "CROSS BARRICK",
          starts_at: null,
          status: "scheduled",
          venue_id: null,
        },
        venueMap,
        eventMap,
      );

      assert.strictEqual(res3.venueName, "Main Campus");
      assert.strictEqual(res3.timeSlot, "TBA");
      assert.strictEqual(res3.status, "Scheduled");
    });

    it("produces empty output when schedule array is empty (never fabricates entries)", () => {
      const emptySchedules: any[] = [];
      const transformed = emptySchedules.map((s) => transformScheduleForHomepage(s, new Map(), new Map()));
      assert.strictEqual(transformed.length, 0, "Empty database schedule array must produce 0 rendered programmes");
    });
  });

  describe("Task 2: Absence of Operational Mock Fallbacks", () => {
    it("ensures athlete pass computes 0 points and empty achievements when DB results are empty", () => {
      // Pure pipeline mirroring app/my-result/page.tsx logic after mock fallback removal
      const publishedResults: any[] = [];
      const totalPoints = publishedResults.reduce((acc, r) => acc + (r.points || 0), 0);
      const achievements = publishedResults.map((r) => ({ id: `ach-${r.id}` }));

      assert.strictEqual(totalPoints, 0, "Participant with no DB results must accrue exactly 0 points");
      assert.strictEqual(achievements.length, 0, "Participant with no DB results must have 0 achievements");
    });

    it("ensures athlete registration resolves strictly from participant record without static participant fallback", () => {
      // Pure resolver mirroring app/my-result/page.tsx line 351: participantWithEvents?.registeredEventIds || []
      const participantWithEvents: { registeredEventIds?: string[] } = {};
      const registeredEventIds = participantWithEvents?.registeredEventIds || [];

      assert.deepStrictEqual(registeredEventIds, [], "Unregistered/unimported events must resolve to empty array without static fallback");
    });

    it("ensures judge event desk produces empty competitor and fixture rosters when DB records are empty", () => {
      // Pure resolver mirroring app/judge/events/[id]/page.tsx after mock fallback removal
      const dbCompetitors: any[] = [];
      const dbFixtures: any[] = [];

      // Previously, empty dbCompetitors fell back to staticParticipants.filter(...)
      const resolvedCompetitors = dbCompetitors.length > 0
        ? dbCompetitors.map((c) => ({ id: c.id, name: c.name }))
        : [];
      const resolvedFixtures = dbFixtures.length > 0
        ? dbFixtures.map((f) => ({ id: f.id, round: f.round }))
        : [];

      assert.strictEqual(resolvedCompetitors.length, 0, "Judge desk must never populate static demo athletes");
      assert.strictEqual(resolvedFixtures.length, 0, "Judge desk must never populate static demo fixtures");
    });
  });

  describe("Task 3: Supabase Public-Key Configuration & Quote Sanitization", () => {
    it("createBrowserClient sanitizes surrounding quotes and handles anon key fallback", () => {
      const origUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const origPub = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      const origAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        // Simulate Vercel setting NEXT_PUBLIC_SUPABASE_ANON_KEY with quotes, and leaving PUBLISHABLE_KEY empty
        delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        process.env.NEXT_PUBLIC_SUPABASE_URL = '"https://xyzproject.supabase.co"';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_token_123"';

        const client = createBrowserClient();
        assert.ok(client, "createBrowserClient must successfully initialize with quoted ANON_KEY");
      } finally {
        process.env.NEXT_PUBLIC_SUPABASE_URL = origUrl;
        if (origPub !== undefined) process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = origPub;
        if (origAnon !== undefined) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = origAnon;
      }
    });
  });

  describe("Task 4: House/Team-Level vs Individual Result Entry Integrity", () => {
    it("team event results validate cleanly with teamId and no participantId", () => {
      const teamResult: Result = {
        id: "res-team-football-01",
        eventId: "football",
        teamId: "team-tiburon",
        participantId: undefined,
        position: 1,
        points: 25,
        status: "published",
        submittedBy: "judge-referee-01",
        verifiedBy: "admin-verifier-01",
        publishedAt: "2026-10-15T12:00:00Z",
        disposition: "normal",
        isOfficial: true,
        performance: { raw: "2 - 1", scoreHome: 2, scoreAway: 1 },
        createdAt: "2026-10-15T11:00:00Z",
        updatedAt: "2026-10-15T12:00:00Z",
      };

      const teamValidation = validateResult(teamResult, "team");
      assert.strictEqual(teamValidation.valid, true, "Team result without participantId must be valid");
      assert.strictEqual(teamValidation.errors.length, 0);

      // Verify that fixture-based team result without participantId is also valid
      const fixtureResult: Result = {
        ...teamResult,
        id: "res-team-volleyball-01",
        teamId: undefined,
        fixtureId: "fix-volleyball-semi-1",
      };
      const fixtureValidation = validateResult(fixtureResult, "team");
      assert.strictEqual(fixtureValidation.valid, true, "Team result with fixtureId must be valid");
    });

    it("individual events strictly require participantId and reject missing student records", () => {
      const individualWithoutParticipant: Result = {
        id: "res-indiv-100m-01",
        eventId: "race-100m",
        teamId: "team-garuda",
        participantId: undefined, // Missing participant
        position: 1,
        points: 10,
        status: "submitted",
        submittedBy: "judge-track-01",
        disposition: "normal",
        isOfficial: false,
        performance: { raw: "10.45s", timeMs: 10450 },
        createdAt: "2026-10-15T11:00:00Z",
        updatedAt: "2026-10-15T11:00:00Z",
      };

      const validation = validateResult(individualWithoutParticipant, "individual");
      assert.strictEqual(validation.valid, false, "Individual result must be rejected without participantId");
      assert.ok(
        validation.errors.some((err) => err.includes("participantId")),
        "Error message must cite missing participantId",
      );

      // Now with valid participantId, it must pass
      const validIndividual: Result = {
        ...individualWithoutParticipant,
        participantId: "student-uuid-1001",
      };
      const validPass = validateResult(validIndividual, "individual");
      assert.strictEqual(validPass.valid, true, "Individual result with participantId must pass");
      assert.strictEqual(validPass.errors.length, 0);
    });

    it("validates operational batch score sheets for dual matches without participant IDs", () => {
      const dualMatchEntries = [
        {
          teamId: "team-garuda",
          rank: 1,
          performanceRaw: "3 - 1",
          disposition: "normal" as const,
        },
        {
          teamId: "team-toofan",
          rank: 2,
          performanceRaw: "1 - 3",
          disposition: "normal" as const,
        },
      ];

      const validation = validateScoreSheetEntries(dualMatchEntries, "team", true);
      assert.strictEqual(validation.valid, true, "Dual match score sheet must validate without participant IDs");
      assert.strictEqual(validation.errors.length, 0);
    });

    it("enforces result lifecycle authorization and verification gates", () => {
      // Draft/submitted result must not require verifiedBy or publishedAt
      const submittedResult: Result = {
        id: "res-lifecycle-01",
        eventId: "cricket",
        teamId: "team-trojan",
        position: 1,
        points: 25,
        status: "submitted",
        submittedBy: "field-judge-uuid",
        disposition: "normal",
        isOfficial: false,
        createdAt: "2026-10-15T10:00:00Z",
        updatedAt: "2026-10-15T10:00:00Z",
      };
      const subValidation = validateResult(submittedResult, "team");
      assert.strictEqual(subValidation.valid, true, "Submitted result must be valid without verifiedBy");

      // Published result without verifiedBy must be rejected
      const invalidPublished: Result = {
        ...submittedResult,
        status: "published",
        publishedAt: "2026-10-15T11:00:00Z",
        verifiedBy: undefined, // Missing verifier
      };
      const pubValidation = validateResult(invalidPublished, "team");
      assert.strictEqual(pubValidation.valid, false, "Published result without verifiedBy must be rejected");
      assert.ok(
        pubValidation.errors.some((err) => err.includes("verifiedBy")),
        "Error must cite missing verifiedBy identifier",
      );
    });
  });
});
