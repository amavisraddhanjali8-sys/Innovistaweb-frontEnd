import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ADMIN_SECRET_KEY,
  buildAuditLogsCsv,
  buildTotpOtpAuthUri,
  classifyAccountStatus,
  decryptSecret,
  encryptSecret,
  generateAdminSecretKey,
  generateCaptchaChallenge,
  generateTotpCode,
  generateTotpSecret,
  hashPassword,
  issueSignedToken,
  maskAdminSecretKey,
  normalizeCaptchaAnswer,
  parseCaptchaChallengeMeta,
  sanitizeCsvCell,
  sha256Hex,
  validateAdminSecretKeyFormat,
  validatePasswordStrength,
  verifyAdminSecretKeyInput,
  verifyCaptchaSecurityPayload,
  verifyPassword,
  verifyPowSolution,
  verifySignedToken,
  verifyTotpCode,
} from "./securityHelpers.ts";
import { solvePowChallenge } from "../../frontend/src/utils/botShieldClient.ts";

describe("securityHelpers", () => {
  it("hashes and verifies passwords with scrypt while rejecting weak defaults", () => {
    assert.equal(validatePasswordStrength("admin123").valid, false);
    assert.equal(validatePasswordStrength("short1").valid, false);
    assert.equal(validatePasswordStrength("StrongPass2026!").valid, true);

    const hash = hashPassword("StrongPass2026!");
    assert.ok(hash.startsWith("scrypt$"));
    assert.equal(verifyPassword("StrongPass2026!", hash), true);
    assert.equal(verifyPassword("WrongPass2026!", hash), false);
    assert.equal(verifyPassword("admin123", hash), false);
  });

  it("encrypts and decrypts TOTP secrets cleanly with AES-256-GCM", () => {
    const secret = generateTotpSecret();
    const cipher = encryptSecret(secret);
    assert.notEqual(cipher, secret);
    assert.equal(decryptSecret(cipher), secret);
    assert.equal(decryptSecret("tampered:data:here"), null);
  });

  it("issues and verifies signed session tokens and rejects expired or tampered tokens", () => {
    const token = issueSignedToken(
      {
        sub: 42,
        uid: "admin-42",
        email: "ops@innovista.com",
        role: "admin",
        tokenType: "access",
        mfaVerified: true,
      },
      300
    );
    const decoded = verifySignedToken(token);
    assert.ok(decoded);
    assert.equal(decoded?.sub, 42);
    assert.equal(decoded?.email, "ops@innovista.com");
    assert.equal(decoded?.mfaVerified, true);

    const tampered = `${token.slice(0, -4)}XXXX`;
    assert.equal(verifySignedToken(tampered), null);

    const expired = issueSignedToken(
      {
        sub: 42,
        uid: "admin-42",
        email: "ops@innovista.com",
        role: "admin",
        tokenType: "access",
      },
      -10
    );
    assert.equal(verifySignedToken(expired), null);
  });

  it("generates and verifies Google Authenticator TOTP codes within 30s window", () => {
    const secret = generateTotpSecret();
    const now = 1_760_000_000_000;
    const code = generateTotpCode(secret, now);
    assert.match(code, /^\d{6}$/);
    assert.equal(verifyTotpCode(secret, code, now), true);
    assert.equal(verifyTotpCode(secret, code, now + 30_000, 1), true);
    assert.equal(verifyTotpCode(secret, "000000", now + 120_000, 0), false);

    const uri = buildTotpOtpAuthUri({ secret, email: "security@innovista.com" });
    assert.ok(uri.startsWith("otpauth://totp/"));
    assert.ok(uri.includes(secret));
  });

  it("accurately classifies verified admin, unverified admin, verified client, unverified client, suspended, and not created", () => {
    assert.equal(classifyAccountStatus(null).statusCode, "NOT_FOUND");
    assert.equal(classifyAccountStatus(null).exists, false);

    const verifiedAdmin = classifyAccountStatus({
      id: 1,
      uid: "a1",
      name: "Root Admin",
      email: "root@innovista.com",
      role: "admin",
      isVerified: true,
      emailVerified: true,
      accountStatus: "ACTIVE",
      totpEnabled: true,
    });
    assert.equal(verifiedAdmin.statusCode, "VERIFIED_ADMIN");
    assert.equal(verifiedAdmin.mfaRequired, true);
    assert.equal(verifiedAdmin.canLogin, true);

    const unverifiedAdmin = classifyAccountStatus({
      id: 2,
      uid: "a2",
      name: "Pending Admin",
      email: "newadmin@innovista.com",
      role: "admin",
      isVerified: true,
      emailVerified: false,
      accountStatus: "ACTIVE",
      totpEnabled: false,
    });
    assert.equal(unverifiedAdmin.statusCode, "UNVERIFIED_ADMIN");

    const unverifiedClient = classifyAccountStatus({
      id: 3,
      uid: "c1",
      name: "New Buyer",
      email: "buyer@architecture.lk",
      role: "customer",
      isVerified: false,
      emailVerified: false,
      accountStatus: "ACTIVE",
    });
    assert.equal(unverifiedClient.statusCode, "UNVERIFIED_CLIENT");
    assert.equal(unverifiedClient.canLogin, true);

    const verifiedClient = classifyAccountStatus({
      id: 4,
      uid: "c2",
      name: "Verified Buyer",
      email: "verified@architecture.lk",
      role: "customer",
      isVerified: true,
      emailVerified: true,
      accountStatus: "ACTIVE",
    });
    assert.equal(verifiedClient.statusCode, "VERIFIED_CLIENT");

    const suspendedClient = classifyAccountStatus({
      id: 5,
      uid: "c3",
      name: "Blocked Buyer",
      email: "blocked@architecture.lk",
      role: "customer",
      isVerified: true,
      emailVerified: true,
      accountStatus: "SUSPENDED",
    });
    assert.equal(suspendedClient.statusCode, "SUSPENDED_CLIENT");
    assert.equal(suspendedClient.canLogin, false);
  });

  it("generates hardened distorted SVG CAPTCHA challenges, validates PoW + anti-bot layers, and builds CSV audit reports", async () => {
    const cap = generateCaptchaChallenge();
    assert.equal(cap.code.length, 7);
    assert.ok(cap.svgMarkup.includes("<svg"));
    assert.ok(cap.svgMarkup.includes("<feTurbulence"));
    assert.ok(cap.svgMarkup.includes("<feDisplacementMap"));
    assert.ok(cap.svgMarkup.includes("skewX("));
    assert.ok(cap.powSalt.length >= 16);
    assert.equal(cap.powDifficulty, 3);

    // Solve client Proof-of-Work and verify against server check
    const solved = await solvePowChallenge(cap.powSalt, cap.powDifficulty);
    assert.ok(solved.hash.startsWith("000"));
    assert.equal(verifyPowSolution(cap.powSalt, solved.nonce, cap.powDifficulty), true);
    assert.equal(verifyPowSolution(cap.powSalt, "invalid-nonce", cap.powDifficulty), false);

    const challengeId = "challenge-test-1";
    const expectedHash = sha256Hex(`${challengeId}:${normalizeCaptchaAnswer(cap.code)}`);
    const meta = parseCaptchaChallengeMeta(
      JSON.stringify({ powSalt: cap.powSalt, powDifficulty: cap.powDifficulty, minDwellMs: cap.minDwellMs })
    );
    assert.ok(meta);

    // 1) Reject honeypot bot trap
    const honeypotFail = verifyCaptchaSecurityPayload({
      challengeId,
      challengeCreatedAtMs: 1000,
      expectedAnswerHash: expectedHash,
      storedMeta: meta,
      submittedAnswer: cap.code,
      submittedPowNonce: solved.nonce,
      honeypot: "https://spambot.example",
      telemetry: { humanShieldVerified: true, pointerCount: 2, keyCount: 7 },
      nowMs: 5000,
    });
    assert.equal(honeypotFail.ok, false);
    if (!honeypotFail.ok) {
      assert.equal(honeypotFail.reason, "BOT_HONEYPOT");
      assert.equal(honeypotFail.burnChallenge, true);
    }

    // 2) Reject instantaneous bot submission (< minDwellMs)
    const fastBotFail = verifyCaptchaSecurityPayload({
      challengeId,
      challengeCreatedAtMs: 1000,
      expectedAnswerHash: expectedHash,
      storedMeta: meta,
      submittedAnswer: cap.code,
      submittedPowNonce: solved.nonce,
      honeypot: "",
      telemetry: { humanShieldVerified: true, pointerCount: 1, keyCount: 7 },
      nowMs: 1400,
    });
    assert.equal(fastBotFail.ok, false);
    if (!fastBotFail.ok) {
      assert.equal(fastBotFail.reason, "BOT_TIMING_TOO_FAST");
      assert.equal(fastBotFail.burnChallenge, true);
    }

    // 3) Reject missing Human Shield interaction
    const noShieldFail = verifyCaptchaSecurityPayload({
      challengeId,
      challengeCreatedAtMs: 1000,
      expectedAnswerHash: expectedHash,
      storedMeta: meta,
      submittedAnswer: cap.code,
      submittedPowNonce: solved.nonce,
      honeypot: "",
      telemetry: { humanShieldVerified: false, pointerCount: 0, keyCount: 0 },
      nowMs: 5000,
    });
    assert.equal(noShieldFail.ok, false);
    if (!noShieldFail.ok) assert.equal(noShieldFail.reason, "BOT_SHIELD_REQUIRED");

    // 4) Reject forged Proof-of-Work nonce
    const badPowFail = verifyCaptchaSecurityPayload({
      challengeId,
      challengeCreatedAtMs: 1000,
      expectedAnswerHash: expectedHash,
      storedMeta: meta,
      submittedAnswer: cap.code,
      submittedPowNonce: "forged-000",
      honeypot: "",
      telemetry: { humanShieldVerified: true, pointerCount: 2, keyCount: 7 },
      nowMs: 5000,
    });
    assert.equal(badPowFail.ok, false);
    if (!badPowFail.ok) {
      assert.equal(badPowFail.reason, "BOT_POW_FAILED");
      assert.equal(badPowFail.burnChallenge, true);
    }

    // 5) Reject wrong CAPTCHA answer even with valid PoW
    const badCodeFail = verifyCaptchaSecurityPayload({
      challengeId,
      challengeCreatedAtMs: 1000,
      expectedAnswerHash: expectedHash,
      storedMeta: meta,
      submittedAnswer: "WRONG99",
      submittedPowNonce: solved.nonce,
      honeypot: "",
      telemetry: { humanShieldVerified: true, pointerCount: 2, keyCount: 7 },
      nowMs: 5000,
    });
    assert.equal(badCodeFail.ok, false);
    if (!badCodeFail.ok) assert.equal(badCodeFail.reason, "CAPTCHA_MISMATCH");

    // 6) Pass when all 6 defense layers succeed (case-insensitive code entry)
    const validPass = verifyCaptchaSecurityPayload({
      challengeId,
      challengeCreatedAtMs: 1000,
      expectedAnswerHash: expectedHash,
      storedMeta: meta,
      submittedAnswer: cap.code.toLowerCase(),
      submittedPowNonce: solved.nonce,
      honeypot: "",
      telemetry: { humanShieldVerified: true, pointerCount: 2, keyCount: 7 },
      nowMs: 5000,
    });
    assert.deepEqual(validPass, { ok: true });

    assert.equal(sanitizeCsvCell("=cmd|' /C calc'!A0"), "\"'=cmd|' /C calc'!A0\"");
    const csv = buildAuditLogsCsv([
      {
        eventId: "EVT-1",
        createdAt: "2026-11-14T12:00:00.000Z",
        category: "AUTH",
        action: "LOGIN_SUCCESS",
        status: "SUCCESS",
        severity: "LOW",
        actorUserId: 1,
        actorEmail: "ops@innovista.com",
        actorRole: "admin",
        details: 'Verified "Admin" login',
        metadata: { mfa: true },
      },
    ]);
    assert.ok(csv.includes('"Event ID","Timestamp (UTC)"'));
    assert.ok(csv.includes('"Verified ""Admin"" login"'));
  });

  it("manages default and recreated Admin Secret Keys securely with constant-time comparison", () => {
    assert.equal(DEFAULT_ADMIN_SECRET_KEY, "A9HF-4K28@");
    assert.equal(verifyAdminSecretKeyInput("A9HF-4K28@", DEFAULT_ADMIN_SECRET_KEY), true);
    assert.equal(verifyAdminSecretKeyInput("  A9HF-4K28@  ", DEFAULT_ADMIN_SECRET_KEY), true);
    assert.equal(verifyAdminSecretKeyInput("WRONG-KEY@", DEFAULT_ADMIN_SECRET_KEY), false);
    assert.equal(verifyAdminSecretKeyInput("", DEFAULT_ADMIN_SECRET_KEY), false);

    const generated = generateAdminSecretKey();
    assert.match(generated, /^[A-Z2-9]{4}-[A-Z2-9]{4}@$/);
    assert.equal(verifyAdminSecretKeyInput(generated, generated), true);
    assert.equal(verifyAdminSecretKeyInput(DEFAULT_ADMIN_SECRET_KEY, generated), false);

    assert.equal(validateAdminSecretKeyFormat("").valid, false);
    assert.equal(validateAdminSecretKeyFormat("12345").valid, false);
    assert.equal(validateAdminSecretKeyFormat("ABC DEF").valid, false);
    assert.deepEqual(validateAdminSecretKeyFormat(" A9HF-4K28@ "), {
      valid: true,
      normalized: "A9HF-4K28@",
    });

    assert.equal(maskAdminSecretKey("A9HF-4K28@"), "A9••••••8@");
  });
});
