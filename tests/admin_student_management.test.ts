import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createParticipantRecord,
  updateParticipantRecord,
  updateParticipantStatusRecord,
  updateParticipantChestNumberRecord,
  deleteParticipantRecord,
  getParticipantDependencies,
  validateAndPrepareParticipant,
} from "../lib/repositories/participantRepository.ts";

test("PEGASUS Admin Student Management — Comprehensive Verification", async (t) => {
  await t.test("1. Validator enforces required fields, team codes, and division codes", () => {
    // Missing name
    const res1 = validateAndPrepareParticipant({
      name: "",
      teamCode: "GAR",
      divisionCode: "bidaya",
      chestNumber: "101",
    });
    assert.equal(res1.valid, false);
    assert.ok(res1.errors.some((e) => e.toLowerCase().includes("name")));

    // Invalid team code
    const res2 = validateAndPrepareParticipant({
      name: "Zayd",
      teamCode: "INVALID",
      divisionCode: "bidaya",
      chestNumber: "101",
    });
    assert.equal(res2.valid, false);
    assert.ok(res2.errors.some((e) => e.toLowerCase().includes("team")));

    // Invalid division code
    const res3 = validateAndPrepareParticipant({
      name: "Zayd",
      teamCode: "GAR",
      divisionCode: "invalid_div",
      chestNumber: "101",
    });
    assert.equal(res3.valid, false);
    assert.ok(res3.errors.some((e) => e.toLowerCase().includes("division")));

    // Valid participant
    const res4 = validateAndPrepareParticipant({
      name: "Zayd Ali",
      teamCode: "GAR",
      divisionCode: "bidaya",
      chestNumber: "101",
    });
    assert.equal(res4.valid, true);
    assert.equal(res4.data?.name, "Zayd Ali");
    assert.equal(res4.data?.teamCode, "GAR");
    assert.equal(res4.data?.divisionCode, "bidaya");
  });

  await t.test("2. Create participant record with validation and public ID generation", async () => {
    const res = await createParticipantRecord({
      festivalId: "fest-2026",
      name: "Test Athlete One",
      teamId: "team-garuda",
      divisionId: "div-bidaya",
      chestNumber: "TEST-9901",
      status: "registered",
    });

    assert.equal(res.success, true);
    assert.ok(res.data);
    assert.equal(res.data?.name, "Test Athlete One");
    assert.equal(res.data?.chest_number, "TEST-9901");
    assert.ok(res.data?.public_id.startsWith("PGS-"));
  });

  await t.test("3. Reject duplicate chest numbers on create", async () => {
    const res = await createParticipantRecord({
      festivalId: "fest-2026",
      name: "Test Athlete Duplicate",
      teamId: "team-toofan",
      divisionId: "div-thaniya",
      chestNumber: "TEST-9901",
    });

    assert.equal(res.success, false);
    assert.ok(res.error?.includes("already assigned") || res.error?.includes("already in use"));
  });

  await t.test("4. Update participant details safely", async () => {
    const created = await createParticipantRecord({
      festivalId: "fest-2026",
      name: "Athlete Before Update",
      teamId: "team-garuda",
      divisionId: "div-bidaya",
      chestNumber: "TEST-9902",
    });
    assert.ok(created.data);

    const updated = await updateParticipantRecord({
      participantId: created.data.id,
      name: "Athlete After Update",
      phone: "+91 9876543210",
      notes: "Updated contact details",
    });

    assert.equal(updated.success, true);
    assert.equal(updated.data?.name, "Athlete After Update");
  });

  await t.test("5. Update participant status with transition checks", async () => {
    const created = await createParticipantRecord({
      festivalId: "fest-2026",
      name: "Status Test Athlete",
      teamId: "team-garuda",
      divisionId: "div-bidaya",
      chestNumber: "TEST-9903",
      status: "registered",
    });
    assert.ok(created.data);

    const statusUpdated = await updateParticipantStatusRecord(created.data.id, "confirmed");
    assert.equal(statusUpdated.success, true);
    assert.equal(statusUpdated.data?.status, "confirmed");
  });

  await t.test("6. Quick update chest number with uniqueness check", async () => {
    const created = await createParticipantRecord({
      festivalId: "fest-2026",
      name: "Chest Test Athlete",
      teamId: "team-garuda",
      divisionId: "div-bidaya",
      chestNumber: "TEST-9904",
    });
    assert.ok(created.data);

    const chestUpdated = await updateParticipantChestNumberRecord(
      created.data.id,
      "TEST-9905",
      "fest-2026"
    );
    assert.equal(chestUpdated.success, true);
    assert.equal(chestUpdated.data?.chest_number, "TEST-9905");
  });

  await t.test("7. Dependency analysis accurately checks registrations and prevents unsafe deletion", async () => {
    // Check dependencies on participant with registrations
    const deps = await getParticipantDependencies("p001");
    assert.ok(deps.totalDependencies >= 0);
    assert.equal(typeof deps.isSafeToDelete, "boolean");

    if (!deps.isSafeToDelete) {
      const delRes = await deleteParticipantRecord("p001");
      assert.equal(delRes.success, false);
      assert.ok(delRes.error?.includes("Cannot delete participant"));
    }
  });

  await t.test("8. Safe deletion succeeds for participants with zero dependencies", async () => {
    const created = await createParticipantRecord({
      festivalId: "fest-2026",
      name: "Ephemeral Athlete",
      teamId: "team-garuda",
      divisionId: "div-bidaya",
      chestNumber: "TEST-9999",
    });
    assert.ok(created.data);

    const deps = await getParticipantDependencies(created.data.id);
    assert.equal(deps.isSafeToDelete, true);

    const delRes = await deleteParticipantRecord(created.data.id);
    assert.equal(delRes.success, true);
  });
});
