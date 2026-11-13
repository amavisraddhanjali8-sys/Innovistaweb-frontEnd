import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  INQUIRY_TYPE_OPTIONS,
  buildOrderQuotePayload,
  createInitialQuoteFormValues,
  isQuoteModalFormValid,
  isValidEmailAddress,
  isValidOptionalPhone,
  validateQuoteModalForm,
} from "./quoteModalHelpers.ts";

describe("quoteModalHelpers", () => {
  it("provides clear architectural inquiry types including product, wholesale, and site fabrication", () => {
    assert.ok(INQUIRY_TYPE_OPTIONS.includes("Product Quotation"));
    assert.ok(INQUIRY_TYPE_OPTIONS.includes("Bulk / Wholesale Pricing"));
    assert.ok(INQUIRY_TYPE_OPTIONS.includes("Hardware & Accessories"));
  });

  it("initializes inquiryType empty until explicitly chosen or inferred from accessory context", () => {
    const clean = createInitialQuoteFormValues();
    assert.equal(clean.name, "");
    assert.equal(clean.email, "");
    assert.equal(clean.inquiryType, "");
    assert.equal(isQuoteModalFormValid(clean), false);

    const withAccessory = createInitialQuoteFormValues({
      defaultName: "Alex Perera",
      defaultEmail: "alex@studio.lk",
      accessoryName: "Matte Charcoal Lift Handle",
    });
    assert.equal(withAccessory.name, "Alex Perera");
    assert.equal(withAccessory.email, "alex@studio.lk");
    assert.equal(withAccessory.inquiryType, "Hardware & Accessories");
    assert.equal(isQuoteModalFormValid(withAccessory), true);
  });

  it("strictly verifies email addresses and optional phone numbers", () => {
    assert.equal(isValidEmailAddress("architect@innovista.lk"), true);
    assert.equal(isValidEmailAddress("first.last+tag@studio.co.uk"), true);
    assert.equal(isValidEmailAddress(""), false);
    assert.equal(isValidEmailAddress("bad-email"), false);
    assert.equal(isValidEmailAddress("user@localhost"), false);
    assert.equal(isValidEmailAddress("two..dots@domain.com"), false);
    assert.equal(isValidEmailAddress(".leading@domain.com"), false);
    assert.equal(isValidEmailAddress("has space@domain.com"), false);

    assert.equal(isValidOptionalPhone(""), true);
    assert.equal(isValidOptionalPhone("+94 77 123 4567"), true);
    assert.equal(isValidOptionalPhone("123"), false);
    assert.equal(isValidOptionalPhone("abc-xyz"), false);
  });

  it("requires valid name, email, and inquiry type before enabling submission", () => {
    const partial = {
      name: "A",
      email: "nimali@architects.lk",
      inquiryType: "" as const,
      phone: "123",
    };
    const errs = validateQuoteModalForm(partial);
    assert.equal(errs.name, "Name must be at least 2 characters.");
    assert.equal(errs.inquiryType, "Please select an inquiry type.");
    assert.equal(errs.phone, "Enter a valid phone number (7–15 digits).");
    assert.equal(isQuoteModalFormValid(partial), false);

    const valid = {
      name: "Nimali Silva",
      email: "nimali@architects.lk",
      inquiryType: "Product Quotation" as const,
      phone: "+94 77 444 8899",
    };
    assert.deepEqual(validateQuoteModalForm(valid), {});
    assert.equal(isQuoteModalFormValid(valid), true);
  });

  it("builds a structured order quote payload for /order/createOrder", () => {
    const payload = buildOrderQuotePayload(
      {
        name: "Kasun Fernando",
        email: "kasun@firm.lk",
        inquiryType: "Bulk / Wholesale Pricing",
        phone: "+94 77 555 1212",
        notes: "20 sliding door frames needed.",
      },
      {
        productId: 12,
        productName: "Minimalist Thermal Sliding Door",
        accessoryName: "INV-HND-01",
      }
    );

    assert.equal(payload.Client_Name, "Kasun Fernando");
    assert.equal(payload.Client_Email, "kasun@firm.lk");
    assert.equal(payload.Inquiry_Type, "Bulk / Wholesale Pricing");
    assert.equal(payload.Product_Name, "Minimalist Thermal Sliding Door");
    assert.equal(payload.Accessory_Variant, "INV-HND-01");
    assert.deepEqual(payload.Designs, [{ DesignID: 12 }]);
  });
});
