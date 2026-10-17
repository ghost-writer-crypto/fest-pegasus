import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CODEX_DIVISIONS,
  CATEGORY_MAP,
  REVERSE_CATEGORY_MAP,
  getConfirmedCategoryDisplayName,
} from "../lib/competition/divisions.ts";
import { validateEventEligibility } from "../lib/competition/eligibility.ts";
import { CODEX_QUOTAS } from "../lib/competition/quotaEngine.ts";

describe("ZENITHROW 26 — Confirmed Category Mapping & Eligibility Engine", () => {
  it("verifies the 5 organizer-approved category mappings", () => {
    assert.equal(CATEGORY_MAP.bidaya, "Sub Junior");
    assert.equal(CATEGORY_MAP.thaniya, "Junior");
    assert.equal(CATEGORY_MAP.thamheediyya, "Pre Senior");
    assert.equal(CATEGORY_MAP.aliya, "Senior");
    assert.equal(CATEGORY_MAP.majestir, "Super Senior");

    assert.equal(REVERSE_CATEGORY_MAP["sub junior"], "bidaya");
    assert.equal(REVERSE_CATEGORY_MAP["junior"], "thaniya");
    assert.equal(REVERSE_CATEGORY_MAP["pre senior"], "thamheediyya");
    assert.equal(REVERSE_CATEGORY_MAP["senior"], "aliya");
    assert.equal(REVERSE_CATEGORY_MAP["super senior"], "majestir");

    assert.equal(getConfirmedCategoryDisplayName("bidaya"), "Sub Junior");
    assert.equal(getConfirmedCategoryDisplayName("thaniya"), "Junior");
    assert.equal(getConfirmedCategoryDisplayName("thamheediyya"), "Pre Senior");
    assert.equal(getConfirmedCategoryDisplayName("aliya"), "Senior");
    assert.equal(getConfirmedCategoryDisplayName("majestir"), "Super Senior");

    // Case-insensitivity & reverse mappings
    assert.equal(getConfirmedCategoryDisplayName("Sub Junior"), "Sub Junior");
    assert.equal(getConfirmedCategoryDisplayName("sub-junior"), "Sub Junior");
    assert.equal(getConfirmedCategoryDisplayName("Junior"), "Junior");
    assert.equal(getConfirmedCategoryDisplayName("Pre Senior"), "Pre Senior");
    assert.equal(getConfirmedCategoryDisplayName("Senior"), "Senior");
    assert.equal(getConfirmedCategoryDisplayName("Super Senior"), "Super Senior");
  });

  it("ensures there are exactly 5 confirmed categories, not 10 duplicate categories", () => {
    assert.equal(CODEX_DIVISIONS.length, 5);
    const codes = CODEX_DIVISIONS.map((d) => d.id).sort();
    assert.deepEqual(codes, ["aliya", "bidaya", "majestir", "thamheediyya", "thaniya"]);

    const levels = CODEX_DIVISIONS.map((d) => d.level).sort();
    assert.deepEqual(levels, ["Junior", "Pre Senior", "Senior", "Sub Junior", "Super Senior"]);
  });

  it("enforces swimming restriction: Bidaya / Sub Junior is NOT eligible for swimming", () => {
    // Quotas in CODEX_QUOTAS for swimming
    const swimmingQuotas = CODEX_QUOTAS.filter((q) => q.eventId === "swimming");
    const allowedDivisions = swimmingQuotas.map((q) => q.divisionId);

    // Swimming must exist for Majestir, Aliya, Thamheediyya, Thaniya
    assert.ok(allowedDivisions.includes("majestir"), "Majestir must have swimming quota");
    assert.ok(allowedDivisions.includes("aliya"), "Aliya must have swimming quota");
    assert.ok(allowedDivisions.includes("thamheediyya"), "Thamheediyya must have swimming quota");
    assert.ok(allowedDivisions.includes("thaniya"), "Thaniya must have swimming quota");

    // Bidaya must NOT be in swimming quotas
    assert.ok(!allowedDivisions.includes("bidaya"), "Bidaya / Sub Junior MUST NOT be eligible for swimming");

    // Domain eligibility engine check
    const eligibleEventDivisions = ["majestir", "aliya", "thamheediyya", "thaniya"];

    // Bidaya participant attempting swimming
    const bidayaCheck = validateEventEligibility("bidaya", eligibleEventDivisions);
    assert.equal(bidayaCheck.isEligible, false, "Bidaya student must be rejected for swimming");
    assert.ok(bidayaCheck.reason?.includes("does not match"));

    // Thaniya participant attempting swimming
    const thaniyaCheck = validateEventEligibility("thaniya", eligibleEventDivisions);
    assert.equal(thaniyaCheck.isEligible, true, "Thaniya student must be eligible for swimming");
  });

  it("permits entry into General events without altering student's base category", () => {
    // General event has empty division restrictions
    const generalEventDivisions: string[] = [];

    const bidayaGeneral = validateEventEligibility("bidaya", generalEventDivisions);
    assert.equal(bidayaGeneral.isEligible, true);
    assert.equal(bidayaGeneral.isGeneral, true);

    const majestirGeneral = validateEventEligibility("majestir", generalEventDivisions);
    assert.equal(majestirGeneral.isEligible, true);
    assert.equal(majestirGeneral.isGeneral, true);
  });

  it("strictly forbids cross-category entry between non-general events", () => {
    const aliyaOnlyEvent = ["aliya"];
    const subJuniorStudent = "bidaya";

    const crossEntry = validateEventEligibility(subJuniorStudent, aliyaOnlyEvent);
    assert.equal(crossEntry.isEligible, false, "Cross-category entry must be blocked");
  });
});
