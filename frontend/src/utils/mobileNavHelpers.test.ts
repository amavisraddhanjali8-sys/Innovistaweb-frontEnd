import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCT_QUICK_CATEGORIES,
  resolveDesktopNavActiveKey,
  resolveMobileDockActiveKey,
} from "./mobileNavHelpers.ts";

describe("mobileNavHelpers", () => {
  it("resolves mobile bottom dock active tab across routes cleanly", () => {
    assert.equal(resolveMobileDockActiveKey("/"), "home");
    assert.equal(resolveMobileDockActiveKey("/products"), "products");
    assert.equal(resolveMobileDockActiveKey("/products/category/doors"), "products");
    assert.equal(resolveMobileDockActiveKey("/products/12"), "products");
    assert.equal(resolveMobileDockActiveKey("/request-quote"), "quote");
    assert.equal(resolveMobileDockActiveKey("/OrderCart"), "quote");
    assert.equal(resolveMobileDockActiveKey("/contact"), "contact");
    assert.equal(resolveMobileDockActiveKey("/profile"), "profile");
    assert.equal(resolveMobileDockActiveKey("/profile-login"), "profile");
    assert.equal(resolveMobileDockActiveKey("/blogs"), null);
  });

  it("resolves desktop menu bar active keys and category quick links", () => {
    assert.equal(resolveDesktopNavActiveKey("/"), "home");
    assert.equal(resolveDesktopNavActiveKey("/about"), "about");
    assert.equal(resolveDesktopNavActiveKey("/milestones"), "about");
    assert.equal(resolveDesktopNavActiveKey("/products/category/windows"), "products");
    assert.equal(resolveDesktopNavActiveKey("/blogs"), "blogs");
    assert.equal(resolveDesktopNavActiveKey("/news"), "news");
    assert.equal(resolveDesktopNavActiveKey("/resources"), "resources");
    assert.equal(resolveDesktopNavActiveKey("/projects"), "projects");
    assert.equal(resolveDesktopNavActiveKey("/contact"), "contact");
    assert.equal(resolveDesktopNavActiveKey("/profile"), null);

    assert.ok(PRODUCT_QUICK_CATEGORIES.length >= 4);
    assert.equal(PRODUCT_QUICK_CATEGORIES[0].to, "/products");
  });
});
