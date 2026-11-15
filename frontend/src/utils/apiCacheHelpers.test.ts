import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildApiCacheKey,
  getFreshCacheEntry,
  isCacheableGetRequest,
  isMutationMethod,
  setCacheEntry,
  type ApiCacheEntry,
} from "./apiCacheHelpers.ts";

describe("apiCacheHelpers", () => {
  it("builds deterministic cache keys regardless of param key order", () => {
    const k1 = buildApiCacheKey("/designs/all", { limit: 100, page: 1 });
    const k2 = buildApiCacheKey("/designs/all", { page: 1, limit: 100 });
    assert.equal(k1, k2);
    assert.equal(buildApiCacheKey("/api/home-slideshow"), "/api/home-slideshow");
  });

  it("identifies cacheable GET requests vs auth/sensitive/mutation requests", () => {
    assert.equal(isCacheableGetRequest("get", "/api/home-slideshow"), true);
    assert.equal(isCacheableGetRequest(undefined, "/designs/all"), true);
    assert.equal(isCacheableGetRequest("POST", "/designs/create"), false);
    assert.equal(isCacheableGetRequest("GET", "/auth/getAllAdmins"), false);
    assert.equal(isCacheableGetRequest("GET", "/customer/profile?customerId=1"), false);
    assert.equal(
      isCacheableGetRequest("GET", "/api/home-slideshow", { "x-no-cache": "true" }),
      false
    );
  });

  it("identifies mutation HTTP methods", () => {
    assert.equal(isMutationMethod("POST"), true);
    assert.equal(isMutationMethod("put"), true);
    assert.equal(isMutationMethod("PATCH"), true);
    assert.equal(isMutationMethod("DELETE"), true);
    assert.equal(isMutationMethod("GET"), false);
  });

  it("reads fresh TTL cache entries and evicts expired ones", () => {
    const cache = new Map<string, ApiCacheEntry<{ ok: boolean }>>();
    setCacheEntry(cache, "/api/test", { ok: true }, 5000, 1000);
    assert.deepEqual(getFreshCacheEntry(cache, "/api/test", 3000), { ok: true });
    assert.equal(getFreshCacheEntry(cache, "/api/test", 6500), undefined);
    assert.equal(cache.has("/api/test"), false);
  });
});
