import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  buildCanonicalUrl,
  buildOrganizationJsonLd,
  buildProductJsonLd,
  formatSeoTitle,
  injectSeoIntoHtml,
  normalizeMetaDescription,
  resolveDynamicRouteSeo,
  resolveOgImageUrl,
  resolveRequestOrigin,
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

test("resolveOgImageUrl builds absolute URLs and falls back on unsafe data URIs", () => {
  assert.equal(
    resolveOgImageUrl("https://innovista.lk", "/assets/products/door.jpg"),
    "https://innovista.lk/assets/products/door.jpg"
  );
  assert.equal(
    resolveOgImageUrl("https://innovista.lk", "https://cdn.example.com/p.jpg"),
    "https://cdn.example.com/p.jpg"
  );
  assert.equal(
    resolveOgImageUrl("https://innovista.lk", "data:image/png;base64,abc"),
    `https://innovista.lk${DEFAULT_OG_IMAGE}`
  );
});

test("resolveRequestOrigin prefers APP_URL and falls back to forwarded host", () => {
  assert.equal(
    resolveRequestOrigin({
      appUrl: "https://ais-pre.example.run.app/",
      protocol: "http",
      host: "localhost:3000",
    }),
    "https://ais-pre.example.run.app"
  );
  assert.equal(
    resolveRequestOrigin({
      protocol: "http",
      host: "localhost:3000",
    }),
    "http://localhost:3000"
  );
});

test("resolveDynamicRouteSeo produces dynamic OG images and canonical URLs per route", () => {
  const origin = "https://innovista.example.com";
  const productSeo = resolveDynamicRouteSeo({
    pathname: "/products/2",
    origin,
    designs: [
      {
        DesignID: 2,
        Design_Name: "Thermally Broken Casement Window",
        Design_Description: "Triple gasket acoustic aluminium window.",
        Design_Category: "Windows",
        Design_Image: ["/assets/products/window.jpg"],
      },
    ],
  });

  assert.equal(productSeo.ogType, "product");
  assert.equal(productSeo.canonicalUrl, `${origin}/products/2`);
  assert.equal(productSeo.ogImage, `${origin}/assets/products/window.jpg`);
  assert.equal(
    (productSeo.structuredData as Record<string, unknown>)["@type"],
    "Product"
  );

  const categorySeo = resolveDynamicRouteSeo({
    pathname: "/products/category/doors",
    origin,
    categories: [
      {
        slug: "doors",
        name: "Doors",
        tagline: "Minimalist sliding doors",
        coverImage: "/assets/products/door.jpg",
      },
    ],
  });
  assert.equal(
    categorySeo.canonicalUrl,
    `${origin}/products/category/doors`
  );
  assert.equal(categorySeo.ogImage, `${origin}/assets/products/door.jpg`);

  const adminSeo = resolveDynamicRouteSeo({
    pathname: "/admin-home",
    origin,
  });
  assert.equal(adminSeo.robots, "noindex, nofollow");
});

test("injectSeoIntoHtml updates title, canonical link, OpenGraph, Twitter, and JSON-LD tags safely", () => {
  const baseHtml = `<!doctype html><html><head><title>Old</title><link rel="canonical" href="/" /><meta property="og:image" content="/old.jpg" /><script type="application/ld+json" data-page-seo="true">{}</script></head><body></body></html>`;
  const seo = resolveDynamicRouteSeo({
    pathname: "/about",
    origin: "https://innovista.example.com",
  });
  const result = injectSeoIntoHtml(baseHtml, seo);

  assert.ok(result.includes(`<link rel="canonical" href="https://innovista.example.com/about" />`));
  assert.ok(result.includes(`<meta property="og:image" content="https://innovista.example.com/assets/about/facade.jpg" />`));
  assert.ok(result.includes(`<meta name="twitter:image" content="https://innovista.example.com/assets/about/facade.jpg" />`));
  assert.ok(result.includes(`<meta property="og:url" content="https://innovista.example.com/about" />`));
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
