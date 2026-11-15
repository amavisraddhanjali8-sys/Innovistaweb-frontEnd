import test from "node:test";
import assert from "node:assert/strict";
import {
  inferMediaKindFromUrlOrMime,
  inferSourceTypeFromUrl,
  isValidMediaPublicUrl,
  normalizeMediaAssetInput,
} from "./mediaAssetHelpers.ts";

test("isValidMediaPublicUrl accepts local uploads, presets, and http(s) URLs", () => {
  assert.equal(isValidMediaPublicUrl("/uploads/173156-door.jpg"), true);
  assert.equal(isValidMediaPublicUrl("/assets/products/door.jpg"), true);
  assert.equal(isValidMediaPublicUrl("https://cdn.example.com/photo.webp"), true);
  assert.equal(isValidMediaPublicUrl("javascript:alert(1)"), false);
  assert.equal(isValidMediaPublicUrl(""), false);
});

test("inferSourceTypeFromUrl classifies uploads vs external URLs vs presets", () => {
  assert.equal(inferSourceTypeFromUrl("/uploads/test.jpg"), "UPLOAD");
  assert.equal(inferSourceTypeFromUrl("https://example.com/a.jpg"), "EXTERNAL_URL");
  assert.equal(inferSourceTypeFromUrl("/assets/about/facade.jpg"), "PRESET");
});

test("inferMediaKindFromUrlOrMime classifies images, videos, and CAD/PDF documents", () => {
  assert.equal(inferMediaKindFromUrlOrMime("/uploads/tour.mp4", "video/mp4"), "VIDEO");
  assert.equal(inferMediaKindFromUrlOrMime("https://site.com/spec.dwg"), "DOCUMENT");
  assert.equal(inferMediaKindFromUrlOrMime("https://site.com/hero.jpg"), "IMAGE");
});

test("normalizeMediaAssetInput validates and normalizes external link and upload inputs", () => {
  const ext = normalizeMediaAssetInput({
    url: "https://images.example.com/curtain-wall.jpg",
    title: "Curtain Wall Hero",
    entityScope: "product",
  });
  assert.equal(ext.valid, true);
  if (ext.valid) {
    assert.equal(ext.data.sourceType, "EXTERNAL_URL");
    assert.equal(ext.data.kind, "IMAGE");
    assert.equal(ext.data.entityScope, "product");
  }

  const invalid = normalizeMediaAssetInput({ url: "ftp://invalid.example.com/a.jpg" });
  assert.equal(invalid.valid, false);
});
