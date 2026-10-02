import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { getSportsByFestival, getSportById } from "../lib/repositories/sportRepository.ts";
import { getEventsByFestival, getEventById } from "../lib/repositories/eventRepository.ts";

test("PEGASUS Admin Sports & Events Data-Source Verification", async (t) => {
  await t.test("1. Admin pages strictly decoupled from @/data/sports and @/data/events", () => {
    const sportsPagePath = path.resolve(process.cwd(), "app/admin/sports/page.tsx");
    const eventsPagePath = path.resolve(process.cwd(), "app/admin/events/page.tsx");

    const sportsPageContent = fs.readFileSync(sportsPagePath, "utf8");
    const eventsPageContent = fs.readFileSync(eventsPagePath, "utf8");

    // Must NOT import from @/data/sports or @/data/events
    assert.ok(
      !sportsPageContent.includes("@/data/sports"),
      "Admin Sports page must not import @/data/sports",
    );
    assert.ok(
      !sportsPageContent.includes("@/data/events"),
      "Admin Sports page must not import @/data/events",
    );
    assert.ok(
      !eventsPageContent.includes("@/data/sports"),
      "Admin Events page must not import @/data/sports",
    );
    assert.ok(
      !eventsPageContent.includes("@/data/events"),
      "Admin Events page must not import @/data/events",
    );

    // Must import from repository layer
    assert.ok(
      sportsPageContent.includes("@/lib/repositories"),
      "Admin Sports page must import from @/lib/repositories",
    );
    assert.ok(
      eventsPageContent.includes("@/lib/repositories"),
      "Admin Events page must import from @/lib/repositories",
    );
    assert.ok(
      sportsPageContent.includes("getSportsByFestival"),
      "Admin Sports page must call getSportsByFestival",
    );
    assert.ok(
      eventsPageContent.includes("getEventsByFestival"),
      "Admin Events page must call getEventsByFestival",
    );
  });

  await t.test("2. Sport repository exports and function signatures", () => {
    assert.equal(typeof getSportsByFestival, "function");
    assert.equal(typeof getSportById, "function");
    assert.equal(typeof getEventsByFestival, "function");
    assert.equal(typeof getEventById, "function");
  });

  await t.test("3. Remote Supabase data read validation", async () => {
    // If Supabase env vars are set, verify live reads
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ) {
      const festivalId = "913d3b7f-b01a-4034-814f-1f486014c7f5";
      const sports = await getSportsByFestival(festivalId);
      const events = await getEventsByFestival(festivalId);

      assert.ok(Array.isArray(sports), "Sports must be an array");
      assert.ok(Array.isArray(events), "Events must be an array");

      assert.equal(sports.length, 6, `Expected 6 sports in remote DB, got ${sports.length}`);
      assert.equal(events.length, 7, `Expected 7 events in remote DB, got ${events.length}`);

      const sportSlugs = sports.map((s) => s.slug).sort();
      assert.deepEqual(sportSlugs, [
        "athletics",
        "basketball",
        "cricket",
        "football",
        "tug-of-war",
        "volleyball",
      ]);

      // Every event must reference an existing sport
      const sportIds = new Set(sports.map((s) => s.id));
      for (const ev of events) {
        assert.ok(
          sportIds.has(ev.sport_id),
          `Event ${ev.code} sport_id ${ev.sport_id} must exist in sports table`,
        );
      }
    }
  });
});
