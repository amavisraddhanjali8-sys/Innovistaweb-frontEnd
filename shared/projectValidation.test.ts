import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_PROJECT_IMAGES,
  countValidProjectImages,
  sanitizeProjectImages,
  validateProjectImageInput,
} from "./projectValidation.ts";

describe("projectValidation helpers", () => {
  it("caps project images at a strict maximum of 3", () => {
    assert.equal(MAX_PROJECT_IMAGES, 3);
    const cleaned = sanitizeProjectImages([
      " /a.jpg ",
      "/b.jpg",
      "/c.jpg",
      "/d.jpg",
      "/e.jpg",
    ]);
    assert.deepEqual(cleaned, ["/a.jpg", "/b.jpg", "/c.jpg"]);
  });

  it("deduplicates and removes blank entries before counting", () => {
    const cleaned = sanitizeProjectImages(["", "   ", "/a.jpg", "/a.jpg", "/b.jpg"]);
    assert.deepEqual(cleaned, ["/a.jpg", "/b.jpg"]);
    assert.equal(countValidProjectImages(["", "/a.jpg", "/a.jpg", "/b.jpg"]), 2);
  });

  it("rejects payloads exceeding 3 unique images", () => {
    const invalid = validateProjectImageInput([
      "/1.jpg",
      "/2.jpg",
      "/3.jpg",
      "/4.jpg",
    ]);
    assert.equal(invalid.valid, false);
    assert.equal(invalid.count, 4);
    assert.equal(invalid.sanitized.length, 3);
    assert.ok(invalid.error?.includes("3"));

    const valid = validateProjectImageInput(["/1.jpg", "/2.jpg", "/3.jpg"]);
    assert.equal(valid.valid, true);
    assert.equal(valid.count, 3);
  });
});
