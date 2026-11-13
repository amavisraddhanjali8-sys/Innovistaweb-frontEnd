import test from "node:test";
import assert from "node:assert/strict";
import {
  FOOTER_LINK_COLUMNS,
  buildFooterConsultationPayload,
  createInitialFooterConsultationValues,
  isFooterConsultationValid,
  validateFooterConsultation,
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
