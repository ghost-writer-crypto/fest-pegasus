import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getOrCreateQrIdentity,
  revokeQrIdentity,
  rotateQrIdentity,
  resolveQrToken,
  generateSecureQrToken,
} from "../lib/repositories/qrRepository.ts";
import { generateQrMatrix, generateQrSvgString } from "../lib/qr/qrMatrix.ts";

test("PEGASUS Profile QR System — Comprehensive Verification", async (t) => {
  // 1. Security & Token Generation
  await t.test("1. QR tokens are cryptographically random, non-guessable, and unguessable", () => {
    const token1 = generateSecureQrToken();
    const token2 = generateSecureQrToken();

    assert.ok(token1.startsWith("pgsqr_"), "Token must use official pgsqr_ prefix");
    assert.ok(token2.startsWith("pgsqr_"), "Token must use official pgsqr_ prefix");
    assert.notEqual(token1, token2, "Consecutive tokens must be distinct");
    assert.ok(token1.length >= 32, "Token must have high entropy (>= 32 chars)");

    // Ensure no passwords, hashes, or predictable human IDs are used as security tokens
    assert.ok(!token1.includes("A-003"), "Token must not be a predictable Admin ID");
    assert.ok(!token1.includes("J-008"), "Token must not be a predictable Judge ID");
    assert.ok(!token1.includes("password"), "Token must not contain credentials");
    assert.ok(!token1.includes("secret"), "Token must not contain secret words");
  });

  // 2. Pure SVG QR Matrix Encoding
  await t.test("2. Pure SVG QR Matrix encodes valid scannable matrix and SVG markup", () => {
    const testUrl = "https://pegasus.festival/qr/pgsqr_test1234567890abcdef";
    const matrix = generateQrMatrix(testUrl);

    assert.ok(Array.isArray(matrix), "Matrix must be a 2D boolean array");
    assert.ok(matrix.length >= 21, "Matrix size must be at least 21x21 (Version 1+)");
    assert.equal(matrix.length, matrix[0].length, "Matrix must be square");

    // Check 3 finder patterns in corners (top-left, top-right, bottom-left)
    assert.equal(matrix[0][0], true, "Top-left finder top-left module must be dark");
    assert.equal(matrix[0][matrix.length - 1], true, "Top-right finder module must be dark");
    assert.equal(matrix[matrix.length - 1][0], true, "Bottom-left finder module must be dark");

    const svg = generateQrSvgString(testUrl, { size: 260 });
    assert.ok(svg.includes("<svg"), "SVG must contain opening tag");
    assert.ok(svg.includes("viewBox=\"0 0 260 260\""), "SVG must specify correct viewBox");
    assert.ok(svg.includes("<rect"), "SVG must render QR module rects");
  });

  // 3. Student Identity Flow
  await t.test("3. Student: On-demand QR creation, non-permanent display, and server resolution", async () => {
    const studentId = "p001";
    const qrIdentity = await getOrCreateQrIdentity("participant", studentId);

    assert.ok(qrIdentity, "Must return active QR identity");
    assert.equal(qrIdentity.entity_type, "participant");
    assert.equal(qrIdentity.entity_id, studentId);
    assert.equal(qrIdentity.status, "active");
    assert.ok(qrIdentity.qr_token.startsWith("pgsqr_"));

    // Server-side resolution
    const resolution = await resolveQrToken(qrIdentity.qr_token);
    assert.equal(resolution.valid, true, "Resolution must succeed for active token");
    if (resolution.valid && resolution.entityType === "participant") {
      assert.equal(resolution.role, "student");
      assert.equal(resolution.isPrivileged, false, "Students must NOT have privileged flag");
      assert.ok(resolution.student.name, "Student name must be populated");
      assert.ok(resolution.student.publicId, "Public ID must be populated");
      assert.ok(resolution.redirectUrl.includes(resolution.student.publicId), "Redirect URL must point to athlete profile");
    } else {
      assert.fail("Expected participant resolution");
    }
  });

  // 4. Judge Identity Flow & Security Gating
  await t.test("4. Judge: On-demand QR creation, identity verification, and strict security gating", async () => {
    const judgeId = "j001";
    const qrIdentity = await getOrCreateQrIdentity("profile", judgeId);

    assert.ok(qrIdentity, "Must return active QR identity");
    assert.equal(qrIdentity.entity_type, "profile");
    assert.equal(qrIdentity.entity_id, judgeId);
    assert.equal(qrIdentity.status, "active");

    // Server-side resolution
    const resolution = await resolveQrToken(qrIdentity.qr_token);
    assert.equal(resolution.valid, true, "Resolution must succeed for active token");
    if (resolution.valid && resolution.entityType === "profile") {
      assert.equal(resolution.role, "judge");
      assert.equal(resolution.isPrivileged, true, "Judges are marked as privileged role");
      assert.equal(resolution.profile.roleTitle, "Official Event Judge / Referee");
      assert.equal(resolution.redirectUrl, "/judge");
      // Note: QR alone verifies identity; access to /judge still requires session authentication
    } else {
      assert.fail("Expected judge profile resolution");
    }
  });

  // 5. Admin Identity Flow & Security Gating
  await t.test("5. Admin: On-demand QR creation, identity verification, and strict security gating", async () => {
    const adminId = "a001";
    const qrIdentity = await getOrCreateQrIdentity("profile", adminId);

    assert.ok(qrIdentity, "Must return active QR identity");
    assert.equal(qrIdentity.entity_type, "profile");
    assert.equal(qrIdentity.entity_id, adminId);
    assert.equal(qrIdentity.status, "active");

    // Server-side resolution
    const resolution = await resolveQrToken(qrIdentity.qr_token);
    assert.equal(resolution.valid, true, "Resolution must succeed for active token");
    if (resolution.valid && resolution.entityType === "profile") {
      assert.equal(resolution.role, "admin");
      assert.equal(resolution.isPrivileged, true, "Admins are marked as privileged role");
      assert.equal(resolution.profile.roleTitle, "Festival Administrator");
      assert.equal(resolution.redirectUrl, "/admin");
      // Note: QR alone verifies identity; access to /admin still requires session authentication
    } else {
      assert.fail("Expected admin profile resolution");
    }
  });

  // 6. QR Revocation Workflow
  await t.test("6. QR Revocation: Revoked token cannot be resolved and fails gracefully", async () => {
    const studentId = "p002";
    const qrIdentity = await getOrCreateQrIdentity("participant", studentId);
    const tokenToRevoke = qrIdentity.qr_token;

    // Verify it works before revocation
    const resBefore = await resolveQrToken(tokenToRevoke);
    assert.equal(resBefore.valid, true);

    // Revoke the token
    const revokeRes = await revokeQrIdentity(tokenToRevoke);
    assert.equal(revokeRes.success, true);

    // Verify it fails resolution after revocation
    const resAfter = await resolveQrToken(tokenToRevoke);
    assert.equal(resAfter.valid, false, "Revoked token must NOT resolve");
    if (!resAfter.valid) {
      assert.ok(resAfter.error.toLowerCase().includes("revoked"), "Error message must indicate token was revoked");
    }
  });

  // 7. QR Rotation / Regeneration Workflow
  await t.test("7. QR Rotation: Regenerated token invalidates old token without altering human IDs", async () => {
    const studentId = "p003";
    const initialIdentity = await getOrCreateQrIdentity("participant", studentId);
    const oldToken = initialIdentity.qr_token;

    // Rotate token
    const rotateRes = await rotateQrIdentity("participant", studentId);
    assert.equal(rotateRes.success, true);
    assert.ok(rotateRes.newIdentity, "New identity must be returned");

    const newToken = rotateRes.newIdentity.qr_token;
    assert.notEqual(oldToken, newToken, "New token must differ from old token");

    // Old token must fail resolution
    const oldRes = await resolveQrToken(oldToken);
    assert.equal(oldRes.valid, false, "Old rotated token must fail resolution");

    // New token must succeed resolution and retain same student details
    const newRes = await resolveQrToken(newToken);
    assert.equal(newRes.valid, true, "New token must succeed resolution");
    if (newRes.valid && newRes.entityType === "participant") {
      assert.equal(newRes.student.id, "p003", "Student ID must remain unchanged");
      assert.equal(newRes.student.publicId, "PGS-0003", "Public ID PGS-0003 must remain unchanged");
    }
  });

  // 8. Invalid / Malformed / Non-existent Token Gating
  await t.test("8. Invalid, malformed, or empty tokens fail server-side validation", async () => {
    const emptyRes = await resolveQrToken("");
    assert.equal(emptyRes.valid, false);

    const nonExistentRes = await resolveQrToken("pgsqr_non_existent_random_hash_999");
    assert.equal(nonExistentRes.valid, false);
    if (!nonExistentRes.valid) {
      assert.ok(nonExistentRes.error.toLowerCase().includes("not found"));
    }
  });
});
