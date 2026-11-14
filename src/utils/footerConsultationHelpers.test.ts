import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SITE_CONTACT_SETTINGS,
  FOOTER_LINK_COLUMNS,
  buildFooterConsultationPayload,
  createInitialFooterConsultationValues,
  formatTelHref,
  formatWhatsAppHref,
  isFooterConsultationValid,
  normalizeSiteContactSettings,
  validateFooterConsultation,
  validateSiteContactSettings,
} from "./footerConsultationHelpers";

test("footer navigation columns expose valid internal routes without placeholder items", () => {
  assert.equal(FOOTER_LINK_COLUMNS.length, 3);
  for (const col of FOOTER_LINK_COLUMNS) {
    assert.ok(col.items.length >= 4);
    for (const item of col.items) {
      assert.ok(item.to.startsWith("/"), `Expected route for ${item.label}`);
    }
  }
});

test("footer consultation validation requires valid name, strict email, phone, and message", () => {
  const empty = createInitialFooterConsultationValues();
  assert.equal(isFooterConsultationValid(empty), false);
  const errors = validateFooterConsultation(empty);
  assert.ok(errors.name);
  assert.ok(errors.email);
  assert.ok(errors.phone);
  assert.ok(errors.message);

  assert.equal(
    isFooterConsultationValid({
      name: "Kavinda Silva",
      email: "bad..email@domain",
      phone: "+94 77 123 4567",
      subject: "Villa Glazing",
      message: "Looking for sliding doors for 3 openings.",
    }),
    false
  );

  assert.equal(
    isFooterConsultationValid({
      name: "Kavinda Silva",
      email: "kavinda@studio.lk",
      phone: "123",
      subject: "Villa Glazing",
      message: "Looking for sliding doors.",
    }),
    false
  );

  const valid = {
    name: "Kavinda Silva",
    email: "kavinda@studio.lk",
    phone: "+94 77 123 4567",
    subject: "Villa Glazing",
    message: "Looking for sliding doors for 3 openings.",
  };
  assert.equal(isFooterConsultationValid(valid), true);

  const payload = buildFooterConsultationPayload(valid);
  assert.equal(payload.Client_Name, "Kavinda Silva");
  assert.equal(payload.Client_Email, "kavinda@studio.lk");
  assert.equal(payload.Client_Number, "+94 77 123 4567");
  assert.equal(payload.Product_Name, "Villa Glazing");
  assert.equal(payload.Inquiry_Type, "Free Architectural Consultation");
});

test("contact phone setup helpers normalize numbers and validate settings", () => {
  assert.equal(formatTelHref("+94 76 081 8098"), "tel:+94760818098");
  assert.equal(formatWhatsAppHref("+94 76 081 8098"), "https://wa.me/94760818098");

  const normalized = normalizeSiteContactSettings({
    phone: "+94 77 555 0199",
    email: "desk@innovistafabriconix.lk",
  });
  assert.equal(normalized.phone, "+94 77 555 0199");
  assert.equal(normalized.whatsapp, "94775550199");
  assert.equal(normalized.email, "desk@innovistafabriconix.lk");
  assert.equal(normalized.address, DEFAULT_SITE_CONTACT_SETTINGS.address);

  const validErrors = validateSiteContactSettings(normalized);
  assert.deepEqual(validErrors, {});

  const invalidErrors = validateSiteContactSettings({
    ...normalized,
    phone: "12",
    email: "bad-email",
  });
  assert.ok(invalidErrors.phone);
  assert.ok(invalidErrors.email);
});
