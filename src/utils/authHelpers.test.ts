import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isAdminEmail,
  resolvePostAuthRoute,
  validateLoginInput,
  validateSignupInput,
  getDemoAccountCredentials,
  buildSignupRedirectUrl,
  getAuthModeFromSearch,
  getAuthActionFromSearch,
  parsePostAuthRedirect,
} from "./authHelpers";

describe("authHelpers", () => {
  it("routes @innovista.com emails to admin and others to customer", () => {
    assert.equal(isAdminEmail("admin@innovista.com"), true);
    assert.equal(isAdminEmail("  STAFF@INNOVISTA.COM "), true);
    assert.equal(isAdminEmail("duminda@zenithcapital.lk"), false);
    assert.equal(isAdminEmail("+94 77 123 4567"), false);
  });

  it("resolves destination routes by role", () => {
    assert.equal(resolvePostAuthRoute("admin"), "/admin-home");
    assert.equal(resolvePostAuthRoute("customer"), "/profile");
  });

  it("validates login identifier and password", () => {
    assert.equal(validateLoginInput("", "123456").valid, false);
    assert.equal(validateLoginInput("user@site.com", "   ").valid, false);
    assert.deepEqual(validateLoginInput("duminda@zenithcapital.lk", "customer123"), {
      valid: true,
    });
  });

  it("validates signup fields including email format and password length", () => {
    const invalid = validateSignupInput({
      name: "",
      company: "Studio",
      email: "not-an-email",
      phone: "",
      password: "123",
    });
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.name);
    assert.ok(invalid.errors.email);
    assert.ok(invalid.errors.phone);
    assert.ok(invalid.errors.password);

    const valid = validateSignupInput({
      name: "Nadeesha Silva",
      company: "Lanka GlassWorks",
      email: "nadeesha@glassworks.lk",
      phone: "+94 77 555 8899",
      password: "secret123",
    });
    assert.equal(valid.valid, true);
    assert.deepEqual(valid.errors, {});
  });

  it("returns expected demo credentials", () => {
    const client = getDemoAccountCredentials("client");
    assert.equal(client.role, "customer");
    assert.equal(client.email, "duminda@zenithcapital.lk");

    const admin = getDemoAccountCredentials("admin");
    assert.equal(admin.role, "admin");
    assert.equal(admin.email, "admin@innovista.com");
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
    // Reject external / protocol-relative open redirects and login loops
    assert.equal(parsePostAuthRedirect("?redirect=https://evil.com", "customer"), "/profile");
    assert.equal(parsePostAuthRedirect("?redirect=//evil.com", "customer"), "/profile");
    assert.equal(parsePostAuthRedirect("?redirect=/profile-login", "customer"), "/profile");
    assert.equal(parsePostAuthRedirect("", "admin"), "/admin-home");
  });
});
