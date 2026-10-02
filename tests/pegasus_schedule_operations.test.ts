import { test } from "node:test";
import assert from "node:assert/strict";
import { OFFICIAL_OCTOBER_2026_SCHEDULE } from "../lib/data/officialSchedule2026.ts";
import {
  checkScheduleConflict,
  createScheduleRecord,
  deleteScheduleRecord,
} from "../lib/repositories/scheduleRepository.ts";

test("PEGASUS Official Schedule Operations & Timetable Management", async (t) => {
  await t.test("1. Official October 2026 Schedule Dataset Integrity", () => {
    // 59 official entries
    assert.equal(
      OFFICIAL_OCTOBER_2026_SCHEDULE.length,
      59,
      `Expected 59 entries from committee, got ${OFFICIAL_OCTOBER_2026_SCHEDULE.length}`,
    );

    // Strictly 2026, never 2024
    for (const item of OFFICIAL_OCTOBER_2026_SCHEDULE) {
      assert.ok(
        item.date.startsWith("2026-10-"),
        `Item "${item.title}" date ${item.date} must be in October 2026`,
      );
      assert.ok(
        !item.date.includes("2024"),
        `Item "${item.title}" must not contain 2024`,
      );
      assert.ok(
        item.startsAt.startsWith("2026-10-"),
        `Item "${item.title}" startsAt ${item.startsAt} must be in October 2026`,
      );
      if (item.endsAt) {
        assert.ok(
          item.endsAt.startsWith("2026-10-"),
          `Item "${item.title}" endsAt ${item.endsAt} must be in October 2026`,
        );
      }
    }

    // Venues are strictly Ground, Volleyball Court, Courtyard, or null (unassigned)
    const allowedVenues = new Set(["ground", "volleyball-court", "courtyard", null]);
    for (const item of OFFICIAL_OCTOBER_2026_SCHEDULE) {
      assert.ok(
        allowedVenues.has(item.venueKey),
        `Item "${item.title}" has unknown venue key ${item.venueKey}`,
      );
    }
  });

  await t.test("2. Preservation of Ambiguous & Unresolved Schedule Items", () => {
    // 1. Cross Barrick (8:20 AM - 7:00 AM)
    const crossBarrick = OFFICIAL_OCTOBER_2026_SCHEDULE.find((s) => s.title === "CROSS BARRICK");
    assert.ok(crossBarrick, "CROSS BARRICK must exist");
    assert.equal(crossBarrick.date, "2026-10-03");
    assert.ok(
      crossBarrick.notes?.includes("8:20 AM - 7:00 AM"),
      "Literal timing 8:20 AM - 7:00 AM must be preserved in notes",
    );

    // 2. Swimming & Football (TIME NOT PROVIDED — VENUE NOT PROVIDED)
    const swimFoot = OFFICIAL_OCTOBER_2026_SCHEDULE.find((s) => s.title.includes("Swimming & Football"));
    assert.ok(swimFoot, "Swimming & Football must exist");
    assert.equal(swimFoot.date, "2026-10-03");
    assert.equal(swimFoot.venueKey, null);
    assert.ok(
      swimFoot.notes?.includes("TIME NOT PROVIDED"),
      "Explicit 'TIME NOT PROVIDED' note must be preserved",
    );

    // 3. Breakfast (11-10-2026)
    const breakfast = OFFICIAL_OCTOBER_2026_SCHEDULE.find((s) => s.title === "BREAKFAST");
    assert.ok(breakfast, "BREAKFAST program must exist");
    assert.equal(breakfast.date, "2026-10-11");
    assert.equal(breakfast.venueKey, null);
    assert.ok(
      breakfast.notes?.includes("TIME NOT PROVIDED"),
      "Explicit 'TIME NOT PROVIDED' note must be preserved for breakfast",
    );

    // 4. Athletics Meet (18-10-2026)
    const athletics = OFFICIAL_OCTOBER_2026_SCHEDULE.find((s) => s.title === "ATHLETICS MEET");
    assert.ok(athletics, "ATHLETICS MEET must exist");
    assert.equal(athletics.date, "2026-10-18");
    assert.equal(athletics.venueKey, null);
    assert.ok(
      athletics.notes?.includes("TIME NOT PROVIDED"),
      "Explicit 'TIME NOT PROVIDED' note must be preserved for athletics meet",
    );
  });

  await t.test("3. Daily Slot Count Breakdown Verification", () => {
    const dayCounts = new Map<string, number>();
    for (const item of OFFICIAL_OCTOBER_2026_SCHEDULE) {
      dayCounts.set(item.date, (dayCounts.get(item.date) || 0) + 1);
    }

    assert.equal(dayCounts.get("2026-10-01"), 2);
    assert.equal(dayCounts.get("2026-10-02"), 2);
    assert.equal(dayCounts.get("2026-10-03"), 4);
    assert.equal(dayCounts.get("2026-10-04"), 4);
    assert.equal(dayCounts.get("2026-10-05"), 3);
    assert.equal(dayCounts.get("2026-10-06"), 3);
    assert.equal(dayCounts.get("2026-10-07"), 3);
    assert.equal(dayCounts.get("2026-10-08"), 3);
    assert.equal(dayCounts.get("2026-10-09"), 2);
    assert.equal(dayCounts.get("2026-10-10"), 5);
    assert.equal(dayCounts.get("2026-10-11"), 14); // Super Sunday
    assert.equal(dayCounts.get("2026-10-12"), 3);
    assert.equal(dayCounts.get("2026-10-13"), 2);
    assert.equal(dayCounts.get("2026-10-14"), 3);
    assert.equal(dayCounts.get("2026-10-15"), 4);
    assert.equal(dayCounts.get("2026-10-16"), 1);
    assert.equal(dayCounts.get("2026-10-18"), 1);
  });

  await t.test("4. Clash & Conflict Detection Logic", async () => {
    const venueId = "00000000-0000-0000-0000-000000000001";
    const festivalId = "913d3b7f-b01a-4034-814f-1f486014c7f5";

    // Mock client simulating an active slot at the venue
    const mockClient = {
      from: (_table: string) => ({
        select: (_cols: string) => ({
          eq: (_f1: string, _v1: any) => ({
            neq: (_f2: string, _v2: any) => Promise.resolve({
              data: [
                {
                  id: "slot-existing-1",
                  title: "CRICKET #1",
                  category: "GENERAL",
                  venue_id: venueId,
                  event_id: null,
                  starts_at: "2026-10-01T15:00:00.000Z",
                  ends_at: "2026-10-01T15:30:00.000Z",
                  status: "scheduled",
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    } as any;

    // Check conflict: overlapping time 15:15 - 15:45 at same venue
    const conflictResult = await checkScheduleConflict(
      mockClient,
      {
        festivalId,
        startsAt: "2026-10-01T15:15:00.000Z",
        endsAt: "2026-10-01T15:45:00.000Z",
        venueId,
      },
    );

    assert.equal(conflictResult.hasConflict, true);
    assert.equal(conflictResult.type, "venue");
    assert.equal(conflictResult.conflictingScheduleId, "slot-existing-1");
    assert.ok(
      conflictResult.message?.includes("CRICKET #1"),
      `Expected message to reference conflicting slot title, got: ${conflictResult.message}`,
    );

    // Non-overlapping time at same venue: 15:30 - 16:00
    const noConflictResult = await checkScheduleConflict(
      mockClient,
      {
        festivalId,
        startsAt: "2026-10-01T15:30:00.000Z",
        endsAt: "2026-10-01T16:00:00.000Z",
        venueId,
      },
    );
    assert.equal(noConflictResult.hasConflict, false);
  });

  await t.test("5. Program-level Schedule Slot Creation & Clash Override", async () => {
    let insertedPayload: any = null;

    const mockClient = {
      from: (table: string) => {
        if (table === "schedules") {
          return {
            insert: (payload: any) => {
              insertedPayload = payload;
              return {
                select: (_cols: string) => ({
                  single: () => Promise.resolve({
                    data: {
                      id: "new-slot-123",
                      ...payload,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                    error: null,
                  }),
                }),
              };
            },
          };
        }
        if (table === "schedule_change_entries") {
          return {
            insert: () => Promise.resolve({ error: null }),
          };
        }
        return {};
      },
    } as any;

    // Create program-level slot without eventId and with ignoreConflict
    const res = await createScheduleRecord(
      {
        festivalId: "913d3b7f-b01a-4034-814f-1f486014c7f5",
        title: "INAUGURAL CEREMONY & MARCH PAST",
        category: "CEREMONY",
        venueId: "00000000-0000-0000-0000-000000000001",
        startsAt: "2026-10-01T10:00:00.000Z",
        endsAt: "2026-10-01T11:00:00.000Z",
        status: "scheduled",
        notes: "Full campus assembly",
        ignoreConflict: true,
      },
      undefined,
      mockClient,
    );

    assert.equal(res.success, true);
    assert.equal(res.data?.id, "new-slot-123");
    assert.equal(insertedPayload.title, "INAUGURAL CEREMONY & MARCH PAST");
    assert.equal(insertedPayload.category, "CEREMONY");
    assert.equal(insertedPayload.event_id, null);
  });

  await t.test("6. Schedule Deletion with Audit History Logging", async () => {
    let deletedId: string | null = null;
    let auditEntry: any = null;

    const mockClient = {
      from: (table: string) => {
        if (table === "schedules") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({
                  data: {
                    id: "slot-to-delete",
                    festival_id: "fest-1",
                    title: "OLD SLOT",
                    category: "GENERAL",
                    venue_id: "v-1",
                    starts_at: "2026-10-01T15:00:00.000Z",
                    ends_at: "2026-10-01T15:30:00.000Z",
                    status: "scheduled",
                  },
                  error: null,
                }),
              }),
            }),
            delete: () => ({
              eq: (_col: string, id: string) => {
                deletedId = id;
                return Promise.resolve({ error: null });
              },
            }),
          };
        }
        if (table === "schedule_change_entries") {
          return {
            insert: (payload: any) => {
              auditEntry = payload;
              return Promise.resolve({ error: null });
            },
          };
        }
        return {};
      },
    } as any;

    const delRes = await deleteScheduleRecord(
      "slot-to-delete",
      "admin-user-uuid",
      "Administrative slot removal",
      mockClient,
    );

    assert.equal(delRes.success, true);
    assert.equal(deletedId, "slot-to-delete");
    assert.ok(auditEntry, "Audit history record must be created");
    assert.equal(auditEntry.schedule_id, "slot-to-delete");
    assert.equal(auditEntry.action, "deleted");
    assert.equal(auditEntry.reason, "Administrative slot removal");
    assert.equal(auditEntry.actor_id, "admin-user-uuid");
  });
});
