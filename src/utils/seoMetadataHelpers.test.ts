import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  buildCanonicalUrl,
  buildOrganizationJsonLd,
  buildProductJsonLd,
  formatSeoTitle,
  normalizeMetaDescription,
} from "./seoMetadataHelpers";

test("formatSeoTitle formats branded titles without double-branding", () => {
  assert.equal(formatSeoTitle(), DEFAULT_SEO_TITLE);
  assert.equal(formatSeoTitle("   "), DEFAULT_SEO_TITLE);
  assert.equal(
    formatSeoTitle("Architectural Doors & Windows"),
    "Architectural Doors & Windows | Innovista Fabriconix"
  );
  assert.equal(
    formatSeoTitle("Contact Innovista Fabriconix"),
    "Contact Innovista Fabriconix"
  );
});

test("normalizeMetaDescription trims whitespace and caps overlong descriptions cleanly", () => {
  assert.equal(normalizeMetaDescription(""), DEFAULT_SEO_DESCRIPTION);
  assert.equal(
    normalizeMetaDescription("  Precision   aluminium   glazing systems. "),
    "Precision aluminium glazing systems."
  );

  const longInput = "A".repeat(190);
  const normalized = normalizeMetaDescription(longInput);
  assert.equal(normalized.length, 165);
  assert.ok(normalized.endsWith("..."));
});

test("buildCanonicalUrl joins origin and normalized path cleanly", () => {
  assert.equal(
    buildCanonicalUrl("https://innovista.lk/", "products/doors"),
    "https://innovista.lk/products/doors"
  );
  assert.equal(
    buildCanonicalUrl("https://innovista.lk", undefined, "/about"),
    "https://innovista.lk/about"
  );
});

test("JSON-LD builders output valid Schema.org payloads", () => {
  const org = buildOrganizationJsonLd({
    phone: "+94 76 081 8098",
    email: "innovistametal@gmail.com",
    address: "No. 42, Nawala Road, Colombo 05",
    sameAs: ["https://www.facebook.com/share/1CN1SBPycg/"],
  });
  assert.equal(org["@type"], "LocalBusiness");
  assert.equal(org.telephone, "+94 76 081 8098");

  const product = buildProductJsonLd({
    name: "Slimline Sliding Door",
    description: "22mm architectural aluminium sliding system.",
    category: "Doors",
  });
  assert.equal(product["@type"], "Product");
  assert.equal(product.name, "Slimline Sliding Door");
});
