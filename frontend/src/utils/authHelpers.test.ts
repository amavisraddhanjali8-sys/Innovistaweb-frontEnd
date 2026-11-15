import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAdminEmail,
  resolvePostAuthRoute,
  validateLoginInput,
  validateSignupInput,
  buildSignupRedirectUrl,
  getAuthModeFromSearch,
  getAuthActionFromSearch,
  parsePostAuthRedirect,
} from "./authHelpers.ts";

describe("authHelpers", () => {
  it("routes @innovista.com emails to admin and others to customer", () => {
    assert.equal(isAdminEmail("security@innovista.com"), true);
    assert.equal(isAdminEmail("  STAFF@INNOVISTA.COM "), true);
    assert.equal(isAdminEmail("client@architecture.lk"), false);
    assert.equal(isAdminEmail("client_handle"), false);
  });

  it("resolves destination routes by role", () => {
    assert.equal(resolvePostAuthRoute("admin"), "/admin-home");
    assert.equal(resolvePostAuthRoute("customer"), "/profile");
  });

  it("validates login identifier, password, and optional CAPTCHA input", () => {
    assert.equal(validateLoginInput("", "Passw0rd!").valid, false);
    assert.equal(validateLoginInput("user@site.com", "   ").valid, false);
    assert.deepEqual(validateLoginInput("EMP-001", "admin297333"), { valid: true });
    assert.equal(validateLoginInput("user@site.com", "Passw0rd!", "").valid, false);
    assert.deepEqual(validateLoginInput("user_id_10", "Passw0rd!", "7K4M9Q"), {
      valid: true,
    });
  });

  it("validates signup fields including email, optional username, and strong password", () => {
    const invalid = validateSignupInput({
      name: "",
      username: "x",
      company: "Studio",
      email: "not-an-email",
      phone: "",
      password: "weak",
    });
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.name);
    assert.ok(invalid.errors.username);
    assert.ok(invalid.errors.email);
    assert.ok(invalid.errors.phone);
    assert.ok(invalid.errors.password);

    const valid = validateSignupInput({
      name: "Nadeesha Silva",
      username: "nadeesha.silva",
      company: "Lanka GlassWorks",
      email: "nadeesha@glassworks.lk",
      phone: "+94 77 555 8899",
      password: "SecurePass2026",
    });
    assert.equal(valid.valid, true);
    assert.deepEqual(valid.errors, {});
  });

  it("builds signup redirect URLs and parses modes, actions, and safe redirects", () => {
    const url = buildSignupRedirectUrl("/products/1?view=specs", "cart");
    assert.equal(
      url,
      "/profile-login?mode=signup&redirect=%2Fproducts%2F1%3Fview%3Dspecs&action=cart"
    );

    assert.equal(getAuthModeFromSearch("?mode=signup&action=quote"), "signup");
    assert.equal(getAuthModeFromSearch("?mode=login"), "login");
    assert.equal(getAuthActionFromSearch("?mode=signup&action=rfq"), "rfq");
    assert.equal(getAuthActionFromSearch("?mode=signup&action=unknown"), null);

    assert.equal(
      parsePostAuthRedirect("?redirect=%2Frequest-quote%3Fproduct%3DDoor", "customer"),
      "/request-quote?product=Door"
    );
    assert.equal(parsePostAuthRedirect("?redirect=https://evil.com", "customer"), "/profile");
    assert.equal(parsePostAuthRedirect("?redirect=//evil.com", "customer"), "/profile");
    assert.equal(parsePostAuthRedirect("?redirect=/profile-login", "customer"), "/profile");
    assert.equal(parsePostAuthRedirect("", "admin"), "/admin-home");
  });
});
